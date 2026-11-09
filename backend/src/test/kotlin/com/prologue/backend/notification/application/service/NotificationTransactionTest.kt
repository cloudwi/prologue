package com.prologue.backend.notification.application.service

import com.prologue.backend.dailymeet.domain.model.StorePlatform
import com.prologue.backend.notification.application.port.PushMessage
import com.prologue.backend.notification.application.port.PushSender
import com.prologue.backend.notification.domain.model.DeviceToken
import com.prologue.backend.notification.domain.repository.DeviceTokenRepository
import io.mockk.every
import io.mockk.mockk
import org.junit.jupiter.api.Test
import org.springframework.aop.framework.ProxyFactory
import org.springframework.scheduling.annotation.Async
import org.springframework.transaction.TransactionDefinition
import org.springframework.transaction.annotation.AnnotationTransactionAttributeSource
import org.springframework.transaction.interceptor.TransactionInterceptor
import org.springframework.transaction.support.AbstractPlatformTransactionManager
import org.springframework.transaction.support.DefaultTransactionStatus
import org.springframework.transaction.support.TransactionSynchronizationManager
import java.util.UUID
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class NotificationTransactionTest {
    @Test
    fun `all asynchronous notifications allow delivery ticket writes`() {
        val accountId = UUID.randomUUID()
        val repository = mockk<DeviceTokenRepository>()
        every { repository.findAllByAccountId(any()) } returns listOf(
            DeviceToken.register(accountId, "test-token", StorePlatform.IOS),
        )
        every { repository.findAllTokens() } returns listOf("test-token")
        var sends = 0
        val sender = object : PushSender {
            override fun send(tokens: List<String>, message: PushMessage) {
                assertEquals(listOf("test-token"), tokens)
                assertTrue(TransactionSynchronizationManager.isActualTransactionActive())
                assertFalse(TransactionSynchronizationManager.isCurrentTransactionReadOnly(),
                    "Expo ticket persistence must not inherit a read-only transaction")
                sends++
            }
        }
        val manager = object : AbstractPlatformTransactionManager() {
            override fun doGetTransaction(): Any = Any()
            override fun doBegin(transaction: Any, definition: TransactionDefinition) = Unit
            override fun doCommit(status: DefaultTransactionStatus) = Unit
            override fun doRollback(status: DefaultTransactionStatus) = Unit
        }
        val interceptor = TransactionInterceptor().apply {
            transactionManager = manager
            transactionAttributeSource = AnnotationTransactionAttributeSource()
            afterPropertiesSet()
        }
        val proxy = ProxyFactory(NotificationService(repository, sender)).apply {
            isProxyTargetClass = true
            addAdvice(interceptor)
        }.proxy as NotificationService
        val methods = NotificationService::class.java.declaredMethods.filter {
            it.isAnnotationPresent(Async::class.java)
        }
        assertTrue(methods.isNotEmpty())
        methods.forEach { method ->
            val args = method.parameterTypes.map { type ->
                when (type) {
                    UUID::class.java -> accountId
                    String::class.java -> "test"
                    Int::class.javaPrimitiveType -> 1
                    PushMessage::class.java -> PushMessage("test", "test", emptyMap())
                    else -> error("Add a test fixture for $type")
                }
            }.toTypedArray()
            method.invoke(proxy, *args)
        }
        assertEquals(methods.size, sends)
    }
}
