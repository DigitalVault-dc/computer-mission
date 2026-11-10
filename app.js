// 컴코샘 컴퓨터 기초 단계별학습: 첫 화면, 반 입장, 학생 학습, 선생님 관리, 출력
(function () {
const COURSES = [window.INTRO, window.EASY, window.WIN];
const LESSONS = [];
COURSES.forEach(c => c.lessons.forEach((l, k) => LESSONS.push(Object.assign(l, { course: c, no: k + 1 }))));
const LMAP = Object.fromEntries(LESSONS.map(l => [l.id, l]));
const ACTS = window.ACTS;
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const stage = c => c.name.split(" · ")[0];
const lname = l => `${stage(l.course)} ${l.no}차시`;
const starsHTML = n => "<b>" + "★".repeat(n) + "</b>" + "★".repeat(Math.max(0, 3 - n));
const TYPE = { game: "게임 · 난이도 3단계", guide: "알아보기", tour: "살펴보기", sim: "따라 하기", challenge: "혼자 해보기" };
const WIDE = new Set(["tour", "sim", "challenge"]);
const COLORS = ["#6b52c4", "#1f6fd1", "#1f8a5b", "#e0752d", "#d6457a", "#0f9bb0", "#b8860b", "#5b6c66"];
const DEMO = !window.API_URL;
const fmtTime = iso => { if (!iso) return "-"; const d = new Date(iso); if (isNaN(d)) return "-"; return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };
const fmtSecs = s => { s = Number(s) || 0; if (s < 60) return `${s}초`; return `${Math.floor(s / 60)}분 ${s % 60 ? (s % 60) + "초" : ""}`.trim(); };

/* ================= 서버 연결 ================= */
const DemoStore = {
  teacherPw: window.DEMO_TEACHER_PW || "0607",
  get(n) { try { return JSON.parse(localStorage.getItem("comco-demo-" + n) || "[]"); } catch (e) { return []; } },
  put(n, a) { try { localStorage.setItem("comco-demo-" + n, JSON.stringify(a)); } catch (e) {} },
  append(n, o) { const a = this.get(n); a.push(o); this.put(n, a); }
};
async function api(action, data = {}) {
  const req = Object.assign({ action }, data);
  if (DEMO) { await new Promise(r => setTimeout(r, 60)); return JSON.parse(JSON.stringify(window.comcoHandle(JSON.parse(JSON.stringify(req)), DemoStore))); }
  const r = await fetch(window.API_URL, { method: "POST", body: JSON.stringify(req) });
  return await r.json();
}
let busyN = 0;
function busy(on) { busyN += on ? 1 : -1; $("#busy").hidden = busyN <= 0; }
async function call(action, data) {
  busy(true);
  try { const r = await api(action, data); return r; }
  catch (e) { return { ok: false, error: "net" }; }
  finally { busy(false); }
}
function toast(msg, bad) { const t = $("#toast"); t.innerHTML = msg; t.className = "toast" + (bad ? " bad" : ""); t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => t.hidden = true, 3200); }
const errText = r => r.error === "net" ? "인터넷 연결을 확인해 주세요. (서버에 닿지 않아요)" : r.error === "tpw" ? "선생님 비밀번호가 달라요." : r.error === "pw" ? "비밀번호가 달라요." : r.error === "code" ? "입장 코드가 달라요." : (r.error || "문제가 생겼어요.");

/* ================= 세션 ================= */
let SES = null;
try { SES = JSON.parse(sessionStorage.getItem("comco-ses") || "null"); } catch (e) {}
const saveSes = () => { try { SES ? sessionStorage.setItem("comco-ses", JSON.stringify(SES)) : sessionStorage.removeItem("comco-ses"); } catch (e) {} };
function show(id) { ["home", "learn", "teach"].forEach(k => $("#" + k).hidden = k !== id); window.scrollTo(0, 0); }

/* ================= 숫자 패드 ================= */
function numPad({ title, sub, len, max = 8, color, onSubmit }) {
  const d = document.createElement("div"); d.className = "mdlg";
  d.innerHTML = `<div class="mdlg-c pad" style="--pc:${color || "var(--c)"}"><h3>${title}</h3>${sub ? `<p class="pad-sub">${sub}</p>` : ""}<div class="pad-dots"></div><p class="pad-err"></p>
    <div class="pad-keys">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button type="button" data-n="${n}">${n}</button>`).join("")}<button type="button" data-k="del" class="pk-s">지우기</button><button type="button" data-n="0">0</button><button type="button" data-k="ok" class="pk-ok">확인</button></div>
    <button type="button" class="pad-x" data-k="x">닫기</button></div>`;
  document.body.append(d);
  let v = "", wrong = 0, lockUntil = 0;
  const dots = d.querySelector(".pad-dots"), err = d.querySelector(".pad-err");
  const draw = () => { const n = len || Math.max(4, v.length); dots.innerHTML = Array.from({ length: n }, (_, i) => `<i class="${i < v.length ? "on" : ""}"></i>`).join(""); };
  const submit = async () => {
    if (Date.now() < lockUntil) { err.textContent = `잠깐 기다려요. ${Math.ceil((lockUntil - Date.now()) / 1000)}초 뒤에 다시 해요.`; return; }
    if (!v) return;
    const r = await onSubmit(v);
    if (r === true) { d.remove(); return; }
    wrong++;
    err.textContent = typeof r === "string" ? r : "다시 눌러 보세요.";
    if (wrong >= 5) { lockUntil = Date.now() + 30000; wrong = 0; err.textContent = "5번 틀렸어요. 30초 뒤에 다시 해요."; }
    d.querySelector(".pad").classList.remove("shake"); void d.offsetWidth; d.querySelector(".pad").classList.add("shake");
    v = ""; draw();
  };
  d.addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.n != null) { if (v.length < (len || max)) { v += b.dataset.n; draw(); err.textContent = ""; if (len && v.length === len) submit(); } }
    else if (b.dataset.k === "del") { v = v.slice(0, -1); draw(); }
    else if (b.dataset.k === "ok") submit();
    else if (b.dataset.k === "x") d.remove();
  });
  d.addEventListener("keydown", e => {
    if (/^\d$/.test(e.key)) d.querySelector(`[data-n="${e.key}"]`).click();
    else if (e.key === "Backspace") d.querySelector('[data-k="del"]').click();
    else if (e.key === "Enter") submit();
    else if (e.key === "Escape") d.remove();
  });
  d.tabIndex = -1; setTimeout(() => d.focus(), 0);
  draw();
  return d;
}
function modal(html, cls = "") {
  const d = document.createElement("div"); d.className = "mdlg";
  d.innerHTML = `<div class="mdlg-c ${cls}">${html}</div>`;
  document.body.append(d);
  d.addEventListener("keydown", e => { if (e.key === "Escape") d.remove(); });
  d.querySelectorAll("[data-close]").forEach(b => b.onclick = () => d.remove());
  d.tabIndex = -1; setTimeout(() => { if (!d.contains(document.activeElement)) d.focus(); }, 0);
  return d;
}

/* ================= 첫 화면 ================= */
let homeClass = null;
async function renderHome() {
  show("home");
  const box = $("#hMain");
  $("#hDemo").hidden = !DEMO;
  if (homeClass) return renderClassStudents();
  box.innerHTML = `<p class="h-sub">우리 반을 눌러 들어가요</p><div class="h-classes"><div class="h-loading">반 목록을 불러오는 중…</div></div>`;
  const r = await call("classes");
  const list = box.querySelector(".h-classes");
  if (!r.ok) { list.innerHTML = `<div class="h-empty">${errText(r)}<br><button type="button" class="ghost" id="hRetry">다시 불러오기</button></div>`; $("#hRetry").onclick = renderHome; return; }
  if (!r.classes.length) { list.innerHTML = `<div class="h-empty">아직 만들어진 반이 없어요.<br>선생님이 아래 <b>선생님</b> 단추로 반을 만들어 주세요.</div>`; return; }
  list.innerHTML = r.classes.map(c => `<button type="button" class="h-class" data-id="${esc(c.id)}" style="--cc:${esc(c.color || "#6b52c4")}"><span class="hc-ic">🏫</span><span class="hc-n">${esc(c.name)}</span></button>`).join("");
  list.querySelectorAll(".h-class").forEach(b => b.onclick = () => {
    const c = r.classes.find(x => x.id === b.dataset.id);
    numPad({ title: `${esc(c.name)} 입장`, sub: "선생님이 알려 준 <b>입장 코드</b>를 눌러요", color: c.color, onSubmit: async v => {
      const res = await call("enter", { classId: c.id, code: v });
      if (!res.ok) return errText(res);
      homeClass = { cls: c, code: v, students: res.students };
      renderClassStudents();
      return true;
    } });
  });
}
function renderClassStudents() {
  const { cls, students } = homeClass;
  const box = $("#hMain");
  box.innerHTML = `<div class="h-clshead" style="--cc:${esc(cls.color)}"><button type="button" class="ghost" id="hBack">◀ 반 고르기</button><h2>${esc(cls.name)}</h2></div>
    <p class="h-sub">내 이름을 눌러요</p>
    <div class="h-students">${students.map(s => `<button type="button" class="h-stu" data-id="${esc(s.id)}" style="--cc:${esc(cls.color)}"><span>${esc(s.name)}</span></button>`).join("") || `<div class="h-empty">이 반에는 아직 학생이 없어요.</div>`}</div>`;
  $("#hBack").onclick = () => { homeClass = null; renderHome(); };
  box.querySelectorAll(".h-stu").forEach(b => b.onclick = () => {
    const s = students.find(x => x.id === b.dataset.id);
    numPad({ title: `${esc(s.name)}`, sub: "내 <b>비밀번호</b>를 누르고 <b>확인</b>을 눌러요", color: cls.color, onSubmit: async v => {
      const res = await call("login", { sid: s.id, pw: v });
      if (!res.ok) return errText(res);
      SES = { role: "student", sid: s.id, pw: v }; saveSes();
      startLearn(res.student);
      return true;
    } });
  });
}

/* ================= 학생 학습 ================= */
let ME = null, CUR = null, LV = {};
try { LV = JSON.parse(sessionStorage.getItem("comco-lv") || "{}"); } catch (e) {}
const saveLv = () => { try { sessionStorage.setItem("comco-lv", JSON.stringify(LV)); } catch (e) {} };
const actStars = (lid, aid) => Number(ME.stars[lid + ":" + aid]) || 0;
const passed = (lid, aid) => actStars(lid, aid) >= 3;
const lessonDone = l => l.acts.every(a => passed(l.id, a));
const myLessons = () => ME.preview ? LESSONS : LESSONS.filter(l => ME.assigned.includes(l.id));
function lessonState(l) {
  if (ME.preview) return "open";
  const mine = myLessons();
  if (!mine.includes(l)) return "hidden";
  if (lessonDone(l)) return "done";
  return mine.find(x => !lessonDone(x)) === l ? "open" : "locked";
}
const actOpen = (l, i) => { const st = lessonState(l); return (st === "open" || st === "done") && (ME.preview || l.free || i === 0 || passed(l.id, l.acts[i - 1])); };

function startLearn(student) {
  ME = student; ME.stars = ME.stars || {}; ME.assigned = ME.assigned || [];
  const mine = myLessons();
  CUR = (mine.find(l => lessonState(l) === "open") || mine[0] || null);
  show("learn");
  renderLearn();
}
function renderLearn() {
  $("#learn").style.setProperty("--cc", ME.color || "#6b52c4");
  $("#meChip").innerHTML = ME.preview ? `👩‍🏫 선생님 체험 <small>(기록 안 됨)</small>` : `<b>${esc(ME.name)}</b><small>${esc(ME.className)}</small>`;
  $("#lOut").textContent = ME.preview ? "관리 화면으로" : "나가기";
  renderList(); renderDetail(); renderSave();
}
function renderList() {
  const mine = myLessons(), box = $("#list");
  if (!mine.length) { box.innerHTML = `<div class="lockmsg">선생님이 아직 차시를 정해 주지 않았어요.</div>`; return; }
  box.innerHTML = COURSES.map(c => {
    const ls = mine.filter(l => l.course === c);
    if (!ls.length) return "";
    return `<div class="list-h">${esc(c.name)}</div>` + ls.map(l => {
      const st = lessonState(l), n = l.acts.filter(a => passed(l.id, a)).length;
      const tag = st === "done" ? "완료" : st === "locked" ? "🔒" : n ? `${n}/${l.acts.length}` : "▶";
      return `<button type="button" class="li ${st === "locked" ? "locked" : ""} ${st === "open" ? "now" : ""}" data-id="${l.id}" data-course="${c.id}" aria-current="${CUR === l}"><span class="no">${l.no}차시</span><span class="tt">${esc(l.title)}</span><span class="st ${st === "done" ? "done" : ""}">${tag}</span></button>`;
    }).join("");
  }).join("");
  box.querySelectorAll(".li").forEach(b => b.onclick = () => { CUR = LMAP[b.dataset.id]; renderList(); renderDetail(); });
}
function renderDetail() {
  const d = $("#detail");
  if (!CUR) { d.innerHTML = `<h1 class="d-title">반가워요!</h1><p class="d-goal">선생님이 오늘 할 차시를 정해 주면 여기에 나타나요.</p>`; return; }
  const l = CUR, st = lessonState(l);
  d.dataset.course = l.course.id;
  const mins = l.acts.reduce((s, a) => s + ACTS[a].mins, 0);
  const lockMsg = st === "locked" ? `<div class="lockmsg">🔒 앞 차시를 먼저 모두 끝내야 열려요. 지금 할 차시는 <b>${(() => { const o = myLessons().find(x => lessonState(x) === "open"); return o ? esc(lname(o) + " " + o.title) : "-"; })()}</b>예요.</div>` : "";
  d.innerHTML = lockMsg + `<div class="d-eyebrow">${esc(l.course.name)} · ${l.no}차시</div><h1 class="d-title">${esc(l.title)}</h1><p class="d-goal">${esc(l.goal)}</p>
    <div class="facts"><span class="fact">활동 <b>${l.acts.length}개</b></span><span class="fact">약 <b>${Math.max(15, Math.min(25, mins))}분</b></span><span class="fact">별 <b>${l.acts.reduce((s, a) => s + actStars(l.id, a), 0)}</b> / ${l.acts.length * 3}</span>${st === "done" ? `<span class="fact done">✔ 완료한 차시</span>` : ""}</div>
    <div class="acts">${l.acts.map((a, i) => { const A = ACTS[a], ok = actOpen(l, i); return `<button type="button" class="act" data-i="${i}" ${ok ? "" : "disabled"}><div class="act-top"><span class="act-ic">${A.icon}</span><span class="act-no">${i + 1}번째 · ${A.mins}분</span></div><div class="act-n">${esc(A.name)}</div><div class="act-d">${esc(A.desc)}</div><div class="act-top">${ok ? `<span class="act-k">${A.noLevel ? "게임" : TYPE[A.type]} · 별 3개 통과</span>` : `<span class="act-lock">🔒 ${st === "locked" ? "아직 닫혀 있어요" : "앞 활동을 먼저 해요"}</span>`}<span class="stars">${starsHTML(actStars(l.id, a))}</span></div></button>`; }).join("")}</div>
    ${l.course.id === "win" ? `<p class="note">연습 화면은 진짜 윈도우 11처럼 움직이지만, 실제 컴퓨터의 파일은 바뀌지 않아요. 마음껏 지우고 옮겨 보세요!</p>` : ""}`;
  d.querySelectorAll(".act").forEach(b => b.onclick = () => openAct(l, +b.dataset.i));
}
/* 기록 저장 (실패하면 줄 세워 두고 다시 보냄) */
const queue = [];
let saving = false, saveErr = false;
function renderSave() {
  const el = $("#saveSt"); if (!el || !ME) return;
  if (ME.preview) { el.hidden = true; return; }
  el.hidden = false;
  el.className = "save-st " + (saveErr ? "bad" : saving || queue.length ? "ing" : "ok");
  el.textContent = saveErr ? "⚠ 저장 안 됨 · 다시 보내는 중" : saving || queue.length ? "저장 중…" : DEMO ? "✓ 저장됨(체험 모드)" : "✓ 저장됨";
}
async function flush() {
  if (saving || !queue.length || !SES || SES.role !== "student") return;
  saving = true; renderSave();
  const item = queue[0];
  let r;
  try { r = await api("record", Object.assign({ sid: SES.sid, pw: SES.pw }, item)); } catch (e) { r = { ok: false, error: "net" }; }
  saving = false;
  if (r.ok) { queue.shift(); saveErr = false; if (r.stars && ME && !ME.preview) { Object.keys(r.stars).forEach(k => { ME.stars[k] = Math.max(Number(ME.stars[k]) || 0, Number(r.stars[k]) || 0); }); } }
  else if (r.error === "pw") { queue.length = 0; saveErr = true; toast("비밀번호가 바뀌었어요. 다시 로그인해 주세요.", true); }
  else saveErr = true;
  renderSave();
  if (queue.length) setTimeout(flush, saveErr ? 8000 : 50);
}
function record(l, aid, stars, secs, fail) {
  if (!ME || ME.preview) return;
  queue.push({ lid: l.id, aid, stars, secs, fail: !!fail });
  flush();
}
window.addEventListener("beforeunload", e => { if (queue.length) { e.preventDefault(); e.returnValue = ""; } });

/* ---------- 활동 창 ---------- */
const ov = $("#ov"), arena = $("#arena"), hudEl = $("#pHud"), panel = $("#panel");
let run = null;
function stopRun() { if (!run) return; const c = run.cleans; run.cleans = []; c.forEach(f => { try { f(); } catch (e) {} }); }
function openAct(l, i) {
  if (!actOpen(l, i)) { closeAct(); return; }
  stopRun();
  const aid = l.acts[i], A = ACTS[aid];
  ov.hidden = false; document.body.style.overflow = "hidden";
  panel.dataset.course = l.course.id;
  panel.classList.toggle("wide", WIDE.has(A.type));
  $("#pTitle").innerHTML = `${A.icon} ${esc(A.name)}<small>${esc(l.title)} · ${i + 1} / ${l.acts.length}</small>`;
  const lvEl = $("#lv");
  const level = LV[aid] || 1;
  lvEl.hidden = A.type !== "game" || A.noLevel;
  lvEl.innerHTML = ["쉬움", "보통", "어려움"].map((t, k) => `<button type="button" aria-pressed="${level === k + 1}" data-k="${k + 1}">${t}</button>`).join("");
  lvEl.querySelectorAll("button").forEach(b => b.onclick = () => { LV[aid] = +b.dataset.k; saveLv(); openAct(l, i); });
  run = { cleans: [], ended: false, type: A.type };
  arena.innerHTML = ""; hudEl.innerHTML = esc(A.desc);
  arena.classList.toggle("scrolly", A.type === "guide");
  const start = () => {
    arena.innerHTML = "";
    const R = run, t0 = Date.now();
    const secs = () => Math.round((Date.now() - t0) / 1000);
    const ctx = {
      arena, level,
      hud: h => { if (!R.ended) hudEl.innerHTML = h; },
      after: (f, ms) => { const t = setTimeout(f, ms); R.cleans.push(() => clearTimeout(t)); },
      every: (f, ms) => { const t = setInterval(f, ms); R.cleans.push(() => clearInterval(t)); },
      raf: f => { let id; const loop = now => { if (f(now) !== false && !R.ended) id = requestAnimationFrame(loop); }; id = requestAnimationFrame(loop); R.cleans.push(() => cancelAnimationFrame(id)); },
      on: (el, ev, f, o) => { el.addEventListener(ev, f, o); R.cleans.push(() => el.removeEventListener(ev, f, o)); },
      cleanup: f => R.cleans.push(f),
      restart: () => openAct(l, i),
      fail: msg => {
        if (R.ended) return; R.ended = true;
        record(l, aid, 0, secs(), true);
        arena.querySelectorAll(".g-balloon").forEach(b => b.getAnimations().forEach(x => x.pause()));
        const cov = document.createElement("div"); cov.className = "cover";
        cov.innerHTML = `<div class="cover-card"><div class="cover-warn">✋</div><p class="cover-t">잠깐!</p><p class="cover-d">${msg}</p><div class="cover-btns"><button type="button" class="primary" data-a="again">다시 하기</button></div></div>`;
        arena.append(cov); setTimeout(stopRun, 0);
        cov.querySelector('[data-a="again"]').onclick = () => openAct(l, i);
      },
      done: (stars, msg) => {
        if (R.ended) return; R.ended = true;
        const key = l.id + ":" + aid;
        ME.stars[key] = Math.max(Number(ME.stars[key]) || 0, stars);
        record(l, aid, stars, secs());
        arena.querySelectorAll(".g-balloon").forEach(b => b.getAnimations().forEach(x => x.pause()));
        const nxt = i < l.acts.length - 1;
        const cov = document.createElement("div"); cov.className = "cover";
        const up = A.type === "game" && !A.noLevel && level < 3;
        if (stars < 3) {
          cov.innerHTML = `<div class="cover-card"><div class="cover-stars">${starsHTML(stars)}</div><p class="cover-t">아직 통과가 아니에요</p><p class="cover-d">${msg}</p><p class="cover-d"><b>별 3개</b>를 받아야 다음으로 갈 수 있어요.${A.type === "challenge" ? " 이번엔 <b>힌트 없이</b> 해 봐요!" : " 천천히, 정확하게 다시 도전해요."}</p><div class="cover-btns"><button type="button" class="ghost" data-a="close">목록으로</button><button type="button" class="primary" data-a="again">다시 하기</button></div></div>`;
          arena.append(cov); setTimeout(stopRun, 0);
          cov.querySelector('[data-a="again"]').onclick = () => openAct(l, i);
          cov.querySelector('[data-a="close"]').onclick = closeAct;
          renderList(); renderDetail();
          return;
        }
        const lessonNow = lessonDone(l) && !ME.preview;
        const nextLesson = lessonNow ? myLessons().find(x => lessonState(x) === "open") : null;
        cov.innerHTML = `<div class="cover-card"><div class="cover-stars">${starsHTML(stars)}</div><p class="cover-t">${lessonNow ? "차시 완료! 🎉" : "최고예요!"}</p><p class="cover-d">${msg}</p>
          ${lessonNow ? `<p class="cover-d">${nextLesson ? `다음 차시 <b>${esc(nextLesson.title)}</b>이(가) 열렸어요!` : "선생님이 정해 준 차시를 모두 끝냈어요!"}</p>` : ""}
          ${up && !lessonNow ? `<p class="cover-d">이제 <b>${["", "보통", "어려움"][level]}</b>에 도전해 볼까요?</p>` : ""}
          <div class="cover-btns"><button type="button" class="ghost" data-a="again">다시 하기</button>${up ? '<button type="button" class="ghost" data-a="up">난이도 올리기</button>' : ""}${nxt ? '<button type="button" class="primary" data-a="next">다음 활동 ▶</button>' : nextLesson ? '<button type="button" class="primary" data-a="nl">다음 차시로 ▶</button>' : '<button type="button" class="primary" data-a="close">목록으로</button>'}</div></div>`;
        arena.append(cov);
        setTimeout(stopRun, 0);
        cov.querySelector('[data-a="again"]').onclick = () => openAct(l, i);
        const u = cov.querySelector('[data-a="up"]'); if (u) u.onclick = () => { LV[aid] = level + 1; saveLv(); openAct(l, i); };
        const nx = cov.querySelector('[data-a="next"]'); if (nx) nx.onclick = () => openAct(l, i + 1);
        const nl = cov.querySelector('[data-a="nl"]'); if (nl) nl.onclick = () => { CUR = nextLesson; closeAct(); };
        const cl = cov.querySelector('[data-a="close"]'); if (cl) cl.onclick = closeAct;
        renderList(); renderDetail();
      }
    };
    A.run(ctx);
  };
  if (A.type === "game") {
    const cov = document.createElement("div"); cov.className = "cover";
    cov.innerHTML = `<div class="cover-card"><div class="cover-ic">${A.icon}</div><p class="cover-t">${esc(A.name)}</p><p class="cover-d">${esc(A.desc)}</p>${A.noLevel ? "" : `<p class="cover-d">난이도: <b>${["쉬움", "보통", "어려움"][level - 1]}</b></p>`}<p class="cover-d">내 최고 기록 <span class="stars">${starsHTML(actStars(l.id, aid))}</span></p><div class="cover-btns"><button type="button" class="primary" data-a="go">시작!</button></div></div>`;
    arena.append(cov);
    cov.querySelector('[data-a="go"]').onclick = () => setTimeout(start, 0);
  } else start();
}
function closeAct() { stopRun(); if (run) run.ended = true; ov.hidden = true; document.body.style.overflow = ""; arena.innerHTML = ""; if (ME) { renderList(); renderDetail(); } }
$("#pX").onclick = closeAct;
document.addEventListener("keydown", e => { if (e.key === "Escape" && !ov.hidden && run && !WIDE.has(run.type) && run.type !== "guide") closeAct(); });
$("#lOut").onclick = () => {
  if (ME && ME.preview) { ME = null; startTeach(); return; }
  if (queue.length) { toast("기록을 저장하는 중이에요. 잠깐만 기다려 주세요."); flush(); return; }
  ME = null; SES = null; saveSes(); homeClass = null; renderHome();
};

/* ================= 선생님 ================= */
let T = { classes: [], students: [], cls: null, sel: new Set(), view: "list", sort: "name", auto: true, at: null, timer: null };
function teacherLogin() {
  const d = modal(`<form class="tl"><h3>선생님 로그인</h3><p class="pad-sub">선생님 비밀번호를 입력하세요.</p><input type="password" id="tPw" autocomplete="off" aria-label="선생님 비밀번호"><p class="pad-err"></p><div class="row"><button type="button" class="ghost" data-close>취소</button><button type="submit" class="primary">들어가기</button></div></form>`);
  const inp = d.querySelector("input"); setTimeout(() => inp.focus(), 0);
  d.querySelector("form").onsubmit = async e => {
    e.preventDefault();
    const r = await call("t_check", { tpw: inp.value });
    if (!r.ok) { d.querySelector(".pad-err").textContent = errText(r); inp.value = ""; inp.focus(); return; }
    SES = { role: "teacher", tpw: inp.value }; saveSes(); d.remove(); startTeach();
  };
}
async function loadT() {
  const r = await call("t_all", { tpw: SES.tpw });
  if (!r.ok) { toast(errText(r), true); if (r.error === "tpw") { SES = null; saveSes(); renderHome(); } return false; }
  T.classes = r.classes; T.students = r.students;
  if (T.cls !== "ALL" && (!T.cls || !T.classes.some(c => c.id === T.cls))) T.cls = T.classes[0] ? T.classes[0].id : null;
  T.at = new Date();
  return true;
}
async function startTeach() { show("teach"); $("#tDemo").hidden = !DEMO; if (await loadT()) renderTeach(); }
const studentsOf = cid => T.students.filter(s => s.classId === cid);
function progressOf(s) {
  const mine = LESSONS.filter(l => (s.assigned || []).includes(l.id));
  const st = s.stars || {};
  const done = mine.filter(l => l.acts.every(a => (Number(st[l.id + ":" + a]) || 0) >= 3));
  const now = mine.find(l => !done.includes(l));
  const starSum = mine.reduce((t, l) => t + l.acts.reduce((u, a) => u + (Number(st[l.id + ":" + a]) || 0), 0), 0);
  const starMax = mine.reduce((t, l) => t + l.acts.length * 3, 0);
  const nowActs = now ? now.acts.filter(a => (Number(st[now.id + ":" + a]) || 0) >= 3).length : 0;
  return { mine, done, now, starSum, starMax, nowActs };
}
function rangeText(ids) {
  const mine = LESSONS.filter(l => ids.includes(l.id));
  if (!mine.length) return `<span class="muted">정하지 않음</span>`;
  return COURSES.map(c => {
    const nos = mine.filter(l => l.course === c).map(l => l.no);
    if (!nos.length) return "";
    const parts = []; let a = nos[0], b = nos[0];
    for (let k = 1; k <= nos.length; k++) { if (nos[k] === b + 1) b = nos[k]; else { parts.push(a === b ? `${a}` : `${a}~${b}`); a = b = nos[k]; } }
    return `<span class="chip">${stage(c)} ${parts.join(", ")}차시</span>`;
  }).join(" ");
}
function renderTeach() {
  const cl = T.classes.find(c => c.id === T.cls);
  $("#tAllBoard").classList.toggle("on", T.cls === "ALL");
  $("#tClasses").innerHTML = T.classes.map(c => `<button type="button" class="tc ${c.id === T.cls ? "on" : ""}" data-id="${esc(c.id)}" style="--cc:${esc(c.color)}"><i></i><span>${esc(c.name)}</span><small>${studentsOf(c.id).length}명</small></button>`).join("") || `<p class="muted">아직 반이 없어요.</p>`;
  $("#tClasses").querySelectorAll(".tc").forEach(b => b.onclick = () => { T.cls = b.dataset.id; T.sel.clear(); renderTeach(); });
  const m = $("#tMain");
  setAuto();
  if (T.cls === "ALL") { renderBoard(m, null); return; }
  if (!cl) { m.innerHTML = `<div class="t-empty"><h2>반을 먼저 만들어 주세요</h2><p>왼쪽의 <b>＋ 반 만들기</b>를 누르면 반 이름과 입장 코드를 정할 수 있어요.</p></div>`; return; }
  const ss = studentsOf(cl.id);
  T.sel.forEach(id => { if (!ss.some(s => s.id === id)) T.sel.delete(id); });
  const n = T.sel.size;
  m.innerHTML = `<div class="t-head" style="--cc:${esc(cl.color)}"><i class="t-dot"></i><h2>${esc(cl.name)}</h2><span class="t-code">입장 코드 <b>${esc(cl.code)}</b></span><span class="sp"></span><button type="button" class="ghost sm" data-a="editCls">반 수정</button><button type="button" class="ghost sm danger" data-a="delCls">반 삭제</button></div>
    <div class="t-tabs"><button type="button" data-v="list" class="${T.view === "list" ? "on" : ""}">👥 학생 관리</button><button type="button" data-v="board" class="${T.view === "board" ? "on" : ""}">📊 진도판 <small>한눈에 보기</small></button></div>
    <div id="tView"></div>`;
  m.querySelectorAll(".t-tabs [data-v]").forEach(b => b.onclick = () => { T.view = b.dataset.v; renderTeach(); });
  const act0 = (a, f) => { const b = m.querySelector(`[data-a="${a}"]`); if (b) b.onclick = f; };
  act0("editCls", () => editClass(cl));
  act0("delCls", () => confirmBox(`<b>${esc(cl.name)}</b>을(를) 지울까요?<br>이 반 학생 ${ss.length}명과 진도도 함께 지워져요.`, "반 삭제", async () => { const r = await call("t_delClass", { tpw: SES.tpw, id: cl.id }); if (!r.ok) return toast(errText(r), true); T.cls = null; await loadT(); renderTeach(); toast("반을 지웠어요."); }));
  if (T.view === "board") { renderBoard($("#tView"), cl); return; }
  $("#tView").innerHTML = `
    <div class="t-tools">
      <button type="button" class="primary sm" data-a="add">＋ 학생 추가</button>
      <span class="t-selinfo">${n ? `<b>${n}명</b> 선택함` : "학생을 체크해서 고르세요"}</span>
      <button type="button" class="ghost sm" data-a="assign" ${n ? "" : "disabled"}>📚 차시 정하기</button>
      <button type="button" class="ghost sm" data-a="print" ${n ? "" : "disabled"}>🖨 결과 출력</button>
      <button type="button" class="ghost sm" data-a="reset" ${n ? "" : "disabled"}>↺ 진도 초기화</button>
      <button type="button" class="ghost sm danger" data-a="del" ${n ? "" : "disabled"}>학생 삭제</button>
      <span class="sp"></span>
      <button type="button" class="ghost sm" data-a="classPrint" ${ss.length ? "" : "disabled"}>🖨 반 결과표</button>
      <button type="button" class="ghost sm" data-a="refresh">⟳ 새로 고침</button>
    </div>
    <div class="t-tablewrap"><table class="t-table"><thead><tr><th><input type="checkbox" id="tAll" aria-label="전체 선택" ${ss.length && n === ss.length ? "checked" : ""}></th><th>이름</th><th>비밀번호</th><th>정한 차시</th><th>지금 할 차시</th><th>완료</th><th>별</th><th>마지막 학습</th><th></th></tr></thead>
    <tbody>${ss.map(s => { const p = progressOf(s); return `<tr class="${T.sel.has(s.id) ? "sel" : ""}"><td><input type="checkbox" data-sel="${esc(s.id)}" ${T.sel.has(s.id) ? "checked" : ""} aria-label="${esc(s.name)} 선택"></td><td><b>${esc(s.name)}</b></td><td class="mono">${esc(s.pw)}</td><td>${rangeText(s.assigned || [])}</td><td>${p.now ? `${esc(lname(p.now))} <small class="muted">${esc(p.now.title)} · 활동 ${p.nowActs}/${p.now.acts.length}</small>` : p.mine.length ? `<span class="ok">✔ 모두 완료</span>` : "-"}</td><td class="num">${p.done.length}/${p.mine.length}</td><td class="num">${p.starSum}/${p.starMax}</td><td class="muted">${fmtTime(s.last)}</td><td class="acts-c"><button type="button" class="ghost xs" data-view="${esc(s.id)}">기록 보기</button><button type="button" class="ghost xs" data-edit="${esc(s.id)}">수정</button></td></tr>`; }).join("") || `<tr><td colspan="10" class="muted center">아직 학생이 없어요. <b>＋ 학생 추가</b>를 눌러 주세요.</td></tr>`}</tbody></table></div>`;
  const all = $("#tAll");
  if (all) all.onchange = () => { T.sel = new Set(all.checked ? ss.map(s => s.id) : []); renderTeach(); };
  m.querySelectorAll("[data-sel]").forEach(cb => cb.onchange = () => { cb.checked ? T.sel.add(cb.dataset.sel) : T.sel.delete(cb.dataset.sel); renderTeach(); });
  m.querySelectorAll("[data-view]").forEach(b => b.onclick = () => viewStudent(b.dataset.view));
  m.querySelectorAll("[data-edit]").forEach(b => b.onclick = () => editStudent(b.dataset.edit));
  const act = (a, f) => { const b = m.querySelector(`[data-a="${a}"]`); if (b) b.onclick = f; };
  act("add", () => addStudents(cl));
  act("assign", () => assignLessons([...T.sel]));
  act("print", () => printStudents([...T.sel]));
  act("classPrint", () => printClass(cl));
  act("refresh", async () => { if (await loadT()) { renderTeach(); toast("새로 불러왔어요."); } });
  act("reset", () => confirmBox(`선택한 <b>${n}명</b>의 별과 진도를 모두 지울까요?<br>학습 기록(로그)은 남아요.`, "진도 초기화", async () => { const r = await call("t_reset", { tpw: SES.tpw, ids: [...T.sel] }); if (!r.ok) return toast(errText(r), true); await loadT(); renderTeach(); toast("진도를 초기화했어요."); }));
  act("del", () => confirmBox(`선택한 <b>${n}명</b>을 지울까요? 진도도 함께 지워져요.`, "학생 삭제", async () => { const r = await call("t_delStudents", { tpw: SES.tpw, ids: [...T.sel] }); if (!r.ok) return toast(errText(r), true); T.sel.clear(); await loadT(); renderTeach(); toast("학생을 지웠어요."); }));
}
/* ---------- 진도판 ---------- */
const ago = iso => {
  if (!iso) return null;
  const d = new Date(iso); if (isNaN(d)) return null;
  const m = Math.floor((Date.now() - d) / 60000);
  if (m < 1) return "방금";
  if (m < 60) return `${m}분 전`;
  if (new Date().toDateString() === d.toDateString()) return `오늘 ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return fmtTime(iso);
};
const liveOf = iso => { if (!iso) return "off"; const m = (Date.now() - new Date(iso)) / 60000; return m < 5 ? "on" : m < 30 ? "mid" : "off"; };
function setAuto() {
  const want = T.auto && (T.view === "board" || T.cls === "ALL") && !$("#teach").hidden;
  if (want && !T.timer) T.timer = setInterval(async () => {
    if ($("#teach").hidden || !(T.view === "board" || T.cls === "ALL")) { clearInterval(T.timer); T.timer = null; return; }
    if (document.querySelector(".mdlg")) return;
    try { const r = await api("t_all", { tpw: SES.tpw }); if (r.ok) { T.classes = r.classes; T.students = r.students; T.at = new Date(); renderTeach(); } } catch (e) {}
  }, 30000);
  if (!want && T.timer) { clearInterval(T.timer); T.timer = null; }
}
function renderBoard(box, cl) {
  const ss = (cl ? studentsOf(cl.id) : T.students.slice()).map(s => ({ s, p: progressOf(s) }));
  const clsName = id => { const c = T.classes.find(x => x.id === id); return c ? c.name : ""; };
  const used = LESSONS.filter(l => ss.some(x => (x.s.assigned || []).includes(l.id)));
  const pct = x => x.p.starMax ? x.p.done.length / Math.max(1, x.p.mine.length) + x.p.starSum / x.p.starMax / 100 : -1;
  if (T.sort === "slow") ss.sort((a, b) => pct(a) - pct(b));
  else if (T.sort === "fast") ss.sort((a, b) => pct(b) - pct(a));
  else if (T.sort === "recent") ss.sort((a, b) => String(b.s.last).localeCompare(String(a.s.last)));
  else ss.sort((a, b) => (cl ? 0 : clsName(a.s.classId).localeCompare(clsName(b.s.classId), "ko")) || a.s.name.localeCompare(b.s.name, "ko"));
  const live = ss.filter(x => liveOf(x.s.last) === "on").length;
  const allDone = ss.filter(x => x.p.mine.length && !x.p.now).length;
  const noPlan = ss.filter(x => !x.p.mine.length).length;
  const head = cl ? "" : `<div class="t-head"><h2>📊 모든 반 진도판</h2><span class="sp"></span></div>`;
  box.innerHTML = head + `<div class="bd-top">
      <span class="bd-chip">학생 <b>${ss.length}</b>명</span>
      <span class="bd-chip on">🟢 지금 학습 중 <b>${live}</b>명</span>
      <span class="bd-chip">✔ 정한 차시 모두 끝냄 <b>${allDone}</b>명</span>
      ${noPlan ? `<span class="bd-chip warn">차시를 안 정한 학생 <b>${noPlan}</b>명</span>` : ""}
      <span class="sp"></span>
      <label class="bd-sort">정렬 <select id="bdSort"><option value="name">이름순</option><option value="slow">느린 학생 먼저</option><option value="fast">빠른 학생 먼저</option><option value="recent">최근 학습 순</option></select></label>
      <label class="bd-auto"><input type="checkbox" id="bdAuto" ${T.auto ? "checked" : ""}> 30초마다 자동 새로 고침</label>
      <button type="button" class="ghost sm" id="bdRe">⟳ 지금 새로 고침</button>
      <span class="muted bd-at">${T.at ? `${String(T.at.getHours()).padStart(2, "0")}:${String(T.at.getMinutes()).padStart(2, "0")}:${String(T.at.getSeconds()).padStart(2, "0")} 기준` : ""}</span>
    </div>
    <p class="bd-legend"><span><i class="s3"></i>별 3개(통과)</span><span><i class="s1"></i>도전 중</span><span><i class="s0"></i>아직 안 함</span><span><b class="cur-k">테두리</b> 지금 할 차시</span><span>칸 안 점 하나 = 활동 하나</span></p>
    ${ss.length ? `<div class="bd-wrap"><table class="bd"><thead><tr><th class="bd-n">이름</th>${cl ? "" : "<th>반</th>"}<th>상태</th><th class="bd-now">지금 할 것</th>${used.map(l => `<th class="bd-l" title="${esc(lname(l) + " " + l.title)}">${stage(l.course).replace("단계", "")}-${l.no}</th>`).join("")}<th>완료</th><th>별</th></tr></thead>
    <tbody>${ss.map(({ s, p }) => {
      const st = s.stars || {}, lv = liveOf(s.last), a = ago(s.last);
      let nowTxt = p.mine.length ? `<span class="ok">✔ 모두 끝냄</span>` : `<span class="muted">차시 안 정함</span>`;
      if (p.now) {
        const k = p.now.acts.findIndex(x => (Number(st[p.now.id + ":" + x]) || 0) < 3), A = ACTS[p.now.acts[k]];
        nowTxt = `<b>${esc(lname(p.now))}</b> <span class="muted">${esc(p.now.title)}</span><div class="bd-bar"><i style="width:${Math.round(p.nowActs / p.now.acts.length * 100)}%"></i></div><small>${p.nowActs}/${p.now.acts.length} · 다음: ${A ? esc(A.name) : ""}</small>`;
      }
      return `<tr class="lv-${lv}"><th class="bd-n"><button type="button" class="bd-name" data-view="${esc(s.id)}">${esc(s.name)}</button></th>${cl ? "" : `<td class="nw muted">${esc(clsName(s.classId))}</td>`}<td class="nw"><span class="lv-dot"></span>${a || "-"}</td><td class="bd-now">${nowTxt}</td>${used.map(l => {
        if (!(s.assigned || []).includes(l.id)) return `<td class="bd-x"></td>`;
        const sc = l.acts.map(x => Number(st[l.id + ":" + x]) || 0), done = sc.every(x => x >= 3);
        return `<td class="bd-c ${done ? "done" : ""} ${p.now === l ? "cur" : ""}" title="${esc(lname(l) + " " + l.title)} · ${l.acts.map((x, i) => `${ACTS[x].name}: 별 ${sc[i]}개`).join(" · ")}">${done ? "✔" : `<span class="bd-dots">${sc.map(x => `<i class="${x >= 3 ? "s3" : x > 0 ? "s1" : "s0"}"></i>`).join("")}</span>`}</td>`;
      }).join("")}<td class="num c">${p.done.length}/${p.mine.length}</td><td class="num c">${p.starSum}</td></tr>`;
    }).join("")}</tbody></table></div>` : `<p class="muted center">학생이 없어요.</p>`}
    <p class="muted bd-tip">이름을 누르면 그 학생의 자세한 기록이 열려요. 상태: 🟢 5분 안에 활동함 · 🟡 30분 안 · ⚪ 그 전</p>`;
  const so = box.querySelector("#bdSort"); so.value = T.sort; so.onchange = () => { T.sort = so.value; renderTeach(); };
  box.querySelector("#bdAuto").onchange = e => { T.auto = e.target.checked; setAuto(); };
  box.querySelector("#bdRe").onclick = async () => { if (await loadT()) renderTeach(); };
  box.querySelectorAll("[data-view]").forEach(b => b.onclick = () => viewStudent(b.dataset.view));
}
function confirmBox(msg, okText, fn) {
  const d = modal(`<h3>확인</h3><p>${msg}</p><div class="row"><button type="button" class="ghost" data-close>취소</button><button type="button" class="primary danger-b" data-ok>${okText}</button></div>`);
  d.querySelector("[data-ok]").onclick = async () => { d.remove(); await fn(); };
}
function editClass(cl) {
  const color = cl ? cl.color : COLORS[T.classes.length % COLORS.length];
  const d = modal(`<form class="tf"><h3>${cl ? "반 수정" : "반 만들기"}</h3>
    <label>반 이름<input name="name" required maxlength="20" placeholder="예: 3학년 2반, 화요일 컴퓨터반" value="${cl ? esc(cl.name) : ""}"></label>
    <label>입장 코드 <small>(숫자 2~8자리 · 아이들이 숫자 패드로 눌러요)</small><input name="code" required inputmode="numeric" pattern="\\d{2,8}" maxlength="8" value="${cl ? esc(cl.code) : String(Math.floor(1000 + Math.random() * 9000))}"></label>
    <div class="tf-l">반 색깔</div><div class="swatches">${COLORS.map(c => `<label class="sw-c"><input type="radio" name="color" value="${c}" ${c === color ? "checked" : ""}><i style="background:${c}"></i></label>`).join("")}</div>
    <p class="pad-err"></p><div class="row"><button type="button" class="ghost" data-close>취소</button><button type="submit" class="primary">저장</button></div></form>`);
  setTimeout(() => d.querySelector('[name="name"]').focus(), 0);
  d.querySelector("form").onsubmit = async e => {
    e.preventDefault();
    const f = e.target;
    const cls = { id: cl && cl.id, name: f.name.value.trim(), code: f.code.value.trim(), color: f.color.value };
    const r = await call("t_saveClass", { tpw: SES.tpw, cls });
    if (!r.ok) { d.querySelector(".pad-err").textContent = errText(r); return; }
    d.remove(); await loadT();
    if (!cl) { const c = T.classes.find(x => x.name === cls.name && x.code === cls.code); if (c) T.cls = c.id; }
    renderTeach(); toast(cl ? "반 정보를 바꿨어요." : "반을 만들었어요.");
  };
}
function parseLines(txt, cid) {
  const out = [], bad = [];
  txt.split(/\n/).map(x => x.trim()).filter(Boolean).forEach(line => {
    const t = line.split(/[\s,\t]+/).filter(Boolean);
    let pw = "";
    if (t.length >= 2 && /^\d+$/.test(t[t.length - 1])) pw = t.pop();
    const name = t.join(" ");
    if (!name || /^\d+$/.test(name) || (pw && !/^\d{4,8}$/.test(pw))) { bad.push(line); return; }
    out.push({ classId: cid, name, pw });
  });
  return { out, bad };
}
function addStudents(cl) {
  const d = modal(`<form class="tf"><h3>${esc(cl.name)} · 학생 추가</h3>
    <p class="pad-sub">한 줄에 한 명씩 <b>이름 비밀번호</b>를 적어요. 비밀번호는 숫자 4~8자리(학번도 돼요)이고, 비워 두면 숫자 4자리가 자동으로 만들어져요. 엑셀에서 두 칸을 복사해 붙여 넣어도 돼요.</p>
    <textarea name="lines" rows="10" placeholder="김하늘 30201&#10;이바다 30202&#10;박산"></textarea>
    <p class="pad-err"></p><div class="row"><button type="button" class="ghost" data-close>취소</button><button type="submit" class="primary">추가하기</button></div></form>`, "wide-m");
  setTimeout(() => d.querySelector("textarea").focus(), 0);
  d.querySelector("form").onsubmit = async e => {
    e.preventDefault();
    const { out, bad } = parseLines(e.target.lines.value, cl.id);
    if (bad.length) { d.querySelector(".pad-err").innerHTML = `이 줄은 알아볼 수 없어요: <b>${esc(bad[0])}</b> (이름 뒤에 한 칸 띄우고 숫자 4~8자리 비밀번호를 적어 주세요)`; return; }
    if (!out.length) { d.querySelector(".pad-err").textContent = "학생을 한 명 이상 적어 주세요."; return; }
    const names = out.map(o => o.name);
    const dupIn = names.find((n, k) => names.indexOf(n) !== k);
    if (dupIn) { d.querySelector(".pad-err").textContent = `'${dupIn}' 이름이 두 번 있어요. 같은 이름이면 '김하늘A', '김하늘B'처럼 구별해 주세요.`; return; }
    const dup = out.find(o => studentsOf(cl.id).some(s => s.name === o.name));
    if (dup) { d.querySelector(".pad-err").textContent = `'${dup.name}'은(는) 이미 이 반에 있어요. 고치려면 그 학생의 [수정]을 눌러요.`; return; }
    const r = await call("t_saveStudents", { tpw: SES.tpw, list: out });
    if (!r.ok) { d.querySelector(".pad-err").textContent = errText(r); return; }
    d.remove(); await loadT(); renderTeach(); toast(`${out.length}명을 추가했어요.`);
  };
}
function editStudent(id) {
  const s = T.students.find(x => x.id === id);
  const d = modal(`<form class="tf"><h3>학생 정보 수정</h3>
    <label>이름<input name="name" required maxlength="20" value="${esc(s.name)}"></label>
    <label>비밀번호 <small>(숫자 4~8자리)</small><input name="pw" required inputmode="numeric" pattern="\\d{4,8}" maxlength="8" value="${esc(s.pw)}"></label>
    <p class="pad-err"></p><div class="row"><button type="button" class="ghost" data-close>취소</button><button type="submit" class="primary">저장</button></div></form>`);
  d.querySelector("form").onsubmit = async e => {
    e.preventDefault();
    const f = e.target;
    const r = await call("t_saveStudents", { tpw: SES.tpw, list: [{ id: s.id, classId: s.classId, name: f.name.value.trim(), pw: f.pw.value.trim() }] });
    if (!r.ok) { d.querySelector(".pad-err").textContent = errText(r); return; }
    d.remove(); await loadT(); renderTeach(); toast("학생 정보를 바꿨어요.");
  };
}
function assignLessons(ids) {
  const first = T.students.find(s => s.id === ids[0]);
  const cur = new Set(first ? first.assigned || [] : []);
  const d = modal(`<h3>차시 정하기 · ${ids.length}명</h3>
    <p class="pad-sub">체크한 차시만 학생에게 보여요. 그중 <b>앞 차시를 다 끝내야 다음 차시가 열려요.</b> 이미 끝낸 차시의 별은 지워지지 않아요.</p>
    <div class="as-quick"><button type="button" class="ghost xs" data-q="intro">0단계 전체</button><button type="button" class="ghost xs" data-q="easy">1단계 전체</button><button type="button" class="ghost xs" data-q="win">2단계 전체</button><button type="button" class="ghost xs" data-q="all">모두</button><button type="button" class="ghost xs" data-q="none">모두 해제</button></div>
    <div class="as-grid">${COURSES.map(c => `<div class="as-col"><div class="as-h">${esc(c.name)}</div>${c.lessons.map(l => `<label class="as-l"><input type="checkbox" value="${l.id}" ${cur.has(l.id) ? "checked" : ""}><span><b>${l.no}차시</b> ${esc(l.title)}</span></label>`).join("")}</div>`).join("")}</div>
    <div class="row"><button type="button" class="ghost" data-close>취소</button><button type="button" class="primary" data-ok>저장</button></div>`, "wide-m");
  const boxes = [...d.querySelectorAll(".as-l input")];
  d.querySelectorAll("[data-q]").forEach(b => b.onclick = () => {
    const q = b.dataset.q;
    boxes.forEach(x => { const l = LMAP[x.value]; if (q === "all") x.checked = true; else if (q === "none") x.checked = false; else if (l.course.id === q) x.checked = true; });
  });
  d.querySelector("[data-ok]").onclick = async () => {
    const lessons = boxes.filter(x => x.checked).map(x => x.value);
    const r = await call("t_assign", { tpw: SES.tpw, ids, lessons });
    if (!r.ok) return toast(errText(r), true);
    d.remove(); await loadT(); renderTeach(); toast(`${ids.length}명의 차시를 정했어요.`);
  };
}
function lessonRows(s) {
  const st = s.stars || {};
  return LESSONS.filter(l => (s.assigned || []).includes(l.id)).map(l => {
    const sc = l.acts.map(a => Number(st[l.id + ":" + a]) || 0);
    const done = sc.every(x => x >= 3), started = sc.some(x => x > 0);
    return { l, sc, done, started };
  });
}
async function viewStudent(id) {
  const s = T.students.find(x => x.id === id), cl = T.classes.find(c => c.id === s.classId);
  const r = await call("t_logs", { tpw: SES.tpw, ids: [id] });
  const logs = (r.ok ? r.logs : []).slice().sort((a, b) => String(b.time).localeCompare(String(a.time)));
  const p = progressOf(s), rows = lessonRows(s);
  const total = logs.reduce((t, x) => t + (Number(x.secs) || 0), 0);
  const d = modal(`<div class="sv-h"><h3>${esc(s.name)} <small class="muted">${esc(cl ? cl.name : "")}</small></h3><span class="sp"></span><button type="button" class="ghost sm" data-print>🖨 출력</button><button type="button" class="ghost sm" data-close>닫기</button></div>
    <div class="sv-sum"><div><b>${p.done.length}/${p.mine.length}</b><span>완료 차시</span></div><div><b>${p.starSum}/${p.starMax}</b><span>받은 별</span></div><div><b>${fmtSecs(total)}</b><span>학습 시간</span></div><div><b>${logs.length}번</b><span>활동 기록</span></div><div><b>${fmtTime(s.last)}</b><span>마지막 학습</span></div></div>
    <h4>차시별 진도</h4>
    ${rows.length ? `<div class="sv-ls">${rows.map(x => `<div class="sv-l ${x.done ? "done" : x.started ? "ing" : ""}"><div class="sv-lh"><b>${esc(lname(x.l))}</b> ${esc(x.l.title)}<span class="sv-tag">${x.done ? "완료" : x.started ? "하는 중" : "시작 전"}</span></div><div class="sv-acts">${x.l.acts.map((a, k) => `<span class="sv-a ${x.sc[k] >= 3 ? "ok" : ""}">${ACTS[a].icon} ${esc(ACTS[a].name)} <i class="stars">${starsHTML(x.sc[k])}</i></span>`).join("")}</div></div>`).join("")}</div>` : `<p class="muted">정한 차시가 없어요.</p>`}
    <h4>활동 기록 <small class="muted">(최근 순)</small></h4>
    ${logs.length ? `<div class="t-tablewrap"><table class="t-table small"><thead><tr><th>날짜·시각</th><th>차시</th><th>활동</th><th>별</th><th>걸린 시간</th><th>결과</th></tr></thead><tbody>${logs.map(x => { const l = LMAP[x.lid], A = ACTS[x.aid]; return `<tr><td>${fmtTime(x.time)}</td><td>${l ? esc(lname(l)) : esc(x.lid)}</td><td>${A ? esc(A.name) : esc(x.aid)}</td><td class="stars">${starsHTML(Number(x.stars) || 0)}</td><td>${fmtSecs(x.secs)}</td><td class="${x.ok === "통과" ? "ok" : "bad"}">${esc(x.ok)}</td></tr>`; }).join("")}</tbody></table></div>` : `<p class="muted">아직 기록이 없어요.</p>`}`, "xwide-m");
  d.querySelector("[data-print]").onclick = () => printStudents([id]);
}

/* ================= 출력 ================= */
function doPrint(html) {
  const p = $("#print");
  p.innerHTML = html;
  setTimeout(() => { window.print(); }, 150);
}
const todayText = () => { const d = new Date(); return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`; };
async function printStudents(ids) {
  const r = await call("t_logs", { tpw: SES.tpw, ids });
  if (!r.ok) return toast(errText(r), true);
  const html = ids.map(id => {
    const s = T.students.find(x => x.id === id); if (!s) return "";
    const cl = T.classes.find(c => c.id === s.classId), p = progressOf(s), rows = lessonRows(s);
    const logs = r.logs.filter(x => x.sid === id).sort((a, b) => String(a.time).localeCompare(String(b.time)));
    const total = logs.reduce((t, x) => t + (Number(x.secs) || 0), 0);
    const days = new Set(logs.map(x => String(x.time).slice(0, 10))).size;
    return `<section class="pr-page">
      <header class="pr-h"><div><div class="pr-brand">Comcosam · 컴코샘의 컴퓨터 기초 단계별학습</div><h1>학습 결과표</h1></div><div class="pr-who"><div>${esc(cl ? cl.name : "")}</div><div><b>${esc(s.name)}</b></div><div>${todayText()} 출력</div></div></header>
      <div class="pr-sum"><div><b>${p.done.length} / ${p.mine.length}</b>완료한 차시</div><div><b>${p.starSum} / ${p.starMax}</b>받은 별</div><div><b>${fmtSecs(total)}</b>학습 시간</div><div><b>${days}일</b>학습한 날</div></div>
      <h2>차시별 결과</h2>
      <table class="pr-t"><thead><tr><th>차시</th><th>배운 내용</th><th>활동별 별</th><th>결과</th></tr></thead><tbody>${rows.map(x => `<tr><td class="nw">${esc(lname(x.l))}</td><td>${esc(x.l.title)}</td><td>${x.l.acts.map((a, k) => `<div class="pr-a"><span>${esc(ACTS[a].name)}</span><span class="pr-s">${"★".repeat(x.sc[k])}${"☆".repeat(3 - x.sc[k])}</span></div>`).join("")}</td><td class="nw">${x.done ? "✔ 완료" : x.started ? "하는 중" : "시작 전"}</td></tr>`).join("") || `<tr><td colspan="4">정한 차시가 없어요.</td></tr>`}</tbody></table>
      <h2>학습 기록 <small>(최근 ${Math.min(30, logs.length)}개)</small></h2>
      <table class="pr-t small"><thead><tr><th>날짜·시각</th><th>차시</th><th>활동</th><th>별</th><th>걸린 시간</th><th>결과</th></tr></thead><tbody>${logs.slice(-30).map(x => { const l = LMAP[x.lid], A = ACTS[x.aid]; return `<tr><td class="nw">${fmtTime(x.time)}</td><td class="nw">${l ? esc(lname(l)) : ""}</td><td>${A ? esc(A.name) : ""}</td><td class="nw">${"★".repeat(Number(x.stars) || 0)}${"☆".repeat(3 - (Number(x.stars) || 0))}</td><td class="nw">${fmtSecs(x.secs)}</td><td class="nw">${esc(x.ok)}</td></tr>`; }).join("") || `<tr><td colspan="6">아직 기록이 없어요.</td></tr>`}</tbody></table>
      <div class="pr-note"><b>선생님 한마디</b><div></div></div>
    </section>`;
  }).join("");
  doPrint(html);
}
function printClass(cl) {
  const ss = studentsOf(cl.id);
  const used = LESSONS.filter(l => ss.some(s => (s.assigned || []).includes(l.id)));
  const html = `<section class="pr-page land">
    <header class="pr-h"><div><div class="pr-brand">Comcosam · 컴코샘의 컴퓨터 기초 단계별학습</div><h1>${esc(cl.name)} 진도표</h1></div><div class="pr-who"><div>학생 ${ss.length}명</div><div>${todayText()} 출력</div></div></header>
    <p class="pr-legend">✔ 완료 · △ 하는 중 · ○ 시작 전 · 빈칸: 정하지 않은 차시</p>
    <table class="pr-t grid"><thead><tr><th>번호</th><th>이름</th>${used.map(l => `<th title="${esc(l.title)}">${stage(l.course).replace("단계", "")}-${l.no}</th>`).join("")}<th>완료</th><th>별</th></tr></thead>
    <tbody>${ss.map(s => { const st = s.stars || {}, p = progressOf(s); return `<tr><td class="nw">${esc(s.name)}</td>${used.map(l => { if (!(s.assigned || []).includes(l.id)) return "<td></td>"; const sc = l.acts.map(a => Number(st[l.id + ":" + a]) || 0); return `<td class="c">${sc.every(x => x >= 3) ? "✔" : sc.some(x => x > 0) ? "△" : "○"}</td>`; }).join("")}<td class="c">${p.done.length}/${p.mine.length}</td><td class="c">${p.starSum}</td></tr>`; }).join("")}</tbody></table>
    <p class="pr-legend">${used.map(l => `${stage(l.course).replace("단계", "")}-${l.no} ${esc(l.title)}`).join(" · ")}</p>
  </section>`;
  doPrint(html);
}

/* ================= 연결 ================= */
document.addEventListener("keydown", e => { if (e.key !== "Escape") return; const m = [...document.querySelectorAll(".mdlg")].pop(); if (m && !m.contains(e.target)) m.remove(); });
$("#hTeacher").onclick = teacherLogin;
$("#tOut").onclick = () => { SES = null; saveSes(); T = { classes: [], students: [], cls: null, sel: new Set() }; homeClass = null; renderHome(); };
$("#tNew").onclick = () => editClass(null);
$("#tAllBoard").onclick = () => { T.cls = "ALL"; T.sel.clear(); renderTeach(); };
$("#tPreview").onclick = () => { startLearn({ preview: true, name: "선생님", stars: {}, assigned: [] }); };

(async function boot() {
  if (SES && SES.role === "student") {
    const r = await call("login", { sid: SES.sid, pw: SES.pw });
    if (r.ok) return startLearn(r.student);
    SES = null; saveSes();
  } else if (SES && SES.role === "teacher") return startTeach();
  renderHome();
})();
})();
