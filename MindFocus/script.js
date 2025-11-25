/* CONFIG LOAD */
let CONFIG = null;
async function loadConfig(){
  const res = await fetch("config.json");
  CONFIG = await res.json();
}
function getCategoryById(id){
  return CONFIG.categories.find(c => c.id === id);
}
function sanitize(s){
  return String(s||"").toLowerCase().trim();
}

/* STATE */
let sessionActivities = [];
let xp = 0;
let level = 1;

/* ELEMENTS */
const el = {
  input: document.getElementById('input-title'),
  type: document.getElementById('input-type'),
  btnAdd: document.getElementById('btn-add'),
  btnClear: document.getElementById('btn-clear'),
  feedback: document.getElementById('feedback'),
  classification: document.getElementById('classification'),
  suggestion: document.getElementById('suggestion'),
  list: document.getElementById('list'),
  xpFill: document.getElementById('xp-fill'),
  levelText: document.getElementById('level-text')
};

/* CLASSIFY */
function classifyActivity(text, forced){
  const t = sanitize(text);

  if(forced) return forced;

  if(CONFIG.negative.prohibitedWords.some(p => t.includes(p)))
    return CONFIG.negative.id;

  for(const cat of CONFIG.categories){
    if(cat.keywords.some(k => t.includes(k)))
      return cat.id;
  }

  if(/\b(páginas|minutos|horas|página)\b/.test(t))
    return "leitura";

  if(t.includes("jogar") || t.includes("filme"))
    return "lazer";

  return "outro";
}

/* SUGGESTIONS */
function suggestFor(cat){
  const s = {
    estudo:"Use Pomodoro (25m foco + 5m pausa).",
    trabalho:"Use Eat That Frog: faça o mais importante primeiro.",
    exercicio:"Faça alongamento após terminar.",
    leitura:"Leia em blocos de 20–30 min.",
    organizacao:"Organize em blocos de 20 min.",
    meta:"Divida em micro-metas.",
    lazer:"Aproveite com moderação.",
    outro:"Divida em pequenas partes."
  };
  return s[cat] || "Boa atividade!";
}

/* XP SYSTEM */
function gainXP(v){
  xp += v;
  if(xp < 0) xp = 0;

  const newLvl = Math.floor(xp/100)+1;
  if(newLvl !== level){
    level = newLvl;
    showToast(`🎉 Subiu para o nível ${level}!`);
  }

  el.xpFill.style.width = (xp%100)+"%";
  el.levelText.textContent = `Nível ${level} • ${xp} XP`;
}

/* RENDER LIST */
function renderList(){
  el.list.innerHTML = "";

  if(sessionActivities.length === 0){
    el.list.innerHTML = `<div class="empty">Nenhuma atividade — adicione a primeira!</div>`;
    return;
  }

  sessionActivities.slice().reverse().forEach((act, rev) => {
    const idx = sessionActivities.length -1 - rev;

    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <div>
        <div class="title">${act.title}</div>
        <div class="meta">${act.category} • ${act.time}</div>
      </div>
      <div class="controls">
        <button class="small-btn positive" data-idx="${idx}" data-action="done">✓</button>
        <button class="small-btn negative" data-idx="${idx}" data-action="remove">✕</button>
      </div>
    `;
    el.list.appendChild(div);
  });

  el.list.querySelectorAll("button").forEach(b=>{
    b.onclick = () => {
      const idx = Number(b.dataset.idx);
      if(b.dataset.action === "done") markDone(idx);
      if(b.dataset.action === "remove") removeActivity(idx);
    };
  });
}

/* ACTIONS */
function markDone(i){
  const act = sessionActivities[i];
  if(!act) return;

  if(act.category === CONFIG.negative.id){
    gainXP(CONFIG.negative.xpPenalty);
    showToast("Atividade negativa removida.");
  } else {
    const c = getCategoryById(act.category);
    gainXP(c.xp);
    showToast(`+${c.xp} XP!`);
  }

  sessionActivities.splice(i,1);
  renderList();
}
function removeActivity(i){
  sessionActivities.splice(i,1);
  renderList();
}

/* HELPERS */
function showToast(msg){
  el.feedback.textContent = msg;
  el.feedback.style.opacity = 1;
  setTimeout(()=> el.feedback.style.opacity=0.8, 1500);
}

/* ADD */
function addActivity(){
  const text = el.input.value.trim();
  const forced = el.type.value;

  if(!text){
    showToast("Digite algo.");
    return;
  }

  const cat = classifyActivity(text, forced);
  const sug = suggestFor(cat);

  el.classification.textContent = `Classificado como: ${cat}`;
  el.suggestion.textContent = sug;

  if(cat === CONFIG.negative.id){
    showToast("Atividade negativa — não salva.");
    return;
  }

  sessionActivities.push({
    title:text,
    category:cat,
    time:new Date().toLocaleTimeString()
  });

  renderList();
  el.input.value="";
  el.type.value="";
}

/* CLEAR */
function clearSession(){
  if(!confirm("Limpar tudo?")) return;

  sessionActivities=[];
  xp=0;level=1;
  renderList();
  gainXP(0);
}

/* MODALS */
function bindModal(openId, modalId, closeId){
  const open = document.getElementById(openId);
  const modal = document.getElementById(modalId);
  const close = document.getElementById(closeId);

  open.onclick = () => modal.classList.remove("hidden");
  close.onclick = () => modal.classList.add("hidden");
  modal.onclick = (e) => { if(e.target===modal) modal.classList.add("hidden") }
}

bindModal("open-pomodoro","modal-pomodoro","close-pomodoro");
bindModal("open-frog","modal-frog","close-frog");
bindModal("open-eisenhower","modal-eisenhower","close-eisenhower");
bindModal("open-2min","modal-2min","close-2min");

/* INIT */
(async function(){
  await loadConfig();

  el.btnAdd.onclick = addActivity;
  el.btnClear.onclick = clearSession;
  el.input.onkeydown = e=>{ if(e.key==="Enter") addActivity(); };

  renderList();
  gainXP(0);
})();
