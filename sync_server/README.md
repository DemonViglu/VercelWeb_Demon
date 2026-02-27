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

## 用 Cloudflare Tunnel 对外提供 HTTPS（已验证可用）

[https://eastondev.com/blog/zh/posts/dev/20251130-cloudflare-tunnel-guide/](如果你想看已有的别人讲解)

如果你现在域名已经接入 Cloudflare（看到 “Your domain is now protected by Cloudflare”），最稳的做法是：

- 主站（MkDocs/Vercel）继续走 Vercel
- 同步服务走一个子域名，例如 `sync.<你的域名>`
- 通过 Cloudflare Tunnel（`cloudflared`）把公网 HTTPS 终止在 Cloudflare，再反代到你本机的 `uvicorn`

这样浏览器访问同步接口时会拿到 Cloudflare 的可信证书，不会再因为 FRP/证书链导致 “部分不安全”。

### 成功配置的最短路径（Checklist）

下面这套流程就是本仓库目前跑通的方式：

1) 在本机启动同步后端（例如 2222 端口）
2) Cloudflare Tunnel 显示 `Connected`
3) Cloudflare DNS 里有：`sync.<你的域名> CNAME -> <uuid>.cfargotunnel.com`
4) Tunnel 的 Public Hostname / ingress 指向：`http://127.0.0.1:2222`
5) 访问：`https://sync.<你的域名>/health` 返回 JSON

只要第 1 步的本机后端停止运行，公网访问就会变成 `502 Bad Gateway`（这是正常现象）。

### 1) 先把后端跑在本机端口（建议只监听 127.0.0.1）

示例（端口 2222）：

```powershell
cd sync_server
.\.venv\Scripts\python.exe -m uvicorn app:app --host 127.0.0.1 --port 2222
```

确认：打开 `http://127.0.0.1:2222/health` 返回 `200`。

### 2) 安装并登录 cloudflared

在 Windows 上建议用 `winget` 安装：

```powershell
winget install Cloudflare.cloudflared
```

登录并选择你的域名（会弹浏览器授权）：

```powershell
cloudflared tunnel login
```

### 3) 创建 Tunnel，并给子域名做 DNS 路由

创建一个 tunnel 名称（随便取）：

```powershell
cloudflared tunnel create demon-sync
```

把子域名 `sync` 指到这个 tunnel（Cloudflare 会自动创建一条 CNAME 到 `*.cfargotunnel.com`）：

```powershell
cloudflared tunnel route dns demon-sync sync
```

如果你是通过 Cloudflare 面板创建的 Public Hostname，DNS 记录也可能由面板自动创建；以你 DNS 里能看到 `sync.<domain> -> *.cfargotunnel.com` 为准。

### 4) 配置“sync 域名转发到本机”的规则

你有两种方式，选一种即可。

#### 方式 A（推荐）：面板里配置 Public Hostname

在 Cloudflare Zero Trust → Networks → Tunnels → 你的 tunnel → Public Hostnames 里添加：

- Hostname：`sync.<你的域名>`
- Service：`http://127.0.0.1:2222`

这也是最适合 Windows Service（`cloudflared service install`）的方式。

#### 方式 B：本地 ingress 配置文件

在你的用户目录一般会有 `%USERPROFILE%\.cloudflared\`。你可以用本仓库提供的示例配置：

- 复制并改名：`sync_server/cloudflared.example.yml` → `sync_server/cloudflared.yml`
- 把里面的 `tunnel:` 和 `credentials-file:` 改成你机器上的实际值
- 把 `hostname:` 改成你的实际域名，例如 `sync.demonviglu.world`
- 把 `service:` 端口改成你 uvicorn 的端口（例如 2222）

然后运行：

```powershell
cloudflared tunnel run --config sync_server\cloudflared.yml demon-sync
```

### 5) 前端 TodoList 的 Sync Server URL

在 TodoList 页面里把 Sync Server URL 填成：

- `https://sync.<你的域名>`

例如：`https://sync.demonviglu.world`

最后用浏览器访问：

- `https://sync.<你的域名>/health`（应该返回 JSON）

### 6) （可选）收紧 CORS

默认 CORS 是 `*`（靠 `syncKey` 授权）。如果你想更严格，可在启动 uvicorn 前设置：

```powershell
$env:SYNC_ALLOW_ORIGINS = "https://<你的主站域名>,https://www.<你的主站域名>"
.\.venv\Scripts\python.exe -m uvicorn app:app --host 127.0.0.1 --port 2222
```

## 常见问题（排障）

### 访问 `https://sync.<domain>/health` 返回 502

几乎总是下面原因之一：

- 本机后端没启动，或者没监听在 `127.0.0.1:<端口>`
- Public Hostname / ingress 指到了错误端口（例如写成 8787 但你实际跑的是 2222）
- 你本机被防火墙/安全软件拦截了 cloudflared 访问本机端口

本机先自检：

```powershell
curl http://127.0.0.1:2222/health
```

能通再看 tunnel。

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
# 一行一个邀请码：
# - 只有 code：无限制次数
# - code 后面跟数字：限制可用次数

codeA
codeB 3
```

## 数据存在哪里？

默认数据目录是 `sync_server/data/`（可用 `SYNC_DATA_DIR` 修改）。目录内主要有两类文件：

- `data/sync/<sha256(syncKey)>.json`：真正的 tasks 数据（文件名是 syncKey 的 SHA-256 哈希，不会直接暴露 syncKey）
- `data/_usage.json`：每日请求计数（用于限额）
- `data/_invites.json`：邀请码使用次数统计（当你给邀请码配置了次数限制时会用到）

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

如果你配置了邀请码（`invite_codes.txt` 或 `SYNC_INVITE_CODES`），那么当某个 `syncKey` **第一次** 推送（服务器上还没有该 key 的数据文件）时，请求必须带：

- Header：`X-Invite-Code: <你的邀请码>`

一旦该 `syncKey` 已经创建过数据文件，后续推送/拉取只需要 `Authorization: Bearer <syncKey>`。

推荐做法：把邀请码写进本机 `invite_codes.txt`（默认路径，或用 `SYNC_INVITE_CODES_FILE` 指定）。

## 安全建议

- syncKey 请用足够随机、足够长的字符串（建议 ≥ 32 字符）
- 通过你的内网穿透工具时尽量用 HTTPS
- 不要把 syncKey 放在 URL 参数中
