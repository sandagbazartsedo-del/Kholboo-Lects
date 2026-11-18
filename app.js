// Энэ файлыг өөрчлөх шаардлагагүй. Лекц нэмэхдээ зөвхөн lectures.js-ийг засна.
(function () {
  const app = document.getElementById("app");
  const KEY = "reviewed-lectures";

  function getDone() {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; }
  }
  function setDone(list) {
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) {}
  }
  function esc(s) {
    return String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }
  const pad = n => String(n).padStart(2, "0");

  function renderHome() {
    const done = getDone();
    document.title = COURSE.title;
    app.innerHTML = `
      <header class="head">
        <span class="eyebrow">Хичээлийн давтлага · ${esc(COURSE.semester)}</span>
        <h1>${esc(COURSE.title)}</h1>
        <span class="meta">Багш: ${esc(COURSE.teacher)}</span>
      </header>
      <p class="progress">Нийт ${LECTURES.length} лекц · Та ${done.filter(n => LECTURES.some(l => l.number === n)).length}-ийг давтсан</p>
      <ol class="list">
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

      <section class="section"><h3>Слайд ба бичлэг</h3>
        ${links ? `<div class="links">${links}</div>` : `<p class="empty">Слайд, бичлэг удахгүй нэмэгдэнэ.</p>`}
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
    document.getElementById("mark").addEventListener("click", () => {
      let list = getDone();
      list = list.includes(n) ? list.filter(x => x !== n) : list.concat(n);
      setDone(list);
      renderLecture(n);
    });
  }

  function route() {
    const m = location.hash.match(/^#lecture-(\d+)$/);
    m ? renderLecture(Number(m[1])) : renderHome();
    window.scrollTo(0, 0);
  }
  window.addEventListener("hashchange", route);
  route();
})();
