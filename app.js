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

  function renderHome() {
    const done = getDone();
    document.title = COURSE.title;
    app.innerHTML = `
      <header class="head">
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
        ${LECTURES.map(l => `
          <li class="${done.includes(l.number) ? "done" : ""}">
            <a class="item" href="#lecture-${l.number}">
              <span class="num">${pad(l.number)}</span>
              <span class="item-body">
                <span class="item-title">${esc(l.title)}</span>
                ${l.date ? `<span class="item-date">${esc(l.date)}</span>` : ""}
              </span>
              <span class="badge">${done.includes(l.number) ? "✓ Давтсан" : "Давтах →"}</span>
            </a>
          </li>`).join("")}
      </ol>
      <p class="foot">Лекц бүрийн дараа энд орж товч агуулга, гол санаа, асуултаар давтаарай.</p>`;
  }

  function renderLecture(n) {
    const i = LECTURES.findIndex(l => l.number === n);
    if (i < 0) return renderHome();
    const l = LECTURES[i], prev = LECTURES[i - 1], next = LECTURES[i + 1];
    const done = getDone().includes(n);
    document.title = `Лекц ${n} · ${COURSE.title}`;

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

      <section class="section">
        <button class="btn ${done ? "" : "primary"}" id="mark" type="button">${done ? "✓ Давтсан гэж тэмдэглэсэн" : "Давтаж дууслаа"}</button>
      </section>

      <nav class="pager">
        ${prev ? `<a class="btn" href="#lecture-${prev.number}">← Лекц ${prev.number}</a>` : "<span></span>"}
        ${next ? `<a class="btn" href="#lecture-${next.number}">Лекц ${next.number} →</a>` : ""}
      </nav>`;

    app.querySelectorAll(".q button").forEach(b => b.addEventListener("click", () => {
      const a = document.getElementById("ans-" + b.dataset.k);
      a.hidden = !a.hidden;
      b.textContent = a.hidden ? "Хариултыг харах" : "Хариултыг нуух";
    }));
    bindHw(() => renderLecture(n));
    document.getElementById("mark").addEventListener("click", () => {
      let list = getDone();
      list = list.includes(n) ? list.filter(x => x !== n) : list.concat(n);
      setDone(list);
      renderLecture(n);
    });
  }

  // Даалгаврын текст, хугацаа, "хийсэн" товч
  function hwBody(l) {
    const done = getHw().includes(l.number);
    return `
      ${l.homeworkDue ? `<span class="hw-due">Хугацаа: ${esc(l.homeworkDue)}</span>` : ""}
      <p class="hw-text">${esc(l.homework)}</p>
      <button class="btn ${done ? "is-done" : ""}" data-hw="${l.number}" type="button">${done ? "✓ Хийж дууссан" : "Хийж дууссан гэж тэмдэглэх"}</button>`;
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
      ${items.length ? `<div class="hw-list">${items.map(l => `
        <article class="section hw-card ${getHw().includes(l.number) ? "done" : ""}">
          <a class="hw-lec" href="#lecture-${l.number}"><span class="num">${pad(l.number)}</span><span>Лекц ${l.number} · ${esc(l.title)}</span></a>
          ${hwBody(l)}
        </article>`).join("")}</div>` : `<p class="empty foot">Гэрийн даалгавар удахгүй нэмэгдэнэ.</p>`}
      <p class="foot">Даалгавраа хийж дуусаад «Хийж дууссан» товчийг дарж тэмдэглээрэй. Тэмдэглэл зөвхөн таны төхөөрөмж дээр хадгалагдана.</p>`;
    bindHw(renderHomework);
  }

  function route() {
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
