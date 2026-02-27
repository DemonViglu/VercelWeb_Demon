(async function () {
  const STORAGE_KEY = "demon_todolist_v1";
  const app = document.getElementById("todo-app");
  if (!app) return;

  const form = document.getElementById("todo-form");
  const listEl = document.getElementById("todo-list");
  const sortByDeadlineBtn = document.getElementById("todo-sort-deadline");
  const sortByCreatedBtn = document.getElementById("todo-sort-created");
  const filterEl = document.getElementById("todo-filter");
  const searchEl = document.getElementById("todo-search");
  const dialogEl = document.getElementById("todo-dialog");
  const openBtn = document.getElementById("todo-open");
  const closeBtn = document.getElementById("todo-close");
  const cancelBtn = document.getElementById("todo-cancel");
  const exportBtn = document.getElementById("todo-export");
  const importBtn = document.getElementById("todo-import-btn");
  const importInput = document.getElementById("todo-import");

  let sortMode = "deadline";
  let filterMode = "all";
  let searchQuery = "";
  let editingTaskId = null;
  let tasks = [];

  function openDialog() {
    if (!dialogEl) return;
    if (typeof dialogEl.showModal === "function") {
      if (!dialogEl.open) dialogEl.showModal();
    } else {
      dialogEl.classList.add("todo-dialog--open");
    }
    const titleInput = document.getElementById("todo-title");
    if (titleInput) titleInput.focus();
  }

  function closeDialog() {
    if (!dialogEl) return;
    if (typeof dialogEl.close === "function" && dialogEl.open) {
      dialogEl.close();
    }
    dialogEl.classList.remove("todo-dialog--open");
  }

  function generateId() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
    return `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  }

  function createLocalStorageAdapter(key) {
    return {
      async load() {
        try {
          const raw = localStorage.getItem(key);
          if (!raw) return [];
          const parsed = JSON.parse(raw);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      },
      async save(nextTasks) {
        localStorage.setItem(key, JSON.stringify(nextTasks));
      },
    };
  }

  // Future: replace this adapter with a server-backed implementation.
  // e.g. createHttpAdapter({ baseUrl, tokenProvider, ... })
  const storageAdapter = createLocalStorageAdapter(STORAGE_KEY);

  async function saveTasks() {
    await storageAdapter.save(tasks);
  }

  function normalizeImportedTask(raw, now) {
    if (!raw || typeof raw !== "object") return null;

    const title = String(raw.title || "").trim();
    const due = parseIso(raw.dueAt);
    if (!title || !due) return null;

    const type = raw.type === "daily" ? "daily" : "oneoff";
    const start = parseIso(raw.startAt);
    const created = parseIso(raw.createdAt) || now;
    const completed = parseIso(raw.completedAt);

    const note = String(raw.note || "").trim();
    const tags = Array.isArray(raw.tags)
      ? raw.tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 12)
      : parseTagsInput(String(raw.tags || ""));

    const id = String(raw.id || "").trim() || generateId();

    const task = {
      id,
      title,
      note,
      tags,
      type,
      startAt: start ? start.toISOString() : null,
      dueAt: due.toISOString(),
      createdAt: created.toISOString(),
      completedAt: completed ? completed.toISOString() : null,
      checkins: {},
    };

    if (type === "daily") {
      const checkins = raw.checkins && typeof raw.checkins === "object" ? raw.checkins : {};
      const next = {};
      for (const [key, value] of Object.entries(checkins)) {
        const k = String(key);
        const v = parseIso(value);
        if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(k) || !v) continue;
        next[k] = v.toISOString();
      }
      task.checkins = next;
      pruneCheckinsToRange(task);
    }

    return task;
  }

  function normalizeTasksArray(rawTasks) {
    const now = new Date();
    const normalized = [];
    const usedIds = new Set();
    const list = Array.isArray(rawTasks) ? rawTasks : [];
    for (const raw of list) {
      const task = normalizeImportedTask(raw, now);
      if (!task) continue;
      if (usedIds.has(task.id)) task.id = generateId();
      usedIds.add(task.id);
      normalized.push(task);
    }
    return normalized;
  }

  function exportTasksToFile() {
    const payload = {
      schema: "demon_todolist",
      version: 1,
      exportedAt: new Date().toISOString(),
      tasks,
    };

    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    const date = new Date();
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    a.href = url;
    a.download = `todolist-backup-${yyyy}${mm}${dd}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function importTasksFromFile(file) {
    if (!file) return;
    const text = await file.text();

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      alert("导入失败：JSON 格式不正确");
      return;
    }

    const rawTasks = Array.isArray(parsed) ? parsed : parsed && Array.isArray(parsed.tasks) ? parsed.tasks : null;
    if (!rawTasks) {
      alert("导入失败：文件里没有 tasks 数组");
      return;
    }

    const normalized = normalizeTasksArray(rawTasks);
    tasks = normalized;
    editingTaskId = null;
    await saveTasks();
    renderTasks();
    alert(`导入完成：${normalized.length} 条任务（已覆盖本地数据）`);
  }

  function parseTagsInput(raw) {
    const text = String(raw || "");
    if (!text.trim()) return [];
    const parts = text
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const unique = [];
    for (const tag of parts) {
      if (unique.includes(tag)) continue;
      unique.push(tag);
      if (unique.length >= 12) break;
    }
    return unique;
  }

  function joinTags(tags) {
    if (!Array.isArray(tags) || !tags.length) return "";
    return tags.join(", ");
  }

  function toISODate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function parseInputDateTime(value) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function parseIso(iso) {
    if (!iso) return null;
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function toDateTimeLocalValue(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hour = String(date.getHours()).padStart(2, "0");
    const minute = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hour}:${minute}`;
  }

  function startOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function dayDiffInclusive(fromDate, toDate) {
    const msPerDay = 24 * 60 * 60 * 1000;
    const diff = Math.floor((startOfDay(toDate) - startOfDay(fromDate)) / msPerDay);
    return diff >= 0 ? diff + 1 : 0;
  }

  function effectiveStart(task) {
    return parseIso(task.startAt) || parseIso(task.createdAt);
  }

  function calcDailyProgress(task, now) {
    const start = effectiveStart(task);
    const due = parseIso(task.dueAt);
    if (!start || !due) {
      return { expected: 0, checked: 0, total: 0, rangeStarted: false, ended: false, success: false };
    }

    const rangeStarted = now >= startOfDay(start);
    const ended = now > due;
    const capDate = now < due ? now : due;
    const expected = rangeStarted ? dayDiffInclusive(start, capDate) : 0;
    const total = dayDiffInclusive(start, due);
    const checked = Object.keys(task.checkins || {}).length;
    const success = ended && checked >= total;

    return { expected, checked, total, rangeStarted, ended, success };
  }

  function getStatusCategory(task, now) {
    const due = parseIso(task.dueAt);
    const completedAt = parseIso(task.completedAt);

    if (task.type === "oneoff") {
      if (completedAt) return "completed";
      if (due && now > due) return "overdue";
      return "active";
    }

    const progress = calcDailyProgress(task, now);
    if (progress.success) return "completed";
    if (progress.ended && !progress.success) return "ended_failed";
    return "active";
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function statusText(task, now) {
    const category = getStatusCategory(task, now);
    if (task.type === "oneoff") {
      if (category === "completed") return "已完成";
      if (category === "overdue") return "已逾期";
      return "进行中";
    }

    const progress = calcDailyProgress(task, now);
    if (category === "completed") return "已完成";
    if (category === "ended_failed") return "已结束（漏打卡）";
    return `进行中（${progress.checked}/${progress.expected}）`;
  }

  function statusBadgeLabel(category) {
    if (category === "completed") return "已完成";
    if (category === "overdue") return "已逾期";
    if (category === "ended_failed") return "漏打卡";
    return "进行中";
  }

  function canCheckinToday(task, now) {
    if (task.type !== "daily") return false;
    const due = parseIso(task.dueAt);
    if (!due || now > due) return false;
    const start = effectiveStart(task);
    if (!start) return false;
    if (startOfDay(now) < startOfDay(start)) return false;
    const todayKey = toISODate(now);
    return !(task.checkins && task.checkins[todayKey]);
  }

  function hasTodayCheckin(task, now) {
    if (task.type !== "daily") return false;
    const todayKey = toISODate(now);
    return Boolean(task.checkins && task.checkins[todayKey]);
  }

  function pruneCheckinsToRange(task) {
    if (task.type !== "daily") return;
    const start = effectiveStart(task);
    const due = parseIso(task.dueAt);
    if (!start || !due) return;

    const startDay = startOfDay(start);
    const dueDay = startOfDay(due);
    const next = {};
    const checkins = task.checkins || {};
    for (const [key, value] of Object.entries(checkins)) {
      const d = new Date(`${key}T00:00:00`);
      if (!Number.isNaN(d.getTime()) && d >= startDay && d <= dueDay) {
        next[key] = value;
      }
    }
    task.checkins = next;
  }

  function isTaskVisible(task, now) {
    if (filterMode && filterMode !== "all") {
      if (getStatusCategory(task, now) !== filterMode) return false;
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const title = String(task.title || "").toLowerCase();
      const note = String(task.note || "").toLowerCase();
      const tags = Array.isArray(task.tags) ? task.tags.join(" ").toLowerCase() : "";
      if (!title.includes(q) && !note.includes(q) && !tags.includes(q)) return false;
    }

    return true;
  }

  function renderTasks() {
    const now = new Date();
    const sorted = [...tasks].sort((a, b) => {
      if (sortMode === "created") {
        return new Date(b.createdAt) - new Date(a.createdAt);
      }
      return new Date(a.dueAt) - new Date(b.dueAt);
    });

    const filtered = sorted.filter((t) => isTaskVisible(t, now));

    if (!filtered.length) {
      listEl.innerHTML = '<p class="todo-empty">没有匹配的任务。</p>';
      return;
    }

    listEl.innerHTML = filtered
      .map((task) => {
        const start = task.startAt ? new Date(task.startAt).toLocaleString() : "未设置";
        const due = new Date(task.dueAt).toLocaleString();
        const created = new Date(task.createdAt).toLocaleString();
        const status = statusText(task, now);
        const statusCategory = getStatusCategory(task, now);
        const checkinEnabled = canCheckinToday(task, now);
        const canUndoToday = hasTodayCheckin(task, now);
        const typeName = task.type === "oneoff" ? "完成即截止" : "每日打卡";
        const note = String(task.note || "").trim();
        const tags = Array.isArray(task.tags) ? task.tags : [];

        const tagsHtml = tags.length
          ? `<div class="todo-tags">${tags
              .map((t) => `<span class="todo-tag">${escapeHtml(t)}</span>`)
              .join("")}</div>`
          : "";

        if (editingTaskId === task.id) {
          const startDraft = task.startAt ? toDateTimeLocalValue(new Date(task.startAt)) : "";
          const dueDraft = toDateTimeLocalValue(new Date(task.dueAt));
          const tagsDraft = joinTags(tags);
          return `
            <article class="todo-item todo-item--editing" data-id="${task.id}">
              <header class="todo-item-header">
                <h3>编辑任务</h3>
                <span class="todo-badge" data-status="${statusCategory}">${statusBadgeLabel(statusCategory)}</span>
              </header>
              <div class="todo-edit-grid">
                <div class="todo-field">
                  <label>任务名称</label>
                  <input type="text" data-field="title" value="${escapeHtml(task.title)}" maxlength="80" />
                </div>
                <div class="todo-field">
                  <label>标签（逗号分隔）</label>
                  <input type="text" data-field="tags" value="${escapeHtml(tagsDraft)}" maxlength="120" />
                </div>
                <div class="todo-field">
                  <label>任务类型</label>
                  <select data-field="type">
                    <option value="oneoff" ${task.type === "oneoff" ? "selected" : ""}>完成即截止</option>
                    <option value="daily" ${task.type === "daily" ? "selected" : ""}>每日打卡</option>
                  </select>
                </div>
                <div class="todo-field todo-field--full">
                  <label>备注</label>
                  <textarea data-field="note" rows="3" maxlength="400">${escapeHtml(note)}</textarea>
                </div>
                <div class="todo-field">
                  <label>开始时间（可选）</label>
                  <input type="datetime-local" data-field="start" value="${startDraft}" />
                </div>
                <div class="todo-field">
                  <label>截止时间（必填）</label>
                  <input type="datetime-local" data-field="due" value="${dueDraft}" required />
                </div>
              </div>
              <div class="todo-actions">
                <button type="button" data-action="save">保存</button>
                <button type="button" data-action="cancel">取消</button>
              </div>
            </article>
          `;
        }

        return `
          <article class="todo-item" data-id="${task.id}" data-status="${statusCategory}">
            <header class="todo-item-header">
              <div class="todo-item-title">
                <h3>${escapeHtml(task.title)}</h3>
                <span class="todo-meta">${typeName}</span>
              </div>
              <span class="todo-badge" data-status="${statusCategory}">${statusBadgeLabel(statusCategory)}</span>
            </header>
            ${tagsHtml}
            ${note ? `<p class="todo-note">${escapeHtml(note)}</p>` : ""}
            <div class="todo-kv">
              <div><span>状态</span><span>${status}</span></div>
              <div><span>开始</span><span>${start}</span></div>
              <div><span>截止</span><span>${due}</span></div>
              <div><span>创建</span><span>${created}</span></div>
            </div>
            <div class="todo-actions">
              <button type="button" data-action="edit">编辑</button>
              ${
                task.type === "oneoff" && !task.completedAt
                  ? '<button type="button" data-action="complete">完成</button>'
                  : ""
              }
              ${
                task.type === "daily"
                  ? checkinEnabled
                    ? '<button type="button" data-action="checkin">今日打卡</button>'
                    : canUndoToday
                      ? '<button type="button" data-action="uncheckin">撤回今日打卡</button>'
                      : '<button type="button" data-action="checkin" disabled>不在可打卡时间</button>'
                  : ""
              }
              <button type="button" data-action="delete">删除</button>
            </div>
          </article>
        `;
      })
      .join("");
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const title = String(formData.get("title") || "").trim();
    const type = String(formData.get("type") || "oneoff");
    const start = parseInputDateTime(String(formData.get("start") || ""));
    const due = parseInputDateTime(String(formData.get("due") || ""));
    const note = String(formData.get("note") || "").trim();
    const tags = parseTagsInput(String(formData.get("tags") || ""));

    if (!title || !due) return;
    if (start && due < start) {
      alert("截止时间不能早于开始时间");
      return;
    }

    const now = new Date();
    tasks.push({
      id: generateId(),
      title,
      note,
      tags,
      type: type === "daily" ? "daily" : "oneoff",
      startAt: start ? start.toISOString() : null,
      dueAt: due.toISOString(),
      createdAt: now.toISOString(),
      completedAt: null,
      checkins: {},
    });

    await saveTasks();
    form.reset();
    closeDialog();
    renderTasks();
  });

  listEl.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const button = target.closest("button[data-action]");
    if (!button) return;

    const action = button.getAttribute("data-action");
    const item = button.closest(".todo-item");
    if (!item) return;
    const id = item.getAttribute("data-id");
    if (!id) return;

    const index = tasks.findIndex((task) => task.id === id);
    if (index < 0) return;

    const now = new Date();
    const task = tasks[index];

    if (action === "delete") {
      const title = String(task.title || "").trim();
      const ok = confirm(title ? `确定删除任务「${title}」吗？` : "确定删除该任务吗？");
      if (!ok) return;

      tasks.splice(index, 1);
      if (editingTaskId === id) editingTaskId = null;
    } else if (action === "edit") {
      editingTaskId = id;
    } else if (action === "cancel") {
      editingTaskId = null;
    } else if (action === "save") {
      const itemEl = button.closest(".todo-item");
      if (!itemEl) return;

      const titleInput = itemEl.querySelector("[data-field='title']");
      const tagsInput = itemEl.querySelector("[data-field='tags']");
      const typeSelect = itemEl.querySelector("[data-field='type']");
      const noteInput = itemEl.querySelector("[data-field='note']");
      const startInput = itemEl.querySelector("[data-field='start']");
      const dueInput = itemEl.querySelector("[data-field='due']");

      const titleValue = String(titleInput && "value" in titleInput ? titleInput.value : "").trim();
      const tagsValue = String(tagsInput && "value" in tagsInput ? tagsInput.value : "");
      const typeValue = String(typeSelect && "value" in typeSelect ? typeSelect.value : task.type);
      const noteValue = String(noteInput && "value" in noteInput ? noteInput.value : "").trim();
      const startValue = String(startInput && "value" in startInput ? startInput.value : "");
      const dueValue = String(dueInput && "value" in dueInput ? dueInput.value : "");

      const startDt = parseInputDateTime(startValue);
      const dueDt = parseInputDateTime(dueValue);

      if (!titleValue || !dueDt) return;
      if (startDt && dueDt < startDt) {
        alert("截止时间不能早于开始时间");
        return;
      }

      const nextType = typeValue === "daily" ? "daily" : "oneoff";
      if (task.type !== nextType) {
        if (nextType === "daily") {
          task.checkins = {};
          task.completedAt = null;
        } else {
          task.checkins = {};
        }
        task.type = nextType;
      }

      task.title = titleValue;
      task.tags = parseTagsInput(tagsValue);
      task.note = noteValue;
      task.startAt = startDt ? startDt.toISOString() : null;
      task.dueAt = dueDt.toISOString();
      pruneCheckinsToRange(task);
      editingTaskId = null;
    } else if (action === "complete" && task.type === "oneoff" && !task.completedAt) {
      task.completedAt = now.toISOString();
    } else if (action === "checkin" && canCheckinToday(task, now)) {
      const today = toISODate(now);
      task.checkins = task.checkins || {};
      task.checkins[today] = now.toISOString();
    } else if (action === "uncheckin" && hasTodayCheckin(task, now)) {
      const today = toISODate(now);
      if (task.checkins) delete task.checkins[today];
    }

    await saveTasks();
    renderTasks();
  });

  sortByDeadlineBtn.addEventListener("click", () => {
    sortMode = "deadline";
    renderTasks();
  });

  sortByCreatedBtn.addEventListener("click", () => {
    sortMode = "created";
    renderTasks();
  });

  if (filterEl) {
    filterEl.addEventListener("change", () => {
      filterMode = String(filterEl.value || "all");
      editingTaskId = null;
      renderTasks();
    });
  }

  if (searchEl) {
    searchEl.addEventListener("input", () => {
      searchQuery = String(searchEl.value || "").trim();
      editingTaskId = null;
      renderTasks();
    });
  }

  if (openBtn) {
    openBtn.addEventListener("click", () => {
      openDialog();
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      closeDialog();
    });
  }

  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
      closeDialog();
    });
  }

  if (dialogEl) {
    dialogEl.addEventListener("click", (event) => {
      if (event.target === dialogEl) {
        closeDialog();
      }
    });
  }

  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      exportTasksToFile();
    });
  }

  if (importBtn && importInput) {
    importBtn.addEventListener("click", () => {
      if (!confirm("导入会覆盖当前所有任务，确定继续？")) return;
      importInput.value = "";
      importInput.click();
    });

    importInput.addEventListener("change", async () => {
      const file = importInput.files && importInput.files[0];
      if (!file) return;
      await importTasksFromFile(file);
    });
  }

  tasks = normalizeTasksArray(await storageAdapter.load());
  await saveTasks();
  renderTasks();
})();