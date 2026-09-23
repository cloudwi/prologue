# 성비 게이트 — 남성 대기열

소개팅 앱은 성비가 생사다. 남초로 기울면 여성 한 명이 하루에 여러 번 소개되고, 하트와 알림이
쌓여 여성이 먼저 떠난다. 여성이 떠나면 남성도 아무도 못 만난다. 그래서 여성은 바로 들이고,
신규 남성은 활성 성비가 기준을 넘을 때까지 **매칭 풀 밖에서** 기다린다.

**기본은 꺼짐**이다. 켜는 결정은 운영자가 한다.

규칙은 [GenderGatePolicy](../../backend/src/main/kotlin/com/prologue/backend/member/domain/model/GenderGatePolicy.kt),
유스케이스는 [MemberGateService](../../backend/src/main/kotlin/com/prologue/backend/member/application/service/MemberGateService.kt),
표는 `V72__member_gate.sql`.

## 동작

- 스위치가 켜진 채로 **온보딩을 마친 신규 남성**은 `member_gate`에 WAITING으로 들어간다. 여성은 아무 영향이 없다.
- 기다리는 남성은 매칭 풀에 없다 — 본인도 오늘의 상대를 받지 않고(`peers: []`, `gateStatus: WAITING`),
  여성의 후보 선정에서도 빠진다([PeerEligibility](../../backend/src/main/kotlin/com/prologue/backend/dailymeet/domain/model/PeerEligibility.kt)).
  늦은 도착 스케줄러와 취향 카드 몫도 채우지 않는다.
- 문답 답변·피드·모임은 그대로 쓸 수 있다. 막는 건 소개뿐이다. 앱은 오늘의 상대 자리에
  "입장을 기다리고 있어요"를 그리고, 내 차례(`waitingPosition`)를 함께 보여준다.
- 기다리는 동안은 **성별을 바꿀 수 없다** — 남성이 여성으로 고쳐 들어오는 구멍을 막는다.
- 행이 없으면 입장 상태다(fail-open). 게이트 이전 회원은 백필하지 않는다.
- **스위치를 끄면 즉시 전원 입장과 같다.** WAITING 행이 남아 있어도 무시된다 — 표는 기록이고 결정은 설정이 한다.
  다시 켜면 그 행들이 그대로 대기가 된다.

## 입장

1. **수동** — 어드민 회원 화면의 "입장" 버튼(`POST /admin/members/{id}/admit`).
2. **자동** — 매시 정각(KST) [GateAdmissionScheduler](../../backend/src/main/kotlin/com/prologue/backend/member/application/service/GateAdmissionScheduler.kt)가
   활성 성비를 재고 자리가 난 만큼 **오래 기다린 순**으로 들인다.

   ```
   활성      = accounts.status = ACTIVE 이고 last_seen_at 이 최근 active-days 안인 프로필
   자리      = floor(활성여성 / min-female-ratio) - 활성남성      (음수면 0)
   ```
   예: 기준 0.8, 활성 여 8 · 남 6 → `floor(8 / 0.8) - 6 = 4`명. 활성 여 3 · 남 10이면 0명 — 이미 기울었으면 더 들이지 않는다.

입장한 사람에게는 푸시가 간다 — "프롤로그에 입장했어요 / 오늘의 질문에 답을 남기면 소개가 시작돼요".
입장은 소개가 아니다. 소개는 답변이 연다.

## 설정

`application.yaml`의 `gate:` 블록. 전부 환경변수로 덮는다.

| 키 | 환경변수 | 기본 | 뜻 |
| --- | --- | --- | --- |
| `gate.enabled` | `GENDER_GATE` | `false` | 스위치 |
| `gate.min-female-ratio` | `GENDER_GATE_MIN_FEMALE_RATIO` | `0.8` | 활성 여성/남성이 이 값 이상이어야 남성을 더 들인다 |
| `gate.active-days` | `GENDER_GATE_ACTIVE_DAYS` | `14` | "활성"의 기준 일수 |

### 켜는 법

Render 대시보드 → backend 서비스 → Environment → `GENDER_GATE=true` (render.yaml에 `sync: false`로 자리만 잡혀 있다).
환경변수라 서비스가 다시 뜬다. 끄려면 `false`로 바꾸거나 값을 비운다.

켜기 전에 어드민 대시보드의 **성비 게이트** 타일에서 활성 남녀 수를 보고 기준을 정한다.
기준 1.0(1:1)은 권하지 않는다 — 남성 가입이 언제나 많아 줄이 영영 안 줄고, 0.8 정도면
노출 상한(`daily.max-exposure-per-day`)과 합쳐 여성 쪽 피로가 견딜 만한 범위에 든다.

## 운영 확인

- 대시보드(`/admin`) 성비 게이트 타일 — 켜짐 여부, 대기 인원, 활성 여·남, 지금 들일 수 있는 수.
  꺼져 있어도 활성 수는 보인다(켤지 판단하는 재료). `GET /admin/stats`의 `gateEnabled / gateWaiting / activeFemale / activeMale / gateAdmittable`.
- 회원 목록(`/admin/members`) — 기다리는 남성에게 "입장 대기" 배지와 "입장" 버튼. 스위치가 꺼져 있어도 배지는 보인다.
- 로그 — 자동 입장이 있으면 `성비 게이트 자동 입장 N명 (활성 여 F · 남 M, 대기 W)`.
- DB — `select status, count(*) from member_gate group by status;`

## 열어둔 것

- 기다리는 남성이 잉크로 산 열람권·피드 프로필 열기는 막지 않았다 — 요구는 매칭 풀뿐이라.
- 기다리는 동안 남긴 답은 풀에 있지만 여성 후보에서 빠지므로 아무에게도 보이지 않는다. 입장하면 그 답으로 바로 후보가 된다.
- 게이트 이전 회원 백필 없음. 필요하면 `member_gate`에 직접 WAITING 행을 넣으면 된다(켜져 있을 때만 효력).
