package com.prologue.backend.dailymeet.interfaces.rest

import com.prologue.backend.dailymeet.domain.model.DailyMeetException
import com.prologue.backend.dailymeet.domain.model.Question
import com.prologue.backend.dailymeet.domain.model.QuestionInputType
import com.prologue.backend.dailymeet.domain.model.QuestionOption
import com.prologue.backend.dailymeet.domain.model.QuestionRotation
import com.prologue.backend.dailymeet.domain.model.ServiceDay
import com.prologue.backend.dailymeet.domain.repository.QuestionRepository
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

data class QuestionItem(val id: Long, val content: String, val isToday: Boolean,
    val inputType: QuestionInputType = QuestionInputType.TEXT, val options: List<QuestionOption> = emptyList())

data class QuestionsResponse(val questions: List<QuestionItem>)

data class QuestionRequest(val content: String, val inputType: QuestionInputType? = null, val options: List<QuestionOption>? = null)

/**
 * 질문 풀 관리 — 웹 어드민(ROLE_ADMIN). 질문은 서비스의 핵심 콘텐츠라 추가·수정이 주간 운영 업무다.
 * 삭제는 없다: 답변들이 질문을 참조하므로, 문구가 아쉬우면 수정한다.
 * 질문을 추가하면 해당 형식 풀의 순번이 바뀌어 오늘의 질문이 달라질 수 있다.
 */
@RestController
@RequestMapping("/admin/questions")
class AdminQuestionController(
    private val questionRepository: QuestionRepository,
) {
    @GetMapping
    fun list(): QuestionsResponse {
        val questions = questionRepository.findAllOrdered()
        // 오늘의 질문 판정은 앱과 같은 규칙을 쓴다 — 공식을 베끼면 언젠가 두 화면이 다른 날을 가리킨다.
        val todayId = if (questions.isEmpty()) null else QuestionRotation.of(questions, ServiceDay.now()).id
        return QuestionsResponse(
            questions.map { QuestionItem(it.id, it.content, it.id == todayId, it.inputType, it.options) },
        )
    }

    @PostMapping
    fun add(@RequestBody request: QuestionRequest): QuestionItem {
        val content = normalize(request.content)
        val nextId = (questionRepository.findAllOrdered().maxOfOrNull { it.id } ?: 0L) + 1
        val saved = questionRepository.save(Question(nextId, content, request.inputType ?: QuestionInputType.TEXT, request.options ?: emptyList()))
        return QuestionItem(saved.id, saved.content, isToday = false, saved.inputType, saved.options)
    }

    @PutMapping("/{id}")
    fun edit(@PathVariable id: Long, @RequestBody request: QuestionRequest): QuestionItem {
        val content = normalize(request.content)
        val existing = questionRepository.findAllOrdered().find { it.id == id } ?: throw DailyMeetException("질문을 찾을 수 없어요")
        if ((request.inputType != null && request.inputType != existing.inputType) || (request.options != null && request.options != existing.options)) {
            throw DailyMeetException("답변의 뜻을 지키기 위해 형식과 선택지는 새 질문으로 추가해주세요")
        }
        val saved = questionRepository.save(Question(id, content, existing.inputType, existing.options))
        return QuestionItem(saved.id, saved.content, isToday = false, saved.inputType, saved.options)
    }

    private fun normalize(content: String): String {
        val trimmed = content.trim()
        if (trimmed.isEmpty()) throw DailyMeetException("질문 내용을 입력해 주세요")
        if (trimmed.length > 500) throw DailyMeetException("질문은 500자 이하여야 해요")
        return trimmed
    }

}
