package com.prologue.backend.dailymeet.domain.model

/**
 * 충전 상품 — 스토어에 등록한 상품 id와 지급할 잉크 양의 짝.
 *
 * 설정(yaml)이 아니라 코드에 두는 이유: 이 표는 스토어에 등록한 상품과 맺은 약속이다.
 * 재배포 없이 바꿀 수 있게 해두면 "5,900원에 잉크 50"이 어느 날 조용히 30이 될 수 있고,
 * 그 변화가 코드 리뷰에도 남지 않는다. 돈이 걸린 값은 눈에 보이는 자리에 둔다.
 *
 * 단위는 편지 한 통([InkPrice.MAIL])을 기준으로 잡았다 — 유저가 사는 것은 잉크가 아니라
 * "편지 몇 통"이라, 그 수가 딱 떨어져야 값을 가늠할 수 있다.
 *
 * 상품을 추가할 때는 두 스토어에 같은 id로 등록해야 한다 — 갈라지면 플랫폼별 분기가 생긴다.
 */
enum class InkProduct(val productId: String, val ink: Int) {
    /** 편지 한 통어치. */
    INK_50("ink_50", 50),

    /** 세 통어치. */
    INK_150("ink_150", 150),

    /** 다섯 통어치. */
    INK_250("ink_250", 250),

    // iOS(day.prologue.app) 전용 id — App Store 제품 id는 팀 전체에서 유일해야 해서
    // 구 앱이 점유한 ink_50 계열 대신 언더스코어 없는 id로 등록했다. 지급량은 동일.
    /** 편지 한 통어치(iOS). */
    INK50_IOS("ink50", 50),

    /** 세 통어치(iOS). */
    INK150_IOS("ink150", 150),

    /** 다섯 통어치(iOS). */
    INK250_IOS("ink250", 250),
    ;

    companion object {
        /** 모르는 상품 id는 null — 서비스가 거절한다. 임의의 id로 잉크를 받아갈 수 없게. */
        fun of(productId: String): InkProduct? = entries.firstOrNull { it.productId == productId }
    }
}

/** 결제가 일어난 스토어. */
enum class StorePlatform { IOS, ANDROID }
