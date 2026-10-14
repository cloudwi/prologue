/** Store-only artwork. Generate HTML, then capture with the documented browser UI. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
const htmlDir = resolve(dir, 'html');
mkdirSync(htmlDir, { recursive: true });
const photo = '../../../web/public/photos/cafe-selfie-refined-2026-09.webp';
const host = '../../../app/assets/images/demo-profiles/demo-thursdaykitchen-2.jpg';
const sender = '../../../app/assets/images/demo-profiles/demo-thursdaykitchen-1.jpg';
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
const choice = (label, checked, kind='radio', prefix='') => `<div class="choice ${checked ? 'checked' : ''}">${prefix ? `<b>${prefix}</b>` : ''}<span>${label}</span><strong>${checked ? '✓' : kind === 'checkbox' ? '□' : '○'}</strong></div>`;
const question = (prompt, rows, multi=false) => `<div class="scroll"><div class="cover"><div class="date-caption">10월 14일 수요일</div><div class="question">${prompt}</div><div class="answer-sheet"><p class="choice-hint">${multi ? '여러 개 골라도 좋아요' : '한 가지를 골라주세요'}</p><div class="choices">${rows}</div><div class="answer-footer"><span>${multi ? '2개' : '1개'} 선택</span><div class="save-button">남기기</div></div></div></div><div class="taste-card"><strong>오늘의 취향</strong><p>가볍게 고르며 서로를 알아가요</p><span>취향 카드 답하기　›</span></div></div>`;
const panels = [
  {file:'1-ox', label:'프롤로그', title:'가벼운 질문,<br><em>OX로 시작해요</em>', sub:'길게 쓰지 않아도 괜찮아요.',
   screen:question('여행 갈 때 짐은 미리 챙겨두는 편인가요?',choice('맞아요',true,'radio','O')+choice('아니에요',false,'radio','X'))},
  {file:'2-choices', label:'오늘의 질문', title:'내 취향을<br><em>골라 남겨요</em>', sub:'하나 고르기 · 여러 개 고르기 · 짧은 글',
   screen:question('함께 산책할 때 눈길이 가는 것은 무엇인가요?',choice('작은 가게',true,'checkbox')+choice('동물',false,'checkbox')+choice('꽃과 나무',true,'checkbox')+choice('하늘',false,'checkbox'),true)},
  {file:'3-peer', label:'오늘의 상대', title:'답을 남기고,<br><em>한 사람을 알아가요</em>', sub:'상대의 답부터 천천히 읽어보세요.',
   screen:`<div class="scroll"><div class="sec-head"><div class="sec-eyebrow">오늘의 상대</div><div class="sec-sub">예시 프로필</div></div><div class="peer-card"><div class="peer-answer-block"><div class="peer-q">함께 산책할 때 눈길이 가는 것은 무엇인가요?</div><div class="peer-answer">작은 가게, 꽃과 나무</div></div><img class="peer-photo" src="${photo}" alt="가상 프로필 이미지"><div class="peer-body"><div class="peer-head"><div class="grow"><div class="peer-name">조용한위로</div><div class="peer-meta">28세 · 마포구 · 예시 프로필</div></div><div class="peer-cta">프로필 보기</div></div><div class="peer-bio">주말에는 골목을 걷고 작은 가게를 구경해요.</div></div></div></div>`},
  {file:'4-letter', label:'편지로 이어지는 만남', title:'마음이 닿으면<br><em>편지로 이어가요</em>', sub:'답장으로 서로의 연락처를 나눠요.',
   screen:`<div class="scroll"><div class="mail-header"><div class="mail-title">편지함</div></div><div class="sec-head"><div class="sec-eyebrow">받은 편지</div><div class="sec-sub">예시 편지</div></div><div class="letter"><div class="letter-rule"></div><div class="row"><img class="thumb" src="${sender}" alt="가상 프로필 이미지"><div class="grow" style="margin-left:12px"><div class="row-name">별보는밤</div><div class="row-meta">33세 · 성동구 · 예시 프로필</div></div></div><div class="letter-body">저도 산책길에서 작은 가게를 구경하는 걸 좋아해요.<br><br>좋아하는 동네 이야기를 나누고 싶어요. 편한 때 답장 주세요.</div><div class="contact-box"><span>▣</span><div class="contact-text">답장을 보내면 연락처가 열려요</div></div><div class="letter-actions"><div class="reply-btn">답장하기 · 잉크 25</div></div></div><div class="envelope-note"><img src="../../../design/brand/brand-mark.png" alt=""><p>앱 안 채팅 대신<br>짧은 편지로 마음을 전해요.</p></div></div>`},
  {file:'5-meetup', label:'프롤로그 모임', title:'좋아하는 일로<br><em>직접 만나요</em>', sub:'일시 · 장소 · 참가비를 보고 신청해요.',
   screen:`<div class="navbar">‹</div><div class="invite"><img class="invite-cover" src="${host}" alt="예시 모임 이미지"><div class="invite-headline"><div class="headline-meta"><span>예시 모임</span><span class="date-badge">D-10</span></div><div class="invite-title">주말 집밥 모임</div><div class="summary"><div><span>일시</span><b>2026. 10. 24. (토)<br>오후 6:00–8:00</b></div><div><span>장소</span><b>연남동 공유 주방</b></div><div><span>참가비</span><b>무료</b></div><div><span>인원</span><b>정원 6명 · 확정 0명</b></div><div class="calendar-toggle">달력으로 보기　⌄</div></div></div><div class="invite-section"><div class="invite-sec-title">모임 소개</div><p class="invite-greeting">함께 한 상 차리며 좋아하는 음식 이야기를 나눠요.</p></div></div>`},
];
const formats = [{name:'ios',width:1320,height:2868},{name:'ios65',width:1284,height:2778},{name:'android',width:1080,height:1920}];
for (const f of formats) {
  mkdirSync(resolve(dir,'out',f.name),{recursive:true});
  for (const p of panels) {
    const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><link rel="stylesheet" href="../styles.css"><title>${p.file} · ${f.name}</title></head><body class="${f.name}"><div class="panel"><div class="head"><div class="eyebrow">${p.label}</div><h1>${p.title}</h1><div class="sub">${p.sub}</div><div class="example">예시 화면 · 인물과 답변, 모임은 가상입니다</div></div><div class="device"><div class="screen"><div class="app">${status}${p.screen}</div></div></div></div></body></html>`;
    writeFileSync(resolve(htmlDir,`${f.name}-${p.file}.html`),html);
  }
}
writeFileSync(resolve(dir,'manifest.json'),JSON.stringify({formats,panels:panels.map(({file,title,sub})=>({file,title:title.replace(/<[^>]*>/g,' ').trim(),sub}))},null,2)+'\n');
console.log('Prepared 15 store-only HTML panels. Capture with cua_repl; no web/app assets are overwritten.');
