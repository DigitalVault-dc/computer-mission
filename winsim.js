// 연습용 윈도우 화면 (Windows 11 모양을 단순하게 흉내 냄)
(function () {
const el = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const EMO = { 강아지: "🐶", 고양이: "🐱", 토끼: "🐰", 바다: "🌊", 하늘: "☁️", 꽃: "🌸", 산: "⛰️", 보물지도: "🗺️", 사과: "🍎", 공룡: "🦖", 로켓: "🚀", 무지개: "🌈", 햄스터: "🐹", 나비: "🦋", 수박: "🍉", 눈사람: "⛄", 자동차: "🚗", 피자: "🍕", 왕관: "👑", 우주: "🪐", 케이크: "🎂", 바나나: "🍌", 딸기: "🍓", 포도: "🍇", 곰: "🐻", 사자: "🦁", 오리: "🦆", 기차: "🚂", 비행기: "✈️", 보석: "💎", 공: "⚽", 별: "⭐" };
const SPECIAL = [["DESK", "바탕 화면", "🖥️"], ["DOCS", "문서", "📑"], ["PICS", "사진", "🖼️"], ["MUS", "음악", "🎵"], ["DOWN", "다운로드", "⬇️"]];
const KIND = { jpg: "사진", txt: "텍스트 문서", mp3: "음악" };
const BAD = /[\\/:*?"<>|]/;

class Sim {
  constructor(host, o = {}) {
    this.o = o; this.k = 0; this.nodes = new Map(); this.wins = []; this.z = 10;
    this.sel = { view: null, ids: new Set() }; this.anchor = null; this.clip = null; this.undoStack = [];
    this.active = "desk"; this.renaming = null; this.textClip = ""; this.flags = {}; this.log = [];
    for (const [id, name] of SPECIAL) this.nodes.set(id, { id, name, type: "folder", parent: "PC", sys: true });
    this.build(host);
    if (o.setup) o.setup(this);
    this.refresh();
  }

  /* ===== 파일 시스템 ===== */
  add(parent, name, ext, content) {
    const id = "n" + (++this.k);
    this.nodes.set(id, { id, name, ext: ext || null, type: ext ? "file" : "folder", parent, content: content || "" });
    return id;
  }
  folderId(path) {
    if (path === "BIN" || path === "PC") return path;
    const segs = path.split("/").filter(Boolean);
    const sp = SPECIAL.find(s => s[1] === segs[0]);
    if (!sp) return null;
    let cur = sp[0];
    for (const s of segs.slice(1)) {
      const n = this.kids(cur).find(c => c.type === "folder" && c.name === s);
      if (!n) return null;
      cur = n.id;
    }
    return cur;
  }
  ensure(path) {
    const segs = path.split("/").filter(Boolean);
    let cur = SPECIAL.find(s => s[1] === segs[0])[0];
    for (const s of segs.slice(1)) {
      const n = this.kids(cur).find(c => c.type === "folder" && c.name === s);
      cur = n ? n.id : this.add(cur, s);
    }
    return cur;
  }
  put(path, items) {
    const f = this.ensure(path);
    for (const it of items) {
      if (it.endsWith("/")) this.ensure(path + "/" + it.slice(0, -1));
      else { const m = it.match(/^(.*)\.(\w+)$/); this.add(f, m[1], m[2]); }
    }
    return f;
  }
  text(path, content) { const n = this.node(path); if (n) n.content = content; }
  clear(path) { const f = this.folderId(path); this.desc(f).forEach(id => this.nodes.delete(id)); }
  node(path) {
    const i = path.lastIndexOf("/");
    const f = this.folderId(path.slice(0, i)), name = path.slice(i + 1);
    if (!f) return null;
    return this.kids(f).find(c => c.name === name) || null;
  }
  exists(path) { return !!this.node(path); }
  kids(fid) {
    if (fid === "PC") return SPECIAL.map(s => this.nodes.get(s[0]));
    const out = [];
    for (const n of this.nodes.values()) if (n.parent === fid) out.push(n);
    return out.sort((a, b) => (a.type === b.type ? 0 : a.type === "folder" ? -1 : 1) || a.name.localeCompare(b.name, "ko"));
  }
  names(path) { const f = this.folderId(path); return f ? this.kids(f).map(n => n.name) : []; }
  desc(id) { const out = []; const walk = p => { for (const n of this.nodes.values()) if (n.parent === p) { out.push(n.id); walk(n.id); } }; walk(id); return out; }
  isDesc(id, maybeChild) { let p = this.nodes.get(maybeChild); while (p) { if (p.id === id) return true; p = this.nodes.get(p.parent); } return false; }
  binItems() { return this.kids("BIN"); }
  inTrash(id) { let n = this.nodes.get(id); while (n) { if (n.parent === "BIN") return true; n = this.nodes.get(n.parent); } return false; }
  inBin(name) { return this.binItems().some(n => n.name === name); }
  label(fid) { if (fid === "PC") return "내 PC"; if (fid === "BIN") return "휴지통"; const n = this.nodes.get(fid); return n ? n.name : ""; }
  pathOf(fid) {
    if (fid === "PC" || fid === "BIN") return [fid];
    const out = []; let n = this.nodes.get(fid);
    while (n && n.id !== "PC") { out.unshift(n.id); n = this.nodes.get(n.parent); }
    return out;
  }
  pathStr(fid) { return this.pathOf(fid).map(id => this.label(id)).join("/"); }
  unique(folder, name, ext, skip) {
    const taken = n => this.kids(folder).some(c => c.id !== skip && c.name === n && (c.ext || null) === (ext || null));
    if (!taken(name)) return name;
    for (let i = 2; ; i++) if (!taken(`${name} (${i})`)) return `${name} (${i})`;
  }
  icon(n) {
    if (n.id === "BIN") return this.binItems().length ? "🗑️" : "🗑️";
    if (n.type === "folder") { const sp = SPECIAL.find(s => s[0] === n.id); return sp ? sp[2] : "📁"; }
    if (n.ext === "jpg") return EMO[n.name] || "🖼️";
    if (n.ext === "mp3") return "🎵";
    return "📝";
  }

  /* ===== 화면 만들기 ===== */
  build(host) {
    const r = this.root = el("div", "ws");
    r.tabIndex = -1;
    r.innerHTML = `
      <div class="ws-desk" data-view="desk"></div>
      <div class="ws-wins"></div>
      <div class="ws-start" hidden>
        <div class="st-search">🔍 검색하려면 여기에 입력하세요</div>
        <div class="st-h">고정됨</div>
        <div class="st-apps">
          <button type="button" data-app="explorer"><span>📁</span>파일 탐색기</button>
          <button type="button" data-app="notepad"><span>📝</span>메모장</button>
          <button type="button" data-app="calc"><span>🧮</span>계산기</button>
          <button type="button" data-app="photos"><span>🖼️</span>사진</button>
          <button type="button" data-app="settings"><span>⚙️</span>설정</button>
          <button type="button" data-app="paint"><span>🎨</span>그림판</button>
        </div>
        <div class="st-foot"><span class="st-user"><i>🙂</i>학생</span><button type="button" class="st-pow" data-app="power" title="전원">⏻</button></div>
      </div>
      <div class="ws-ctx" hidden></div>
      <div class="ws-bar">
        <div class="bar-mid">
          <button type="button" class="bar-start" title="시작"><b></b><b></b><b></b><b></b></button>
          <button type="button" class="bar-app" data-bar="explorer" title="파일 탐색기">📁</button>
          <span class="bar-wins"></span>
        </div>
        <div class="bar-clock"></div>
      </div>
      <div class="ws-toast" hidden></div>`;
    host.append(r);
    this.desk = r.querySelector(".ws-desk");
    this.layer = r.querySelector(".ws-wins");
    this.start = r.querySelector(".ws-start");
    this.ctxEl = r.querySelector(".ws-ctx");
    this.barWins = r.querySelector(".bar-wins");
    this.toastEl = r.querySelector(".ws-toast");
    const clock = () => { const d = new Date(); r.querySelector(".bar-clock").innerHTML = `${d.getHours() < 12 ? "오전" : "오후"} ${((d.getHours() + 11) % 12) + 1}:${String(d.getMinutes()).padStart(2, "0")}<br>${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
    clock(); this.clockT = setInterval(clock, 20000);

    this.h = {
      down: e => this.onDown(e),
      ctx: e => this.onCtx(e),
      click: e => this.onClick(e),
      key: e => this.onKey(e),
      move: e => this.onMove(e),
      up: e => this.onUp(e)
    };
    r.addEventListener("pointerdown", this.h.down);
    r.addEventListener("contextmenu", this.h.ctx);
    r.addEventListener("click", this.h.click);
    document.addEventListener("keydown", this.h.key);
    document.addEventListener("pointermove", this.h.move);
    document.addEventListener("pointerup", this.h.up);
  }
  destroy() {
    clearInterval(this.clockT);
    document.removeEventListener("keydown", this.h.key);
    document.removeEventListener("pointermove", this.h.move);
    document.removeEventListener("pointerup", this.h.up);
    this.root.remove();
  }
  emit(type, data = {}) {
    const ev = Object.assign({ type }, data);
    this.log.push(ev);
    if (this.o.onEvent) this.o.onEvent(ev, this);
  }
  toast(msg) {
    const t = this.toastEl; t.innerHTML = msg; t.hidden = false;
    clearTimeout(this.toastT); this.toastT = setTimeout(() => { t.hidden = true; }, 2600);
  }

  /* ===== 그리기 ===== */
  viewFolder(view) { if (view === "desk") return "DESK"; const w = this.win(view); return w ? w.folder : null; }
  win(id) { return this.wins.find(w => w.id === id); }
  itemsHTML(list, view) {
    const sel = this.sel.view === view ? this.sel.ids : new Set();
    const cut = this.clip && this.clip.mode === "cut" ? new Set(this.clip.ids) : new Set();
    return list.map(n => {
      const nm = this.renaming === n.id && view === this.renameView
        ? `<input class="it-ren" value="${esc(n.name)}" spellcheck="false">`
        : `<div class="it-n">${esc(n.name)}</div>`;
      const thumb = n.ext === "jpg" ? " thumb" : "";
      const badge = n.id === "BIN" && this.binItems().length ? `<span class="bin-badge">${this.binItems().length}</span>` : "";
      return `<div class="it ${n.type === "folder" || n.id === "BIN" ? "is-folder" : "is-file"} ${sel.has(n.id) ? "sel" : ""} ${cut.has(n.id) ? "cut" : ""}" data-id="${n.id}" title="${esc(n.name)}${n.ext ? " · " + KIND[n.ext] : n.id === "BIN" ? "" : " · 파일 폴더"}"><div class="it-ic${thumb}">${this.icon(n)}${badge}</div>${nm}</div>`;
    }).join("") || (view !== "desk" ? `<div class="empty-note">이 폴더는 비어 있습니다.</div>` : "");
  }
  refresh() {
    const deskList = [{ id: "BIN", name: "휴지통", type: "folder" }, ...this.kids("DESK")];
    this.desk.innerHTML = this.itemsHTML(deskList, "desk");
    for (const w of this.wins) this.renderWin(w);
    this.renderBar();
    const inp = this.root.querySelector(".it-ren");
    if (inp && document.activeElement !== inp) {
      inp.focus(); inp.select();
      inp.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); this.commitRename(inp.value); } else if (e.key === "Escape") { e.preventDefault(); this.cancelRename(); } e.stopPropagation(); });
      inp.addEventListener("blur", () => { if (this.renaming) this.commitRename(inp.value); });
    }
  }
  refreshSel() {
    this.root.querySelectorAll("[data-view]").forEach(v => {
      const on = this.sel.view === v.dataset.view;
      v.querySelectorAll(".it").forEach(it => it.classList.toggle("sel", on && this.sel.ids.has(it.dataset.id)));
    });
    for (const w of this.wins) if (w.kind === "explorer") this.renderStatus(w);
  }
  renderBar() {
    const order = this.wins.filter(w => w.kind !== "explorer");
    const exps = this.wins.filter(w => w.kind === "explorer");
    const top = this.topWin();
    const ex = this.root.querySelector('[data-bar="explorer"]');
    ex.classList.toggle("run", exps.length > 0);
    ex.classList.toggle("cur", !!top && top.kind === "explorer");
    this.barWins.innerHTML = order.map(w => `<button type="button" class="bar-app run ${top === w ? "cur" : ""}" data-wbar="${w.id}" title="${esc(this.winTitle(w))}">${w.icon}</button>`).join("");
  }
  topWin() { let t = null; for (const w of this.wins) if (!w.min && (!t || w.z > t.z)) t = w; return t; }

  /* ===== 창 ===== */
  openWin(kind, opt = {}) {
    const W = this.layer.clientWidth || 800, H = this.layer.clientHeight || 500;
    const size = { explorer: [Math.max(680, W * .66), Math.max(430, H * .66)], notepad: [Math.max(500, W * .5), Math.max(360, H * .55)], calc: [270, 390], viewer: [420, 360] }[kind];
    const n = this.wins.length;
    const w = Object.assign({ id: "w" + (++this.k), kind, min: false, max: false, z: ++this.z }, opt);
    w.w = Math.min(size[0], W - 20); w.h = Math.min(size[1], H - 16);
    w.x = Math.max(4, Math.min(W - w.w - 4, 30 + n * 34 + (opt.dx || 0))); w.y = Math.max(4, Math.min(H - w.h - 4, 16 + n * 26));
    w.icon = { explorer: "📁", notepad: "📝", calc: "🧮", viewer: "🖼️" }[kind];
    if (kind === "explorer") { w.hist = []; w.fwd = []; w.folder = w.folder || "PC"; }
    if (kind === "notepad") { w.text = w.file ? this.nodes.get(w.file).content : ""; w.dirty = false; }
    if (kind === "calc") { w.disp = "0"; w.acc = null; w.op = null; w.fresh = true; }
    if (kind === "viewer") { const f = this.nodes.get(w.file); if (f && f.ext === "mp3") w.icon = "🎵"; }
    this.wins.push(w);
    this.buildWin(w);
    this.focusWin(w, true);
    this.refresh();
    this.emit("openWin", { kind, w });
    return w;
  }
  winTitle(w) {
    if (w.kind === "explorer") return this.label(w.folder);
    if (w.kind === "notepad") return `${w.dirty ? "*" : ""}${w.file ? this.nodes.get(w.file).name : "제목 없음"} - 메모장`;
    if (w.kind === "calc") return "계산기";
    const f = this.nodes.get(w.file); return f ? `${f.name} - ${f.ext === "mp3" ? "미디어 플레이어" : "사진"}` : "사진";
  }
  buildWin(w) {
    const d = w.el = el("div", "win win-" + w.kind);
    d.dataset.wid = w.id;
    let body = "";
    if (w.kind === "explorer") {
      body = `<div class="w-tool">
        <button type="button" data-t="new" title="새로 만들기"><b>＋</b><i>새로 만들기</i></button><span class="sep"></span>
        <button type="button" data-t="cut" title="잘라내기 (Ctrl+X)"><b>✂</b><i>잘라내기</i></button>
        <button type="button" data-t="copy" title="복사 (Ctrl+C)"><b>⧉</b><i>복사</i></button>
        <button type="button" data-t="paste" title="붙여넣기 (Ctrl+V)"><b>📋</b><i>붙여넣기</i></button>
        <button type="button" data-t="rename" title="이름 바꾸기 (F2)"><b>✎</b><i>이름 바꾸기</i></button>
        <button type="button" data-t="del" title="삭제 (Delete)"><b>🗑</b><i>삭제</i></button>
        <span class="bin-tools"><span class="sep"></span><button type="button" data-t="empty" class="wide">휴지통 비우기</button><button type="button" data-t="restoreAll" class="wide">모든 항목 복원</button></span>
      </div>
      <div class="w-addr"><button type="button" data-n="back" title="뒤로">←</button><button type="button" data-n="fwd" title="앞으로">→</button><button type="button" data-n="up" title="위로">↑</button><div class="w-path"></div></div>
      <div class="w-body"><div class="w-nav">${SPECIAL.map(s => `<button type="button" data-f="${s[0]}"><span>${s[2]}</span>${s[1]}</button>`).join("")}<hr><button type="button" data-f="PC"><span>💻</span>내 PC</button><button type="button" data-f="BIN"><span>🗑️</span>휴지통</button></div><div class="w-files" data-view="${w.id}"></div></div>
      <div class="w-status"></div>`;
    } else if (w.kind === "notepad") {
      body = `<div class="np-menu"><button type="button" data-m="file">파일</button><button type="button" data-m="edit">편집</button><button type="button" data-m="view">보기</button></div><textarea class="np-ta" spellcheck="false"></textarea><div class="np-status">한국어 · UTF-8</div>`;
    } else if (w.kind === "calc") {
      body = `<div class="calc-disp">0</div><div class="calc-keys">${["C", "←", "%", "÷", "7", "8", "9", "×", "4", "5", "6", "−", "1", "2", "3", "+", "±", "0", ".", "="].map(k => `<button type="button" data-c="${k}" class="${/[÷×−+=]/.test(k) ? "op" : ""}">${k}</button>`).join("")}</div>`;
    } else {
      const f = this.nodes.get(w.file);
      body = f && f.ext === "mp3"
        ? `<div class="vw vw-mus"><div class="vw-big">🎵</div><div class="vw-n">${esc(f.name)}</div><div class="vw-bar"><i></i></div><button type="button" class="vw-play" data-play>▶ 재생</button></div>`
        : `<div class="vw"><div class="vw-frame">${f ? this.icon(f) : "🖼️"}</div><div class="vw-n">${f ? esc(f.name) : ""}</div></div>`;
    }
    d.innerHTML = `<div class="w-title"><span class="w-ic">${w.icon}</span><span class="w-tt"></span><div class="w-btns"><button type="button" data-b="min" title="최소화">—</button><button type="button" data-b="max" title="최대화">▢</button><button type="button" data-b="close" class="x" title="닫기">✕</button></div></div>${body}<div class="w-grip" title="끌어서 크기 바꾸기"></div>`;
    this.layer.append(d);
    if (w.kind === "notepad") this.wireNotepad(w);
  }
  renderWin(w) {
    const d = w.el;
    d.hidden = w.min;
    d.classList.toggle("max", w.max);
    d.style.zIndex = w.z;
    if (w.max) { d.style.left = "0px"; d.style.top = "0px"; d.style.width = "100%"; d.style.height = "100%"; }
    else { d.style.left = w.x + "px"; d.style.top = w.y + "px"; d.style.width = w.w + "px"; d.style.height = w.h + "px"; }
    d.classList.toggle("front", this.topWin() === w);
    d.querySelector(".w-tt").textContent = this.winTitle(w);
    d.querySelector('[data-b="max"]').textContent = w.max ? "❐" : "▢";
    d.querySelector('[data-b="max"]').title = w.max ? "이전 크기로 복원" : "최대화";
    if (w.kind === "explorer") {
      const f = w.folder;
      d.querySelector(".w-ic").textContent = f === "BIN" ? "🗑️" : f === "PC" ? "💻" : "📁";
      const crumbs = f === "BIN" ? [["BIN", "휴지통"]] : [["PC", "내 PC"], ...(f === "PC" ? [] : this.pathOf(f).map(id => [id, this.label(id)]))];
      d.querySelector(".w-path").innerHTML = crumbs.map((c, i) => `<button type="button" data-crumb="${c[0]}">${esc(c[1])}</button>${i < crumbs.length - 1 ? "<span>›</span>" : ""}`).join("");
      d.querySelectorAll(".w-nav [data-f]").forEach(b => b.classList.toggle("on", b.dataset.f === f));
      d.querySelector('[data-n="back"]').disabled = !w.hist.length;
      d.querySelector('[data-n="fwd"]').disabled = !w.fwd.length;
      d.querySelector('[data-n="up"]').disabled = f === "PC" || f === "BIN";
      d.querySelector(".bin-tools").hidden = f !== "BIN";
      d.querySelectorAll('.w-tool [data-t]:not([data-t="empty"]):not([data-t="restoreAll"])').forEach(b => { b.hidden = f === "BIN" && b.dataset.t !== "del"; });
      d.querySelector('[data-t="paste"]').disabled = !this.clip || f === "PC";
      d.querySelector('[data-t="new"]').disabled = f === "PC";
      d.querySelector(".w-files").innerHTML = this.itemsHTML(this.kids(f), w.id);
      this.renderStatus(w);
    }
  }
  renderStatus(w) {
    const n = this.kids(w.folder).length, s = this.sel.view === w.id ? this.sel.ids.size : 0;
    const st = w.el.querySelector(".w-status");
    if (st) st.textContent = `항목 ${n}개${s ? ` · ${s}개 항목 선택함` : ""}`;
    const has = s > 0;
    w.el.querySelectorAll('[data-t="cut"],[data-t="copy"],[data-t="rename"],[data-t="del"]').forEach(b => b.disabled = !has || w.folder === "PC");
  }
  focusWin(w, silent) {
    if (!w) return;
    w.z = ++this.z;
    if (w.kind === "explorer") this.active = w.id;
    if (!silent) { this.wins.forEach(x => this.renderWin(x)); this.renderBar(); this.emit("focus", { w }); }
  }
  closeWin(w, force) {
    if (w.kind === "notepad" && w.dirty && !force) { this.askSave(w); return; }
    w.el.remove();
    this.wins = this.wins.filter(x => x !== w);
    if (this.sel.view === w.id) this.sel = { view: null, ids: new Set() };
    if (this.active === w.id) this.active = "desk";
    this.refresh();
    this.emit("close", { w, kind: w.kind });
  }
  minWin(w) { w.min = true; this.refresh(); this.emit("minimize", { w, kind: w.kind }); }
  unminWin(w, via) { w.min = false; this.focusWin(w, true); this.refresh(); this.emit("unminimize", { w, kind: w.kind, via }); this.emit("focus", { w, via }); }
  toggleMax(w, via) { w.max = !w.max; this.focusWin(w, true); this.refresh(); this.emit(w.max ? "maximize" : "restore", { w, kind: w.kind, via }); }

  /* ===== 탐색기 이동 ===== */
  openExplorer(folder) { return this.openWin("explorer", { folder }); }
  nav(w, folder, via) {
    if (folder === w.folder) return;
    if (via === "back") { w.fwd.push(w.folder); w.folder = w.hist.pop(); }
    else if (via === "fwd") { w.hist.push(w.folder); w.folder = w.fwd.pop(); }
    else { w.hist.push(w.folder); w.fwd = []; w.folder = folder; }
    if (this.sel.view === w.id) this.sel = { view: w.id, ids: new Set() };
    this.active = w.id;
    this.refresh();
    this.emit("nav", { w, folder: w.folder, path: this.pathStr(w.folder), via });
  }
  at(path) { const f = this.folderId(path); return !!f && this.wins.some(w => w.kind === "explorer" && !w.min && w.folder === f); }
  count(kind) { return this.wins.filter(w => w.kind === kind).length; }
  selNames() { return [...this.sel.ids].map(id => id === "BIN" ? "휴지통" : (this.nodes.get(id) || {}).name).filter(Boolean); }

  /* ===== 열기 ===== */
  openItem(id, view) {
    if (id === "BIN") { const w = this.win(view); if (w && w.kind === "explorer") this.nav(w, "BIN", "open"); else this.openExplorer("BIN"); this.emit("open", { name: "휴지통", folder: true }); return; }
    const n = this.nodes.get(id);
    if (!n) return;
    if (n.parent === "BIN") { this.toast("휴지통 안의 파일은 열 수 없어요. 먼저 <b>복원</b>하세요."); return; }
    if (n.type === "folder") {
      const w = this.win(view);
      if (w && w.kind === "explorer") this.nav(w, id, "open"); else this.openExplorer(id);
    } else if (n.ext === "txt") {
      const ex = this.wins.find(w => w.kind === "notepad" && w.file === id);
      if (ex) this.focusWin(ex); else this.openWin("notepad", { file: id });
    } else this.openWin("viewer", { file: id });
    this.emit("open", { id, name: n.name, ext: n.ext, folder: n.type === "folder" });
  }

  /* ===== 고르기 ===== */
  setActive(view) { this.active = view; }
  selectOnly(view, ids) { this.sel = { view, ids: new Set(ids) }; this.refreshSel(); }
  needSel(via) {
    if (this.sel.view !== this.active || !this.sel.ids.size) { this.toast("먼저 파일이나 폴더를 <b>클릭해서 골라요</b>."); return null; }
    return [...this.sel.ids].filter(id => id !== "BIN");
  }

  /* ===== 복사 · 잘라내기 · 붙여넣기 ===== */
  copy(via, mode = "copy") {
    const ids = this.needSel(via); if (!ids || !ids.length) return;
    if (this.viewFolder(this.active) === "BIN") { this.toast("휴지통 안의 파일은 먼저 복원하세요."); return; }
    this.clip = { mode, ids, from: this.viewFolder(this.active) };
    this.refresh();
    const names = ids.map(id => this.nodes.get(id).name);
    this.toast(mode === "cut" ? `✂ <b>${names.join(", ")}</b> 잘라냈어요. 옮길 곳에서 붙여넣기 하세요.` : `⧉ <b>${names.join(", ")}</b> 복사했어요. 넣을 곳에서 붙여넣기 하세요.`);
    this.emit(mode, { names, via });
  }
  cloneNode(id, to, sameName) {
    const n = this.nodes.get(id);
    const name = this.unique(to, sameName ? `${n.name} - 복사본` : n.name, n.ext);
    const nid = this.add(to, name, n.ext, n.content);
    for (const c of this.kids(id)) this.cloneNode(c.id, nid, false);
    return nid;
  }
  moveNode(id, to) {
    const n = this.nodes.get(id);
    n.name = this.unique(to, n.name, n.ext, id);
    n.parent = to;
  }
  paste(via, target) {
    const to = target || this.viewFolder(this.active);
    if (!this.clip) { this.toast("먼저 <b>복사</b>나 <b>잘라내기</b>를 하세요."); return; }
    if (!to || to === "PC" || to === "BIN") { this.toast("여기에는 붙여넣을 수 없어요. 폴더를 열고 해 보세요."); return; }
    const { mode, ids } = this.clip, made = [], names = [];
    if (mode === "copy") {
      for (const id of ids) { const n = this.nodes.get(id); if (!n) continue; made.push(this.cloneNode(id, to, n.parent === to)); }
      this.undoStack.push({ what: "copy", undo: () => made.forEach(id => { this.desc(id).forEach(d => this.nodes.delete(d)); this.nodes.delete(id); }) });
    } else {
      const moved = [];
      for (const id of ids) {
        const n = this.nodes.get(id); if (!n) continue;
        if (n.type === "folder" && this.isDesc(id, to)) { this.toast("폴더를 자기 자신 안으로 옮길 수는 없어요."); continue; }
        if (n.parent === to) continue;
        moved.push({ id, from: n.parent, name: n.name }); this.moveNode(id, to); made.push(id);
      }
      this.undoStack.push({ what: "move", undo: () => moved.forEach(m => { const n = this.nodes.get(m.id); if (n) { n.parent = m.from; n.name = m.name; } }) });
      this.clip = null;
    }
    made.forEach(id => names.push(this.nodes.get(id).name));
    const view = this.active === "desk" && to === "DESK" ? "desk" : (this.wins.find(w => w.kind === "explorer" && w.folder === to) || {}).id || this.active;
    this.sel = { view, ids: new Set(made) };
    this.refresh();
    this.emit("paste", { mode, names, to: this.pathStr(to), via });
  }
  moveTo(ids, to, via) {
    const moved = [];
    for (const id of ids) {
      const n = this.nodes.get(id); if (!n || n.parent === to) continue;
      if (n.type === "folder" && this.isDesc(id, to)) { this.toast("폴더를 자기 자신 안으로 옮길 수는 없어요."); continue; }
      moved.push({ id, from: n.parent, name: n.name }); this.moveNode(id, to);
    }
    if (!moved.length) return;
    this.undoStack.push({ what: "move", undo: () => moved.forEach(m => { const n = this.nodes.get(m.id); if (n) { n.parent = m.from; n.name = m.name; } }) });
    this.sel = { view: null, ids: new Set() };
    this.refresh();
    this.emit("move", { names: moved.map(m => this.nodes.get(m.id).name), to: this.pathStr(to), via });
  }

  /* ===== 지우기 · 휴지통 ===== */
  del(via, idsIn) {
    const ids = idsIn || this.needSel(via); if (!ids || !ids.length) return;
    const inBinView = this.viewFolder(this.active) === "BIN" && !idsIn;
    if (inBinView) {
      const names = ids.map(id => this.nodes.get(id).name);
      ids.forEach(id => { this.desc(id).forEach(d => this.nodes.delete(d)); this.nodes.delete(id); });
      this.sel = { view: null, ids: new Set() }; this.refresh();
      this.toast("영구히 지웠어요. 이제 되살릴 수 없어요.");
      this.emit("purge", { names, via });
      return;
    }
    const moved = ids.map(id => { const n = this.nodes.get(id); const m = { id, from: n.parent, name: n.name }; n.from = n.parent; n.parent = "BIN"; return m; });
    this.undoStack.push({ what: "delete", names: moved.map(m => m.name), undo: () => moved.forEach(m => { const n = this.nodes.get(m.id); if (n) { n.parent = m.from; n.name = m.name; } }) });
    if (this.clip) this.clip.ids = this.clip.ids.filter(id => !ids.includes(id));
    this.sel = { view: null, ids: new Set() };
    this.refresh();
    this.emit("delete", { names: moved.map(m => m.name), via });
  }
  restore(ids, via) {
    const names = [];
    for (const id of ids) {
      const n = this.nodes.get(id); if (!n || n.parent !== "BIN") continue;
      const to = n.from && this.nodes.get(n.from) && !this.inTrash(n.from) ? n.from : "DESK";
      n.name = this.unique(to, n.name, n.ext, id); n.parent = to; names.push(n.name);
    }
    this.sel = { view: null, ids: new Set() };
    this.refresh();
    this.emit("restore", { names, via });
  }
  emptyBin(via) {
    const items = this.binItems();
    if (!items.length) { this.toast("휴지통이 이미 비어 있어요."); return; }
    items.forEach(n => { this.desc(n.id).forEach(d => this.nodes.delete(d)); this.nodes.delete(n.id); });
    this.flags.emptied = true;
    this.sel = { view: null, ids: new Set() };
    this.refresh();
    this.toast("휴지통을 비웠어요. 안에 있던 파일은 영영 사라졌어요.");
    this.emit("emptyBin", { via });
  }
  undo() {
    const op = this.undoStack.pop();
    if (!op) { this.toast("되돌릴 것이 없어요."); return; }
    op.undo(); this.sel = { view: null, ids: new Set() }; this.refresh();
    this.toast("↶ 방금 한 일을 되돌렸어요.");
    this.emit("undo", { what: op.what, names: op.names || [] });
  }

  /* ===== 새 폴더 · 이름 바꾸기 ===== */
  newItem(kind, via, folder) {
    const to = folder || this.viewFolder(this.active);
    if (!to || to === "PC" || to === "BIN") { this.toast("여기에는 만들 수 없어요."); return; }
    const id = kind === "txt" ? this.add(to, this.unique(to, "새 텍스트 문서", "txt"), "txt") : this.add(to, this.unique(to, "새 폴더"));
    this.undoStack.push({ what: "new", undo: () => { this.desc(id).forEach(d => this.nodes.delete(d)); this.nodes.delete(id); } });
    const view = to === "DESK" && this.active === "desk" ? "desk" : this.active;
    this.sel = { view, ids: new Set([id]) };
    this.renaming = id; this.renameView = view; this.renameVia = via; this.renameNew = true;
    this.refresh();
    this.emit(kind === "txt" ? "newText" : "newFolder", { via, to: this.pathStr(to) });
  }
  startRename(via) {
    const ids = this.needSel(via); if (!ids) return;
    if (ids.length !== 1) { this.toast("이름은 하나씩 바꿔요. 하나만 골라 주세요."); return; }
    if (this.viewFolder(this.active) === "BIN") { this.toast("휴지통 안에서는 이름을 바꿀 수 없어요."); return; }
    this.renaming = ids[0]; this.renameView = this.active; this.renameVia = via; this.renameNew = false;
    this.refresh();
    this.emit("renameStart", { via });
  }
  commitRename(val) {
    const id = this.renaming; if (!id) return;
    const n = this.nodes.get(id); this.renaming = null;
    const v = val.trim();
    if (!n) { this.refresh(); return; }
    if (BAD.test(v)) { this.toast('이름에는 \\ / : * ? " < > | 를 쓸 수 없어요.'); this.refresh(); return; }
    const old = n.name;
    if (v && v !== old) {
      n.name = this.unique(n.parent, v, n.ext, id);
      if (!this.renameNew) this.undoStack.push({ what: "rename", undo: () => { const x = this.nodes.get(id); if (x) x.name = old; } });
    }
    this.refresh();
    this.emit("rename", { from: old, name: n.name, via: this.renameVia, isNew: this.renameNew });
  }
  cancelRename() { this.renaming = null; this.refresh(); }

  /* ===== 메뉴 ===== */
  showMenu(x, y, items) {
    const m = this.ctxEl;
    const row = it => it === "-" ? "<hr>" : it.sub
      ? `<div class="mrow has-sub" data-i="${it._i}"><span class="mi-ic">${it.ic || ""}</span><span class="mi-t">${it.t}</span><span class="mi-k">›</span><div class="ctx-sub">${it.sub.map(row).join("")}</div></div>`
      : `<button type="button" class="mrow" ${it.dis ? "disabled" : ""} data-i="${it._i}"><span class="mi-ic">${it.ic || ""}</span><span class="mi-t">${it.t}</span><span class="mi-k">${it.k || ""}</span></button>`;
    let i = 0; const flat = [];
    const index = arr => arr.forEach(it => { if (it !== "-") { it._i = i++; flat.push(it); if (it.sub) index(it.sub); } });
    index(items);
    m.innerHTML = items.map(row).join("");
    m.hidden = false;
    const R = this.root.getBoundingClientRect();
    const mw = m.offsetWidth, mh = m.offsetHeight;
    m.style.left = Math.max(4, Math.min(x, R.width - mw - 4)) + "px";
    m.style.top = Math.max(4, Math.min(y, R.height - mh - 48)) + "px";
    m.classList.toggle("flip", x + mw * 2 > R.width);
    m.onclick = e => {
      const b = e.target.closest("[data-i]"); if (!b || b.disabled) return;
      const it = flat[+b.dataset.i];
      if (it.sub) { if (e.target.closest(".ctx-sub")) return; b.classList.toggle("open"); e.stopPropagation(); return; }
      this.hideMenu(); it.fn();
    };
  }
  hideMenu() { this.ctxEl.hidden = true; }
  itemMenu(view, id) {
    const f = this.viewFolder(view);
    if (id === "BIN") return [{ t: "열기", fn: () => this.openItem("BIN", view) }, "-", { ic: "🗑", t: "휴지통 비우기", fn: () => this.emptyBin("menu"), dis: !this.binItems().length }];
    if (f === "BIN") return [{ ic: "↺", t: "복원", fn: () => this.restore([...this.sel.ids], "menu") }, "-", { ic: "✕", t: "삭제(영구히)", fn: () => this.del("menu") }];
    return [
      { t: "<b>열기</b>", k: "Enter", fn: () => this.openItem(id, view) }, "-",
      { ic: "✂", t: "잘라내기", k: "Ctrl+X", fn: () => this.copy("menu", "cut") },
      { ic: "⧉", t: "복사", k: "Ctrl+C", fn: () => this.copy("menu") },
      ...(this.nodes.get(id) && this.nodes.get(id).type === "folder" ? [{ ic: "📋", t: "붙여넣기", k: "Ctrl+V", dis: !this.clip, fn: () => this.paste("menu", id) }] : []), "-",
      { ic: "✎", t: "이름 바꾸기", k: "F2", fn: () => this.startRename("menu") },
      { ic: "🗑", t: "삭제", k: "Delete", fn: () => this.del("menu") }
    ];
  }
  bgMenu(view) {
    const f = this.viewFolder(view);
    if (f === "PC") return null;
    if (f === "BIN") return [{ ic: "🗑", t: "휴지통 비우기", fn: () => this.emptyBin("menu"), dis: !this.binItems().length }, { ic: "↺", t: "모든 항목 복원", fn: () => this.restore(this.binItems().map(n => n.id), "menu"), dis: !this.binItems().length }];
    return [
      { ic: "＋", t: "새로 만들기", sub: [{ ic: "📁", t: "폴더", fn: () => this.newItem("folder", "menu") }, { ic: "📝", t: "텍스트 문서", fn: () => this.newItem("txt", "menu") }] },
      "-",
      { ic: "📋", t: "붙여넣기", k: "Ctrl+V", dis: !this.clip, fn: () => this.paste("menu") },
      { ic: "↶", t: "실행 취소", k: "Ctrl+Z", dis: !this.undoStack.length, fn: () => this.undo() }
    ];
  }

  /* ===== 마우스 ===== */
  rel(e) { const R = this.root.getBoundingClientRect(); return [e.clientX - R.left, e.clientY - R.top]; }
  onDown(e) {
    const t = e.target;
    if (!t.closest(".ws-ctx")) this.hideMenu();
    if (!t.closest(".ws-start") && !t.closest(".bar-start") && !this.start.hidden) { this.start.hidden = true; this.emit("startClose", {}); }
    if (this.dlg && !t.closest(".ws-dlg")) { e.preventDefault(); return; }
    if (this.renaming && !t.closest(".it-ren")) { const inp = this.root.querySelector(".it-ren"); this.commitRename(inp ? inp.value : ""); }
    const winEl = t.closest(".win");
    if (winEl) {
      const w = this.win(winEl.dataset.wid);
      if (w && this.topWin() !== w) this.focusWin(w);
      if (w && t.closest(".w-title") && !t.closest("button") && e.button === 0) {
        const now = performance.now();
        if (this.lastTitle && this.lastTitle.w === w && now - this.lastTitle.t < 420) { this.lastTitle = null; this.toggleMax(w, "dbl"); return; }
        this.lastTitle = { w, t: now };
        if (!w.max) { const [x, y] = this.rel(e); this.drag = { kind: "win", w, sx: x, sy: y, ox: w.x, oy: w.y }; }
        e.preventDefault(); return;
      }
      if (w && t.closest(".w-grip") && e.button === 0 && !w.max) {
        const [x, y] = this.rel(e); this.drag = { kind: "size", w, sx: x, sy: y, ow: w.w, oh: w.h }; e.preventDefault(); return;
      }
    }
    const it = t.closest(".it");
    const vEl = t.closest("[data-view]");
    if (it && vEl && !t.closest(".it-ren")) {
      const view = vEl.dataset.view, id = it.dataset.id;
      this.setActive(view);
      if (e.button === 2) { if (!(this.sel.view === view && this.sel.ids.has(id))) this.selectOnly(view, [id]); return; }
      if (e.button !== 0) return;
      e.preventDefault();
      if (this.sel.view !== view) this.sel = { view, ids: new Set() };
      const ids = this.sel.ids;
      let pending = false, via = "click", removed = false;
      if (e.ctrlKey) { if (ids.has(id)) { ids.delete(id); removed = true; } else ids.add(id); this.anchor = id; via = "ctrl"; }
      else if (e.shiftKey && this.anchor && vEl.querySelector(`[data-id="${this.anchor}"]`)) {
        const order = [...vEl.querySelectorAll(".it")].map(x => x.dataset.id);
        const a = order.indexOf(this.anchor), b = order.indexOf(id);
        ids.clear(); order.slice(Math.min(a, b), Math.max(a, b) + 1).forEach(x => ids.add(x)); via = "shift";
      } else if (!ids.has(id)) { ids.clear(); ids.add(id); this.anchor = id; }
      else pending = true;
      this.refreshSel();
      this.emit("select", { names: this.selNames(), via, removed });
      const now = performance.now();
      if (!e.ctrlKey && !e.shiftKey && this.lastClick && this.lastClick.id === id && now - this.lastClick.t < 450) {
        this.lastClick = null; this.openItem(id, view); return;
      }
      this.lastClick = e.ctrlKey || e.shiftKey ? null : { id, t: now };
      const [x, y] = this.rel(e);
      this.drag = { kind: "maybeItem", view, id, sx: x, sy: y, pending };
      return;
    }
    if (vEl && e.button === 0) {
      const view = vEl.dataset.view;
      this.setActive(view);
      if (!e.ctrlKey) { const had = this.sel.ids.size; this.sel = { view, ids: new Set() }; this.refreshSel(); if (had) this.emit("select", { names: [], via: "clear" }); }
      const [x, y] = this.rel(e);
      this.drag = { kind: "maybeMarq", view, sx: x, sy: y, vEl };
    }
  }
  onMove(e) {
    const d = this.drag; if (!d) return;
    const [x, y] = this.rel(e);
    const W = this.layer.clientWidth, H = this.layer.clientHeight;
    if (d.kind === "win") {
      d.w.x = Math.max(-d.w.w + 80, Math.min(W - 60, d.ox + x - d.sx)); d.w.y = Math.max(0, Math.min(H - 30, d.oy + y - d.sy));
      this.renderWin(d.w); d.moved = true; return;
    }
    if (d.kind === "size") {
      d.w.w = Math.max(260, Math.min(W - d.w.x, d.ow + x - d.sx)); d.w.h = Math.max(180, Math.min(H - d.w.y, d.oh + y - d.sy));
      this.renderWin(d.w); d.moved = true; return;
    }
    if (d.kind === "maybeItem" && Math.hypot(x - d.sx, y - d.sy) > 6) {
      if (d.id === "BIN") { this.drag = null; return; }
      if (this.sel.view === d.view && this.viewFolder(d.view) !== "PC") {
        d.kind = "item";
        const ids = [...this.sel.ids].filter(i => i !== "BIN");
        d.ids = ids;
        const g = d.ghost = el("div", "drag-ghost", `<span>${ids.slice(0, 3).map(i => this.icon(this.nodes.get(i))).join("")}</span>${ids.length > 1 ? `<b>${ids.length}</b>` : ""}`);
        this.root.append(g);
        this.root.querySelectorAll(".it.sel").forEach(n => n.classList.add("dragging"));
      } else { this.drag = null; return; }
    }
    if (d.kind === "item") {
      d.ghost.style.left = x + 8 + "px"; d.ghost.style.top = y + 8 + "px";
      const tgt = this.dropTarget(e, d);
      this.root.querySelectorAll(".drop").forEach(n => n.classList.remove("drop"));
      if (tgt && tgt.el) tgt.el.classList.add("drop");
      d.tgt = tgt;
      d.ghost.dataset.tip = tgt ? (tgt.to === "BIN" ? "휴지통으로 이동" : `${this.label(tgt.to)}(으)로 이동`) : "";
      return;
    }
    if (d.kind === "maybeMarq" && Math.hypot(x - d.sx, y - d.sy) > 6) {
      d.kind = "marq"; d.box = el("div", "marq"); this.root.append(d.box);
    }
    if (d.kind === "marq") {
      const l = Math.min(x, d.sx), t = Math.min(y, d.sy), w = Math.abs(x - d.sx), h = Math.abs(y - d.sy);
      Object.assign(d.box.style, { left: l + "px", top: t + "px", width: w + "px", height: h + "px" });
      const R = this.root.getBoundingClientRect(), ids = new Set();
      d.vEl.querySelectorAll(".it").forEach(it => {
        const r = it.getBoundingClientRect(), rx = r.left - R.left, ry = r.top - R.top;
        if (rx < l + w && rx + r.width > l && ry < t + h && ry + r.height > t) ids.add(it.dataset.id);
      });
      this.sel = { view: d.view, ids }; this.refreshSel();
    }
  }
  dropTarget(e, d) {
    const under = document.elementFromPoint(e.clientX, e.clientY);
    if (!under || !this.root.contains(under)) return null;
    const it = under.closest(".it");
    if (it && !d.ids.includes(it.dataset.id)) {
      if (it.dataset.id === "BIN") return { to: "BIN", el: it };
      const n = this.nodes.get(it.dataset.id);
      if (n && n.type === "folder" && n.parent !== "BIN") return { to: n.id, el: it };
    }
    const nb = under.closest(".w-nav [data-f]");
    if (nb && nb.dataset.f !== "PC") return { to: nb.dataset.f, el: nb };
    const v = under.closest("[data-view]");
    if (v) {
      const f = this.viewFolder(v.dataset.view);
      const src = this.nodes.get(d.ids[0]);
      if (f && f !== "PC" && src && f !== src.parent) return { to: f, el: v };
    }
    return null;
  }
  onUp(e) {
    const d = this.drag; if (!d) return;
    this.drag = null;
    if (d.kind === "win" && d.moved) { this.emit("moveWindow", { w: d.w, kind: d.w.kind, dist: Math.hypot(d.w.x - d.ox, d.w.y - d.oy) }); return; }
    if (d.kind === "size" && d.moved) { this.emit("resize", { w: d.w, kind: d.w.kind, dw: d.w.w - d.ow, dh: d.w.h - d.oh }); return; }
    if (d.kind === "maybeItem" && d.pending && !e.ctrlKey && !e.shiftKey) { this.sel = { view: d.view, ids: new Set([d.id]) }; this.anchor = d.id; this.refreshSel(); return; }
    if (d.kind === "item") {
      d.ghost.remove();
      this.root.querySelectorAll(".dragging,.drop").forEach(n => n.classList.remove("dragging", "drop"));
      const t = d.tgt;
      if (!t) return;
      if (t.to === "BIN") this.del("drag", d.ids);
      else this.moveTo(d.ids, t.to, "drag");
      return;
    }
    if (d.kind === "marq") { d.box.remove(); this.emit("marquee", { count: this.sel.ids.size, names: this.selNames() }); this.emit("select", { names: this.selNames(), via: "marquee" }); }
  }
  onCtx(e) {
    e.preventDefault();
    if (this.dlg) return;
    const t = e.target;
    if (t.closest(".ws-ctx") || t.closest(".np-ta") || t.closest(".ws-bar")) return;
    const [x, y] = this.rel(e);
    const it = t.closest(".it"), vEl = t.closest("[data-view]");
    if (it && vEl) {
      const view = vEl.dataset.view;
      this.setActive(view);
      if (!(this.sel.view === view && this.sel.ids.has(it.dataset.id))) this.selectOnly(view, [it.dataset.id]);
      this.showMenu(x, y, this.itemMenu(view, it.dataset.id));
      this.emit("ctxmenu", { on: "item", name: this.selNames()[0], view });
    } else if (vEl) {
      const view = vEl.dataset.view;
      this.setActive(view);
      const m = this.bgMenu(view);
      if (m) { this.showMenu(x, y, m); this.emit("ctxmenu", { on: "bg", view, folder: this.pathStr(this.viewFolder(view)) }); }
    }
  }
  onClick(e) {
    const t = e.target;
    const b = t.closest("button");
    if (!b || this.dlg || t.closest(".ws-dlg")) return;
    const winEl = b.closest(".win"), w = winEl && this.win(winEl.dataset.wid);
    if (b.classList.contains("bar-start")) {
      this.start.hidden = !this.start.hidden;
      this.emit(this.start.hidden ? "startClose" : "startOpen", {});
      return;
    }
    if (b.dataset.app) {
      const a = b.dataset.app;
      this.start.hidden = true; this.emit("startClose", {});
      if (a === "explorer") this.openExplorer("PC");
      else if (a === "notepad") this.openWin("notepad");
      else if (a === "calc") this.openWin("calc");
      else if (a === "photos") this.openExplorer("PICS");
      else if (a === "power") this.toast("연습 화면에서는 컴퓨터를 끌 수 없어요. 진짜 컴퓨터를 끌 때는 <b>시작 → 전원 → 시스템 종료</b>!");
      else this.toast(`'${b.textContent.trim()}'은(는) 이 연습 화면에서는 열 수 없어요.`);
      this.emit("startApp", { app: a });
      return;
    }
    if (b.dataset.bar === "explorer") {
      const exps = this.wins.filter(x => x.kind === "explorer");
      if (!exps.length) { this.openExplorer("PC"); return; }
      const top = this.topWin(), cur = exps.sort((a, c) => c.z - a.z)[0];
      if (cur.min) this.unminWin(cur, "bar");
      else if (top === cur) this.minWin(cur);
      else { this.focusWin(cur); }
      return;
    }
    if (b.dataset.wbar) {
      const x = this.win(b.dataset.wbar);
      if (x.min) this.unminWin(x, "bar"); else if (this.topWin() === x) this.minWin(x); else this.focusWin(x);
      return;
    }
    if (w && b.dataset.b) {
      if (b.dataset.b === "close") this.closeWin(w);
      else if (b.dataset.b === "min") this.minWin(w);
      else this.toggleMax(w, "btn");
      return;
    }
    if (w && w.kind === "explorer") {
      this.active = w.id;
      if (b.dataset.f) { this.nav(w, b.dataset.f, "pane"); return; }
      if (b.dataset.crumb) { this.nav(w, b.dataset.crumb, "crumb"); return; }
      if (b.dataset.n === "back" && w.hist.length) { this.nav(w, null, "back"); return; }
      if (b.dataset.n === "fwd" && w.fwd.length) { this.nav(w, null, "fwd"); return; }
      if (b.dataset.n === "up") { const n = this.nodes.get(w.folder); if (n) this.nav(w, n.parent, "up"); return; }
      const tt = b.dataset.t;
      if (tt === "new") { const R = b.getBoundingClientRect(), RR = this.root.getBoundingClientRect(); this.showMenu(R.left - RR.left, R.bottom - RR.top + 2, [{ ic: "📁", t: "폴더", fn: () => this.newItem("folder", "toolbar") }, { ic: "📝", t: "텍스트 문서", fn: () => this.newItem("txt", "toolbar") }]); return; }
      if (tt === "cut") this.copy("toolbar", "cut");
      if (tt === "copy") this.copy("toolbar");
      if (tt === "paste") this.paste("toolbar");
      if (tt === "rename") this.startRename("toolbar");
      if (tt === "del") this.del("toolbar");
      if (tt === "empty") this.emptyBin("toolbar");
      if (tt === "restoreAll") this.restore(this.binItems().map(n => n.id), "toolbar");
      return;
    }
    if (w && w.kind === "calc" && b.dataset.c) { this.calcKey(w, b.dataset.c); return; }
    if (w && w.kind === "notepad" && b.dataset.m) { this.npMenu(w, b); return; }
    if (w && b.dataset.play != null) {
      const bar = w.el.querySelector(".vw-bar i");
      w.playing = !w.playing; b.textContent = w.playing ? "⏸ 일시 정지" : "▶ 재생";
      bar.classList.toggle("go", w.playing);
      this.emit("play", { w, playing: w.playing });
    }
  }
  onKey(e) {
    if (!this.root.isConnected) return;
    const t = e.target, inText = t.tagName === "TEXTAREA" || t.tagName === "INPUT";
    if (e.code === "Escape") { this.hideMenu(); if (!this.start.hidden) { this.start.hidden = true; this.emit("startClose", {}); } }
    if (inText) return;
    if (this.dlg) return;
    const c = e.code, ctrl = e.ctrlKey || e.metaKey;
    if (ctrl && c === "KeyC") { e.preventDefault(); this.copy("key"); }
    else if (ctrl && c === "KeyX") { e.preventDefault(); this.copy("key", "cut"); }
    else if (ctrl && c === "KeyV") { e.preventDefault(); this.paste("key"); }
    else if (ctrl && c === "KeyZ") { e.preventDefault(); this.undo(); }
    else if (ctrl && c === "KeyA") {
      e.preventDefault();
      const v = this.active, vEl = this.root.querySelector(`[data-view="${v}"]`); if (!vEl) return;
      this.selectOnly(v, [...vEl.querySelectorAll(".it")].map(x => x.dataset.id).filter(id => id !== "BIN"));
      this.emit("select", { names: this.selNames(), via: "all" });
    }
    else if (c === "Delete") { e.preventDefault(); this.del("key"); }
    else if (c === "F2") { e.preventDefault(); this.startRename("key"); }
    else if (c === "Enter" || c === "NumpadEnter") { if (this.sel.view === this.active && this.sel.ids.size === 1) { e.preventDefault(); this.openItem([...this.sel.ids][0], this.active); } }
    else if (c === "Backspace") { const w = this.win(this.active); if (w && w.hist.length) { e.preventDefault(); this.nav(w, null, "back"); } }
  }

  /* ===== 계산기 ===== */
  calcKey(w, k) {
    const num = s => parseFloat(s), fmt = v => { if (!isFinite(v)) return "0으로 나눌 수 없습니다"; return String(Math.round(v * 1e10) / 1e10); };
    const calc = (a, b, op) => op === "+" ? a + b : op === "−" ? a - b : op === "×" ? a * b : b === 0 ? Infinity : a / b;
    if (/\d/.test(k)) { w.disp = w.fresh || w.disp === "0" ? k : (w.disp.length < 14 ? w.disp + k : w.disp); w.fresh = false; }
    else if (k === ".") { if (w.fresh) { w.disp = "0."; w.fresh = false; } else if (!w.disp.includes(".")) w.disp += "."; }
    else if (k === "C") { w.disp = "0"; w.acc = null; w.op = null; w.fresh = true; }
    else if (k === "←") { if (!w.fresh) w.disp = w.disp.length > 1 ? w.disp.slice(0, -1) : "0"; }
    else if (k === "±") w.disp = fmt(-num(w.disp));
    else if (k === "%") w.disp = fmt(num(w.disp) / 100);
    else if (k === "=") { if (w.op != null) { w.disp = fmt(calc(w.acc, num(w.disp), w.op)); w.acc = null; w.op = null; } w.fresh = true; }
    else { if (w.op != null && !w.fresh) w.disp = fmt(calc(w.acc, num(w.disp), w.op)); w.acc = num(w.disp); w.op = k; w.fresh = true; }
    w.el.querySelector(".calc-disp").textContent = w.disp;
    this.emit("calc", { key: k, display: w.disp });
  }

  /* ===== 메모장 ===== */
  wireNotepad(w) {
    const ta = w.ta = w.el.querySelector(".np-ta");
    ta.value = w.text;
    let lastSel = "";
    const selText = () => ta.value.slice(ta.selectionStart, ta.selectionEnd);
    const reportSel = () => { const s = selText(); if (s !== lastSel) { lastSel = s; if (s) this.emit("textSelect", { w, text: s }); } };
    ta.addEventListener("input", () => { w.text = ta.value; if (!w.dirty) { w.dirty = true; this.renderWin(w); this.renderBar(); } this.emit("type", { w, text: ta.value }); });
    ta.addEventListener("select", reportSel);
    ta.addEventListener("mouseup", () => setTimeout(reportSel, 0));
    ta.addEventListener("keyup", reportSel);
    ta.addEventListener("copy", () => { const s = selText(); if (s) { this.textClip = s; setTimeout(() => this.emit("textCopy", { w, text: s }), 0); } });
    ta.addEventListener("cut", () => { const s = selText(); if (s) { this.textClip = s; setTimeout(() => { w.text = ta.value; w.dirty = true; this.renderWin(w); this.emit("textCut", { w, text: s }); }, 0); } });
    ta.addEventListener("paste", e => {
      const s = e.clipboardData && e.clipboardData.getData("text");
      if (!s && this.textClip) { e.preventDefault(); ta.setRangeText(this.textClip, ta.selectionStart, ta.selectionEnd, "end"); }
      setTimeout(() => { w.text = ta.value; w.dirty = true; this.renderWin(w); this.emit("textPaste", { w, text: ta.value }); }, 0);
    });
    ta.addEventListener("keydown", e => {
      if ((e.ctrlKey || e.metaKey) && e.code === "KeyS") { e.preventDefault(); this.saveNote(w, e.shiftKey, "key"); }
    });
    ta.addEventListener("pointerdown", () => { this.active = w.id; });
    setTimeout(() => ta.focus(), 0);
  }
  npMenu(w, b) {
    const R = b.getBoundingClientRect(), RR = this.root.getBoundingClientRect(), ta = w.ta;
    const items = b.dataset.m === "file" ? [
      { t: "새로 만들기", k: "Ctrl+N", fn: () => this.openWin("notepad") },
      { t: "저장", k: "Ctrl+S", fn: () => this.saveNote(w, false, "menu") },
      { t: "다른 이름으로 저장", k: "Ctrl+Shift+S", fn: () => this.saveNote(w, true, "menu") }, "-",
      { t: "끝내기", fn: () => this.closeWin(w) }
    ] : b.dataset.m === "edit" ? [
      { t: "실행 취소", k: "Ctrl+Z", fn: () => { ta.focus(); document.execCommand("undo"); } }, "-",
      { t: "잘라내기", k: "Ctrl+X", fn: () => { ta.focus(); if (!document.execCommand("cut")) { const s = ta.value.slice(ta.selectionStart, ta.selectionEnd); if (s) { this.textClip = s; ta.setRangeText("", ta.selectionStart, ta.selectionEnd, "end"); w.text = ta.value; w.dirty = true; this.renderWin(w); this.emit("textCut", { w, text: s }); } } } },
      { t: "복사", k: "Ctrl+C", fn: () => { ta.focus(); if (!document.execCommand("copy")) { const s = ta.value.slice(ta.selectionStart, ta.selectionEnd); if (s) { this.textClip = s; this.emit("textCopy", { w, text: s }); } } } },
      { t: "붙여넣기", k: "Ctrl+V", dis: !this.textClip, fn: () => { ta.focus(); ta.setRangeText(this.textClip, ta.selectionStart, ta.selectionEnd, "end"); w.text = ta.value; w.dirty = true; this.renderWin(w); this.emit("textPaste", { w, text: ta.value }); } },
      { t: "모두 선택", k: "Ctrl+A", fn: () => { ta.focus(); ta.select(); } }
    ] : [{ t: "확대하기", k: "Ctrl++", fn: () => { ta.style.fontSize = (parseFloat(getComputedStyle(ta).fontSize) + 2) + "px"; } }, { t: "축소하기", k: "Ctrl+-", fn: () => { ta.style.fontSize = Math.max(10, parseFloat(getComputedStyle(ta).fontSize) - 2) + "px"; } }];
    this.showMenu(R.left - RR.left, R.bottom - RR.top, items);
  }
  saveNote(w, as, via, after) {
    w.text = w.ta.value;
    if (w.file && !as && this.nodes.get(w.file) && this.nodes.get(w.file).parent !== "BIN") {
      const f = this.nodes.get(w.file); f.content = w.text; w.dirty = false; this.refresh();
      this.toast(`💾 <b>${esc(f.name)}</b>에 저장했어요.`);
      this.emit("save", { w, name: f.name, path: this.pathStr(f.parent), content: f.content, via });
      if (after) after();
      return;
    }
    this.saveDialog(w, via, after);
  }
  dialog(html) {
    const d = this.dlg = el("div", "ws-dlg-bg", `<div class="ws-dlg">${html}</div>`);
    this.root.append(d);
    return d.firstChild;
  }
  closeDialog() { if (this.dlg) { this.dlg.remove(); this.dlg = null; } }
  saveDialog(w, via, after) {
    let folder = w.file && this.nodes.get(w.file) ? this.nodes.get(w.file).parent : "DOCS";
    if (folder === "BIN") folder = "DOCS";
    const box = this.dialog(`<div class="dl-h">다른 이름으로 저장</div>
      <div class="dl-body"><div class="dl-nav">${SPECIAL.map(s => `<button type="button" data-f="${s[0]}"><span>${s[2]}</span>${s[1]}</button>`).join("")}</div>
      <div class="dl-main"><div class="dl-path"></div><div class="dl-list"></div></div></div>
      <label class="dl-name">파일 이름: <input type="text" spellcheck="false" value="${esc(w.file && this.nodes.get(w.file) ? this.nodes.get(w.file).name : "제목 없음")}"></label>
      <div class="dl-type">파일 형식: 텍스트 문서(*.txt)</div>
      <div class="dl-btns"><button type="button" class="dl-ok">저장</button><button type="button" class="dl-no">취소</button></div>`);
    const inp = box.querySelector("input");
    const draw = () => {
      box.querySelector(".dl-path").textContent = "📁 " + this.pathStr(folder).replace(/\//g, " › ");
      box.querySelectorAll(".dl-nav [data-f]").forEach(b => b.classList.toggle("on", b.dataset.f === folder));
      const list = this.kids(folder).filter(n => n.type === "folder" || n.ext === "txt");
      box.querySelector(".dl-list").innerHTML = list.map(n => `<button type="button" data-id="${n.id}">${this.icon(n)} ${esc(n.name)}</button>`).join("") || `<span class="dl-empty">비어 있음</span>`;
    };
    draw();
    setTimeout(() => { inp.focus(); inp.select(); }, 0);
    box.addEventListener("click", e => {
      const b = e.target.closest("button"); if (!b) return;
      if (b.dataset.f) { folder = b.dataset.f; draw(); }
      else if (b.dataset.id) { const n = this.nodes.get(b.dataset.id); if (n.type === "folder") { folder = n.id; draw(); } else inp.value = n.name; }
      else if (b.classList.contains("dl-no")) { this.closeDialog(); this.emit("saveCancel", { w }); }
      else if (b.classList.contains("dl-ok")) ok();
    });
    inp.addEventListener("keydown", e => { e.stopPropagation(); if (e.key === "Enter") { e.preventDefault(); ok(); } if (e.key === "Escape") { this.closeDialog(); } });
    const ok = () => {
      const name = inp.value.trim();
      if (!name) { this.toast("파일 이름을 써 주세요."); return; }
      if (BAD.test(name)) { this.toast('이름에는 \\ / : * ? " < > | 를 쓸 수 없어요.'); return; }
      let f = this.kids(folder).find(n => n.ext === "txt" && n.name === name);
      if (f) f.content = w.text; else f = this.nodes.get(this.add(folder, name, "txt", w.text));
      w.file = f.id; w.dirty = false;
      this.closeDialog(); this.refresh();
      this.toast(`💾 <b>${esc(this.label(folder))}</b>에 <b>${esc(name)}</b>(으)로 저장했어요.`);
      this.emit("save", { w, name, path: this.pathStr(folder), content: w.text, via, as: true });
      if (after) after();
    };
  }
  askSave(w) {
    const nm = w.file && this.nodes.get(w.file) ? this.nodes.get(w.file).name : "제목 없음";
    const box = this.dialog(`<div class="dl-h">메모장</div><p class="dl-q">변경 내용을 <b>${esc(nm)}</b>에 저장하시겠습니까?</p><div class="dl-btns"><button type="button" data-a="s" class="dl-ok">저장</button><button type="button" data-a="n">저장 안 함</button><button type="button" data-a="c">취소</button></div>`);
    box.addEventListener("click", e => {
      const b = e.target.closest("button[data-a]"); if (!b) return;
      this.closeDialog();
      if (b.dataset.a === "s") this.saveNote(w, false, "close", () => this.closeWin(w, true));
      else if (b.dataset.a === "n") this.closeWin(w, true);
    });
  }
}

window.WinSim = Sim;
})();
