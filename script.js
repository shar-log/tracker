/* Ultimate Habit Tracker — with sound, charts, and reminders */

// --- Elements & state ---
const habitForm = document.getElementById('habit-form');
const habitInput = document.getElementById('habit-input');
const habitList = document.getElementById('habit-list');
const datePicker = document.getElementById('date-picker');
const historyList = document.getElementById('history-list');
const todayTitle = document.getElementById('today-title');
const calendarGrid = document.getElementById('calendar-grid');
const pointsDisplay = document.getElementById('points-display');
const prevBtn = document.getElementById('prev-month');
const nextBtn = document.getElementById('next-month');
const monthLabel = document.getElementById('month-label');
const exportBtn = document.getElementById('export-btn');
const importBtn = document.getElementById('import-btn');
const importInput = document.getElementById('import-input');
const clearBtn = document.getElementById('clear-btn');
const reminderTimeInput = document.getElementById('reminder-time');
const setReminderBtn = document.getElementById('set-reminder');
const clearReminderBtn = document.getElementById('clear-reminder');
const reminderNote = document.getElementById('reminder-note');

const weeklyCtx = document.getElementById('weeklyChart').getContext('2d');
const monthlyCtx = document.getElementById('monthlyChart').getContext('2d');

let data = JSON.parse(localStorage.getItem('habitData')) || { habits: [] };

// calendar month state
let todayDate = new Date();
let currentYear = todayDate.getFullYear();
let currentMonth = todayDate.getMonth();
const today = todayDate.toISOString().split('T')[0];
datePicker.value = today;
todayTitle.textContent = `Habits for ${today}`;

// charts handles
let weeklyChart = null;
let monthlyChart = null;

// --- Save / util ---
function save() { localStorage.setItem('habitData', JSON.stringify(data)); }
function fmtDate(y,m,d){ return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`; }

// --- Points ---
function calculatePoints(date) {
  const doneCount = data.habits.filter(h => h.records?.[date]).length;
  pointsDisplay.textContent = `Points today: ${doneCount} / ${data.habits.length}`;
}

// --- Streak ---
function calculateStreak(habit, dateStr){
  if(!habit || !habit.records) return 0;
  let count = 0;
  let d = new Date(dateStr);
  while(true){
    const key = d.toISOString().split('T')[0];
    if(habit.records?.[key]) { count++; d.setDate(d.getDate()-1); }
    else break;
  }
  return count;
}

// --- Render list & history ---
function renderList(date) {
  habitList.innerHTML = '';
  data.habits.forEach((h, i) => {
    const done = !!h.records?.[date];
    const streak = calculateStreak(h, date);
    const li = document.createElement('li');
    if(done) li.classList.add('done');
    const span = document.createElement('span');
    span.innerHTML = `${escapeHtml(h.name)}${streak>1?` <span class="streak">(Streak: ${streak})</span>`:''}`;
    const actions = document.createElement('div');
    actions.className = 'habit-actions';

    const doneBtn = document.createElement('button');
    doneBtn.title = done ? 'Undo' : 'Mark Done';
    doneBtn.innerText = done ? '↩️' : '✅';
    doneBtn.onclick = ()=> toggleDone(i, date);

    const editBtn = document.createElement('button');
    editBtn.title = 'Edit';
    editBtn.innerText = '✏️';
    editBtn.onclick = ()=> editHabit(i);

    const delBtn = document.createElement('button');
    delBtn.title = 'Delete';
    delBtn.innerText = '🗑️';
    delBtn.onclick = ()=> deleteHabit(i);

    actions.appendChild(doneBtn); actions.appendChild(editBtn); actions.appendChild(delBtn);

    li.appendChild(span); li.appendChild(actions);
    habitList.appendChild(li);
  });
  calculatePoints(date);
}

// history simple list
function renderHistory(date) {
  historyList.innerHTML = '';
  data.habits.forEach(h => {
    const done = !!h.records?.[date];
    const li = document.createElement('li');
    li.textContent = `${h.name}: ${done ? '✓' : '–'}`;
    historyList.appendChild(li);
  });
}

// --- Toggle / Edit / Delete ---
function toggleDone(idx, date) {
  const habit = data.habits[idx];
  habit.records = habit.records || {};
  habit.records[date] = !habit.records[date];
  save();
  renderList(date);
  renderHistory(date);
  updateCalendar();
  if(allHabitsDone(date)) {
    playCelebrateSound();
    triggerConfetti();
  }
}

function editHabit(idx) {
  const newName = prompt("Edit habit:", data.habits[idx].name);
  if(newName && newName.trim()){
    data.habits[idx].name = newName.trim();
    save();
    renderList(datePicker.value);
    renderHistory(datePicker.value);
    updateCalendar();
  }
}

function deleteHabit(idx) {
  if(confirm("Delete this habit?")) {
    data.habits.splice(idx,1);
    save();
    renderList(datePicker.value);
    renderHistory(datePicker.value);
    updateCalendar();
  }
}

// --- All done check ---
function allHabitsDone(date) {
  return data.habits.length > 0 && data.habits.every(h => !!h.records?.[date]);
}

// --- Form submit ---
habitForm.addEventListener('submit', e=>{
  e.preventDefault();
  const name = habitInput.value.trim();
  if(!name) return;
  data.habits.push({name, records:{}});
  habitInput.value='';
  save();
  renderList(today);
  renderHistory(today);
  updateCalendar();
  renderCharts();
});

// --- Date picker change ---
datePicker.addEventListener('change', () => {
  const date = datePicker.value;
  todayTitle.textContent = `Habits for ${date}`;
  renderList(date);
  renderHistory(date);
  calculatePoints(date);
});

// --- Calendar generation ---
function generateCalendar(year, month) {
  calendarGrid.innerHTML = '';
  const label = new Date(year, month, 1).toLocaleString(undefined, { month: 'long', year: 'numeric' });
  monthLabel.textContent = label;

  const firstDay = new Date(year, month, 1).getDay();
  for(let e=0;e<firstDay;e++){
    const empty = document.createElement('div');
    empty.className = 'calendar-day'; empty.style.visibility = 'hidden';
    calendarGrid.appendChild(empty);
  }

  const lastDay = new Date(year, month+1, 0).getDate();
  for (let i = 1; i <= lastDay; i++) {
    const dateStr = fmtDate(year, String(month+1).padStart(2,'0'), String(i).padStart(2,'0'));
    const div = document.createElement('div');
    div.className = 'calendar-day';
    if(data.habits.length > 0){
      const doneCount = data.habits.filter(h => !!h.records?.[dateStr]).length;
      const total = data.habits.length;
      div.setAttribute('data-tooltip', `${doneCount}/${total} habits done`);
      if(doneCount === total) div.classList.add('done');
      else if(doneCount > 0) {
        const intensity = 0.25 + 0.75*(doneCount/total);
        div.style.background = `rgba(144,238,144,${intensity})`; div.classList.add('partial');
      }
    } else {
      div.setAttribute('data-tooltip','No habits');
    }
    div.textContent = i;
    div.onclick = ()=> {
      datePicker.value = dateStr; datePicker.dispatchEvent(new Event('change')); window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    calendarGrid.appendChild(div);
  }
}

function updateCalendar(){ generateCalendar(currentYear, currentMonth); }

// --- Month navigation ---
document.getElementById('prev-month').addEventListener('click', ()=>{
  currentMonth--; if(currentMonth<0){ currentMonth=11; currentYear--; } updateCalendar();
});
document.getElementById('next-month').addEventListener('click', ()=>{
  currentMonth++; if(currentMonth>11){ currentMonth=0; currentYear++; } updateCalendar();
});

// --- Export / Import ---
exportBtn.addEventListener('click', ()=>{
  try {
    const payload = JSON.stringify(data, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'habitData.json';
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    alert('Export created: habitData.json');
  } catch(err){ alert('Export failed: ' + err.message); }
});

importBtn.addEventListener('click', ()=> importInput.click());
importInput.addEventListener('change', e=>{
  const file = e.target.files[0]; if(!file) return;
  const reader = new FileReader();
  reader.onload = evt => {
    try {
      const imported = JSON.parse(evt.target.result);
      if(!imported || typeof imported !== 'object' || !Array.isArray(imported.habits)) throw new Error('Invalid format: missing habits array');
      for(const h of imported.habits){
        if(!h.name || typeof h.name !== 'string') throw new Error('Invalid habit item'); if(h.records && typeof h.records!=='object') throw new Error('Invalid records for habit');
      }
      if(!confirm('Import will replace your current local data. Continue?')) return;
      data = imported; save(); renderList(datePicker.value); renderHistory(datePicker.value); updateCalendar(); renderCharts();
      alert('Import successful!');
    } catch(err) {
      console.error(err); alert('Invalid file! Please select a valid export JSON.');
    } finally { importInput.value = ''; }
  };
  reader.readAsText(file);
});

// --- Clear all data ---
clearBtn.addEventListener('click', ()=>{
  if(!confirm('This will delete ALL your habits and records locally. Are you sure?')) return;
  data = { habits: [] }; save(); renderList(datePicker.value); renderHistory(datePicker.value); updateCalendar(); renderCharts();
  alert('All data cleared.');
});

// ----------------- Charts (Chart.js) -----------------
function computeWeeklySummary(){
  // last 4 ISO-week buckets ending this week
  const buckets = []; const labels = [];
  const now = new Date(); // find last sunday as week end anchor (or use week number)
  // We'll create 4 buckets of 7 days ending today
  for(let w=3; w>=0; w--){
    const end = new Date(); end.setDate(now.getDate() - 7*w);
    const start = new Date(end); start.setDate(end.getDate()-6);
    // compute percent completion per week
    let totalSlots = 0; let completedSlots = 0;
    for(let d = new Date(start); d<=end; d.setDate(d.getDate()+1)){
      const key = d.toISOString().split('T')[0];
      totalSlots += data.habits.length;
      completedSlots += data.habits.filter(h => !!h.records?.[key]).length;
    }
    const pct = totalSlots? Math.round((completedSlots/totalSlots)*100) : 0;
    labels.push(`${start.getMonth()+1}/${start.getDate()} - ${end.getMonth()+1}/${end.getDate()}`);
    buckets.push(pct);
  }
  return { labels, buckets };
}

function computeMonthlyDailyPercent(year, month){
  const lastDay = new Date(year, month+1, 0).getDate();
  const labels = []; const dataArr = [];
  for(let d=1; d<=lastDay; d++){
    const key = fmtDate(year, String(month+1).padStart(2,'0'), String(d).padStart(2,'0'));
    labels.push(String(d));
    const total = data.habits.length;
    const done = data.habits.filter(h => !!h.records?.[key]).length;
    const pct = total? Math.round((done/total)*100) : 0;
    dataArr.push(pct);
  }
  return { labels, dataArr };
}

function renderCharts(){
  // weekly
  const wk = computeWeeklySummary();
  if(weeklyChart) weeklyChart.destroy();
  weeklyChart = new Chart(weeklyCtx, {
    type:'bar',
    data:{ labels: wk.labels, datasets:[{ label:'% complete', data:wk.buckets, backgroundColor: 'rgba(79, 195, 247, 0.8)'}]},
    options:{ responsive:true, plugins:{ legend:{ display:false }}, scales:{ y:{ beginAtZero:true, max:100 }}}
  });

  // monthly
  const mon = computeMonthlyDailyPercent(currentYear, currentMonth);
  if(monthlyChart) monthlyChart.destroy();
  monthlyChart = new Chart(monthlyCtx, {
    type:'line',
    data:{ labels: mon.labels, datasets:[{ label:'Daily %', data: mon.dataArr, fill:true, backgroundColor:'rgba(127,244,138,0.3)', borderColor:'rgba(127,244,138,0.9)'}]},
    options:{ responsive:true, plugins:{ legend:{ display:false }}, scales:{ y:{ beginAtZero:true, max:100 }}}
  });
}

// ----------------- Sound: Web Audio celebratory chime -----------------
let audioCtx = null;
function playCelebrateSound(){
  try {
    if(!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const now = audioCtx.currentTime;
    // short chord/arpeggio
    const freqs = [523.25, 659.25, 783.99]; // C5, E5, G5
    freqs.forEach((f, i) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0, now + i*0.06);
      gain.gain.linearRampToValueAtTime(0.2, now + i*0.06 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i*0.06 + 0.6);
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.start(now + i*0.06); osc.stop(now + i*0.06 + 0.7);
    });
  } catch (e) { console.warn('sound error', e); }
}

// ----------------- Confetti (unchanged bigger) -----------------
const confettiCanvas = document.getElementById('confetti-canvas');
const ctx = confettiCanvas.getContext('2d');
let W = confettiCanvas.width = window.innerWidth;
let H = confettiCanvas.height = window.innerHeight;
let confettiParticles = [];
let confettiAnimating = false;

window.addEventListener('resize', ()=> { W = confettiCanvas.width = window.innerWidth; H = confettiCanvas.height = window.innerHeight; });

function triggerConfetti(){
  if(confettiAnimating) return;
  confettiAnimating = true;
  confettiParticles = [];
  const count = 450;
  for(let i=0;i<count;i++){
    confettiParticles.push({
      x: Math.random()*W,
      y: Math.random()*-H,
      r: Math.random()*8+3,
      d: Math.random()*25+10,
      color: `hsl(${Math.random()*360}, 90%, 55%)`,
      tilt: Math.random()*20-10,
      tiltAngle: Math.random()*Math.PI,
      tiltAngleIncrement: 0.03 + Math.random()*0.05
    });
  }
  const start = performance.now();
  function frame(now){
    ctx.clearRect(0,0,W,H);
    for(let p of confettiParticles){
      ctx.beginPath(); ctx.lineWidth = p.r; ctx.strokeStyle = p.color;
      ctx.moveTo(p.x + p.tilt + p.r/2, p.y); ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r/2); ctx.stroke();
      p.tiltAngle += p.tiltAngleIncrement; p.tilt = Math.sin(p.tiltAngle) * 15;
      p.y += (Math.cos(p.d) + 3 + p.r/2) * 0.7; p.x += Math.sin(p.tiltAngle) * 0.6;
      if(p.y > H + 20){ p.y = Math.random()*-H; p.x = Math.random()*W; }
    }
    if(performance.now() - start < 4200) requestAnimationFrame(frame);
    else { setTimeout(()=>{ ctx.clearRect(0,0,W,H); confettiAnimating = false; }, 250); }
  }
  requestAnimationFrame(frame);
}

// ----------------- Reminders (in-session) -----------------
// Note: browser notifications from pages require permission and only work while the page is open in many cases.
// We'll implement a simple local scheduler that triggers Notification when allowed, and stores time in localStorage.

function scheduleNextReminder(timeStr){
  // timeStr format "HH:MM"
  if(!timeStr) return;
  const [hh, mm] = timeStr.split(':').map(s=>Number(s));
  const now = new Date();
  let next = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0, 0);
  if(next <= now) next.setDate(next.getDate() + 1);
  const ms = next.getTime() - now.getTime();
  // clear old timeout if exists
  if(window._reminderTimeout) clearTimeout(window._reminderTimeout);
  window._reminderTimeout = setTimeout(()=> {
    showNotification('Habit reminder', { body: 'Time to complete your habits!', tag:'habit-reminder' });
    // schedule next 24h
    window._reminderTimeout = setInterval(()=> showNotification('Habit reminder', { body: 'Time to complete your habits!', tag:'habit-reminder' }), 24*60*60*1000);
  }, ms);
  reminderNote.textContent = `Next reminder at ${next.toLocaleString()}`;
}

function showNotification(title, opts){
  if(Notification.permission === 'granted'){
    try { new Notification(title, opts); }
    catch(e){ console.warn('Notification error', e); }
  } else {
    // fallback: in-page toast (minimal)
    alert(`${title}\n${opts && opts.body?opts.body:''}`);
  }
}

// set / clear UI handlers
setReminderBtn.addEventListener('click', async ()=>{
  const t = reminderTimeInput.value;
  if(!t){ alert('Choose a time first'); return; }
  // request permission if not granted
  if(Notification.permission !== 'granted') {
    const perm = await Notification.requestPermission();
    if(perm !== 'granted'){ alert('Notification permission not granted. Reminders may not work when page is closed.'); }
  }
  localStorage.setItem('habitReminderTime', t);
  scheduleNextReminder(t);
  alert('Reminder set (works while this page is open).');
});
clearReminderBtn.addEventListener('click', ()=>{
  localStorage.removeItem('habitReminderTime');
  if(window._reminderTimeout) { clearTimeout(window._reminderTimeout); clearInterval(window._reminderTimeout); window._reminderTimeout=null; }
  reminderNote.textContent = 'No reminder set';
  alert('Reminder cleared.');
});

// on load, restore reminder if present
(function restoreReminder(){
  const t = localStorage.getItem('habitReminderTime');
  if(t){ reminderTimeInput.value = t; scheduleNextReminder(t); }
})();

// ----------------- Utility: escape HTML -----------------
function escapeHtml(str){ return String(str).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;'); }

// ----------------- Charts render wrapper -----------------
function renderCharts(){
  try{
    // weekly
    const wk = computeWeeklySummary();
    if(weeklyChart) weeklyChart.destroy();
    weeklyChart = new Chart(weeklyCtx, {
      type:'bar', data:{ labels: wk.labels, datasets:[{ label:'% complete', data:wk.buckets, backgroundColor: 'rgba(79, 195, 247, 0.85)'}]},
      options:{ responsive:true, plugins:{ legend:{ display:false }}, scales:{ y:{ beginAtZero:true, max:100 }}}
    });

    // monthly
    const mon = computeMonthlyDailyPercent(currentYear, currentMonth);
    if(monthlyChart) monthlyChart.destroy();
    monthlyChart = new Chart(monthlyCtx, {
      type:'line', data:{ labels: mon.labels, datasets:[{ label:'Daily %', data: mon.dataArr, fill:true, backgroundColor:'rgba(127,244,138,0.25)', borderColor:'rgba(127,244,138,0.95)'}]},
      options:{ responsive:true, plugins:{ legend:{ display:false }}, scales:{ y:{ beginAtZero:true, max:100 }}}
    });
  } catch(e){ console.warn('Chart render error', e); }
}

// compute functions used by charts (same as before)
function computeWeeklySummary(){
  const buckets = []; const labels = [];
  const now = new Date();
  for(let w=3; w>=0; w--){
    const end = new Date(); end.setDate(now.getDate() - 7*w);
    const start = new Date(end); start.setDate(end.getDate()-6);
    let totalSlots = 0; let completedSlots = 0;
    for(let d = new Date(start); d<=end; d.setDate(d.getDate()+1)){
      const key = d.toISOString().split('T')[0];
      totalSlots += data.habits.length;
      completedSlots += data.habits.filter(h => !!h.records?.[key]).length;
    }
    const pct = totalSlots? Math.round((completedSlots/totalSlots)*100) : 0;
    labels.push(`${start.getMonth()+1}/${start.getDate()} - ${end.getMonth()+1}/${end.getDate()}`);
    buckets.push(pct);
  }
  return { labels, buckets };
}

function computeMonthlyDailyPercent(year, month){
  const lastDay = new Date(year, month+1, 0).getDate();
  const labels = []; const dataArr = [];
  for(let d=1; d<=lastDay; d++){
    const key = fmtDate(year, String(month+1).padStart(2,'0'), String(d).padStart(2,'0'));
    labels.push(String(d));
    const total = data.habits.length;
    const done = data.habits.filter(h => !!h.records?.[key]).length;
    const pct = total? Math.round((done/total)*100) : 0;
    dataArr.push(pct);
  }
  return { labels, dataArr };
}

// ----------------- Init / initial renders -----------------
function init(){
  if(!data || typeof data !== 'object' || !Array.isArray(data.habits)) data = { habits: [] };
  renderList(today);
  renderHistory(today);
  currentYear = todayDate.getFullYear(); currentMonth = todayDate.getMonth();
  updateCalendar(); renderCharts();
}
init();
