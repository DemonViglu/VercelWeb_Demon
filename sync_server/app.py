import hashlib
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


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


SYNC_DAILY_LIMIT = get_env_int("SYNC_DAILY_LIMIT", 50)
SYNC_DATA_DIR = Path(os.environ.get("SYNC_DATA_DIR", "./data")).resolve()
SYNC_ALLOW_ORIGINS = os.environ.get("SYNC_ALLOW_ORIGINS", "*")
SYNC_INVITE_CODES_RAW = os.environ.get("SYNC_INVITE_CODES", "")
SYNC_INVITE_CODES_FILE = Path(os.environ.get("SYNC_INVITE_CODES_FILE", "./invite_codes.txt")).resolve()


def parse_invite_codes(raw: str) -> set:
    text = (raw or "").strip()
    if not text:
        return set()
    return {c.strip() for c in text.split(",") if c.strip()}


def load_invite_codes() -> set:
    codes = set()

    # 1) Local file (preferred for personal/local deployment)
    try:
        if SYNC_INVITE_CODES_FILE.exists() and SYNC_INVITE_CODES_FILE.is_file():
            for line in SYNC_INVITE_CODES_FILE.read_text(encoding="utf-8").splitlines():
                s = line.strip()
                if not s or s.startswith("#"):
                    continue
                for part in s.replace("\t", " ").split(" "):
                    for token in part.split(","):
                        t = token.strip()
                        if t:
                            codes.add(t)
    except Exception:
        # If the file is unreadable, ignore it and fall back to env var.
        pass

    # 2) Env var fallback (comma-separated)
    codes |= parse_invite_codes(SYNC_INVITE_CODES_RAW)
    return codes


def get_invite_codes() -> set:
    # Load dynamically so local edits to invite_codes.txt can take effect without restart.
    return load_invite_codes()

app = FastAPI()

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
    if len(key) < 16 or len(key) > 128:
        raise HTTPException(status_code=401, detail="Invalid syncKey (length must be 16-128)")
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


def extract_invite_code(request: Request) -> str:
    return (request.headers.get("x-invite-code") or "").strip()


def require_invite_if_creating_new_key(request: Request, data_path: Path) -> None:
    invite_codes = get_invite_codes()
    if not invite_codes:
        return
    if data_path.exists():
        return

    code = extract_invite_code(request)
    if not code:
        raise HTTPException(status_code=403, detail="Invite code required")
    if code not in invite_codes:
        raise HTTPException(status_code=403, detail="Invalid invite code")


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
            "tasks": [],
        }
        return JSONResponse(payload)

    tasks = stored.get("tasks") if isinstance(stored.get("tasks"), list) else []
    updated_at = stored.get("updatedAt") if isinstance(stored.get("updatedAt"), str) else utc_now_iso()

    payload = {
        "schema": "demon_todolist",
        "version": 1,
        "updatedAt": updated_at,
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
    return JSONResponse({"ok": True, "updatedAt": payload["updatedAt"]})
