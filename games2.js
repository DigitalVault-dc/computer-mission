// 0단계 추가 게임: 클릭(짝 맞추기·점 잇기·색칠하기)과 끌기(퍼즐·모양 맞추기·얼굴 꾸미기)
(function () {
const { el, shuffle, rand, pick } = window.UI;
const ACTS = window.ACTS;

/* ---------- 짝 맞추기 ---------- */
ACTS["memory"] = {
  name: "짝 맞추기", icon: "🃏", type: "game", mins: 5,
  desc: "카드를 두 장씩 뒤집어서 같은 그림 짝을 찾아요.",
  run(ctx) {
    const L = ctx.level, pairs = [6, 8, 12][L - 1], cols = [4, 4, 6][L - 1];
    const faces = shuffle(["🐶", "🐱", "🐰", "🐻", "🐼", "🦁", "🐸", "🐵", "🐧", "🦄", "🐙", "🦋", "🐢", "🐬"]).slice(0, pairs);
    const deck = shuffle([...faces, ...faces]);
    let open = [], found = 0, tries = 0, lock = false;
    const grid = el("div", "g-mem");
    grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    grid.style.maxWidth = cols * 130 + "px";
    const upd = () => ctx.hud(`찾은 짝 <b>${found}</b> / ${pairs} · 뒤집은 횟수 ${tries}`);
    deck.forEach(f => {
      const c = el("button", "mem-card", `<span class="mem-in"><span class="mem-back">?</span><span class="mem-face">${f}</span></span>`);
      c.type = "button"; c.setAttribute("aria-label", "카드");
      c.addEventListener("click", () => {
        if (lock || c.classList.contains("up")) return;
        c.classList.add("up"); open.push(c);
        if (open.length < 2) return;
        tries++; lock = true;
        const [a, b] = open;
        if (a.dataset.f === b.dataset.f) {
          setTimeout(() => {
            a.classList.add("got"); b.classList.add("got"); open = []; lock = false; found++; upd();
            if (found === pairs) ctx.done(3, `짝 ${pairs}개를 모두 찾았어요! (${tries}번 뒤집었어요)`);
          }, 350);
        } else {
          setTimeout(() => { a.classList.remove("up"); b.classList.remove("up"); open = []; lock = false; }, 850);
        }
        upd();
      });
      c.dataset.f = f;
      grid.append(c);
    });
    ctx.arena.append(grid);
    upd();
  }
};

/* ---------- 점 잇기 ---------- */
const SHAPES = (() => {
  const star = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 19 : 44; star.push([50 + r * Math.cos(a), 52 + r * Math.sin(a)]); }
  const heart = []; for (let i = 0; i < 40; i++) { const t = i / 40 * Math.PI * 2; heart.push([50 + 2.6 * 16 * Math.pow(Math.sin(t), 3), 46 - 2.6 * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t))]); }
  return [
    { name: "별", color: "#f5c542", pts: star },
    { name: "하트", color: "#ee6b8b", pts: heart },
    { name: "집", color: "#e8945a", pts: [[18, 88], [18, 46], [50, 14], [82, 46], [82, 88]] },
    { name: "물고기", color: "#4ba3e0", pts: [[8, 50], [22, 34], [44, 26], [64, 32], [78, 48], [94, 30], [94, 70], [78, 52], [64, 68], [44, 74], [22, 66]] },
    { name: "다이아몬드", color: "#7fd1e8", pts: [[28, 20], [72, 20], [92, 40], [50, 90], [8, 40]] }
  ];
})();
function samplePoly(pts, n) {
  const seg = pts.map((p, i) => { const q = pts[(i + 1) % pts.length]; return Math.hypot(q[0] - p[0], q[1] - p[1]); });
  const total = seg.reduce((a, b) => a + b, 0), out = [];
  for (let k = 0; k < n; k++) {
    let d = total * k / n, i = 0;
    while (d > seg[i]) { d -= seg[i]; i++; }
    const p = pts[i], q = pts[(i + 1) % pts.length], t = d / seg[i];
    out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
  }
  return out;
}
ACTS["dots"] = {
  name: "점 잇기", icon: "✏️", type: "game", mins: 4,
  desc: "1부터 순서대로 숫자를 클릭하면 선이 이어지고 그림이 나타나요.",
  run(ctx) {
    const L = ctx.level, n = [10, 15, 20][L - 1], size = [50, 40, 30][L - 1];
    const sh = pick(SHAPES), pts = samplePoly(sh.pts, n);
    let next = 0, miss = 0;
    const box = el("div", "g-dots");
    box.innerHTML = `<svg viewBox="0 0 100 100" class="dots-svg"><polygon class="dots-fill" points="${pts.map(p => p.join(",")).join(" ")}" style="fill:${sh.color}"/><polyline class="dots-line" points=""/></svg><div class="dots-done" hidden>${sh.name} 완성!</div>`;
    ctx.arena.append(box);
    const line = box.querySelector(".dots-line"), drawn = [];
    const upd = () => ctx.hud(`다음 숫자 <b>${Math.min(next + 1, n)}</b> · 이은 점 ${next} / ${n} · 실수 ${miss}`);
    pts.forEach((p, i) => {
      const d = el("button", "dot", String(i + 1));
      d.type = "button";
      d.style.left = p[0] + "%"; d.style.top = p[1] + "%";
      d.style.width = d.style.height = size + "px"; d.style.fontSize = size * 0.42 + "px";
      d.addEventListener("click", () => {
        if (i !== next) { if (!d.classList.contains("on")) { miss++; d.classList.remove("shake"); void d.offsetWidth; d.classList.add("shake"); upd(); if (miss >= 6) ctx.fail("막 누르면 안 돼요! 잘 보고 천천히, 정확하게 다시 해 봐요."); } return; }
        d.classList.add("on"); drawn.push(p.join(",")); next++;
        line.setAttribute("points", drawn.join(" ") + (next === n ? " " + pts[0].join(",") : ""));
        upd();
        if (next === n) {
          box.classList.add("finished"); box.querySelector(".dots-done").hidden = false;
          ctx.after(() => ctx.done(miss <= 1 ? 3 : miss <= 3 ? 2 : 1, `${sh.name}을(를) 완성했어요! 실수 ${miss}번`), 1300);
        }
      });
      box.append(d);
    });
    box.querySelector(".dot").classList.add("first");
    upd();
  }
};

/* ---------- 색칠하기 (숫자 색칠) ---------- */
const PAL = { 1: ["하늘색", "#9fd8f5"], 2: ["노랑", "#ffd23f"], 3: ["초록", "#7bc96f"], 4: ["살구색", "#f6c28b"], 5: ["빨강", "#e0574f"], 6: ["갈색", "#9a6332"], 7: ["연노랑", "#fff3a0"], 8: ["밤색", "#7a5546"], 9: ["진초록", "#2f8f4a"], 10: ["보라", "#b9a6f0"], 11: ["분홍", "#ff7eb6"], 12: ["회색", "#9aa3a8"] };
const REG = [
  { n: 1, s: '<rect x="0" y="0" width="400" height="210"/>', t: [120, 32] },
  { n: 2, s: '<circle cx="340" cy="55" r="28"/>', t: [340, 61] },
  { n: 10, s: '<path d="M60 92 a22 22 0 0 1 22 -30 a28 28 0 0 1 50 -2 a20 20 0 0 1 12 32 z"/>', t: [104, 84] },
  { n: 10, s: '<path d="M200 70 a16 16 0 0 1 16 -22 a20 20 0 0 1 36 -2 a14 14 0 0 1 8 24 z"/>', t: [232, 64] },
  { n: 3, s: '<rect x="0" y="205" width="400" height="95"/>', t: [330, 285] },
  { n: 12, s: '<rect x="248" y="78" width="20" height="44"/>', t: [258, 104] },
  { n: 4, s: '<rect x="150" y="130" width="130" height="110"/>', t: [168, 228] },
  { n: 5, s: '<polygon points="134,134 215,70 296,134"/>', t: [215, 120] },
  { n: 6, s: '<rect x="200" y="180" width="34" height="60"/>', t: [217, 215] },
  { n: 7, s: '<rect x="160" y="148" width="30" height="26"/>', t: [175, 166] },
  { n: 7, s: '<rect x="244" y="148" width="30" height="26"/>', t: [259, 166] },
  { n: 8, s: '<rect x="70" y="168" width="16" height="66"/>', t: [78, 212] },
  { n: 9, s: '<circle cx="78" cy="148" r="36"/>', t: [78, 154] },
  { n: 11, s: '<circle cx="120" cy="262" r="10"/>', t: [120, 266] },
  { n: 11, s: '<circle cx="330" cy="252" r="10"/>', t: [330, 256] },
  { n: 11, s: '<circle cx="364" cy="270" r="10"/>', t: [364, 274] }
];
ACTS["color"] = {
  name: "숫자 색칠하기", icon: "🖍️", type: "game", mins: 5,
  desc: "아래에서 색을 골라 클릭하고, 같은 숫자가 쓰인 곳을 클릭해서 색칠해요.",
  run(ctx) {
    const L = ctx.level, use = [[1, 2, 3, 4, 5, 6], [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]][L - 1];
    let cur = 0, miss = 0, left = 0;
    const wrap = el("div", "g-color");
    wrap.innerHTML = `<svg viewBox="0 0 400 300" class="col-svg">${REG.map((r, i) => {
      const active = use.includes(r.n);
      if (active) left++;
      return `<g class="reg ${active ? "" : "pre"}" data-i="${i}" data-n="${r.n}" style="${active ? "" : `fill:${PAL[r.n][1]}`}">${r.s}${active ? `<text x="${r.t[0]}" y="${r.t[1]}">${r.n}</text>` : ""}</g>`;
    }).join("")}</svg>
    <div class="col-pal">${use.map(n => `<button type="button" class="sw" data-n="${n}" style="--sw:${PAL[n][1]}"><i></i><b>${n}</b><span>${PAL[n][0]}</span></button>`).join("")}</div>`;
    ctx.arena.append(wrap);
    const total = left;
    const upd = () => ctx.hud(cur ? `고른 색 <b>${cur}번</b> ${PAL[cur][0]} · 남은 칸 ${left} / ${total} · 실수 ${miss}` : `먼저 아래에서 <b>색</b>을 골라요 · 남은 칸 ${left} / ${total}`);
    wrap.querySelectorAll(".sw").forEach(b => b.addEventListener("click", () => {
      cur = +b.dataset.n;
      wrap.querySelectorAll(".sw").forEach(x => x.classList.toggle("on", x === b));
      upd();
    }));
    wrap.querySelectorAll(".reg:not(.pre)").forEach(g => g.addEventListener("click", () => {
      if (g.classList.contains("done")) return;
      const n = +g.dataset.n;
      if (!cur) { upd(); wrap.querySelector(".col-pal").classList.remove("shake"); void wrap.offsetWidth; wrap.querySelector(".col-pal").classList.add("shake"); return; }
      if (n !== cur) { miss++; if (miss >= 7) { ctx.fail("막 누르면 안 돼요! 잘 보고 천천히, 정확하게 다시 해 봐요."); return; } g.classList.remove("shake"); void g.getBBox(); g.classList.add("shake"); setTimeout(() => g.classList.remove("shake"), 400); upd(); return; }
      g.classList.add("done"); g.style.fill = PAL[n][1]; left--; upd();
      if (!left) ctx.after(() => ctx.done(miss <= 1 ? 3 : miss <= 4 ? 2 : 1, `그림을 다 색칠했어요! 실수 ${miss}번`), 700);
    }));
    upd();
  }
};

/* ---------- 퍼즐 ---------- */
function puzzleImage() {
  const c = document.createElement("canvas"); c.width = 480; c.height = 360;
  const g = c.getContext("2d");
  const sky = g.createLinearGradient(0, 0, 0, 240); sky.addColorStop(0, "#6ec6f0"); sky.addColorStop(1, "#d6f1ff");
  g.fillStyle = sky; g.fillRect(0, 0, 480, 360);
  ["#ff5b5b", "#ffa53b", "#ffe14d", "#5fd068", "#4aa3ff", "#8a6bff"].forEach((col, i) => { g.strokeStyle = col; g.lineWidth = 12; g.beginPath(); g.arc(240, 260, 200 - i * 12, Math.PI, 0); g.stroke(); });
  g.fillStyle = "#ffd23f"; g.beginPath(); g.arc(400, 70, 40, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#fff"; [[80, 70], [110, 60], [140, 72]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 24, 0, Math.PI * 2); g.fill(); });
  g.fillStyle = "#58b85c"; g.beginPath(); g.moveTo(0, 360); g.quadraticCurveTo(120, 210, 260, 300); g.quadraticCurveTo(380, 220, 480, 280); g.lineTo(480, 360); g.fill();
  g.fillStyle = "#3f9a46"; g.fillRect(0, 320, 480, 40);
  g.fillStyle = "#f6c28b"; g.fillRect(300, 230, 110, 90);
  g.fillStyle = "#e0574f"; g.beginPath(); g.moveTo(290, 232); g.lineTo(355, 180); g.lineTo(420, 232); g.fill();
  g.fillStyle = "#9a6332"; g.fillRect(340, 270, 28, 50);
  g.fillStyle = "#fff3a0"; g.fillRect(312, 248, 22, 20); g.fillRect(378, 248, 22, 20);
  g.fillStyle = "#7a5546"; g.fillRect(84, 250, 16, 70);
  g.fillStyle = "#2f8f4a"; g.beginPath(); g.arc(92, 236, 40, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#ff5b8a"; [[150, 330], [180, 340], [210, 328], [440, 334]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 8, 0, Math.PI * 2); g.fill(); });
  return c.toDataURL();
}
ACTS["puzzle"] = {
  name: "그림 퍼즐", icon: "🧩", type: "game", mins: 5,
  desc: "조각을 누른 채 끌어서 알맞은 자리에 놓아 그림을 완성해요.",
  run(ctx) {
    const L = ctx.level, [cols, rows] = [[2, 2], [3, 2], [3, 3]][L - 1], N = cols * rows;
    const img = puzzleImage(), a = ctx.arena;
    let placed = 0, drops = 0;
    const upd = () => ctx.hud(`맞춘 조각 <b>${placed}</b> / ${N}`);
    requestAnimationFrame(() => {
      const W = a.clientWidth, H = a.clientHeight, side = W >= 720;
      const bw = side ? Math.min(W * 0.46, (H - 40) * 4 / 3) : Math.min(W - 40, H * 0.5 * 4 / 3), bh = bw * 3 / 4;
      const bx = side ? W - bw - 24 : (W - bw) / 2, by = side ? (H - bh) / 2 : 16;
      const pw = bw / cols, ph = bh / rows;
      const board = el("div", "pz-board" + (L === 1 ? " ghost" : L === 2 ? " lines" : ""));
      Object.assign(board.style, { left: bx + "px", top: by + "px", width: bw + "px", height: bh + "px", backgroundImage: L === 1 ? `url(${img})` : "", "--pw": pw + "px", "--ph": ph + "px" });
      a.append(board);
      const areaX = side ? [12, Math.max(13, bx - pw - 20)] : [10, Math.max(11, W - pw - 10)];
      const areaY = side ? [12, Math.max(13, H - ph - 12)] : [by + bh + 16, Math.max(by + bh + 17, H - ph - 10)];
      const aw = areaX[1] + pw - areaX[0], ah = areaY[1] + ph - areaY[0];
      let gc = Math.max(1, Math.floor(aw / (pw + 10))), gr = Math.ceil(N / gc);
      while (gr * (ph + 10) > ah && gc < N) { gc++; gr = Math.ceil(N / gc); }
      const stepX = gc > 1 ? (aw - pw) / (gc - 1) : 0, stepY = gr > 1 ? Math.min(ph + 10, (ah - ph) / (gr - 1)) : 0;
      const slots = shuffle(Array.from({ length: N }, (_, i) => i));
      for (let i = 0; i < N; i++) {
        const cx = i % cols, cy = Math.floor(i / cols), tx = bx + cx * pw, ty = by + cy * ph;
        const p = el("div", "pz-piece");
        Object.assign(p.style, { width: pw + "px", height: ph + "px", backgroundImage: `url(${img})`, backgroundSize: `${bw}px ${bh}px`, backgroundPosition: `-${cx * pw}px -${cy * ph}px` });
        const k = slots[i], gx = areaX[0] + (k % gc) * stepX + rand(-4, 4), gy = areaY[0] + Math.floor(k / gc) * stepY + rand(-4, 4);
        p.style.left = Math.min(W - pw, Math.max(0, gx)) + "px"; p.style.top = Math.min(H - ph, Math.max(0, gy)) + "px";
        a.append(p);
        let dx = 0, dy = 0, drag = false;
        p.addEventListener("pointerdown", e => {
          if (p.classList.contains("lock") || e.button !== 0) return;
          drag = true; p.setPointerCapture(e.pointerId); p.classList.add("hold"); a.append(p);
          const r = p.getBoundingClientRect(); dx = e.clientX - r.left; dy = e.clientY - r.top;
        });
        p.addEventListener("pointermove", e => {
          if (!drag) return;
          const r = a.getBoundingClientRect();
          p.style.left = Math.min(W - pw / 2, Math.max(-pw / 2, e.clientX - r.left - dx)) + "px";
          p.style.top = Math.min(H - ph / 2, Math.max(-ph / 2, e.clientY - r.top - dy)) + "px";
        });
        const up = () => {
          if (!drag) return;
          drag = false; p.classList.remove("hold"); drops++;
          const x = parseFloat(p.style.left), y = parseFloat(p.style.top);
          if (Math.hypot(x - tx, y - ty) < Math.min(pw, ph) * 0.38) {
            p.style.left = tx + "px"; p.style.top = ty + "px"; p.classList.add("lock"); placed++; upd();
            if (placed === N) { board.classList.add("full"); ctx.after(() => ctx.done(drops <= N * 1.5 ? 3 : drops <= N * 2.5 ? 2 : 1, `퍼즐 ${N}조각을 완성했어요!`), 700); }
          }
        };
        p.addEventListener("pointerup", up);
        p.addEventListener("pointercancel", up);
      }
      upd();
    });
  }
};

/* ---------- 모양 맞추기 ---------- */
const SHP = {
  circle: ["동그라미", '<circle cx="50" cy="50" r="42"/>', "#e85d5d"],
  square: ["네모", '<rect x="12" y="12" width="76" height="76" rx="6"/>', "#4b9fe0"],
  triangle: ["세모", '<polygon points="50,8 94,88 6,88"/>', "#f0a531"],
  star: ["별", '<polygon points="50,6 61,38 95,38 67,58 78,92 50,71 22,92 33,58 5,38 39,38"/>', "#f5c542"],
  heart: ["하트", '<path d="M50 88 C10 60 4 36 18 22 C30 10 46 16 50 30 C54 16 70 10 82 22 C96 36 90 60 50 88 Z"/>', "#ee6b8b"],
  diamond: ["마름모", '<polygon points="50,4 92,50 50,96 8,50"/>', "#4fbf86"],
  hexagon: ["육각형", '<polygon points="27,10 73,10 96,50 73,90 27,90 4,50"/>', "#a77ae0"],
  moon: ["달", '<path d="M62 8 A44 44 0 1 0 92 66 A34 34 0 1 1 62 8 Z"/>', "#7fd1e8"]
};
ACTS["shapes"] = {
  name: "모양 맞추기", icon: "🔷", type: "game", mins: 4,
  desc: "색깔 모양을 끌어서 똑같은 모양의 구멍에 쏙 넣어요.",
  run(ctx) {
    const L = ctx.level, N = [4, 6, 8][L - 1], S = [110, 92, 74][L - 1];
    const keys = shuffle(Object.keys(SHP)).slice(0, N), a = ctx.arena;
    let placed = 0, miss = 0;
    const upd = () => ctx.hud(`넣은 모양 <b>${placed}</b> / ${N} · 실수 ${miss}`);
    requestAnimationFrame(() => {
      const W = a.clientWidth, H = a.clientHeight;
      const perRow = Math.max(1, Math.min(N, Math.floor((W - 20) / (S + 18))));
      const rowsH = Math.ceil(N / perRow);
      const holes = {};
      keys.forEach((k, i) => {
        const r = Math.floor(i / perRow), c = i % perRow, inRow = Math.min(perRow, N - r * perRow);
        const x = (W - inRow * (S + 18)) / 2 + c * (S + 18) + 9, y = 16 + r * (S + 30);
        const h = el("div", "sh-hole", `<svg viewBox="0 0 100 100">${SHP[k][1]}</svg>`);
        Object.assign(h.style, { left: x + "px", top: y + "px", width: S + "px", height: S + "px" });
        a.append(h); holes[k] = { x, y, el: h };
      });
      const top = 16 + rowsH * (S + 30) + 10, spots = shuffle(keys.map((_, i) => i));
      const pcols = Math.max(1, Math.floor((W - 20) / (S + 20)));
      keys.forEach((k, i) => {
        const s = spots[i], c = s % pcols, r = Math.floor(s / pcols);
        const ox = 10 + c * (S + 20) + rand(0, 14), oy = Math.min(H - S - 6, top + r * (S + 16) + rand(0, 14));
        const p = el("div", "sh-piece", `<svg viewBox="0 0 100 100" style="fill:${SHP[k][2]}">${SHP[k][1]}</svg>`);
        Object.assign(p.style, { left: ox + "px", top: oy + "px", width: S + "px", height: S + "px" });
        p.title = SHP[k][0];
        a.append(p);
        let dx = 0, dy = 0, drag = false;
        p.addEventListener("pointerdown", e => {
          if (p.classList.contains("lock") || e.button !== 0) return;
          drag = true; p.setPointerCapture(e.pointerId); p.classList.add("hold"); a.append(p);
          const rr = p.getBoundingClientRect(); dx = e.clientX - rr.left; dy = e.clientY - rr.top;
        });
        p.addEventListener("pointermove", e => {
          if (!drag) return;
          const rr = a.getBoundingClientRect();
          p.style.left = e.clientX - rr.left - dx + "px"; p.style.top = e.clientY - rr.top - dy + "px";
        });
        const up = () => {
          if (!drag) return;
          drag = false; p.classList.remove("hold");
          const x = parseFloat(p.style.left), y = parseFloat(p.style.top);
          const hit = Object.entries(holes).find(([, h]) => Math.hypot(h.x - x, h.y - y) < S * 0.45);
          if (!hit) return;
          if (hit[0] === k) {
            p.style.left = hit[1].x + "px"; p.style.top = hit[1].y + "px"; p.classList.add("lock"); hit[1].el.classList.add("full"); placed++; upd();
            if (placed === N) ctx.after(() => ctx.done(miss === 0 ? 3 : miss <= 2 ? 2 : 1, `모양 ${N}개를 모두 맞췄어요! 실수 ${miss}번`), 600);
          } else {
            miss++; upd();
            if (miss >= 5) { ctx.fail("막 누르면 안 돼요! 잘 보고 천천히, 정확하게 다시 해 봐요."); return; }
            p.style.left = ox + "px"; p.style.top = oy + "px";
            p.classList.remove("shake"); void p.offsetWidth; p.classList.add("shake");
          }
        };
        p.addEventListener("pointerup", up);
        p.addEventListener("pointercancel", up);
      });
      upd();
    });
  }
};

/* ---------- 얼굴 꾸미기 ---------- */
const PARTS = [
  ["eyes", '<svg viewBox="0 0 100 40"><circle cx="25" cy="20" r="14" fill="#fff" stroke="#222" stroke-width="3"/><circle cx="75" cy="20" r="14" fill="#fff" stroke="#222" stroke-width="3"/><circle cx="28" cy="22" r="7" fill="#222"/><circle cx="72" cy="22" r="7" fill="#222"/></svg>', 120, 48],
  ["eyes", '<svg viewBox="0 0 100 40"><path d="M10 26 Q25 6 40 26" fill="none" stroke="#222" stroke-width="6" stroke-linecap="round"/><path d="M60 26 Q75 6 90 26" fill="none" stroke="#222" stroke-width="6" stroke-linecap="round"/></svg>', 120, 48],
  ["eyes", '<svg viewBox="0 0 100 40"><polygon points="25,2 30,15 44,15 33,24 37,38 25,29 13,38 17,24 6,15 20,15" fill="#f5c542" stroke="#b8860b" stroke-width="2"/><polygon points="75,2 80,15 94,15 83,24 87,38 75,29 63,38 67,24 56,15 70,15" fill="#f5c542" stroke="#b8860b" stroke-width="2"/></svg>', 120, 48],
  ["nose", '<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="16" fill="#e85d5d"/><circle cx="14" cy="14" r="5" fill="#fff" opacity=".6"/></svg>', 48, 48],
  ["nose", '<svg viewBox="0 0 40 40"><path d="M20 4 L32 34 L8 34 Z" fill="#f0a531"/></svg>', 44, 44],
  ["mouth", '<svg viewBox="0 0 100 50"><path d="M8 10 Q50 60 92 10" fill="none" stroke="#222" stroke-width="7" stroke-linecap="round"/></svg>', 110, 54],
  ["mouth", '<svg viewBox="0 0 100 60"><path d="M10 10 Q50 70 90 10 Z" fill="#7a2230"/><path d="M34 34 Q50 54 66 34 Q50 40 34 34" fill="#ff8aa0"/></svg>', 100, 60],
  ["mouth", '<svg viewBox="0 0 100 50"><ellipse cx="50" cy="25" rx="20" ry="18" fill="#7a2230"/></svg>', 70, 40],
  ["cheek", '<svg viewBox="0 0 40 24"><ellipse cx="20" cy="12" rx="18" ry="10" fill="#ff8fb1" opacity=".75"/></svg>', 46, 28],
  ["mus", '<svg viewBox="0 0 100 34"><path d="M50 14 C40 0 14 2 4 22 C20 14 36 22 50 20 C64 22 80 14 96 22 C86 2 60 0 50 14 Z" fill="#4a3324"/></svg>', 100, 34],
  ["emoji", "👑", 90, 90], ["emoji", "🎩", 90, 90], ["emoji", "🎀", 70, 70], ["emoji", "🕶️", 120, 70], ["emoji", "👓", 120, 70],
  ["emoji", "🌸", 56, 56], ["emoji", "⭐", 50, 50], ["emoji", "🧢", 90, 90], ["emoji", "🦋", 60, 60], ["emoji", "💧", 40, 40]
];
ACTS["face"] = {
  name: "얼굴 꾸미기", icon: "😊", type: "game", noLevel: true, mins: 5,
  desc: "옆 상자에서 눈·코·입·모자를 끌어다 얼굴을 마음대로 꾸며요.",
  run(ctx) {
    const a = ctx.arena;
    const wrap = el("div", "g-face");
    wrap.innerHTML = `<div class="fc-stage"><div class="fc-head"></div></div><div class="fc-tray"><div class="fc-h">끌어서 얼굴에 붙여요</div><div class="fc-items"></div><div class="fc-btns"><button type="button" class="ghost" data-a="clear">다시 꾸미기</button><button type="button" class="primary" data-a="done" disabled>완성!</button></div></div>`;
    a.append(wrap);
    const stage = wrap.querySelector(".fc-stage"), items = wrap.querySelector(".fc-items"), doneBtn = wrap.querySelector('[data-a="done"]');
    const count = () => { const n = stage.querySelectorAll(".fc-part").length; doneBtn.disabled = n < 5; ctx.hud(n < 5 ? `붙인 것 <b>${n}</b>개 · 5개 이상 붙이면 [완성!]을 누를 수 있어요` : `붙인 것 <b>${n}</b>개 · 다 꾸몄으면 [완성!]을 눌러요`); };
    const mk = (p) => { const d = el("div", "fc-part", p[0] === "emoji" ? `<span style="font-size:${p[2] * 0.8}px">${p[1]}</span>` : p[1]); d.style.width = p[2] + "px"; d.style.height = p[3] + "px"; return d; };
    function drag(node, e, fromTray) {
      const ar = a.getBoundingClientRect(), r = node.getBoundingClientRect();
      let piece = node;
      if (fromTray) { piece = mk(PARTS[+node.dataset.i]); piece.style.position = "absolute"; a.append(piece); }
      else a.append(piece);
      const dx = e.clientX - r.left, dy = e.clientY - r.top;
      piece.classList.add("hold");
      const mv = ev => { piece.style.left = ev.clientX - ar.left - dx + "px"; piece.style.top = ev.clientY - ar.top - dy + "px"; };
      mv(e);
      const up = ev => {
        document.removeEventListener("pointermove", mv); document.removeEventListener("pointerup", up);
        piece.classList.remove("hold");
        const sr = stage.getBoundingClientRect(), pr = piece.getBoundingClientRect();
        const cx = pr.left + pr.width / 2, cy = pr.top + pr.height / 2;
        if (cx > sr.left && cx < sr.right && cy > sr.top && cy < sr.bottom) {
          stage.append(piece);
          piece.style.left = pr.left - sr.left + "px"; piece.style.top = pr.top - sr.top + "px";
          piece.onpointerdown = pe => { if (pe.button === 0) { pe.preventDefault(); drag(piece, pe, false); } };
        } else piece.remove();
        count();
      };
      document.addEventListener("pointermove", mv); document.addEventListener("pointerup", up);
      ctx.cleanup(() => { document.removeEventListener("pointermove", mv); document.removeEventListener("pointerup", up); });
    }
    PARTS.forEach((p, i) => {
      const b = el("div", "fc-pick"); b.dataset.i = i; b.append(mk(p));
      b.addEventListener("pointerdown", e => { if (e.button === 0) { e.preventDefault(); drag(b, e, true); } });
      items.append(b);
    });
    wrap.querySelector('[data-a="clear"]').onclick = () => { stage.querySelectorAll(".fc-part").forEach(n => n.remove()); count(); };
    doneBtn.onclick = () => ctx.done(3, "멋진 얼굴이 완성됐어요! 친구에게 보여 주세요.");
    count();
  }
};

const GAMES = ["follow", "balloon", "hamster", "target", "memory", "dots", "color", "gift", "lr", "drag", "shapes", "puzzle", "face", "wheel"];
window.INTRO = {
  id: "intro", name: "0단계 · 완전 입문", ver: "웹에서 바로",
  lessons: [
    { id: "I1", title: "컴퓨터 친구들 이름 알기", goal: "본체·모니터부터 프린터까지 기기의 이름과 하는 일을 알아요.", acts: ["parts-tour", "parts-quiz"] },
    { id: "I2", title: "컴퓨터 켜고 끄기와 마우스 잡기", goal: "전원을 바르게 켜고 끄며, 마우스를 바르게 잡아요.", acts: ["power-on", "grip", "follow", "power-off"] },
    { id: "I3", title: "클릭 연습 1", goal: "클릭을 정확하고 빠르게 해요. 쉬움 → 보통 → 어려움 순서로!", acts: ["balloon", "hamster", "target"] },
    { id: "I4", title: "클릭 연습 2: 생각하며 클릭하기", goal: "순서를 기억하고, 정확한 곳을 골라 클릭해요.", acts: ["memory", "dots", "color"] },
    { id: "I5", title: "더블클릭과 오른쪽 클릭", goal: "더블클릭과 오른쪽 클릭을 구별해요.", acts: ["gift", "lr", "memory"] },
    { id: "I6", title: "끌어서 놓기 1", goal: "누른 채로 끌고, 원하는 곳에서 손을 떼요.", acts: ["drag", "shapes", "wheel"] },
    { id: "I7", title: "끌어서 놓기 2", goal: "작은 조각도 정확한 자리에 끌어다 놓아요.", acts: ["puzzle", "face", "shapes"] },
    { id: "I8", free: true, title: "마우스 게임장", goal: `게임 ${GAMES.length}가지를 자유롭게 골라 연습해요. 모든 게임에서 별 3개에 도전!`, acts: GAMES }
  ]
};
})();
