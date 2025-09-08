// ---- Load or init storage ----
let data = JSON.parse(localStorage.getItem("habit-data")) || {
  habits: [],       // [{ name: "Exercise", archived: false }]
  history: {},      // { "2025-09-08": { "Exercise": true, "Read": false } }
  points: 0
};

function save() {
  localStorage.setItem("habit-data", JSON.stringify(data));
}

// ---- Add Habit ----
document.getElementById("habit-form").addEventListener("submit", e => {
  e.preventDefault();
  const name = document.getElementById("habit-input").value.trim();
  if (name && !data.habits.find(h => h.name === name)) {
    data.habits.push({ name, archived: false });
    save();
    document.getElementById("habit-input").value = "";
    renderList(datePicker.value);
  }
});

// ---- Date Picker ----
const datePicker = document.getElementById("date-picker");
datePicker.value = new Date().toISOString().split("T")[0];
datePicker.addEventListener("change", () => renderList(datePicker.value));

// ---- Render Habits for Selected Day ----
function renderList(day) {
  const ul = document.getElementById("habit-list");
  ul.innerHTML = "";

  data.habits
    .filter(h => !h.archived) // only active habits today
    .forEach((h, i) => {
      const li = document.createElement("li");

      const chk = document.createElement("input");
      chk.type = "checkbox";
      chk.checked = data.history[day]?.[h.name] || false;
      chk.onchange = () => {
        if (!data.history[day]) data.history[day] = {};
        data.history[day][h.name] = chk.checked;

        if (chk.checked) data.points += 10;
        else data.points -= 10;

        save();
        updateCalendar();
        renderHistory(day);
        updatePoints();
      };

      li.appendChild(chk);
      li.append(h.name);

      // Delete button
      const del = document.createElement("button");
      del.textContent = "🗑";
      del.onclick = () => deleteHabit(i);
      li.appendChild(del);

      ul.appendChild(li);
    });

  renderHistory(day);
  updateCalendar();
  updatePoints();
}

// ---- Delete Habit (Archive only) ----
function deleteHabit(idx) {
  if (confirm("Delete this habit? (Past history will be kept)")) {
    data.habits[idx].archived = true;
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
  Object.keys(dayRecords).forEach(habitName => {
    if (dayRecords[habitName]) {
      const li = document.createElement("li");
      li.textContent = habitName;
      li.classList.add("done");

      // check if habit is archived
      const habit = data.habits.find(h => h.name === habitName);
      if (habit && habit.archived) li.classList.add("archived");

      ul.appendChild(li);
    }
  });
}

// ---- Calendar ----
function updateCalendar() {
  const grid = document.getElementById("calendar-grid");
  grid.innerHTML = "";

  const today = new Date(datePicker.value);
  const y = today.getFullYear();
  const m = today.getMonth();
  const firstDay = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();

  for (let i = 0; i < firstDay; i++) grid.appendChild(document.createElement("div"));

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = new Date(y, m, d).toISOString().split("T")[0];
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
  document.getElementById("points-display").textContent =
    `Points: ${data.points}`;
}

// ---- Init ----
renderList(datePicker.value);
updateCalendar();
updatePoints();
