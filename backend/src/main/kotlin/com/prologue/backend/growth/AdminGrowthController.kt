package com.prologue.backend.growth

import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.server.ResponseStatusException

@RestController
@RequestMapping("/admin/growth")
class AdminGrowthController(private val reports: GrowthReportService) {
    @GetMapping
    fun report(@RequestParam(defaultValue = "30") days: Int): GrowthReport {
        if (days !in 1..90) throw ResponseStatusException(HttpStatus.BAD_REQUEST, "days must be between 1 and 90")
        return reports.report(days)
    }
}
