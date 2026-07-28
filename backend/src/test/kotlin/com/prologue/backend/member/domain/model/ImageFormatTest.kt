package com.prologue.backend.member.domain.model

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class ImageFormatTest {

    private fun bytes(vararg values: Int) = ByteArray(values.size) { values[it].toByte() }

    private fun ascii(text: String, prefix: ByteArray = ByteArray(0)) = prefix + text.toByteArray(Charsets.US_ASCII)

    @Test
    fun `JPEG 시그니처를 알아본다`() {
        assertEquals(ImageFormat.JPEG, ImageFormat.detect(bytes(0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10)))
    }

    @Test
    fun `PNG 시그니처를 알아본다`() {
        assertEquals(ImageFormat.PNG, ImageFormat.detect(bytes(0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00)))
    }

    @Test
    fun `WEBP는 RIFF와 WEBP 사이의 길이 4바이트를 건너뛰고 판별한다`() {
        val webp = ascii("RIFF") + bytes(0x24, 0x00, 0x00, 0x00) + ascii("WEBPVP8 ")
        assertEquals(ImageFormat.WEBP, ImageFormat.detect(webp))
    }

    @Test
    fun `아이폰 HEIC를 알아보고 지원하지 않는다고 표시한다`() {
        // 크기 4바이트 + ftyp + 브랜드
        val heic = bytes(0x00, 0x00, 0x00, 0x18) + ascii("ftyp") + ascii("heic") + ascii("mif1heic")
        val format = ImageFormat.detect(heic)
        assertEquals(ImageFormat.HEIC, format)
        assertFalse(format.supported)
    }

    @Test
    fun `HEIF 계열의 다른 브랜드도 HEIC로 본다`() {
        val heif = bytes(0x00, 0x00, 0x00, 0x18) + ascii("ftyp") + ascii("mif1")
        assertEquals(ImageFormat.HEIC, ImageFormat.detect(heif))
    }

    @Test
    fun `모르는 바이트는 UNKNOWN`() {
        assertEquals(ImageFormat.UNKNOWN, ImageFormat.detect(bytes(0x01, 0x02, 0x03, 0x04)))
        assertEquals(ImageFormat.UNKNOWN, ImageFormat.detect(ByteArray(0)))
    }

    @Test
    fun `지원 형식은 jpg png webp 셋뿐`() {
        assertTrue(ImageFormat.JPEG.supported && ImageFormat.PNG.supported && ImageFormat.WEBP.supported)
        assertFalse(ImageFormat.HEIC.supported || ImageFormat.UNKNOWN.supported)
    }
}
