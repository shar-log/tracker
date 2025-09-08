/* Habit Tracker with Proper History + Points */

// --- Elements ---
const habitForm = document.getElementById("habit-form");
const habitInput = document.getElementById("habit-input");
const habitList = document.getElementById("habit-list");
const historyList = document.getElementById("history-list");
const datePicker = document.getElementById("date-picker");
const todayTitle = document.getElementById("today-title");
const pointsDisplay = document.getElementById("points-display");

const prevMonthBtn = document.getElementById("prev-month");
const nextMonthBtn = document.getElementById("next-month");
const monthLabel = document.getElementById("month-label");
const calendarGrid = document.getElementById("calendar-grid");

// --- Data ---
let data = JSON.parse(localStorage.getItem("habitData")) || {
  habits: [],
  history: {} // { "2025-09-08": [{id, name}] }
};

// --- Utils ---
function save() {
  localStorage.setItem("habitData", JSON.stringify(data));
}
function formatDateLocal(d) {
  return d.toISOString().split("T")[0];
}

// --- Points ---
function calculatePoints() {
  let total = 0;
  for (const day in data.history) {
    total += data.history[day].length * 10;
  }
  pointsDisplay.textContent = `Points: ${total}`;
}

// --- Render Today’s List ---
function renderList(date) {
  habitList.innerHTML = "";
  data.habits.forEach((h) => {
    const li = document.createElement("li");
    const span = document.createElement("span");
    span.textContent = h.name;

    const actions = document.createElement("div");
    actions.className = "habit-actions";

    const done = data.history[date]?.some((x) => x.id === h.id);

    const doneBtn = document.createElement("button");
    doneBtn.textContent = done ? "↩️" : "✅";
    doneBtn.title = done ? "Undo" : "Mark Done";
    doneBtn.onclick = () => toggleDone(h.id, h.name, date);

    const editBtn = document.createElement("button");
    editBtn.textContent = "✏️";
    editBtn.title = "Edit";
    editBtn.onclick = () => editHabit(h.id);

    const delBtn = document.createElement("button");
    delBtn.textContent = "🗑️";
    delBtn.title = "Delete";
    delBtn.onclick = () => deleteHabit(h.id);

    actions.append(doneBtn, editBtn, delBtn);
    li.append(span, actions);
    if (done) li.classList.add("done");

    habitList.appendChild(li);
  });
}

// --- Render History (exclude today) ---
function renderHistory(date) {
  historyList.innerHTML = "";
  const days = Object.keys(data.history).sort().reverse();
  for (const d of days) {
    if (d === date) continue; // skip today
    const title = document.createElement("h4");
    title.textContent = d;
    historyList.appendChild(title);
    const ul = document.createElement("ul");
    data.history[d].forEach((h) => {
      const li = document.createElement("li");
      li.textContent = h.name;
      ul.appendChild(li);
    });
    historyList.appendChild(ul);
  }
}

// --- Toggle Done ---
function toggleDone(id, name, date) {
  data.history[date] = data.history[date] || [];
  const idx = data.history[date].findIndex((x) => x.id === id);
  if (idx >= 0) {
    data.history[date].splice(idx, 1); // undo
  } else {
    data.history[date].push({ id, name }); // keep name in history
  }
  save();
  renderAll();
}

// --- Edit ---
function editHabit(id) {
  const habit = data.habits.find((h) => h.id === id);
  const newName = prompt("Edit habit:", habit.name);
  if (newName && newName.trim()) {
    habit.name = newName.trim();
    // also update history names
    for (const day in data.history) {
      data.history[day].forEach((h) => {
        if (h.id === id) h.name = habit.name;
      });
    }
    save();
    renderAll();
  }
}

// --- Delete ---
function deleteHabit(id) {
  if (!confirm("Delete this habit?")) return;
  data.habits = data.habits.filter((h) => h.id !== id);
  save();
  renderAll();
}

// --- Calendar ---
function renderCalendar(year, month) {
  calendarGrid.innerHTML = "";
  const label = new Date(year, month).toLocaleString("default", {
    month: "long",
    year: "numeric"
  });
  monthLabel.textContent = label;

  const firstDay = new Date(year, month, 1).getDay();
  for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement("div");
    empty.className = "calendar-day empty";
    calendarGrid.appendChild(empty);
  }

  const lastDay = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= lastDay; d++) {
    const dateStr = formatDateLocal(new Date(year, month, d));
    const div = document.createElement("div");
    div.className = "calendar-day";
    div.textContent = d;

    const total = data.habits.length;
    const done = data.history[dateStr]?.length || 0;
    if (total > 0) {
      div.title = `${done}/${total} habits done`;
      if (done === total && done > 0) div.classList.add("done");
      else if (done > 0) div.classList.add("partial");
    } else {
      div.title = "No habits";
    }

    div.onclick = () => {
      datePicker.value = dateStr;
      renderAll();
    };

    calendarGrid.appendChild(div);
  }
}

// --- Form Submit ---
habitForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = habitInput.value.trim();
  if (!name) return;
  const id = Date.now();
  data.habits.push({ id, name });
  habitInput.value = "";
  save();
  renderAll();
});

// --- Navigation ---
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

// --- Main Render ---
function renderAll() {
  const date = datePicker.value;
  todayTitle.textContent = `Habits for ${date}`;
  renderList(date);
  renderHistory(date);
  calculatePoints();
  const d = new Date(date);
  renderCalendar(d.getFullYear(), d.getMonth());
}

// --- Init ---
(function init() {
  if (!datePicker.value) datePicker.value = formatDateLocal(new Date());
  renderAll();
})();
