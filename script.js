// ---- Helpers ----
function formatDateLocal(date) {
  const d = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return d.toISOString().split("T")[0];
}

function uid() {
  return "_" + Math.random().toString(36).substr(2, 9);
}

// ---- Load or init storage ----
let data = JSON.parse(localStorage.getItem("habit-data")) || {
  habits: [],    // [{ id, name, archived }]
  history: {},   // { "2025-09-08": { "_abc123": true, "_def456": false } }
  points: 0
};

function save() {
  localStorage.setItem("habit-data", JSON.stringify(data));
}

// ---- Add Habit ----
const habitForm = document.getElementById("habit-form");
const habitInput = document.getElementById("habit-input");

habitForm.addEventListener("submit", e => {
  e.preventDefault();
  const name = habitInput.value.trim();
  if (name) {
    data.habits.push({ id: uid(), name, archived: false });
    save();
    habitInput.value = "";
    renderList(datePicker.value);
  }
});

// ---- Date Picker ----
const datePicker = document.getElementById("date-picker");
datePicker.value = formatDateLocal(new Date());
datePicker.addEventListener("change", () => renderList(datePicker.value));

// ---- Render Habits for Selected Day ----
function renderList(day) {
  const ul = document.getElementById("habit-list");
  ul.innerHTML = "";

  data.habits.filter(h => !h.archived).forEach(h => {
    const li = document.createElement("li");

    const chk = document.createElement("input");
    chk.type = "checkbox";
    chk.checked = data.history[day]?.[h.id] || false;
    chk.onchange = () => {
      if (!data.history[day]) data.history[day] = {};
      data.history[day][h.id] = chk.checked;
      data.points += chk.checked ? 10 : -10;
      save();
      updateCalendar();
      renderHistory(day);
      updatePoints();
    };
    li.appendChild(chk);

    // Habit name (editable)
    const span = document.createElement("span");
    span.textContent = h.name;
    span.contentEditable = true;
    span.onblur = () => {
      h.name = span.textContent.trim() || h.name;
      save();
      renderHistory(day);
    };
    li.appendChild(span);

    // Delete/archive
    const del = document.createElement("button");
    del.textContent = "🗑";
    del.onclick = () => deleteHabit(h.id);
    li.appendChild(del);

    ul.appendChild(li);
  });

  renderHistory(day);
  updateCalendar();
  updatePoints();
}

// ---- Delete Habit (archive only) ----
function deleteHabit(habitId) {
  if (confirm("Delete this habit? (Past history will be kept)")) {
    const habit = data.habits.find(h => h.id === habitId);
    if (habit) habit.archived = true;
    save();
    renderList(datePicker.value);
    renderHistory(datePicker.value);
    updateCalendar();
  }
}

// ---- Render History ----
function renderHistory(day) {
  const ul = document.getElementById("history-list");
  ul.innerHTML = "";

  const dayRecords = data.history[day] || {};
  Object.keys(dayRecords).forEach(habitId => {
    if (dayRecords[habitId]) {
      const li = document.createElement("li");
      const habit = data.habits.find(h => h.id === habitId);
      li.textContent = habit ? habit.name : "(deleted habit)";
      li.classList.add("done");
      if (habit?.archived) li.classList.add("archived");
      ul.appendChild(li);
    }
  });
}

// ---- Calendar ----
function updateCalendar() {
  const grid = document.getElementById("calendar-grid");
  const monthLabel = document.getElementById("month-label");

  grid.innerHTML = "";
  const today = new Date(datePicker.value);
  const y = today.getFullYear();
  const m = today.getMonth();
  const firstDay = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();

  monthLabel.textContent = today.toLocaleString("default", {
    month: "long",
    year: "numeric"
  });

  for (let i = 0; i < firstDay; i++) grid.appendChild(document.createElement("div"));

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = formatDateLocal(new Date(y, m, d));
    const div = document.createElement("div");
    div.className = "calendar-day";
    div.textContent = d;

    const dayRecords = data.history[dateStr] || {};
    const totalCount = Object.keys(dayRecords).length;
    const doneCount = Object.values(dayRecords).filter(v => v).length;

    if (totalCount > 0) {
      if (doneCount === totalCount) {
        div.classList.add("done");
        div.dataset.tooltip = `${doneCount}/${totalCount} habits done`;
      } else if (doneCount > 0) {
        div.classList.add("partial");
        div.dataset.tooltip = `${doneCount}/${totalCount} habits done`;
      } else {
        div.dataset.tooltip = `0/${totalCount} habits done`;
      }
    }

    grid.appendChild(div);
  }
}

// ---- Points ----
function updatePoints() {
  document.getElementById("points-display").textContent = `Points: ${data.points}`;
}

// ---- Init ----
renderList(datePicker.value);
updateCalendar();
updatePoints();
