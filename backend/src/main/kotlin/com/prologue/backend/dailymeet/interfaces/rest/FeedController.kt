package com.prologue.backend.dailymeet.interfaces.rest

import com.prologue.backend.dailymeet.application.service.FeedPostView
import com.prologue.backend.dailymeet.application.service.FeedService
import com.prologue.backend.dailymeet.application.service.PeerMatchingService
import com.prologue.backend.dailymeet.application.service.ProfileAccessService
import com.prologue.backend.dailymeet.interfaces.rest.dto.PeerResponse
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.*
import java.time.Instant
import java.util.UUID

data class FeedResponse(val posts: List<FeedPostResponse>)
data class FeedPostResponse(
    val id: String, val sourceType: String, val nickname: String, val gender: String,
    val prompt: String, val content: String, val createdAt: Instant, val heartCount: Int,
    val hearted: Boolean, val mine: Boolean, val profileUnlocked: Boolean, val photoPreview: String?,
) {
    companion object { fun from(v: FeedPostView) = FeedPostResponse(
        v.id.toString(), v.sourceType.name, v.nickname, v.gender.name, v.prompt, v.content,
        v.createdAt, v.heartCount, v.hearted, v.mine, v.profileUnlocked, v.photoPreview,
    ) }
}
data class FeedHeartRequest(val liked: Boolean)
data class FeedReportRequest(val reason: String)
data class FeedUnlockResponse(val spent: Boolean, val balance: Int, val peer: PeerResponse)

@RestController
@RequestMapping("/feed")
class FeedController(
    private val feed: FeedService,
    private val profileAccess: ProfileAccessService,
    private val peers: PeerMatchingService,
) {
    @GetMapping fun latest(authentication: Authentication, @RequestParam(defaultValue = "latest") sort: String) =
        FeedResponse(feed.latest(account(authentication), sort).map(FeedPostResponse::from))

    @PostMapping("/daily/{questionId}") fun publishDaily(authentication: Authentication, @PathVariable questionId: Long) =
        feed.publishDaily(account(authentication), questionId)

    @PostMapping("/taste/{cardId}") fun publishTaste(authentication: Authentication, @PathVariable cardId: Long) =
        feed.publishTaste(account(authentication), cardId)

    @PostMapping("/{postId}/heart") fun heart(authentication: Authentication, @PathVariable postId: UUID, @RequestBody body: FeedHeartRequest) =
        feed.setHeart(account(authentication), postId, body.liked)

    @DeleteMapping("/{postId}") fun delete(authentication: Authentication, @PathVariable postId: UUID) =
        feed.delete(account(authentication), postId)

    @PostMapping("/{postId}/report") fun report(authentication: Authentication, @PathVariable postId: UUID, @RequestBody body: FeedReportRequest) =
        feed.report(account(authentication), postId, body.reason)

    @PostMapping("/{postId}/profile/unlock")
    fun unlock(authentication: Authentication, @PathVariable postId: UUID): FeedUnlockResponse {
        val viewer = account(authentication)
        val author = feed.visibleAuthorOf(viewer, postId)
        val result = profileAccess.unlockFeedProfile(viewer, author)
        return FeedUnlockResponse(result.spent, result.balance, PeerResponse.from(peers.feedProfile(viewer, author)))
    }

    private fun account(authentication: Authentication) = UUID.fromString(authentication.name)
}
