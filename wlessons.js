// 1단계 윈도우 기초: 살펴보기 · 알아보기 · 따라 하기 · 혼자 해보기
(function () {
const { slides, el, shuffle } = window.UI;
const ACTS = window.ACTS, WinSim = window.WinSim;

/* ================= 공통 실행기 ================= */
function runTour(ctx, spec) {
  const wrap = el("div", "tour");
  wrap.innerHTML = `<div class="tour-sim"></div><aside class="tour-card"></aside>`;
  ctx.arena.append(wrap);
  const host = wrap.querySelector(".tour-sim"), card = wrap.querySelector(".tour-card");
  const sim = new WinSim(host, { setup: spec.setup });
  ctx.cleanup(() => sim.destroy());
  sim.root.classList.add("frozen");
  if (spec.prep) spec.prep(sim);
  const layer = el("div", "tour-layer"); host.append(layer);
  const seen = new Set(); let cur = -1;
  function layout() {
    const H = host.getBoundingClientRect();
    layer.innerHTML = "";
    spec.spots.forEach((sp, i) => {
      const t = sim.root.querySelector(sp.sel); if (!t) return;
      const r = t.getBoundingClientRect();
      const b = el("button", "spot" + (i === cur ? " on" : "") + (seen.has(i) ? " seen" : ""), `<span>${i + 1}</span>`);
      b.type = "button"; b.title = sp.name;
      Object.assign(b.style, { left: r.left - H.left - 3 + "px", top: r.top - H.top - 3 + "px", width: r.width + 6 + "px", height: r.height + 6 + "px" });
      b.onclick = () => show(i);
      layer.append(b);
    });
  }
  function show(i) {
    const fresh = !seen.has(i);
    cur = i; seen.add(i);
    if (spec.voice && window.SAY) window.SAY(spec.spots[i].say || (spec.spots[i].name + ". " + spec.spots[i].desc));
    const sp = spec.spots[i], last = seen.size === spec.spots.length;
    card.innerHTML = `<div class="tc-n">${i + 1} / ${spec.spots.length}</div><h3 class="tc-t">${sp.name}</h3><p class="tc-d">${sp.desc}</p>${sp.more ? `<p class="tc-m">${sp.more}</p>` : ""}
      <div class="tc-btns"><button type="button" class="ghost" data-a="p" ${i === 0 ? "disabled" : ""}>◀ 이전</button><button type="button" class="primary" data-a="n">${i < spec.spots.length - 1 ? "다음 ▶" : last ? "다 봤어요" : "안 본 곳 보기"}</button></div>
      <p class="tc-tip">그림의 번호 테두리를 직접 눌러도 돼요. 본 곳 ${seen.size} / ${spec.spots.length}</p>`;
    card.querySelector('[data-a="p"]').onclick = () => show(i - 1);
    const nb = card.querySelector('[data-a="n"]');
    if (fresh) {
      const lab = nb.textContent; let left = 4; nb.disabled = true; nb.textContent = `읽는 중… ${left}`;
      const tick = () => { if (!nb.isConnected || cur !== i) return; left--; if (left <= 0) { nb.disabled = false; nb.textContent = lab; } else { nb.textContent = `읽는 중… ${left}`; ctx.after(tick, 1000); } };
      ctx.after(tick, 1000);
    }
    nb.onclick = () => {
      if (i < spec.spots.length - 1) show(i + 1);
      else if (last) ctx.done(3, spec.finish || "화면의 이름을 모두 알아봤어요!");
      else show(spec.spots.findIndex((_, k) => !seen.has(k)));
    };
    layout();
    ctx.hud(`<b>${seen.size}</b> / ${spec.spots.length} 곳을 살펴봤어요`);
  }
  card.innerHTML = `<div class="tc-n">살펴보기</div><h3 class="tc-t">${spec.title}</h3><p class="tc-d">${spec.intro}</p><div class="tc-btns"><button type="button" class="primary" data-a="go">1번부터 보기 ▶</button></div>`;
  card.querySelector('[data-a="go"]').onclick = () => show(0);
  requestAnimationFrame(() => requestAnimationFrame(layout));
  ctx.on(window, "resize", layout);
  ctx.hud(`번호가 붙은 곳을 하나씩 눌러 이름을 알아봐요`);
}

function runSim(ctx, spec) {
  const challenge = !!spec.goals;
  const wrap = el("div", "simwrap");
  wrap.innerHTML = `<aside class="task"></aside><div class="simhost"></div>`;
  ctx.arena.append(wrap);
  const task = wrap.querySelector(".task");
  let ready = false, idx = 0, busy = false, hints = 0, finished = false;
  const latched = new Set();
  const sim = new WinSim(wrap.querySelector(".simhost"), { setup: spec.setup, onEvent: (ev, s) => { if (ready) check(ev, s); } });
  ctx.cleanup(() => sim.destroy());
  ready = true;

  function guided() {
    const T = spec.tasks[idx], n = spec.tasks.length;
    if (T.pre) T.pre(sim);
    task.innerHTML = `<div class="tk-h"><span>따라 하기</span><b>${idx + 1} / ${n}</b></div>
      <div class="tk-dots">${spec.tasks.map((_, i) => `<span class="${i < idx ? "on" : i === idx ? "cur" : ""}"></span>`).join("")}</div>
      <p class="tk-t">${T.t}</p>
      ${T.ack ? `<button type="button" class="primary tk-ack">알겠어요 ▶</button>` : ""}
      <div class="tk-ok" hidden>✔ 잘했어요!</div>
      ${T.h ? `<button type="button" class="tk-hint">💡 어떻게 해요?</button><p class="tk-ht" hidden>${T.h}</p>` : ""}
      <div class="tk-foot"><button type="button" class="ghost" data-a="restart">↺ 처음부터 다시</button></div>`;
    const hb = task.querySelector(".tk-hint");
    if (hb) hb.onclick = () => { task.querySelector(".tk-ht").hidden = false; hb.hidden = true; };
    const ab = task.querySelector(".tk-ack");
    if (ab) ab.onclick = pass;
    task.querySelector('[data-a="restart"]').onclick = () => ctx.restart();
    ctx.hud(`${spec.title} · 왼쪽 미션을 읽고 연습 화면에서 해 보세요`);
  }
  function pass() {
    if (busy) return;
    busy = true;
    task.querySelector(".tk-ok").hidden = false;
    task.classList.add("good");
    setTimeout(() => {
      task.classList.remove("good");
      busy = false; idx++;
      if (idx >= spec.tasks.length) { finished = true; ctx.done(3, spec.finish); }
      else guided();
    }, 900);
  }
  function goalsView() {
    const st = spec.goals.map((g, i) => latched.has(i));
    task.innerHTML = `<div class="tk-h"><span>혼자 해보기</span><b>${st.filter(Boolean).length} / ${spec.goals.length}</b></div>
      <p class="tk-intro">${spec.intro}</p>
      <ul class="goals">${spec.goals.map((g, i) => `<li class="${st[i] ? "ok" : ""}"><i>${st[i] ? "✔" : ""}</i><span>${g.t}</span></li>`).join("")}</ul>
      <button type="button" class="tk-hint">💡 힌트 보기</button><p class="tk-ht" hidden></p>
      <div class="tk-foot"><button type="button" class="ghost" data-a="restart">↺ 처음부터 다시</button></div>`;
    task.querySelector(".tk-hint").onclick = () => {
      const k = spec.goals.findIndex((g, i) => !latched.has(i));
      if (k < 0) return;
      hints++;
      const p = task.querySelector(".tk-ht"); p.hidden = false; p.innerHTML = `<b>${k + 1}번</b> ${spec.goals[k].h}`;
    };
    task.querySelector('[data-a="restart"]').onclick = () => ctx.restart();
    ctx.hud(`${spec.title} · 순서는 자유! 모든 칸에 ✔가 생기면 성공`);
  }
  function check(ev, s) {
    if (finished) return;
    if (!challenge) {
      const T = spec.tasks[idx];
      if (busy || T.ack) return;
      let ok = false; try { ok = T.c(s, ev); } catch (e) { ok = false; }
      if (ok) pass();
      return;
    }
    let changed = false;
    spec.goals.forEach((g, i) => {
      let ok = false; try { ok = g.c(s, ev); } catch (e) { ok = false; }
      if (g.live) { if (ok !== latched.has(i)) { ok ? latched.add(i) : latched.delete(i); changed = true; } }
      else if (ok && !latched.has(i)) { latched.add(i); changed = true; }
    });
    if (changed) {
      const hintOpen = !task.querySelector(".tk-ht").hidden ? task.querySelector(".tk-ht").innerHTML : null;
      goalsView();
      if (hintOpen) { const p = task.querySelector(".tk-ht"); p.hidden = false; p.innerHTML = hintOpen; }
    }
    if (latched.size === spec.goals.length) {
      finished = true;
      setTimeout(() => ctx.done(hints === 0 ? 3 : hints <= 2 ? 2 : 1, spec.finish + (hints ? ` (힌트 ${hints}번)` : " 힌트 없이 해냈어요!")), 700);
    }
  }
  challenge ? goalsView() : guided();
}

/* ================= 그림 조각 ================= */
const ART = {
  keys: (combo, note) => `<div class="kb-row">${combo.map((k, i) => `${i ? '<span class="kb-plus">+</span>' : ""}<kbd class="kc ${k.length > 2 ? "wide" : ""}" data-k="${k}">${k}</kbd>`).join("")}</div>${note ? `<p class="kb-note">${note}</p>` : ""}<p class="kb-live" hidden>✔ 눌렀어요!</p>`,
  menu: (rows, hi, title) => `<div class="pic"><div class="pic-cap">${title || ""}</div><div class="pic-menu">${rows.map(r => r === "-" ? "<hr>" : `<div class="pm-row ${r[1] === hi ? "hi" : ""}"><span>${r[0]}</span><span>${r[1]}</span><span>${r[2] || ""}</span></div>`).join("")}</div></div>`,
  demo: (btns) => `<div class="demo"><div class="dm-f dm-a"><div class="dm-h">📁 사진</div><div class="dm-in"><span class="dm-it" data-it>🐶<i>강아지</i></span><span class="dm-it">🐱<i>고양이</i></span></div></div><div class="dm-clip"><span>📋</span><i>클립보드<br>(잠깐 기억하는 곳)</i></div><div class="dm-f dm-b"><div class="dm-h">📁 앨범</div><div class="dm-in"></div></div></div><div class="dm-btns">${btns.map(b => `<button type="button" class="primary" data-demo="${b}" data-need="${b}">${b === "copy" ? "⧉ 복사하면?" : "✂ 잘라내면?"}</button>`).join("")}</div><p class="dm-say"></p>`,
  boxes: `<div class="boxes"><div class="bx"><div class="bx-h">📁 사진</div><div>🐶 🐱 🌸</div></div><div class="bx"><div class="bx-h">📁 음악</div><div>🎵 🎵</div></div><div class="bx"><div class="bx-h">📁 숙제</div><div>📝 📝 📝</div></div></div><p class="bx-note">파일이 뒤죽박죽이면 찾기 어려워요. 폴더에 나눠 담으면 금방 찾아요!</p>`,
  grid: (names) => `<div class="mg">${names.map(n => `<button type="button" class="mg-it" data-n="${n[1]}"><span>${n[0]}</span><i>${n[1]}</i></button>`).join("")}</div><p class="mg-say"></p>`,
  bin: `<div class="binstory"><div class="bs-step"><span>📝</span><i>낙서</i></div><div class="bs-arrow">지우기 ➜</div><div class="bs-step"><span>🗑️</span><i>휴지통</i></div><div class="bs-fork"><div class="bs-arrow">복원 ↺ ➜ <span>📝</span> 제자리로</div><div class="bs-arrow bad">비우기 ➜ <span>💨</span> 영영 사라짐</div></div></div>`,
  practice: (text) => `<textarea class="pr-ta" spellcheck="false">${text}</textarea><p class="pr-say"></p>`,
  saveDlg: `<div class="pic"><div class="pic-cap">처음 저장할 때 나오는 창</div><div class="pic-dlg"><div class="pd-h">다른 이름으로 저장</div><div class="pd-b"><div class="pd-nav"><span class="hi">🖥️ 바탕 화면</span><span>📑 문서</span><span>🖼️ 사진</span></div><div class="pd-list">📁 숙제<br>📝 학급 규칙</div></div><div class="pd-name">파일 이름: <b>음식</b></div><div class="pd-btn">저장</div></div></div>`
};
function keyNeed(combo, id) {
  return (art, ctx, release) => {
    const want = combo.map(k => k.toLowerCase());
    ctx.on(document, "keydown", e => {
      if (!art.isConnected) return;
      const map = { ctrl: e.ctrlKey || e.metaKey, shift: e.shiftKey };
      const main = want.filter(k => !(k in map));
      const mods = want.filter(k => k in map);
      if (!mods.every(m => map[m])) return;
      const code = e.code.replace(/^Key/, "").toLowerCase();
      if (main.length && !main.includes(code) && !main.includes(e.key.toLowerCase())) return;
      if (!main.length) return;
      e.preventDefault();
      art.querySelectorAll(".kc").forEach(k => { k.classList.remove("press"); void k.offsetWidth; k.classList.add("press"); });
      const live = art.querySelector(".kb-live"); if (live) live.hidden = false;
      release(id);
    });
  };
}
function demoInit(art, ctx, release) {
  const say = art.querySelector(".dm-say");
  const run = mode => {
    const a = art.querySelector(".dm-a .dm-in"), b = art.querySelector(".dm-b .dm-in");
    b.innerHTML = "";
    let it = art.querySelector("[data-it]");
    if (!it) { it = el("span", "dm-it", "🐶<i>강아지</i>"); it.dataset.it = ""; a.prepend(it); }
    it.classList.remove("ghosted");
    art.querySelectorAll(".dm-fly").forEach(n => n.remove());
    const box = art.getBoundingClientRect(), r0 = it.getBoundingClientRect(), clip = art.querySelector(".dm-clip").getBoundingClientRect(), r2 = art.querySelector(".dm-b .dm-in").getBoundingClientRect();
    const fly = el("span", "dm-it dm-fly", "🐶<i>강아지</i>"); art.style.position = "relative"; art.append(fly);
    const p0 = [r0.left - box.left, r0.top - box.top], p1 = [clip.left - box.left + clip.width / 2 - r0.width / 2, clip.top - box.top + 4], p2 = [r2.left - box.left + 8, r2.top - box.top + 8];
    if (mode === "cut") it.classList.add("ghosted");
    say.innerHTML = mode === "copy" ? "① 복사: 강아지를 <b>클립보드</b>에 기억해요…" : "① 잘라내기: 강아지가 <b>흐려지고</b> 클립보드에 기억돼요…";
    const an = fly.animate([{ transform: `translate(${p0[0]}px,${p0[1]}px)` }, { transform: `translate(${p1[0]}px,${p1[1]}px)`, offset: .4 }, { transform: `translate(${p1[0]}px,${p1[1]}px)`, offset: .6 }, { transform: `translate(${p2[0]}px,${p2[1]}px)` }], { duration: 2200, easing: "ease-in-out", fill: "forwards" });
    setTimeout(() => { say.innerHTML = "② 붙여넣기: 앨범에 넣어요!"; }, 1300);
    an.onfinish = () => {
      fly.remove();
      b.append(el("span", "dm-it pop", "🐶<i>강아지</i>"));
      if (mode === "cut") { it.remove(); say.innerHTML = "<b>잘라내기</b>는 <b>옮기기</b>예요. 사진 폴더에서 강아지가 <b>없어졌어요</b>."; }
      else say.innerHTML = "<b>복사</b>는 <b>똑같은 것 하나 더</b>예요. 사진 폴더에도 강아지가 <b>그대로 있어요</b>.";
      release(mode);
    };
  };
  art.querySelectorAll("[data-demo]").forEach(b => b.addEventListener("click", e => { e.stopPropagation(); run(b.dataset.demo); }, true));
}
function gridInit(rule) {
  return (art, ctx, release) => {
    const items = [...art.querySelectorAll(".mg-it")];
    let anchor = null;
    const say = art.querySelector(".mg-say");
    items.forEach((b, i) => b.addEventListener("click", e => {
      if (e.ctrlKey || e.metaKey) { b.classList.toggle("on"); anchor = i; }
      else if (e.shiftKey && anchor != null) { items.forEach((x, k) => x.classList.toggle("on", k >= Math.min(anchor, i) && k <= Math.max(anchor, i))); }
      else { items.forEach(x => x.classList.remove("on")); b.classList.add("on"); anchor = i; }
      const on = items.filter(x => x.classList.contains("on")).map(x => x.dataset.n);
      const r = rule(on, e);
      say.innerHTML = r ? `✔ ${r}` : `고른 것: ${on.join(", ") || "없음"}`;
      if (r) release("grid");
    }));
  };
}
function practiceInit(rule, id) {
  return (art, ctx, release) => {
    const ta = art.querySelector(".pr-ta"), say = art.querySelector(".pr-say");
    let clip = "";
    const test = (ev) => { const r = rule(ta, ev, clip); if (r) { say.innerHTML = "✔ " + r; release(id); } };
    ta.addEventListener("select", () => test("select"));
    ta.addEventListener("mouseup", () => setTimeout(() => test("select"), 0));
    ta.addEventListener("keyup", () => test("key"));
    ta.addEventListener("copy", () => { clip = ta.value.slice(ta.selectionStart, ta.selectionEnd); setTimeout(() => test("copy"), 0); });
    ta.addEventListener("input", () => test("input"));
  };
}

/* ================= 처음 파일 ================= */
function base(s) {
  s.put("문서", ["숙제/", "학급 규칙.txt"]);
  s.put("문서/숙제", ["일기.txt", "독서록.txt"]);
  s.text("문서/숙제/일기", "오늘은 친구와 운동장에서 놀았다.\n정말 재미있었다.");
  s.text("문서/숙제/독서록", "책 제목: 우리 반 이야기\n느낀 점: 친구들이 서로 도와서 좋았다.");
  s.text("문서/학급 규칙", "1. 친구에게 고운 말 쓰기\n2. 복도에서는 걷기\n3. 컴퓨터는 소중히 다루기");
  s.put("사진", ["동물/", "강아지.jpg", "고양이.jpg", "토끼.jpg", "바다.jpg", "하늘.jpg", "꽃.jpg"]);
  s.put("사진/동물", ["햄스터.jpg", "나비.jpg"]);
  s.put("음악", ["동요.mp3", "생일 축하.mp3"]);
  s.put("다운로드", ["여행/", "게임 설명.txt"]);
  s.put("다운로드/여행", ["보물지도.jpg"]);
  s.text("다운로드/게임 설명", "마우스로 풍선을 클릭하면 터져요!");
}
const has = (s, p) => s.exists(p);
const winOf = (s, kind) => s.wins.find(w => w.kind === kind);

/* ================= 1차시 바탕 화면과 시작 메뉴 ================= */
const deskSetup = s => { base(s); s.put("바탕 화면", ["숙제 모음/", "안내문.txt"]); s.text("바탕 화면/안내문", "컴퓨터실에서는 음식을 먹지 않아요."); };
ACTS["w1-tour"] = { name: "바탕 화면 살펴보기", icon: "🖥️", type: "tour", mins: 5, desc: "컴퓨터를 켜면 보이는 화면의 이름을 하나씩 알아봐요.",
  run: ctx => runTour(ctx, { title: "바탕 화면에는 무엇이 있을까요?", intro: "컴퓨터를 켜면 이런 화면이 나와요. 번호가 붙은 곳 8군데의 이름을 알아봐요.", setup: deskSetup,
    spots: [
      { sel: ".ws-desk", name: "바탕 화면", desc: "컴퓨터를 켜면 처음 보이는 넓은 화면이에요.", more: "진짜 책상 위처럼 자주 쓰는 것을 올려 둘 수 있어요." },
      { sel: '.ws-desk .it[data-id="BIN"]', name: "휴지통", desc: "지운 파일이 들어가는 쓰레기통이에요.", more: "실수로 지워도 휴지통에서 다시 꺼낼 수 있어요." },
      { sel: '.ws-desk .it.is-folder:not([data-id="BIN"])', name: "폴더", desc: "노란 상자 모양은 폴더예요. 파일을 담아 두는 상자예요.", more: "더블클릭하면 안에 무엇이 있는지 열어 볼 수 있어요." },
      { sel: ".ws-desk .it.is-file", name: "파일", desc: "글, 사진, 음악 같은 것을 파일이라고 해요.", more: "이 아이콘처럼 작은 그림 단추를 '아이콘'이라고 불러요." },
      { sel: ".ws-bar", name: "작업 표시줄", desc: "화면 맨 아래의 긴 줄이에요.", more: "시작 단추와 지금 열려 있는 프로그램이 여기에 보여요." },
      { sel: ".bar-start", name: "시작 단추", desc: "창문 모양 단추예요. 누르면 시작 메뉴가 열려요.", more: "프로그램을 찾거나 컴퓨터를 끌 때 써요." },
      { sel: '[data-bar="explorer"]', name: "파일 탐색기 단추", desc: "노란 폴더 단추를 누르면 파일 탐색기가 열려요.", more: "내 컴퓨터에 있는 파일과 폴더를 찾아보는 프로그램이에요." },
      { sel: ".bar-clock", name: "시계와 날짜", desc: "지금 시각과 오늘 날짜가 보여요." }
    ] }) };
ACTS["w1-start"] = { name: "시작 메뉴 살펴보기", icon: "🪟", type: "tour", mins: 3, desc: "시작 단추를 누르면 나오는 시작 메뉴를 알아봐요.",
  run: ctx => runTour(ctx, { title: "시작 메뉴", intro: "시작 단추를 누르면 이 메뉴가 열려요. 여기서 프로그램을 찾아 열어요.", setup: deskSetup, prep: s => { s.start.hidden = false; },
    spots: [
      { sel: ".st-search", name: "검색 칸", desc: "프로그램 이름을 쳐서 찾을 수 있어요." },
      { sel: ".st-apps", name: "고정된 앱", desc: "자주 쓰는 프로그램이 모여 있어요. 한 번 클릭하면 열려요.", more: "앱은 '프로그램'과 같은 말이에요." },
      { sel: '[data-app="notepad"]', name: "메모장", desc: "글을 쓰고 저장할 수 있는 가장 간단한 프로그램이에요." },
      { sel: '[data-app="calc"]', name: "계산기", desc: "더하기, 빼기 같은 계산을 해 줘요." },
      { sel: ".st-pow", name: "전원 단추", desc: "컴퓨터를 끌 때 눌러요. 시스템 종료를 고르면 꺼져요." }
    ] }) };
ACTS["w1-do"] = { name: "바탕 화면 따라 하기", icon: "👆", type: "sim", mins: 8, desc: "연습 화면에서 시작 메뉴를 열고 프로그램을 열고 닫아요.",
  run: ctx => runSim(ctx, { title: "바탕 화면과 시작 메뉴", setup: deskSetup, finish: "시작 메뉴와 프로그램 열고 닫기를 해냈어요!",
    tasks: [
      { t: "화면 아래 가운데에 있는 <em>시작 단추</em>(파란 창문 모양)를 클릭해요.", h: "작업 표시줄 가운데, 파란 네모 4개가 모인 단추예요.", c: (s, e) => e.type === "startOpen" },
      { t: "시작 메뉴가 열렸어요! <em>시작 단추를 한 번 더</em> 누르거나 <em>바탕 화면 빈 곳</em>을 눌러서 닫아요.", c: (s, e) => e.type === "startClose" },
      { t: "다시 시작 단추를 누르고 <em>메모장</em>을 클릭해서 열어요.", h: "시작 메뉴 안의 📝 메모장 단추예요.", c: s => s.count("notepad") > 0 },
      { t: "메모장이 열렸어요. 창 오른쪽 위의 <em>✕ 닫기</em>를 눌러 닫아요.", h: "창 맨 위 오른쪽 끝, 빨갛게 변하는 ✕ 단추예요.", c: (s, e) => e.type === "close" && s.count("notepad") === 0 },
      { t: "바탕 화면의 <em>휴지통</em>을 <em>한 번</em> 클릭해요. 파랗게 골라져요.", h: "한 번만 누르면 '선택'만 돼요. 아직 열리지 않아요.", c: s => s.sel.ids.has("BIN") },
      { t: "이번엔 휴지통을 <em>더블클릭</em>(딸깍딸깍)해서 열어요.", h: "같은 자리를 빠르게 두 번 눌러요.", c: s => s.at("BIN") },
      { t: "휴지통 창을 <em>✕</em>로 닫아요.", c: s => s.count("explorer") === 0 },
      { t: "작업 표시줄의 <em>📁 파일 탐색기</em> 단추를 눌러요.", h: "시작 단추 바로 오른쪽의 노란 폴더 단추예요.", c: s => s.count("explorer") > 0 },
      { t: "파일 탐색기 창도 <em>✕</em>로 닫아요.", c: s => s.count("explorer") === 0 },
      { t: "시작 메뉴에서 <em>계산기</em>를 열어요.", c: s => s.count("calc") > 0 },
      { t: "계산기 단추를 눌러 <em>3 + 4 =</em> 를 계산해요.", h: "3 → + → 4 → = 순서로 눌러요. 7이 나오면 성공!", c: (s, e) => e.type === "calc" && e.key === "=" && e.display === "7" },
      { t: "계산기를 닫아요.", c: s => s.count("calc") === 0 }
    ] }) };
ACTS["w1-try"] = { name: "혼자 해보기: 프로그램 열기", icon: "⭐", type: "challenge", mins: 5, desc: "미션 목록을 보고 순서 없이 혼자 해결해요.",
  run: ctx => runSim(ctx, { title: "혼자 해보기", setup: deskSetup, intro: "아래 미션을 모두 해결해 보세요. 순서는 상관없어요.", finish: "혼자서 모두 해냈어요!",
    goals: [
      { t: "메모장과 계산기를 <b>둘 다</b> 열어 놓기", h: "시작 단추를 눌러 하나씩 열어요.", c: s => s.count("notepad") > 0 && s.count("calc") > 0 },
      { t: "계산기로 <b>12 + 8</b> 계산하기", h: "1, 2를 누르고 +, 8, = 를 눌러요.", c: (s, e) => e.type === "calc" && e.key === "=" && e.display === "20" },
      { t: "바탕 화면의 <b>숙제 모음</b> 폴더 열어 보기", h: "바탕 화면의 숙제 모음 폴더를 더블클릭해요.", c: s => s.at("바탕 화면/숙제 모음") },
      { t: "마지막에 <b>모든 창 닫기</b>", h: "열린 창마다 오른쪽 위 ✕를 눌러요.", live: true, c: s => s.wins.length === 0 && s.log.some(e => e.type === "close") }
    ] }) };

/* ================= 2차시 창 다루기 ================= */
const winSetup = s => { base(s); s.openExplorer("DOCS"); };
ACTS["w2-tour"] = { name: "창의 부분 살펴보기", icon: "🪟", type: "tour", mins: 4, desc: "창의 제목 표시줄과 단추 이름을 알아봐요.",
  run: ctx => runTour(ctx, { title: "창은 이렇게 생겼어요", intro: "프로그램을 열면 네모난 '창'이 나와요. 창의 각 부분 이름을 알아봐요.", setup: winSetup,
    spots: [
      { sel: ".win .w-title", name: "제목 표시줄", desc: "창 맨 위의 줄이에요. 창 이름이 쓰여 있어요.", more: "여기를 누른 채 끌면 창을 옮길 수 있어요. 더블클릭하면 창이 커져요." },
      { sel: '.win [data-b="min"]', name: "— 최소화", desc: "창을 작업 표시줄로 숨겨요.", more: "꺼진 게 아니에요! 작업 표시줄 단추를 누르면 다시 나와요." },
      { sel: '.win [data-b="max"]', name: "▢ 최대화", desc: "창을 화면 가득 크게 키워요.", more: "커진 다음에는 모양이 ❐로 바뀌고, 다시 누르면 원래 크기로 돌아와요." },
      { sel: '.win [data-b="close"]', name: "✕ 닫기", desc: "창을 완전히 닫아요.", more: "다 쓴 프로그램은 닫아요." },
      { sel: ".win .w-grip", name: "창 모서리", desc: "모서리를 누른 채 끌면 창 크기를 바꿀 수 있어요." },
      { sel: '[data-bar="explorer"]', name: "작업 표시줄의 창 단추", desc: "열린 창은 작업 표시줄 단추 아래에 작은 줄이 생겨요.", more: "숨긴 창을 다시 꺼낼 때 눌러요." }
    ] }) };
ACTS["w2-do"] = { name: "창 다루기 따라 하기", icon: "👆", type: "sim", mins: 9, desc: "창을 키우고, 숨기고, 옮기고, 크기를 바꿔요.",
  run: ctx => runSim(ctx, { title: "창 다루기", setup: winSetup, finish: "창을 마음대로 다룰 수 있게 됐어요!",
    tasks: [
      { t: "창 오른쪽 위의 <em>▢ 최대화</em> 단추를 눌러 창을 화면 가득 키워요.", h: "✕ 바로 왼쪽의 네모 단추예요.", c: (s, e) => e.type === "maximize" },
      { t: "같은 자리의 <em>❐</em> 단추를 눌러 <em>원래 크기</em>로 돌려요.", c: (s, e) => e.type === "restore" },
      { t: "<em>— 최소화</em> 단추를 눌러 창을 숨겨요.", h: "오른쪽 위 단추 3개 중 맨 왼쪽이에요.", c: (s, e) => e.type === "minimize" },
      { t: "창이 사라졌죠? 작업 표시줄에 숨어 있어요. <em>📁 단추</em>를 눌러 다시 꺼내요.", h: "화면 맨 아래, 시작 단추 옆 노란 폴더 단추예요.", c: (s, e) => e.type === "unminimize" },
      { t: "창 맨 위 <em>제목 표시줄</em>을 누른 채 끌어서 창을 다른 곳으로 옮겨요.", h: "'문서'라고 쓰인 줄을 누르고, 손을 떼지 말고 움직여요.", c: (s, e) => e.type === "moveWindow" && e.dist > 60 },
      { t: "창의 <em>오른쪽 아래 모서리</em>를 누른 채 끌어서 창 크기를 바꿔요.", h: "모서리에 줄무늬 표시가 있어요. 거기를 눌러 끌어요.", c: (s, e) => e.type === "resize" && Math.abs(e.dw) + Math.abs(e.dh) > 40 },
      { t: "제목 표시줄을 <em>더블클릭</em>해 보세요. 창이 커져요!", c: (s, e) => e.type === "maximize" && e.via === "dbl" },
      { t: "다시 제목 표시줄을 더블클릭해서 원래 크기로 돌려요.", c: (s, e) => e.type === "restore" },
      { t: "시작 단추를 눌러 <em>메모장</em>을 열어요. 창이 두 개가 됐어요.", c: s => s.count("notepad") > 0 },
      { t: "뒤에 가려진 <em>문서 창</em>의 보이는 부분을 클릭해서 앞으로 가져와요.", h: "메모장에 가려진 탐색기 창의 끝부분을 클릭해요. 안 보이면 메모장을 옮겨 보세요.", c: (s, e) => e.type === "focus" && s.topWin() && s.topWin().kind === "explorer" },
      { t: "작업 표시줄의 <em>📝 메모장 단추</em>를 눌러 메모장을 다시 앞으로 가져와요.", c: (s, e) => e.type === "focus" && s.topWin() && s.topWin().kind === "notepad" },
      { t: "두 창을 모두 <em>✕</em>로 닫아요.", c: s => s.wins.length === 0 }
    ] }) };
ACTS["w2-try"] = { name: "혼자 해보기: 창 정리", icon: "⭐", type: "challenge", mins: 5, desc: "여러 창을 혼자 키우고 숨기고 옮겨요.",
  run: ctx => runSim(ctx, { title: "혼자 해보기", setup: winSetup, intro: "문서 창이 열려 있어요. 아래 미션을 순서 없이 해결해요.", finish: "창 다루기 박사!",
    goals: [
      { t: "메모장을 열어서 <b>최대화</b>하기", h: "시작 → 메모장, 그리고 ▢ 단추.", c: (s, e) => e.type === "maximize" && e.kind === "notepad" },
      { t: "계산기를 열어서 화면 <b>오른쪽</b>으로 옮기기", h: "계산기 제목 표시줄을 끌어서 오른쪽에 놓아요.", c: (s, e) => e.type === "moveWindow" && e.kind === "calc" && e.w.x + e.w.w / 2 > s.layer.clientWidth / 2 },
      { t: "문서 창을 <b>최소화</b>했다가 다시 꺼내기", h: "— 를 누르고, 작업 표시줄 📁를 눌러요.", c: (s, e) => e.type === "unminimize" && e.kind === "explorer" },
      { t: "아무 창이나 <b>크기 바꾸기</b>", h: "창 오른쪽 아래 모서리를 끌어요.", c: (s, e) => e.type === "resize" },
      { t: "마지막에 <b>모든 창 닫기</b>", h: "✕를 눌러요.", live: true, c: s => s.wins.length === 0 }
    ] }) };

/* ================= 3차시 파일 탐색기 ================= */
ACTS["w3-tour"] = { name: "파일 탐색기 살펴보기", icon: "📁", type: "tour", mins: 5, desc: "파일 탐색기 화면의 이름을 알아봐요.",
  run: ctx => runTour(ctx, { title: "파일 탐색기", intro: "파일 탐색기는 내 컴퓨터 속 파일과 폴더를 찾아보는 프로그램이에요.", setup: s => { base(s); const w = s.openExplorer("DOCS"); w.w = Math.min(760, s.layer.clientWidth - 20); w.h = Math.min(460, s.layer.clientHeight - 20); },
    spots: [
      { sel: ".win .w-path", name: "주소 표시줄", desc: "지금 어느 폴더에 있는지 알려 줘요.", more: "'내 PC › 문서'는 내 PC 안의 문서 폴더에 있다는 뜻이에요. 앞쪽 이름을 누르면 그 폴더로 가요." },
      { sel: '.win [data-n="back"]', name: "← 뒤로", desc: "바로 전에 보던 폴더로 돌아가요.", more: "옆의 → 는 앞으로, ↑ 는 한 칸 위 폴더로 가요." },
      { sel: ".win .w-nav", name: "탐색 창", desc: "왼쪽 목록이에요. 바탕 화면, 문서, 사진 같은 폴더로 한 번에 갈 수 있어요." },
      { sel: ".win .w-files", name: "파일 목록", desc: "지금 폴더 안에 들어 있는 것이 보여요." },
      { sel: ".win .w-files .it.is-folder", name: "폴더", desc: "노란 상자 모양이에요. 더블클릭하면 안으로 들어가요." },
      { sel: ".win .w-files .it.is-file", name: "파일", desc: "글, 사진, 음악 같은 것이에요. 더블클릭하면 열려요." },
      { sel: ".win .w-tool", name: "도구 모음", desc: "새 폴더 만들기, 잘라내기, 복사, 붙여넣기, 이름 바꾸기, 삭제 단추가 있어요.", more: "다음 시간부터 하나씩 배워요!" },
      { sel: ".win .w-status", name: "상태 표시줄", desc: "이 폴더에 항목이 몇 개 있는지, 몇 개를 골랐는지 알려 줘요." }
    ] }) };
const KINDS = [["📁", "숙제", "folder", "폴더예요. 파일을 담는 상자예요."], ["📁", "여행", "folder", "폴더예요. 안에 사진이 들어 있을지도 몰라요."], ["📁", "음악 모음", "folder", "폴더예요. 노란 상자 모양이면 폴더!"],
  ["🐶", "강아지", "file", "사진 파일이에요."], ["🌊", "바다", "file", "사진 파일이에요."], ["📝", "일기", "file", "글(텍스트 문서) 파일이에요. 메모장으로 열려요."], ["📝", "학급 규칙", "file", "글 파일이에요."],
  ["🎵", "동요", "file", "음악 파일이에요. 열면 노래가 나와요."], ["🎵", "생일 축하", "file", "음악 파일이에요."], ["📁", "사진", "folder", "폴더예요. 이름이 '사진'이어도 노란 상자면 폴더예요!"]];
ACTS["w-kind"] = { name: "폴더일까? 파일일까?", icon: "❓", type: "guide", pass: 2, mins: 4, desc: "그림을 보고 폴더인지 파일인지 맞혀요.",
  run(ctx) {
    const qs = shuffle(KINDS); let i = 0, ok = 0, tried = false;
    const box = el("div", "kq");
    ctx.arena.append(box);
    const ask = () => {
      const q = qs[i]; tried = false;
      box.innerHTML = `<div class="kq-n">${i + 1} / ${qs.length}</div><div class="kq-ic ${q[2] === "file" && q[0] !== "📝" && q[0] !== "🎵" ? "thumb" : ""}">${q[0]}</div><div class="kq-name">${q[1]}</div><div class="kq-btns"><button type="button" data-k="folder">📁 폴더</button><button type="button" data-k="file">📄 파일</button></div><p class="kq-fb"></p>`;
      box.querySelectorAll("[data-k]").forEach(b => b.onclick = () => {
        if (b.dataset.k === q[2]) {
          if (!tried) ok++;
          box.querySelector(".kq-fb").innerHTML = `✔ 맞아요! ${q[3]}`;
          box.querySelector(".kq-btns").innerHTML = `<button type="button" class="primary" data-nx>${i < qs.length - 1 ? "다음 ▶" : "결과 보기"}</button>`;
          box.querySelector("[data-nx]").onclick = () => { i++; if (i < qs.length) ask(); else ctx.done(ok >= 9 ? 3 : ok >= 6 ? 2 : 1, `${qs.length}문제 중 ${ok}문제를 한 번에 맞혔어요!`); };
        } else { tried = true; box.querySelector(".kq-fb").innerHTML = "다시 생각해 봐요. <b>노란 상자 모양</b>이면 폴더예요."; b.classList.add("no"); }
        ctx.hud(`맞힌 문제 <b>${ok}</b> / ${qs.length}`);
      });
    };
    ask(); ctx.hud(`맞힌 문제 <b>0</b> / ${qs.length}`);
  } };
const w3Setup = s => { base(s); s.put("바탕 화면", ["숨은 보물/"]); s.put("바탕 화면/숨은 보물", ["깊은 곳/"]); s.put("바탕 화면/숨은 보물/깊은 곳", ["왕관.jpg"]); };
ACTS["w3-do"] = { name: "탐색기 따라 하기", icon: "👆", type: "sim", mins: 9, desc: "폴더를 오가며 사진과 음악을 열어 봐요.",
  run: ctx => runSim(ctx, { title: "파일 탐색기 다니기", setup: base, finish: "파일 탐색기에서 길을 잃지 않고 다닐 수 있어요!",
    tasks: [
      { t: "작업 표시줄의 <em>📁 단추</em>를 눌러 파일 탐색기를 열어요.", c: s => s.count("explorer") > 0 },
      { t: "왼쪽 탐색 창에서 <em>사진</em>을 클릭해요.", h: "탐색기 창 왼쪽 목록의 🖼️ 사진이에요.", c: s => s.at("사진") },
      { t: "<em>동물</em> 폴더를 더블클릭해서 안으로 들어가요.", c: s => s.at("사진/동물") },
      { t: "<em>햄스터</em> 사진을 더블클릭해서 열어요.", c: (s, e) => e.type === "open" && e.name === "햄스터" },
      { t: "사진 창을 <em>✕</em>로 닫아요.", c: s => s.count("viewer") === 0 },
      { t: "주소 표시줄 왼쪽의 <em>← 뒤로</em> 단추를 눌러 사진 폴더로 돌아가요.", c: (s, e) => e.type === "nav" && e.via === "back" && s.at("사진") },
      { t: "왼쪽에서 <em>음악</em>을 눌러요.", c: s => s.at("음악") },
      { t: "<em>동요</em>를 더블클릭해서 열고 <em>▶ 재생</em>을 눌러 봐요.", c: (s, e) => e.type === "play" && e.playing },
      { t: "음악 창을 닫아요.", c: s => s.count("viewer") === 0 },
      { t: "왼쪽에서 <em>문서</em>를 누르고, <em>숙제</em> 폴더로 들어가요.", c: s => s.at("문서/숙제") },
      { t: "주소 표시줄의 <em>문서</em> 글자를 클릭해서 한 칸 위로 올라가요.", h: "'내 PC › 문서 › 숙제'에서 가운데 '문서'를 눌러요.", c: (s, e) => e.type === "nav" && (e.via === "crumb" || e.via === "up") && s.at("문서") },
      { t: "<em>학급 규칙</em>을 더블클릭해서 열어 읽어 봐요. 메모장으로 열려요.", c: (s, e) => e.type === "open" && e.name === "학급 규칙" },
      { t: "열린 창을 모두 닫아요.", c: s => s.wins.length === 0 }
    ] }) };
ACTS["w3-try"] = { name: "혼자 해보기: 보물찾기", icon: "🗺️", type: "challenge", mins: 6, desc: "폴더 속에 숨은 파일을 찾아 열어요.",
  run: ctx => runSim(ctx, { title: "보물찾기", setup: w3Setup, intro: "폴더 속 깊이 숨은 파일 4개를 찾아서 열어 보세요!", finish: "보물을 모두 찾았어요!",
    goals: [
      { t: "다운로드 › 여행 › <b>보물지도</b> 열기", h: "탐색기 왼쪽에서 다운로드를 누르고, 여행 폴더를 더블클릭해요.", c: (s, e) => e.type === "open" && e.name === "보물지도" },
      { t: "문서 › 숙제 › <b>일기</b> 열기", h: "문서 → 숙제 폴더 → 일기를 더블클릭해요.", c: (s, e) => e.type === "open" && e.name === "일기" },
      { t: "음악 › <b>생일 축하</b> 열기", h: "왼쪽에서 음악을 눌러요.", c: (s, e) => e.type === "open" && e.name === "생일 축하" },
      { t: "바탕 화면 › 숨은 보물 › 깊은 곳 › <b>왕관</b> 열기", h: "바탕 화면의 숨은 보물 폴더를 더블클릭하고 계속 들어가요.", c: (s, e) => e.type === "open" && e.name === "왕관" }
    ] }) };

/* ================= 4차시 폴더 만들기와 이름 바꾸기 ================= */
ACTS["w4-learn"] = { name: "폴더 만들기 알아보기", icon: "💡", type: "guide", mins: 5, desc: "폴더가 왜 필요한지, 어떻게 만드는지 알아봐요.",
  run: ctx => slides(ctx, [
    { title: "폴더는 정리 상자", text: "<p>장난감을 상자에 나눠 담듯이, 파일도 <b>폴더</b>에 나눠 담아요.</p><p>사진은 사진 폴더에, 숙제는 숙제 폴더에!</p>", art: ART.boxes },
    { title: "새 폴더 만들기", text: "<ol><li>빈 곳을 <b>오른쪽 클릭</b></li><li><b>새로 만들기</b>에 마우스를 올리고</li><li><b>폴더</b> 클릭</li><li>이름을 쓰고 <b>Enter</b></li></ol><p>탐색기 도구 모음의 <b>＋ 새로 만들기</b> 단추로도 만들 수 있어요.</p>", art: `<div class="pic"><div class="pic-cap">빈 곳을 오른쪽 클릭하면</div><div class="pic-menu"><div class="pm-row hi"><span>＋</span><span>새로 만들기</span><span>›</span></div><hr><div class="pm-row"><span>📋</span><span>붙여넣기</span><span>Ctrl+V</span></div></div><div class="pic-menu sub"><div class="pm-row hi"><span>📁</span><span>폴더</span><span></span></div><div class="pm-row"><span>📝</span><span>텍스트 문서</span><span></span></div></div></div>` },
    { title: "이름 바꾸기", text: "<p>폴더나 파일을 <b>오른쪽 클릭 → 이름 바꾸기</b>를 눌러요.</p><p>더 빠른 방법: 한 번 클릭해서 고르고 키보드 <b>F2</b>!</p><p class='warn'>이름에는 \\ / : * ? \" &lt; &gt; | 를 쓸 수 없어요.</p><p>진짜 키보드에서 <b>F2</b>를 눌러 보세요.</p>", art: ART.keys(["F2"], "키보드 맨 위 줄, 왼쪽에서 세 번째쯤 있어요."), need: ["f2"], needLine: "👉 해 볼 것: <b>키보드의 F2</b>", init: keyNeed(["F2"], "f2") }
  ], "폴더 만들기와 이름 바꾸기 방법을 알았어요!") };
ACTS["w4-do"] = { name: "폴더 만들기 따라 하기", icon: "👆", type: "sim", mins: 10, desc: "새 폴더를 만들고 이름을 짓고 바꿔요.",
  run: ctx => runSim(ctx, { title: "폴더 만들기", setup: base, finish: "폴더를 만들고 이름을 마음대로 바꿀 수 있어요!",
    tasks: [
      { t: "파일 탐색기를 열고 왼쪽에서 <em>문서</em>를 눌러요.", c: s => s.at("문서") },
      { t: "파일 목록의 <em>빈 곳</em>(아이콘이 없는 흰 곳)을 <em>오른쪽 클릭</em>해요.", h: "마우스 오른쪽 버튼을 눌러요. 메뉴가 나오면 성공!", c: (s, e) => e.type === "ctxmenu" && e.on === "bg" && e.view !== "desk" },
      { t: "메뉴에서 <em>새로 만들기</em>에 마우스를 올리고 <em>폴더</em>를 클릭해요.", h: "다시 오른쪽 클릭해서 메뉴를 열어도 돼요.", c: (s, e) => e.type === "newFolder" },
      { t: "'새 폴더' 이름 칸이 파랗게 됐어요. 그대로 <em>내 그림</em>이라고 쓰고 <em>Enter</em>!", h: "글자를 바로 치면 이름이 바뀌어요. 다 쓰면 Enter.", c: s => has(s, "문서/내 그림") },
      { t: "<em>내 그림</em> 폴더를 더블클릭해서 들어가요. 아직 비어 있어요.", c: s => s.at("문서/내 그림") },
      { t: "도구 모음의 <em>＋ 새로 만들기</em> → <em>폴더</em>로 폴더를 만들고 이름을 <em>동물 그림</em>으로 지어요.", h: "탐색기 창 위쪽 왼쪽 끝의 ＋ 단추예요.", c: s => has(s, "문서/내 그림/동물 그림") },
      { t: "이번엔 <em>바탕 화면 빈 곳</em>을 오른쪽 클릭 → 새로 만들기 → 폴더. 이름은 <em>연습</em>.", h: "탐색기 창이 가리면 최소화(—)하거나 옮겨요.", c: s => has(s, "바탕 화면/연습") },
      { t: "바탕 화면의 <em>연습</em> 폴더를 오른쪽 클릭 → <em>이름 바꾸기</em>. <em>놀이</em>로 바꿔요.", c: s => has(s, "바탕 화면/놀이") },
      { t: "<em>놀이</em> 폴더를 한 번 클릭하고 키보드 <em>F2</em>를 눌러 <em>놀이터</em>로 바꿔요.", h: "F2는 키보드 맨 위 줄에 있어요.", c: (s, e) => e.type === "rename" && e.via === "key" && has(s, "바탕 화면/놀이터") },
      { t: "<em>놀이터</em> 폴더를 더블클릭해서 열어 봐요.", c: s => s.at("바탕 화면/놀이터") }
    ] }) };
ACTS["w4-try"] = { name: "혼자 해보기: 계절 폴더", icon: "⭐", type: "challenge", mins: 6, desc: "폴더를 여러 개 만들고 이름을 바꿔요.",
  run: ctx => runSim(ctx, { title: "혼자 해보기", setup: base, intro: "폴더 만들기 미션! 순서는 자유예요.", finish: "폴더 정리 선수!",
    goals: [
      { t: "문서 폴더 안에 <b>봄, 여름, 가을, 겨울</b> 폴더 4개 만들기", h: "문서에서 빈 곳 오른쪽 클릭 → 새로 만들기 → 폴더를 4번 해요.", live: true, c: s => ["봄", "여름", "가을", "겨울"].every(n => has(s, "문서/" + n)) },
      { t: "<b>봄</b> 폴더 안에 <b>꽃 사진</b> 폴더 만들기", h: "봄 폴더를 더블클릭해서 들어간 다음 만들어요.", live: true, c: s => has(s, "문서/봄/꽃 사진") },
      { t: "사진 › <b>동물</b> 폴더 이름을 <b>귀여운 동물</b>로 바꾸기", h: "동물 폴더를 클릭하고 F2를 눌러요.", live: true, c: s => has(s, "사진/귀여운 동물") },
      { t: "바탕 화면에 <b>내 이름</b>으로 폴더 만들기", h: "바탕 화면 빈 곳을 오른쪽 클릭해요. 이름은 '새 폴더'가 아니라 내 이름!", live: true, c: s => s.kids("DESK").some(n => n.type === "folder" && !/^새 폴더/.test(n.name)) }
    ] }) };

/* ================= 5차시 복사와 붙여넣기 ================= */
ACTS["w5-learn"] = { name: "복사 알아보기", icon: "💡", type: "guide", mins: 6, desc: "복사와 붙여넣기가 무엇인지 그림으로 알아봐요.",
  run: ctx => slides(ctx, [
    { title: "복사는 '똑같은 것 하나 더'", text: "<p><b>복사</b>를 하면 컴퓨터가 파일을 <b>클립보드</b>에 잠깐 기억해요.</p><p>그리고 넣고 싶은 곳에서 <b>붙여넣기</b>를 하면 똑같은 파일이 하나 더 생겨요.</p><p>[⧉ 복사하면?] 단추를 눌러 보세요.</p>", art: ART.demo(["copy"]), need: ["copy"], needLine: "👉 해 볼 것: <b>[복사하면?] 단추</b>", init: demoInit },
    { title: "복사하는 방법 3가지", text: "<ol><li><b>오른쪽 클릭</b> → 복사 / 붙여넣기</li><li>탐색기 <b>도구 모음</b>의 ⧉ 복사 / 📋 붙여넣기 단추</li><li>키보드 <b>Ctrl + C</b> (복사) / <b>Ctrl + V</b> (붙여넣기)</li></ol><p>어떤 방법이든 결과는 똑같아요. 꼭 <b>복사 먼저, 붙여넣기는 나중</b>!</p>", art: ART.menu([["", "<b>열기</b>", "Enter"], "-", ["✂", "잘라내기", "Ctrl+X"], ["⧉", "복사", "Ctrl+C"], "-", ["✎", "이름 바꾸기", "F2"], ["🗑", "삭제", "Delete"]], "복사", "파일을 오른쪽 클릭하면") },
    { title: "진짜 키보드로 해 볼까요?", text: "<p><b>Ctrl</b>은 키보드 맨 아래 줄 왼쪽 끝에 있어요.</p><p><b>Ctrl을 누른 채로</b> C를 톡! 눌러 보세요.</p><p>C는 Copy(복사), V는 C 바로 옆에 있어요.</p>", art: ART.keys(["Ctrl", "C"], "Ctrl을 먼저 누르고, 손을 떼지 않은 채 C"), need: ["cc"], needLine: "👉 해 볼 것: <b>키보드의 Ctrl + C</b>", init: keyNeed(["Ctrl", "C"], "cc") },
    { title: "이번엔 붙여넣기", text: "<p><b>Ctrl을 누른 채로</b> V를 톡!</p><p>복사는 <b>Ctrl + C</b>, 붙여넣기는 <b>Ctrl + V</b>. 두 키는 이웃이에요.</p>", art: ART.keys(["Ctrl", "V"]), need: ["cv"], needLine: "👉 해 볼 것: <b>키보드의 Ctrl + V</b>", init: keyNeed(["Ctrl", "V"], "cv") }
  ], "복사와 붙여넣기를 알았어요! 이제 연습 화면에서 해 봐요.") };
const w5Setup = s => { base(s); s.put("문서", ["앨범/"]); s.openExplorer("PICS"); };
ACTS["w5-do"] = { name: "복사 따라 하기", icon: "👆", type: "sim", mins: 10, desc: "사진을 앨범 폴더로 복사해요. 세 가지 방법을 모두 써 봐요.",
  run: ctx => runSim(ctx, { title: "복사하고 붙여넣기", setup: w5Setup, finish: "세 가지 방법으로 모두 복사했어요!",
    tasks: [
      { t: "사진 폴더가 열려 있어요. <em>강아지</em> 사진을 <em>한 번</em> 클릭해서 골라요.", c: s => s.sel.ids.size === 1 && s.selNames()[0] === "강아지" },
      { t: "강아지를 <em>오른쪽 클릭</em> → <em>복사</em>를 눌러요.", h: "메뉴에서 ⧉ 복사를 눌러요.", c: (s, e) => e.type === "copy" && e.via === "menu" && e.names.includes("강아지") },
      { t: "왼쪽 탐색 창에서 <em>문서</em>를 누르고, <em>앨범</em> 폴더를 더블클릭해서 들어가요.", c: s => s.at("문서/앨범") },
      { t: "앨범의 <em>빈 곳</em>을 오른쪽 클릭 → <em>붙여넣기</em>!", c: s => has(s, "문서/앨범/강아지") },
      { t: "왼쪽에서 <em>사진</em>을 눌러 보세요. 강아지가 아직 있나요? <em>복사는 원래 것이 그대로 남아요.</em>", c: s => s.at("사진") && has(s, "사진/강아지") },
      { t: "<em>고양이</em>를 클릭하고, 위쪽 도구 모음의 <em>⧉ 복사</em> 단추를 눌러요.", h: "탐색기 창 위쪽, 가위(✂) 오른쪽 단추예요.", c: (s, e) => e.type === "copy" && e.via === "toolbar" && e.names.includes("고양이") },
      { t: "문서 › 앨범으로 가서 도구 모음의 <em>📋 붙여넣기</em> 단추를 눌러요.", c: (s, e) => e.type === "paste" && e.via === "toolbar" && has(s, "문서/앨범/고양이") },
      { t: "이번엔 키보드! 사진 폴더로 가서 <em>토끼</em>를 클릭하고 <em>Ctrl + C</em>.", h: "Ctrl을 누른 채 C를 눌러요.", c: (s, e) => e.type === "copy" && e.via === "key" && e.names.includes("토끼") },
      { t: "앨범으로 가서 <em>Ctrl + V</em>!", h: "앨범 폴더에서 빈 곳을 한 번 클릭하고 Ctrl + V.", c: (s, e) => e.type === "paste" && e.via === "key" && has(s, "문서/앨범/토끼") },
      { t: "앨범 안에서 <em>토끼</em>를 클릭하고 Ctrl + C, 그리고 바로 <em>Ctrl + V</em>. 무엇이 생겼나요?", c: s => has(s, "문서/앨범/토끼 - 복사본") },
      { t: "같은 폴더에 붙여넣으면 이름 뒤에 <em>- 복사본</em>이 붙은 파일이 생겨요. 원래 것과 똑같은 파일이에요.", ack: true }
    ] }) };
ACTS["w5-try"] = { name: "혼자 해보기: 선물 상자", icon: "🎁", type: "challenge", mins: 6, desc: "사진과 글을 복사해서 선물 폴더를 채워요.",
  run: ctx => runSim(ctx, { title: "혼자 해보기", setup: base, intro: "친구에게 줄 선물 폴더를 만들어요. 원래 파일은 그대로 두고 <b>복사</b>해야 해요!", finish: "선물 폴더 완성!",
    goals: [
      { t: "바탕 화면에 <b>선물</b> 폴더 만들기", h: "바탕 화면 빈 곳 오른쪽 클릭 → 새로 만들기 → 폴더.", live: true, c: s => has(s, "바탕 화면/선물") },
      { t: "사진 3장 이상을 <b>선물</b> 폴더에 복사하기", h: "사진 폴더에서 사진을 Ctrl + C, 선물 폴더에서 Ctrl + V.", live: true, c: s => { const f = s.folderId("바탕 화면/선물"); return !!f && s.kids(f).filter(n => n.ext === "jpg").length >= 3; } },
      { t: "문서 › 숙제의 <b>일기</b>를 바탕 화면에 복사하기", h: "일기를 복사하고, 바탕 화면 빈 곳을 오른쪽 클릭 → 붙여넣기.", live: true, c: s => has(s, "바탕 화면/일기") && has(s, "문서/숙제/일기") },
      { t: "사진 폴더의 사진 6장은 <b>그대로</b> 두기", h: "잘라내기가 아니라 복사를 써야 원래 사진이 남아요.", live: true, c: s => ["강아지", "고양이", "토끼", "바다", "하늘", "꽃"].every(n => has(s, "사진/" + n)) }
    ] }) };

/* ================= 6차시 잘라내기와 옮기기 ================= */
ACTS["w6-learn"] = { name: "잘라내기 알아보기", icon: "💡", type: "guide", mins: 6, desc: "복사와 잘라내기가 어떻게 다른지 비교해요.",
  run: ctx => slides(ctx, [
    { title: "복사와 잘라내기는 달라요", text: "<p>두 단추를 모두 눌러서 비교해 보세요.</p><ul><li><b>복사</b>: 원래 자리에 그대로 남아요.</li><li><b>잘라내기</b>: 원래 자리에서 <b>없어지고</b> 새 자리로 옮겨져요.</li></ul>", art: ART.demo(["copy", "cut"]), need: ["copy", "cut"], needLine: "👉 해 볼 것: <b>두 단추 모두</b>", init: demoInit },
    { title: "잘라내기 방법", text: "<ol><li><b>오른쪽 클릭</b> → ✂ 잘라내기</li><li>도구 모음의 <b>✂</b> 단추</li><li>키보드 <b>Ctrl + X</b></li></ol><p>잘라내면 아이콘이 <b>흐려져요</b>. 옮길 곳에서 <b>붙여넣기</b>를 해야 옮겨져요.</p>", art: ART.menu([["", "<b>열기</b>", "Enter"], "-", ["✂", "잘라내기", "Ctrl+X"], ["⧉", "복사", "Ctrl+C"], "-", ["✎", "이름 바꾸기", "F2"], ["🗑", "삭제", "Delete"]], "잘라내기", "파일을 오른쪽 클릭하면") },
    { title: "Ctrl + X", text: "<p>X는 가위처럼 생겼죠? <b>Ctrl을 누른 채</b> X를 눌러 보세요.</p><p>C(복사), V(붙여넣기)의 바로 왼쪽 이웃이에요.</p>", art: ART.keys(["Ctrl", "X"], "Z  X  C  V — 나란히 있어요"), need: ["cx"], needLine: "👉 해 볼 것: <b>키보드의 Ctrl + X</b>", init: keyNeed(["Ctrl", "X"], "cx") },
    { title: "끌어서 옮기기", text: "<p>더 쉬운 방법도 있어요! 파일을 <b>누른 채 끌어서</b> 폴더 위에 놓으면 옮겨져요.</p><p>폴더가 파랗게 되었을 때 손을 떼요.</p>", art: `<div class="dragdemo"><span class="dd-file">🌈<i>무지개</i></span><span class="dd-arrow">➜</span><span class="dd-folder">📁<i>사진</i></span></div>` }
  ], "잘라내기와 옮기기를 알았어요!") };
const w6Setup = s => { base(s); s.clear("다운로드"); s.put("다운로드", ["모음/", "산.jpg", "무지개.jpg", "공룡.jpg", "수박.jpg", "신나는 노래.mp3", "자장가.mp3", "받아쓰기.txt"]); s.openExplorer("DOWN"); };
ACTS["w6-do"] = { name: "잘라내기 따라 하기", icon: "👆", type: "sim", mins: 10, desc: "다운로드 폴더의 파일을 알맞은 폴더로 옮겨요.",
  run: ctx => runSim(ctx, { title: "잘라내고 옮기기", setup: w6Setup, finish: "파일을 원하는 곳으로 옮길 수 있어요!",
    tasks: [
      { t: "다운로드 폴더가 열려 있어요. <em>산</em> 사진을 오른쪽 클릭 → <em>잘라내기</em>. 아이콘이 흐려져요.", c: (s, e) => e.type === "cut" && e.via === "menu" && e.names.includes("산") },
      { t: "왼쪽에서 <em>사진</em>을 누르고, 빈 곳을 오른쪽 클릭 → <em>붙여넣기</em>.", c: s => has(s, "사진/산") },
      { t: "왼쪽에서 <em>다운로드</em>를 다시 눌러 보세요. 산이 <em>없어졌죠?</em> 옮겨진 거예요!", c: s => s.at("다운로드") && !has(s, "다운로드/산") },
      { t: "<em>무지개</em>를 클릭하고 키보드 <em>Ctrl + X</em>.", c: (s, e) => e.type === "cut" && e.via === "key" && e.names.includes("무지개") },
      { t: "사진 폴더로 가서 <em>Ctrl + V</em>.", c: (s, e) => e.type === "paste" && e.via === "key" && has(s, "사진/무지개") },
      { t: "다운로드로 돌아와 <em>신나는 노래</em>를 클릭하고 도구 모음의 <em>✂</em> 단추를 눌러요.", c: (s, e) => e.type === "cut" && e.via === "toolbar" && e.names.includes("신나는 노래") },
      { t: "<em>음악</em> 폴더로 가서 도구 모음의 <em>📋 붙여넣기</em>.", c: s => has(s, "음악/신나는 노래") },
      { t: "다운로드로 돌아와요. 이번엔 끌어서 옮기기! <em>공룡</em>을 누른 채 끌어서 <em>모음</em> 폴더 위에 놓아요.", h: "모음 폴더가 파랗게 되었을 때 손을 떼요.", c: (s, e) => e.type === "move" && e.via === "drag" && has(s, "다운로드/모음/공룡") },
      { t: "<em>수박</em>을 끌어서 왼쪽 탐색 창의 <em>🖼️ 사진</em> 글자 위에 놓아요.", c: s => has(s, "사진/수박") },
      { t: "<em>모음</em> 폴더를 더블클릭해서 공룡이 들어 있는지 확인해요.", c: s => s.at("다운로드/모음") }
    ] }) };
const w6tSetup = s => { base(s); s.clear("다운로드"); s.put("다운로드", ["피자.jpg", "자동차.jpg", "눈사람.jpg", "신나는 노래.mp3", "자장가.mp3", "받아쓰기.txt", "알림장.txt"]); };
ACTS["w6-try"] = { name: "혼자 해보기: 다운로드 정리", icon: "🧹", type: "challenge", mins: 6, desc: "뒤죽박죽 다운로드 폴더를 깨끗이 정리해요.",
  run: ctx => runSim(ctx, { title: "다운로드 정리", setup: w6tSetup, intro: "다운로드 폴더가 뒤죽박죽이에요. 파일을 알맞은 폴더로 <b>옮겨서</b> 다운로드를 비워 주세요.", finish: "다운로드 폴더가 깨끗해졌어요!",
    goals: [
      { t: "사진 3장(피자, 자동차, 눈사람) → <b>사진</b> 폴더", h: "Ctrl을 누른 채 3장을 골라 한 번에 Ctrl + X 해도 돼요.", live: true, c: s => ["피자", "자동차", "눈사람"].every(n => has(s, "사진/" + n)) },
      { t: "노래 2곡 → <b>음악</b> 폴더", h: "끌어서 왼쪽 탐색 창의 음악 위에 놓아도 돼요.", live: true, c: s => ["신나는 노래", "자장가"].every(n => has(s, "음악/" + n)) },
      { t: "글 2개(받아쓰기, 알림장) → <b>문서</b> 폴더", h: "잘라내기 → 문서 폴더에서 붙여넣기.", live: true, c: s => ["받아쓰기", "알림장"].every(n => has(s, "문서/" + n)) },
      { t: "<b>다운로드</b> 폴더를 텅 비우기", h: "복사가 아니라 잘라내기를 해야 다운로드에서 없어져요.", live: true, c: s => s.names("다운로드").length === 0 }
    ] }) };

/* ================= 7차시 지우기와 휴지통 ================= */
ACTS["w7-learn"] = { name: "휴지통 알아보기", icon: "💡", type: "guide", mins: 5, desc: "지운 파일은 어디로 갈까요? 휴지통을 알아봐요.",
  run: ctx => slides(ctx, [
    { title: "지운 파일은 휴지통으로", text: "<p>파일을 지우면 바로 사라지지 않고 <b>휴지통</b>에 들어가요.</p><p>실수로 지웠다면 휴지통에서 <b>복원</b>해서 제자리로 돌려놓을 수 있어요.</p><p class='warn'>하지만 <b>휴지통 비우기</b>를 하면 영영 사라져요!</p>", art: ART.bin },
    { title: "지우는 방법 3가지", text: "<ol><li>고르고 키보드 <b>Delete</b></li><li><b>오른쪽 클릭</b> → 삭제</li><li>끌어서 <b>휴지통 위에</b> 놓기</li></ol><p>진짜 키보드의 <b>Delete</b> 키를 눌러 보세요. 키보드 오른쪽 위에 있어요. (Del이라고 쓰인 키보드도 있어요.)</p>", art: ART.keys(["Delete"]), need: ["del"], needLine: "👉 해 볼 것: <b>키보드의 Delete</b>", init: keyNeed(["Delete"], "del") },
    { title: "앗, 실수했을 때는 Ctrl + Z", text: "<p>방금 한 일을 <b>되돌리는</b> 마법 키예요.</p><p>지우기, 옮기기, 이름 바꾸기를 잘못했을 때 바로 <b>Ctrl + Z</b>!</p><p>Ctrl을 누른 채 Z를 눌러 보세요.</p>", art: ART.keys(["Ctrl", "Z"], "Z는 X의 바로 왼쪽"), need: ["cz"], needLine: "👉 해 볼 것: <b>키보드의 Ctrl + Z</b>", init: keyNeed(["Ctrl", "Z"], "cz") }
  ], "지우기와 휴지통을 알았어요!") };
const w7Setup = s => { base(s); s.put("바탕 화면", ["낙서1.txt", "낙서2.txt", "낙서3.txt", "중요한 숙제.txt"]); };
ACTS["w7-do"] = { name: "지우기 따라 하기", icon: "👆", type: "sim", mins: 9, desc: "파일을 지우고, 휴지통에서 되살리고, 비워요.",
  run: ctx => runSim(ctx, { title: "지우기와 휴지통", setup: w7Setup, finish: "지우기, 되살리기, 비우기를 모두 해냈어요!",
    tasks: [
      { t: "바탕 화면의 <em>낙서1</em>을 클릭하고 키보드 <em>Delete</em> 키를 눌러요.", c: (s, e) => e.type === "delete" && e.via === "key" && s.inBin("낙서1") },
      { t: "<em>낙서2</em>를 오른쪽 클릭 → <em>삭제</em>.", c: (s, e) => e.type === "delete" && e.via === "menu" && s.inBin("낙서2") },
      { t: "<em>낙서3</em>을 누른 채 끌어서 <em>휴지통</em> 위에 놓아요.", h: "휴지통이 파랗게 되었을 때 손을 떼요.", c: (s, e) => e.type === "delete" && e.via === "drag" && s.inBin("낙서3") },
      { t: "휴지통 아이콘에 숫자가 생겼죠? 이번엔 <em>중요한 숙제</em>를 Delete로 지운 다음, 바로 <em>Ctrl + Z</em>를 눌러 되돌려요.", h: "지우고 나서 Ctrl을 누른 채 Z!", c: (s, e) => e.type === "undo" && e.what === "delete" && has(s, "바탕 화면/중요한 숙제") },
      { t: "<em>휴지통</em>을 더블클릭해서 열어요. 지운 낙서들이 들어 있어요.", c: s => s.at("BIN") },
      { t: "<em>낙서2</em>를 오른쪽 클릭 → <em>복원</em>. 바탕 화면으로 돌아가요.", c: s => has(s, "바탕 화면/낙서2") },
      { t: "휴지통 창 위쪽의 <em>휴지통 비우기</em> 단추를 눌러요. 남은 낙서는 영영 사라져요.", c: (s, e) => e.type === "emptyBin" },
      { t: "휴지통 창을 닫고, 바탕 화면에 <em>낙서2</em>가 돌아왔는지 확인해요.", c: s => s.count("explorer") === 0 && has(s, "바탕 화면/낙서2") }
    ] }) };
const w7tSetup = s => { base(s); s.put("문서", ["연습1.txt", "연습2.txt", "연습3.txt"]); const n = s.node("문서/숙제/일기"); n.from = n.parent; n.parent = "BIN"; };
ACTS["w7-try"] = { name: "혼자 해보기: 청소 당번", icon: "🧽", type: "challenge", mins: 5, desc: "필요 없는 파일은 지우고, 실수로 지운 파일은 되살려요.",
  run: ctx => runSim(ctx, { title: "청소 당번", setup: w7tSetup, intro: "문서 폴더를 청소해요. 그런데 누가 <b>일기</b>를 실수로 지웠대요!", finish: "청소 끝! 일기도 구했어요.",
    goals: [
      { t: "문서 폴더의 <b>연습1, 연습2, 연습3</b> 지우기", h: "Ctrl을 누른 채 셋을 골라 Delete를 누르면 한 번에 지워져요.", live: true, c: s => ["연습1", "연습2", "연습3"].every(n => !has(s, "문서/" + n)) },
      { t: "휴지통에서 <b>일기</b> 복원하기", h: "휴지통을 열고 일기를 오른쪽 클릭 → 복원.", live: true, c: s => has(s, "문서/숙제/일기") },
      { t: "<b>휴지통 비우기</b>로 휴지통을 텅 비우기", h: "일기를 먼저 복원한 다음에 비워야 해요!", live: true, c: s => s.binItems().length === 0 && !!s.flags.emptied }
    ] }) };

/* ================= 8차시 여러 개 고르기와 대청소 ================= */
const GRID = [["🐶", "강아지"], ["🐱", "고양이"], ["🌸", "꽃"], ["🌈", "무지개"], ["🌊", "바다"], ["⛰️", "산"], ["🐰", "토끼"], ["☁️", "하늘"]];
ACTS["w8-learn"] = { name: "여러 개 고르기 알아보기", icon: "💡", type: "guide", mins: 6, desc: "Ctrl, Shift로 여러 파일을 한 번에 골라요.",
  run: ctx => slides(ctx, [
    { title: "Ctrl + 클릭: 골라 담기", text: "<p><b>Ctrl을 누른 채</b> 클릭하면 하나씩 골라 담을 수 있어요.</p><p>잘못 고른 것은 Ctrl을 누른 채 한 번 더 클릭하면 빠져요.</p><p>옆 그림에서 Ctrl을 누른 채 <b>동물 3마리</b>를 골라 보세요.</p>", art: ART.grid(GRID), need: ["grid"], needLine: "👉 해 볼 것: <b>Ctrl + 클릭으로 동물 3마리</b>", init: gridInit(on => on.length === 3 && ["강아지", "고양이", "토끼"].every(n => on.includes(n)) ? "동물 3마리를 골랐어요!" : "") },
    { title: "Shift + 클릭: 처음부터 끝까지", text: "<p>하나를 클릭하고, <b>Shift를 누른 채</b> 다른 것을 클릭하면 <b>그 사이가 모두</b> 골라져요.</p><p><b>꽃</b>을 클릭하고 Shift를 누른 채 <b>산</b>을 클릭해 보세요.</p>", art: ART.grid(GRID), need: ["grid"], needLine: "👉 해 볼 것: <b>꽃 → Shift + 산</b>", init: gridInit((on, e) => e.shiftKey && on.join() === "꽃,무지개,바다,산" ? "꽃부터 산까지 4개가 한 번에 골라졌어요!" : "") },
    { title: "모두 고르기와 네모 그리기", text: "<ul><li><b>Ctrl + A</b>: 폴더 안의 모든 것을 한 번에 골라요. (A는 All, 모두)</li><li>빈 곳에서 마우스를 <b>누른 채 끌면</b> 파란 네모가 생기고, 네모 안의 것이 골라져요.</li><li>빈 곳을 클릭하면 고른 것이 풀려요.</li></ul><p>진짜 키보드로 Ctrl + A를 눌러 보세요.</p>", art: ART.keys(["Ctrl", "A"]), need: ["ca"], needLine: "👉 해 볼 것: <b>키보드의 Ctrl + A</b>", init: keyNeed(["Ctrl", "A"], "ca") }
  ], "여러 개를 한 번에 고르는 방법을 알았어요!") };
const w8Setup = s => { base(s); s.put("사진", ["산.jpg", "무지개.jpg"]); s.clear("사진/동물"); s.openExplorer("PICS"); };
ACTS["w8-do"] = { name: "여러 개 고르기 따라 하기", icon: "👆", type: "sim", mins: 9, desc: "Ctrl, Shift, Ctrl+A, 네모 그리기로 여러 파일을 골라요.",
  run: ctx => runSim(ctx, { title: "여러 개 고르기", setup: w8Setup, finish: "여러 파일을 한 번에 다룰 수 있어요!",
    tasks: [
      { t: "<em>Ctrl</em>을 누른 채 <em>강아지</em>, <em>고양이</em>, <em>토끼</em>를 하나씩 클릭해요.", h: "Ctrl에서 손을 떼지 말고 세 번 클릭!", c: s => { const n = s.selNames(); return n.length === 3 && ["강아지", "고양이", "토끼"].every(x => n.includes(x)); } },
      { t: "고른 3장을 <em>Ctrl + C</em>로 복사하고, <em>동물</em> 폴더에 들어가 <em>Ctrl + V</em>.", c: s => ["강아지", "고양이", "토끼"].every(n => has(s, "사진/동물/" + n)) },
      { t: "<em>← 뒤로</em>를 눌러 사진 폴더로 돌아와요.", c: s => s.at("사진") },
      { t: "<em>꽃</em>을 클릭하고, <em>Shift</em>를 누른 채 <em>하늘</em>을 클릭해요. 그 사이가 모두 골라져요.", c: (s, e) => e.type === "select" && e.via === "shift" && e.names.includes("꽃") && e.names.includes("하늘") && e.names.length >= 3 },
      { t: "빈 곳을 클릭해서 고른 것을 풀어요.", c: (s, e) => e.type === "select" && e.via === "clear" },
      { t: "<em>Ctrl + A</em>로 모두 골라요.", c: (s, e) => e.type === "select" && e.via === "all" && e.names.length >= 8 },
      { t: "다시 빈 곳을 클릭해서 풀고, 빈 곳에서 마우스를 <em>누른 채 끌어</em> 네모를 그려서 2개 이상 골라요.", h: "아이콘이 없는 곳에서 시작해서 아이콘 위로 끌어요.", c: (s, e) => e.type === "marquee" && e.count >= 2 },
      { t: "<em>Ctrl</em>을 누른 채 골라진 것 하나를 클릭해서 <em>빼 보세요</em>.", c: (s, e) => e.type === "select" && e.via === "ctrl" && e.removed }
    ] }) };
const w8tSetup = s => { base(s); s.put("바탕 화면", ["공룡.jpg", "로켓.jpg", "피자.jpg", "우주.jpg", "신나는 노래.mp3", "자장가.mp3", "받아쓰기.txt", "알림장.txt", "쓰레기1.txt", "쓰레기2.txt"]); };
ACTS["w8-try"] = { name: "종합 미션: 바탕 화면 대청소", icon: "🏆", type: "challenge", mins: 8, desc: "지금까지 배운 것을 모두 써서 바탕 화면을 정리해요.",
  run: ctx => runSim(ctx, { title: "바탕 화면 대청소", setup: w8tSetup, intro: "바탕 화면이 엉망이에요! 폴더를 만들어 정리하고, 쓰레기는 휴지통으로.", finish: "바탕 화면이 반짝반짝해졌어요!",
    goals: [
      { t: "바탕 화면에 <b>사진 모음, 노래 모음, 글 모음</b> 폴더 만들기", h: "바탕 화면 빈 곳 오른쪽 클릭 → 새로 만들기 → 폴더.", live: true, c: s => ["사진 모음", "노래 모음", "글 모음"].every(n => has(s, "바탕 화면/" + n)) },
      { t: "사진 4장 → <b>사진 모음</b>", h: "Ctrl로 4장을 골라 한꺼번에 끌어서 폴더 위에 놓아요.", live: true, c: s => ["공룡", "로켓", "피자", "우주"].every(n => has(s, "바탕 화면/사진 모음/" + n)) },
      { t: "노래 2곡 → <b>노래 모음</b>", h: "끌어서 옮기거나 Ctrl + X, Ctrl + V.", live: true, c: s => ["신나는 노래", "자장가"].every(n => has(s, "바탕 화면/노래 모음/" + n)) },
      { t: "글 2개(받아쓰기, 알림장) → <b>글 모음</b>", h: "쓰레기는 빼고 받아쓰기, 알림장만!", live: true, c: s => ["받아쓰기", "알림장"].every(n => has(s, "바탕 화면/글 모음/" + n)) },
      { t: "<b>쓰레기1, 쓰레기2</b>는 휴지통으로", h: "끌어서 휴지통 위에 놓거나 Delete.", live: true, c: s => s.inBin("쓰레기1") && s.inBin("쓰레기2") },
      { t: "바탕 화면에 <b>폴더 3개만</b> 남기기", h: "바탕 화면에 다른 파일이 남아 있는지 살펴봐요.", live: true, c: s => { const k = s.kids("DESK"); return k.length === 3 && k.every(n => n.type === "folder"); } }
    ] }) };

/* ================= 9차시 메모장 글자 복사와 저장 ================= */
ACTS["w9-learn"] = { name: "글자 복사 알아보기", icon: "💡", type: "guide", mins: 6, desc: "글자도 복사·잘라내기·붙여넣기를 할 수 있어요.",
  run: ctx => slides(ctx, [
    { title: "글자 고르기", text: "<ul><li>글자 위를 <b>누른 채 끌면</b> 파랗게 칠해져요.</li><li>낱말을 <b>더블클릭</b>하면 그 낱말만 골라져요.</li></ul><p>옆 글에서 <b>포도</b>를 더블클릭해 보세요.</p>", art: ART.practice("사과 바나나 포도 수박"), need: ["sel"], needLine: "👉 해 볼 것: <b>포도를 더블클릭</b>", init: practiceInit(ta => ta.value.slice(ta.selectionStart, ta.selectionEnd).trim() === "포도" ? "포도를 골랐어요!" : "", "sel") },
    { title: "글자도 Ctrl + C, Ctrl + V", text: "<p>파일처럼 글자도 똑같은 단축키를 써요.</p><ul><li><b>Ctrl + C</b> 복사</li><li><b>Ctrl + X</b> 잘라내기</li><li><b>Ctrl + V</b> 붙여넣기</li></ul><p><b>사과</b>를 골라 Ctrl + C, 글 끝을 클릭하고 Ctrl + V 해 보세요.</p>", art: ART.practice("사과 바나나 포도\n"), need: ["cp"], needLine: "👉 해 볼 것: <b>사과를 복사해서 붙여넣기</b>", init: practiceInit(ta => (ta.value.match(/사과/g) || []).length >= 2 ? "사과가 2개가 됐어요!" : "", "cp") },
    { title: "저장하기", text: "<p>쓴 글은 <b>저장</b>해야 파일로 남아요. 저장하지 않고 닫으면 사라져요!</p><ul><li><b>Ctrl + S</b> 또는 <b>파일 → 저장</b></li><li>처음 저장할 때는 <b>어디에</b>, <b>무슨 이름</b>으로 저장할지 정하는 창이 나와요.</li></ul>", art: ART.saveDlg }
  ], "글자 복사와 저장 방법을 알았어요!") };
const w9Setup = s => { base(s); s.put("문서", ["연습.txt"]); s.text("문서/연습", "사과 바나나 포도\n"); s.openWin("notepad", { file: s.node("문서/연습").id }); };
const val = s => { const w = winOf(s, "notepad"); return w ? w.ta.value : ""; };
ACTS["w9-do"] = { name: "메모장 따라 하기", icon: "👆", type: "sim", mins: 10, desc: "메모장에서 글자를 복사하고 잘라내고 저장해요.",
  run: ctx => runSim(ctx, { title: "글자 복사와 저장", setup: w9Setup, finish: "글자를 복사하고 저장할 수 있어요!",
    tasks: [
      { t: "메모장의 글 맨 끝을 클릭하고, 둘째 줄에 <em>내 이름</em>을 써요.", h: "글이 끝난 아래 줄을 클릭하면 커서가 깜빡여요. 그리고 이름을 써요.", c: s => val(s).split("\n").filter(l => l.trim()).length >= 2 },
      { t: "첫 줄의 <em>바나나</em>를 <em>더블클릭</em>해서 골라요.", c: (s, e) => e.type === "textSelect" && e.text.trim() === "바나나" },
      { t: "<em>Ctrl + C</em>로 복사해요.", c: (s, e) => e.type === "textCopy" && e.text.trim() === "바나나" },
      { t: "내 이름 뒤를 클릭하고 <em>Enter</em>, 그리고 <em>Ctrl + V</em>로 붙여넣어요.", c: s => (val(s).match(/바나나/g) || []).length >= 2 },
      { t: "첫 줄 <em>사과 바나나 포도</em>를 처음부터 끝까지 <em>끌어서</em> 골라요.", h: "'사과' 앞에서 마우스를 누르고 '포도' 끝까지 끌어요.", c: (s, e) => e.type === "textSelect" && e.text.trim() === "사과 바나나 포도" },
      { t: "<em>Ctrl + X</em>로 잘라내요. 첫 줄 글자가 사라졌죠?", c: (s, e) => e.type === "textCut" && !val(s).startsWith("사과 바나나 포도") },
      { t: "글 맨 아래로 가서 <em>Enter</em>를 누르고 <em>Ctrl + V</em>로 붙여넣어요.", c: s => /사과 바나나 포도\s*$/.test(val(s)) || val(s).trim().split("\n").pop().trim() === "사과 바나나 포도" },
      { t: "<em>Ctrl + S</em>를 눌러 저장해요. 제목 앞의 * 표시가 사라져요.", h: "* 표시는 '아직 저장 안 했어요'라는 뜻이에요.", c: (s, e) => e.type === "save" },
      { t: "메모장을 <em>✕</em>로 닫아요.", c: s => s.count("notepad") === 0 },
      { t: "파일 탐색기 → 문서 → <em>연습</em>을 더블클릭해서 다시 열어 봐요. 바꾼 글이 그대로 있죠?", c: (s, e) => e.type === "open" && e.name === "연습" }
    ] }) };
ACTS["w9-try"] = { name: "혼자 해보기: 좋아하는 음식", icon: "🍕", type: "challenge", mins: 7, desc: "새 메모장에 글을 쓰고 복사해서 바탕 화면에 저장해요.",
  run: ctx => runSim(ctx, { title: "좋아하는 음식", setup: base, intro: "새 메모장에 글을 쓰고 <b>음식</b>이라는 이름으로 <b>바탕 화면</b>에 저장해요.", finish: "글을 쓰고 저장까지 혼자 해냈어요!",
    goals: [
      { t: "시작 메뉴에서 <b>메모장</b> 열기", h: "시작 단추 → 메모장.", c: s => s.count("notepad") > 0 },
      { t: "좋아하는 음식을 <b>3줄</b> 쓰기", h: "음식 하나 쓰고 Enter, 또 하나 쓰고 Enter.", c: s => val(s).split("\n").filter(l => l.trim()).length >= 3 },
      { t: "첫 줄을 복사해서 <b>맨 아래</b>에 붙여넣기", h: "첫 줄을 끌어서 고르고 Ctrl + C, 맨 아래에서 Ctrl + V.", c: s => { const l = val(s).split("\n").map(x => x.trim()).filter(Boolean); return l.length >= 4 && l[0] === l[l.length - 1]; } },
      { t: "<b>바탕 화면</b>에 <b>음식</b>이라는 이름으로 저장하기", h: "Ctrl + S → 왼쪽에서 바탕 화면 → 파일 이름에 음식 → 저장.", c: (s, e) => e.type === "save" && e.name === "음식" && e.path === "바탕 화면" }
    ] }) };

window.WL = { runTour, runSim, base };
window.WIN = {
  id: "win", name: "2단계 · 윈도우 기초", ver: "연습 화면",
  lessons: [
    { id: "W1", title: "바탕 화면과 시작 메뉴", goal: "바탕 화면, 작업 표시줄, 시작 메뉴의 이름을 알고 프로그램을 열고 닫아요.", acts: ["w1-tour", "w1-start", "w1-do", "w1-try"] },
    { id: "W2", title: "창 다루기", goal: "창을 키우고, 숨기고, 옮기고, 크기를 바꿔요.", acts: ["w2-tour", "w2-do", "w2-try"] },
    { id: "W3", title: "파일 탐색기 알아보기", goal: "폴더와 파일을 구별하고, 탐색기에서 원하는 폴더를 찾아가요.", acts: ["w3-tour", "w-kind", "w3-do", "w3-try"] },
    { id: "W4", title: "폴더 만들기와 이름 바꾸기", goal: "새 폴더를 만들고 이름을 짓고 바꿔요.", acts: ["w4-learn", "w4-do", "w4-try"] },
    { id: "W5", title: "복사하고 붙여넣기", goal: "파일을 복사해서 다른 폴더에 붙여넣어요. 방법 3가지를 모두 써요.", acts: ["w5-learn", "w5-do", "w5-try"] },
    { id: "W6", title: "잘라내기와 옮기기", goal: "잘라내기와 끌어서 놓기로 파일을 옮겨요. 복사와의 차이를 알아요.", acts: ["w6-learn", "w6-do", "w6-try"] },
    { id: "W7", title: "지우기와 휴지통", goal: "파일을 지우고, 휴지통에서 되살리고, 실수는 Ctrl + Z로 되돌려요.", acts: ["w7-learn", "w7-do", "w7-try"] },
    { id: "W8", title: "여러 개 고르기와 대청소", goal: "Ctrl, Shift로 여러 파일을 골라 한 번에 정리해요.", acts: ["w8-learn", "w8-do", "w8-try"] },
    { id: "W9", title: "메모장 글자 복사와 저장", goal: "글자를 고르고 복사·잘라내기·붙여넣기를 하고 파일로 저장해요.", acts: ["w9-learn", "w9-do", "w9-try"] }
  ]
};
})();
