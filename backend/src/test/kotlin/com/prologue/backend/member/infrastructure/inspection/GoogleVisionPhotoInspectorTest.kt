package com.prologue.backend.member.infrastructure.inspection

import java.awt.image.BufferedImage
import java.io.ByteArrayOutputStream
import javax.imageio.ImageIO
import org.hamcrest.Matchers.containsString
import org.springframework.http.HttpMethod
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.test.web.client.MockRestServiceServer
import org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath
import org.springframework.test.web.client.match.MockRestRequestMatchers.method
import org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo
import org.springframework.test.web.client.response.MockRestResponseCreators.withStatus
import org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess
import org.springframework.web.client.RestClient
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

class GoogleVisionPhotoInspectorTest {

    private val builder = RestClient.builder()
    private val server = MockRestServiceServer.bindTo(builder).build()
    private val inspector = GoogleVisionPhotoInspector("test-key", builder)

    /** 200x100(=20,000px²) PNG. 얼굴 박스 넓이와의 비율을 계산할 수 있게 실제 이미지 헤더가 필요하다. */
    private val png: ByteArray = ByteArrayOutputStream().use { out ->
        ImageIO.write(BufferedImage(200, 100, BufferedImage.TYPE_INT_RGB), "png", out)
        out.toByteArray()
    }

    private fun respondWith(body: String, pngExpected: Boolean = true) {
        val expectation = server.expect(requestTo("https://vision.googleapis.com/v1/images:annotate?key=test-key"))
            .andExpect(method(HttpMethod.POST))
            .andExpect(jsonPath("$.requests[0].features[0].type").value("FACE_DETECTION"))
            .andExpect(jsonPath("$.requests[0].features[1].type").value("SAFE_SEARCH_DETECTION"))
        if (pngExpected) {
            expectation.andExpect(jsonPath("$.requests[0].image.content", containsString("iVBOR"))) // base64 PNG 시그니처
        }
        expectation.andRespond(withSuccess(body, MediaType.APPLICATION_JSON))
    }

    @Test
    fun `얼굴 수와 사진에서 차지하는 비율을 계산한다`() {
        // 40x50 얼굴(2,000px²) → 20,000px²의 10%
        respondWith(
            """
            {"responses":[{
              "faceAnnotations":[
                {"fdBoundingPoly":{"vertices":[{"x":10,"y":10},{"x":50,"y":10},{"x":50,"y":60},{"x":10,"y":60}]},
                 "detectionConfidence":0.98},
                {"fdBoundingPoly":{"vertices":[{"x":100,"y":20},{"x":110,"y":20},{"x":110,"y":30},{"x":100,"y":30}]}}
              ],
              "safeSearchAnnotation":{"adult":"VERY_UNLIKELY","violence":"UNLIKELY","racy":"UNLIKELY","spoof":"UNLIKELY"}
            }]}
            """.trimIndent(),
        )

        val result = inspector.inspect(png, "image/png")

        assertEquals(2, result.faceCount)
        assertEquals(0.1, assertNotNull(result.largestFaceRatio), 0.0001)
        assertFalse(result.unsafe)
        assertFalse(result.skipped)
        server.verify()
    }

    @Test
    fun `얼굴이 하나도 없으면 faceCount 0`() {
        respondWith("""{"responses":[{"safeSearchAnnotation":{"adult":"VERY_UNLIKELY"}}]}""")

        val result = inspector.inspect(png, "image/png")

        assertEquals(0, result.faceCount)
        assertFalse(result.skipped)
    }

    @Test
    fun `노출 사진은 unsafe로 표시한다`() {
        respondWith(
            """{"responses":[{"faceAnnotations":[{"fdBoundingPoly":{"vertices":[{"x":0,"y":0},{"x":100,"y":0},
               {"x":100,"y":100},{"x":0,"y":100}]}}],"safeSearchAnnotation":{"adult":"LIKELY","racy":"LIKELY"}}]}"""
                .trimIndent(),
        )

        assertTrue(inspector.inspect(png, "image/png").unsafe)
    }

    @Test
    fun `API가 오류를 내면 검수를 건너뛴다`() {
        server.expect(requestTo("https://vision.googleapis.com/v1/images:annotate?key=test-key"))
            .andRespond(withStatus(HttpStatus.TOO_MANY_REQUESTS).body("""{"error":{"message":"quota"}}"""))

        assertTrue(inspector.inspect(png, "image/png").skipped)
    }

    @Test
    fun `응답에 error가 담겨도 검수를 건너뛴다`() {
        respondWith("""{"responses":[{"error":{"code":3,"message":"Bad image data"}}]}""")

        assertTrue(inspector.inspect(png, "image/png").skipped)
    }

    @Test
    fun `API 키가 없으면 호출하지 않고 건너뛴다`() {
        val unconfigured = GoogleVisionPhotoInspector("", builder)

        assertTrue(unconfigured.inspect(png, "image/png").skipped)
        server.verify() // 기대한 요청이 없으므로 호출이 하나라도 있으면 실패
    }

    @Test
    fun `크기를 읽을 수 없는 포맷이면 비율 없이 얼굴 수만 돌려준다`() {
        respondWith(
            """{"responses":[{"faceAnnotations":[{"fdBoundingPoly":{"vertices":[{"x":0,"y":0},{"x":10,"y":0},
               {"x":10,"y":10},{"x":0,"y":10}]}}]}]}""".trimIndent(),
            pngExpected = false,
        )

        // ImageIO가 못 읽는 바이트(webp 등을 가정)
        val result = inspector.inspect(byteArrayOf(1, 2, 3, 4), "image/webp")

        assertEquals(1, result.faceCount)
        assertEquals(null, result.largestFaceRatio)
    }
}
