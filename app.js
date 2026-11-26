// Энэ файлыг өөрчлөх шаардлагагүй. Лекц нэмэхдээ зөвхөн lectures.js-ийг засна.
(function () {
  const app = document.getElementById("app");
  const KEY = "reviewed-lectures";
  const HW_KEY = "done-homework";

  function load(key) {
    try { return JSON.parse(localStorage.getItem(key)) || []; } catch (e) { return []; }
  }
  function save(key, list) {
    try { localStorage.setItem(key, JSON.stringify(list)); } catch (e) {}
  }
  const getDone = () => load(KEY);
  const setDone = list => save(KEY, list);
  const getHw = () => load(HW_KEY);
  function toggleHw(n) {
    const list = getHw();
    save(HW_KEY, list.includes(n) ? list.filter(x => x !== n) : list.concat(n));
  }
  const hasHw = l => String(l.homework ?? "").trim() !== "";
  function esc(s) {
    return String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }
  const pad = n => String(n).padStart(2, "0");

  // ---- Лекцийн түгжээ ----
  // Лекц 1 үргэлж нээлттэй. Дараагийн лекц нь өмнөх лекцээ бүрэн уншиж
  // («Давтаж дууслаа» дарсан), гэрийн даалгавартай бол түүнийгээ илгээсэн
  // үед нээгдэнэ. lectures.js дотор COURSE.lockLectures: false гэвэл түгжээ унтарна.
  const lockOn = () => COURSE.lockLectures !== false;
  const WPM = 150; // минутад уншдаг үгийн дундаж тоо
  const isRead = n => getDone().includes(n);
  const hwOk = l => !hasHw(l) || getHw().includes(l.number);
  function isOpen(i) {
    if (!lockOn() || i <= 0) return true;
    const p = LECTURES[i - 1];
    return isOpen(i - 1) && isRead(p.number) && hwOk(p);
  }
  // Лекцийн текстийн урттай уялдуулсан хамгийн бага унших хугацаа (секунд)
  function minReadSecs(l) {
    if (l.minReadMinutes) return Math.round(l.minReadMinutes * 60);
    const text = [l.summary, ...(l.keyPoints || []), ...(l.terms || []).map(t => t.term + " " + t.meaning),
      ...(l.questions || []).map(q => q.q), l.homework || ""].join(" ");
    const words = text.split(/\s+/).filter(Boolean).length;
    return Math.min(600, Math.max(60, Math.round(words / WPM * 60)));
  }
  // Одоо уншиж буй лекцийн явц (хуудсаа шинэчлэхэд эхнээс нь тоолно)
  let reading = null, timer = null, observer = null;
  function stopReading() {
    clearInterval(timer); timer = null;
    observer?.disconnect(); observer = null;
  }
  const fmt = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  function renderHome() {
    const done = getDone();
    document.title = COURSE.title;
    app.innerHTML = `
      <header class="head${COURSE.teacherPhoto ? " has-photo" : ""}">
        ${COURSE.teacherPhoto ? `<img class="teacher-photo" src="${esc(COURSE.teacherPhoto)}" alt="${esc(COURSE.teacher)}" width="160" height="160">` : ""}
        <span class="eyebrow">${esc(COURSE.school)}</span>
        <h1>${esc(COURSE.title)}</h1>
        <span class="meta">${esc(COURSE.teacher)}</span>
        <div class="hero-actions">
          <a class="hero-btn" href="#lectures">Лекцүүдийг үзэх</a>
          <a class="hero-btn" href="#homework">Гэрийн даалгавар</a>
        </div>
      </header>
      <p class="progress">Нийт ${LECTURES.length} лекц · Та ${done.filter(n => LECTURES.some(l => l.number === n)).length}-ийг давтсан</p>
      <ol class="list" id="lectures">
        ${LECTURES.map((l, i) => `
          <li class="${done.includes(l.number) ? "done" : ""} ${isOpen(i) ? "" : "locked"}">
            <a class="item" href="#lecture-${l.number}">
              <span class="num">${pad(l.number)}</span>
              <span class="item-body">
                <span class="item-title">${esc(l.title)}</span>
                ${l.date ? `<span class="item-date">${esc(l.date)}</span>` : ""}
              </span>
              <span class="badge">${!isOpen(i) ? "🔒 Түгжээтэй" : done.includes(l.number) ? "✓ Давтсан" : "Давтах →"}</span>
            </a>
          </li>`).join("")}
      </ol>
      <p class="foot">Лекц бүрийн дараа энд орж товч агуулга, гол санаа, асуултаар давтаарай.${lockOn() ? " Лекцээ бүрэн уншиж, гэрийн даалгавраа илгээсний дараа дараагийн лекц нээгдэнэ." : ""}</p>`;
  }

  function renderLecture(n) {
    const i = LECTURES.findIndex(l => l.number === n);
    if (i < 0) return renderHome();
    const l = LECTURES[i], prev = LECTURES[i - 1], next = LECTURES[i + 1];
    const done = getDone().includes(n);
    document.title = `Лекц ${n} · ${COURSE.title}`;
    if (!isOpen(i)) return renderLocked(l, prev);
    if (reading?.n !== n) { stopReading(); reading = { n, secs: 0, bottom: false, need: minReadSecs(l) }; }
    const nextOpen = next && isOpen(i + 1);

    const links = [
      l.slides && `<a class="btn" href="${esc(l.slides)}" target="_blank" rel="noopener">Слайд үзэх</a>`,
      l.video && `<a class="btn" href="${esc(l.video)}" target="_blank" rel="noopener">Бичлэг үзэх</a>`
    ].filter(Boolean).join("");

    app.innerHTML = `
      <a class="back" href="#">← Бүх лекц</a>
      <header class="head">
        <span class="eyebrow">Лекц ${pad(l.number)}${l.date ? " · " + esc(l.date) : ""}</span>
        <h1>${esc(l.title)}</h1>
      </header>

      <section class="section"><h3>Товч агуулга</h3><p>${esc(l.summary)}</p></section>

      <section class="section"><h3>Гол санаанууд</h3>
        ${l.keyPoints?.length ? `<ul class="points">${l.keyPoints.map(p => `<li>${esc(p)}</li>`).join("")}</ul>` : `<p class="empty">Удахгүй нэмэгдэнэ.</p>`}
      </section>

      ${l.terms?.length ? `<section class="section"><h3>Нэр томьёо</h3>
        <dl class="terms">${l.terms.map(t => `<div><dt>${esc(t.term)}</dt><dd>${esc(t.meaning)}</dd></div>`).join("")}</dl>
      </section>` : ""}

      ${hasHw(l) ? `<section class="section hw-section"><h3>Гэрийн даалгавар</h3>${hwBody(l)}
        <a class="hw-all" href="#homework">Бүх гэрийн даалгавар →</a>
      </section>` : ""}

      <section class="section"><h3>Слайд ба бичлэг</h3>
        ${links ? `<div class="links">${links}</div>` : (l.videos?.length ? "" : `<p class="empty">Слайд, бичлэг удахгүй нэмэгдэнэ.</p>`)}
        ${l.videos?.length ? `
          ${l.videosNote ? `<p class="vid-note">${esc(l.videosNote)}</p>` : ""}
          <div class="vid-groups">${l.videos.map(g => `
            <div class="vid-group">
              <h4>${esc(g.topic)}</h4>
              ${g.note ? `<p class="vid-gnote">${esc(g.note)}</p>` : ""}
              <ul class="vid-list">${(g.items || []).map(v => `
                <li>
                  <a class="vid-link" href="${esc(v.url)}" target="_blank" rel="noopener">
                    <span class="vid-icon" aria-hidden="true">${v.kind ? "📄" : "▶"}</span>
                    <span>${esc(v.title)}${v.kind ? ` <span class="vid-kind">${esc(v.kind)}</span>` : ""}</span>
                  </a>
                  ${v.note ? `<p class="vid-desc">${esc(v.note)}</p>` : ""}
                </li>`).join("")}</ul>
            </div>`).join("")}</div>` : ""}
      </section>

      <section class="section"><h3>Өөрийгөө шалгах асуултууд</h3>
        <div class="qs">${(l.questions || []).map((q, k) => `
          <div class="q">
            <span class="q-text">${k + 1}. ${esc(q.q)}</span>
            <div class="q-answer" id="ans-${k}" hidden>${esc(q.a)}</div>
            <button class="btn" data-k="${k}" type="button">Хариултыг харах</button>
          </div>`).join("")}</div>
      </section>

      ${closingCard(l)}

      <div id="read-end" aria-hidden="true"></div>
      <section class="section mark-section">
        <button class="btn ${done ? "is-done" : "primary"}" id="mark" type="button">${done ? "✓ Бүрэн уншсан" : "Давтаж дууслаа"}</button>
        <p class="read-hint" id="read-hint">${done && lockOn() && next && !hwOk(l) ? `Дараагийн лекцийг нээхийн тулд дээрх гэрийн даалгавраа ${COURSE.homeworkForm ? "зургаар илгээнэ" : "хийж тэмдэглэнэ"} үү.` : ""}</p>
      </section>

      <nav class="pager">
        ${prev ? `<a class="btn" href="#lecture-${prev.number}">← Лекц ${prev.number}</a>` : "<span></span>"}
        ${next ? (nextOpen
          ? `<a class="btn" href="#lecture-${next.number}">Лекц ${next.number} →</a>`
          : `<span class="btn is-locked" title="${esc(lockReason(l))}">🔒 Лекц ${next.number}</span>`) : ""}
      </nav>
      ${lockOn() && !done ? `<div class="read-bar" id="read-bar" role="status"></div>` : ""}`;

    app.querySelectorAll(".q button").forEach(b => b.addEventListener("click", () => {
      const a = document.getElementById("ans-" + b.dataset.k);
      a.hidden = !a.hidden;
      b.textContent = a.hidden ? "Хариултыг харах" : "Хариултыг нуух";
    }));
    bindHw(() => renderLecture(n));
    document.getElementById("mark").addEventListener("click", () => {
      if (done) return; // уншсан тэмдэглэгээг буцааж болохгүй, эс тэгвээс дараагийн лекц дахин түгжигдэнэ
      if (lockOn() && !readyToMark()) return updateReading();
      setDone(getDone().concat(n));
      stopReading();
      renderLecture(n);
    });
    if (lockOn() && !done) startReading();
  }

  const readyToMark = () => reading && reading.bottom && reading.secs >= reading.need;
  function updateReading() {
    const bar = document.getElementById("read-bar"), hint = document.getElementById("read-hint");
    const btn = document.getElementById("mark");
    if (!bar || !reading) return;
    const left = Math.max(0, reading.need - reading.secs);
    const pct = Math.min(100, Math.round(reading.secs / reading.need * 100));
    let msg;
    if (readyToMark()) msg = "Та лекцийг бүрэн уншлаа. «Давтаж дууслаа» товчийг дарна уу.";
    else if (left > 0 && !reading.bottom) msg = `Лекцийг доош нь хүртэл анхааралтай уншаарай · ${fmt(left)} үлдсэн`;
    else if (left > 0) msg = `Яарахгүй, дахин нэг харна уу · ${fmt(left)} үлдсэн`;
    else msg = "Лекцийн төгсгөл хүртэл доош гүйлгэж уншаарай.";
    bar.innerHTML = `<span class="read-track"><span style="width:${reading.bottom ? pct : Math.min(pct, 95)}%"></span></span><span>${msg}</span>`;
    bar.classList.toggle("ready", readyToMark());
    btn.classList.toggle("waiting", !readyToMark());
    btn.setAttribute("aria-disabled", String(!readyToMark()));
    hint.textContent = readyToMark() ? "" : "Лекцийг бүрэн уншсаны дараа энэ товч идэвхжинэ.";
  }
  function startReading() {
    const end = document.getElementById("read-end");
    observer?.disconnect();
    observer = new IntersectionObserver(es => {
      if (es.some(e => e.isIntersecting)) { reading.bottom = true; updateReading(); }
    });
    observer.observe(end);
    if (!timer) timer = setInterval(() => {
      if (document.visibilityState === "visible" && document.hasFocus()) { reading.secs++; updateReading(); }
    }, 1000);
    updateReading();
  }

  function lockReason(l) {
    const parts = [];
    if (!isRead(l.number)) parts.push(`Лекц ${l.number}-ийг бүрэн уншиж «Давтаж дууслаа» дарах`);
    if (!hwOk(l)) parts.push(`Лекц ${l.number}-ийн гэрийн даалгаврыг ${COURSE.homeworkForm ? "зургаар илгээх" : "хийж тэмдэглэх"}`);
    return parts.join(", ");
  }
  function renderLocked(l, prev) {
    stopReading();
    let p = prev;
    while (LECTURES.indexOf(p) > 0 && !isOpen(LECTURES.indexOf(p))) p = LECTURES[LECTURES.indexOf(p) - 1];
    const steps = [];
    if (!isRead(p.number)) steps.push(`<li>Лекц ${p.number}-ийг бүрэн уншиж, «Давтаж дууслаа» товчийг дарах</li>`);
    if (!hwOk(p)) steps.push(`<li>Лекц ${p.number}-ийн гэрийн даалгаврыг ${COURSE.homeworkForm ? "хийж, зургаар илгээх" : "хийж дуусгаад тэмдэглэх"}</li>`);
    app.innerHTML = `
      <a class="back" href="#">← Бүх лекц</a>
      <header class="head">
        <span class="eyebrow">Лекц ${pad(l.number)}</span>
        <h1>${esc(l.title)}</h1>
      </header>
      <section class="section locked-note">
        <h3>🔒 Энэ лекц одоогоор түгжээтэй</h3>
        <p>Нээхийн тулд:</p>
        <ol>${steps.join("")}</ol>
        <a class="btn primary" href="#lecture-${p.number}">Лекц ${p.number} руу очих</a>
      </section>`;
  }

  // Лекцийн төгсгөлийн карт: ёс зүй ба урам өгөх үг (lectures.js-ийн ethics,
  // encouragement; хоосон бол COURSE.defaultEthics / defaultEncouragement)
  function closingCard(l) {
    const pick = (v, d) => String(v ?? "").trim() || String(d ?? "").trim();
    const ethics = pick(l.ethics, COURSE.defaultEthics);
    const cheer = pick(l.encouragement, COURSE.defaultEncouragement);
    if (!ethics && !cheer) return "";
    return `<section class="section closing" aria-label="Лекцийн төгсгөлийн үг">
        ${ethics ? `<div class="closing-part">
          <span class="closing-icon" aria-hidden="true">⚖</span>
          <div><h4>Мэргэжлийн ёс зүй</h4><p>${esc(ethics)}</p></div>
        </div>` : ""}
        ${cheer ? `<div class="closing-part cheer">
          <span class="closing-icon" aria-hidden="true">✦</span>
          <div><h4>Танд урам өгөх үг</h4><p>${esc(cheer)}</p></div>
        </div>` : ""}
      </section>`;
  }

  // Даалгаврын текст, хугацаа, "хийсэн" товч
  function hwBody(l) {
    const done = getHw().includes(l.number);
    const form = COURSE.homeworkForm;
    return `
      ${l.homeworkDue ? `<span class="hw-due">Хугацаа: ${esc(l.homeworkDue)}</span>` : ""}
      <p class="hw-text">${esc(l.homework)}</p>
      ${form ? `<p class="hw-how">Даалгавраа хийгээд зургийг нь доорх товчоор илгээнэ. Маягтын «Лекц» хэсэгт <b>Лекц ${l.number}</b> гэж бичээрэй.</p>` : ""}
      <div class="links">
        ${form ? `<a class="btn primary" href="${esc(form)}" target="_blank" rel="noopener">📷 Зургаа илгээх</a>` : ""}
        <button class="btn ${done ? "is-done" : ""}" data-hw="${l.number}" type="button">${done
          ? (form ? "✓ Илгээсэн" : "✓ Хийж дууссан")
          : (form ? "Илгээсэн гэж тэмдэглэх" : "Хийж дууссан гэж тэмдэглэх")}</button>
      </div>`;
  }
  function bindHw(rerender) {
    app.querySelectorAll("[data-hw]").forEach(b => b.addEventListener("click", () => {
      toggleHw(Number(b.dataset.hw));
      rerender();
    }));
  }

  function renderHomework() {
    const items = LECTURES.filter(hasHw);
    const done = getHw().filter(n => items.some(l => l.number === n)).length;
    document.title = `Гэрийн даалгавар · ${COURSE.title}`;
    app.innerHTML = `
      <a class="back" href="#">← Бүх лекц</a>
      <header class="head">
        <span class="eyebrow">${esc(COURSE.title)}</span>
        <h1>Гэрийн даалгавар</h1>
      </header>
      <p class="progress">Нийт ${items.length} даалгавар · Та ${done}-ийг хийсэн</p>
      ${items.length ? `<div class="hw-list">${items.map(l => {
        const open = isOpen(LECTURES.indexOf(l));
        return `
        <article class="section hw-card ${getHw().includes(l.number) ? "done" : ""} ${open ? "" : "locked"}">
          <a class="hw-lec" href="#lecture-${l.number}"><span class="num">${pad(l.number)}</span><span>Лекц ${l.number} · ${esc(l.title)}</span></a>
          ${open ? hwBody(l) : `<p class="empty">🔒 Лекц нээгдсэний дараа энэ даалгавар харагдана.</p>`}
        </article>`;
      }).join("")}</div>` : `<p class="empty foot">Гэрийн даалгавар удахгүй нэмэгдэнэ.</p>`}
      <p class="foot">Даалгавраа ${COURSE.homeworkForm ? "зургаар илгээгээд «Илгээсэн»" : "хийж дуусаад «Хийж дууссан»"} товчийг дарж тэмдэглээрэй. Тэмдэглэл зөвхөн таны төхөөрөмж дээр хадгалагдана.</p>`;
    bindHw(renderHomework);
  }

  function route() {
    if (!/^#lecture-\d+$/.test(location.hash)) { stopReading(); reading = null; }
    if (location.hash === "#lectures") {
      if (!document.getElementById("lectures")) renderHome();
      document.getElementById("lectures").scrollIntoView({ behavior: "smooth" });
      return;
    }
    if (location.hash === "#homework") { renderHomework(); window.scrollTo(0, 0); return; }
    const m = location.hash.match(/^#lecture-(\d+)$/);
    m ? renderLecture(Number(m[1])) : renderHome();
    window.scrollTo(0, 0);
  }
  window.addEventListener("hashchange", route);
  route();
})();
