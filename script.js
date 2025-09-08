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
const weeklyCtx = document.getElementById('weeklyChart').getContext('2d');
const monthlyCtx = document.getElementById('monthlyChart').getContext('2d');
const confettiCanvas = document.getElementById('confetti-canvas');
const ctx = confettiCanvas.getContext('2d');

let data = JSON.parse(localStorage.getItem('habitData')) || { habits: [] };
let todayDate = new Date();
let currentYear = todayDate.getFullYear();
let currentMonth = todayDate.getMonth();
const today = todayDate.toISOString().split('T')[0];
datePicker.value = today;
todayTitle.textContent = `Habits for ${today}`;
let weeklyChart = null;
let monthlyChart = null;

// --- Save utility ---
function save(){ localStorage.setItem('habitData', JSON.stringify(data)); }

// --- Format date ---
function fmtDate(y,m,d){ return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`; }

// --- Points ---
function calculatePoints(date){
  const doneCount = data.habits.filter(h=>h.records?.[date]).length;
  pointsDisplay.textContent = `Points today: ${doneCount} / ${data.habits.length}`;
}

// --- Streak ---
function calculateStreak(habit,dateStr){
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
function renderList(date){
  habitList.innerHTML = '';
  data.habits.forEach((h,i)=>{
    const done = !!h.records?.[date];
    const streak = calculateStreak(h,date);
    const li = document.createElement('li');
    if(done) li.classList.add('done');

    const span = document.createElement('span');
    span.innerHTML = `${h.name}${streak>1?` <span class="streak">(Streak: ${streak})</span>`:''}`;

    const actions = document.createElement('div'); actions.className='habit-actions';

    const doneBtn = document.createElement('button');
    doneBtn.title = done?'Undo':'Mark Done';
    doneBtn.innerText = done?'↩️':'✅';
    doneBtn.onclick=()=>toggleDone(i,date);

    const editBtn = document.createElement('button');
    editBtn.title='Edit'; editBtn.innerText='✏️'; editBtn.onclick=()=>editHabit(i);

    const delBtn = document.createElement('button');
    delBtn.title='Delete'; delBtn.innerText='🗑️';
    delBtn.onclick=()=>deleteHabit(i,date);

    actions.appendChild(doneBtn); actions.appendChild(editBtn); actions.appendChild(delBtn);
    li.appendChild(span); li.appendChild(actions);
    habitList.appendChild(li);
  });
  calculatePoints(date);
  renderHistory(date);
}

// --- History ---
function renderHistory(date){
  historyList.innerHTML='';
  data.habits.forEach(h=>{
    const done = !!h.records?.[date];
    const li = document.createElement('li');
    li.textContent = `${h.name}: ${done?'✓':'–'}`;
    historyList.appendChild(li);
  });
}

// --- Toggle / Edit / Delete ---
function toggleDone(idx,date){
  const habit = data.habits[idx];
  habit.records = habit.records || {};
  habit.records[date] = !habit.records[date];
  save(); renderList(date); updateCalendar(); renderCharts();
}

function editHabit(idx){
  const newName = prompt("Edit habit:", data.habits[idx].name);
  if(newName && newName.trim()){
    data.habits[idx].name = newName.trim();
    save(); renderList(datePicker.value); updateCalendar(); renderCharts();
  }
}

function deleteHabit(idx,date){
  if(confirm("Delete this habit for today?")){
    if(data.habits[idx].records && data.habits[idx].records[date]){
      delete data.habits[idx].records[date];
      save(); renderList(date); updateCalendar(); renderCharts();
    }
  }
}

// --- Form submit ---
habitForm.addEventListener('submit', e=>{
  e.preventDefault();
  const name = habitInput.value.trim();
  if(!name) return;
  data.habits.push({name,records:{}});
  habitInput.value='';
  save(); renderList(today); updateCalendar(); renderCharts();
});

// --- Date picker change ---
datePicker.addEventListener('change', ()=>{
  const date = datePicker.value;
  todayTitle.textContent = `Habits for ${date}`;
  renderList(date);
});

// --- Calendar ---
function generateCalendar(year,month){
  calendarGrid.innerHTML='';
  const label = new Date(year,month,1).toLocaleString(undefined,{month:'long',year:'numeric'});
  monthLabel.textContent=label;

  const firstDay = new Date(year,month,1).getDay();
  for(let e=0;e<firstDay;e++){
    const empty = document.createElement('div'); empty.className='calendar-day empty';
    calendarGrid.appendChild(empty);
  }

  const lastDay = new Date(year,month+1,0).getDate();
  for(let i=1;i<=lastDay;i++){
    const dateStr=fmtDate(year,String(month+1).padStart(2,'0'),String(i).padStart(2,'0'));
    const div=document.createElement('div'); div.className='calendar-day';
    const doneCount = data.habits.filter(h=>!!h.records?.[dateStr]).length;
    if(doneCount===data.habits.length && data.habits.length>0) div.classList.add('done');
    else if(doneCount>0){ div.style.background=`rgba(144,238,144,${0.25+0.75*(doneCount/data.habits.length)})`; div.classList.add('partial'); }
    div.textContent=i;
    div.onclick=()=>{ datePicker.value=dateStr; datePicker.dispatchEvent(new Event('change')); window.scrollTo({top:0,behavior:'smooth'}); };
    calendarGrid.appendChild(div);
  }
}

function updateCalendar(){ generateCalendar(currentYear,currentMonth); }
prevBtn.addEventListener('click',()=>{ currentMonth--; if(currentMonth<0){currentMonth=11; currentYear--;} updateCalendar(); });
nextBtn.addEventListener('click',()=>{ currentMonth++; if(currentMonth>11){currentMonth=0; currentYear++;} updateCalendar(); });

// --- Charts ---
function computeWeeklySummary(){ /* same logic as earlier */ }
function computeMonthlyDailyPercent(year,month){ /* same logic as earlier */ }

function renderCharts(){
  try{
    const wk=computeWeeklySummary();
    if(weeklyChart) weeklyChart.destroy();
    weeklyChart=new Chart(weeklyCtx,{type:'bar',data:{labels:wk.labels,datasets:[{label:'% complete',data:wk.buckets,backgroundColor:'rgba(79,195,247,0.85)'}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,max:100}}}});

    const mon=computeMonthlyDailyPercent(currentYear,currentMonth);
    if(monthlyChart) monthlyChart.destroy();
    monthlyChart=new Chart(monthlyCtx,{type:'line',data:{labels:mon.labels,datasets:[{label:'Daily %',data:mon.dataArr,fill:true,backgroundColor:'rgba(127,244,138,0.25)',borderColor:'rgba(127,244,138,0.95)'}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,max:100}}}});
  } catch(e){ console.warn('Chart render error',e); }
}

// --- Init ---
function init(){ renderList(today); currentYear=todayDate.getFullYear(); currentMonth=todayDate.getMonth(); updateCalendar(); renderCharts(); }
init();
