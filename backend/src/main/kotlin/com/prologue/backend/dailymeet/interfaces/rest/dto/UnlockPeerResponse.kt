package com.prologue.backend.dailymeet.interfaces.rest.dto

/**
 * 프로필 열람권 구매 결과.
 *
 * 열린 프로필을 함께 돌려준다 — 앱이 성공 후 다시 조회하지 않아도 화면이 바로 바뀌도록.
 * [spent]가 false면 이미 열려 있었다는 뜻이다(우표는 나가지 않았다).
 */
data class UnlockPeerResponse(
    val spent: Boolean,
    /** 차감 후 잔액. 앱이 지갑을 다시 묻지 않아도 되게. */
    val balance: Int,
    val peer: PeerResponse,
)
