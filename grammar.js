(() => {
  const content = document.getElementById("lesson-content");
  const rawIndex = new URLSearchParams(location.search).get("topic");
  const index = rawIndex === null ? 0 : Number(rawIndex);
  if (!Number.isInteger(index) || index < 0 || index >= GRAMMAR.length) {
    content.innerHTML = `<section class="lesson-not-found"><h1>Không tìm thấy chủ điểm</h1><p class="page-intro">Hãy chọn một bài học trong danh sách ngữ pháp.</p><a class="lesson-back" href="index.html#view-grammar">← Trở về danh sách</a></section>`;
    return;
  }

  const lesson = GRAMMAR[index];
  const detail = GRAMMAR_DETAILS[index];
  const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  const youtubeUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(`${lesson.title} English grammar lesson`)}`;
  const resources = [
    {label:"Video bài giảng trên YouTube",href:youtubeUrl},
    {label:"British Council · Grammar",href:"https://learnenglish.britishcouncil.org/grammar"},
    {label:"Cambridge Dictionary · Grammar",href:"https://dictionary.cambridge.org/grammar/british-grammar/"}
  ];
  document.title = `${lesson.title} — Lingua Quest`;
  content.innerHTML = `
    <div class="lesson-kicker">GRAMMAR MASTERCLASS · BÀI ${String(index+1).padStart(2,"0")}</div>
    <h1>${escapeHTML(lesson.title)}</h1>
    <p class="lesson-subtitle">${escapeHTML(lesson.sub)}</p>
    <div class="lesson-tags">${lesson.tags.map(tag=>`<span class="lesson-tag">${tag==="ielts"?"IELTS":"THPT QUỐC GIA"}</span>`).join("")}</div>
    <section class="lesson-block"><h2>1. Khi nào dùng?</h2><p>${escapeHTML(lesson.body)} ${escapeHTML(detail.focus)}</p></section>
    <section class="lesson-block"><h2>2. Công thức cần nhớ</h2><ul class="lesson-formula">${lesson.formula.map(line=>`<li>${escapeHTML(line)}</li>`).join("")}</ul></section>
    <section class="lesson-block"><h2>3. Ví dụ trong ngữ cảnh</h2><div class="lesson-example">${lesson.example}</div><p class="lesson-tip"><b>Lưu ý khi làm bài:</b> ${escapeHTML(detail.examTip)}</p></section>
    <section class="lesson-block"><h2>4. Lỗi thường gặp</h2><p>${escapeHTML(detail.mistake)}</p></section>
    <section class="lesson-block lesson-practice" aria-labelledby="practice-title"><div class="lesson-kicker">ACTIVE RECALL · TỰ KIỂM TRA</div><h2 id="practice-title">Chọn đáp án đúng</h2><p class="lesson-question">${escapeHTML(detail.practice.question)}</p><div class="lesson-choices">${detail.practice.options.map((option,optionIndex)=>`<button class="lesson-choice" type="button" data-choice="${optionIndex}">${escapeHTML(option)}</button>`).join("")}</div><p class="lesson-feedback" id="lesson-feedback" aria-live="polite"></p><button class="lesson-retry" id="lesson-retry" type="button">Làm lại câu này</button></section>
    <section class="lesson-block"><h2>5. Học thêm</h2><p class="lesson-subtitle">Các liên kết mở tài liệu bên ngoài. YouTube mở kết quả tìm kiếm theo chủ điểm.</p><div class="lesson-resources">${resources.map(resource=>`<a class="lesson-resource" href="${resource.href}" target="_blank" rel="noopener noreferrer">${escapeHTML(resource.label)} ↗</a>`).join("")}</div></section>
    <nav class="lesson-nav" aria-label="Điều hướng bài học"><a href="${index>0?`grammar.html?topic=${index-1}`:"index.html#view-grammar"}">← ${index>0?"Bài trước":"Danh sách bài học"}</a><a href="${index<GRAMMAR.length-1?`grammar.html?topic=${index+1}`:"index.html#view-grammar"}">${index<GRAMMAR.length-1?"Bài tiếp theo →":"Hoàn thành · về danh sách →"}</a></nav>`;

  const choices = [...content.querySelectorAll("[data-choice]")];
  const feedback = document.getElementById("lesson-feedback");
  const retry = document.getElementById("lesson-retry");
  choices.forEach(button => button.addEventListener("click", () => {
    const correct = Number(button.dataset.choice) === detail.practice.answer;
    choices.forEach((choice, choiceIndex) => {
      choice.disabled = true;
      if (choiceIndex === detail.practice.answer) choice.classList.add("correct");
      else if (choice === button) choice.classList.add("incorrect");
    });
    feedback.textContent = `${correct?"Chính xác!":"Chưa đúng."} ${detail.practice.explanation}`;
    retry.classList.add("visible");
  }));
  retry.addEventListener("click", () => {
    choices.forEach(button => {button.disabled=false;button.classList.remove("correct","incorrect");});
    feedback.textContent = "";
    retry.classList.remove("visible");
  });
})();
