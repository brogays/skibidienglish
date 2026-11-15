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
    const SAVE_KEY="linguaquest.v1";
    function readSaved(){try{return JSON.parse(localStorage.getItem(SAVE_KEY))||{};}catch(error){console.warn("Không đọc được dữ liệu học tập:",error);return{};}}
    const initial=readSaved();
    const words=[...WORDS,...(Array.isArray(initial.customWords)?initial.customWords:[]).map(item=>({word:String(item.word||"").toLowerCase(),meaning:String(item.meaning||""),example:String(item.example||`I am learning to use ${item.word} in context.`)})).filter(item=>item.word&&item.meaning)];
    let xp=Number(initial.xp)||0,best=Number(localStorage.getItem("wordblaster.best"))||0,sound=false,audio;
    let mode="intro",round=1,score=0,lives=3,ammo=8,streak=0,destroyed=0,targetCount=0,questionIndex=0,roundStartWord=0,word=null;
    let lastTime=0,cooldown=0,toastTimer,stars=[],hudTimer=0;
    const canvas=document.getElementById("game-canvas"),ctx=canvas.getContext("2d"),W=canvas.width,H=canvas.height;
    const player={x:W/2,y:H-72,r:17,speed:330,shield:0};let keys=new Set(),drones=[],shots=[],enemyShots=[],particles=[];
    const layers=["intro-layer","pause-layer","quiz-layer","round-layer","gameover-layer"],$=id=>document.getElementById(id);
    const clamp=(n,min,max)=>Math.max(min,Math.min(max,n)),pad=(n,len=5)=>String(Math.max(0,Math.floor(n))).padStart(len,"0");
    function showLayer(id){layers.forEach(name=>$(name).classList.toggle("hidden",name!==id));}
    function hideLayers(){layers.forEach(name=>$(name).classList.add("hidden"));}
    function updateHud(){
      $("score").textContent=pad(score);$("drone-count").textContent=`${drones.length} / ${targetCount}`;
      $("lives").textContent=Array.from({length:3},(_,i)=>i<lives?"♥":"♡").join(" ");
      $("ammo-count").textContent=String(ammo).padStart(2,"0");$("ammo-count").style.color=ammo<=2?"var(--red)":"var(--amber)";
      $("round-pill").textContent=`ROUND ${String(round).padStart(2,"0")}`;$("streak").textContent=`×${streak}`;
      $("quiz-streak").textContent=`SUPPLY STREAK · ${streak}`;$("quiz-round").textContent=`ROUND ${String(round).padStart(2,"0")}`;
      $("arena-label").textContent=`SECTOR ${String(round).padStart(2,"0")} · ${round%3===0?"BOSS ENCOUNTER":"TRAINING SIMULATION"}`;
      $("coords").textContent=`X: ${String(Math.round(player.x)).padStart(4,"0")} · Y: ${String(Math.round(player.y)).padStart(4,"0")}`;
      const percent=targetCount?Math.floor((targetCount-drones.length)/targetCount*100):0;
      $("wave-bar").style.width=`${percent}%`;$("wave-fraction").textContent=`${percent}%`;
      $("wave-left").textContent=mode==="intro"?"Chờ xuất phát":`${drones.length} mục tiêu còn lại`;
      $("wave-total").textContent=targetCount?`${targetCount} mục tiêu`:"—";$("best-score").textContent=pad(best);$("total-xp").textContent=pad(xp,3);
    }
    function saveProgress(earned=0){
      xp+=earned;
      try{const data=readSaved();data.xp=(Number(data.xp)||0)+earned;localStorage.setItem(SAVE_KEY,JSON.stringify(data));localStorage.setItem("wordblaster.best",String(best));}
      catch(error){console.warn("Không lưu được tiến độ:",error);toast("Không lưu được tiến độ trên trình duyệt này.");}
      updateHud();
    }
    function startRound(){
      mode="playing";roundStartWord=questionIndex;targetCount=Math.min(3+round,9)+(round%3===0?1:0);drones=[];
      for(let i=0;i<targetCount;i++){const boss=round%3===0&&i===targetCount-1,r=boss?33:15+Math.min(round,8);drones.push({x:65+Math.random()*(W-130),y:-35-i*(boss?74:58),r,hp:boss?3+Math.floor(round/3):1,maxHp:boss?3+Math.floor(round/3):1,speed:(54+round*7+Math.random()*35)*(boss?.72:1),phase:Math.random()*6,drift:(Math.random()-.5)*(28+round*3),boss,fire:1.7+Math.random()*2});}
      shots=[];enemyShots=[];cooldown=0;hideLayers();updateHud();
    }
    function startGame(){round=1;score=0;lives=3;ammo=8;streak=0;destroyed=0;questionIndex=0;player.x=W/2;player.y=H-72;player.shield=0;particles=[];startRound();}
    function pauseGame(){if(mode==="playing"){mode="paused";showLayer("pause-layer");}else if(mode==="paused"){mode="playing";hideLayers();}}
    function tone(hz,duration=.08,volume=.025){if(!sound)return;try{audio=audio||new(window.AudioContext||window.webkitAudioContext)();const osc=audio.createOscillator(),gain=audio.createGain();osc.type="sine";osc.frequency.value=hz;gain.gain.setValueAtTime(volume,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);osc.connect(gain);gain.connect(audio.destination);osc.start();osc.stop(audio.currentTime+duration);}catch(error){console.warn("Không phát được âm thanh:",error);}}
    function notify(message){const el=$("toast");el.textContent=message;el.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove("show"),2200);}
    function burst(x,y,color,count=9){for(let i=0;i<count;i++){const a=Math.random()*Math.PI*2,s=35+Math.random()*145;particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.25+Math.random()*.55,max:.8,size:1.5+Math.random()*3,color});}tone(color==="#78f3c1"?520:160,.07);}
    function shoot(){if(mode!=="playing"||cooldown>0)return;if(ammo<=0){openQuiz();return;}ammo--;cooldown=.22;shots.push({x:player.x,y:player.y-18,vy:-560,life:1.3});tone(680,.055,.018);updateHud();if(ammo===0)setTimeout(()=>{if(mode==="playing"&&ammo===0)openQuiz();},240);}
    function nextWord(){if(!words.length)return null;const item=words[(roundStartWord+questionIndex)%words.length];questionIndex++;return item;}
    function openQuiz(){
      if(mode!=="playing"||ammo>0)return;mode="quiz";word=nextWord();
      keys.delete(" ");
      if(!word){notify("Chưa có từ vựng để ôn.");mode="playing";ammo=1;updateHud();return;}
      $("quiz-clue").textContent=word.meaning;
      const escaped=word.word.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),sentence=word.example.replace(new RegExp(escaped,"i"),"_____");
      $("quiz-sentence").textContent=`“${sentence}”`;
      $("answer-input").value="";$("answer-input").disabled=false;$("answer-submit").disabled=false;$("answer-submit").textContent="KIỂM TRA  ↗";
      $("answer-form").dataset.answered="";$("quiz-feedback").className="feedback";$("quiz-feedback").textContent="Mẹo: nhớ lại từ qua nghĩa và ngữ cảnh, đừng đoán chữ cái.";
      showLayer("quiz-layer");updateHud();setTimeout(()=>$("answer-input").focus(),50);
    }
    function normalize(text){return text.toLowerCase().trim().replace(/[^a-z]/g,"");}
    function oneEdit(a,b){
      if(Math.abs(a.length-b.length)>1)return false;let i=0,j=0,d=0;
      while(i<a.length&&j<b.length){if(a[i]===b[j]){i++;j++;continue;}if(++d>1)return false;if(a.length>b.length)i++;else if(b.length>a.length)j++;else{i++;j++;}}
      if(i<a.length||j<b.length)d++;return d===1;
    }
    function submitAnswer(event){
      event.preventDefault();if(mode!=="quiz"||!word)return;
      if($("answer-form").dataset.answered==="true"){mode="playing";hideLayers();updateHud();return;}
      const answer=normalize($("answer-input").value),target=normalize(word.word),result=answer===target?"correct":answer&&oneEdit(answer,target)?"near":"wrong";
      const ammoReward={correct:5,near:2,wrong:1}[result],xpReward={correct:20,near:10,wrong:5}[result];
      ammo+=ammoReward;streak=result==="correct"?streak+1:0;saveProgress(xpReward);
      if(result==="correct"&&window.linguaLearning){
        window.linguaLearning.record({event_type:"word_reviewed",word:{word:word.word,meaning:word.meaning,example:word.example}}).catch(error=>console.error("Không đồng bộ được từ Word Blaster:",error));
      }
      $("answer-input").disabled=true;$("answer-submit").textContent="QUAY LẠI ĐẤU TRƯỜNG";$("answer-form").dataset.answered="true";
      const feedback=$("quiz-feedback");feedback.className=`feedback ${result}`;
      if(result==="correct")feedback.textContent=`CHÍNH XÁC! “${word.word}” là ${word.meaning}. +${ammoReward} viên đạn · +${xpReward} XP.`;
      else if(result==="near")feedback.textContent=`RẤT GẦN RỒI! Đáp án là ${word.word}. +${ammoReward} viên đạn · +${xpReward} XP.`;
      else feedback.textContent=`CHƯA ĐÚNG. Đáp án là ${word.word}. Bạn vẫn có +${ammoReward} viên đạn · +${xpReward} XP.`;
      updateHud();tone(result==="correct"?780:result==="near"?430:210,.12,.04);
    }
    function clearRound(){if(mode!=="playing"||drones.length)return;mode="roundClear";const bonus=30+round*10;score+=bonus;ammo+=3;streak++;best=Math.max(best,score);saveProgress(bonus);$("round-title").textContent=`Round ${round} hoàn thành!`;$("round-copy").textContent=`Drone đã được vô hiệu hóa. +${bonus} điểm, +3 đạn thưởng — sẵn sàng cho thử thách tiếp theo?`;showLayer("round-layer");updateHud();tone(580,.18,.04);}
    function gameOver(){mode="gameover";best=Math.max(best,score);try{localStorage.setItem("wordblaster.best",String(best));}catch(error){console.warn("Không lưu được điểm cao:",error);} $("gameover-copy").textContent=`Bạn đã vượt qua ${Math.max(0,round-1)} round, hạ ${destroyed} drone và đạt ${score} điểm. Luyện thêm vài từ rồi quay lại phá kỷ lục nhé!`;showLayer("gameover-layer");updateHud();}
    function damage(){if(player.shield>0||mode!=="playing")return;lives--;player.shield=1.5;streak=0;burst(player.x,player.y,"#ff7180",13);updateHud();if(lives<=0)gameOver();}
    function update(dt){
      if(mode!=="playing")return;cooldown=Math.max(0,cooldown-dt);player.shield=Math.max(0,player.shield-dt);
      let dx=0,dy=0;if(keys.has("arrowleft")||keys.has("a"))dx--;if(keys.has("arrowright")||keys.has("d"))dx++;if(keys.has("arrowup")||keys.has("w"))dy--;if(keys.has("arrowdown")||keys.has("s"))dy++;const mag=Math.hypot(dx,dy)||1;
      player.x=clamp(player.x+dx/mag*player.speed*dt,27,W-27);player.y=clamp(player.y+dy/mag*player.speed*dt,H*.43,H-28);if(keys.has(" "))shoot();
      stars.forEach(s=>{s.y+=s.speed*dt;if(s.y>H){s.y=0;s.x=Math.random()*W;}});
      shots.forEach(s=>{s.y+=s.vy*dt;s.life-=dt;});shots=shots.filter(s=>s.y>-10&&s.life>0);
      drones.forEach(d=>{d.phase+=dt*(1.1+round*.07);d.y+=d.speed*dt;d.x=clamp(d.x+Math.sin(d.phase)*d.drift*dt,d.r+8,W-d.r-8);d.fire-=dt;if(d.fire<=0&&d.y>0&&d.y<H-100){enemyShots.push({x:d.x,y:d.y+d.r,vy:145+round*9,r:4});d.fire=1.5+Math.random()*1.7;}});
      const escaped=drones.filter(d=>d.y>H+d.r);if(escaped.length){drones=drones.filter(d=>d.y<=H+d.r);escaped.forEach(()=>damage());}
      for(let si=shots.length-1;si>=0;si--){const s=shots[si];for(let di=drones.length-1;di>=0;di--){const d=drones[di];if(Math.hypot(s.x-d.x,s.y-d.y)<d.r+6){shots.splice(si,1);d.hp--;if(d.hp<=0){burst(d.x,d.y,d.boss?"#ffce75":"#78f3c1",d.boss?24:11);drones.splice(di,1);score+=d.boss?100:25;destroyed++;streak++;best=Math.max(best,score);}break;}}}
      enemyShots.forEach(s=>{s.y+=s.vy*dt;if(Math.hypot(s.x-player.x,s.y-player.y)<s.r+player.r)s.hit=true;});enemyShots.filter(s=>s.hit).forEach(()=>damage());enemyShots=enemyShots.filter(s=>!s.hit&&s.y<H+12);
      for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;if(p.life<=0)particles.splice(i,1);}
      if(!drones.length)clearRound();
      hudTimer+=dt;
      if(hudTimer>=.1){updateHud();hudTimer=0;}
    }
    function poly(points,fill,stroke,width=1){ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);for(let i=1;i<points.length;i++)ctx.lineTo(points[i][0],points[i][1]);ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}}
    function drawShip(){if(player.shield>0&&Math.floor(performance.now()/90)%2===0)return;ctx.save();ctx.translate(player.x,player.y);ctx.shadowColor="#78f3c1";ctx.shadowBlur=22;poly([[0,-22],[17,15],[0,9],[-17,15]],"#9fffe0","#d9fff3",1.3);ctx.shadowBlur=7;poly([[-5,1],[0,-13],[5,1],[0,4]],"#48bde2","#d3faff",1);ctx.shadowBlur=12;poly([[-12,14],[-5,20],[0,14],[5,20],[12,14],[5,23],[-5,23]],"#56dbc0",null);ctx.restore();}
    function drawDrone(d){ctx.save();ctx.translate(d.x,d.y);ctx.rotate(Math.sin(d.phase)*.12);ctx.shadowColor=d.boss?"#ffbb6d":"#fb7185";ctx.shadowBlur=d.boss?22:11;const r=d.r;if(d.boss){poly([[0,-r],[r*.78,-r*.44],[r,r*.4],[r*.38,r],[-r*.38,r],[-r,r*.4],[-r*.78,-r*.44]],"#572a37","#ffbb6d",2);poly([[-r*.38,-r*.12],[0,-r*.42],[r*.38,-r*.12],[r*.25,r*.27],[-r*.25,r*.27]],"#ffbb6d","#fff0cb");ctx.fillStyle="#1d1217";ctx.fillRect(-3,-2,6,4);ctx.shadowBlur=0;ctx.fillStyle="#493238";ctx.fillRect(-r,-r-10,r*2,4);ctx.fillStyle="#ffbb6d";ctx.fillRect(-r,-r-10,r*2*d.hp/d.maxHp,4);}else{poly([[0,-r],[r*.7,-r*.48],[r,r*.18],[r*.5,r*.72],[0,r],[-r*.5,r*.72],[-r,r*.18],[-r*.7,-r*.48]],"#512b39","#fb7185",1.4);poly([[-r*.42,-r*.1],[0,-r*.48],[r*.42,-r*.1],[r*.29,r*.28],[-r*.29,r*.28]],"#fa8b96","#ffd9d8");ctx.fillStyle="#1d1217";ctx.fillRect(-3,-2,6,3);}ctx.restore();}
    function draw(){
      ctx.clearRect(0,0,W,H);const bg=ctx.createLinearGradient(0,0,0,H);bg.addColorStop(0,"#0a1a22");bg.addColorStop(.55,"#08151c");bg.addColorStop(1,"#071016");ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
      ctx.save();stars.forEach(s=>{ctx.globalAlpha=s.alpha;ctx.fillStyle=s.color;ctx.fillRect(s.x,s.y,s.size,s.size);});ctx.globalAlpha=1;ctx.strokeStyle="#6cdcb50b";ctx.lineWidth=1;const offset=(performance.now()*.018)%48;for(let y=-48+offset;y<H;y+=48){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}for(let x=0;x<W;x+=60){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}ctx.strokeStyle="#60d9c314";ctx.setLineDash([3,8]);ctx.beginPath();ctx.moveTo(25,H*.43);ctx.lineTo(W-25,H*.43);ctx.stroke();ctx.setLineDash([]);ctx.restore();
      drones.forEach(drawDrone);ctx.save();ctx.shadowColor="#75eaff";ctx.shadowBlur=12;enemyShots.forEach(s=>{ctx.fillStyle="#ff8291";ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fill();});shots.forEach(s=>{ctx.fillStyle="#b9fff0";ctx.fillRect(s.x-2,s.y-9,4,17);ctx.fillStyle="#78f3c1";ctx.fillRect(s.x-1,s.y-12,2,7);});ctx.restore();
      particles.forEach(p=>{ctx.globalAlpha=Math.max(0,p.life/p.max);ctx.fillStyle=p.color;ctx.shadowColor=p.color;ctx.shadowBlur=9;ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);ctx.fill();});ctx.globalAlpha=1;ctx.shadowBlur=0;drawShip();
    }
    function frame(time){const dt=Math.min(.04,(time-lastTime)/1000||0);lastTime=time;update(dt);draw();requestAnimationFrame(frame);}
    stars=Array.from({length:105},()=>({x:Math.random()*W,y:Math.random()*H,size:Math.random()<.14?2:1,alpha:.15+Math.random()*.55,speed:10+Math.random()*32,color:Math.random()<.14?"#79efcb":"#b9dbe1"}));
    $("start-game").addEventListener("click",startGame);$("resume-game").addEventListener("click",pauseGame);$("next-round").addEventListener("click",()=>{round++;startRound();});$("restart-game").addEventListener("click",startGame);$("pause-button").addEventListener("click",pauseGame);
    $("restart-button").addEventListener("click",()=>{if(mode==="intro")startGame();else if(confirm("Chơi lại từ Round 1? Tiến độ round hiện tại sẽ được đặt lại."))startGame();});
    $("answer-form").addEventListener("submit",submitAnswer);
    $("quit-game").addEventListener("click",event=>{event.preventDefault();mode="intro";showLayer("intro-layer");updateHud();});
    $("sound-toggle").addEventListener("click",event=>{sound=!sound;$("sound-label").textContent=`Âm thanh: ${sound?"bật":"tắt"}`;event.currentTarget.setAttribute("aria-pressed",String(sound));if(sound)tone(540);});
    window.addEventListener("keydown",event=>{const key=event.key.toLowerCase();if(["arrowup","arrowdown","arrowleft","arrowright"," "].includes(key))event.preventDefault();if(key==="p"&&!event.repeat){pauseGame();return;}if(key===" "&&mode==="quiz"&&$("answer-form").dataset.answered==="true"){mode="playing";hideLayers();return;}if(mode==="playing"){keys.add(key===" "?" ":key);if(key===" ")shoot();}if(key==="enter"&&mode==="intro")startGame();});
    window.addEventListener("keyup",event=>{const key=event.key.toLowerCase();keys.delete(key===" "?" ":key);});
    window.addEventListener("blur",()=>{keys.clear();if(mode==="playing")pauseGame();});
    document.querySelectorAll("[data-hold]").forEach(button=>{const key=button.dataset.hold.toLowerCase();button.addEventListener("pointerdown",event=>{event.preventDefault();button.setPointerCapture(event.pointerId);keys.add(key);});["pointerup","pointercancel","lostpointercapture"].forEach(name=>button.addEventListener(name,()=>keys.delete(key)));});
    const fireButton=$("touch-fire");fireButton.addEventListener("pointerdown",event=>{event.preventDefault();fireButton.setPointerCapture(event.pointerId);keys.add(" ");shoot();});["pointerup","pointercancel","lostpointercapture"].forEach(name=>fireButton.addEventListener(name,()=>keys.delete(" ")));
    updateHud();requestAnimationFrame(frame);
  
