package com.prologue.backend.dailymeet.domain.repository

import com.prologue.backend.dailymeet.domain.model.StampPurchase
import com.prologue.backend.dailymeet.domain.model.StorePlatform

/** 충전 기록 영속성 포트. 쌓기만 하고 고치지 않는다. */
interface StampPurchaseRepository {
    /** 저장. 같은 거래가 이미 있으면 false — 유니크 제약 위반을 잡아 알려준다. */
    fun saveIfNew(purchase: StampPurchase): Boolean

    fun exists(platform: StorePlatform, transactionId: String): Boolean
}
