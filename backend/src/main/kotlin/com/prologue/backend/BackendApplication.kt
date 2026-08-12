package com.prologue.backend

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.context.properties.ConfigurationPropertiesScan
import org.springframework.boot.runApplication
import org.springframework.scheduling.annotation.EnableAsync
import org.springframework.scheduling.annotation.EnableScheduling

@SpringBootApplication
@ConfigurationPropertiesScan
@EnableScheduling
@EnableAsync // 알림 발송이 본래 요청을 붙들지 않게 — NotificationService 참고
class BackendApplication

fun main(args: Array<String>) {
    runApplication<BackendApplication>(*args)
}
