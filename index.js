    const WORDS = [
      {word:"abundant",type:"adjective",meaning:"dồi dào, phong phú",example:"The region has abundant natural resources.",level:"B2",exam:["ielts","thpt"],topic:"Environment"},
      {word:"achieve",type:"verb",meaning:"đạt được, hoàn thành",example:"She worked hard to achieve her goals.",level:"B1",exam:["thpt","ielts"],topic:"Education"},
      {word:"adapt",type:"verb",meaning:"thích nghi, điều chỉnh",example:"Students must adapt to new learning methods.",level:"B2",exam:["ielts","thpt"],topic:"Education"},
      {word:"advantage",type:"noun",meaning:"lợi thế, ưu điểm",example:"Public transport has several advantages.",level:"B1",exam:["thpt","ielts"],topic:"Society"},
      {word:"allocate",type:"verb",meaning:"phân bổ, dành ra",example:"The school allocates funds for new books.",level:"C1",exam:["ielts"],topic:"Society"},
      {word:"analyze",type:"verb",meaning:"phân tích",example:"We need to analyze the causes of pollution.",level:"B2",exam:["ielts","thpt"],topic:"Environment"},
      {word:"approach",type:"noun / verb",meaning:"cách tiếp cận; tiếp cận",example:"A practical approach can solve this problem.",level:"B2",exam:["ielts","thpt"],topic:"Education"},
      {word:"benefit",type:"noun / verb",meaning:"lợi ích; có lợi cho",example:"Regular exercise benefits both body and mind.",level:"B1",exam:["thpt","ielts"],topic:"Health"},
      {word:"challenge",type:"noun / verb",meaning:"thử thách; thách thức",example:"Climate change is a global challenge.",level:"B1",exam:["ielts","thpt"],topic:"Environment"},
      {word:"contribute",type:"verb",meaning:"đóng góp, góp phần",example:"Trees contribute to cleaner urban air.",level:"B2",exam:["ielts","thpt"],topic:"Environment"},
      {word:"convincing",type:"adjective",meaning:"thuyết phục, đáng tin",example:"She gave a convincing argument in her essay.",level:"B2",exam:["ielts"],topic:"Education"},
      {word:"decline",type:"noun / verb",meaning:"sự suy giảm; giảm sút",example:"The number of wild animals continues to decline.",level:"B2",exam:["ielts","thpt"],topic:"Environment"},
      {word:"efficient",type:"adjective",meaning:"hiệu quả, năng suất",example:"Cycling is an efficient way to travel short distances.",level:"B2",exam:["ielts","thpt"],topic:"Society"},
      {word:"emphasize",type:"verb",meaning:"nhấn mạnh",example:"The report emphasizes the need for change.",level:"B2",exam:["ielts","thpt"],topic:"Society"},
      {word:"enhance",type:"verb",meaning:"nâng cao, cải thiện",example:"Reading can enhance your vocabulary.",level:"C1",exam:["ielts"],topic:"Education"},
      {word:"environment",type:"noun",meaning:"môi trường",example:"Everyone can help protect the environment.",level:"B1",exam:["thpt","ielts"],topic:"Environment"},
      {word:"evidence",type:"noun",meaning:"bằng chứng, chứng cứ",example:"There is strong evidence that sleep aids learning.",level:"B2",exam:["ielts","thpt"],topic:"Health"},
      {word:"flexible",type:"adjective",meaning:"linh hoạt",example:"Online courses offer a flexible schedule.",level:"B1",exam:["thpt","ielts"],topic:"Education"},
      {word:"impact",type:"noun / verb",meaning:"tác động, ảnh hưởng",example:"Social media has a major impact on communication.",level:"B2",exam:["ielts","thpt"],topic:"Technology"},
      {word:"improve",type:"verb",meaning:"cải thiện, tiến bộ",example:"Daily practice can improve your speaking skills.",level:"A2",exam:["thpt","ielts"],topic:"Education"},
      {word:"maintain",type:"verb",meaning:"duy trì, bảo dưỡng",example:"It is important to maintain a balanced diet.",level:"B2",exam:["ielts","thpt"],topic:"Health"},
      {word:"opportunity",type:"noun",meaning:"cơ hội, dịp thuận lợi",example:"Studying abroad is a valuable opportunity.",level:"B1",exam:["thpt","ielts"],topic:"Education"},
      {word:"perspective",type:"noun",meaning:"góc nhìn, quan điểm",example:"Travel gives people a different perspective.",level:"C1",exam:["ielts"],topic:"Society"},
      {word:"significant",type:"adjective",meaning:"đáng kể, quan trọng",example:"Technology has made significant progress.",level:"B2",exam:["ielts","thpt"],topic:"Technology"},
      {word:"sustainable",type:"adjective",meaning:"bền vững",example:"Cities need sustainable transport systems.",level:"C1",exam:["ielts"],topic:"Environment"},
      {word:"variety",type:"noun",meaning:"sự đa dạng, nhiều loại",example:"A variety of activities keeps children engaged.",level:"B1",exam:["thpt","ielts"],topic:"Education"}
    ];
    
    const STORAGE_KEY = "linguaquest.v1";
    function loadState() {
      try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
      catch (error) { console.warn("Không thể đọc dữ liệu đã lưu:", error); return {}; }
    }
    function todayKey() {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
    }
    function yesterdayKey() {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      return `${yesterday.getFullYear()}-${String(yesterday.getMonth()+1).padStart(2,"0")}-${String(yesterday.getDate()).padStart(2,"0")}`;
    }
    const saved = loadState();
    const currentDay = todayKey();
    const state = {
      xp: Number(saved.xp) || 0, ammo: Number(saved.ammo) || 0,
      learned: Array.isArray(saved.learned) ? saved.learned : [],
      customWords: Array.isArray(saved.customWords) ? saved.customWords : [],
      customSets: Array.isArray(saved.customSets) ? saved.customSets : [],
      minutes: saved.minutesVersion === 1 && saved.lastStudy === currentDay ? Number(saved.minutes) || 0 : 0,
      minutesVersion: 1,
      lastStudy: saved.lastStudy === currentDay ? saved.lastStudy : "",
      streak: saved.lastDay === currentDay || saved.lastDay === yesterdayKey() ? Number(saved.streak) || 0 : 0,
      lastDay: saved.lastDay || ""
    };
    function saveState() {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
      catch (error) { console.warn("Không thể lưu tiến độ học:", error); showToast("Không thể lưu dữ liệu — hãy kiểm tra dung lượng trình duyệt."); }
    }
    const allWords = () => [...WORDS, ...state.customWords];
    let cloudDashboard = null;
    function syncEvent(payload) {
      const recording = window.linguaLearning?.record(payload);
      if (!recording) return;
      recording.then(saved => {
        if (saved && payload.event_type !== "study" && authenticatedUser) refreshCloudDashboard(authenticatedUser);
      }).catch(error => {
        console.error("Không đồng bộ được hoạt động học:", error);
      });
    }
    let dashboardRequestId = 0;
    async function refreshCloudDashboard(user) {
      if (!user || !window.linguaLearning) return;
      const requestId = ++dashboardRequestId;
      const status = document.getElementById("study-sync-status");
      status.textContent = "Đang đồng bộ thống kê riêng của bạn…";
      try {
        const words = state.learned.map(name => {
          const item = allWords().find(entry => entry.word.toLowerCase() === name.toLowerCase());
          return item ? {word:item.word,meaning:item.meaning,example:item.example,topic:item.topic} : {word:name};
        }).filter(item => /^[a-z][a-z '-]{0,39}$/i.test(item.word));
        const dashboard = await window.linguaLearning.loadDashboard(words);
        if (requestId !== dashboardRequestId || user.uid !== authenticatedUser?.uid) return;
        cloudDashboard = dashboard;
        renderStats();
        renderStudyPlan();
      } catch (error) {
        if (requestId !== dashboardRequestId || user.uid !== authenticatedUser?.uid) return;
        status.textContent = `Không thể tải thống kê: ${error.message}`;
        console.error("Không tải được thống kê học tập:", error);
      }
    }
    function touchStudy() {
      const today = todayKey();
      if (state.lastDay !== today) {
        const yesterday = yesterdayKey();
        state.streak = state.lastDay === yesterday ? state.streak + 1 : 1;
        state.lastDay = today;
      }
      state.lastStudy = today;
      saveState(); renderStats();
    }
    window.addEventListener("lingua-study-minute", () => {
      state.minutes += 1;
      if (cloudDashboard) {
        cloudDashboard.todayMinutes += 1;
        cloudDashboard.weekMinutes += 1;
      }
      touchStudy();
    });
    function renderStats() {
      document.getElementById("stat-learned").innerHTML = `${state.learned.length} <small>từ</small>`;
      const learned = cloudDashboard?.learnedCount ?? state.learned.length;
      const due = cloudDashboard?.dueCount ?? 0;
      const streak = cloudDashboard?.streak ?? state.streak;
      const minutes = cloudDashboard?.todayMinutes ?? state.minutes;
      document.getElementById("stat-learned").innerHTML = `${learned} <small>từ</small>`;
      document.getElementById("stat-review").innerHTML = `${due} <small>từ</small>`;
      document.getElementById("stat-streak").innerHTML = `${streak} <small>ngày</small>`;
      document.getElementById("stat-goal").textContent = minutes;
      document.getElementById("streak-number").textContent = `${streak} ngày`;
      document.getElementById("today-minutes").textContent = minutes;
      document.getElementById("week-minutes").textContent = cloudDashboard?.weekMinutes ?? 0;
      const percent = Math.round(Math.min(cloudDashboard?.weekMinutes ?? 0, 105) / 105 * 100);
      document.getElementById("progress-percent").textContent = `${percent}%`;
      document.getElementById("progress-ring").style.background = `conic-gradient(var(--lime) ${percent}%, #d7fb6920 0)`;
    }
    function renderStudyPlan() {
      const status = document.getElementById("study-sync-status");
      const source = document.getElementById("mission-source");
      const missionList = document.getElementById("ai-mission-list");
      const reviewList = document.getElementById("review-list");
      if (!cloudDashboard) {
        if (authenticatedUser && window.linguaLearning?.localOnly) {
          status.textContent = "Chế độ localhost: tiến độ lưu trên trình duyệt này; đồng bộ và AI cần Python API.";
          source.textContent = "CHẾ ĐỘ LOCAL";
          missionList.innerHTML = `<p class="review-empty">Khởi chạy Python API để đồng bộ tiến độ và nhận nhiệm vụ AI.</p>`;
          document.getElementById("review-count-label").textContent = "0 từ";
          reviewList.innerHTML = `<p class="review-empty">Danh sách ôn tập đồng bộ cần Python API.</p>`;
        }
        return;
      }
      status.textContent = cloudDashboard.missions.message;
      source.textContent = cloudDashboard.missions.source === "gemini" ? "AI CÁ NHÂN HÓA" : cloudDashboard.missions.source === "not_configured" ? "AI CHƯA BẬT" : "AI TẠM LỖI";
      const completed = new Set(cloudDashboard.missions.completed || []);
      missionList.innerHTML = cloudDashboard.missions.items.map(item => `<div class="ai-mission-row ${completed.has(item.id) ? "completed" : ""}"><span class="mission-check" aria-hidden="true">${completed.has(item.id) ? "✓" : "✦"}</span><span class="mission-copy"><b>${escapeHTML(item.title)}</b><small>${escapeHTML(item.detail)}</small></span><button class="mission-complete-btn" type="button" data-mission="${escapeHTML(item.id)}" ${completed.has(item.id) ? "disabled" : ""}>${completed.has(item.id) ? "Xong" : "Hoàn thành"}</button></div>`).join("") || `<p class="review-empty">Chưa có nhiệm vụ. Hãy tải lại sau.</p>`;
      missionList.querySelectorAll("[data-mission]").forEach(button => button.addEventListener("click", async () => {
        button.disabled = true;
        try {
          await window.linguaLearning.record({event_type:"mission_completed",mission_id:button.dataset.mission});
          await refreshCloudDashboard(authenticatedUser);
        } catch (error) {
          showToast(`Không lưu được nhiệm vụ: ${error.message}`);
          button.disabled = false;
        }
      }));
      const dueWords = cloudDashboard.dueWords || [];
      document.getElementById("review-count-label").textContent = `${cloudDashboard.dueCount} từ`;
      reviewList.innerHTML = dueWords.length ? dueWords.map(item => `<div class="review-word"><span><b>${escapeHTML(item.word)}</b><small>${escapeHTML(item.meaning || item.topic || "Từ vựng")}</small></span><button type="button" data-review="${escapeHTML(item.word)}">Đã ôn</button></div>`).join("") : `<p class="review-empty">${cloudDashboard.learnedCount ? "Chưa có từ đến hạn. Từ sẽ xuất hiện sau 12 giờ." : "Học từ đầu tiên để bắt đầu danh sách ôn tập."}</p>`;
      reviewList.querySelectorAll("[data-review]").forEach(button => button.addEventListener("click", async () => {
        const item = dueWords.find(entry => entry.word === button.dataset.review);
        button.disabled = true;
        try {
          await window.linguaLearning.record({event_type:"word_reviewed",word:item});
          await refreshCloudDashboard(authenticatedUser);
        } catch (error) {
          showToast(`Không lưu được lượt ôn: ${error.message}`);
          button.disabled = false;
        }
      }));
    }
    let authenticatedUser = null;
    window.addEventListener("lingua-auth-state", event => {
      const previousUid = authenticatedUser?.uid;
      authenticatedUser = event.detail.user;
      if (authenticatedUser) {
        if (previousUid !== authenticatedUser.uid) {
          dashboardRequestId++;
          cloudDashboard = {learnedCount:0,dueCount:0,dueWords:[],streak:0,todayMinutes:0,weekMinutes:0};
          document.getElementById("study-sync-status").textContent = "Đang tải dữ liệu học tập riêng của bạn…";
          document.getElementById("mission-source").textContent = "ĐANG TẢI";
          document.getElementById("ai-mission-list").innerHTML = "";
          document.getElementById("review-count-label").textContent = "0 từ";
          document.getElementById("review-list").innerHTML = `<p class="review-empty">Đang tải danh sách ôn tập…</p>`;
          renderStats();
        }
        refreshCloudDashboard(authenticatedUser);
      }
      else {
        dashboardRequestId++;
        cloudDashboard = null;
        document.getElementById("study-sync-status").textContent = "Đăng nhập để đồng bộ tiến độ trên các thiết bị.";
        document.getElementById("mission-source").textContent = "CHƯA ĐĂNG NHẬP";
        document.getElementById("ai-mission-list").innerHTML = "";
        document.getElementById("review-count-label").textContent = "0 từ";
        document.getElementById("review-list").innerHTML = `<p class="review-empty">Đăng nhập để xem danh sách ôn tập cá nhân.</p>`;
        renderStats();
      }
    });
    let toastTimer;
    function showToast(message) {
      const toast = document.getElementById("toast");
      toast.textContent = message; toast.classList.add("show");
      clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
    }
    const viewNames = {dashboard:"Tổng quan", vocabulary:"Từ vựng", grammar:"Ngữ pháp", community:"Cộng đồng"};
    function showView(name) {
      document.querySelectorAll(".view").forEach(view => view.classList.toggle("active", view.id === `view-${name}`));
      document.querySelectorAll("[data-view]").forEach(button => button.classList.toggle("active", button.dataset.view === name));
      document.getElementById("page-name").textContent = viewNames[name] || viewNames.dashboard;
      window.scrollTo({top:0, behavior:"smooth"});
      if (name === "vocabulary") renderWords();
      if (name === "grammar") renderGrammar();
    }
    document.querySelectorAll("[data-view]").forEach(button => button.addEventListener("click", () => showView(button.dataset.view)));
    document.querySelectorAll("[data-go]").forEach(button => button.addEventListener("click", () => showView(button.dataset.go)));
    function escapeHTML(value) { return String(value).replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char])); }
    function renderWords() {
      const query = document.getElementById("word-search").value.trim().toLowerCase();
      const filter = document.getElementById("word-filter").value;
      const selectedSet = document.getElementById("set-filter").value;
      const setSelect = document.getElementById("set-filter");
      const existingSet = setSelect.value;
      setSelect.innerHTML = `<option value="all">Tất cả bộ từ</option>${state.customSets.map(set=>`<option value="${escapeHTML(set.name)}">${escapeHTML(set.name)} · ${set.count} từ</option>`).join("")}`;
      setSelect.value = state.customSets.some(set=>set.name === existingSet) ? existingSet : "all";
      const list = allWords().filter(item => {
        const matches = `${item.word} ${item.meaning} ${item.topic}`.toLowerCase().includes(query);
        return matches && (filter === "all" || item.exam.includes(filter)) && (selectedSet === "all" || item.setName === selectedSet);
      });
      document.getElementById("word-count").textContent = `${list.length} từ`;
      document.getElementById("vocab-grid").innerHTML = list.length ? list.map(item => `<article class="word-card"><div class="word-top"><div><h3>${escapeHTML(item.word)}</h3><span class="word-type">${escapeHTML(item.type)}</span></div><span class="level-tag">${escapeHTML(item.level)}</span></div><div class="word-meaning">${escapeHTML(item.meaning)}</div><div class="word-example">“${escapeHTML(item.example)}”</div><div class="word-footer"><span>${escapeHTML(item.topic)}</span><a href="https://dictionary.cambridge.org/dictionary/english/${encodeURIComponent(item.word)}" target="_blank" rel="noopener noreferrer">Cambridge ↗</a><button data-learn="${escapeHTML(item.word)}">${state.learned.includes(item.word) ? "Đã thuộc ✓" : "Đánh dấu đã học"}</button></div></article>`).join("") : `<div class="empty-state">Không tìm thấy từ phù hợp. Thử từ khóa khác nhé.</div>`;
      document.querySelectorAll("[data-learn]").forEach(button => button.addEventListener("click", () => {
        const word = button.dataset.learn;
        if (!state.learned.includes(word)) {
          state.learned.push(word); state.xp += 5; touchStudy();
          const item = allWords().find(entry => entry.word === word);
          if (item) syncEvent({event_type:"word_learned",word:{word:item.word,meaning:item.meaning,example:item.example,topic:item.topic}});
          showToast(`+5 XP · Đã ghi nhớ “${word}”`);
        }
        renderWords(); renderStats();
      }));
    }
    document.getElementById("word-search").addEventListener("input", renderWords);
    document.getElementById("word-filter").addEventListener("change", renderWords);
    document.getElementById("set-filter").addEventListener("change", renderWords);
    function renderGrammar() {
      const query = document.getElementById("grammar-search").value.trim().toLowerCase();
      const filter = document.getElementById("grammar-filter").value;
      const entries = GRAMMAR.map((item,index) => ({...item,index})).filter(item => `${item.title} ${item.sub} ${item.body}`.toLowerCase().includes(query) && (filter === "all" || item.tags.includes(filter)));
      const list = document.getElementById("grammar-list");
      list.innerHTML = entries.length ? entries.map(item => `<a class="grammar-item" href="grammar.html?topic=${item.index}"><span class="grammar-num">${String(item.index+1).padStart(2,"0")}</span><span class="grammar-card-copy"><b>${escapeHTML(item.title)}</b><small>${escapeHTML(item.sub)}</small><span class="grammar-card-tags">${item.tags.map(tag=>tag==="ielts"?"IELTS":"THPT").join(" · ")}</span></span><span class="grammar-open">HỌC CHI TIẾT&nbsp; ↗</span></a>`).join("") : `<div class="empty-state">Không tìm thấy chủ điểm phù hợp.</div>`;
    }
    document.getElementById("grammar-search").addEventListener("input", renderGrammar);
    document.getElementById("grammar-filter").addEventListener("change", renderGrammar);
    const setModal = document.getElementById("set-modal");
    function closeSetModal() { setModal.classList.remove("open"); document.body.style.overflow = ""; }
    document.getElementById("create-set-btn").addEventListener("click", () => {
      setModal.classList.add("open"); document.body.style.overflow = "hidden"; document.querySelector('#set-form input[name="name"]').focus();
    });
    document.getElementById("close-set-modal").addEventListener("click", closeSetModal);
    document.getElementById("cancel-set").addEventListener("click", closeSetModal);
    setModal.addEventListener("click", event => { if (event.target === setModal) closeSetModal(); });
    document.getElementById("set-form").addEventListener("submit", event => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      const name = String(data.get("name") || "").trim();
      const rawLines = String(data.get("words") || "").split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
      if (!name || !rawLines.length) { showToast("Hãy nhập tên bộ và ít nhất một từ."); return; }
      if (state.customSets.some(set=>set.name.toLowerCase() === name.toLowerCase())) { showToast("Tên bộ từ này đã được sử dụng."); return; }
      const entries = [];
      for (let index=0; index<rawLines.length; index++) {
        const parts = rawLines[index].split("|");
        const word = (parts.shift() || "").trim().toLowerCase();
        const meaning = parts.join("|").trim();
        if (!/^[a-zA-Z][a-zA-Z '-]{0,39}$/.test(word) || !meaning) { showToast(`Dòng ${index+1} chưa đúng mẫu “từ | nghĩa”.`); return; }
        if (allWords().some(item=>item.word.toLowerCase() === word) || entries.some(item=>item.word === word)) { showToast(`Từ “${word}” đã có trong kho hoặc bộ này.`); return; }
        entries.push({word,type:"your word",meaning,example:`I am learning to use ${word} in context.`,level:"NEW",exam:["ielts","thpt"],topic:name,setName:name});
      }
      state.customSets.push({name,count:entries.length});
      state.customWords.push(...entries);
      saveState(); event.currentTarget.reset(); closeSetModal(); showView("vocabulary"); document.getElementById("set-filter").value = name; renderWords(); showToast(`Đã lưu bộ “${name}” gồm ${entries.length} từ.`);
    });
    const modal = document.getElementById("game-modal");
    let gameMode = "", gameIndex = 0, gameScore = 0, gameDeck = [];
    function openGame(mode) {
      gameMode = mode; gameIndex = 0; gameScore = 0;
      gameDeck = [...allWords()].sort(() => Math.random() - .5).slice(0,5);
      modal.classList.add("open"); document.body.style.overflow = "hidden";
      document.getElementById("modal-eyebrow").textContent = mode === "ammo" ? "WORD BLASTER" : mode === "boss" ? "BOSS BATTLE" : "FLASHCARD SPRINT";
      document.getElementById("modal-title").textContent = mode === "ammo" ? "Nạp đạn từ vựng" : mode === "boss" ? "Đánh bại boss" : "Lật thẻ, nhớ từ";
      renderQuestion();
    }
    function closeGame() { modal.classList.remove("open"); document.body.style.overflow = ""; }
    document.querySelectorAll("[data-game]").forEach(button => button.addEventListener("click", () => openGame(button.dataset.game)));
    document.getElementById("close-modal").addEventListener("click", closeGame);
    modal.addEventListener("click", event => { if (event.target === modal) closeGame(); });
    document.addEventListener("keydown", event => { if (event.key === "Escape" && modal.classList.contains("open")) closeGame(); if (event.key === "Escape" && setModal.classList.contains("open")) closeSetModal(); });
    function finishGame() {
      document.getElementById("game-progress-fill").style.width = "100%";
      document.getElementById("game-content").innerHTML = `<div class="mission-complete"><div class="mission-trophy">🏆</div><div class="eyebrow">MISSION COMPLETE</div><h3 class="mission-title">${gameScore >= 4 ? "Xuất sắc!" : "Hoàn thành thử thách!"}</h3><p class="page-intro">Bạn trả lời đúng ${gameScore}/${gameDeck.length} câu và nhận <b class="xp-highlight">+${gameScore*10} XP</b>.</p><button class="primary-btn mission-continue" id="finish-btn">Tiếp tục hành trình →</button></div>`;
      document.getElementById("finish-btn").addEventListener("click", closeGame);
      state.xp += gameScore * 10; touchStudy(); saveState(); renderStats();
    }
    function nextQuestion() { gameIndex++; renderQuestion(); }
    function renderQuestion() {
      if (gameIndex >= gameDeck.length) { finishGame(); return; }
      const item = gameDeck[gameIndex];
      document.getElementById("game-progress-fill").style.width = `${gameIndex/gameDeck.length*100}%`;
      const content = document.getElementById("game-content");
      const scoreMarkup = `<div class="modal-footer"><span class="modal-score">Câu ${gameIndex+1}/${gameDeck.length} · Đúng ${gameScore}</span><span class="modal-score">${gameMode === "ammo" ? `◈ ${state.ammo} đạn` : "✦ +10 XP / câu"}</span></div>`;
      if (gameMode === "ammo") {
        content.innerHTML = `<div class="question-label">Điền từ còn thiếu để nạp đạn</div><div class="question">${escapeHTML(item.example.replace(new RegExp(item.word,"i"),"_____"))}<br><span class="question-hint">Gợi ý: ${escapeHTML(item.meaning)}</span></div><form class="answer-row" id="answer-form"><input id="answer-input" autocomplete="off" placeholder="Nhập từ tiếng Anh..." aria-label="Nhập đáp án"><button class="primary-btn" type="submit">Bắn!</button></form><p class="feedback" id="feedback" aria-live="polite"></p>${scoreMarkup}`;
        document.getElementById("answer-form").addEventListener("submit", event => {
          event.preventDefault();
          const input = document.getElementById("answer-input");
          const feedback = document.getElementById("feedback");
          const correct = input.value.trim().toLowerCase() === item.word.toLowerCase();
          input.disabled = true;
          if (correct) {
            gameScore++; state.ammo++; state.learned = [...new Set([...state.learned,item.word])];
            syncEvent({event_type:"word_reviewed",word:{word:item.word,meaning:item.meaning,example:item.example,topic:item.topic}});
            feedback.className = "feedback good"; feedback.textContent = `Chính xác! ${item.word} — +1 viên đạn`;
          }
          else { feedback.className = "feedback bad"; feedback.textContent = `Chưa trúng! Đáp án: ${item.word}`; }
          saveState(); renderStats();
          const submit = event.currentTarget.querySelector("button");
          submit.textContent = "Tiếp →"; submit.type = "button"; submit.addEventListener("click", nextQuestion, {once:true});
          input.addEventListener("keydown", keyEvent => { if (keyEvent.key === "Enter") { keyEvent.preventDefault(); nextQuestion(); } });
          submit.focus();
        });
        document.getElementById("answer-input").focus();
      } else if (gameMode === "flash") {
        content.innerHTML = `<div class="question-label">Thẻ ${gameIndex+1} / ${gameDeck.length}</div><button class="word-card flash-card" id="flash-card"><span class="eyebrow">TAP TO REVEAL</span><h3 class="flash-word">${escapeHTML(item.word)}</h3><span class="word-type">${escapeHTML(item.type)} · ${escapeHTML(item.level)}</span><p class="word-meaning flash-meaning hidden" id="flash-meaning">${escapeHTML(item.meaning)}</p><p class="word-example hidden" id="flash-example">“${escapeHTML(item.example)}”</p></button><div class="modal-footer"><span class="modal-score">Nhớ được nghĩa chưa?</span><button class="primary-btn" id="flash-next">Lật thẻ ↗</button></div>`;
        document.getElementById("flash-card").addEventListener("click", () => { document.getElementById("flash-meaning").classList.remove("hidden"); document.getElementById("flash-example").classList.remove("hidden"); document.getElementById("flash-next").textContent = "Đã nhớ ✓"; });
        document.getElementById("flash-next").addEventListener("click", event => {
          if (!document.getElementById("flash-meaning").classList.contains("hidden")) {
            gameScore++; state.learned = [...new Set([...state.learned,item.word])];
            syncEvent({event_type:"word_reviewed",word:{word:item.word,meaning:item.meaning,example:item.example,topic:item.topic}});
            saveState(); renderStats(); nextQuestion();
          }
          else { document.getElementById("flash-card").click(); }
        });
      } else {
        const options = [item,...gameDeck.filter(word=>word.word!==item.word)].sort(()=>Math.random()-.5).slice(0,4);
        document.getElementById("game-content").innerHTML = `<div class="question-label">Chọn nghĩa đúng của từ này</div><div class="question"><em>${escapeHTML(item.word)}</em></div><div class="choice-list">${options.map(option=>`<button class="choice-btn" data-answer="${escapeHTML(option.word)}">${escapeHTML(option.meaning)}</button>`).join("")}</div><p class="feedback" id="feedback" aria-live="polite"></p>${scoreMarkup}`;
        document.querySelectorAll("[data-answer]").forEach(button => button.addEventListener("click", () => {
          const correct = button.dataset.answer === item.word;
          if (correct) gameScore++;
          document.querySelectorAll("[data-answer]").forEach(choice => { choice.disabled = true; if (choice.dataset.answer === item.word) choice.classList.add("correct"); else if (choice === button) choice.classList.add("incorrect"); });
          const feedback = document.getElementById("feedback"); feedback.className = `feedback ${correct ? "good" : "bad"}`; feedback.textContent = correct ? "Chính xác! Boss mất một phần máu." : `Đáp án đúng: ${item.meaning}`;
          const footer = document.querySelector("#game-content .modal-footer");
          footer.innerHTML = `<span class="modal-score">Câu ${gameIndex+1}/${gameDeck.length} · Đúng ${gameScore}</span><button class="primary-btn" id="boss-next">Tiếp theo →</button>`;
          document.getElementById("boss-next").addEventListener("click", nextQuestion, {once:true});
        }));
      }
    }
    document.getElementById("daily-btn").addEventListener("click", () => showToast(`Mục tiêu hôm nay: ${state.minutes}/15 phút · ${state.learned.length} từ đã học`));
    const now = new Date();
    document.getElementById("today-label").textContent = new Intl.DateTimeFormat("vi-VN",{weekday:"long",day:"numeric",month:"long"}).format(now);
    renderStats(); renderWords(); renderGrammar();
    function connectStudySync() {
      if (!window.linguaLearning) return;
      window.linguaLearning.subscribe(user => {
      window.dispatchEvent(new CustomEvent("lingua-auth-state", {detail:{user}}));
      });
    }
    window.addEventListener("lingua-sync-ready", connectStudySync, {once:true});
    connectStudySync();
    if (location.hash === "#view-grammar") showView("grammar");
  
