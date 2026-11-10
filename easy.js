// 1단계 · 윈도우 첫걸음 (1학년용): 소리로 읽어 주기, 눌러야 할 곳 반짝 표시, 짧은 글
(function () {
const { el, shuffle, rand } = window.UI;
const ACTS = window.ACTS, WinSim = window.WinSim, base = window.WL.base;

/* ================= 소리 ================= */
const TTS = { ok: "speechSynthesis" in window, voice: null };
function pickVoice() { try { const vs = speechSynthesis.getVoices(); TTS.voice = vs.find(v => /^ko/i.test(v.lang)) || null; } catch (e) {} }
if (TTS.ok) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
function say(text) {
  if (!TTS.ok || !text) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(String(text).replace(/<[^>]+>/g, "").replace(/[✕▢❐—]/g, ""));
    u.lang = "ko-KR"; if (TTS.voice) u.voice = TTS.voice; u.rate = 0.92; u.pitch = 1.05;
    speechSynthesis.speak(u);
  } catch (e) {}
}
window.SAY = say;
const hush = () => { try { TTS.ok && speechSynthesis.cancel(); } catch (e) {} };

/* ================= 화면 속 찾기 도우미 ================= */
const q = (s, sel) => s.root.querySelector(sel);
const byName = name => `.it[title^="${name} ·"], .it[title="${name}"]`;
const desk = name => s => name === "휴지통" ? q(s, '.ws-desk .it[data-id="BIN"]') : q(s, ".ws-desk " + byName(name).split(", ").join(", .ws-desk "));
const topOf = (s, kind) => { let t = null; s.wins.forEach(w => { if (!w.min && (!kind || w.kind === kind) && (!t || w.z > t.z)) t = w; }); return t; };
const inWin = (kind, sel) => s => { const w = topOf(s, kind); return w ? w.el.querySelector(sel) : null; };
const file = name => s => { const w = topOf(s, "explorer"); return w ? w.el.querySelector(".w-files " + byName(name).split(", ").join(", .w-files ")) : null; };
const winBtn = (b, kind) => s => { const w = topOf(s, kind); return w ? w.el.querySelector(`[data-b="${b}"]`) : null; };
const startBtn = s => q(s, ".bar-start");
const app = name => s => s.start.hidden ? q(s, ".bar-start") : q(s, `[data-app="${name}"]`);
const key = k => inWin("calc", `.calc-keys [data-c="${k}"]`);
const menuRow = text => s => { const m = q(s, ".ws-ctx"); if (!m || m.hidden) return null; return [...m.querySelectorAll(".mrow")].find(r => r.textContent.includes(text)) || null; };
// 폴더 길 따라가기: ["숨은 보물", "깊은 곳", "왕관"]
const pathTo = parts => s => {
  const w = topOf(s, "explorer");
  if (!w) return desk(parts[0])(s);
  const here = s.pathStr(w.folder).split("/");
  if (here[0] !== "바탕 화면") return w.el.querySelector('.w-nav [data-f="DESK"]');
  const depth = here.length - 1;
  for (let k = 0; k < depth; k++) if (here[k + 1] !== parts[k]) return w.el.querySelector('[data-n="back"]') || w.el.querySelector('.w-nav [data-f="DESK"]');
  const next = parts[depth];
  return next ? file(next)(s) : null;
};

/* ================= 따라 하기 (쉬운 버전) ================= */
function runEasy(ctx, spec) {
  const wrap = el("div", "simwrap ez");
  wrap.innerHTML = `<aside class="task ez-task"></aside><div class="simhost"></div>`;
  ctx.arena.append(wrap);
  const task = wrap.querySelector(".task"), host = wrap.querySelector(".simhost");
  let ready = false, idx = 0, busy = false, done = false, t0 = Date.now(), lastSay = 0;
  const sim = new WinSim(host, { setup: spec.setup, onEvent: (ev, s) => { if (ready) check(ev, s); } });
  sim.root.classList.add("big");
  ctx.cleanup(() => { sim.destroy(); hush(); });
  ready = true;
  const layer = el("div", "ez-layer"); host.append(layer);
  const delay = spec.ringDelay || 0;
  const T = () => spec.tasks[idx];
  function draw() {
    const t = T(), n = spec.tasks.length;
    task.innerHTML = `<div class="tk-h"><span>${spec.title}</span><b>${idx + 1} / ${n}</b></div>
      <div class="tk-dots">${spec.tasks.map((_, i) => `<span class="${i < idx ? "on" : i === idx ? "cur" : ""}"></span>`).join("")}</div>
      <div class="ez-ic">${t.ic || "👆"}</div>
      <p class="ez-t">${t.t}</p>
      <button type="button" class="ez-say">🔊 다시 듣기</button>
      ${t.ack ? `<button type="button" class="primary ez-ack">알겠어요 ▶</button>` : ""}
      <div class="tk-ok" hidden>✔ 잘했어요!</div>
      <div class="tk-foot"><button type="button" class="ghost" data-a="restart">↺ 처음부터</button></div>`;
    task.querySelector(".ez-say").onclick = () => { say(t.say || t.t); lastSay = Date.now(); };
    const ab = task.querySelector(".ez-ack"); if (ab) ab.onclick = pass;
    task.querySelector('[data-a="restart"]').onclick = () => ctx.restart();
    t0 = Date.now(); lastSay = Date.now();
    say(t.say || t.t);
    ctx.hud(`${spec.title} · 🔊 소리를 듣고, 반짝이는 곳을 눌러요`);
    ring();
  }
  function targets() {
    const t = T(); if (!t || !t.at) return [];
    let r = []; try { r = t.at(sim); } catch (e) { r = []; }
    return (Array.isArray(r) ? r : [r]).filter(Boolean);
  }
  function ring() {
    if (done) { layer.innerHTML = ""; return; }
    const show = Date.now() - t0 >= delay;
    const H = host.getBoundingClientRect();
    const els = show ? targets() : [];
    layer.innerHTML = els.map((e, k) => {
      const r = e.getBoundingClientRect();
      if (!r.width || !r.height) return "";
      const nudge = Date.now() - t0 > delay + 15000 ? " nudge" : "";
      return `<div class="ez-ring${k ? " to" : ""}${nudge}" style="left:${r.left - H.left - 5}px;top:${r.top - H.top - 5}px;width:${r.width + 10}px;height:${r.height + 10}px"></div>${k === 0 ? `<div class="ez-hand" style="left:${r.left - H.left + r.width / 2 - 6}px;top:${r.top - H.top + r.height - 4}px">👆</div>` : ""}`;
    }).join("");
    if (Date.now() - lastSay > (delay ? delay + 15000 : 15000) && !busy) { const t = T(); say(t.say || t.t); lastSay = Date.now(); }
  }
  ctx.every(ring, 250);
  function pass() {
    if (busy) return;
    busy = true;
    task.querySelector(".tk-ok").hidden = false; task.classList.add("good");
    say(["잘했어요!", "좋아요!", "맞아요!", "최고예요!"][idx % 4]);
    layer.innerHTML = "";
    setTimeout(() => {
      task.classList.remove("good"); busy = false; idx++;
      if (idx >= spec.tasks.length) { done = true; say("다 했어요! 최고예요!"); ctx.done(3, spec.finish); }
      else draw();
    }, 1100);
  }
  function check(ev, s) {
    if (done || busy) return;
    const t = T(); if (t.ack) return;
    let ok = false; try { ok = t.c(s, ev); } catch (e) { ok = false; }
    if (ok) pass();
  }
  draw();
}

/* ================= 찾아 누르기 퀴즈 ================= */
function runFind(ctx, spec) {
  const wrap = el("div", "simwrap ez");
  wrap.innerHTML = `<aside class="task ez-task"></aside><div class="simhost"></div>`;
  ctx.arena.append(wrap);
  const task = wrap.querySelector(".task"), host = wrap.querySelector(".simhost");
  const sim = new WinSim(host, { setup: spec.setup });
  sim.root.classList.add("big");
  if (spec.prep) spec.prep(sim);
  ctx.cleanup(() => { sim.destroy(); hush(); });
  const layer = el("div", "ez-layer"); host.append(layer);
  const qs = shuffle(spec.items);
  let i = 0, wrong = 0, total = 0, lock = false;
  function draw() {
    const it = qs[i]; wrong = 0; layer.innerHTML = "";
    task.innerHTML = `<div class="tk-h"><span>찾아 누르기</span><b>${i + 1} / ${qs.length}</b></div>
      <div class="tk-dots">${qs.map((_, k) => `<span class="${k < i ? "on" : k === i ? "cur" : ""}"></span>`).join("")}</div>
      <div class="ez-ic">${it.ic}</div><p class="ez-t">${it.t}</p>
      <button type="button" class="ez-say">🔊 다시 듣기</button><div class="tk-ok" hidden>✔ 맞아요!</div><p class="ez-no" hidden></p>`;
    task.querySelector(".ez-say").onclick = () => say(it.say || it.t);
    say(it.say || it.t);
    ctx.hud(`🔊 소리를 듣고 화면에서 찾아 한 번 눌러요 · 맞힌 것 <b>${i}</b> / ${qs.length}`);
  }
  const block = e => { e.preventDefault(); e.stopPropagation(); };
  const onDown = e => {
    block(e);
    if (lock || e.button !== 0) return;
    const it = qs[i], target = it.at(sim);
    if (target && (target === e.target || target.contains(e.target))) {
      lock = true;
      task.querySelector(".tk-ok").hidden = false; task.classList.add("good");
      say(["맞아요!", "잘 찾았어요!", "최고예요!"][i % 3]);
      const H = host.getBoundingClientRect(), r = target.getBoundingClientRect();
      layer.innerHTML = `<div class="ez-ring ok" style="left:${r.left - H.left - 5}px;top:${r.top - H.top - 5}px;width:${r.width + 10}px;height:${r.height + 10}px"></div>`;
      setTimeout(() => {
        task.classList.remove("good"); lock = false; i++;
        if (i >= qs.length) { say("다 찾았어요!"); ctx.done(3, `${qs.length}개를 모두 찾았어요!`); }
        else draw();
      }, 1100);
    } else {
      wrong++; total++;
      const no = task.querySelector(".ez-no"); no.hidden = false; no.textContent = "다시 찾아봐요!";
      say(wrong >= 2 ? "반짝이는 곳을 눌러요" : "다시 찾아봐요");
      if (wrong >= 2 && target) {
        const H = host.getBoundingClientRect(), r = target.getBoundingClientRect();
        layer.innerHTML = `<div class="ez-ring" style="left:${r.left - H.left - 5}px;top:${r.top - H.top - 5}px;width:${r.width + 10}px;height:${r.height + 10}px"></div><div class="ez-hand" style="left:${r.left - H.left + r.width / 2 - 6}px;top:${r.top - H.top + r.height - 4}px">👆</div>`;
      }
      if (total >= 15) ctx.fail("막 누르면 안 돼요! 소리를 잘 듣고 다시 해 봐요.");
    }
  };
  ["pointerdown", "mousedown", "click", "dblclick", "contextmenu", "pointerup"].forEach(t => sim.root.addEventListener(t, t === "pointerdown" ? onDown : block, true));
  draw();
}

/* ================= 게임: 창 닫기 놀이 ================= */
ACTS["ez-close"] = { name: "창 닫기 놀이", icon: "❎", type: "game", noLevel: true, mins: 4,
  desc: "창이 뿅 나타나면 오른쪽 위 빨간 ✕를 눌러서 닫아요.",
  run(ctx) {
    const N = 12, a = ctx.arena, pics = shuffle(["🐶", "🐱", "🐰", "🦁", "🐼", "🐸", "🍎", "🍌", "🚗", "🚀", "⚽", "🌈", "🎈", "🍦"]);
    let closed = 0, miss = 0, shown = 0;
    a.classList.add("ez-desk");
    const upd = () => ctx.hud(`닫은 창 <b>${closed}</b> / ${N}`);
    say("창이 나오면 빨간 엑스를 눌러서 닫아요");
    function spawn() {
      if (shown >= N) return;
      shown++;
      const W = a.clientWidth, H = a.clientHeight, w = Math.min(320, W * .6), h = 220;
      const d = el("div", "fw");
      d.style.left = rand(10, Math.max(11, W - w - 10)) + "px"; d.style.top = rand(10, Math.max(11, H - h - 10)) + "px"; d.style.width = w + "px";
      d.innerHTML = `<div class="fw-t"><span>${pics[shown % pics.length]} 창</span><div class="fw-b"><button type="button" data-k="min">—</button><button type="button" data-k="max">▢</button><button type="button" data-k="x" class="x">✕</button></div></div><div class="fw-body">${pics[shown % pics.length]}</div>`;
      a.append(d);
      d.addEventListener("click", e => {
        const b = e.target.closest("button");
        if (b && b.dataset.k === "x") {
          d.classList.add("bye"); setTimeout(() => d.remove(), 200); closed++; upd();
          if (closed >= N) { say("모두 닫았어요!"); ctx.done(3, `창 ${N}개를 모두 닫았어요!`); return; }
          if (!a.querySelector(".fw:not(.bye)")) spawn();
        } else {
          miss++; d.classList.remove("shake"); void d.offsetWidth; d.classList.add("shake");
          if (miss % 3 === 1) say("빨간 엑스를 눌러요");
          if (miss >= 12) ctx.fail("막 누르면 안 돼요! 빨간 ✕를 잘 보고 다시 해 봐요.");
        }
      });
    }
    spawn();
    ctx.every(() => { if (shown < N && a.querySelectorAll(".fw:not(.bye)").length < 3) spawn(); }, 2600);
    upd();
  } };

/* ================= 게임: 폴더에 쏙 ================= */
ACTS["ez-sort"] = { name: "폴더에 쏙!", icon: "🗂️", type: "game", noLevel: true, mins: 5,
  desc: "그림을 꾹 누른 채 끌어서 같은 무리 폴더에 넣어요.",
  run(ctx) {
    const cats = [["과일", "🍎", ["🍎", "🍌", "🍇", "🍓"]], ["동물", "🐶", ["🐶", "🐱", "🐰", "🦁"]], ["탈것", "🚗", ["🚗", "🚂", "✈️", "🚀"]]];
    const a = ctx.arena; a.classList.add("ez-desk");
    const items = shuffle(cats.flatMap(c => c[2].slice(0, 3).map(e => ({ e, c: c[0] }))));
    let placed = 0, miss = 0;
    const row = el("div", "fs-folders");
    row.innerHTML = cats.map(c => `<div class="fs-f" data-c="${c[0]}"><div class="fs-ic">📁<span>${c[1]}</span></div><b>${c[0]}</b><i class="fs-n">0</i></div>`).join("");
    a.append(row);
    const upd = () => ctx.hud(`넣은 그림 <b>${placed}</b> / ${items.length}`);
    say("그림을 꾹 누른 채 끌어서 같은 폴더에 넣어요");
    requestAnimationFrame(() => {
      const W = a.clientWidth, top = 20, bottom = row.offsetTop - 110;
      const cols = Math.max(3, Math.min(items.length, Math.floor((W - 40) / 110)));
      items.forEach((it, k) => {
        const d = el("div", "fs-it", `<span>${it.e}</span>`);
        const ox = 20 + (k % cols) * ((W - 120) / Math.max(1, cols - 1)) + rand(-6, 6), oy = top + Math.floor(k / cols) * 110 + rand(-6, 6);
        d.style.left = Math.min(W - 100, ox) + "px"; d.style.top = Math.min(Math.max(top, bottom), oy) + "px";
        a.append(d);
        let dx = 0, dy = 0, drag = false;
        const sx = d.style.left, sy = d.style.top;
        d.addEventListener("pointerdown", e => { if (e.button) return; drag = true; d.setPointerCapture(e.pointerId); d.classList.add("hold"); const r = d.getBoundingClientRect(); dx = e.clientX - r.left; dy = e.clientY - r.top; });
        d.addEventListener("pointermove", e => {
          if (!drag) return; const r = a.getBoundingClientRect();
          d.style.left = e.clientX - r.left - dx + "px"; d.style.top = e.clientY - r.top - dy + "px";
          row.querySelectorAll(".fs-f").forEach(f => { const b = f.getBoundingClientRect(); f.classList.toggle("over", e.clientX > b.left && e.clientX < b.right && e.clientY > b.top && e.clientY < b.bottom); });
        });
        const up = e => {
          if (!drag) return; drag = false; d.classList.remove("hold");
          const f = [...row.querySelectorAll(".fs-f")].find(f => { const b = f.getBoundingClientRect(); return e.clientX > b.left && e.clientX < b.right && e.clientY > b.top && e.clientY < b.bottom; });
          row.querySelectorAll(".fs-f").forEach(x => x.classList.remove("over"));
          if (f && f.dataset.c === it.c) {
            d.remove(); placed++; const n = f.querySelector(".fs-n"); n.textContent = +n.textContent + 1;
            f.classList.remove("yum"); void f.offsetWidth; f.classList.add("yum"); upd(); say("쏙!");
            if (placed >= items.length) { say("다 넣었어요!"); ctx.done(3, "그림을 모두 알맞은 폴더에 넣었어요!"); }
          } else {
            d.style.left = sx; d.style.top = sy;
            if (f) { miss++; say("다른 폴더예요. 다시 해 봐요"); d.classList.remove("shake"); void d.offsetWidth; d.classList.add("shake"); if (miss >= 8) ctx.fail("막 넣으면 안 돼요! 그림을 잘 보고 다시 해 봐요."); }
          }
        };
        d.addEventListener("pointerup", up); d.addEventListener("pointercancel", up);
      });
      upd();
    });
  } };

/* ================= 처음 화면 ================= */
const ezDesk = s => { base(s); s.put("바탕 화면", ["동물/", "사과.jpg", "메모.txt"]); s.put("바탕 화면/동물", ["강아지.jpg", "고양이.jpg"]); s.text("바탕 화면/메모", "안녕하세요! 컴퓨터는 재미있어요."); };
const opened = name => (s, e) => e.type === "open" && e.name === name;
const none = kind => s => s.count(kind) === 0;

/* ===== 1차시 바탕 화면 친구들 ===== */
ACTS["e1-tour"] = { name: "바탕 화면 친구들", icon: "🖥️", type: "tour", mins: 5, desc: "번호를 누르면 이름을 소리로 알려 줘요.",
  run: ctx => window.WL.runTour(ctx, { voice: true, title: "바탕 화면 친구들", intro: "번호가 붙은 곳을 하나씩 눌러 봐요. 이름을 소리로 알려 줘요.", setup: ezDesk, finish: "바탕 화면 친구들을 모두 만났어요!",
    spots: [
      { sel: ".ws-desk", name: "바탕 화면", desc: "컴퓨터를 켜면 처음 보이는 넓은 화면이에요." },
      { sel: '.ws-desk .it[data-id="BIN"]', name: "휴지통", desc: "필요 없는 것을 버리는 쓰레기통이에요." },
      { sel: '.ws-desk .it.is-folder:not([data-id="BIN"])', name: "폴더", desc: "노란 상자예요. 안에 물건을 담아요." },
      { sel: ".ws-desk .it.thumb, .ws-desk .it .thumb", name: "사진", desc: "그림이 들어 있는 파일이에요." },
      { sel: ".bar-start", name: "시작 단추", desc: "파란 창문 모양 단추예요. 누르면 시작 메뉴가 나와요." },
      { sel: ".bar-clock", name: "시계", desc: "지금 몇 시인지 알려 줘요." }
    ] }) };
ACTS["e1-find"] = { name: "어디 있을까?", icon: "🔍", type: "guide", mins: 4, desc: "소리를 듣고 화면에서 찾아 눌러요.",
  run: ctx => runFind(ctx, { setup: ezDesk, items: [
    { ic: "🗑️", t: "<em>휴지통</em>은 어디 있을까요?", at: desk("휴지통") },
    { ic: "🪟", t: "<em>시작 단추</em>를 찾아요!", say: "파란 창문 모양 시작 단추를 찾아요", at: startBtn },
    { ic: "📁", t: "노란 <em>폴더</em>를 찾아요!", say: "노란 폴더를 찾아요", at: desk("동물") },
    { ic: "🍎", t: "<em>사과 사진</em>을 찾아요!", at: desk("사과") },
    { ic: "🕐", t: "<em>시계</em>를 찾아요!", at: s => q(s, ".bar-clock") },
    { ic: "📝", t: "<em>메모</em>를 찾아요!", say: "메모 파일을 찾아요", at: desk("메모") }
  ] }) };
ACTS["e1-do"] = { name: "한 번, 두 번 눌러요", icon: "👆", type: "sim", mins: 7, desc: "한 번 누르기와 두 번 누르기를 해 봐요.",
  run: ctx => runEasy(ctx, { title: "한 번, 두 번", setup: ezDesk, finish: "한 번, 두 번 누르기를 해냈어요!", tasks: [
    { ic: "🪟", t: "<em>시작 단추</em>를 눌러요", say: "파란 시작 단추를 눌러요", at: startBtn, c: (s, e) => e.type === "startOpen" },
    { ic: "🪟", t: "한 번 더 눌러서 <em>닫아요</em>", say: "시작 단추를 한 번 더 눌러서 닫아요", at: startBtn, c: (s, e) => e.type === "startClose" },
    { ic: "🗑️", t: "휴지통을 <em>한 번</em> 딸깍!", say: "휴지통을 한 번 딸깍 눌러요", at: desk("휴지통"), c: s => s.sel.ids.has("BIN") },
    { ic: "🗑️", t: "휴지통을 <em>두 번</em> 딸깍딸깍!", say: "이번엔 휴지통을 딸깍딸깍 두 번 빨리 눌러요", at: desk("휴지통"), c: s => s.at("BIN") },
    { ic: "❎", t: "빨간 <em>✕</em>를 눌러 닫아요", say: "오른쪽 위 빨간 엑스를 눌러서 닫아요", at: winBtn("close"), c: none("explorer") },
    { ic: "📁", t: "동물 폴더를 <em>두 번</em> 딸깍딸깍!", say: "노란 동물 폴더를 딸깍딸깍 두 번 눌러요", at: desk("동물"), c: s => s.at("바탕 화면/동물") },
    { ic: "❎", t: "빨간 <em>✕</em>로 닫아요", say: "빨간 엑스로 닫아요", at: winBtn("close"), c: none("explorer") }
  ] }) };

/* ===== 2차시 열고 닫기 ===== */
const e2Desk = s => { ezDesk(s); s.put("바탕 화면", ["바나나.jpg"]); s.put("바탕 화면/동물", ["토끼.jpg"]); };
ACTS["e2-do"] = { name: "열고 닫기", icon: "📂", type: "sim", mins: 8, desc: "폴더와 사진을 열고 닫아요.",
  run: ctx => runEasy(ctx, { title: "열고 닫기", setup: e2Desk, finish: "열고 닫기를 잘해요!", tasks: [
    { ic: "📁", t: "동물 폴더를 <em>열어요</em> (딸깍딸깍)", say: "동물 폴더를 딸깍딸깍 두 번 눌러서 열어요", at: desk("동물"), c: s => s.at("바탕 화면/동물") },
    { ic: "🐶", t: "강아지 사진을 <em>열어요</em>", say: "강아지 사진을 딸깍딸깍 두 번 눌러요", at: file("강아지"), c: opened("강아지") },
    { ic: "❎", t: "사진 창을 <em>✕</em>로 닫아요", say: "빨간 엑스를 눌러서 사진 창을 닫아요", at: winBtn("close", "viewer"), c: none("viewer") },
    { ic: "🐱", t: "고양이 사진을 <em>열어요</em>", say: "고양이 사진을 딸깍딸깍 두 번 눌러요", at: file("고양이"), c: opened("고양이") },
    { ic: "❎", t: "<em>✕</em>로 닫아요", say: "빨간 엑스로 닫아요", at: winBtn("close", "viewer"), c: none("viewer") },
    { ic: "❎", t: "폴더 창도 <em>✕</em>로 닫아요", say: "폴더 창도 빨간 엑스로 닫아요", at: winBtn("close", "explorer"), c: none("explorer") },
    { ic: "🍎", t: "사과 사진을 <em>열어요</em>", say: "바탕 화면의 사과 사진을 딸깍딸깍 두 번 눌러요", at: desk("사과"), c: opened("사과") },
    { ic: "❎", t: "<em>✕</em>로 닫아요", say: "빨간 엑스로 닫아요", at: winBtn("close", "viewer"), c: none("viewer") },
    { ic: "📝", t: "메모를 <em>열어요</em>", say: "메모를 딸깍딸깍 두 번 눌러서 열어요", at: desk("메모"), c: s => s.count("notepad") > 0 },
    { ic: "❎", t: "<em>✕</em>로 닫아요", say: "빨간 엑스로 닫아요", at: winBtn("close", "notepad"), c: none("notepad") }
  ] }) };
ACTS["e2-try"] = { name: "혼자 열고 닫기", icon: "⭐", type: "sim", mins: 5, desc: "이번엔 반짝 표시가 늦게 나와요. 혼자 해 봐요!",
  run: ctx => runEasy(ctx, { title: "혼자 해보기", setup: e2Desk, ringDelay: 9000, finish: "혼자서도 잘 열고 닫아요!", tasks: [
    { ic: "🍌", t: "바나나 사진을 <em>열어요</em>", say: "바나나 사진을 열어요", at: desk("바나나"), c: opened("바나나") },
    { ic: "❎", t: "<em>닫아요</em>", say: "닫아요", at: winBtn("close", "viewer"), c: none("viewer") },
    { ic: "🐰", t: "동물 폴더 속 <em>토끼</em>를 열어요", say: "동물 폴더를 열고, 토끼 사진을 열어요", at: s => s.at("바탕 화면/동물") ? file("토끼")(s) : desk("동물")(s), c: opened("토끼") },
    { ic: "❎", t: "열린 창을 <em>모두</em> 닫아요", say: "열린 창을 모두 닫아요", at: s => winBtn("close")(s), c: s => s.wins.length === 0 }
  ] }) };

/* ===== 3차시 창 크게 작게 ===== */
const e3Setup = s => { ezDesk(s); s.openExplorer(s.folderId("바탕 화면/동물")); };
ACTS["e3-tour"] = { name: "창의 단추", icon: "🪟", type: "tour", mins: 4, desc: "창 위쪽 단추 이름을 소리로 알아봐요.",
  run: ctx => window.WL.runTour(ctx, { voice: true, title: "창의 단추", intro: "창 오른쪽 위에 단추가 3개 있어요. 하나씩 눌러 봐요.", setup: e3Setup, finish: "창의 단추를 모두 알았어요!",
    spots: [
      { sel: ".win .w-title", name: "위쪽 막대", desc: "여기를 꾹 누른 채 끌면 창이 움직여요." },
      { sel: '.win [data-b="min"]', name: "숨기기", desc: "창을 아래로 숨겨요. 사라진 게 아니에요." },
      { sel: '.win [data-b="max"]', name: "크게 하기", desc: "창을 화면 가득 크게 만들어요." },
      { sel: '.win [data-b="close"]', name: "닫기", desc: "빨간 엑스예요. 창을 닫아요." },
      { sel: '[data-bar="explorer"]', name: "아래 단추", desc: "숨긴 창을 다시 꺼낼 때 눌러요." }
    ] }) };
ACTS["e3-do"] = { name: "창 크게 작게", icon: "👆", type: "sim", mins: 7, desc: "창을 크게, 작게, 숨기고 꺼내요.",
  run: ctx => runEasy(ctx, { title: "창 크게 작게", setup: e3Setup, finish: "창을 마음대로 움직여요!", tasks: [
    { ic: "▢", t: "<em>▢</em>를 눌러 크게!", say: "네모 단추를 눌러서 창을 크게 만들어요", at: winBtn("max"), c: (s, e) => e.type === "maximize" },
    { ic: "❐", t: "다시 눌러 <em>작게!</em>", say: "같은 단추를 다시 눌러서 작게 만들어요", at: winBtn("max"), c: (s, e) => e.type === "restore" },
    { ic: "➖", t: "<em>—</em>를 눌러 숨겨요", say: "막대 단추를 눌러서 창을 숨겨요", at: winBtn("min"), c: (s, e) => e.type === "minimize" },
    { ic: "📁", t: "아래 <em>📁</em>를 눌러 꺼내요", say: "아래쪽 노란 폴더 단추를 눌러서 창을 꺼내요", at: s => q(s, '[data-bar="explorer"]'), c: (s, e) => e.type === "unminimize" },
    { ic: "✋", t: "위쪽 막대를 <em>꾹 누른 채</em> 끌어요", say: "창 위쪽 막대를 꾹 누른 채 옆으로 끌어요", at: s => { const w = topOf(s); return w ? w.el.querySelector(".w-tt") : null; }, c: (s, e) => e.type === "moveWindow" && e.dist > 50 },
    { ic: "❎", t: "<em>✕</em>로 닫아요", say: "빨간 엑스로 닫아요", at: winBtn("close"), c: s => s.wins.length === 0 }
  ] }) };
ACTS["e3-try"] = { name: "혼자 창 다루기", icon: "⭐", type: "sim", mins: 5, desc: "반짝 표시 없이 먼저 해 봐요.",
  run: ctx => runEasy(ctx, { title: "혼자 해보기", setup: e3Setup, ringDelay: 9000, finish: "창 다루기 혼자서도 잘해요!", tasks: [
    { ic: "▢", t: "창을 <em>크게</em> 만들어요", say: "창을 크게 만들어요", at: winBtn("max"), c: (s, e) => e.type === "maximize" },
    { ic: "➖", t: "창을 <em>숨겨요</em>", say: "창을 숨겨요", at: winBtn("min"), c: (s, e) => e.type === "minimize" },
    { ic: "📁", t: "창을 다시 <em>꺼내요</em>", say: "숨긴 창을 다시 꺼내요", at: s => q(s, '[data-bar="explorer"]'), c: (s, e) => e.type === "unminimize" },
    { ic: "❐", t: "창을 <em>작게</em> 돌려요", say: "창을 원래 크기로 작게 돌려요", at: winBtn("max"), c: (s, e) => e.type === "restore" },
    { ic: "❎", t: "창을 <em>닫아요</em>", say: "창을 닫아요", at: winBtn("close"), c: s => s.wins.length === 0 }
  ] }) };

/* ===== 4차시 폴더 속으로 ===== */
const e4Setup = s => { base(s); s.put("바탕 화면", ["보물섬/"]); s.put("바탕 화면/보물섬", ["동굴/", "모래.txt"]); s.put("바탕 화면/보물섬/동굴", ["왕관.jpg"]); };
ACTS["e4-do"] = { name: "폴더 속으로", icon: "📂", type: "sim", mins: 7, desc: "폴더 안의 폴더로 들어가고, 뒤로 나와요.",
  run: ctx => runEasy(ctx, { title: "폴더 속으로", setup: e4Setup, finish: "폴더 속을 마음대로 다녀요!", tasks: [
    { ic: "🏝️", t: "<em>보물섬</em> 폴더를 열어요", say: "보물섬 폴더를 딸깍딸깍 열어요", at: desk("보물섬"), c: s => s.at("바탕 화면/보물섬") },
    { ic: "🕳️", t: "<em>동굴</em> 폴더로 들어가요", say: "동굴 폴더를 딸깍딸깍 눌러서 들어가요", at: file("동굴"), c: s => s.at("바탕 화면/보물섬/동굴") },
    { ic: "👑", t: "<em>왕관</em>을 열어 봐요!", say: "왕관을 딸깍딸깍 열어 봐요", at: file("왕관"), c: opened("왕관") },
    { ic: "❎", t: "왕관 창을 <em>닫아요</em>", say: "왕관 창을 빨간 엑스로 닫아요", at: winBtn("close", "viewer"), c: none("viewer") },
    { ic: "⬅️", t: "<em>←</em>를 눌러 뒤로 나가요", say: "왼쪽 위 화살표를 눌러서 뒤로 나가요", at: inWin("explorer", '[data-n="back"]'), c: s => s.at("바탕 화면/보물섬") },
    { ic: "❎", t: "<em>✕</em>로 닫아요", say: "빨간 엑스로 닫아요", at: winBtn("close"), c: s => s.wins.length === 0 }
  ] }) };
const e4tSetup = s => {
  base(s);
  s.put("바탕 화면", ["빨간 상자/", "파란 상자/", "노란 상자/"]);
  s.put("바탕 화면/빨간 상자", ["작은 상자/", "돌멩이.txt"]); s.put("바탕 화면/빨간 상자/작은 상자", ["왕관.jpg"]);
  s.put("바탕 화면/파란 상자", ["작은 상자/", "큰 상자/"]); s.put("바탕 화면/파란 상자/큰 상자", ["보석.jpg"]);
  s.put("바탕 화면/노란 상자", ["케이크.jpg", "작은 상자/"]);
};
ACTS["e4-treasure"] = { name: "보물 상자 찾기", icon: "💎", type: "sim", mins: 6, desc: "상자(폴더) 속에 숨은 보물 3개를 찾아요.",
  run: ctx => runEasy(ctx, { title: "보물 상자 찾기", setup: e4tSetup, ringDelay: 7000, finish: "보물 3개를 모두 찾았어요!", tasks: [
    { ic: "👑", t: "<em>빨간 상자</em> 속 <em>왕관</em>을 찾아 열어요", say: "빨간 상자 속에 숨은 왕관을 찾아서 열어요", at: pathTo(["빨간 상자", "작은 상자", "왕관"]), c: opened("왕관") },
    { ic: "❎", t: "열린 창을 <em>모두</em> 닫아요", say: "열린 창을 모두 닫아요", at: s => winBtn("close")(s), c: s => s.wins.length === 0 },
    { ic: "💎", t: "<em>파란 상자</em> 속 <em>보석</em>을 찾아 열어요", say: "파란 상자 속에 숨은 보석을 찾아서 열어요", at: pathTo(["파란 상자", "큰 상자", "보석"]), c: opened("보석") },
    { ic: "❎", t: "열린 창을 <em>모두</em> 닫아요", say: "열린 창을 모두 닫아요", at: s => winBtn("close")(s), c: s => s.wins.length === 0 },
    { ic: "🎂", t: "<em>노란 상자</em> 속 <em>케이크</em>를 찾아 열어요", say: "노란 상자 속에 숨은 케이크를 찾아서 열어요", at: pathTo(["노란 상자", "케이크"]), c: opened("케이크") }
  ] }) };

/* ===== 5차시 끌어서 넣기 ===== */
const e5Setup = s => { base(s); s.put("바탕 화면", ["과일/", "사과.jpg", "바나나.jpg", "딸기.jpg"]); };
const into = (pic, folder) => s => [desk(pic)(s), desk(folder)(s)];
ACTS["e5-do"] = { name: "끌어서 넣기", icon: "✋", type: "sim", mins: 7, desc: "그림을 꾹 누른 채 끌어서 폴더에 넣어요.",
  run: ctx => runEasy(ctx, { title: "끌어서 넣기", setup: e5Setup, finish: "끌어서 넣기를 잘해요!", tasks: [
    { ic: "🍎", t: "사과를 <em>꾹 누른 채</em> 📁 과일 폴더로!", say: "사과를 꾹 누른 채로 끌어서, 과일 폴더 위에서 손을 떼요", at: into("사과", "과일"), c: s => s.exists("바탕 화면/과일/사과") },
    { ic: "🍌", t: "바나나도 📁 과일 폴더로!", say: "바나나도 끌어서 과일 폴더에 넣어요", at: into("바나나", "과일"), c: s => s.exists("바탕 화면/과일/바나나") },
    { ic: "🍓", t: "딸기도 📁 과일 폴더로!", say: "딸기도 끌어서 과일 폴더에 넣어요", at: into("딸기", "과일"), c: s => s.exists("바탕 화면/과일/딸기") },
    { ic: "📁", t: "과일 폴더를 <em>열어</em> 봐요", say: "과일 폴더를 열어서 잘 들어갔는지 봐요", at: desk("과일"), c: s => s.at("바탕 화면/과일") },
    { ic: "❎", t: "<em>✕</em>로 닫아요", say: "빨간 엑스로 닫아요", at: winBtn("close"), c: s => s.wins.length === 0 }
  ] }) };
const e5tSetup = s => { base(s); s.put("바탕 화면", ["과일/", "동물/", "포도.jpg", "사자.jpg", "수박.jpg", "곰.jpg"]); };
const sortTask = (pic, folder, ic) => ({ ic, t: `${ic} → 📁 <em>${folder}</em> 폴더`, say: `${pic}을 ${folder} 폴더에 넣어요`, at: into(pic, folder), c: s => s.exists(`바탕 화면/${folder}/${pic}`) });
ACTS["e5-try"] = { name: "혼자 정리하기", icon: "⭐", type: "sim", mins: 5, desc: "과일은 과일 폴더, 동물은 동물 폴더에!",
  run: ctx => runEasy(ctx, { title: "혼자 정리하기", setup: e5tSetup, ringDelay: 9000, finish: "바탕 화면 정리 끝!", tasks: [
    sortTask("포도", "과일", "🍇"), sortTask("사자", "동물", "🦁"), sortTask("수박", "과일", "🍉"), sortTask("곰", "동물", "🐻")
  ] }) };

/* ===== 6차시 버리고 꺼내기 ===== */
const e6Setup = s => { base(s); s.put("바탕 화면", ["낙서1.txt", "낙서2.txt", "강아지.jpg"]); };
ACTS["e6-do"] = { name: "버리고 꺼내기", icon: "🗑️", type: "sim", mins: 8, desc: "휴지통에 버리고, 실수하면 다시 꺼내요.",
  run: ctx => runEasy(ctx, { title: "버리고 꺼내기", setup: e6Setup, finish: "버리고 꺼내기를 할 수 있어요!", tasks: [
    { ic: "📝", t: "낙서1을 <em>🗑️ 휴지통</em>으로 끌어요", say: "낙서1을 꾹 누른 채 끌어서 휴지통 위에서 손을 떼요", at: s => [desk("낙서1")(s), desk("휴지통")(s)], c: s => s.inBin("낙서1") },
    { ic: "📝", t: "낙서2도 <em>🗑️ 휴지통</em>으로!", say: "낙서2도 휴지통으로 끌어요", at: s => [desk("낙서2")(s), desk("휴지통")(s)], c: s => s.inBin("낙서2") },
    { ic: "🗑️", t: "휴지통을 <em>열어</em> 봐요", say: "휴지통을 딸깍딸깍 열어 봐요", at: desk("휴지통"), c: s => s.at("BIN") },
    { ic: "😮", t: "앗! 낙서2를 꺼낼래요. 낙서2를 <em>오른쪽</em> 딸깍!", say: "낙서2를 다시 꺼낼 거예요. 마우스 오른쪽 버튼으로 낙서2를 눌러요", at: file("낙서2"), c: (s, e) => e.type === "ctxmenu" && e.on === "item" && e.name === "낙서2" },
    { ic: "↺", t: "<em>복원</em>을 눌러요", say: "복원을 눌러요. 제자리로 돌아가요", at: s => menuRow("복원")(s) || file("낙서2")(s), c: s => s.exists("바탕 화면/낙서2") },
    { ic: "❎", t: "<em>✕</em>로 닫아요", say: "빨간 엑스로 닫아요", at: winBtn("close"), c: s => s.wins.length === 0 }
  ] }) };
const e6tSetup = s => { base(s); s.put("바탕 화면", ["낙서1.txt", "낙서2.txt", "낙서3.txt", "토끼.jpg", "꽃.jpg"]); };
ACTS["e6-try"] = { name: "혼자 청소하기", icon: "⭐", type: "sim", mins: 5, desc: "낙서만 골라서 휴지통에 버려요.",
  run: ctx => runEasy(ctx, { title: "혼자 청소하기", setup: e6tSetup, ringDelay: 9000, finish: "깨끗하게 청소했어요!", tasks: [1, 2, 3].map(n => ({ ic: "📝", t: `낙서${n} → <em>🗑️ 휴지통</em>`, say: `낙서${n}을 휴지통에 버려요`, at: s => [desk("낙서" + n)(s), desk("휴지통")(s)], c: s => s.inBin("낙서" + n) })) }) };

/* ===== 7차시 시작 메뉴와 계산기 ===== */
const calcPress = (k, ic) => ({ ic, t: `<em>${k}</em>를 눌러요`, say: `${k === "+" ? "더하기" : k === "=" ? "는" : k}를 눌러요`, at: key(k), c: (s, e) => e.type === "calc" && e.key === k });
ACTS["e7-do"] = { name: "시작 메뉴와 계산기", icon: "🧮", type: "sim", mins: 8, desc: "시작 메뉴에서 계산기와 메모장을 열어요.",
  run: ctx => runEasy(ctx, { title: "시작 메뉴", setup: ezDesk, finish: "시작 메뉴에서 프로그램을 열 수 있어요!", tasks: [
    { ic: "🪟", t: "<em>시작 단추</em>를 눌러요", say: "시작 단추를 눌러요", at: startBtn, c: (s, e) => e.type === "startOpen" },
    { ic: "🧮", t: "<em>계산기</em>를 눌러요", say: "계산기를 눌러요", at: app("calc"), c: s => s.count("calc") > 0 },
    calcPress("1", "1️⃣"), calcPress("+", "➕"), calcPress("2", "2️⃣"),
    { ic: "🟰", t: "<em>=</em>를 눌러요. 답은?", say: "는을 눌러요. 답이 나와요", at: key("="), c: (s, e) => e.type === "calc" && e.key === "=" && e.display === "3" },
    { ic: "❎", t: "<em>✕</em>로 닫아요", say: "빨간 엑스로 닫아요", at: winBtn("close"), c: none("calc") },
    { ic: "📝", t: "시작 → <em>메모장</em>을 열어요", say: "시작 단추를 누르고 메모장을 열어요", at: app("notepad"), c: s => s.count("notepad") > 0 },
    { ic: "❎", t: "<em>✕</em>로 닫아요", say: "빨간 엑스로 닫아요", at: winBtn("close"), c: none("notepad") }
  ] }) };
const calcAt = (a, b) => s => { const w = topOf(s, "calc"); if (!w) return app("calc")(s); if (w.op == null) return key(w.disp === String(a) && !w.fresh ? "+" : String(a))(s); if (w.fresh) return key(String(b))(s); return key("=")(s); };
ACTS["e7-try"] = { name: "혼자 계산하기", icon: "⭐", type: "sim", mins: 5, desc: "계산기를 혼자 열고 계산해요.",
  run: ctx => runEasy(ctx, { title: "혼자 계산하기", setup: ezDesk, ringDelay: 9000, finish: "계산기 박사!", tasks: [
    { ic: "🧮", t: "<em>계산기</em>를 열어요", say: "계산기를 열어요", at: app("calc"), c: s => s.count("calc") > 0 },
    { ic: "➕", t: "<em>2 + 3 =</em> 을 눌러요", say: "2 더하기 3 는을 눌러요", at: calcAt(2, 3), c: (s, e) => e.type === "calc" && e.key === "=" && e.display === "5" },
    { ic: "➕", t: "<em>4 + 4 =</em> 을 눌러요", say: "4 더하기 4 는을 눌러요", at: calcAt(4, 4), c: (s, e) => e.type === "calc" && e.key === "=" && e.display === "8" },
    { ic: "❎", t: "계산기를 <em>닫아요</em>", say: "계산기를 닫아요", at: winBtn("close"), c: none("calc") }
  ] }) };

/* ===== 8차시 종합 놀이 ===== */
const e8Setup = s => { base(s); s.put("바탕 화면", ["내 사진/", "강아지.jpg", "고양이.jpg", "사과.jpg", "낙서1.txt", "낙서2.txt"]); };
ACTS["e8-find"] = { name: "창 단추 찾기", icon: "🔍", type: "guide", mins: 4, desc: "소리를 듣고 창의 단추를 찾아 눌러요.",
  run: ctx => runFind(ctx, { setup: e3Setup, items: [
    { ic: "❎", t: "창을 <em>닫는</em> 단추는?", say: "창을 닫는 단추를 찾아요", at: winBtn("close") },
    { ic: "▢", t: "창을 <em>크게</em> 하는 단추는?", say: "창을 크게 만드는 단추를 찾아요", at: winBtn("max") },
    { ic: "➖", t: "창을 <em>숨기는</em> 단추는?", say: "창을 숨기는 단추를 찾아요", at: winBtn("min") },
    { ic: "✋", t: "창을 <em>옮길 때</em> 잡는 곳은?", say: "창을 옮길 때 잡는 위쪽 막대를 찾아요", at: s => { const w = topOf(s); return w ? w.el.querySelector(".w-title") : null; } },
    { ic: "⬅️", t: "<em>뒤로</em> 가는 화살표는?", say: "뒤로 가는 화살표를 찾아요", at: inWin("explorer", '[data-n="back"]') },
    { ic: "🗑️", t: "<em>휴지통</em>은 어디?", at: desk("휴지통") }
  ] }) };
const nextLoose = s => { const k = ["강아지", "고양이", "사과"].find(n => s.exists("바탕 화면/" + n)); return k; };
ACTS["e8-try"] = { name: "바탕 화면 대청소", icon: "🏆", type: "sim", mins: 8, desc: "사진은 내 사진 폴더에, 낙서는 휴지통에!",
  run: ctx => runEasy(ctx, { title: "대청소", setup: e8Setup, ringDelay: 10000, finish: "바탕 화면이 반짝반짝해요!", tasks: [
    { ic: "🖼️", t: "사진 3장 → <em>📁 내 사진</em> 폴더", say: "강아지, 고양이, 사과 사진을 내 사진 폴더에 넣어요", at: s => { const k = nextLoose(s); return k ? [desk(k)(s), desk("내 사진")(s)] : []; }, c: s => ["강아지", "고양이", "사과"].every(n => s.exists("바탕 화면/내 사진/" + n)) },
    { ic: "📝", t: "낙서 2개 → <em>🗑️ 휴지통</em>", say: "낙서 두 개를 휴지통에 버려요", at: s => { const k = ["낙서1", "낙서2"].find(n => s.exists("바탕 화면/" + n)); return k ? [desk(k)(s), desk("휴지통")(s)] : []; }, c: s => s.inBin("낙서1") && s.inBin("낙서2") },
    { ic: "📁", t: "<em>내 사진</em> 폴더를 열어 확인해요", say: "내 사진 폴더를 열어서 확인해요", at: desk("내 사진"), c: s => s.at("바탕 화면/내 사진") },
    { ic: "❎", t: "<em>✕</em>로 닫아요", say: "빨간 엑스로 닫아요", at: winBtn("close"), c: s => s.wins.length === 0 }
  ] }) };

window.EASY = {
  id: "easy", name: "1단계 · 윈도우 첫걸음", ver: "소리 안내",
  lessons: [
    { id: "E1", title: "바탕 화면 친구들", goal: "바탕 화면에 있는 것들의 이름을 알고, 한 번·두 번 눌러요.", acts: ["e1-tour", "e1-find", "e1-do"] },
    { id: "E2", title: "열고 닫기", goal: "폴더와 사진을 두 번 눌러 열고, ✕로 닫아요.", acts: ["e2-do", "ez-close", "e2-try"] },
    { id: "E3", title: "창 크게 작게", goal: "창을 크게, 작게, 숨기고 다시 꺼내요.", acts: ["e3-tour", "e3-do", "e3-try"] },
    { id: "E4", title: "폴더 속으로", goal: "폴더 안의 폴더로 들어가고, ←로 뒤로 나와요.", acts: ["e4-do", "e4-treasure"] },
    { id: "E5", title: "끌어서 넣기", goal: "그림을 꾹 누른 채 끌어서 폴더에 넣어요.", acts: ["e5-do", "ez-sort", "e5-try"] },
    { id: "E6", title: "버리고 꺼내기", goal: "휴지통에 버리고, 실수하면 다시 꺼내요.", acts: ["e6-do", "e6-try"] },
    { id: "E7", title: "시작 메뉴와 계산기", goal: "시작 메뉴에서 계산기와 메모장을 열어요.", acts: ["e7-do", "e7-try"] },
    { id: "E8", title: "종합 놀이", goal: "지금까지 배운 것으로 바탕 화면을 정리해요.", acts: ["e8-find", "ez-close", "e8-try"] }
  ]
};
})();
