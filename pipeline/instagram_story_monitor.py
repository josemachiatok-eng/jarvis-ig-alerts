#!/usr/bin/env python3
"""
instagram_story_monitor.py — Supabase edition v2
- Downloads new story media (images + videos) to Supabase Storage
- Purges files older than 60 days at the start of each run
- State is persisted in Supabase so ephemeral CI runners work correctly
"""

import os
import sys
import time
import base64
import pickle
import logging
import tempfile
import requests
import instaloader
from pathlib import Path
from datetime import datetime, timezone, timedelta

# ─────────────────────────────────────────────
#  CONFIGURATION
# ─────────────────────────────────────────────

IG_USERNAME          = os.environ.get("IG_USERNAME",          "memerman_016")
SESSION_B64          = os.environ.get("SESSION_B64",          "")
SUPABASE_URL         = os.environ.get("SUPABASE_URL",         "").rstrip("/")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")

STORAGE_BUCKET = "stories"
PURGE_DAYS     = 3    # delete media older than this

_default_accounts = ",".join([
    "alinta.tatana", "kenyavillascan", "0agusperez", "ana_najar15",
    "missgeobernasconi", "beamwalis", "mariam_katch", "katelynsade",
    "melinacherryy", "xyanely222", "mommyaysl", "amyq_g",
    "sienameira", "bellalui_x", "lalimlrm", "vivianacampanellaa",
    "raepiggy", "areeliferreiro_", "haidyhaven", "c.a._m.i._l.a",
    "honeyybee.bby", "honeyybee.bbx", "minminyukina", "nattimus_prime_",
    "cindyycifuentes", "dddsw1230", "_penatorres", "ufw__ma",
    "realaaliyahmiller", "shahar_leibel", "zulebalzano_", "___marettaa___",
    "camillademarie", "serpuhovitinazlata", "gigiodyssey", "rrocioloreto",
    "_amyheslop", "saint___helena", "pml1030", "lorena_cataldi",
    "itsyahgirlcb", "dani_av22", "danii__av2", "sofibande_",
    "mynameislooor", "kathylewczuk", "ashlyn.allman1", "xayslll",
    "barbie_mesi", "dead.bxbi", "albiitaaagc", "seelucy",
    "mirandagarcya", "thed0wnstairsdj", "cehbaby_", "nehaprice",
    "perks.of.being.claudia", "andreanoriega.5", "chiri_francesca", "sarahcurr",
    "iirisilea", "audryadames", "alhanapulido", "bigdaisy101",
    "shxniew", "im_notannaa", "jazmenjafar", "isabella_viana___",
    "coral.sharon", "cynthiajadebabe", "imblackwidof", "lali957xx",
    "reemarochelle", "anastasiya_kvitko", "lana_presence", "strawberrytabbyy",
    "itsluxydutch", "louisakhovanski", "iamblackwidof", "blackwidof",
    "theflirtygemini", "mikaylademaiter",
])

TARGET_ACCOUNTS = [
    a.strip() for a in
    os.environ.get("TARGET_ACCOUNTS", _default_accounts).split(",")
    if a.strip()
]

LOG_FILE = Path("/tmp/monitor.log")

# ─────────────────────────────────────────────
#  LOGGING
# ─────────────────────────────────────────────

log = logging.getLogger(__name__)
log.setLevel(logging.INFO)
fmt = logging.Formatter("%(asctime)s [%(levelname)s] %(message)s")
log.addHandler(logging.FileHandler(LOG_FILE, encoding="utf-8"))
log.addHandler(logging.StreamHandler(sys.stdout))
for h in log.handlers:
    h.setFormatter(fmt)

# ─────────────────────────────────────────────
#  SUPABASE REST HELPERS
# ─────────────────────────────────────────────

_sb_headers: dict = {}

def _init_headers():
    global _sb_headers
    _sb_headers = {
        "apikey":        SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type":  "application/json",
        "Accept":        "application/json",
    }

def fetch_state() -> dict:
    """Return {username: [story_ids]} from the account_story_state view."""
    if not SUPABASE_URL:
        return {}
    try:
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/account_story_state",
            headers=_sb_headers,
            timeout=30,
        )
        r.raise_for_status()
        return {row["username"]: row.get("story_ids") or [] for row in r.json()}
    except Exception as e:
        log.warning(f"Could not fetch state from Supabase: {e}")
        return {}

def post_alert(username: str, story_count: int, story_ids: list, new_ids: list) -> str | None:
    """Insert alert, return its id."""
    if not SUPABASE_URL:
        log.info(f"  (SUPABASE_URL not set — alert for @{username} not persisted)")
        return None
    try:
        r = requests.post(
            f"{SUPABASE_URL}/rest/v1/alerts",
            headers={**_sb_headers, "Prefer": "return=representation"},
            json={
                "username":    username,
                "story_count": story_count,
                "story_ids":   story_ids,
                "new_ids":     new_ids,
            },
            timeout=30,
        )
        r.raise_for_status()
        rows = r.json()
        alert_id = rows[0]["id"] if rows else None
        log.info(f"  [OK] Alert posted for @{username} (id={alert_id})")
        return alert_id
    except Exception as e:
        log.error(f"  [FAIL] Alert insert for @{username}: {e}")
        return None

def upsert_account(username: str):
    """Ensure the account row exists without overwriting existing tags/notes."""
    if not SUPABASE_URL:
        return
    try:
        r = requests.post(
            f"{SUPABASE_URL}/rest/v1/accounts",
            headers={**_sb_headers, "Prefer": "resolution=ignore-duplicates,return=minimal"},
            json={"username": username},
            timeout=30,
        )
        r.raise_for_status()
    except Exception as e:
        log.warning(f"  Could not upsert account @{username}: {e}")

# ─────────────────────────────────────────────
#  SUPABASE STORAGE HELPERS
# ─────────────────────────────────────────────

def upload_media(storage_path: str, data: bytes, content_type: str) -> bool:
    """Upload file bytes to Supabase Storage. Skips silently if already exists."""
    if not SUPABASE_URL:
        return False
    try:
        r = requests.post(
            f"{SUPABASE_URL}/storage/v1/object/{STORAGE_BUCKET}/{storage_path}",
            headers={
                "apikey":        SUPABASE_SERVICE_KEY,
                "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
                "Content-Type":  content_type,
            },
            data=data,
            timeout=120,
        )
        if r.status_code in (200, 201):
            return True
        if r.status_code == 409:   # already exists — that's fine
            return True
        log.warning(f"  Storage upload {storage_path}: HTTP {r.status_code} {r.text[:120]}")
        return False
    except Exception as e:
        log.warning(f"  Storage upload {storage_path}: {e}")
        return False

def record_story_file(username: str, story_id: str, alert_id: str | None,
                      storage_path: str, is_video: bool, taken_at: datetime | None):
    """Insert a story_files row (ignore duplicate story_id)."""
    if not SUPABASE_URL:
        return
    try:
        payload = {
            "username":     username,
            "story_id":     story_id,
            "storage_path": storage_path,
            "is_video":     is_video,
        }
        if alert_id:
            payload["alert_id"] = alert_id
        if taken_at:
            payload["taken_at"] = taken_at.isoformat()
        requests.post(
            f"{SUPABASE_URL}/rest/v1/story_files",
            headers={**_sb_headers, "Prefer": "resolution=ignore-duplicates,return=minimal"},
            json=payload,
            timeout=30,
        )
    except Exception as e:
        log.warning(f"  record_story_file {story_id}: {e}")

def cleanup_old_media():
    """Delete story media and DB rows older than PURGE_DAYS days."""
    if not SUPABASE_URL:
        return
    cutoff = (datetime.now(timezone.utc) - timedelta(days=PURGE_DAYS)).isoformat()
    log.info(f"Cleanup: purging files created before {cutoff[:10]}…")
    try:
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/story_files",
            params={"select": "id,storage_path", "created_at": f"lt.{cutoff}", "limit": "1000"},
            headers=_sb_headers,
            timeout=30,
        )
        files = r.json() if r.ok else []
        if not files:
            log.info("Cleanup: nothing to purge.")
            return

        paths  = [f["storage_path"] for f in files]
        id_csv = ",".join(f["id"] for f in files)

        # Delete from storage
        requests.delete(
            f"{SUPABASE_URL}/storage/v1/object/{STORAGE_BUCKET}",
            headers={
                "apikey":        SUPABASE_SERVICE_KEY,
                "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
                "Content-Type":  "application/json",
            },
            json={"prefixes": paths},
            timeout=60,
        )

        # Delete DB rows
        requests.delete(
            f"{SUPABASE_URL}/rest/v1/story_files",
            params={"id": f"in.({id_csv})"},
            headers=_sb_headers,
            timeout=30,
        )

        log.info(f"Cleanup: purged {len(files)} file(s).")
    except Exception as e:
        log.warning(f"Cleanup failed: {e}")

# ─────────────────────────────────────────────
#  SESSION
# ─────────────────────────────────────────────

def load_session(loader: instaloader.Instaloader, session_bytes: bytes):
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".session")
    tmp.write(session_bytes)
    tmp.close()
    try:
        loader.load_session_from_file(IG_USERNAME, tmp.name)
        log.info(f"[OK] Session loaded for @{IG_USERNAME}")
    except Exception:
        try:
            cookies = pickle.loads(session_bytes)
            loader.context._session.cookies.update(cookies)
            loader.context.username = IG_USERNAME
            log.info(f"[OK] Session loaded (pickle fallback) for @{IG_USERNAME}")
        except Exception as e:
            log.error(f"Failed to load session: {e}")
            os.unlink(tmp.name)
            sys.exit(1)
    os.unlink(tmp.name)

# ─────────────────────────────────────────────
#  MEDIA DOWNLOAD
# ─────────────────────────────────────────────

def download_new_items(stories, new_id_set: set) -> list:
    """
    Download media bytes for story items whose mediaid is in new_id_set.
    Returns list of dicts: story_id, data, is_video, content_type, ext, taken_at.
    """
    downloaded = []
    for story in stories:
        for item in story.get_items():
            sid = str(item.mediaid)
            if sid not in new_id_set:
                continue
            try:
                url          = item.video_url if item.is_video else item.url
                is_vid       = bool(item.is_video)
                content_type = "video/mp4" if is_vid else "image/jpeg"
                ext          = "mp4"       if is_vid else "jpg"
                taken_at     = item.date_utc.replace(tzinfo=timezone.utc) if item.date_utc else datetime.now(timezone.utc)

                log.info(f"    Downloading story item {sid} ({'video' if is_vid else 'image'})…")
                r = requests.get(url, timeout=60)
                r.raise_for_status()

                downloaded.append({
                    "story_id":     sid,
                    "data":         r.content,
                    "is_video":     is_vid,
                    "content_type": content_type,
                    "ext":          ext,
                    "taken_at":     taken_at,
                })
                size_kb = len(r.content) // 1024
                log.info(f"    Downloaded {sid} ({size_kb} KB)")
            except Exception as e:
                log.warning(f"    Could not download item {sid}: {e}")
    return downloaded

# ─────────────────────────────────────────────
#  STORY CHECK
# ─────────────────────────────────────────────

def check_stories(loader: instaloader.Instaloader, state: dict):
    total = len(TARGET_ACCOUNTS)
    for i, username in enumerate(TARGET_ACCOUNTS, 1):
        log.info(f"[{i}/{total}] Checking @{username}…")
        try:
            profile = instaloader.Profile.from_username(loader.context, username)
            stories = list(loader.get_stories(userids=[profile.userid]))

            if not stories:
                log.info("  No active stories.")
            else:
                current_ids = [
                    str(item.mediaid)
                    for story in stories
                    for item in story.get_items()
                ]

                if current_ids:
                    seen_ids = set(state.get(username, []))
                    new_ids  = [sid for sid in current_ids if sid not in seen_ids]

                    if new_ids:
                        log.info(f"  NEW: {len(new_ids)} new item(s) for @{username}")
                        upsert_account(username)

                        # Post alert first to get its id
                        alert_id = post_alert(username, len(current_ids), current_ids, new_ids)

                        # Download new media items and upload to storage
                        if SUPABASE_URL:
                            new_id_set = set(new_ids)
                            items      = download_new_items(stories, new_id_set)
                            now        = datetime.now(timezone.utc)
                            month_dir  = now.strftime("%Y/%m")

                            for item in items:
                                storage_path = f"{username}/{month_dir}/{item['story_id']}.{item['ext']}"
                                ok = upload_media(storage_path, item["data"], item["content_type"])
                                if ok:
                                    record_story_file(
                                        username     = username,
                                        story_id     = item["story_id"],
                                        alert_id     = alert_id,
                                        storage_path = storage_path,
                                        is_video     = item["is_video"],
                                        taken_at     = item["taken_at"],
                                    )
                                    log.info(f"    Stored: {storage_path}")

                        # Update local cache for this run
                        state[username] = current_ids
                    else:
                        log.info(f"  No new stories for @{username}")
                else:
                    log.info("  No story items found.")

        except instaloader.exceptions.ProfileNotExistsException:
            log.warning(f"  @{username} not found or private")
        except instaloader.exceptions.LoginRequiredException:
            log.error(f"  Login required for @{username} — refresh SESSION_B64")
        except Exception as e:
            log.error(f"  Error checking @{username}: {e}")

        if i < total:
            time.sleep(60)

# ─────────────────────────────────────────────
#  MAIN
# ─────────────────────────────────────────────

def main():
    log.info("=" * 55)
    log.info("Instagram Story Monitor v2 (with media storage)")
    log.info(f"Monitoring {len(TARGET_ACCOUNTS)} accounts")

    if not SESSION_B64:
        log.error("SESSION_B64 env var is not set.")
        sys.exit(1)

    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        log.warning("SUPABASE_URL or SUPABASE_SERVICE_KEY not set — alerts will not be persisted.")

    _init_headers()

    # Purge old media before starting new checks
    cleanup_old_media()

    try:
        session_bytes = base64.b64decode(SESSION_B64)
    except Exception as e:
        log.error(f"Failed to decode SESSION_B64: {e}")
        sys.exit(1)

    loader = instaloader.Instaloader(
        download_pictures=False,
        download_videos=False,
        download_video_thumbnails=False,
        download_geotags=False,
        download_comments=False,
        save_metadata=False,
        quiet=True,
    )
    load_session(loader, session_bytes)

    state = fetch_state()
    log.info(f"Loaded state for {len(state)} accounts from Supabase.")
    check_stories(loader, state)
    log.info("Run complete.\n")

if __name__ == "__main__":
    main()
