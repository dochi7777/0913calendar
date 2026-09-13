(function () {
  "use strict";

  const YEAR = 2026;
  const STORAGE_KEY = "dot-calendar-2026-todos";
  const monthNames = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];
  const weekdayNames = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];

  const elements = {
    grid: document.querySelector("#calendar-grid"),
    monthTitle: document.querySelector("#month-title"),
    monthNumber: document.querySelector("#month-number"),
    prevMonth: document.querySelector("#prev-month"),
    nextMonth: document.querySelector("#next-month"),
    todayButton: document.querySelector("#today-button"),
    todoTitle: document.querySelector("#todo-title"),
    dateStamp: document.querySelector("#date-stamp"),
    form: document.querySelector("#todo-form"),
    input: document.querySelector("#todo-input"),
    list: document.querySelector("#todo-list"),
    summary: document.querySelector("#todo-summary"),
    empty: document.querySelector("#empty-state"),
    clearCompleted: document.querySelector("#clear-completed"),
    template: document.querySelector("#todo-template"),
    monthProgress: document.querySelector("#month-progress")
  };

  const now = new Date();
  const initialMonth = now.getFullYear() === YEAR ? now.getMonth() : 0;
  const initialDay = now.getFullYear() === YEAR ? now.getDate() : 1;
  let visibleMonth = initialMonth;
  let selectedDate = dateKey(YEAR, initialMonth, initialDay);
  let todos = loadTodos();

  function pad(number) {
    return String(number).padStart(2, "0");
  }

  function dateKey(year, month, day) {
    return `${year}-${pad(month + 1)}-${pad(day)}`;
  }

  function parseDate(key) {
    const [year, month, day] = key.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  function loadTodos() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return saved && typeof saved === "object" ? saved : {};
    } catch (_error) {
      return {};
    }
  }

  function saveTodos() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  }

  function getDateTodos(key) {
    return Array.isArray(todos[key]) ? todos[key] : [];
  }

  function createDayCell(date, isOutside) {
    const key = dateKey(date.getFullYear(), date.getMonth(), date.getDate());
    const dayTodos = getDateTodos(key);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "day-cell";
    button.setAttribute("role", "gridcell");
    button.dataset.date = key;
    button.setAttribute("aria-label", `${date.getMonth() + 1}월 ${date.getDate()}일, 할 일 ${dayTodos.length}개`);

    if (isOutside) button.classList.add("is-outside");
    if (date.getDay() === 0) button.classList.add("sunday");
    if (date.getDay() === 6) button.classList.add("saturday");
    if (key === selectedDate) button.classList.add("is-selected");
    if (now.getFullYear() === YEAR && key === dateKey(YEAR, now.getMonth(), now.getDate())) button.classList.add("is-today");

    const number = document.createElement("span");
    number.className = "day-number";
    number.textContent = String(date.getDate());
    button.appendChild(number);

    if (dayTodos.length) {
      const preview = document.createElement("span");
      preview.className = "day-task-preview";
      dayTodos.slice(0, 2).forEach((todo) => {
        const chip = document.createElement("span");
        chip.className = `task-chip${todo.done ? " is-done" : ""}`;
        chip.textContent = todo.text;
        preview.appendChild(chip);
      });
      if (dayTodos.length > 2) {
        const more = document.createElement("span");
        more.className = "more-chip";
        more.textContent = `+${dayTodos.length - 2}개 더`;
        preview.appendChild(more);
      }
      button.appendChild(preview);
    }

    button.addEventListener("click", () => selectDate(key));
    return button;
  }

  function renderCalendar() {
    elements.grid.replaceChildren();
    elements.monthTitle.textContent = monthNames[visibleMonth];
    elements.monthNumber.textContent = pad(visibleMonth + 1);

    const firstDay = new Date(YEAR, visibleMonth, 1);
    const start = new Date(YEAR, visibleMonth, 1 - firstDay.getDay());

    for (let index = 0; index < 42; index += 1) {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      elements.grid.appendChild(createDayCell(date, date.getMonth() !== visibleMonth));
    }

    const monthPrefix = `${YEAR}-${pad(visibleMonth + 1)}`;
    const monthTodos = Object.entries(todos)
      .filter(([key]) => key.startsWith(monthPrefix))
      .flatMap(([, items]) => items);
    const doneCount = monthTodos.filter((item) => item.done).length;
    elements.monthProgress.textContent = `이번 달 ${doneCount}/${monthTodos.length}개 완료`;
  }

  function renderTodos() {
    const date = parseDate(selectedDate);
    const dayTodos = getDateTodos(selectedDate);
    const doneCount = dayTodos.filter((todo) => todo.done).length;

    elements.todoTitle.textContent = `${date.getMonth() + 1}월 ${date.getDate()}일 ${weekdayNames[date.getDay()]}`;
    elements.dateStamp.textContent = `${pad(date.getMonth() + 1)}.${pad(date.getDate())}`;
    elements.list.replaceChildren();

    dayTodos.forEach((todo) => {
      const item = elements.template.content.firstElementChild.cloneNode(true);
      const checkbox = item.querySelector(".todo-check");
      const text = item.querySelector(".todo-text");
      const deleteButton = item.querySelector(".delete-button");
      checkbox.checked = todo.done;
      checkbox.setAttribute("aria-label", `${todo.text} 완료 상태 변경`);
      text.textContent = todo.text;
      if (todo.done) item.classList.add("is-done");
      checkbox.addEventListener("change", () => toggleTodo(selectedDate, todo.id));
      deleteButton.addEventListener("click", () => deleteTodo(selectedDate, todo.id));
      elements.list.appendChild(item);
    });

    elements.empty.hidden = dayTodos.length > 0;
    elements.clearCompleted.hidden = doneCount === 0;
    elements.summary.textContent = dayTodos.length ? `${doneCount}/${dayTodos.length}개 완료` : "아직 할 일이 없어요";
  }

  function render() {
    renderCalendar();
    renderTodos();
  }

  function selectDate(key) {
    const date = parseDate(key);
    if (date.getFullYear() !== YEAR) return;
    selectedDate = key;
    visibleMonth = date.getMonth();
    render();
    elements.input.focus();
  }

  function addTodo(key, text) {
    const cleanText = String(text || "").trim();
    if (!cleanText || !/^2026-\d{2}-\d{2}$/.test(key)) throw new Error("날짜와 할 일을 확인해 주세요.");
    const date = parseDate(key);
    if (date.getFullYear() !== YEAR || dateKey(YEAR, date.getMonth(), date.getDate()) !== key) throw new Error("2026년의 유효한 날짜를 입력해 주세요.");
    const item = { id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, text: cleanText.slice(0, 80), done: false };
    todos[key] = [...getDateTodos(key), item];
    saveTodos();
    render();
    return item;
  }

  function toggleTodo(key, id) {
    const target = getDateTodos(key).find((todo) => todo.id === id);
    if (!target) throw new Error("할 일을 찾을 수 없습니다.");
    target.done = !target.done;
    saveTodos();
    render();
    return target;
  }

  function deleteTodo(key, id) {
    const before = getDateTodos(key);
    const after = before.filter((todo) => todo.id !== id);
    if (before.length === after.length) throw new Error("할 일을 찾을 수 없습니다.");
    if (after.length) todos[key] = after;
    else delete todos[key];
    saveTodos();
    render();
  }

  function moveMonth(direction) {
    visibleMonth = (visibleMonth + direction + 12) % 12;
    const selected = parseDate(selectedDate);
    const lastDay = new Date(YEAR, visibleMonth + 1, 0).getDate();
    selectedDate = dateKey(YEAR, visibleMonth, Math.min(selected.getDate(), lastDay));
    render();
  }

  elements.prevMonth.addEventListener("click", () => moveMonth(-1));
  elements.nextMonth.addEventListener("click", () => moveMonth(1));
  elements.todayButton.addEventListener("click", () => {
    const month = now.getFullYear() === YEAR ? now.getMonth() : 0;
    const day = now.getFullYear() === YEAR ? now.getDate() : 1;
    selectedDate = dateKey(YEAR, month, day);
    visibleMonth = month;
    render();
  });

  elements.form.addEventListener("submit", (event) => {
    event.preventDefault();
    addTodo(selectedDate, elements.input.value);
    elements.input.value = "";
    elements.input.focus();
  });

  elements.clearCompleted.addEventListener("click", () => {
    const remaining = getDateTodos(selectedDate).filter((todo) => !todo.done);
    if (remaining.length) todos[selectedDate] = remaining;
    else delete todos[selectedDate];
    saveTodos();
    render();
  });

  function registerWebMcpTools() {
    const context = document.modelContext;
    if (!context || typeof context.registerTool !== "function") return;
    const tools = [
      {
        name: "list_calendar_todos",
        title: "할 일 목록 보기",
        description: "2026년의 날짜별 할 일과 완료 상태를 확인합니다.",
        inputSchema: { type: "object", properties: { date: { type: "string", pattern: "^2026-\\d{2}-\\d{2}$" } }, additionalProperties: false },
        annotations: { readOnlyHint: true, untrustedContentHint: true },
        execute(input) {
          if (input && input.date) return { date: input.date, todos: getDateTodos(input.date) };
          return { todos };
        }
      },
      {
        name: "add_calendar_todo",
        title: "할 일 추가",
        description: "2026년의 지정한 날짜에 새 할 일을 추가합니다.",
        inputSchema: { type: "object", properties: { date: { type: "string", pattern: "^2026-\\d{2}-\\d{2}$" }, text: { type: "string", minLength: 1, maxLength: 80 } }, required: ["date", "text"], additionalProperties: false },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute(input) {
          const item = addTodo(input.date, input.text);
          selectDate(input.date);
          return { date: input.date, todo: item };
        }
      },
      {
        name: "set_calendar_todo_completion",
        title: "할 일 완료 상태 변경",
        description: "할 일을 완료 또는 미완료 상태로 바꿉니다.",
        inputSchema: { type: "object", properties: { date: { type: "string" }, id: { type: "string" }, done: { type: "boolean" } }, required: ["date", "id", "done"], additionalProperties: false },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute(input) {
          const item = getDateTodos(input.date).find((todo) => todo.id === input.id);
          if (!item) throw new Error("할 일을 찾을 수 없습니다.");
          item.done = input.done;
          saveTodos();
          render();
          return { date: input.date, todo: item };
        }
      }
    ];
    tools.forEach((tool) => {
      try { void Promise.resolve(context.registerTool(tool)).catch(() => {}); } catch (_error) {}
    });
  }

  render();
  registerWebMcpTools();
})();
