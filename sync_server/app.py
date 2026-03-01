import hashlib
import json
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


BJ_TZ = timezone(timedelta(hours=8))


def beijing_now_iso() -> str:
    """Server time in Beijing (UTC+8) ISO-8601 format.

    This is for display/UX only; sync timestamps should keep using UTC (Z).
    """

    return datetime.now(BJ_TZ).isoformat()


def sha256_hex(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def get_env_int(name: str, default: int) -> int:
    raw = os.environ.get(name)
    if raw is None:
        return default
    try:
        return int(raw)
    except ValueError:
        return default


SYNC_DAILY_LIMIT = get_env_int("SYNC_DAILY_LIMIT", 200)
SYNC_DATA_DIR = Path(os.environ.get("SYNC_DATA_DIR", "./data")).resolve()
SYNC_ALLOW_ORIGINS = os.environ.get("SYNC_ALLOW_ORIGINS", "*")
SYNC_INVITE_CODES_RAW = os.environ.get("SYNC_INVITE_CODES", "")
SYNC_INVITE_CODES_FILE = Path(os.environ.get("SYNC_INVITE_CODES_FILE", "./invite_codes.txt")).resolve()


def parse_invite_codes_raw(raw: str) -> Dict[str, Optional[int]]:
    """Parse SYNC_INVITE_CODES env var (comma-separated). Always unlimited usage."""
    text = (raw or "").strip()
    if not text:
        return {}
    out: Dict[str, Optional[int]] = {}
    for token in text.split(","):
        code = token.strip()
        if not code:
            continue
        out[code] = None
    return out


def load_invite_rules_from_file(path: Path) -> Dict[str, Optional[int]]:
    """Parse invite_codes.txt.

    Format: one invite per line.
      - `code` => unlimited
      - `code 3` => max 3 uses
    Lines starting with # are comments.
    """

    rules: Dict[str, Optional[int]] = {}
    if not path.exists() or not path.is_file():
        return rules

    for line in path.read_text(encoding="utf-8").splitlines():
        s = line.strip()
        if not s or s.startswith("#"):
            continue
        parts = s.replace("\t", " ").split()
        if not parts:
            continue
        code = parts[0].strip()
        if not code:
            continue

        limit: Optional[int] = None
        if len(parts) >= 2:
            try:
                n = int(parts[1])
                if n >= 0:
                    limit = n
            except ValueError:
                limit = None

        rules[code] = limit

    return rules


def load_invite_rules() -> Dict[str, Optional[int]]:
    rules: Dict[str, Optional[int]] = {}
    # 1) Local file (preferred)
    try:
        rules.update(load_invite_rules_from_file(SYNC_INVITE_CODES_FILE))
    except Exception:
        pass
    # 2) Env var fallback (unlimited)
    rules.update(parse_invite_codes_raw(SYNC_INVITE_CODES_RAW))
    return rules


def get_invite_rules() -> Dict[str, Optional[int]]:
    # Load dynamically so local edits to invite_codes.txt can take effect without restart.
    return load_invite_rules()

app = FastAPI()


@app.middleware("http")
async def add_no_store_headers(request: Request, call_next):
    response = await call_next(request)
    # Avoid caching sync responses (e.g. when fronted by CDNs).
    response.headers["Cache-Control"] = "no-store"
    response.headers["Pragma"] = "no-cache"
    return response

if SYNC_ALLOW_ORIGINS.strip() == "*":
    allow_origins = ["*"]
else:
    allow_origins = [o.strip() for o in SYNC_ALLOW_ORIGINS.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=False,
    allow_methods=["GET", "PUT", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Invite-Code"],
)


def extract_sync_key(request: Request) -> str:
    auth = request.headers.get("authorization") or ""
    parts = auth.split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(status_code=401, detail="Missing Bearer token")

    key = parts[1].strip()
    if len(key) < 8 or len(key) > 128:
        raise HTTPException(status_code=401, detail="Invalid syncKey (length must be 8-128)")
    return key


def atomic_write_text(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(text, encoding="utf-8")
    tmp.replace(path)


def read_json_file(path: Path) -> Optional[Dict[str, Any]]:
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None


def today_key() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def usage_path() -> Path:
    return SYNC_DATA_DIR / "_usage.json"


def check_and_count_request(sync_key_hash: str) -> None:
    # Simple file-based counter. Good enough for single-process local use.
    key = today_key()
    usage = read_json_file(usage_path()) or {}
    if usage.get("date") != key:
        usage = {"date": key, "total": 0, "perKey": {}}

    total = int(usage.get("total", 0))
    per_key: Dict[str, int] = usage.get("perKey", {}) if isinstance(usage.get("perKey"), dict) else {}
    per = int(per_key.get(sync_key_hash, 0))

    if SYNC_DAILY_LIMIT > 0 and total >= SYNC_DAILY_LIMIT:
        raise HTTPException(status_code=429, detail="Daily limit reached")

    usage["total"] = total + 1
    per_key[sync_key_hash] = per + 1
    usage["perKey"] = per_key
    atomic_write_text(usage_path(), json.dumps(usage, ensure_ascii=False, indent=2))


def sync_file_path(sync_key_hash: str) -> Path:
    return SYNC_DATA_DIR / "sync" / f"{sync_key_hash}.json"


def invite_usage_path() -> Path:
    return SYNC_DATA_DIR / "_invites.json"


def read_invite_usage() -> Dict[str, Any]:
    return read_json_file(invite_usage_path()) or {}


def atomic_write_json(path: Path, payload: Any) -> None:
    atomic_write_text(path, json.dumps(payload, ensure_ascii=False, indent=2))


def get_invite_used_count(usage: Dict[str, Any], code: str) -> int:
    used = usage.get("used")
    if not isinstance(used, dict):
        return 0
    try:
        return int(used.get(code, 0))
    except Exception:
        return 0


def consume_invite_code(code: str) -> None:
    usage = read_invite_usage()
    used = usage.get("used")
    if not isinstance(used, dict):
        used = {}
    current = 0
    try:
        current = int(used.get(code, 0))
    except Exception:
        current = 0
    used[code] = current + 1
    usage["used"] = used
    usage["updatedAt"] = utc_now_iso()
    atomic_write_json(invite_usage_path(), usage)


def extract_invite_code(request: Request) -> str:
    return (request.headers.get("x-invite-code") or "").strip()


def require_invite_if_creating_new_key(request: Request, data_path: Path) -> None:
    invite_rules = get_invite_rules()
    if not invite_rules:
        return
    if data_path.exists():
        return

    code = extract_invite_code(request)
    if not code:
        raise HTTPException(status_code=403, detail="Invite code required")
    if code not in invite_rules:
        raise HTTPException(status_code=403, detail="Invalid invite code")

    limit = invite_rules.get(code)
    if limit is not None:
        usage = read_invite_usage()
        used = get_invite_used_count(usage, code)
        if used >= limit:
            raise HTTPException(status_code=403, detail="Invite code exhausted")

        # Count this usage (only for creating new syncKey).
        consume_invite_code(code)


def extract_tasks_from_body(body: Any) -> Any:
    if isinstance(body, list):
        return body
    if isinstance(body, dict):
        tasks = body.get("tasks")
        if isinstance(tasks, list):
            return tasks
    return None


@app.get("/health")
def health() -> Dict[str, Any]:
    return {
        "ok": True,
        "time": utc_now_iso(),
        "timeBeijing": beijing_now_iso(),
        "dailyLimit": SYNC_DAILY_LIMIT,
    }


@app.get("/api/sync")
async def pull(request: Request) -> JSONResponse:
    sync_key = extract_sync_key(request)
    key_hash = sha256_hex(sync_key)
    check_and_count_request(key_hash)

    path = sync_file_path(key_hash)
    stored = read_json_file(path)
    if not stored or not isinstance(stored, dict):
        payload = {
            "schema": "demon_todolist",
            "version": 1,
            "updatedAt": utc_now_iso(),
            "serverTimeBeijing": beijing_now_iso(),
            "tasks": [],
        }
        return JSONResponse(payload)

    tasks = stored.get("tasks") if isinstance(stored.get("tasks"), list) else []
    updated_at = stored.get("updatedAt") if isinstance(stored.get("updatedAt"), str) else utc_now_iso()

    payload = {
        "schema": "demon_todolist",
        "version": 1,
        "updatedAt": updated_at,
        "serverTimeBeijing": beijing_now_iso(),
        "tasks": tasks,
    }
    return JSONResponse(payload)


@app.put("/api/sync")
async def push(request: Request) -> JSONResponse:
    sync_key = extract_sync_key(request)
    key_hash = sha256_hex(sync_key)
    check_and_count_request(key_hash)

    data_path = sync_file_path(key_hash)
    require_invite_if_creating_new_key(request, data_path)

    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    tasks = extract_tasks_from_body(body)
    if tasks is None:
        raise HTTPException(status_code=400, detail="Missing tasks")

    # Basic size guard: prevent extremely large payloads.
    raw = json.dumps({"tasks": tasks}, ensure_ascii=False)
    if len(raw.encode("utf-8")) > 512 * 1024:
        raise HTTPException(status_code=413, detail="Payload too large")

    payload = {
        "updatedAt": utc_now_iso(),
        "tasks": tasks,
    }
    atomic_write_text(data_path, json.dumps(payload, ensure_ascii=False, indent=2))
    return JSONResponse({"ok": True, "updatedAt": payload["updatedAt"], "serverTimeBeijing": beijing_now_iso()})
