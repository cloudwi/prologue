package com.prologue.backend.member.domain.model

/**
 * 업로드된 바이트의 실제 이미지 형식.
 *
 * 클라이언트가 보낸 Content-Type은 믿지 않는다 — 확장자에서 추측한 값이라 틀리기 쉽고(특히 iOS),
 * 위조할 수도 있다. 파일 시그니처(매직 넘버)로 직접 판별한다.
 */
enum class ImageFormat(val mimeType: String) {
    JPEG("image/jpeg"),
    PNG("image/png"),
    WEBP("image/webp"),

    /** 아이폰 기본 촬영 형식. 브라우저·안드로이드에서 열리지 않아 프로필 사진으로 받지 않는다. */
    HEIC("image/heic"),
    UNKNOWN("application/octet-stream"),
    ;

    val supported: Boolean get() = this == JPEG || this == PNG || this == WEBP

    companion object {
        fun detect(bytes: ByteArray): ImageFormat = when {
            bytes.startsWith(0xFF, 0xD8, 0xFF) -> JPEG
            bytes.startsWith(0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A) -> PNG
            // RIFF....WEBP — 4~7바이트는 길이라 건너뛴다
            bytes.ascii(0, "RIFF") && bytes.ascii(8, "WEBP") -> WEBP
            // ISO base media 컨테이너: 4~7바이트가 ftyp, 그 뒤 브랜드로 HEIF 계열을 가린다
            bytes.ascii(4, "ftyp") && HEIF_BRANDS.any { bytes.ascii(8, it) } -> HEIC
            else -> UNKNOWN
        }

        private val HEIF_BRANDS = listOf("heic", "heix", "heim", "heis", "hevc", "hevx", "mif1", "msf1", "heif")

        private fun ByteArray.startsWith(vararg signature: Int): Boolean =
            size >= signature.size && signature.withIndex().all { (i, b) -> this[i] == b.toByte() }

        private fun ByteArray.ascii(offset: Int, text: String): Boolean =
            size >= offset + text.length && text.indices.all { this[offset + it] == text[it].code.toByte() }
    }
}
