package com.prologue.backend.member.infrastructure.inspection

import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import com.prologue.backend.member.application.port.PhotoInspection
import com.prologue.backend.member.application.port.PhotoInspector
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.MediaType
import org.springframework.stereotype.Component
import org.springframework.web.client.RestClient
import org.springframework.web.client.RestClientException
import java.io.ByteArrayInputStream
import java.io.IOException
import java.util.Base64
import javax.imageio.ImageIO

/**
 * Google Cloud Vision `images:annotate` 기반 [PhotoInspector] 구현.
 *
 * 한 번의 호출로 얼굴 검출(FACE_DETECTION)과 선정성 판정(SAFE_SEARCH_DETECTION)을 함께 받는다.
 * 인증은 서비스 계정 JSON 대신 API 키 쿼리 파라미터를 쓴다 — Render에서는 환경변수 한 줄로 끝난다.
 *
 * 환경변수 GOOGLE_VISION_API_KEY가 없으면 검수를 건너뛴다(로컬·개발에서 업로드가 막히지 않도록).
 * 호출이 실패해도 예외를 올리지 않고 건너뛴다 — 검수 실패가 가입 실패가 되면 안 된다.
 */
@Component
class GoogleVisionPhotoInspector(
    @param:Value("\${photo.inspection.google-vision-api-key:}") private val apiKey: String,
    restClientBuilder: RestClient.Builder,
) : PhotoInspector {

    private val client = restClientBuilder.build()

    override fun inspect(bytes: ByteArray, contentType: String): PhotoInspection {
        if (apiKey.isBlank()) return PhotoInspection.skipped()

        val request = mapOf(
            "requests" to listOf(
                mapOf(
                    "image" to mapOf("content" to Base64.getEncoder().encodeToString(bytes)),
                    "features" to listOf(
                        mapOf("type" to "FACE_DETECTION", "maxResults" to MAX_FACES),
                        mapOf("type" to "SAFE_SEARCH_DETECTION"),
                    ),
                ),
            ),
        )

        val response = try {
            client.post()
                .uri("$ENDPOINT?key=$apiKey")
                .contentType(MediaType.APPLICATION_JSON)
                .body(request)
                .retrieve()
                .body(AnnotateResponse::class.java)
        } catch (e: RestClientException) {
            log.warn("사진 검수 호출 실패 — 검수 없이 통과시킨다", e)
            return PhotoInspection.skipped()
        }

        val result = response?.responses?.firstOrNull() ?: return PhotoInspection.skipped()
        if (result.error != null) {
            log.warn("사진 검수 응답 오류({}) — 검수 없이 통과시킨다: {}", result.error.code, result.error.message)
            return PhotoInspection.skipped()
        }

        val faces = result.faceAnnotations
        return PhotoInspection(
            faceCount = faces.size,
            largestFaceRatio = largestFaceRatio(faces, bytes),
            unsafe = result.safeSearchAnnotation?.isUnsafe() ?: false,
        )
    }

    /** 가장 큰 얼굴 박스가 사진 넓이에서 차지하는 비율. 이미지 크기를 못 읽으면(webp 등) null. */
    private fun largestFaceRatio(faces: List<FaceAnnotation>, bytes: ByteArray): Double? {
        if (faces.isEmpty()) return null
        val imageArea = imageArea(bytes)?.takeIf { it > 0 } ?: return null
        val largest = faces.maxOf { it.area() }
        return largest.toDouble() / imageArea
    }

    /**
     * 이미지 전체를 디코딩하지 않고 헤더만 읽어 넓이를 구한다.
     * ImageIO가 못 읽는 포맷(webp)이면 null.
     */
    private fun imageArea(bytes: ByteArray): Long? {
        try {
            ImageIO.createImageInputStream(ByteArrayInputStream(bytes)).use { input ->
                if (input == null) return null
                val readers = ImageIO.getImageReaders(input)
                if (!readers.hasNext()) return null
                val reader = readers.next()
                try {
                    reader.input = input
                    return reader.getWidth(0).toLong() * reader.getHeight(0).toLong()
                } finally {
                    reader.dispose()
                }
            }
        } catch (e: IOException) {
            log.debug("이미지 크기를 읽지 못했다 — 얼굴 크기 검사는 건너뛴다", e)
            return null
        }
    }

    // --- Vision API 응답 (필요한 필드만) ---

    @JsonIgnoreProperties(ignoreUnknown = true)
    data class AnnotateResponse(val responses: List<ImageResponse> = emptyList())

    @JsonIgnoreProperties(ignoreUnknown = true)
    data class ImageResponse(
        val faceAnnotations: List<FaceAnnotation> = emptyList(),
        val safeSearchAnnotation: SafeSearchAnnotation? = null,
        val error: VisionError? = null,
    )

    @JsonIgnoreProperties(ignoreUnknown = true)
    data class VisionError(val code: Int? = null, val message: String? = null)

    @JsonIgnoreProperties(ignoreUnknown = true)
    data class FaceAnnotation(
        /** 얼굴 피부 영역에 딱 맞는 박스. 머리카락·모자를 포함하는 boundingPoly보다 얼굴 크기에 가깝다. */
        val fdBoundingPoly: BoundingPoly? = null,
        val boundingPoly: BoundingPoly? = null,
    ) {
        fun area(): Long = (fdBoundingPoly ?: boundingPoly)?.area() ?: 0L
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    data class BoundingPoly(val vertices: List<Vertex> = emptyList()) {
        /** 값이 0인 좌표는 응답에서 생략되므로 기본값 0으로 채워 계산한다. */
        fun area(): Long {
            if (vertices.isEmpty()) return 0L
            val xs = vertices.map { it.x }
            val ys = vertices.map { it.y }
            val width = (xs.max() - xs.min()).toLong()
            val height = (ys.max() - ys.min()).toLong()
            return width * height
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    data class Vertex(val x: Int = 0, val y: Int = 0)

    /** 각 값은 VERY_UNLIKELY ~ VERY_LIKELY. 노출·폭력은 LIKELY부터, 선정성(racy)은 VERY_LIKELY만 거른다. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    data class SafeSearchAnnotation(
        val adult: String? = null,
        val violence: String? = null,
        val racy: String? = null,
    ) {
        fun isUnsafe(): Boolean =
            adult in BLOCKED_LIKELIHOODS || violence in BLOCKED_LIKELIHOODS || racy == "VERY_LIKELY"
    }

    companion object {
        private val log = LoggerFactory.getLogger(GoogleVisionPhotoInspector::class.java)
        private const val ENDPOINT = "https://vision.googleapis.com/v1/images:annotate"
        private const val MAX_FACES = 5
        private val BLOCKED_LIKELIHOODS = setOf("LIKELY", "VERY_LIKELY")
    }
}
