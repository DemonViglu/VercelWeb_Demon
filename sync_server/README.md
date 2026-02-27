# Todo Sync Server (Local)

这是给 MkDocs TodoList 页面提供“手动云同步”的本机后端。

特点：

- 使用 `Authorization: Bearer <syncKey>` 作为身份区分（每个人一把 syncKey）
- 数据落地到本机 `sync_server/data/`（每个 key 一份 JSON）
- CORS 默认允许所有来源（靠 syncKey 控制访问）
- 可设置每日请求限额（默认全站 50 次/天，GET/PUT 都计数）

## 安装

建议在单独的 Python 环境里运行。

```powershell
cd sync_server
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

## 运行

```powershell
cd sync_server
.\.venv\Scripts\python.exe -m uvicorn app:app --host 0.0.0.0 --port 8787
```

## 环境变量（可选）

- `SYNC_DAILY_LIMIT`：每日总请求上限（默认 `50`）
- `SYNC_DATA_DIR`：数据目录（默认 `./data`）
- `SYNC_ALLOW_ORIGINS`：CORS 允许来源（默认 `*`）
- `SYNC_INVITE_CODES_FILE`：邀请码文件路径（默认 `./invite_codes.txt`）。
- `SYNC_INVITE_CODES`：邀请码列表（英文逗号分隔，作为备用/追加来源）。

示例：

```powershell
$env:SYNC_DAILY_LIMIT = "50"
$env:SYNC_ALLOW_ORIGINS = "*"
$env:SYNC_INVITE_CODES = "codeA,codeB"
.\.venv\Scripts\python.exe -m uvicorn app:app --host 0.0.0.0 --port 8787
```

也可以直接在本机创建 `invite_codes.txt`（推荐，改起来最方便）：

```text
# sync_server/invite_codes.txt
codeA
codeB
```

## 数据存在哪里？

默认数据目录是 `sync_server/data/`（可用 `SYNC_DATA_DIR` 修改）。目录内主要有两类文件：

- `data/sync/<sha256(syncKey)>.json`：真正的 tasks 数据（文件名是 syncKey 的 SHA-256 哈希，不会直接暴露 syncKey）
- `data/_usage.json`：每日请求计数（用于限额）

## 接口

### GET /api/sync

返回：

```json
{
  "schema": "demon_todolist",
  "version": 1,
  "updatedAt": "2026-02-27T00:00:00.000Z",
  "tasks": []
}
```

如果该 syncKey 还没有数据，返回空 tasks。

### PUT /api/sync

请求体可接受两种形式：

1) `{ tasks: [...] }` 或完整导出对象
2) 直接是 `[...]`（tasks 数组）

服务端会把 `tasks` 存到本机。

### 邀请码（可选机制）

如果你设置了 `SYNC_INVITE_CODES`，那么当某个 `syncKey` **第一次** 推送（服务器上还没有该 key 的数据文件）时，请求必须带：

- Header：`X-Invite-Code: <你的邀请码>`

一旦该 `syncKey` 已经创建过数据文件，后续推送/拉取只需要 `Authorization: Bearer <syncKey>`。

推荐做法：把邀请码写进本机 `invite_codes.txt`（默认路径，或用 `SYNC_INVITE_CODES_FILE` 指定）。

## 安全建议

- syncKey 请用足够随机、足够长的字符串（建议 ≥ 32 字符）
- 通过你的内网穿透工具时尽量用 HTTPS
- 不要把 syncKey 放在 URL 参数中
