// Demon TodoList 主逻辑脚本
// 主要功能：本地任务管理、云同步、导入导出、每日打卡等
(async function () {
  // ====================
  // Section: Constants
  // ====================
  // 本地存储Key定义
  const STORAGE_KEY = "demon_todolist_v1";
  const SYNC_URL_KEY = "demon_todolist_sync_url_v1";
  const SYNC_KEY_KEY = "demon_todolist_sync_key_v1";
  const SYNC_INVITE_KEY = "demon_todolist_sync_invite_v1";
  const SYNC_AUTO_KEY = "demon_todolist_sync_auto_v1";
  const SYNC_LAST_SEEN_CLOUD_AT_KEY = "demon_todolist_sync_cloud_seen_at_v1";
  const LOCAL_MODIFIED_AT_KEY = "demon_todolist_modified_at_v1";
  const DAILY_VIEW_DATE_KEY = "demon_todolist_daily_view_date_v1";
  const DEFAULT_SYNC_BASE_URL = "https://sync.demonviglu.world";

  // ====================
  // Section: DOM
  // ====================
  // 获取主容器，若不存在则终止
  const app = document.getElementById("todo-app");
  if (!app) return;

  const form = document.getElementById("todo-form");
  const listEl = document.getElementById("todo-list");
  const sortByDeadlineBtn = document.getElementById("todo-sort-deadline");
  const sortByCreatedBtn = document.getElementById("todo-sort-created");
  const filterEl = document.getElementById("todo-filter");
  const searchEl = document.getElementById("todo-search");
  const dailyDateEl = document.getElementById("todo-daily-date");
  const dialogEl = document.getElementById("todo-dialog");
  const openBtn = document.getElementById("todo-open");
  const closeBtn = document.getElementById("todo-close");
  const cancelBtn = document.getElementById("todo-cancel");
  const exportBtn = document.getElementById("todo-export");
  const importBtn = document.getElementById("todo-import-btn");
  const importInput = document.getElementById("todo-import");

  const syncUrlInput = document.getElementById("todo-sync-url");
  const syncKeyInput = document.getElementById("todo-sync-key");
  const syncInviteInput = document.getElementById("todo-sync-invite");
  const syncPullBtn = document.getElementById("todo-sync-pull");
  const syncPushBtn = document.getElementById("todo-sync-push");
  const syncAutoBtn = document.getElementById("todo-sync-auto");
  const syncStatusEl = document.getElementById("todo-sync-status");

  // ====================
  // Section: State
  // ====================

  // 状态变量
  let sortMode = "deadline"; // 排序方式
  let filterMode = "all";    // 过滤方式
  let searchQuery = "";      // 搜索关键字
  let dailyViewDate = "";    // 每日视图日期
  let editingTaskId = null;   // 当前编辑任务ID
  let tasks = [];             // 任务列表

  // 自动同步运行时状态
  let autoSyncEnabled = false;
  let localChangeCounter = 0;
  let autoPushTimer = null;
  let autoPushInFlight = false;
  let autoPushQueued = false;
  let autoStartupPullInFlight = false;
  let autoPushBlockedByConflict = false;

  // ====================
  // Section: Utilities
  // ====================

  // 工具函数：解析 yyyy-mm-dd 字符串为 Date
  function parseYmd(value) {
    const s = String(value || "").trim();
    if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(s)) return null;
    const [y, m, d] = s.split("-").map((x) => Number(x));
    const dt = new Date(y, m - 1, d);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }

  // 读取/保存每日视图日期
  function loadDailyViewDate() {
    return String(localStorage.getItem(DAILY_VIEW_DATE_KEY) || "").trim();
  }

  function saveDailyViewDate(value) {
    const s = String(value || "").trim();
    if (s) localStorage.setItem(DAILY_VIEW_DATE_KEY, s);
    else localStorage.removeItem(DAILY_VIEW_DATE_KEY);
  }

  // 设置同步状态提示
  function setSyncStatus(message) {
    if (!syncStatusEl) return;
    syncStatusEl.textContent = message;
  }

  // 规范化同步服务URL（去除末尾/）
  function normalizeBaseUrl(raw) {
    const s = String(raw || "").trim();
    if (!s) return "";
    return s.endsWith("/") ? s.slice(0, -1) : s;
  }

  // 读取本地同步设置
  function loadSyncSettings() {
    const storedUrl = normalizeBaseUrl(localStorage.getItem(SYNC_URL_KEY) || "");
    const url = storedUrl || DEFAULT_SYNC_BASE_URL;
    const key = String(localStorage.getItem(SYNC_KEY_KEY) || "").trim();
    const invite = String(localStorage.getItem(SYNC_INVITE_KEY) || "").trim();
    return { url, key, invite };
  }

  // 保存本地同步设置
  function saveSyncSettings(url, key, invite) {
    localStorage.setItem(SYNC_URL_KEY, normalizeBaseUrl(url));
    localStorage.setItem(SYNC_KEY_KEY, String(key || "").trim());
    localStorage.setItem(SYNC_INVITE_KEY, String(invite || "").trim());
  }

  function loadAutoSyncEnabled() {
    return String(localStorage.getItem(SYNC_AUTO_KEY) || "") === "1";
  }

  function saveAutoSyncEnabled(enabled) {
    if (enabled) localStorage.setItem(SYNC_AUTO_KEY, "1");
    else localStorage.removeItem(SYNC_AUTO_KEY);
  }

  function setLocalModifiedAtIso(iso) {
    const s = String(iso || "").trim();
    if (!s) return;
    localStorage.setItem(LOCAL_MODIFIED_AT_KEY, s);
  }

  function loadLocalModifiedAtMs() {
    const raw = String(localStorage.getItem(LOCAL_MODIFIED_AT_KEY) || "").trim();
    const ms = raw ? Date.parse(raw) : NaN;
    return Number.isNaN(ms) ? 0 : ms;
  }

  function bumpLocalMutation(nowIso) {
    localChangeCounter += 1;
    setLocalModifiedAtIso(nowIso);
  }

  function isValidSyncKey(key) {
    const s = String(key || "").trim();
    return s.length >= 8 && s.length <= 128;
  }

  function updateAutoSyncButton() {
    if (!syncAutoBtn) return;
    syncAutoBtn.textContent = autoSyncEnabled ? "关闭自动同步" : "开启自动同步";
  }

  // 云同步API请求封装
  async function syncFetch(method, baseUrl, syncKey, inviteCode, body) {
    if (location.protocol === "https:" && !/^https:\/\//i.test(String(baseUrl || "").trim())) {
      throw new Error("当前页面是 HTTPS，Sync Server URL 必须以 https:// 开头（否则会触发 Mixed Content 被浏览器拦截）。");
    }

    const url = `${normalizeBaseUrl(baseUrl)}/api/sync`;
    const headers = {
      Authorization: `Bearer ${syncKey}`,
    };
    if (inviteCode) headers["X-Invite-Code"] = String(inviteCode);
    const init = {
      method,
      headers,
      // Prevent redirects (especially https -> http downgrade) which can trigger Mixed Content.
      redirect: "error",
    };
    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(body);
    }
    const res = await fetch(url, init);
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
    }
    return res;
  }

  function extractTasksFromPayload(payload) {
    return Array.isArray(payload) ? payload : payload && Array.isArray(payload.tasks) ? payload.tasks : [];
  }

  function computeTasksModifiedAtMs(list) {
    let maxMs = 0;
    const arr = Array.isArray(list) ? list : [];
    for (const task of arr) {
      if (!task || typeof task !== "object") continue;
      const candidates = [];
      if (task.updatedAt) candidates.push(task.updatedAt);
      if (task.createdAt) candidates.push(task.createdAt);
      if (task.completedAt) candidates.push(task.completedAt);
      const checkins = task.checkins && typeof task.checkins === "object" ? task.checkins : null;
      if (checkins) {
        for (const v of Object.values(checkins)) {
          if (v) candidates.push(v);
        }
      }

      for (const c of candidates) {
        const ms = Date.parse(String(c));
        if (!Number.isNaN(ms) && ms > maxMs) maxMs = ms;
      }
    }
    return maxMs;
  }

  function computeLocalModifiedAtMs() {
    return Math.max(loadLocalModifiedAtMs(), computeTasksModifiedAtMs(tasks));
  }

  function computeCloudModifiedAtMs(payload) {
    if (payload && typeof payload === "object" && payload.exportedAt) {
      const ms = Date.parse(String(payload.exportedAt));
      if (!Number.isNaN(ms)) return ms;
    }
    const cloudTasks = extractTasksFromPayload(payload);
    return computeTasksModifiedAtMs(cloudTasks);
  }

  function loadLastSeenCloudAtMs() {
    const raw = String(localStorage.getItem(SYNC_LAST_SEEN_CLOUD_AT_KEY) || "").trim();
    const ms = raw ? Date.parse(raw) : NaN;
    return Number.isNaN(ms) ? 0 : ms;
  }

  function setLastSeenCloudAtIso(iso) {
    const s = String(iso || "").trim();
    if (!s) return;
    localStorage.setItem(SYNC_LAST_SEEN_CLOUD_AT_KEY, s);
  }

  function setLastSeenCloudAtMs(ms) {
    if (!ms || ms <= 0) return;
    setLastSeenCloudAtIso(new Date(ms).toISOString());
  }

  async function autoPullIfCloudNewer() {
    if (!autoSyncEnabled) return;
    const { url, key, invite } = loadSyncSettings();
    if (!url || !key || !isValidSyncKey(key)) {
      setSyncStatus("自动同步：请先填写有效的 Sync Server URL / SyncKey");
      return;
    }

    autoStartupPullInFlight = true;
    const beforeCounter = localChangeCounter;
    const localBeforeMs = computeLocalModifiedAtMs();

    setSyncStatus("自动同步：检查云端更新…");
    try {
      const res = await syncFetch("GET", url, key, invite);
      const payload = await res.json();
      const cloudMs = computeCloudModifiedAtMs(payload);
      if (cloudMs) setLastSeenCloudAtMs(cloudMs);
      autoPushBlockedByConflict = false;

      // 若启动自动同步期间本地已发生用户改动，则不做覆盖，避免数据丢失。
      if (localChangeCounter !== beforeCounter) {
        setSyncStatus("自动同步：检测到本地已更改，跳过自动覆盖");
        return;
      }

      if (cloudMs > localBeforeMs) {
        const normalized = normalizeTasksArray(extractTasksFromPayload(payload));
        tasks = normalized;
        editingTaskId = null;
        await saveTasks();
        setLocalModifiedAtIso(new Date(cloudMs).toISOString());
        renderTasks();
        setSyncStatus(`自动同步：已从云端更新（${normalized.length} 条）`);
      } else {
        setSyncStatus("自动同步：云端无更新");
      }
    } catch (err) {
      setSyncStatus("自动同步：拉取失败");
      // 自动同步失败不弹窗，避免打扰；需要时用户可手动拉取查看错误。
      console.warn("Auto pull failed", err);
    } finally {
      autoStartupPullInFlight = false;
    }
  }

  function queueAutoPush() {
    if (!autoSyncEnabled) return;
    if (autoPushBlockedByConflict) return;
    autoPushQueued = true;
    // 启动阶段自动拉取尚未结束时，先不推送，避免把旧数据覆盖到云端。
    // 但会保留 queued 标记，待拉取结束后再调度一次推送。
    if (autoStartupPullInFlight) return;
    if (autoPushTimer) clearTimeout(autoPushTimer);
    autoPushTimer = setTimeout(() => {
      autoPushTimer = null;
      void runAutoPush();
    }, 800);
  }

  async function runAutoPush() {
    if (!autoSyncEnabled) return;
    if (autoPushBlockedByConflict) return;
    if (autoStartupPullInFlight) return;
    if (!autoPushQueued) return;

    if (autoPushInFlight) return;
    autoPushQueued = false;
    autoPushInFlight = true;

    const { url, key, invite } = loadSyncSettings();
    if (!url || !key || !isValidSyncKey(key)) {
      setSyncStatus("自动同步：请先填写有效的 Sync Server URL / SyncKey");
      autoPushInFlight = false;
      return;
    }

    setSyncStatus("自动同步：推送中…");
    try {
      // 冲突保护：自动推送前先确认云端自上次拉取后是否更新，避免旧页面覆盖新云端。
      const lastSeenCloudMs = loadLastSeenCloudAtMs();
      const checkRes = await syncFetch("GET", url, key, invite);
      const checkPayload = await checkRes.json();
      const cloudNowMs = computeCloudModifiedAtMs(checkPayload);
      if (cloudNowMs) setLastSeenCloudAtMs(cloudNowMs);

      if (lastSeenCloudMs && cloudNowMs > lastSeenCloudMs) {
        autoPushBlockedByConflict = true;
        setSyncStatus("自动同步：检测到云端已更新，已暂停自动上传，请先拉取/刷新");
        return;
      }

      const body = {
        schema: "demon_todolist",
        version: 1,
        exportedAt: new Date().toISOString(),
        tasks,
      };
      await syncFetch("PUT", url, key, invite, body);
      setLocalModifiedAtIso(body.exportedAt);
      setLastSeenCloudAtIso(body.exportedAt);
      setSyncStatus("自动同步：已推送");
    } catch (err) {
      setSyncStatus("自动同步：推送失败");
      console.warn("Auto push failed", err);
    } finally {
      autoPushInFlight = false;
      if (autoPushQueued) queueAutoPush();
    }
  }

  // 打开任务编辑对话框
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

  // 关闭任务编辑对话框
  function closeDialog() {
    if (!dialogEl) return;
    if (typeof dialogEl.close === "function" && dialogEl.open) {
      dialogEl.close();
    }
    dialogEl.classList.remove("todo-dialog--open");
  }

  // 生成唯一任务ID
  function generateId() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
    return `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  }

  // ====================
  // Section: Storage
  // ====================

  // 本地存储适配器（可扩展为云端存储）
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

  // 保存任务到本地存储
  async function saveTasks() {

  // ====================
  // Section: Import/Export
  // ====================
    await storageAdapter.save(tasks);
  }

  // 导入任务数据规范化
  function normalizeImportedTask(raw, now) {
    if (!raw || typeof raw !== "object") return null;

    const title = String(raw.title || "").trim();
    const due = parseIso(raw.dueAt);
    if (!title || !due) return null;

    const type = raw.type === "daily" ? "daily" : "oneoff";
    const start = parseIso(raw.startAt);
    const created = parseIso(raw.createdAt) || now;
    const updated = parseIso(raw.updatedAt) || created;
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
      updatedAt: updated.toISOString(),
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

  // 批量规范化任务数组
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

  // 导出任务为本地文件
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

  // 从文件导入任务
  async function importTasksFromFile(file) {

  // ====================
  // Section: Cloud Sync
  // ====================
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

  // 从云端拉取任务，覆盖本地
  async function pullFromCloud() {
    const { url, key, invite } = loadSyncSettings();
    if (!url || !key) {
      alert("请先填写 Sync Server URL 和 SyncKey");
      return;
    }

    if (location.protocol === "https:" && /^http:\/\//i.test(url)) {
      alert("当前页面是 HTTPS，Sync Server URL 不能使用 http://（浏览器会拦截 Mixed Content）。请改成 https:// 的地址。");
      return;
    }

    if (!isValidSyncKey(key)) {
      alert("SyncKey 长度必须在 8 到 128 之间（建议 32+）");
      return;
    }

    if (!confirm("云端拉取会覆盖本地所有任务，确定继续？")) return;

    setSyncStatus("正在拉取…");
    try {
      const res = await syncFetch("GET", url, key, invite);
      const payload = await res.json();
      const rawTasks = extractTasksFromPayload(payload);
      const normalized = normalizeTasksArray(rawTasks);
      tasks = normalized;
      editingTaskId = null;
      await saveTasks();
      const cloudMs = computeCloudModifiedAtMs(payload) || Date.now();
      setLocalModifiedAtIso(new Date(cloudMs).toISOString());
      setLastSeenCloudAtMs(cloudMs);
      autoPushBlockedByConflict = false;
      renderTasks();
      setSyncStatus(`拉取完成：${normalized.length} 条`);
    } catch (err) {
      setSyncStatus("拉取失败");
      alert(`拉取失败：${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // 推送本地任务到云端，覆盖云端
  async function pushToCloud() {

  // ====================
  // Section: Task Helpers
  // ====================
    const { url, key, invite } = loadSyncSettings();
    if (!url || !key) {
      alert("请先填写 Sync Server URL 和 SyncKey");
      return;
    }

    if (location.protocol === "https:" && /^http:\/\//i.test(url)) {
      alert("当前页面是 HTTPS，Sync Server URL 不能使用 http://（浏览器会拦截 Mixed Content）。请改成 https:// 的地址。");
      return;
    }

    if (!isValidSyncKey(key)) {
      alert("SyncKey 长度必须在 8 到 128 之间（建议 32+）");
      return;
    }

    if (!confirm("同步到云端会覆盖云端数据，确定继续？")) return;

    setSyncStatus("正在推送…");
    try {
      const body = {
        schema: "demon_todolist",
        version: 1,
        exportedAt: new Date().toISOString(),
        tasks,
      };
      await syncFetch("PUT", url, key, invite, body);
      setLocalModifiedAtIso(body.exportedAt);
      setLastSeenCloudAtIso(body.exportedAt);
      autoPushBlockedByConflict = false;
      setSyncStatus("推送完成");
    } catch (err) {
      setSyncStatus("推送失败");
      alert(`推送失败：${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // 解析标签输入
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

  // 标签数组转字符串
  function joinTags(tags) {
    if (!Array.isArray(tags) || !tags.length) return "";
    return tags.join(", ");
  }

  // Date转yyyy-mm-dd
  function toISODate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  // 解析input类型datetime-local
  function parseInputDateTime(value) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  // 解析ISO日期字符串
  function parseIso(iso) {
    if (!iso) return null;
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  // Date转input可用的datetime-local字符串
  function toDateTimeLocalValue(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hour = String(date.getHours()).padStart(2, "0");
    const minute = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hour}:${minute}`;
  }

  // 获取当天零点
  function startOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  // 计算两个日期间隔天数（含首尾）
  function dayDiffInclusive(fromDate, toDate) {
    const msPerDay = 24 * 60 * 60 * 1000;
    const diff = Math.floor((startOfDay(toDate) - startOfDay(fromDate)) / msPerDay);
    return diff >= 0 ? diff + 1 : 0;
  }

  // 获取任务实际开始时间
  function effectiveStart(task) {
    return parseIso(task.startAt) || parseIso(task.createdAt);
  }

  // 计算每日任务进度
  function calcDailyProgress(task, now) {
    const start = effectiveStart(task);
    const due = parseIso(task.dueAt);
    if (!start || !due) {
      return { expected: 0, checked: 0, total: 0, rangeStarted: false, ended: false, success: false };
    }

    const rangeStarted = now >= start;
    const ended = now > due;
    const capDate = now < due ? now : due;
    const expected = rangeStarted ? dayDiffInclusive(start, capDate) : 0;
    const total = dayDiffInclusive(start, due);
    const checked = Object.keys(task.checkins || {}).length;
    const success = ended && checked >= total;

    return { expected, checked, total, rangeStarted, ended, success };
  }

  // 获取任务状态分类
  function getStatusCategory(task, now) {
    const due = parseIso(task.dueAt);
    const completedAt = parseIso(task.completedAt);

    const startAt = parseIso(task.startAt);

    if (task.type === "oneoff") {
      if (completedAt) return "completed";
      if (startAt && now < startAt) return "not_started";
      if (due && now > due) return "overdue";
      return "active";
    }

    const start = effectiveStart(task);
    if (start && now < start) return "not_started";

    const progress = calcDailyProgress(task, now);
    if (progress.success) return "completed";
    if (progress.ended && !progress.success) return "ended_failed";
    return "active";
  }

  // HTML转义
  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  // 获取任务状态文本
  function statusText(task, now) {
    const category = getStatusCategory(task, now);
    if (task.type === "oneoff") {
      if (category === "completed") return "已完成";
      if (category === "overdue") return "已逾期";
      if (category === "not_started") return "未开始";
      return "进行中";
    }

    const progress = calcDailyProgress(task, now);
    if (category === "completed") return "已完成";
    if (category === "ended_failed") return "已结束（漏打卡）";
    if (category === "not_started") return "未开始";
    return `进行中（${progress.checked}/${progress.expected}）`;
  }

  // 状态徽章文本
  function statusBadgeLabel(category) {
    if (category === "completed") return "已完成";
    if (category === "overdue") return "已逾期";
    if (category === "ended_failed") return "漏打卡";
    if (category === "not_started") return "未开始";
    return "进行中";
  }

  // 判断今日是否可打卡
  function canCheckinToday(task, now) {
    if (task.type !== "daily") return false;
    const due = parseIso(task.dueAt);
    if (!due || now > due) return false;
    const start = effectiveStart(task);
    if (!start) return false;
    if (now < start) return false;
    const todayKey = toISODate(now);
    return !(task.checkins && task.checkins[todayKey]);
  }

  // 判断今日是否已打卡
  function hasTodayCheckin(task, now) {
    if (task.type !== "daily") return false;
    const todayKey = toISODate(now);
    return Boolean(task.checkins && task.checkins[todayKey]);
  }

  // 清理超出有效期的打卡记录
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

  // 判断某日是否在每日任务有效期内
  function isDailyInRangeForDate(task, date) {
    if (task.type !== "daily") return false;
    const start = effectiveStart(task);
    const due = parseIso(task.dueAt);
    if (!start || !due) return false;
    const day = startOfDay(date);
    const startDay = startOfDay(start);
    const dueDay = startOfDay(due);
    return day >= startDay && day <= dueDay;
  }

  // 判断任务是否在当前视图可见
  function isTaskVisible(task, now) {
    if (filterMode && filterMode !== "all") {
      const c = getStatusCategory(task, now);
      if (c !== filterMode) return false;
    }

    if (dailyViewDate) {
      const d = parseYmd(dailyViewDate);
      if (!d) return false;
      if (!isDailyInRangeForDate(task, d)) return false;
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

  // 渲染任务列表到页面
  function renderTasks() {

  // ====================
  // Section: Events
  // ====================
    const now = new Date();
    const viewDate = dailyViewDate ? parseYmd(dailyViewDate) : null;
    const viewDateKey = viewDate ? toISODate(viewDate) : toISODate(now);
    const isTodayView = viewDateKey === toISODate(now);

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
        const checkinEnabled = isTodayView ? canCheckinToday(task, now) : false;
        const canUndoToday = isTodayView ? hasTodayCheckin(task, now) : false;
        const dayChecked = task.type === "daily" ? Boolean(task.checkins && task.checkins[viewDateKey]) : false;
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
              ${
                dailyViewDate && task.type === "daily"
                  ? `<div><span>打卡日</span><span>${escapeHtml(viewDateKey)}（${dayChecked ? "已打卡" : "未打卡"}）</span></div>`
                  : ""
              }
            </div>
            <details class="todo-details">
              <summary>时间详情</summary>
              <div class="todo-kv todo-kv--details">
                <div><span>开始</span><span>${start}</span></div>
                <div><span>截止</span><span>${due}</span></div>
                <div><span>创建</span><span>${created}</span></div>
              </div>
            </details>
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
                      : dailyViewDate && !isTodayView
                        ? `<button type="button" disabled>${escapeHtml(viewDateKey)}（仅查看：${dayChecked ? "已打卡" : "未打卡"}）</button>`
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

  // 任务表单提交事件
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
    const nowIso = now.toISOString();
    tasks.push({
      id: generateId(),
      title,
      note,
      tags,
      type: type === "daily" ? "daily" : "oneoff",
      startAt: start ? start.toISOString() : null,
      dueAt: due.toISOString(),
      createdAt: nowIso,
      updatedAt: nowIso,
      completedAt: null,
      checkins: {},
    });

    bumpLocalMutation(nowIso);

    await saveTasks();
    form.reset();
    closeDialog();
    renderTasks();
    queueAutoPush();
  });

  // 任务操作按钮事件（编辑、删除、打卡等）
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
    const nowIso = now.toISOString();
    const task = tasks[index];

    let didMutate = false;

    if (action === "delete") {
      const title = String(task.title || "").trim();
      const ok = confirm(title ? `确定删除任务「${title}」吗？` : "确定删除该任务吗？");
      if (!ok) return;

      tasks.splice(index, 1);
      if (editingTaskId === id) editingTaskId = null;
      didMutate = true;
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
      if (autoSyncEnabled && autoPushQueued) {
        queueAutoPush();
      }

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
      task.updatedAt = nowIso;
      pruneCheckinsToRange(task);
      editingTaskId = null;
      didMutate = true;
    } else if (action === "complete" && task.type === "oneoff" && !task.completedAt) {
      task.completedAt = nowIso;
      task.updatedAt = nowIso;
      didMutate = true;
    } else if (action === "checkin" && canCheckinToday(task, now)) {
      const today = toISODate(now);
      task.checkins = task.checkins || {};
      task.checkins[today] = nowIso;
      task.updatedAt = nowIso;
      didMutate = true;
    } else if (action === "uncheckin" && hasTodayCheckin(task, now)) {
      const today = toISODate(now);
      if (task.checkins) delete task.checkins[today];
      task.updatedAt = nowIso;
      didMutate = true;
    }

    if (didMutate) bumpLocalMutation(nowIso);

    await saveTasks();
    renderTasks();
    if (didMutate) queueAutoPush();
  });

  // 排序按钮事件
  sortByDeadlineBtn.addEventListener("click", () => {
    sortMode = "deadline";
    renderTasks();
  });

  sortByCreatedBtn.addEventListener("click", () => {
    sortMode = "created";
    renderTasks();
  });

  // 过滤器事件
  if (filterEl) {
    filterEl.addEventListener("change", () => {
      filterMode = String(filterEl.value || "all");
      editingTaskId = null;
      renderTasks();
    });
  }

  // 搜索框事件
  if (searchEl) {
    searchEl.addEventListener("input", () => {
      searchQuery = String(searchEl.value || "").trim();
      editingTaskId = null;
      renderTasks();
    });
  }

  // 打开新建任务对话框
  if (openBtn) {
    openBtn.addEventListener("click", () => {
      openDialog();
    });
  }

  // 关闭对话框
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      closeDialog();
    });
  }

  // 取消编辑/关闭对话框
  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
      closeDialog();
    });
  }

  // 点击对话框遮罩关闭
  if (dialogEl) {
    dialogEl.addEventListener("click", (event) => {
      if (event.target === dialogEl) {
        closeDialog();
      }
    });
  }

  // 导出按钮事件
  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      exportTasksToFile();
    });
  }

  // 导入按钮事件
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
      const nowIso = new Date().toISOString();
      bumpLocalMutation(nowIso);
      queueAutoPush();
    });
  }

  // 同步设置UI初始化与事件
  if (syncUrlInput && syncKeyInput) {
    const s = loadSyncSettings();
    syncUrlInput.value = s.url;
    syncKeyInput.value = s.key;
    if (syncInviteInput) syncInviteInput.value = s.invite;

    const persist = () => {
      saveSyncSettings(syncUrlInput.value, syncKeyInput.value, syncInviteInput ? syncInviteInput.value : "");
    };
    syncUrlInput.addEventListener("change", persist);
    syncKeyInput.addEventListener("change", persist);
    if (syncInviteInput) syncInviteInput.addEventListener("change", persist);
  }

  if (syncAutoBtn) {
    autoSyncEnabled = loadAutoSyncEnabled();
    updateAutoSyncButton();
    syncAutoBtn.addEventListener("click", async () => {
      autoSyncEnabled = !autoSyncEnabled;
      saveAutoSyncEnabled(autoSyncEnabled);
      updateAutoSyncButton();
      setSyncStatus(autoSyncEnabled ? "自动同步：已开启" : "自动同步：已关闭");
      if (autoSyncEnabled) {
        await autoPullIfCloudNewer();
      } else {
        autoPushBlockedByConflict = false;
      }
    });
  } else {
    autoSyncEnabled = loadAutoSyncEnabled();
  }

  // 云端拉取按钮
  if (syncPullBtn) {
    syncPullBtn.addEventListener("click", async () => {
      await pullFromCloud();
    });
  }

  // 云端推送按钮
  if (syncPushBtn) {
    syncPushBtn.addEventListener("click", async () => {
      await pushToCloud();
    });
  }

  // 每日视图日期选择
  if (dailyDateEl) {
    dailyViewDate = loadDailyViewDate();
    dailyDateEl.value = dailyViewDate;
    dailyDateEl.addEventListener("change", async () => {
      dailyViewDate = String(dailyDateEl.value || "").trim();
      saveDailyViewDate(dailyViewDate);
      renderTasks();
    });
  } else {
    dailyViewDate = loadDailyViewDate();
  }

  // ====================
  // Section: Bootstrap
  // ====================

  // 初始化任务数据并渲染
  tasks = normalizeTasksArray(await storageAdapter.load());
  await saveTasks();
  renderTasks();

  // 若启用了自动同步：打开页面时检查云端是否有更新（云端更晚则覆盖本地）。
  if (autoSyncEnabled) {
    await autoPullIfCloudNewer();
  }
})();