import "./study-sync.js";

    const WORDS=[
      ["abundant","dồi dào, phong phú","The region has _____ natural resources."],
      ["achieve","đạt được, hoàn thành","She worked hard to _____ her goals."],
      ["adapt","thích nghi, điều chỉnh","Students must _____ to new learning methods."],
      ["advantage","lợi thế, ưu điểm","Public transport has several _____."],
      ["allocate","phân bổ, dành ra","The school will _____ funds for new books."],
      ["analyze","phân tích","We need to _____ the causes of pollution."],
      ["approach","cách tiếp cận; tiếp cận","A practical _____ can solve this problem."],
      ["benefit","lợi ích; có lợi cho","Regular exercise can _____ both body and mind."],
      ["challenge","thử thách; thách thức","Climate change is a global _____."],
      ["contribute","đóng góp, góp phần","Trees _____ to cleaner urban air."],
      ["convincing","thuyết phục, đáng tin","She gave a _____ argument in her essay."],
      ["decline","sự suy giảm; giảm sút","The number of wild animals continues to _____."],
      ["efficient","hiệu quả, năng suất","Cycling is an _____ way to travel short distances."],
      ["emphasize","nhấn mạnh","The report _____ the need for change."],
      ["enhance","nâng cao, cải thiện","Reading can _____ your vocabulary."],
      ["environment","môi trường","Everyone can help protect the _____."],
      ["evidence","bằng chứng, chứng cứ","There is strong _____ that sleep aids learning."],
      ["flexible","linh hoạt","Online courses offer a _____ schedule."],
      ["impact","tác động, ảnh hưởng","Social media has a major _____ on communication."],
      ["improve","cải thiện, tiến bộ","Daily practice can _____ your speaking skills."],
      ["maintain","duy trì, bảo dưỡng","It is important to _____ a balanced diet."],
      ["opportunity","cơ hội, dịp thuận lợi","Studying abroad is a valuable _____."],
      ["perspective","góc nhìn, quan điểm","Travel gives people a different _____."],
      ["significant","đáng kể, quan trọng","Technology has made _____ progress."],
      ["sustainable","bền vững","Cities need _____ transport systems."],
      ["variety","sự đa dạng, nhiều loại","A _____ of activities keeps children engaged."]
    ].map(([word,meaning,example])=>({word,meaning,example}));
    const WEAPONS=[
      {id:"trainee",name:"Kiếm tập sự",icon:"⚔",type:"melee",damage:25,range:112,cooldown:.48,cost:0,description:"Cận chiến · cân bằng",detail:"Lưỡi kiếm khởi đầu, tầm đánh ổn định."},
      {id:"moonblade",name:"Nguyệt nhận",icon:"✧",type:"melee",damage:42,range:152,cooldown:.43,cost:65,description:"Kiếm · sát thương cao",detail:"Lưỡi kiếm cong chém xa và mạnh hơn."},
      {id:"pulse",name:"Súng xung lực",icon:"⌁",type:"ranged",damage:18,range:560,cooldown:.38,cost:90,description:"Súng · bắn tầm xa",detail:"Bắn tia năng lượng thẳng tới mục tiêu."},
      {id:"repeater",name:"Liên thanh",icon:"▤",type:"ranged",damage:12,range:600,cooldown:.17,cost:150,description:"Súng · tốc độ bắn nhanh",detail:"Tốc độ cao, mỗi phát nhẹ nhưng dồn sát thương."},
      {id:"starfall",name:"Nỏ tinh tú",icon:"⌖",type:"ranged",damage:55,range:650,cooldown:.82,cost:210,description:"Nỏ · xuyên phá mạnh",detail:"Mũi tên năng lượng uy lực, nhịp bắn chậm."}
    ];
    const THRESHOLDS=[100,250,450,700];
    const SAVE_KEY="bossarena.v1";
    function readSave(){try{return JSON.parse(localStorage.getItem(SAVE_KEY))||{};}catch(error){console.warn("Không đọc được dữ liệu Boss Arena:",error);return{};}}
    const stored=readSave();
    const state={
      xp:Number(stored.xp)||0,coins:Number(stored.coins)||0,
      owned:Array.isArray(stored.owned)?stored.owned:["trainee"],
      weapon:typeof stored.weapon==="string"?stored.weapon:"trainee",
      perks:stored.perks&&typeof stored.perks==="object"?stored.perks:{sword:0,ranged:0},
      wordProgress:stored.wordProgress&&typeof stored.wordProgress==="object"?stored.wordProgress:{},
      nextThreshold:Number(stored.nextThreshold)||THRESHOLDS.find(n=>n>(Number(stored.xp)||0))||100,
      bossLevel:Number(stored.bossLevel)||1,bestBoss:Number(stored.bestBoss)||0,
      cardsPicked:Number(stored.cardsPicked)||0
    };
    if(!state.owned.includes("trainee"))state.owned.unshift("trainee");
    const $=id=>document.getElementById(id),canvas=$("arena-canvas"),ctx=canvas.getContext("2d"),W=canvas.width,H=canvas.height;
    const layers=["intro-overlay","draft-overlay","quiz-overlay","shop-overlay","pause-overlay","defeat-overlay","victory-overlay"];
    const savedBossLevel=Math.max(1,Number(state.bossLevel)||1),savedBossHealth=240+(savedBossLevel-1)*80;
    let mode="intro",keys=new Set(),boss={x:W*.5,y:145,r:70,hp:savedBossHealth,maxHp:savedBossHealth,level:savedBossLevel,attackTimer:2,windup:0,blast:null,flash:0};
    let hero={x:W*.5,y:H*.72,r:20,hp:100,maxHp:100,invuln:0,dash:0,dashCooldown:0,faceX:0,faceY:-1};
    let projectiles=[],particles=[],damageTexts=[],stars=[],slash=0,activeQuiz=null,quizReturnMode="playing",quizBossDefeated=false,sound=false,audio,lastTime=0,toastTimer,draftBusy=false,hudTimer=0,shake=0,hitFlash=0;
    const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
    const activeWeapon=()=>WEAPONS.find(item=>item.id===state.weapon)||WEAPONS[0];
    function save(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(state));}catch(error){console.warn("Không lưu được tiến độ Boss Arena:",error);notify("Không lưu được tiến độ trên thiết bị này.");}}
    function showLayer(id){layers.forEach(name=>$(name).classList.toggle("hidden",name!==id));}
    function hideLayers(){layers.forEach(name=>$(name).classList.add("hidden"));}
    function notify(message){const el=$("toast");el.textContent=message;el.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove("show"),2400);}
    function tone(hz,duration=.08,volume=.025){if(!sound)return;try{audio=audio||new(window.AudioContext||window.webkitAudioContext)();const osc=audio.createOscillator(),gain=audio.createGain();osc.type="sine";osc.frequency.value=hz;gain.gain.setValueAtTime(volume,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);osc.connect(gain);gain.connect(audio.destination);osc.start();osc.stop(audio.currentTime+duration);}catch(error){console.warn("Không phát được âm thanh:",error);}}
    function burst(x,y,color,count=9){for(let i=0;i<count;i++){const angle=Math.random()*Math.PI*2,speed=30+Math.random()*115;particles.push({x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,life:.2+Math.random()*.4,max:.6,size:2+Math.random()*3,color});}tone(280,.07,.02);}
    function floatText(text,x,y,color){damageTexts.push({text,x,y,color,life:.75,max:.75});}
    function updateInterface(){
      const percent=state.nextThreshold?Math.min(100,state.xp/state.nextThreshold*100):100;
      $("xp-bar").style.width=`${percent}%`;$("xp-label").textContent=`${state.xp} / ${state.nextThreshold}`;$("xp-total").textContent=`${state.xp} EXP`;$("side-xp").textContent=state.xp;
      $("side-coins").textContent=`${state.coins} ◈`;$("side-next-threshold").textContent=`${state.nextThreshold} EXP`;
      $("mission-xp").textContent=`Tích lũy ${state.nextThreshold} EXP`;$("hero-level").textContent=`LV. ${1+Math.floor(state.xp/100)}`;
      const weapon=activeWeapon();$("equipped-name").textContent=weapon.name;$("equipped-description").textContent=weapon.description;$("equipped-icon").textContent=weapon.icon;
      $("boss-rank").textContent=`ANCIENT GUARDIAN · LV. ${boss.level}`;$("boss-name").textContent=boss.level===1?"Kẻ Gác Cổng":boss.level===2?"Hộ Vệ Hư Không":`Cổ Long Tinh Tú · ${boss.level}`;
      $("boss-health-label").textContent=`${Math.max(0,Math.ceil(boss.hp))} / ${boss.maxHp}`;$("boss-health-bar").style.width=`${Math.max(0,boss.hp/boss.maxHp*100)}%`;
      const hearts=Math.ceil(hero.hp/20);$("hero-health").textContent=Array.from({length:5},(_,i)=>i<hearts?"♥":"♡").join(" ");
      $("sector-label").textContent=`RUINS OF THE FIRST WORD · ZONE ${String(boss.level).padStart(2,"0")}`;
      updateCoordinates();
      $("mission-boss").textContent=`Đánh bại ${boss.level===1?"Kẻ Gác Cổng":"boss cấp "+boss.level}`;
      const mastered=WORDS.filter(word=>Number(state.wordProgress[word.word])>=2).length;
      $("mastered-count").textContent=`${mastered}/${WORDS.length}`;
      $("next-reward").textContent=`${state.cardsPicked} thẻ đã chọn · 3 lựa chọn ở mốc EXP`;
      $("chest-hint").classList.toggle("hidden",!world.chest);
    }
    function updateCoordinates(){
      $("coordinates").textContent=`X: ${String(Math.round(hero.x)).padStart(4,"0")} · Y: ${String(Math.round(hero.y)).padStart(4,"0")}`;
    }
    function addXP(amount){
      state.xp+=amount;save();updateInterface();
      if(state.xp>=state.nextThreshold&&!draftBusy&&mode==="playing"){openDraft();}
    }
    function nextThresholdAfter(current){return THRESHOLDS.find(value=>value>current)||current+250;}
    function openDraft(){
      if(draftBusy||mode==="defeat"||mode==="victory")return;
      draftBusy=true;mode="draft";
      $("draft-copy").textContent=`Bạn đạt ${state.xp} EXP, vượt mốc ${state.nextThreshold}. Chọn 1 trong 3 thẻ để định hình lối chơi.`;
      $("draft-grid").innerHTML=[
        {id:"chest",icon:"♧",name:"Thợ săn bảo vật",text:"Gọi một rương bí ẩn xuất hiện tại vị trí ngẫu nhiên trên bản đồ. Chạy đến mở để nhận coin hoặc vũ khí.",tag:"RƯƠNG NGẪU NHIÊN"},
        {id:"sword",icon:"⚔",name:"Kiếm tâm linh",text:"Tăng 35% sát thương cho mọi vũ khí cận chiến. Tầm chém cũng được mở rộng.",tag:"CƯỜNG HÓA KIẾM"},
        {id:"ranged",icon:"✧",name:"Xạ thủ tinh nhuệ",text:"Tăng 35% sát thương vũ khí tầm xa. Đạn bay nhanh hơn và để lại vệt sáng.",tag:"CƯỜNG HÓA SÚNG"}
      ].map(card=>`<button class="draft-card" data-card="${card.id}"><span class="card-icon">${card.icon}</span><b>${card.name}</b><p>${card.text}</p><small>${card.tag} · CHỌN THẺ →</small></button>`).join("");
      $("draft-grid").querySelectorAll("[data-card]").forEach(button=>button.addEventListener("click",()=>chooseCard(button.dataset.card)));
      showLayer("draft-overlay");
    }
    function chooseCard(id){
      if(id==="chest"){spawnChest();notify("Đã chọn Thợ săn bảo vật — rương xuất hiện trên bản đồ!");}
      else if(id==="sword"){state.perks.sword=(Number(state.perks.sword)||0)+1;notify("Kiếm tâm linh: sát thương cận chiến +35%!");}
      else{state.perks.ranged=(Number(state.perks.ranged)||0)+1;notify("Xạ thủ tinh nhuệ: sát thương tầm xa +35%!");}
      state.cardsPicked++;state.nextThreshold=nextThresholdAfter(state.nextThreshold);save();draftBusy=false;mode="playing";hideLayers();updateInterface();
      if(state.xp>=state.nextThreshold)openDraft();
    }
    function spawnChest(){
      let x,y;
      do{x=90+Math.random()*(W-180);y=145+Math.random()*(H-235);}while(Math.hypot(x-hero.x,y-hero.y)<150||Math.hypot(x-boss.x,y-boss.y)<125);
      world.chest={x,y,phase:0};
    }
    const world={chest:null};
    function collectChest(){
      if(!world.chest||Math.hypot(hero.x-world.chest.x,hero.y-world.chest.y)>46)return;
      world.chest=null;
      const rewards=["coins","coins","weapon","coins"];const prize=rewards[Math.floor(Math.random()*rewards.length)];
      if(prize==="weapon"){
        const available=WEAPONS.filter(item=>item.cost>0&&!state.owned.includes(item.id));
        if(available.length){const item=available[Math.floor(Math.random()*available.length)];state.owned.push(item.id);state.weapon=item.id;notify(`RƯƠNG HIẾM! Nhận ${item.name} miễn phí.`);}
        else{const amount=45+Math.floor(Math.random()*31);state.coins+=amount;notify(`Rương đầy coin! +${amount} coin.`);}
      }else{const amount=25+Math.floor(Math.random()*41);state.coins+=amount;notify(`Tìm thấy ${amount} coin trong rương!`);}
      save();updateInterface();tone(740,.2,.04);
    }
    function damageBoss(amount){
      if(mode!=="playing")return;
      const weapon=activeWeapon(),boost=weapon.type==="melee"?1+.35*(Number(state.perks.sword)||0):1+.35*(Number(state.perks.ranged)||0);
      const dealt=Math.round(amount*boost);boss.hp=Math.max(0,boss.hp-dealt);boss.flash=.2;shake=Math.max(shake,4);floatText(`-${dealt}`,boss.x,boss.y-boss.r*.55,"#ffcf82");
      particles.push({x:boss.x+(Math.random()-.5)*boss.r,y:boss.y+(Math.random()-.5)*boss.r,vx:(Math.random()-.5)*75,vy:(Math.random()-.5)*75,life:.35,max:.35,size:3+Math.random()*4,color:"#ffcf82"});
      addXP(Math.max(1,Math.floor(dealt/3)));tone(weapon.type==="melee"?250:500,.055,.025);
      if(boss.hp<=0)defeatBoss();
    }
    function attack(){
      if(mode!=="playing")return;
      const now=performance.now(),weapon=activeWeapon();if(now<(hero.attackReady||0))return;hero.attackReady=now+weapon.cooldown*1000;slash=.22;
      if(weapon.type==="melee"){
        const dx=boss.x-hero.x,dy=boss.y-hero.y,distance=Math.hypot(dx,dy)||1;hero.faceX=dx/distance;hero.faceY=dy/distance;
        if(distance<=weapon.range+boss.r){damageBoss(weapon.damage);burst(boss.x,boss.y,"#d4adff",5);}
        else if(distance<weapon.range+boss.r+115){hero.x=clamp(hero.x+dx/distance*48,34,W-34);hero.y=clamp(hero.y+dy/distance*48,90,H-38);notify("Lướt kiếm! Tiến gần boss để chém trúng.");}
        else notify("Boss ở ngoài tầm kiếm — di chuyển lại gần!");
      }else{
        const dx=boss.x-hero.x,dy=boss.y-hero.y,distance=Math.hypot(dx,dy)||1;hero.faceX=dx/distance;hero.faceY=dy/distance;
        projectiles.push({x:hero.x,y:hero.y-14,vx:dx/distance*620,vy:dy/distance*620,damage:weapon.damage,life:weapon.range/620,color:weapon.id==="starfall"?"#ffd77c":"#a8a0ff"});
      }
    }
    function dash(){
      if(mode!=="playing"||performance.now()<(hero.dashReady||0))return;
      let dx=0,dy=0;if(keys.has("arrowleft")||keys.has("a"))dx--;if(keys.has("arrowright")||keys.has("d"))dx++;if(keys.has("arrowup")||keys.has("w"))dy--;if(keys.has("arrowdown")||keys.has("s"))dy++;
      const m=Math.hypot(dx,dy)||1;if(!dx&&!dy){dx=hero.faceX;dy=hero.faceY;}
      const trailX=hero.x,trailY=hero.y;
      hero.x=clamp(hero.x+dx/m*105,34,W-34);hero.y=clamp(hero.y+dy/m*105,90,H-38);hero.dash=.32;hero.invulnerable=.42;hero.dashReady=performance.now()+1750;burst(trailX,trailY,"#ba9aff",5);tone(360,.12,.03);
    }
    function hurtHero(amount){
      if(hero.invulnerable>0||mode!=="playing")return;
      hero.hp=Math.max(0,hero.hp-amount);hero.invulnerable=.85;hitFlash=.2;shake=Math.max(shake,8);floatText(`-${amount}`,hero.x,hero.y-25,"#ff899b");burst(hero.x,hero.y,"#ff778e",12);updateInterface();
      if(hero.hp<=0){mode="defeat";$("defeat-copy").textContent=`Boss cấp ${boss.level} còn ${Math.ceil(boss.hp)} HP. EXP, coin và vũ khí của bạn vẫn được giữ lại.`;showLayer("defeat-overlay");}
    }
    function defeatBoss(){
      mode="victory";boss.hp=0;const reward=40+boss.level*15;state.coins+=reward;state.bestBoss=Math.max(state.bestBoss,boss.level);save();updateInterface();
      $("victory-title").textContent=`Boss cấp ${boss.level} đã gục ngã!`;$("victory-copy").textContent=`Bạn nhận ${reward} coin thưởng. Nghỉ một nhịp, hồi đầy máu và chuẩn bị cho kẻ địch mạnh hơn.`;showLayer("victory-overlay");tone(900,.3,.04);
    }
    function beginNextBoss(){boss.level++;boss.maxHp=240+(boss.level-1)*80;boss.hp=boss.maxHp;boss.flash=0;state.bossLevel=boss.level;save();boss.attackTimer=1.5;hero.hp=hero.maxHp;hero.x=W/2;hero.y=H*.72;mode="playing";hideLayers();updateInterface();if(state.xp>=state.nextThreshold)openDraft();}
    function askQuestion(){
      if(mode!=="playing"&&mode!=="intro"&&mode!=="paused")return;
      quizReturnMode=mode;
      const candidates=WORDS.filter(word=>(!activeQuiz||word.word!==activeQuiz.word)&&Number(state.wordProgress[word.word]||0)<2);
      const reviewCandidates=candidates.filter(word=>Number(state.wordProgress[word.word])===1);
      const pool=reviewCandidates.length?reviewCandidates:candidates.length?candidates:WORDS.filter(word=>word.word!==activeQuiz?.word);
      activeQuiz=pool[Math.floor(Math.random()*pool.length)];mode="quiz";
      quizBossDefeated=false;
      $("quiz-clue").textContent=activeQuiz.meaning;$("quiz-sentence").textContent=`“${activeQuiz.example}”`;
      $("quiz-answer").value="";$("quiz-answer").disabled=false;$("quiz-submit").disabled=false;$("quiz-submit").textContent="TRẢ LỜI  ↗";
      $("quiz-form").dataset.done="";$("quiz-feedback").className="feedback";$("quiz-feedback").textContent="Mỗi lần thử thách gồm một câu từ vựng.";
      $("quiz-continue").classList.add("hidden");showLayer("quiz-overlay");setTimeout(()=>$("quiz-answer").focus(),50);
    }
    function normalize(text){return text.toLowerCase().trim().replace(/[^a-z]/g,"");}
    function distanceOne(a,b){if(Math.abs(a.length-b.length)>1)return false;let i=0,j=0,d=0;while(i<a.length&&j<b.length){if(a[i]===b[j]){i++;j++;continue;}if(++d>1)return false;if(a.length>b.length)i++;else if(b.length>a.length)j++;else{i++;j++;}}if(i<a.length||j<b.length)d++;return d===1;}
    function submitQuiz(event){
      event.preventDefault();if(mode!=="quiz"||!activeQuiz)return;
      if($("quiz-form").dataset.done==="true"){resumeQuiz();return;}
      const answer=normalize($("quiz-answer").value),target=normalize(activeQuiz.word),result=answer===target?"success":answer&&distanceOne(answer,target)?"near":"fail";
      const coins=result==="success"?30:result==="near"?10:0,xp=result==="success"?15:result==="near"?5:2;
      const progress=Number(state.wordProgress[activeQuiz.word])||0;
      state.wordProgress[activeQuiz.word]=result==="success"?Math.min(2,progress+1):0;
      if(result==="success"&&window.linguaLearning){
        window.linguaLearning.record({event_type:"word_reviewed",word:{word:activeQuiz.word,meaning:activeQuiz.meaning,example:activeQuiz.example}}).catch(error=>console.error("Không đồng bộ được từ Boss Arena:",error));
      }
      state.coins+=coins;addXP(xp);save();
      const damage=result==="success"?36:result==="near"?14:0;
      if(damage&&quizReturnMode==="playing"){
        boss.hp=Math.max(0,boss.hp-damage);boss.flash=.2;shake=Math.max(shake,result==="success"?4:2);floatText(`-${damage}`,boss.x,boss.y-boss.r*.55,result==="success"?"#ffcf82":"#ba9aff");burst(boss.x,boss.y,result==="success"?"#ffcf82":"#ba9aff",result==="success"?12:7);
        quizBossDefeated=boss.hp<=0;
      }
      $("quiz-answer").disabled=true;$("quiz-submit").disabled=true;
      $("quiz-feedback").className=`feedback ${result}`;
      const combatReward=damage&&quizReturnMode==="playing"?` Boss mất ${damage} HP.`:"";
      const mastery=state.wordProgress[activeQuiz.word]>=2?" Đã nhớ vững từ này!":result==="success"?" Nhớ đúng thêm 1 lần để thành thạo.":"";
      if(result==="success")$("quiz-feedback").textContent=`CHÍNH XÁC! “${activeQuiz.word}” nghĩa là ${activeQuiz.meaning}. +${coins} coin · +${xp} EXP.${combatReward}${mastery}`;
      else if(result==="near")$("quiz-feedback").textContent=`GẦN ĐÚNG! Đáp án: ${activeQuiz.word} — ${activeQuiz.meaning}. +${coins} coin · +${xp} EXP.${combatReward}`;
      else $("quiz-feedback").textContent=`Chưa đúng. Đáp án: ${activeQuiz.word} — ${activeQuiz.meaning}. Hãy đọc lại câu ví dụ và thử từ tiếp theo nhé.`;
      $("quiz-submit").textContent="TIẾP TỤC";$("quiz-submit").disabled=false;$("quiz-continue").classList.remove("hidden");$("quiz-form").dataset.done="true";updateInterface();
    }
    function resumeQuiz(){
      mode=quizReturnMode;hideLayers();
      if(mode==="intro")showLayer("intro-overlay");
      else if(mode==="paused")showLayer("pause-overlay");
      $("quiz-form").dataset.done="";
      if(quizBossDefeated&&mode==="playing"){quizBossDefeated=false;defeatBoss();return;}
      if(mode==="playing"&&state.xp>=state.nextThreshold)openDraft();
    }
    function openShop(){if(mode!=="playing"&&mode!=="intro"&&mode!=="paused"&&mode!=="shop")return;const returnMode=$("shop-overlay").dataset.return||mode;mode="shop";$("shop-coins").textContent=state.coins;
      $("weapon-grid").innerHTML=WEAPONS.map(item=>{const owned=state.owned.includes(item.id),equipped=state.weapon===item.id;return `<article class="weapon-card"><span class="weapon-icon">${item.icon}</span><span class="weapon-info"><b>${item.name}</b><p>${item.detail}</p></span><div class="weapon-action"><span>${item.cost?`◈ ${item.cost} COIN`:"KHỞI ĐẦU"}</span><button data-weapon="${item.id}" ${equipped?"disabled":""}>${equipped?"ĐANG DÙNG":owned?"TRANG BỊ":state.coins<item.cost?"THIẾU COIN":"MUA & DÙNG"}</button></div></article>`;}).join("");
      $("weapon-grid").querySelectorAll("[data-weapon]").forEach(button=>button.addEventListener("click",()=>buyWeapon(button.dataset.weapon,returnMode)));
      showLayer("shop-overlay");}
    function buyWeapon(id,returnMode){const item=WEAPONS.find(entry=>entry.id===id);if(!item)return;
      if(!state.owned.includes(id)){if(state.coins<item.cost){notify("Chưa đủ coin — làm thử thách từ vựng để kiếm thêm!");return;}state.coins-=item.cost;state.owned.push(id);notify(`Đã mua ${item.name}!`);}
      state.weapon=id;save();updateInterface();$("shop-overlay").dataset.return=returnMode;openShop();
    }
    function closeShop(){const previous=$("shop-overlay").dataset.return||"playing";mode=previous==="paused"?"paused":previous==="intro"?"intro":"playing";hideLayers();if(mode==="intro")showLayer("intro-overlay");else if(mode==="paused")showLayer("pause-overlay");}
    function openShopWithReturn(){const previous=mode;$("shop-overlay").dataset.return=previous;openShop();}
    function setPaused(){if(mode==="playing"){mode="paused";showLayer("pause-overlay");}else if(mode==="paused"){mode="playing";hideLayers();}}
    function resetCampaign(){
      if(!confirm("Bắt đầu lại chiến dịch? EXP, coin, vũ khí và thẻ đã chọn sẽ bị xóa."))return;
      Object.assign(state,{xp:0,coins:0,owned:["trainee"],weapon:"trainee",perks:{sword:0,ranged:0},nextThreshold:100,bossLevel:1,bestBoss:0,cardsPicked:0});
      boss={x:W*.5,y:145,r:70,hp:240,maxHp:240,level:1,attackTimer:2,windup:0,blast:null,flash:0};hero.hp=100;hero.x=W/2;hero.y=H*.72;world.chest=null;projectiles=[];damageTexts=[];shake=0;hitFlash=0;mode="intro";save();updateInterface();showLayer("intro-overlay");
    }
    function update(dt){
      boss.flash=Math.max(0,(boss.flash||0)-dt);shake=Math.max(0,shake-dt*28);hitFlash=Math.max(0,hitFlash-dt);
      particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;});particles=particles.filter(p=>p.life>0);
      damageTexts.forEach(item=>{item.y-=42*dt;item.life-=dt;});damageTexts=damageTexts.filter(item=>item.life>0);
      if(mode!=="playing")return;
      let dx=0,dy=0;if(keys.has("arrowleft")||keys.has("a"))dx--;if(keys.has("arrowright")||keys.has("d"))dx++;if(keys.has("arrowup")||keys.has("w"))dy--;if(keys.has("arrowdown")||keys.has("s"))dy++;
      const len=Math.hypot(dx,dy)||1;if(dx||dy){hero.faceX=dx/len;hero.faceY=dy/len;hero.x=clamp(hero.x+dx/len*240*dt,35,W-35);hero.y=clamp(hero.y+dy/len*240*dt,95,H-38);}
      if(keys.has(" ")||keys.has("enter"))attack();hero.invulnerable=Math.max(0,hero.invulnerable-dt);hero.dash=Math.max(0,hero.dash-dt);hero.flash=Math.max(0,(hero.flash||0)-dt);slash=Math.max(0,slash-dt);
      boss.attackTimer-=dt;
      if(boss.attackTimer<=0&&boss.windup<=0){boss.windup=.95;boss.blast={x:hero.x,y:hero.y,r:118};boss.attackTimer=3.1+Math.random()*.6;}
      if(boss.windup>0){boss.windup-=dt;if(boss.windup<=0&&boss.blast){if(Math.hypot(hero.x-boss.blast.x,hero.y-boss.blast.y)<boss.blast.r)hurtHero(24);burst(boss.blast.x,boss.blast.y,"#ff778e",14);boss.blast=null;}}
      projectiles.forEach(shot=>{shot.x+=shot.vx*dt;shot.y+=shot.vy*dt;shot.life-=dt;if(Math.hypot(shot.x-boss.x,shot.y-boss.y)<boss.r+8){shot.hit=true;damageBoss(shot.damage);}});
      projectiles=projectiles.filter(shot=>!shot.hit&&shot.life>0&&shot.x>-40&&shot.x<W+40&&shot.y>-40&&shot.y<H+40);
      stars.forEach(s=>{s.y+=s.speed*dt;if(s.y>H){s.y=0;s.x=Math.random()*W;}});
      if(world.chest){world.chest.phase+=dt;collectChest();}
      hudTimer+=dt;
      if(hudTimer>=.1){updateCoordinates();hudTimer=0;}
    }
    function drawHero(){
      if(hero.invulnerable>0&&Math.floor(performance.now()/90)%2===0)return;
      const x=hero.x,y=hero.y+Math.sin(performance.now()*.004)*1.5;ctx.save();ctx.translate(x,y);
      if(hero.dash>0){ctx.globalAlpha=.5;ctx.fillStyle="#ba9aff";ctx.beginPath();ctx.ellipse(-hero.faceX*25,-hero.faceY*25,13,24,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;}
      const aura=ctx.createRadialGradient(0,0,2,0,0,39);aura.addColorStop(0,"#c49aff44");aura.addColorStop(1,"#c49aff00");ctx.fillStyle=aura;ctx.beginPath();ctx.arc(0,0,40,0,Math.PI*2);ctx.fill();
      ctx.shadowColor="#bb9aff";ctx.shadowBlur=hero.flash>0?24:8;
      ctx.fillStyle="#30243f";ctx.beginPath();ctx.moveTo(-14,8);ctx.lineTo(-18,26);ctx.lineTo(-5,20);ctx.lineTo(0,27);ctx.lineTo(6,20);ctx.lineTo(18,26);ctx.lineTo(13,7);ctx.closePath();ctx.fill();
      ctx.fillStyle="#ba9aff";ctx.beginPath();ctx.moveTo(-9,-7);ctx.lineTo(9,-7);ctx.lineTo(13,13);ctx.lineTo(-12,13);ctx.closePath();ctx.fill();
      ctx.fillStyle="#f1cbb0";ctx.beginPath();ctx.arc(0,-16,9,0,Math.PI*2);ctx.fill();
      ctx.fillStyle="#392544";ctx.beginPath();ctx.arc(0,-19,10,Math.PI,Math.PI*2);ctx.lineTo(9,-12);ctx.lineTo(3,-15);ctx.lineTo(-8,-11);ctx.closePath();ctx.fill();
      ctx.fillStyle="#ffcc73";ctx.fillRect(-10,1,20,3);
      ctx.strokeStyle="#f5d490";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-11,-3);ctx.lineTo(-18,5);ctx.lineTo(-20,11);ctx.moveTo(11,-3);ctx.lineTo(17,4);ctx.lineTo(18,9);ctx.stroke();
      const weapon=activeWeapon();ctx.strokeStyle=weapon.type==="melee"?"#f5e3b4":"#9de9ff";ctx.lineWidth=3;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(12,5);ctx.lineTo(24,16);ctx.stroke();
      if(weapon.type==="melee"){ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(21,12);ctx.lineTo(31,2);ctx.stroke();ctx.beginPath();ctx.moveTo(25,10);ctx.lineTo(21,6);ctx.stroke();}
      else{ctx.fillStyle="#83dfff";ctx.shadowColor="#83dfff";ctx.shadowBlur=8;ctx.beginPath();ctx.arc(25,15,4,0,Math.PI*2);ctx.fill();}
      ctx.shadowBlur=0;ctx.restore();
    }
    function drawBoss(){
      const x=boss.x,y=boss.y,r=boss.r;ctx.save();ctx.translate(x,y);
      const glow=ctx.createRadialGradient(0,0,15,0,0,r*1.9);glow.addColorStop(0,"#c2558b33");glow.addColorStop(1,"#a84b8400");ctx.fillStyle=glow;ctx.beginPath();ctx.arc(0,0,r*1.9,0,Math.PI*2);ctx.fill();
      const pulse=1+Math.sin(performance.now()*.003)*.035;ctx.scale(pulse,pulse);ctx.shadowColor="#ec6e9a";ctx.shadowBlur=boss.flash>0?40:22;
      ctx.fillStyle=boss.flash>0?"#fff1f6":"#36253e";ctx.beginPath();ctx.moveTo(-42,-15);ctx.lineTo(-56,-64);ctx.lineTo(-20,-42);ctx.lineTo(0,-57);ctx.lineTo(20,-42);ctx.lineTo(56,-64);ctx.lineTo(42,-15);ctx.lineTo(50,22);ctx.lineTo(27,53);ctx.lineTo(0,65);ctx.lineTo(-27,53);ctx.lineTo(-50,22);ctx.closePath();ctx.fill();ctx.strokeStyle="#e878a0";ctx.lineWidth=2;ctx.stroke();
      ctx.shadowBlur=0;ctx.fillStyle="#573649";ctx.beginPath();ctx.ellipse(0,7,37,42,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle="#ffcf88";ctx.beginPath();ctx.moveTo(-22,-7);ctx.lineTo(-6,-1);ctx.lineTo(-18,0);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(22,-7);ctx.lineTo(6,-1);ctx.lineTo(18,0);ctx.closePath();ctx.fill();
      ctx.fillStyle="#f47b9a";ctx.beginPath();ctx.arc(-13,-3,2.5,0,Math.PI*2);ctx.arc(13,-3,2.5,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle="#e894a9";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-12,24);ctx.quadraticCurveTo(0,34,12,24);ctx.stroke();
      ctx.fillStyle="#8d5270";ctx.beginPath();ctx.moveTo(-30,19);ctx.lineTo(-67,45);ctx.lineTo(-44,55);ctx.lineTo(-19,38);ctx.fill();ctx.beginPath();ctx.moveTo(30,19);ctx.lineTo(67,45);ctx.lineTo(44,55);ctx.lineTo(19,38);ctx.fill();
      for(let i=0;i<3;i++){ctx.globalAlpha=.5+Math.sin(performance.now()*.004+i)*.3;ctx.fillStyle="#ff9eb2";ctx.beginPath();ctx.arc(-12+i*12,52+Math.sin(performance.now()*.003+i)*3,2,0,Math.PI*2);ctx.fill();}
      ctx.globalAlpha=1;ctx.restore();
      if(boss.windup>0&&boss.blast){const radius=boss.blast.r*(1+(1-boss.windup/.95)*.15);ctx.save();ctx.strokeStyle="#ff778e";ctx.globalAlpha=.45+.4*Math.sin(performance.now()*.02);ctx.lineWidth=3;ctx.setLineDash([8,6]);ctx.beginPath();ctx.arc(boss.blast.x,boss.blast.y,radius,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle="#ff778e11";ctx.beginPath();ctx.arc(boss.blast.x,boss.blast.y,radius,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;ctx.fillStyle="#ff9daa";ctx.font="700 12px Manrope";ctx.textAlign="center";ctx.fillText("NÉ TRÁNH!",boss.blast.x,boss.blast.y-radius-12);ctx.restore();}
    }
    function draw(){
      ctx.clearRect(0,0,W,H);ctx.save();if(shake>0)ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);const bg=ctx.createLinearGradient(0,0,0,H);bg.addColorStop(0,"#241831");bg.addColorStop(.52,"#171221");bg.addColorStop(1,"#100e18");ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
      ctx.save();stars.forEach(s=>{ctx.globalAlpha=s.a;ctx.fillStyle=s.color;ctx.fillRect(s.x,s.y,s.size,s.size);});ctx.globalAlpha=1;
      ctx.strokeStyle="#c7a6ee0d";ctx.lineWidth=1;const offset=(performance.now()*.012)%48;for(let y=-48+offset;y<H;y+=48){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}for(let x=0;x<W;x+=60){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
      ctx.strokeStyle="#d8ae6d18";ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(W/2,H*.45,210,54,0,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.ellipse(W/2,H*.45,152,34,0,0,Math.PI*2);ctx.stroke();
      ctx.fillStyle="#e2bb7920";for(let i=0;i<7;i++){const a=i*Math.PI*2/7;ctx.beginPath();ctx.arc(W/2+Math.cos(a)*210,H*.45+Math.sin(a)*54,3,0,Math.PI*2);ctx.fill();}ctx.restore();
      if(boss.hp>0)drawBoss();
      if(world.chest){const c=world.chest,glow=10+Math.sin(c.phase*4)*4;ctx.save();ctx.shadowColor="#ffcc73";ctx.shadowBlur=glow+10;ctx.fillStyle="#9f632d";ctx.fillRect(c.x-17,c.y-12,34,25);ctx.fillStyle="#edb75c";ctx.fillRect(c.x-20,c.y-16,40,10);ctx.fillStyle="#fff0b0";ctx.fillRect(c.x-3,c.y-7,6,12);ctx.strokeStyle="#ffdc91";ctx.strokeRect(c.x-17,c.y-12,34,25);ctx.globalAlpha=.45;ctx.strokeStyle="#ffcc73";ctx.beginPath();ctx.arc(c.x,c.y,glow+8,0,Math.PI*2);ctx.stroke();ctx.restore();}
      projectiles.forEach(s=>{ctx.save();ctx.shadowColor=s.color;ctx.shadowBlur=14;ctx.strokeStyle=s.color;ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(s.x-s.vx*.016,s.y-s.vy*.016);ctx.lineTo(s.x,s.y);ctx.stroke();ctx.restore();});
      particles.forEach(p=>{ctx.globalAlpha=Math.max(0,p.life/p.max);ctx.fillStyle=p.color;ctx.shadowColor=p.color;ctx.shadowBlur=9;ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);ctx.fill();});ctx.globalAlpha=1;ctx.shadowBlur=0;drawHero();
      damageTexts.forEach(item=>{ctx.save();ctx.globalAlpha=Math.max(0,item.life/item.max);ctx.fillStyle=item.color;ctx.font="800 18px Manrope";ctx.textAlign="center";ctx.shadowColor=item.color;ctx.shadowBlur=12;ctx.fillText(item.text,item.x,item.y);ctx.restore();});
      if(slash>0){ctx.save();ctx.strokeStyle="#fff0c8";ctx.lineWidth=5;ctx.globalAlpha=Math.min(1,slash/.22);ctx.shadowColor="#ffcc73";ctx.shadowBlur=15;ctx.beginPath();ctx.arc(hero.x+hero.faceX*28,hero.y+hero.faceY*28,35,-1.2,1.3);ctx.stroke();ctx.restore();}
      if(hero.dash>0){ctx.save();ctx.globalAlpha=hero.dash/.32*.3;ctx.strokeStyle="#d9b4ff";ctx.lineWidth=16;ctx.beginPath();ctx.moveTo(hero.x-hero.faceX*90,hero.y-hero.faceY*90);ctx.lineTo(hero.x,hero.y);ctx.stroke();ctx.restore();}
      if(hitFlash>0){ctx.fillStyle=`rgba(255,87,120,${hitFlash*.35})`;ctx.fillRect(0,0,W,H);}ctx.restore();
    }
    function frame(time){const dt=Math.min(.04,(time-lastTime)/1000||0);lastTime=time;update(dt);draw();requestAnimationFrame(frame);}
    stars=Array.from({length:110},()=>({x:Math.random()*W,y:Math.random()*H,size:Math.random()<.12?2:1,a:.15+Math.random()*.5,speed:8+Math.random()*24,color:Math.random()<.2?"#f8cb85":"#c7aeef"}));
    $("start-button").addEventListener("click",()=>{mode="playing";hideLayers();hero.hp=hero.maxHp;if(state.xp>=state.nextThreshold)openDraft();});
    $("pause-button").addEventListener("click",setPaused);$("resume-button").addEventListener("click",setPaused);$("reset-button").addEventListener("click",resetCampaign);
    $("revive-button").addEventListener("click",()=>{hero.hp=hero.maxHp;hero.x=W/2;hero.y=H*.72;hero.invulnerable=1.2;mode="playing";hideLayers();notify("Đã hồi sinh — hãy né vùng boss cảnh báo!");});
    $("next-boss").addEventListener("click",beginNextBoss);
    $("open-shop").addEventListener("click",openShopWithReturn);$("close-shop").addEventListener("click",closeShop);
    $("shop-overlay").addEventListener("click",event=>{if(event.target===$("shop-overlay"))closeShop();});
    $("quiz-open").addEventListener("click",askQuestion);
    $("quiz-form").addEventListener("submit",submitQuiz);
    $("quiz-continue").addEventListener("click",resumeQuiz);
    $("sound-button").addEventListener("click",event=>{sound=!sound;$("sound-label").textContent=`Âm thanh: ${sound?"bật":"tắt"}`;event.currentTarget.setAttribute("aria-pressed",String(sound));if(sound)tone(520);});
    window.addEventListener("keydown",event=>{
      const key=event.key.toLowerCase();
      if(["arrowup","arrowdown","arrowleft","arrowright"," "].includes(key))event.preventDefault();
      if(key==="p"&&!event.repeat){setPaused();return;}
      if(mode==="playing"){keys.add(key===" "?" ":key);if(key==="shift")dash();if(key===" "||key==="enter")attack();}
      if(key==="escape"&&mode==="shop")closeShop();
    });
    window.addEventListener("keyup",event=>{const key=event.key.toLowerCase();keys.delete(key===" "?" ":key);});
    window.addEventListener("blur",()=>keys.clear());
    document.querySelectorAll("[data-key]").forEach(button=>{const key=button.dataset.key.toLowerCase();button.addEventListener("pointerdown",event=>{event.preventDefault();button.setPointerCapture(event.pointerId);keys.add(key);});["pointerup","pointercancel","lostpointercapture"].forEach(name=>button.addEventListener(name,()=>keys.delete(key)));});
    $("touch-attack").addEventListener("pointerdown",event=>{event.preventDefault();attack();});
    $("touch-dodge").addEventListener("pointerdown",event=>{event.preventDefault();dash();});
    updateInterface();requestAnimationFrame(frame);
  
