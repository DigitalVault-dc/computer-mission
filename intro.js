// 완전 입문반: 웹 안에서 바로 하는 활동과 마우스 게임
(function () {
const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

/* ---------------- 컴퓨터 기기 ---------------- */
const PARTS = {
  tower:   { name: "본체", kind: "처리", desc: "컴퓨터의 두뇌가 들어 있는 상자예요. 계산하고, 기억하고, 파일을 저장해요.", more: "앞쪽의 ⏻ 단추가 전원 버튼이에요. 작은 네모 구멍은 USB를 꽂는 곳이에요." },
  monitor: { name: "모니터", kind: "출력", desc: "컴퓨터가 보여 주는 글자와 그림이 나타나는 화면이에요.", more: "모니터에도 따로 전원 버튼이 있어요. 보통 오른쪽 아래에 있어요." },
  keyboard:{ name: "키보드", kind: "입력", desc: "글자와 숫자를 쳐서 컴퓨터에 알려 주는 기기예요.", more: "자판 하나하나를 '키'라고 불러요." },
  mouse:   { name: "마우스", kind: "입력", desc: "화면의 화살표를 움직이고, 눌러서 고르는 기기예요.", more: "생김새가 생쥐(mouse)를 닮아서 마우스라는 이름이 붙었어요." },
  speaker: { name: "스피커", kind: "출력", desc: "컴퓨터의 소리를 밖으로 들려줘요.", more: "음악, 동영상 소리, 알림 소리가 여기서 나와요." },
  headset: { name: "헤드셋", kind: "입력 + 출력", desc: "귀로 듣는 헤드폰과 말하는 마이크가 하나로 붙어 있어요.", more: "듣기는 출력, 말하기는 입력이라서 둘 다 하는 기기예요." },
  webcam:  { name: "웹캠", kind: "입력", desc: "얼굴이나 물건을 찍어 컴퓨터로 보내는 작은 카메라예요.", more: "화상 수업을 할 때 써요. 우리 교실 컴퓨터에는 없을 수도 있어요." },
  printer: { name: "프린터", kind: "출력", desc: "화면에 있는 문서나 그림을 종이에 인쇄해요.", more: "인쇄할 때는 꼭 선생님께 먼저 물어봐요." },
  usb:     { name: "USB 메모리", kind: "저장", desc: "파일을 담아서 다른 컴퓨터로 옮길 수 있는 작은 저장 기기예요.", more: "본체의 USB 구멍에 꽂아서 써요. 손가락만 한 크기예요." }
};
const TOUR = ["tower", "monitor", "keyboard", "mouse", "speaker", "headset", "webcam", "printer", "usb"];
const QUIZ = [
  { a: "monitor", q: "<em>모니터</em>를 찾아 클릭하세요." },
  { a: "tower", q: "컴퓨터의 <em>두뇌</em>가 들어 있는 상자는?" },
  { a: "mouse", q: "<em>마우스</em>를 찾아 클릭하세요." },
  { a: "speaker", q: "<em>소리</em>를 들려주는 기기는?" },
  { a: "keyboard", q: "<em>글자</em>를 쳐서 입력하는 기기는?" },
  { a: "printer", q: "<em>종이에 인쇄</em>하는 기기는?" },
  { a: "headset", q: "<em>듣기와 말하기</em>를 함께 하는 기기는?" },
  { a: "usb", q: "파일을 담아 <em>옮기는</em> 작은 기기는?" },
  { a: "webcam", q: "얼굴을 찍는 <em>작은 카메라</em>는?" }
];

function setupSVG() {
  let keys = "";
  for (let r = 0; r < 4; r++) for (let c = 0; c < 14; c++)
    keys += `<rect x="${257 + c * 18.6}" y="${405 + r * 7.8}" width="15" height="5.6" rx="1.2" class="s-key"/>`;
  return `<svg viewBox="0 0 800 470" class="setup" role="img" aria-label="컴퓨터 책상 그림">
  <rect x="0" y="0" width="800" height="386" class="s-wall"/>
  <rect x="0" y="386" width="800" height="84" class="s-desk"/>
  <rect x="0" y="383" width="800" height="7" class="s-desk2"/>
  <path d="M590 394 C 600 360, 640 372, 650 362" class="s-cord"/>
  <path d="M385 438 C 380 455, 620 455, 652 380" class="s-cord"/>
  <path d="M224 380 C 260 392, 380 392, 650 375" class="s-cord"/>
  <g class="pt" data-part="headset"><title>헤드셋</title>
    <rect x="110" y="52" width="10" height="16" rx="3" class="s-dark"/>
    <path d="M73 150 Q115 52 157 150" class="s-band"/>
    <rect x="60" y="138" width="28" height="48" rx="12" class="s-dark"/>
    <rect x="142" y="138" width="28" height="48" rx="12" class="s-dark"/>
    <path d="M72 184 Q78 214 112 212" class="s-mic"/><circle cx="114" cy="212" r="6" class="s-dark"/>
  </g>
  <g class="pt" data-part="printer"><title>프린터</title>
    <rect x="62" y="286" width="88" height="34" class="s-paper"/>
    <rect x="30" y="312" width="150" height="74" rx="10" class="s-light"/>
    <rect x="48" y="344" width="114" height="7" rx="3" class="s-dark"/>
    <rect x="56" y="349" width="98" height="24" class="s-paper"/>
    <circle cx="160" cy="326" r="4" class="s-led"/>
  </g>
  <g class="pt" data-part="speaker"><title>스피커</title>
    <rect x="182" y="298" width="42" height="88" rx="6" class="s-dark"/>
    <circle cx="203" cy="322" r="8" class="s-cone"/><circle cx="203" cy="358" r="14" class="s-cone"/>
    <rect x="576" y="298" width="42" height="88" rx="6" class="s-dark"/>
    <circle cx="597" cy="322" r="8" class="s-cone"/><circle cx="597" cy="358" r="14" class="s-cone"/>
  </g>
  <g class="pt" data-part="monitor"><title>모니터</title>
    <rect x="382" y="262" width="36" height="112" class="s-dark2"/>
    <rect x="330" y="370" width="140" height="14" rx="7" class="s-dark2"/>
    <rect x="240" y="58" width="320" height="210" rx="12" class="s-dark"/>
    <rect x="254" y="72" width="292" height="176" rx="4" class="s-screen"/>
    <rect x="276" y="96" width="22" height="22" rx="4" class="s-icon"/><rect x="276" y="130" width="22" height="22" rx="4" class="s-icon"/>
    <rect x="254" y="236" width="292" height="12" class="s-bar"/>
    <circle cx="540" cy="258" r="4" class="s-led"/>
  </g>
  <g class="pt" data-part="webcam"><title>웹캠</title>
    <rect x="392" y="50" width="16" height="10" class="s-dark2"/>
    <rect x="380" y="30" width="40" height="22" rx="9" class="s-dark"/>
    <circle cx="400" cy="41" r="6.5" class="s-lens"/>
  </g>
  <g class="pt" data-part="tower"><title>본체</title>
    <rect x="650" y="150" width="110" height="236" rx="8" class="s-dark"/>
    <rect x="660" y="160" width="90" height="216" rx="4" class="s-dark2"/>
    <circle cx="705" cy="192" r="13" class="s-power"/>
    <path d="M705 184 v8" class="s-sym"/><path d="M700 187.5 A7 7 0 1 0 710 187.5" class="s-sym"/>
    <rect x="688" y="222" width="12" height="6" rx="1" class="s-port"/><rect x="710" y="222" width="12" height="6" rx="1" class="s-port"/>
    <path d="M675 300 H735 M675 312 H735 M675 324 H735 M675 336 H735" class="s-vent"/>
  </g>
  <g class="pt" data-part="keyboard"><title>키보드</title>
    <rect x="250" y="400" width="270" height="38" rx="6" class="s-light"/>${keys}
  </g>
  <g class="pt" data-part="mouse"><title>마우스</title>
    <ellipse cx="590" cy="420" rx="19" ry="26" class="s-light"/>
    <path d="M590 394 V414" class="s-vent"/><rect x="587" y="400" width="6" height="10" rx="3" class="s-dark"/>
  </g>
  <g class="pt" data-part="usb"><title>USB 메모리</title>
    <rect x="150" y="418" width="40" height="17" rx="4" class="s-usb"/>
    <rect x="190" y="421" width="14" height="11" class="s-metal"/>
  </g>
</svg>`;
}

function partCard(id, extra) {
  const p = PARTS[id];
  return `<div class="pc-kind">${p.kind} 장치</div><h3 class="pc-name">${p.name}</h3><p class="pc-desc">${p.desc}</p><p class="pc-more">${p.more}</p>${extra || ""}`;
}

/* ---------------- 공통: 단계 안내(슬라이드) ---------------- */
function slides(ctx, list, finishMsg) {
  let i = 0;
  const seen = new Set();
  const wrap = el("div", "sl");
  const art = el("div", "sl-art");
  const side = el("div", "sl-side");
  wrap.append(art, side);
  ctx.arena.append(wrap);
  function show() {
    const s = list[i];
    art.innerHTML = s.art;
    const needs = new Set(s.need || []);
    const plain = (s.title + s.text).replace(/<[^>]+>/g, "");
    const readMs = seen.has(i) ? 0 : (s.wait || Math.min(10000, Math.max(4000, plain.length * 80)));
    seen.add(i);
    let waiting = readMs > 0, left = Math.ceil(readMs / 1000);
    side.innerHTML = `<div class="sl-count">${i + 1} / ${list.length}</div><h3 class="sl-title">${s.title}</h3><div class="sl-text">${s.text}</div>
      <p class="sl-need" ${needs.size ? "" : "hidden"}>${s.needLine || `👆 그림에서 <b>${s.needText || "표시된 곳"}</b>을 클릭해 보세요.`}</p>
      <div class="sl-btns"><button type="button" class="ghost" data-a="prev" ${i === 0 ? "disabled" : ""}>◀ 이전</button><button type="button" class="primary" data-a="next">${i === list.length - 1 ? "다 했어요" : "다음 ▶"}</button></div>`;
    const nextBtn = side.querySelector('[data-a="next"]');
    const label = i === list.length - 1 ? "다 했어요" : "다음 ▶";
    const check = () => { nextBtn.disabled = needs.size > 0 || waiting; nextBtn.textContent = waiting && !needs.size ? `읽는 중… ${left}` : label; };
    check();
    if (waiting) {
      const myI = i;
      const tick = () => { if (i !== myI || !nextBtn.isConnected) return; left--; if (left <= 0) { waiting = false; check(); } else { check(); ctx.after(tick, 1000); } };
      ctx.after(tick, 1000);
    }
    art.querySelectorAll("[data-need]").forEach(n => {
      n.addEventListener("click", () => {
        const id = n.dataset.need;
        if (s.onNeed) s.onNeed(art, id);
        n.classList.add("got");
        needs.delete(id);
        check();
        if (!needs.size) side.querySelector(".sl-need").innerHTML = "잘했어요! [다음]을 누르세요.";
      });
    });
    if (s.init) s.init(art, ctx, id => { needs.delete(id); check(); if (!needs.size) side.querySelector(".sl-need").innerHTML = "잘했어요! [다음]을 누르세요."; });
    side.querySelector('[data-a="prev"]').onclick = () => { if (i > 0) { i--; show(); } };
    nextBtn.onclick = () => { if (i < list.length - 1) { i++; show(); } else ctx.done(3, finishMsg); };
  }
  show();
}

/* ---- 그림 조각 ---- */
const pcArt = (state) => `<svg viewBox="0 0 440 270" class="mini ${state || ""}">
  <rect x="0" y="236" width="440" height="34" class="s-desk"/>
  <rect x="120" y="186" width="26" height="50" class="s-dark2"/><rect x="88" y="228" width="90" height="10" rx="5" class="s-dark2"/>
  <rect x="14" y="18" width="238" height="170" rx="10" class="s-dark"/>
  <rect x="26" y="30" width="214" height="140" rx="4" class="mon-screen"/>
  <g class="boot"><circle cx="118" cy="100" r="5"/><circle cx="133" cy="100" r="5"/><circle cx="148" cy="100" r="5"/><circle cx="163" cy="100" r="5"/></g>
  <circle cx="232" cy="178" r="7" class="mon-led" data-need="mbtn"/>
  <rect x="300" y="40" width="110" height="196" rx="8" class="s-dark"/>
  <rect x="310" y="50" width="90" height="176" rx="4" class="s-dark2"/>
  <circle cx="355" cy="90" r="17" class="pc-btn" data-need="pbtn"/>
  <path d="M355 80 v10" class="s-sym"/><path d="M348 84 A9 9 0 1 0 362 84" class="s-sym"/>
  <circle cx="390" cy="66" r="4" class="pc-led"/>
  <rect x="335" y="128" width="12" height="6" rx="1" class="s-port"/><rect x="361" y="128" width="12" height="6" rx="1" class="s-port"/>
</svg>`;

const desktopArt = `<div class="fake-pc"><div class="fp-screen"><div class="fp-icons"><span>🗑️<i>휴지통</i></span><span>📁<i>내 폴더</i></span><span>🌐<i>인터넷</i></span></div></div><div class="fp-bar"><span class="fp-start"><b></b><b></b><b></b><b></b></span><span class="fp-time">9:00</span></div></div>`;

const mouseArt = (mode) => `<svg viewBox="0 0 320 360" class="mouse-art ${mode}">
  <path d="M62 156 L258 156 L258 250 C258 312 214 342 160 342 C106 342 62 312 62 250 Z" class="m-part m-body" ${mode === "parts" ? 'data-need="body"' : ""}/>
  <path d="M157 22 C100 24 62 66 62 152 L157 152 Z" class="m-part m-left" ${mode === "parts" ? 'data-need="left"' : ""}/>
  <path d="M163 22 C220 24 258 66 258 152 L163 152 Z" class="m-part m-right" ${mode === "parts" ? 'data-need="right"' : ""}/>
  <rect x="147" y="58" width="26" height="54" rx="13" class="m-part m-wheel" ${mode === "parts" ? 'data-need="wheel"' : ""}/>
  ${mode === "parts" ? `
  <text x="104" y="104" class="m-lbl" data-l="left">왼쪽</text><text x="216" y="104" class="m-lbl" data-l="right">오른쪽</text>
  <text x="160" y="140" class="m-lbl" data-l="wheel">휠</text><text x="160" y="260" class="m-lbl" data-l="body">몸통</text>` : ""}
  ${mode === "hand" ? `
  <circle cx="160" cy="268" r="62" class="f f-palm"/>
  <circle cx="108" cy="92" r="20" class="f f1"/><text x="108" y="98" class="f-t">2</text>
  <circle cx="212" cy="92" r="20" class="f f2"/><text x="212" y="98" class="f-t">3</text>
  <circle cx="54" cy="222" r="18" class="f f3"/><text x="54" y="228" class="f-t">1</text>
  <circle cx="266" cy="200" r="16" class="f f4"/><text x="266" y="206" class="f-t">4</text>
  <circle cx="262" cy="252" r="14" class="f f5"/><text x="262" y="258" class="f-t">5</text>` : ""}
</svg>`;

/* ---------------- 활동 목록 ---------------- */
const ACTS = {};

ACTS["parts-tour"] = {
  name: "컴퓨터 기기 탐험", icon: "🖥️", type: "guide", mins: 10,
  desc: "그림 속 기기를 하나씩 눌러 이름과 하는 일을 알아봐요.",
  run(ctx) {
    let i = 0;
    const box = el("div", "parts");
    box.innerHTML = `<div class="parts-art">${setupSVG()}</div><div class="parts-card"></div>`;
    ctx.arena.append(box);
    const svg = box.querySelector("svg"), card = box.querySelector(".parts-card");
    const seen = new Set();
    function show(id) {
      const fresh = !seen.has(id);
      seen.add(id);
      svg.classList.add("focus");
      svg.querySelectorAll(".pt").forEach(g => g.classList.toggle("on", g.dataset.part === id));
      card.innerHTML = partCard(id, `<div class="pc-nav"><span class="pc-step">${i + 1} / ${TOUR.length}</span>
        <button type="button" class="ghost" data-a="prev" ${i === 0 ? "disabled" : ""}>◀ 이전</button>
        <button type="button" class="primary" data-a="next">${i === TOUR.length - 1 ? "다 봤어요" : "다음 기기 ▶"}</button></div>
        <p class="pc-tip">그림에서 다른 기기를 직접 눌러 봐도 돼요.</p>`);
      card.querySelector('[data-a="prev"]').onclick = () => { i--; show(TOUR[i]); };
      const nb = card.querySelector('[data-a="next"]');
      if (fresh) {
        const lab = nb.textContent; let left = 4; nb.disabled = true; nb.textContent = `읽는 중… ${left}`;
        const tick = () => { if (!nb.isConnected) return; left--; if (left <= 0) { nb.disabled = false; nb.textContent = lab; } else { nb.textContent = `읽는 중… ${left}`; ctx.after(tick, 1000); } };
        ctx.after(tick, 1000);
      }
      nb.onclick = () => {
        if (i < TOUR.length - 1) { i++; show(TOUR[i]); } else ctx.done(3, `기기 ${seen.size}개를 모두 살펴봤어요!`);
      };
      ctx.hud(`살펴본 기기 <b>${seen.size}</b> / ${TOUR.length}`);
    }
    svg.querySelectorAll(".pt").forEach(g => g.addEventListener("click", () => { i = TOUR.indexOf(g.dataset.part); show(g.dataset.part); }));
    card.innerHTML = `<div class="pc-kind">시작</div><h3 class="pc-name">컴퓨터 책상에 무엇이 있을까요?</h3><p class="pc-desc">그림 속에 기기가 9개 숨어 있어요. [첫 번째 기기 보기]를 누르거나, 궁금한 기기를 직접 눌러 보세요.</p><div class="pc-nav"><button type="button" class="primary" data-a="go">첫 번째 기기 보기 ▶</button></div>`;
    card.querySelector('[data-a="go"]').onclick = () => show(TOUR[0]);
    ctx.hud(`살펴본 기기 <b>0</b> / ${TOUR.length}`);
  }
};

ACTS["parts-quiz"] = {
  name: "기기 이름 퀴즈", icon: "❓", type: "guide", pass: 2, mins: 7,
  desc: "문제를 읽고 그림에서 알맞은 기기를 클릭해요.",
  run(ctx) {
    const qs = shuffle(QUIZ);
    let i = 0, first = 0, tried = false;
    const box = el("div", "parts");
    box.innerHTML = `<div class="parts-art">${setupSVG()}</div><div class="parts-card"></div>`;
    ctx.arena.append(box);
    const svg = box.querySelector("svg"), card = box.querySelector(".parts-card");
    function ask() {
      tried = false;
      svg.classList.remove("focus");
      svg.querySelectorAll(".pt").forEach(g => g.classList.remove("on", "no"));
      card.innerHTML = `<div class="pc-kind">문제 ${i + 1} / ${qs.length}</div><p class="quiz-q">${qs[i].q}</p><p class="quiz-fb"></p>`;
      ctx.hud(`맞힌 문제 <b>${first}</b> · 남은 문제 ${qs.length - i}`);
    }
    svg.querySelectorAll(".pt").forEach(g => g.addEventListener("click", () => {
      const id = g.dataset.part, fb = card.querySelector(".quiz-fb");
      if (!fb) return;
      if (id === qs[i].a) {
        if (!tried) first++;
        svg.classList.add("focus");
        g.classList.add("on");
        card.innerHTML = `<div class="pc-kind ok">정답!</div>${partCard(id).replace(/^<div class="pc-kind">.*?<\/div>/, "")}<div class="pc-nav"><button type="button" class="primary" data-a="n">${i === qs.length - 1 ? "결과 보기" : "다음 문제 ▶"}</button></div>`;
        card.querySelector('[data-a="n"]').onclick = () => {
          i++;
          if (i < qs.length) ask();
          else ctx.done(first >= 9 ? 3 : first >= 6 ? 2 : 1, `${qs.length}문제 중 ${first}문제를 한 번에 맞혔어요!`);
        };
        ctx.hud(`맞힌 문제 <b>${first}</b> · 남은 문제 ${qs.length - i - 1}`);
      } else {
        tried = true;
        g.classList.add("no");
        setTimeout(() => g.classList.remove("no"), 500);
        fb.innerHTML = `그건 <b>${PARTS[id].name}</b>이에요. 다시 찾아보세요!`;
      }
    }));
    ask();
  }
};

ACTS["power-on"] = {
  name: "컴퓨터 켜기", icon: "⏻", type: "guide", mins: 4,
  desc: "모니터와 본체 전원을 순서대로 켜 봐요.",
  run(ctx) {
    slides(ctx, [
      { title: "컴퓨터 전원은 두 군데예요", text: "<p><b>모니터</b>와 <b>본체</b>에 따로 전원 버튼이 있어요. 둘 다 켜야 컴퓨터를 쓸 수 있어요.</p>", art: pcArt("") },
      { title: "① 모니터 전원 버튼", text: "<p>모니터 <b>오른쪽 아래</b>의 작은 버튼을 눌러요. 불이 들어오면 켜진 거예요.</p>", art: pcArt(""), need: ["mbtn"], needText: "모니터의 작은 버튼", onNeed: a => a.querySelector("svg").classList.add("m-on") },
      { title: "② 본체 전원 버튼 (⏻)", text: "<p>본체의 <b>⏻ 단추</b>를 <b>한 번 톡</b> 눌러요.</p><p class='warn'>길게 꾹 누르면 컴퓨터가 갑자기 꺼져요. 한 번만 짧게!</p>", art: pcArt("m-on"), need: ["pbtn"], needText: "본체의 ⏻ 단추", onNeed: a => a.querySelector("svg").classList.add("p-on") },
      { title: "③ 기다려요", text: "<p>화면에 동그라미가 빙글빙글 돌면 <b>준비하는 중</b>이에요. 다른 버튼을 누르지 말고 기다려요.</p>", art: pcArt("m-on p-on booting"), wait: 3500 },
      { title: "④ 바탕화면이 나왔어요!", text: "<p>아이콘과 아래쪽 줄(작업 표시줄)이 보이면 다 켜진 거예요.</p><p>비밀번호 화면이 나오면 선생님이 알려 준 비밀번호를 넣어요.</p>", art: desktopArt }
    ], "컴퓨터를 켜는 순서를 알았어요!");
  }
};

ACTS["grip"] = {
  name: "마우스 잡는 법", icon: "🖱️", type: "guide", mins: 5,
  desc: "마우스의 이름과 손가락 자리, 바른 자세를 익혀요.",
  run(ctx) {
    slides(ctx, [
      { title: "마우스의 네 부분", text: "<p>그림의 <b>네 부분을 하나씩</b> 눌러 이름을 알아봐요.</p><ul><li><b>왼쪽 버튼</b>: 제일 많이 써요. 고르기, 열기</li><li><b>오른쪽 버튼</b>: 메뉴 열기</li><li><b>휠</b>: 굴려서 화면 올리고 내리기</li><li><b>몸통</b>: 손바닥을 올려놓는 곳</li></ul>", art: mouseArt("parts"), need: ["left", "right", "wheel", "body"], needText: "마우스의 네 부분", onNeed: (a, id) => a.querySelector(`[data-l="${id}"]`).classList.add("show") },
      { title: "손가락 자리", text: "<ol class='fingers'><li><i class='d d3'></i><b>엄지</b>: 마우스 왼쪽 옆을 살짝 잡아요</li><li><i class='d d1'></i><b>검지</b>: 왼쪽 버튼 위에</li><li><i class='d d2'></i><b>중지</b>: 오른쪽 버튼 위에</li><li><i class='d d4'></i><b>약지</b>, <i class='d d5'></i><b>새끼</b>: 오른쪽 옆에</li><li><i class='d dp'></i><b>손바닥</b>: 몸통 위에 편하게</li></ol>", art: mouseArt("hand") },
      { title: "바른 자세", text: "<ul><li><b>손목</b>은 책상에 살짝 닿게 해요.</li><li>마우스를 <b>꽉 쥐지 말고</b> 힘을 빼요.</li><li>마우스는 <b>들지 말고</b> 책상 위에서 밀어요.</li><li>책상 끝에 닿으면 마우스를 살짝 들어 <b>가운데로 옮겨요</b>.</li><li>화면은 <b>똑바로</b> 앉아서 봐요.</li></ul>", art: mouseArt("hand") },
      { title: "클릭은 '톡'", text: "<p>검지로 왼쪽 버튼을 <b>톡</b> 눌렀다 떼요. 이게 <b>클릭</b>이에요.</p><p>옆 그림의 노란 단추를 마우스 <b>왼쪽 버튼</b>으로 <b>3번</b> 클릭해 보세요.</p>",
        art: `<div class="tok"><button type="button" class="tok-btn" id="tokBtn">톡!</button><div class="tok-n" id="tokN">0 / 3</div></div>`,
        need: ["tok"], needText: "노란 단추",
        init(a, c, release) { let n = 0; const b = a.querySelector("#tokBtn"); b.addEventListener("click", () => { n++; a.querySelector("#tokN").textContent = Math.min(n, 3) + " / 3"; b.classList.remove("hit"); void b.offsetWidth; b.classList.add("hit"); if (n === 3) release("tok"); }); } }
    ], "마우스 잡는 법을 익혔어요!");
  }
};

ACTS["power-off"] = {
  name: "컴퓨터 끄기", icon: "🌙", type: "guide", mins: 3,
  desc: "시작 → 전원 → 시스템 종료 순서로 컴퓨터를 꺼요.",
  run(ctx) {
    const box = el("div", "off");
    box.innerHTML = `<div class="off-say" id="offSay">① 화면 왼쪽 아래(또는 가운데)의 <b>시작</b> 단추를 눌러요.</div>
      <div class="fake-pc big"><div class="fp-screen"><div class="fp-icons"><span>🗑️<i>휴지통</i></span><span>📁<i>내 폴더</i></span></div>
      <div class="fp-menu" hidden><div class="fp-menu-h">시작</div><div class="fp-apps"><span>📝</span><span>📊</span><span>🎨</span><span>🌐</span></div>
      <button type="button" class="fp-pow" aria-label="전원">⏻</button>
      <div class="fp-pow-menu" hidden><button type="button" data-o="sleep">절전</button><button type="button" data-o="off">시스템 종료</button><button type="button" data-o="re">다시 시작</button></div></div>
      <div class="fp-black" hidden><p>컴퓨터가 꺼지는 중…</p></div></div>
      <div class="fp-bar"><button type="button" class="fp-start" aria-label="시작"><b></b><b></b><b></b><b></b></button><span class="fp-time">3:40</span></div></div>`;
    ctx.arena.append(box);
    const say = box.querySelector("#offSay"), menu = box.querySelector(".fp-menu"), pm = box.querySelector(".fp-pow-menu");
    let stage = 0;
    ctx.hud("단계 <b>1</b> / 3");
    box.querySelector(".fp-start").onclick = () => { menu.hidden = false; stage = 1; say.innerHTML = "② 메뉴 아래쪽의 <b>⏻ 전원</b> 단추를 눌러요."; ctx.hud("단계 <b>2</b> / 3"); };
    box.querySelector(".fp-pow").onclick = () => { pm.hidden = false; stage = 2; say.innerHTML = "③ <b>시스템 종료</b>를 눌러요."; ctx.hud("단계 <b>3</b> / 3"); };
    pm.querySelectorAll("button").forEach(b => b.onclick = () => {
      if (b.dataset.o !== "off") { say.innerHTML = `'${b.textContent}'은 끄는 게 아니에요. <b>시스템 종료</b>를 찾아보세요.`; return; }
      box.querySelector(".fp-black").hidden = false;
      say.innerHTML = "화면이 까맣게 될 때까지 기다려요. 본체 버튼을 꾹 누르지 않아요!";
      ctx.after(() => ctx.done(3, "컴퓨터를 바르게 껐어요! 모니터 전원은 선생님 말씀에 따라요."), 2200);
    });
  }
};

/* ---------------- 게임 ---------------- */
ACTS["follow"] = {
  name: "별 따라가기", icon: "⭐", type: "game", mins: 4,
  desc: "마우스를 움직여 화살표를 별 위에 올려 두세요. 누르지 않아도 돼요!",
  run(ctx) {
    const L = ctx.level, speed = [55, 95, 145][L - 1], R = [72, 56, 42][L - 1], need = [10, 13, 16][L - 1];
    const a = ctx.arena, star = el("div", "g-star", "⭐");
    star.style.width = star.style.height = R * 2 + "px";
    star.style.fontSize = R * 0.9 + "px";
    a.append(star);
    let W = a.clientWidth, H = a.clientHeight, x = W / 2, y = H / 2, tx = x, ty = y, px = -999, py = -999, got = 0, last = performance.now(), t0 = last;
    ctx.on(a, "pointermove", e => { const r = a.getBoundingClientRect(); px = e.clientX - r.left; py = e.clientY - r.top; });
    ctx.on(a, "pointerleave", () => { px = py = -999; });
    function newTarget() { tx = rand(R, W - R); ty = rand(R, H - R); }
    newTarget();
    ctx.raf(function step(now) {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      W = a.clientWidth; H = a.clientHeight;
      const dx = tx - x, dy = ty - y, d = Math.hypot(dx, dy);
      if (d < 4) newTarget(); else { x += dx / d * speed * dt; y += dy / d * speed * dt; }
      star.style.transform = `translate(${x - R}px, ${y - R}px)`;
      const over = Math.hypot(px - x, py - y) < R;
      star.classList.toggle("on", over);
      if (over) got += dt;
      const pct = Math.min(100, Math.round(got / need * 100));
      ctx.hud(`별 위에 있기 <span class="bar"><i style="width:${pct}%"></i></span> <b>${pct}%</b>`);
      if (got >= need) { const t = (now - t0) / 1000; ctx.done(t <= need * 1.3 ? 3 : t <= need * 2 ? 2 : 1, `${Math.round(t)}초 만에 별을 끝까지 따라갔어요!`); return false; }
      return true;
    });
  }
};

ACTS["balloon"] = {
  name: "풍선 터뜨리기", icon: "🎈", type: "game", mins: 4,
  desc: "올라가는 풍선을 클릭해서 터뜨려요.",
  run(ctx) {
    const L = ctx.level, goal = [15, 20, 25][L - 1], size = [96, 74, 54][L - 1], dur = [7.5, 5.5, 4.2][L - 1], gap = [1150, 850, 640][L - 1];
    const colors = ["#e85d5d", "#f0a531", "#4b9fe0", "#4fbf86", "#a77ae0", "#ee74b0"];
    let pop = 0, miss = 0, ended = false;
    const upd = () => ctx.hud(`터뜨린 풍선 <b>${pop}</b> / ${goal} · 놓친 풍선 ${miss}`);
    function spawn() {
      if (ended) return;
      const a = ctx.arena, W = a.clientWidth, H = a.clientHeight;
      const b = el("button", "g-balloon");
      b.type = "button"; b.setAttribute("aria-label", "풍선");
      b.style.width = size + "px"; b.style.height = size * 1.2 + "px";
      b.style.left = rand(8, Math.max(9, W - size - 8)) + "px"; b.style.top = H + "px";
      b.style.setProperty("--c", pick(colors));
      a.append(b);
      const an = b.animate([{ transform: "translateY(0)" }, { transform: `translateY(${-(H + size * 1.8)}px)` }], { duration: dur * 1000, easing: "linear" });
      an.onfinish = () => { if (b.isConnected && !b.dataset.p) { b.remove(); if (!ended) { miss++; upd(); } } };
      b.addEventListener("pointerdown", e => {
        if (e.button !== 0 || b.dataset.p || ended) return;
        b.dataset.p = 1; an.pause(); b.classList.add("pop"); pop++; upd();
        setTimeout(() => b.remove(), 220);
        if (pop >= goal) { ended = true; ctx.done(miss <= 2 ? 3 : miss <= 6 ? 2 : 1, `풍선 ${goal}개를 터뜨렸어요! 놓친 풍선은 ${miss}개예요.`); }
      });
    }
    upd(); spawn(); ctx.every(spawn, gap);
  }
};

ACTS["hamster"] = {
  name: "햄스터 잡기", icon: "🐹", type: "game", mins: 4,
  desc: "구멍에서 고개를 내민 햄스터를 클릭해요. 30초 동안!",
  run(ctx) {
    const L = ctx.level, cols = L === 3 ? 4 : 3, n = cols * 3, show = [1500, 1050, 760][L - 1], T = 30;
    let hit = 0, wrong = 0, left = T, cur = -1, pops = 0;
    const grid = el("div", "g-holes");
    grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    const holes = [];
    for (let i = 0; i < n; i++) {
      const h = el("button", "g-hole", `<span class="g-ham">🐹</span>`);
      h.type = "button"; h.setAttribute("aria-label", "구멍 " + (i + 1));
      h.addEventListener("click", () => {
        if (h.classList.contains("up")) { hit++; h.classList.remove("up"); h.classList.add("bonk"); setTimeout(() => h.classList.remove("bonk"), 300); }
        else { wrong++; if (wrong >= 15) ctx.fail("막 누르면 안 돼요! 잘 보고 천천히, 정확하게 다시 해 봐요."); }
        upd();
      });
      holes.push(h); grid.append(h);
    }
    ctx.arena.append(grid);
    const upd = () => ctx.hud(`잡은 햄스터 <b>${hit}</b> · 남은 시간 <b>${left}</b>초`);
    function popUp() {
      holes.forEach(h => h.classList.remove("up"));
      let k; do { k = Math.floor(Math.random() * n); } while (k === cur);
      cur = k; holes[k].classList.add("up"); pops++;
    }
    upd(); popUp();
    ctx.every(popUp, show);
    ctx.every(() => {
      left--; upd();
      if (left <= 0) { const r = hit / Math.max(1, pops); ctx.done(r >= 0.75 ? 3 : r >= 0.5 ? 2 : 1, `햄스터 ${pops}마리 중 ${hit}마리를 잡았어요!`); }
    }, 1000);
  }
};

ACTS["target"] = {
  name: "과녁 맞히기", icon: "🎯", type: "game", mins: 4,
  desc: "점점 작아지는 과녁을 정확하게 클릭해요. 빈 곳을 누르면 실수!",
  run(ctx) {
    const L = ctx.level, N = 15, s0 = [120, 96, 76][L - 1], s1 = [62, 40, 24][L - 1];
    let i = 0, miss = 0;
    const t0 = performance.now(), a = ctx.arena;
    const upd = () => ctx.hud(`맞힌 과녁 <b>${i}</b> / ${N} · 실수 ${miss}`);
    ctx.on(a, "click", e => {
      if (e.target !== a) return;
      miss++; upd();
      if (miss >= 8) { ctx.fail("막 누르면 안 돼요! 잘 보고 천천히, 정확하게 다시 해 봐요."); return; }
      const r = a.getBoundingClientRect(), m = el("div", "g-missmark", "✕");
      m.style.left = e.clientX - r.left + "px"; m.style.top = e.clientY - r.top + "px";
      a.append(m); setTimeout(() => m.remove(), 600);
    });
    function next() {
      if (i >= N) { const t = Math.round((performance.now() - t0) / 1000); ctx.done(miss <= 1 ? 3 : miss <= 4 ? 2 : 1, `과녁 ${N}개를 ${t}초 만에 맞혔어요! 실수 ${miss}번`); return; }
      const size = s0 + (s1 - s0) * i / (N - 1), W = a.clientWidth, H = a.clientHeight;
      const b = el("button", "g-target");
      b.type = "button"; b.setAttribute("aria-label", "과녁");
      b.style.width = b.style.height = size + "px";
      b.style.left = rand(8, W - size - 8) + "px"; b.style.top = rand(8, H - size - 8) + "px";
      b.addEventListener("click", ev => { ev.stopPropagation(); i++; upd(); b.remove(); next(); });
      a.append(b);
    }
    upd(); next();
  }
};

ACTS["gift"] = {
  name: "선물 상자 열기", icon: "🎁", type: "game", mins: 4,
  desc: "상자를 '딸깍딸깍' 더블클릭하면 선물이 나와요.",
  run(ctx) {
    const L = ctx.level, N = [8, 10, 12][L - 1];
    const prizes = shuffle(["🧸", "⚽", "🍩", "🎨", "🚀", "🌈", "🍓", "🦄", "🎵", "🐶", "🌟", "🍦", "🦖", "🍪"]);
    let opened = 0;
    const t0 = performance.now();
    const grid = el("div", "g-gifts" + (L === 3 ? " small" : ""));
    for (let i = 0; i < N; i++) {
      const g = el("button", "g-gift", "🎁");
      g.type = "button"; g.setAttribute("aria-label", "선물 상자");
      g.addEventListener("click", e => { if (g.dataset.o || e.detail > 1) return; g.classList.remove("shake"); void g.offsetWidth; g.classList.add("shake"); });
      g.addEventListener("dblclick", () => {
        if (g.dataset.o) return;
        g.dataset.o = 1; g.classList.add("open"); g.textContent = prizes[i % prizes.length]; opened++; upd();
        if (opened >= N) { const per = (performance.now() - t0) / 1000 / N; ctx.done(per <= 3 ? 3 : per <= 6 ? 2 : 1, `상자 ${N}개를 모두 열었어요! (${Math.round(per * N)}초)`); }
      });
      grid.append(g);
    }
    ctx.arena.append(grid);
    const upd = () => ctx.hud(`연 상자 <b>${opened}</b> / ${N} · 한 번만 누르면 흔들리기만 해요`);
    upd();
  }
};

ACTS["lr"] = {
  name: "왼쪽? 오른쪽?", icon: "🔀", type: "game", mins: 4,
  desc: "카드에 적힌 대로 왼쪽 버튼 또는 오른쪽 버튼을 클릭해요.",
  run(ctx) {
    const L = ctx.level, N = 15, limit = [0, 0, 2600][L - 1];
    const seq = shuffle(Array.from({ length: N }, (_, i) => i % 2 ? "R" : "L"));
    let i = 0, mis = 0, timer = null;
    const a = ctx.arena, card = el("div", "g-lr");
    a.append(card);
    const upd = () => ctx.hud(`<b>${i}</b> / ${N} · 실수 ${mis}${limit ? " · 빨리 눌러요!" : ""}`);
    function show() {
      if (i >= N) { ctx.done(mis <= 1 ? 3 : mis <= 4 ? 2 : 1, `${N}장을 모두 해냈어요! 실수 ${mis}번`); return; }
      const s = seq[i];
      card.className = "g-lr " + (s === "L" ? "is-l" : "is-r");
      card.innerHTML = `<svg viewBox="0 0 120 160" class="lr-m"><path d="M58 8 C30 9 12 30 12 70 L58 70 Z" class="lr-b ${s === "L" ? "hot" : ""}"/><path d="M62 8 C90 9 108 30 108 70 L62 70 Z" class="lr-b ${s === "R" ? "hot" : ""}"/><path d="M12 74 L108 74 L108 112 C108 140 88 154 60 154 C32 154 12 140 12 112 Z" class="lr-body"/></svg><div class="lr-t">${s === "L" ? "왼쪽 클릭!" : "오른쪽 클릭!"}</div>${limit ? '<div class="lr-time"><i></i></div>' : ""}`;
      if (limit) {
        const bar = card.querySelector(".lr-time i");
        bar.animate([{ width: "100%" }, { width: "0%" }], { duration: limit, fill: "forwards" });
        clearTimeout(timer); timer = setTimeout(() => { mis++; i++; upd(); show(); }, limit);
      }
      upd();
    }
    function answer(btn, e) {
      e.preventDefault();
      if (i >= N) return;
      if (btn === seq[i]) { clearTimeout(timer); i++; card.classList.add("ok"); setTimeout(show, 180); }
      else { mis++; card.classList.remove("no"); void card.offsetWidth; card.classList.add("no"); upd(); if (mis >= 7) ctx.fail("막 누르면 안 돼요! 잘 보고 천천히, 정확하게 다시 해 봐요."); }
    }
    ctx.on(a, "click", e => { if (e.button === 0) answer("L", e); });
    ctx.on(a, "contextmenu", e => answer("R", e));
    ctx.cleanup(() => clearTimeout(timer));
    show();
  }
};

ACTS["drag"] = {
  name: "바구니에 담기", icon: "🧺", type: "game", mins: 5,
  desc: "누른 채로 끌어서 바구니에 놓아요. 놓을 때 손을 떼요!",
  run(ctx) {
    const L = ctx.level;
    const cats = {
      fruit: { name: "과일", items: ["🍎", "🍌", "🍇", "🍓", "🍊", "🍉", "🍑", "🍍"] },
      veg: { name: "채소", items: ["🥕", "🥦", "🌽", "🥒", "🍆", "🥔", "🧅", "🫑"] },
      animal: { name: "동물", items: ["🐶", "🐱", "🐰", "🐻", "🐸", "🐼", "🐷", "🐵"] }
    };
    const use = L === 1 ? ["all"] : L === 2 ? ["fruit", "veg"] : ["fruit", "veg", "animal"];
    const N = [8, 10, 12][L - 1], size = [72, 62, 50][L - 1];
    const pool = [];
    const real = L === 1 ? ["fruit", "veg"] : use;
    for (let k = 0; k < N; k++) { const c = real[k % real.length]; pool.push({ c, e: cats[c].items[Math.floor(k / real.length) % 8] }); }
    const a = ctx.arena;
    const row = el("div", "g-baskets");
    const baskets = use.map(c => { const b = el("div", "g-basket", `<span class="bk-n">0</span><span class="bk-t">${c === "all" ? "바구니" : cats[c].name}</span>`); b.dataset.c = c; row.append(b); return b; });
    a.append(row);
    let placed = 0, mis = 0;
    const upd = () => ctx.hud(`담은 것 <b>${placed}</b> / ${N} · 잘못 담기 ${mis}`);
    const t0 = performance.now();
    requestAnimationFrame(() => {
      const W = a.clientWidth, top = 12, bottom = row.offsetTop - size - 12;
      shuffle(pool).forEach(p => {
        const it = el("div", "g-item", p.e);
        it.style.width = it.style.height = size + "px"; it.style.fontSize = size * 0.72 + "px";
        const ox = rand(10, W - size - 10), oy = rand(top, Math.max(top + 1, bottom));
        it.style.left = ox + "px"; it.style.top = oy + "px";
        a.append(it);
        let dx = 0, dy = 0, drag = false;
        it.addEventListener("pointerdown", e => {
          if (e.button !== 0) return;
          drag = true; it.setPointerCapture(e.pointerId); it.classList.add("hold");
          const r = it.getBoundingClientRect(); dx = e.clientX - r.left; dy = e.clientY - r.top;
        });
        it.addEventListener("pointermove", e => {
          if (!drag) return;
          const r = a.getBoundingClientRect();
          it.style.left = e.clientX - r.left - dx + "px"; it.style.top = e.clientY - r.top - dy + "px";
          baskets.forEach(b => { const br = b.getBoundingClientRect(); b.classList.toggle("over", e.clientX > br.left && e.clientX < br.right && e.clientY > br.top && e.clientY < br.bottom); });
        });
        const drop = e => {
          if (!drag) return;
          drag = false; it.classList.remove("hold");
          const hitB = baskets.find(b => { const br = b.getBoundingClientRect(); return e.clientX > br.left && e.clientX < br.right && e.clientY > br.top && e.clientY < br.bottom; });
          baskets.forEach(b => b.classList.remove("over"));
          if (hitB && (hitB.dataset.c === "all" || hitB.dataset.c === p.c)) {
            placed++; it.remove();
            const n = hitB.querySelector(".bk-n"); n.textContent = +n.textContent + 1;
            hitB.classList.remove("yum"); void hitB.offsetWidth; hitB.classList.add("yum");
            upd();
            if (placed >= N) { const t = Math.round((performance.now() - t0) / 1000); ctx.done(mis === 0 ? 3 : mis <= 3 ? 2 : 1, `${N}개를 모두 담았어요! (${t}초, 잘못 담기 ${mis}번)`); }
          } else {
            if (hitB) { mis++; upd(); if (mis >= 6) ctx.fail("막 누르면 안 돼요! 잘 보고 천천히, 정확하게 다시 해 봐요."); }
            it.style.left = ox + "px"; it.style.top = oy + "px";
            it.classList.remove("shake"); void it.offsetWidth; it.classList.add("shake");
          }
        };
        it.addEventListener("pointerup", drop);
        it.addEventListener("pointercancel", drop);
      });
    });
    upd();
  }
};

ACTS["wheel"] = {
  name: "바닷속 보물찾기", icon: "💎", type: "game", mins: 5,
  desc: "마우스 휠을 굴려 바닷속으로 내려가 숨은 보석을 찾아 클릭해요.",
  run(ctx) {
    const L = ctx.level, len = [2400, 4200, 6500][L - 1], rounds = 3;
    let r = 0;
    const t0 = performance.now();
    const sc = el("div", "g-sea");
    const inner = el("div", "g-sea-in");
    inner.style.height = len + "px";
    const deco = ["🐟", "🐠", "🐡", "🦀", "🐙", "🪼", "🐚", "🦑", "🐢", "🐳"];
    for (let y = 300; y < len - 100; y += 260) {
      const d = el("span", "sea-deco", pick(deco));
      d.style.top = y + "px"; d.style.left = rand(5, 85) + "%";
      inner.append(d);
      const m = el("span", "sea-depth", Math.round(y / 30) + "m");
      m.style.top = y + "px"; inner.append(m);
    }
    const hint = el("div", "sea-hint", "마우스 휠을 <b>아래로</b> 굴려요 ⬇");
    inner.append(hint);
    const gem = el("button", "sea-gem", "💎");
    gem.type = "button"; gem.setAttribute("aria-label", "보석");
    inner.append(gem);
    sc.append(inner);
    ctx.arena.append(sc);
    function place() {
      gem.style.top = rand(len * 0.45, len - 120) + "px";
      gem.style.left = rand(10, 80) + "%";
      sc.scrollTop = 0;
      ctx.hud(`찾은 보석 <b>${r}</b> / ${rounds}`);
    }
    gem.addEventListener("click", () => {
      r++;
      if (r >= rounds) { const t = Math.round((performance.now() - t0) / 1000); ctx.done(t <= rounds * 15 ? 3 : t <= rounds * 30 ? 2 : 1, `보석 ${rounds}개를 ${t}초 만에 찾았어요!`); return; }
      gem.classList.add("found");
      setTimeout(() => { gem.classList.remove("found"); place(); }, 600);
    });
    place();
  }
};

window.ACTS = ACTS;
window.UI = { slides, el, shuffle, rand, pick };
})();
