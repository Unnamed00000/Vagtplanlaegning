const monthNames = [
  "январь",
  "февраль",
  "март",
  "апрель",
  "май",
  "июнь",
  "июль",
  "август",
  "сентябрь",
  "октябрь",
  "ноябрь",
  "декабрь"
];

const weekdayLabels = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const colors = ["gold", "rose", "teal", "violet"];
const storageKey = "smartplan-pwa-month-shifts-v2";
const approvalKey = "smartplan-pwa-month-approved-v2";

const monthGrid = document.querySelector("#monthGrid");
const monthRange = document.querySelector("#monthRange");
const dateInput = document.querySelector("#dateInput");
const shiftForm = document.querySelector("#shiftForm");
const approveButton = document.querySelector("#approveButton");
const resetButton = document.querySelector("#resetButton");
const prevMonthButton = document.querySelector("#prevMonthButton");
const nextMonthButton = document.querySelector("#nextMonthButton");
const todayButton = document.querySelector("#todayButton");
const installButton = document.querySelector("#installButton");
const shiftCount = document.querySelector("#shiftCount");
const hourCount = document.querySelector("#hourCount");
const statusText = document.querySelector("#statusText");
const toast = document.querySelector("#toast");

let deferredInstallPrompt = null;
let viewedDate = new Date();
viewedDate.setDate(1);
let shifts = loadShifts();
let approved = localStorage.getItem(approvalKey) === "true";

function loadShifts() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(shifts));
  localStorage.setItem(approvalKey, String(approved));
}

function renderPlanner() {
  const year = viewedDate.getFullYear();
  const month = viewedDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const gridStart = new Date(year, month, 1 - startOffset);
  const todayKey = toDateKey(new Date());

  monthRange.textContent = `${monthNames[month]} ${year}`;
  dateInput.value = isSameMonth(new Date(dateInput.value || todayKey), viewedDate)
    ? dateInput.value || todayKey
    : toDateKey(firstDay);
  monthGrid.innerHTML = "";

  weekdayLabels.forEach((label) => {
    const header = document.createElement("div");
    header.className = "weekday";
    header.textContent = label;
    monthGrid.appendChild(header);
  });

  for (let i = 0; i < 42; i += 1) {
    const cellDate = new Date(gridStart);
    cellDate.setDate(gridStart.getDate() + i);
    monthGrid.appendChild(createDayCell(cellDate, month, todayKey));
  }

  updateSummary();
}

function createDayCell(cellDate, activeMonth, todayKey) {
  const dateKey = toDateKey(cellDate);
  const cell = document.createElement("article");
  cell.className = "month-day";
  cell.dataset.date = dateKey;

  if (cellDate.getMonth() !== activeMonth) {
    cell.classList.add("is-muted");
  }

  if (dateKey === todayKey) {
    cell.classList.add("is-today");
  }

  cell.innerHTML = `
    <button class="day-number" type="button" aria-label="Выбрать ${formatDateForLabel(cellDate)}">
      ${cellDate.getDate()}
    </button>
    <div class="day-shifts"></div>
  `;

  cell.querySelector(".day-number").addEventListener("click", () => {
    dateInput.value = dateKey;
    dateInput.focus();
  });

  const list = cell.querySelector(".day-shifts");
  const dayShifts = shifts
    .filter((shift) => shift.date === dateKey)
    .sort((a, b) => a.start.localeCompare(b.start));

  dayShifts.slice(0, 3).forEach((shift) => list.appendChild(createShiftCard(shift)));

  if (dayShifts.length === 0) {
    for (let i = 0; i < 2; i += 1) {
      const emptySlot = document.createElement("div");
      emptySlot.className = "empty-day-slot";
      list.appendChild(emptySlot);
    }
  }

  if (dayShifts.length > 3) {
    const more = document.createElement("p");
    more.className = "more-shifts";
    more.textContent = `+${dayShifts.length - 3} еще`;
    list.appendChild(more);
  }

  return cell;
}

function createShiftCard(shift) {
  const card = document.createElement("div");
  card.className = "shift-card";
  card.dataset.color = shift.color;
  card.innerHTML = `
    <button class="delete-shift" type="button" aria-label="Удалить смену ${escapeHtml(shift.name)}">×</button>
    <div class="shift-time">${shift.start} - ${shift.end}</div>
    <div class="shift-person">
      <span class="avatar">${escapeHtml(shift.name.charAt(0).toUpperCase())}</span>
      <span>${escapeHtml(shift.name)}</span>
    </div>
  `;

  card.querySelector(".delete-shift").addEventListener("click", () => {
    shifts = shifts.filter((item) => item.id !== shift.id);
    approved = false;
    saveState();
    renderPlanner();
    showToast("Смена удалена");
  });

  return card;
}

function updateSummary() {
  const visibleShifts = shifts.filter((shift) => isDateInViewedMonth(shift.date));
  const hours = visibleShifts.reduce((sum, shift) => sum + getDuration(shift.start, shift.end), 0);
  shiftCount.textContent = visibleShifts.length;
  hourCount.textContent = hours.toLocaleString("ru-RU", { maximumFractionDigits: 1 });
  statusText.textContent = approved ? "Готово" : "Черновик";
}

function isDateInViewedMonth(dateKey) {
  const date = new Date(`${dateKey}T00:00:00`);
  return isSameMonth(date, viewedDate);
}

function isSameMonth(date, monthDate) {
  return date.getFullYear() === monthDate.getFullYear() && date.getMonth() === monthDate.getMonth();
}

function getDuration(start, end) {
  const [startHour, startMinute] = start.split(":").map(Number);
  const [endHour, endMinute] = end.split(":").map(Number);
  const startValue = startHour + startMinute / 60;
  let endValue = endHour + endMinute / 60;

  if (endValue <= startValue) {
    endValue += 24;
  }

  return endValue - startValue;
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateForLabel(date) {
  return `${date.getDate()} ${monthNames[date.getMonth()]} ${date.getFullYear()}`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    };
    return entities[char];
  });
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 2400);
}

shiftForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(shiftForm);
  const name = String(data.get("name")).trim();
  const date = String(data.get("date"));
  const start = String(data.get("start"));
  const end = String(data.get("end"));

  if (!name || !date || !start || !end) {
    showToast("Заполните все поля");
    return;
  }

  shifts.push({
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    date,
    start,
    end,
    name,
    color: colors[shifts.length % colors.length]
  });

  viewedDate = new Date(`${date}T00:00:00`);
  viewedDate.setDate(1);
  approved = false;
  saveState();
  renderPlanner();
  showToast("Смена добавлена");
});

approveButton.addEventListener("click", () => {
  approved = true;
  saveState();
  updateSummary();
  showToast("Месячный график подтвержден и сохранен офлайн");
});

resetButton.addEventListener("click", () => {
  shifts = [];
  approved = false;
  saveState();
  renderPlanner();
  showToast("Календарь очищен");
});

prevMonthButton.addEventListener("click", () => {
  viewedDate.setMonth(viewedDate.getMonth() - 1);
  renderPlanner();
});

nextMonthButton.addEventListener("click", () => {
  viewedDate.setMonth(viewedDate.getMonth() + 1);
  renderPlanner();
});

todayButton.addEventListener("click", () => {
  viewedDate = new Date();
  viewedDate.setDate(1);
  dateInput.value = toDateKey(new Date());
  renderPlanner();
});

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  installButton.hidden = false;
});

installButton.addEventListener("click", async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  installButton.hidden = true;
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {
      showToast("Service worker не зарегистрирован");
    });
  });
}

dateInput.value = toDateKey(new Date());
renderPlanner();
