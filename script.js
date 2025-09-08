// ---------------- Helpers ----------------
function formatDateLocal(date) {
  const d = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return d.toISOString().split("T")[0];
}
function uid() {
  return "_" + Math.random().toString(36).substr(2, 9);
}
function save() {
  localStorage.setItem("habit-data", JSON.stringify(data));
}

// ---------------- Data ----------------
let data = JSON.parse(localStorage.getItem("habit-data")) || {
  habits: [],   // [{ id, name, archived }]
  history: {},  // { "2025-09-08": { "_abc123": true, ... } }
  points: 0
};

// ---------------- Elements ----------------
const habitForm = document.getElementById("habit-form");
const habitInput = document.getElementById("habit-input");
const habitList = document.getElementById("habit-list");
const historyList = document.getElementById("history-list");
const datePicker = document.getElementById("date-picker");
const monthLabel = document.getElementById("month-label");
const calendarGrid = document.getElementById("calendar-grid");
const pointsDisplay = document.getElementById("points-display");
const prevMonthBtn = document.getElementById("prev-month");
const nextMonthBtn = document.getElementById("next-month");

// ---------------- Init ----------------
datePicker.value = formatDateLocal(new Date());

// ---------------- Add Habit ----------------
habitForm.addEventListener("submit", e => {
  e.preventDefault();
  const name = habitInput.value.trim();
  if (!name) return;
  data.habits.push({ id: uid(), name, archived: false });
  habitInput.value = "";
  save();
  renderAll();
});

// ---------------- Render ----------------
function renderAll() {
  const day = datePicker.value;
  renderList(day);
  renderHistory(day);
  updateCalendar();
  updatePoints();
}

function renderList(day) {
  habitList.innerHTML = "";
  data.habits.filter(h => !h.archived).forEach(h => {
    const li = document.createElement("li");

    // Done button
    const doneBtn = document.createElement("button");
    const done = !!(data.history[day] && data.history[day][h.id]);
    doneBtn.textContent = done ? "↩️" : "✅";
    doneBtn.onclick = () => toggleDone(h.id, day);
    li.appendChild(doneBtn);

    // Name (editable)
    const span = document.createElement("span");
    span.textContent = h.name;
    span.contentEditable = true;
    span.onblur = () => {
      h.name = span.textContent.trim() || h.name;
      save();
      renderHistory(day);
    };
    li.appendChild(span);

    // Edit button
    const editBtn = document.createElement("button");
    editBtn.textContent = "✏️";
    editBtn.onclick = () => {
      const newName = prompt("Edit habit:", h.name);
      if (newName) {
        h.name = newName.trim();
        save();
        renderAll();
      }
    };
    li.appendChild(editBtn);

    // Delete/archive
    const delBtn = document.createElement("button");
    delBtn.textContent = "🗑️";
    delBtn.onclick = () => deleteHabit(h.id);
    li.appendChild(delBtn);

    habitList.appendChild(li);
  });
}

function renderHistory(day) {
  historyList.innerHTML = "";
  const records = data.history[day] || {};
  Object.keys(records).forEach(habitId => {
    if (records[habitId]) {
      const li = document.createElement("li");
      const habit = data.habits.find(h => h.id === habitId);
      li.textContent = habit ? habit.name : "(deleted habit)";
      if (habit?.archived) li.classList.add("archived");
      historyList.appendChild(li);
    }
  });
}

// ---------------- Actions ----------------
function toggleDone(habitId, day) {
  if (!data.history[day]) data.history[day] = {};
  const prev = data.history[day][habitId] || false;
  data.history[day][habitId] = !prev;
  data.points += data.history[day][habitId] ? 10 : -10;
  save();
  renderAll();
}

function deleteHabit(habitId) {
  if (confirm("Delete this habit? Past history will be preserved.")) {
    const h = data.habits.find(x => x.id === habitId);
    if (h) h.archived = true;
    save();
    renderAll();
  }
}

// ---------------- Calendar ----------------
function updateCalendar() {
  calendarGrid.innerHTML = "";
  const d = new Date(datePicker.value);
  const y = d.getFullYear();
  const m = d.getMonth();
  const firstDay = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();

  monthLabel.textContent = d.toLocaleString("default", {
    month: "long",
    year: "numeric"
  });

  for (let i = 0; i < firstDay; i++) {
    calendarGrid.appendChild(document.createElement("div"));
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = formatDateLocal(new Date(y, m, day));
    const div = document.createElement("div");
    div.className = "calendar-day";
    div.textContent = day;

    const records = data.history[dateStr] || {};
    const total = Object.keys(records).length;
    const done = Object.values(records).filter(Boolean).length;

    if (total > 0) {
      if (done === total) div.classList.add("done");
      else if (done > 0) div.classList.add("partial");
      div.dataset.tooltip = `${done}/${total} habits done`;
    }

    div.onclick = () => {
      datePicker.value = dateStr;
      renderAll();
    };
    calendarGrid.appendChild(div);
  }
}

// ---------------- Points ----------------
function updatePoints() {
  pointsDisplay.textContent = `Points: ${data.points}`;
}

// ---------------- Date change ----------------
datePicker.addEventListener("change", () => renderAll());

// ---------------- Month navigation ----------------
prevMonthBtn.addEventListener("click", () => {
  const d = new Date(datePicker.value);
  d.setMonth(d.getMonth() - 1);
  datePicker.value = formatDateLocal(d);
  renderAll();
});
nextMonthBtn.addEventListener("click", () => {
  const d = new Date(datePicker.value);
  d.setMonth(d.getMonth() + 1);
  datePicker.value = formatDateLocal(d);
  renderAll();
});

// ---------------- Start ----------------
renderAll();
