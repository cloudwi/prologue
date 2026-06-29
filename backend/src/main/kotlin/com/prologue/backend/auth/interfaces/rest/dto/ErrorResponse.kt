package com.prologue.backend.auth.interfaces.rest.dto

/** 표준 에러 응답. */
data class ErrorResponse(
    val code: String,
    val message: String?,
)
