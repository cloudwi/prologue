package com.prologue.backend.dailymeet.domain.model

/**
 * 충전 상품 — 스토어에 등록한 상품 id와 지급할 우표 수의 짝.
 *
 * 설정(yaml)이 아니라 코드에 두는 이유: 이 표는 스토어에 등록한 상품과 맺은 약속이다.
 * 재배포 없이 바꿀 수 있게 해두면 "3,300원 주고 5장"이 어느 날 조용히 3장이 될 수 있고,
 * 그 변화가 코드 리뷰에도 남지 않는다. 돈이 걸린 값은 눈에 보이는 자리에 둔다.
 *
 * 상품을 추가할 때는 두 스토어에 같은 id로 등록해야 한다 — 갈라지면 플랫폼별 분기가 생긴다.
 */
enum class StampProduct(val productId: String, val stamps: Int) {
    STAMP_1("stamp_1", 1),
    STAMP_3("stamp_3", 3),
    STAMP_5("stamp_5", 5),
    ;

    companion object {
        /** 모르는 상품 id는 null — 서비스가 거절한다. 임의의 id로 우표를 받아갈 수 없게. */
        fun of(productId: String): StampProduct? = entries.firstOrNull { it.productId == productId }
    }
}

/** 결제가 일어난 스토어. */
enum class StorePlatform { IOS, ANDROID }
