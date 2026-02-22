const todoForm = document.getElementById("todo-form");
const todoInput = document.getElementById("todo-input");
const todoList = document.getElementById("todo-list");
const todoCount = document.getElementById("todo-count");
const todoStatus = document.getElementById("todo-status");

let todos = [];

const setStatus = (message, isError = false) => {
  todoStatus.textContent = message;
  todoStatus.className = isError ? "text-red-400" : "text-emerald-400";
  if (message) {
    setTimeout(() => {
      todoStatus.textContent = "";
      todoStatus.className = "";
    }, 2000);
  }
};

const renderTodos = () => {
  todoCount.textContent = `${todos.length} todo${todos.length === 1 ? "" : "s"}`;
  if (todos.length === 0) {
    todoList.innerHTML = `
      <div class="rounded-2xl border border-dashed border-slate-800 p-6 text-center text-sm text-slate-400">
        No todos yet. Add your first task above.
      </div>
    `;
    return;
  }

  todoList.innerHTML = todos
    .map(
      (todo) => `
        <article class="flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
          <label class="flex items-center gap-3 text-sm text-slate-100">
            <input
              type="checkbox"
              data-id="${todo.id}"
              ${todo.completed ? "checked" : ""}
              class="h-4 w-4 rounded border-slate-600 bg-slate-950 text-indigo-500 focus:ring-indigo-400"
            />
            <span class="${todo.completed ? "line-through text-slate-500" : ""}">
              ${todo.title}
            </span>
          </label>
          <button
            data-delete-id="${todo.id}"
            class="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-300 transition hover:border-red-400 hover:text-red-300"
          >
            Delete
          </button>
        </article>
      `
    )
    .join("");
};

const fetchTodos = async () => {
  try {
    const response = await fetch("/api/todos");
    if (!response.ok) {
      throw new Error("Failed to fetch todos");
    }
    todos = await response.json();
    renderTodos();
  } catch (error) {
    setStatus("Could not load todos", true);
  }
};

const createTodo = async (title) => {
  const response = await fetch("/api/todos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title })
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || "Failed to create todo");
  }

  return response.json();
};

const updateTodo = async (id, updates) => {
  const response = await fetch(`/api/todos/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates)
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || "Failed to update todo");
  }

  return response.json();
};

const deleteTodo = async (id) => {
  const response = await fetch(`/api/todos/${id}`, {
    method: "DELETE"
  });

  if (!response.ok && response.status !== 204) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || "Failed to delete todo");
  }
};

todoForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const title = todoInput.value.trim();
  if (!title) {
    setStatus("Title cannot be empty", true);
    return;
  }

  try {
    const newTodo = await createTodo(title);
    todos = [newTodo, ...todos];
    todoInput.value = "";
    renderTodos();
    setStatus("Todo added");
  } catch (error) {
    setStatus(error.message, true);
  }
});

todoList.addEventListener("change", async (event) => {
  const target = event.target;
  if (!target.matches("input[type='checkbox']")) {
    return;
  }

  const id = Number(target.dataset.id);
  const todo = todos.find((item) => item.id === id);
  if (!todo) {
    return;
  }

  try {
    const updated = await updateTodo(id, { completed: !todo.completed });
    todos = todos.map((item) => (item.id === id ? updated : item));
    renderTodos();
  } catch (error) {
    setStatus(error.message, true);
  }
});

todoList.addEventListener("click", async (event) => {
  const target = event.target;
  if (!target.matches("button[data-delete-id]")) {
    return;
  }

  const id = Number(target.dataset.deleteId);
  try {
    await deleteTodo(id);
    todos = todos.filter((item) => item.id !== id);
    renderTodos();
    setStatus("Todo deleted");
  } catch (error) {
    setStatus(error.message, true);
  }
});

fetchTodos();
