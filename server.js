// 컴코샘 서버 규칙 (구글 Apps Script와 체험 모드가 똑같이 씀)
function comcoHandle(req, st) {
  var A = req.action;
  var nowIso = function () { return new Date().toISOString(); };
  var byNum = function (a, b) { return String(a.name).localeCompare(String(b.name), "ko"); };
  var byOrder = function (a, b) { return (Number(a.order) || 0) - (Number(b.order) || 0); };
  var uid = function (p) { return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); };
  var classes = st.get("classes"), students = st.get("students");
  var findC = function (id) { return classes.filter(function (c) { return c.id === id; })[0]; };
  var findS = function (id) { return students.filter(function (s) { return s.id === id; })[0]; };
  var pubS = function (s) { return { id: s.id, num: s.num, name: s.name }; };
  var meS = function (s) { var c = findC(s.classId); return { id: s.id, num: s.num, name: s.name, classId: s.classId, className: c ? c.name : "", color: c ? c.color : "", assigned: s.assigned || [], stars: s.stars || {} }; };

  if (A === "ping") return { ok: true };
  if (A === "classes") return { ok: true, classes: classes.slice().sort(byOrder).map(function (c) { return { id: c.id, name: c.name, color: c.color }; }) };
  if (A === "enter") {
    var c = findC(req.classId);
    if (!c) return { ok: false, error: "nocls" };
    if (String(c.code) !== String(req.code)) return { ok: false, error: "code" };
    return { ok: true, students: students.filter(function (s) { return s.classId === c.id; }).sort(byNum).map(pubS) };
  }
  if (A === "login" || A === "record") {
    var s = findS(req.sid);
    if (!s || String(s.pw) !== String(req.pw)) return { ok: false, error: "pw" };
    if (A === "login") return { ok: true, student: meS(s) };
    var key = req.lid + ":" + req.aid, stars = Number(req.stars) || 0;
    s.stars = s.stars || {};
    if (stars > (Number(s.stars[key]) || 0)) s.stars[key] = stars;
    s.last = nowIso();
    if (st.putOne) st.putOne("students", s); else st.put("students", students);
    st.append("logs", { time: s.last, sid: s.id, lid: req.lid, aid: req.aid, stars: stars, secs: Math.round(Number(req.secs) || 0), ok: stars >= 3 ? "통과" : (req.fail ? "멈춤" : "재도전") });
    return { ok: true, stars: s.stars };
  }
  if (String(A).indexOf("t_") === 0) {
    if (String(req.tpw) !== String(st.teacherPw)) return { ok: false, error: "tpw" };
    if (A === "t_check") return { ok: true };
    if (A === "t_all") return { ok: true, classes: classes.slice().sort(byOrder), students: students.slice().sort(byNum) };
    if (A === "t_saveClass") {
      var k = req.cls || {};
      if (!k.name || !/^\d{2,8}$/.test(String(k.code))) return { ok: false, error: "반 이름과 2~8자리 숫자 입장코드를 넣어 주세요." };
      var ex = k.id && findC(k.id);
      if (ex) { ex.name = k.name; ex.code = String(k.code); ex.color = k.color || ex.color; }
      else classes.push({ id: uid("c"), name: k.name, code: String(k.code), color: k.color || "#6b52c4", order: classes.length + 1 });
      st.put("classes", classes);
      return { ok: true };
    }
    if (A === "t_delClass") {
      st.put("classes", classes.filter(function (c) { return c.id !== req.id; }));
      st.put("students", students.filter(function (s) { return s.classId !== req.id; }));
      return { ok: true };
    }
    if (A === "t_saveStudents") {
      (req.list || []).forEach(function (n) {
        if (!/^\d{4,8}$/.test(String(n.pw))) n.pw = String(Math.floor(1000 + Math.random() * 9000));
        var ex = n.id && findS(n.id);
        if (ex) { ex.name = n.name; ex.pw = String(n.pw); }
        else students.push({ id: uid("s"), classId: n.classId, num: "", name: n.name, pw: String(n.pw), assigned: [], stars: {}, last: "" });
      });
      st.put("students", students);
      return { ok: true };
    }
    if (A === "t_delStudents") {
      var del = req.ids || [];
      st.put("students", students.filter(function (s) { return del.indexOf(s.id) < 0; }));
      return { ok: true };
    }
    if (A === "t_assign") {
      (req.ids || []).forEach(function (id) { var s = findS(id); if (s) s.assigned = (req.lessons || []).slice(); });
      st.put("students", students);
      return { ok: true };
    }
    if (A === "t_reset") {
      (req.ids || []).forEach(function (id) { var s = findS(id); if (s) s.stars = {}; });
      st.put("students", students);
      return { ok: true };
    }
    if (A === "t_logs") {
      var want = req.ids || [];
      return { ok: true, logs: st.get("logs").filter(function (l) { return want.indexOf(l.sid) >= 0; }) };
    }
  }
  return { ok: false, error: "unknown" };
}
if (typeof window !== "undefined") window.comcoHandle = comcoHandle;
