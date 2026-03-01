# TodoList

??? info "Info"
    这个页面提供两种任务：

    - 完成即截止：完成后任务结束。
    - 每日打卡：在时间段内每天打卡。

    支持两种时间模式：

    - 仅截止时间
    - 开始时间 + 截止时间

---

<section class="todo-app" id="todo-app">
  <div class="todo-toolbar">
    <div class="todo-toolbar-group">
      <button type="button" id="todo-open">新增任务</button>
      <button type="button" id="todo-export">导出</button>
      <button type="button" id="todo-import-btn">导入</button>
      <input id="todo-import" type="file" accept="application/json" class="todo-hidden" />
    </div>
    <div class="todo-toolbar-group">
      <label for="todo-filter">状态筛选</label>
      <select id="todo-filter" name="filter">
        <option value="all">全部</option>
        <option value="not_started">未开始</option>
        <option value="active">进行中</option>
        <option value="completed">已完成</option>
        <option value="overdue">已逾期</option>
        <option value="ended_failed">已结束（漏打卡）</option>
      </select>
    </div>
    <div class="todo-toolbar-group">
      <label for="todo-daily-date">打卡日期</label>
      <input id="todo-daily-date" type="date" />
    </div>
    <div class="todo-toolbar-group">
      <label for="todo-search">搜索</label>
      <input id="todo-search" type="search" placeholder="按标题/标签/备注搜索" />
    </div>
    <div class="todo-toolbar-group">
      <button type="button" id="todo-sort-deadline">按截止时间排序</button>
      <button type="button" id="todo-sort-created">按创建时间排序</button>
    </div>
  </div>

  <details class="todo-sync" id="todo-sync">
    <summary>云同步（可选）</summary>
    <div class="todo-sync-body">
      <div class="todo-row todo-grid">
        <div>
          <label for="todo-sync-url">Sync Server URL</label>
          <input id="todo-sync-url" type="url" placeholder="https://sync.demonviglu.world" />
        </div>
        <div>
          <label for="todo-sync-key">SyncKey</label>
          <input id="todo-sync-key" type="password" placeholder="至少 8 字符，建议 32+" />
        </div>
        <div>
          <label for="todo-sync-invite">Invite Code（可选）</label>
          <input id="todo-sync-invite" type="password" placeholder="仅首次推送新 SyncKey 可能需要" />
        </div>
      </div>

      <div class="todo-actions">
        <button type="button" id="todo-sync-pull">云端拉取（覆盖本地）</button>
        <button type="button" id="todo-sync-push">同步到云端（覆盖云端）</button>
        <button type="button" id="todo-sync-auto">开启自动同步</button>
        <span class="todo-sync-status" id="todo-sync-status" aria-live="polite"></span>
      </div>
    </div>
  </details>

  <details class="todo-calendar-panel" id="todo-calendar-panel">
    <summary>日历查看（按任务）</summary>
    <div class="todo-calendar-panel-body">
      <div class="todo-row todo-grid">
        <div>
          <label for="todo-cal-month">年月</label>
          <input id="todo-cal-month" type="month" />
        </div>
        <div>
          <label for="todo-cal-task">任务</label>
          <select id="todo-cal-task" name="calendar_task"></select>
        </div>
      </div>
      <div id="todo-cal-view" class="todo-cal-view" aria-live="polite"></div>
    </div>
  </details>

  <dialog id="todo-dialog" class="todo-dialog">
    <div class="todo-dialog-card">
      <header class="todo-dialog-header">
        <h2>新增任务</h2>
        <button type="button" class="todo-dialog-close" id="todo-close" aria-label="关闭">×</button>
      </header>

      <form id="todo-form" class="todo-form">
        <div class="todo-row">
          <label for="todo-title">任务名称</label>
          <input id="todo-title" name="title" type="text" required maxlength="80" placeholder="例如：准备周报" />
        </div>

        <div class="todo-row">
          <label for="todo-note">备注（可选）</label>
          <textarea id="todo-note" name="note" rows="3" maxlength="400" placeholder="记录一下目标、注意事项、链接…"></textarea>
        </div>

        <div class="todo-row">
          <label for="todo-tags">标签（可选，逗号分隔）</label>
          <input id="todo-tags" name="tags" type="text" maxlength="120" placeholder="例如：学习, 健身, 项目" />
        </div>

        <div class="todo-row todo-grid">
          <div>
            <label for="todo-type">任务类型</label>
            <select id="todo-type" name="type">
              <option value="oneoff">完成即截止</option>
              <option value="daily">每日打卡</option>
            </select>
          </div>

          <div>
            <label for="todo-start">开始时间（可选）</label>
            <input id="todo-start" name="start" type="datetime-local" />
          </div>

          <div>
            <label for="todo-due">截止时间（必填）</label>
            <input id="todo-due" name="due" type="datetime-local" required />
          </div>
        </div>

        <div class="todo-row">
          <label>需要打卡的星期（每日打卡生效）</label>
          <div class="todo-weekdays">
            <label class="todo-weekday"><input type="checkbox" name="weekdays" value="1" checked />周一</label>
            <label class="todo-weekday"><input type="checkbox" name="weekdays" value="2" checked />周二</label>
            <label class="todo-weekday"><input type="checkbox" name="weekdays" value="3" checked />周三</label>
            <label class="todo-weekday"><input type="checkbox" name="weekdays" value="4" checked />周四</label>
            <label class="todo-weekday"><input type="checkbox" name="weekdays" value="5" checked />周五</label>
            <label class="todo-weekday"><input type="checkbox" name="weekdays" value="6" checked />周六</label>
            <label class="todo-weekday"><input type="checkbox" name="weekdays" value="0" checked />周日</label>
          </div>
          <p class="todo-help">未选中的星期仍允许打卡，但不计入进度，也不会算漏打卡。</p>
        </div>

        <div class="todo-actions">
          <button type="submit">添加任务</button>
          <button type="button" id="todo-cancel">取消</button>
        </div>
      </form>
    </div>
  </dialog>

  <div id="todo-list" class="todo-list" aria-live="polite"></div>
</section>