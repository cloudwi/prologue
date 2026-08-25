/*
 * 스토어 스크린샷 생성기 — `node store/v3/build.mjs`
 *
 * 예전 스크린샷(store/*.png, store/v2)은 크림 바탕에 클립아트를 얹은 **연출 그림**이었다.
 * 두 가지가 낡아 보이게 만들었다: (1) 배경이 크림이라 지금의 차가운 회색 디자인 시스템과
 * 다른 앱처럼 보였고, (2) 실제 화면이 한 장도 없어 무엇을 하는 앱인지 알 수 없었다.
 *
 * 그래서 이 스크립트는 그림을 그리지 않는다. 앱 코드의 pt 값(폰트·여백·라운드)을 그대로 옮겨
 * 실제 화면을 재현하고, 기기 틀에 넣어 헤드라인 한 줄을 얹는다. 값이 코드와 어긋나면
 * 스토어와 앱이 달라 보이므로, 화면을 고치면 여기도 같이 고친다.
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(DIR, 'out');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const MARK = '../../design/brand/brand-mark.png';
const P = (name) => `../personas/${name}.jpg`;

/** iOS 상태 바 — 실제 스크린샷처럼 읽히게 하는 최소한의 장치. */
const status = `
  <div class="status">
    <span>9:41</span>
    <span class="icons">
      <svg width="18" height="12" viewBox="0 0 18 12"><g fill="#1B2126">
        <rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/>
        <rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/>
      </g></svg>
      <svg width="16" height="12" viewBox="0 0 16 12"><path d="M8 10.5 5.6 8.1a3.4 3.4 0 0 1 4.8 0L8 10.5Zm0-4.9c-1.7 0-3.3.7-4.5 1.9L2.2 6.2a8.2 8.2 0 0 1 11.6 0l-1.3 1.3A6.4 6.4 0 0 0 8 5.6Z" fill="#1B2126"/></svg>
      <svg width="25" height="12" viewBox="0 0 25 12">
        <rect x="0.5" y="0.5" width="21" height="11" rx="3.2" fill="none" stroke="#1B2126" stroke-opacity=".38"/>
        <rect x="2" y="2" width="15" height="8" rx="2" fill="#1B2126"/>
        <path d="M23 4.2v3.6a2 2 0 0 0 0-3.6Z" fill="#1B2126" fill-opacity=".38"/>
      </svg>
    </span>
  </div>
  <div class="island"></div>`;

/** SubScreen의 네이티브 스택 헤더 — 모임 초대장은 title=""이라 뒤로 셰브런만 선다. */
const navBar = `
  <div class="navbar">
    <svg width="12" height="20" viewBox="0 0 12 20" fill="none">
      <path d="M10 1 2 10l8 9" stroke="#1B2126" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  </div>`;

/** 프로필 썸네일 — 세로 4:5 라운드 사각형(원으로 자르면 얼굴이 토막 난다, 2026-08-25). */
const thumb = (name) => `<img class="thumb" src="${P(name)}" alt="">`;

const panels = [
  {
    file: '1-question',
    eyebrow: 'PROLOGUE',
    title: '사진보다 <em>생각</em>이<br>먼저 닿아요',
    sub: '매일 도착하는 한 문답. 오늘의 마음을 한 줄 적는 것으로 시작해요.',
    screen: `
      <div class="scroll">
        <div class="cover">
          <div class="date-caption">8월 25일 화요일</div>
          <div class="q-eyebrow">오늘의 질문</div>
          <div class="question">당신의 하루에서 가장 아끼는 시간은 언제인가요?</div>
          <div class="answer-block">
            <div class="rule"></div>
            <div class="grow">
              <div class="answer-text">해가 완전히 넘어가기 직전, 골목이 통째로 주황색이 되는 20분이요. 그때만은 아무 생각 없이 걷습니다.</div>
              <div class="answer-actions">
                <div class="answered-tag">✓ 오늘 답변했어요 · 잉크 +3</div>
                <div class="answer-links">수정<span>·</span>프로필에 올리기</div>
              </div>
            </div>
          </div>
        </div>
        <div style="margin-top:30px">
          <div class="sec-head">
            <div class="sec-eyebrow">오늘의 상대</div>
            <div class="sec-sub">답을 남기면, 한 사람</div>
          </div>
          <div class="peer-card">
            <div class="peer-answer-block">
              <div class="peer-q">당신의 하루에서 가장 아끼는 시간은 언제인가요?</div>
              <div class="peer-answer">아침에 물 끓이는 3분이요. 아무것도 안 해도 되는 시간이 하루에 그때뿐이라서요.</div>
            </div>
            <img class="peer-photo" src="${P('조용한위로-1')}" alt="">
          </div>
        </div>
      </div>`,
  },
  {
    file: '2-peer',
    eyebrow: 'ONE A DAY',
    title: '답을 남기면,<br><em>한 사람</em>',
    sub: '카드를 끝없이 넘기는 대신 오늘 도착한 한 명에게 집중해요.',
    screen: `
      <div class="scroll">
        <div class="sec-head" style="margin-top:6px">
          <div class="sec-eyebrow">오늘의 상대</div>
          <div class="sec-sub">답을 남기면, 한 사람</div>
        </div>
        <div class="peer-card">
          <div class="peer-answer-block">
            <div class="peer-q">당신의 하루에서 가장 아끼는 시간은 언제인가요?</div>
            <div class="peer-answer">아침에 물 끓이는 3분이요. 아무것도 안 해도 되는 시간이 하루에 그때뿐이라서, 주전자 소리만 듣고 서 있어요.</div>
          </div>
          <img class="peer-photo" src="${P('조용한위로-1')}" alt="">
          <div class="peer-body">
            <div class="peer-head">
              <div class="grow">
                <div class="peer-name">조용한위로</div>
                <div class="peer-meta">29세 · 164cm · 마포구 · 오늘 활동</div>
              </div>
              <div class="peer-cta">프로필 보기</div>
            </div>
            <div class="peer-bio">기록하는 걸 좋아해요. 만년필로 쓴 일기가 벌써 열두 권이 됐어요.</div>
            <div class="chips">
              <div class="chip">글쓰기</div><div class="chip">전시 보기</div>
              <div class="chip">느긋함</div><div class="chip">고양이</div>
            </div>
          </div>
        </div>
      </div>`,
  },
  {
    file: '3-mails',
    eyebrow: 'NO CHAT',
    title: '채팅 대신<br><em>편지</em> 한 통',
    sub: '마음은 봉투로 도착해요.<br>열어볼지 조용히 거절할지는 받는 사람의 선택이에요.',
    screen: `
      <div class="scroll">
        <div class="mail-header">
          <div class="mail-title">편지함</div>
          <div class="mail-sub">호감 3 · 편지 1</div>
        </div>
        <div class="sec-head"><div class="sec-eyebrow">받은 편지</div></div>
        <div class="envelope">
          <div class="row">
            ${thumb('별보는밤-1')}
            <div class="grow" style="margin-left:12px">
              <div class="row-name">별보는밤</div>
              <div class="row-meta">33세 · 성동구</div>
            </div>
          </div>
          <div class="envelope-body">
            <img class="env-mark" src="${MARK}" alt="">
            <div class="sealed">별보는밤님의 편지가 도착했어요</div>
            <div class="sealed-hint">2일 안에 열리지 않으면 보낸 분에게 돌아가요.</div>
          </div>
          <div class="sealed-actions">
            <div class="decline">조용히 거절</div>
            <div class="open-btn">열어보기</div>
          </div>
        </div>
        <div class="sec-head" style="margin-top:26px"><div class="sec-eyebrow">나에게 온 호감</div></div>
        <div class="list-card">
          <div class="row list-row">
            ${thumb('고요한아침-1')}
            <div class="grow" style="margin-left:12px">
              <div class="row-name">고요한아침</div>
              <div class="row-meta">31세 · 서대문구</div>
              <div class="row-expiry">2일 뒤 사라져요</div>
            </div>
            <div class="row-chip">프로필 보기</div>
          </div>
          <div class="row list-row divider">
            ${thumb('주말셰프-1')}
            <div class="grow" style="margin-left:12px">
              <div class="row-name">주말셰프</div>
              <div class="row-meta">28세 · 용산구</div>
              <div class="row-mutual">서로 호감 · 편지를 보낼 차례예요</div>
            </div>
            <div class="row-chip primary">편지 쓰기</div>
          </div>
          <div class="row list-row divider">
            ${thumb('달빛산책-1')}
            <div class="grow" style="margin-left:12px">
              <div class="row-name">달빛산책</div>
              <div class="row-meta">30세 · 종로구</div>
              <div class="row-expiry">오늘까지</div>
            </div>
            <div class="row-chip">프로필 보기</div>
          </div>
        </div>
        <div class="sec-head" style="margin-top:26px">
          <div class="sec-eyebrow">내가 보낸 호감</div>
          <div class="sec-sub">2</div>
        </div>
        <div class="list-card">
          <div class="row list-row">
            ${thumb('종이비행기-1')}
            <div class="grow" style="margin-left:12px">
              <div class="row-name">종이비행기</div>
              <div class="row-meta">27세 · 마포구</div>
            </div>
            <div class="row-chip">프로필 보기</div>
          </div>
        </div>
      </div>`,
  },
  {
    file: '4-letter',
    eyebrow: 'CONTACT',
    title: '연락처는<br><em>편지에 담아</em>',
    sub: '답장으로 내 연락처를 건네야 상대의 연락처도 열려요.<br>다음 이야기는 앱 밖에서.',
    screen: `
      <div class="scroll">
        <div class="mail-header">
          <div class="mail-title">편지함</div>
          <div class="mail-sub">호감 3 · 편지 1</div>
        </div>
        <div class="sec-head"><div class="sec-eyebrow">받은 편지</div></div>
        <div class="letter">
          <div class="letter-rule"></div>
          <div class="row">
            ${thumb('별보는밤-1')}
            <div class="grow" style="margin-left:12px">
              <div class="row-name">별보는밤</div>
              <div class="row-meta">33세 · 성동구</div>
            </div>
          </div>
          <div class="letter-body">주전자 소리만 듣고 서 있다는 문장을 오래 봤어요. 저는 필름 카메라를 들고 골목을 걷는 편인데, 아무 말 없이 같이 걸어도 어색하지 않은 사람을 오래 기다렸던 것 같아요.<br><br>번호를 같이 두고 갑니다. 편한 때 연락 주세요.</div>
          <div class="contact-box">
            <svg width="16" height="16" viewBox="0 0 16 16"><path d="M8 1a3.4 3.4 0 0 0-3.4 3.4V6.4H4A1.4 1.4 0 0 0 2.6 7.8v5.6A1.4 1.4 0 0 0 4 14.8h8a1.4 1.4 0 0 0 1.4-1.4V7.8A1.4 1.4 0 0 0 12 6.4h-.6V4.4A3.4 3.4 0 0 0 8 1Zm2 5.4H6V4.4a2 2 0 1 1 4 0v2Z" fill="#C25539"/></svg>
            <div class="contact-text">답장을 보내면 연락처가 열려요</div>
          </div>
          <div class="letter-actions">
            <div class="reply-btn">답장하기 · 잉크 3</div>
          </div>
        </div>
        <div class="sec-head" style="margin-top:26px"><div class="sec-eyebrow">나에게 온 호감</div></div>
        <div class="list-card">
          <div class="row list-row">
            ${thumb('고요한아침-1')}
            <div class="grow" style="margin-left:12px">
              <div class="row-name">고요한아침</div>
              <div class="row-meta">31세 · 서대문구</div>
              <div class="row-expiry">2일 뒤 사라져요</div>
            </div>
            <div class="row-chip">프로필 보기</div>
          </div>
          <div class="row list-row divider">
            ${thumb('주말셰프-1')}
            <div class="grow" style="margin-left:12px">
              <div class="row-name">주말셰프</div>
              <div class="row-meta">28세 · 용산구</div>
              <div class="row-mutual">서로 호감 · 편지를 보낼 차례예요</div>
            </div>
            <div class="row-chip primary">편지 쓰기</div>
          </div>
        </div>
      </div>`,
  },
  {
    file: '5-meetup',
    eyebrow: 'OFFLINE',
    title: '문답 밖에서<br><em>직접 만나요</em>',
    sub: '청첩장처럼 도착하는 오프라인 모임 초대장.<br>링크 하나로 친구도 부를 수 있어요.',
    screen: `${navBar}
      <div class="invite">
        <img class="invite-cover" src="${P('주말셰프-1')}" alt="">
        <div class="invite-headline">
          <div class="invite-eyebrow">INVITATION</div>
          <div class="invite-occurrence">3번째 만남</div>
          <div class="invite-title">주말 집밥 모임</div>
          <div class="invite-numerals">2026. 09. 26.</div>
          <div class="invite-words">토요일 오후 6시 · 연남동</div>
        </div>
        <div class="invite-section">
          <div class="invite-sec-eyebrow">GREETING</div>
          <div class="invite-sec-title">모시는 글</div>
          <div class="invite-greeting">제철 재료로 한 상 차려요. 요리를 못해도 괜찮아요.</div>
          <div class="invite-host">
            <div class="host-caption">여는 사람</div>
            <div class="host-name">주말셰프</div>
            <div class="host-meta">지금까지 2회 개최 · 프로필 보기 ›</div>
          </div>
        </div>
      </div>`,
  },
];

const html = (p, cls) => `<!doctype html>
<html lang="ko"><head><meta charset="utf-8">
<link rel="stylesheet" href="frame.css"><link rel="stylesheet" href="screens.css">
<title>${p.file}</title></head>
<body class="${cls}"><div class="panel">
  <div class="head">
    <div class="eyebrow">${p.eyebrow}</div>
    <h1>${p.title}</h1>
    <div class="sub">${p.sub}</div>
  </div>
  <div class="device"><div class="screen"><div class="app">${status}${p.screen}</div></div></div>
</div></body></html>`;

/** 애플 6.9"·6.5"와 Play 폰 — 같은 패널을 세 판형으로 굽는다. */
const FORMATS = [
  { dir: 'ios', cls: 'ios', size: '1320,2868' },
  { dir: 'ios65', cls: 'ios65', size: '1284,2778' },
  { dir: 'android', cls: 'android', size: '1080,1920' },
];

for (const f of FORMATS) {
  mkdirSync(resolve(OUT, f.dir), { recursive: true });
  for (const p of panels) {
    const page = resolve(DIR, `.${f.dir}-${p.file}.html`);
    writeFileSync(page, html(p, f.cls));
    execFileSync(CHROME, [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      '--allow-file-access-from-files',
      '--virtual-time-budget=3000',
      `--screenshot=${resolve(OUT, f.dir, `${p.file}.png`)}`,
      `--window-size=${f.size}`,
      `file://${page}`,
    ], { stdio: 'ignore' });
    rmSync(page);
    console.log(`\u2713 ${f.dir}/${p.file}.png`);
  }
}
