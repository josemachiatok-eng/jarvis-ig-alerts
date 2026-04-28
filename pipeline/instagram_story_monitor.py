#!/usr/bin/env python3
"""
instagram_story_monitor.py — Supabase edition
POSTs new story alerts to Supabase instead of sending email.
State is persisted in Supabase so ephemeral CI runners work correctly
(the original /tmp/story_state.json was lost between every GitHub Actions run).
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

# ─────────────────────────────────────────────
#  CONFIGURATION
# ─────────────────────────────────────────────

IG_USERNAME          = os.environ.get("IG_USERNAME",          "realedmscene")
SESSION_B64          = os.environ.get("SESSION_B64",          "")
SUPABASE_URL         = os.environ.get("SUPABASE_URL",         "").rstrip("/")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")

_default_accounts = ",".join([
    "tan.thanyares", "alinta.tatana", "kenyavillascan", "0agusperez", "mervdamla",
    "bimiau", "ana_najar15", "sadietopol_", "iamval3ry", "lina.gallegos2",
    "kendallangel333", "karenmelonsxo", "nenabelsito", "houstephh", "zifaabdylii",
    "em.anne", "missgeobernasconi", "beamwalis", "dawnmarie.xo", "bobibobiqiu",
    "zeynep_akcm", "liliancouling", "mariam_katch", "faithxamaya", "nanceyyareli",
    "cali.rookey", "l_adriana010", "katelynsade", "emilyemikax", "hsueh_hsueh_tina",
    "malika_malika4329", "melinacherryy", "kayvivii", "angunmpw_m", "cloietapnio",
    "its.sindxy", "sijeta__", "xyanely222", "nocarblau", "mommyaysl",
    "anyabyanna", "ahmuay0", "ma3llaj", "amyq_g", "ssannatorr",
    "sienameira", "mandaamariahh_", "itsaiesharai", "bellalui_x", "adel_vanshi",
    "lalimlrm", "samysacci", "vivianacampanellaa", "raepiggy", "badgal___tt",
    "areeliferreiro_", "ginevra_malpaganti", "yad.iiiiiii", "haidyhaven", "c.a._m.i._l.a",
    "honeyybee.bby", "honeyybee.bbx", "pearlynix", "dominika_kn_", "queen.dimitrova",
    "minminyukina", "nattimus_prime_", "cindyycifuentes", "dddsw1230", "_penatorres",
    "ufw__ma", "realaaliyahmiller", "shahar_leibel", "maya_gorali1", "zulebalzano_",
    "___marettaa___", "camillademarie", "serpuhovitinazlata", "brinanadine", "gigiodyssey",
    "sk_katelynn", "rrocioloreto", "_amyheslop", "samantha_dube", "saint___helena",
    "charlottesantaa", "pml1030", "muskan07_officiall", "queenflowrox", "annaalush_",
    "lvbelen", "lorena_cataldi", "noemi123130", "jjjjjadaa", "airi_5977",
    "rochimoglia", "luvn1chole", "itsyahgirlcb", "dani_av22", "danii__av2",
    "sofibande_", "linagallegos3", "mynameislooor", "mariacelesteguevaraa", "kaenamae",
    "f.erika.t", "kathylewczuk", "kedibakisli", "sheridanrogerss", "angieyoussef25",
    "its.sri", "ireneeta_", "ashlyn.allman1", "ashlleydelgado", "ryleigh.ivyy",
    "xayslll", "barbie_mesi", "liordahannn", "noaperetss", "andreaperez01_",
    "nataliaahoyoss", "haliun__b__", "angelabarolli", "dead.bxbi", "albiitaaagc",
    "marusya_petkevich", "annabelle.karkache", "seelucy", "vale_alia_", "shedidwhatttttt",
    "trinityy.raine", "mirandagarcya", "thed0wnstairsdj", "the_bxst_____", "yourloveaura",
    "sqrald", "cehbaby_", "nehaprice", "_nvhmia", "777.tals",
    "jessicagarella", "suzannakurman", "rociiosnb", "rocioosnb", "rnzxx32",
    "whoisnere.e", "nino___aa", "abida._", "ajm_cm22", "perks.of.being.claudia",
    "andreanoriega.5", "maggie_tav", "xchloeamber_x", "chiri_francesca", "natalkagaborska",
    "liam_achrak", "latinasariixo", "sarigonewild", "its.sariiibby", "sariii.bby",
    "sariibabyy", "sarahcurr", "_wolfrx", "reelsophiesx", "waimorgan",
    "maddie_fulcher2", "iirisilea", "audryadames", "alhanapulido", "imlucerorios",
    "mo__meowwwww.w", "___meowwwww.w", "bigdaisy101", "liv_drake", "shxniew",
    "torii.trevino", "im_notannaa", "jazmenjafar", "emilyyfiore", "jacklyn_roper",
    "joelle.rebecca", "sincerely.pisces", "piaawag", "newnanewjaa", "shereen.gk_xo",
    "xsophiesutherland", "isabella_viana___", "sophiarinzema", "liorsela_", "coral.sharon",
    "xomorgan_lanexo", "jaylietori", "urcherryx", "lauren.pendlebury", "taylorcharmed",
    "cynthiajadebabe", "a.kochanius", "winnyluusw", "meriarreghini", "thelolabelle",
    "xxsarabrooksxx", "blackwidofhere", "matiimarronii", "danielaariibeiro", "imangeljessy",
    "jenniegextra", "cc_777x", "siluv3rr", "josseline_gb98", "hirixie",
    "maybakshi_", "camrynplaza", "kirbycharlottex", "lola.belle.bb", "littlemissmaddiecaddymae",
    "lexiiwiinters", "gopa.noona", "paigeuncaged", "lali957xx", "angeljessyy",
    "reemarochelle", "anastasiya_kvitko", "kngemma", "photography.of.memories", "lana_presence",
    "jennieg.x", "martina.cammara7", "clacull", "officeluxy", "chelsnovek",
    "sylviayasx", "strawberrytabbyy", "justinebean_", "yellz0", "skyeegreyy_",
    "itsluxydutch", "louisakhovanski", "iamblackwidof", "ms.sethii", "madelnuiztim",
    "blackwidof", "dime", "pandysprive", "federica_salvii", "maddiecaddymae2.0",
    "demetkamburoglu", "rileyyrawrr", "aprilxhills", "its.britneyx", "theflirtygemini",
    "lanaxpieee", "ornus2", "anabeloha", "mari_nabokina", "pavoxy",
    "desi.f1ora", "amyfabooboo", "lindaosorio_offi", "mikaylademaiter", "nimkguyen",
    "zelaltural", "devon.shae", "colleen.333",
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
#  SUPABASE HELPERS
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

def post_alert(username: str, story_count: int, story_ids: list, new_ids: list):
    if not SUPABASE_URL:
        log.info(f"  (SUPABASE_URL not set — alert for @{username} not persisted)")
        return
    try:
        r = requests.post(
            f"{SUPABASE_URL}/rest/v1/alerts",
            headers={**_sb_headers, "Prefer": "return=minimal"},
            json={
                "username":    username,
                "story_count": story_count,
                "story_ids":   story_ids,
                "new_ids":     new_ids,
            },
            timeout=30,
        )
        r.raise_for_status()
        log.info(f"  [OK] Alert posted to Supabase for @{username}")
    except Exception as e:
        log.error(f"  [FAIL] Supabase insert for @{username}: {e}")

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
#  STORY CHECK
# ─────────────────────────────────────────────

def check_stories(loader: instaloader.Instaloader, state: dict):
    total = len(TARGET_ACCOUNTS)
    for i, username in enumerate(TARGET_ACCOUNTS, 1):
        log.info(f"[{i}/{total}] Checking @{username}...")
        try:
            profile = instaloader.Profile.from_username(loader.context, username)
            stories = list(loader.get_stories(userids=[profile.userid]))

            if not stories:
                log.info(f"  No active stories.")
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
                        post_alert(username, len(current_ids), current_ids, new_ids)
                        # Update local cache so subsequent accounts in this run
                        # don't re-alert if the state view hasn't refreshed yet.
                        state[username] = current_ids
                    else:
                        log.info(f"  No new stories for @{username}")
                else:
                    log.info(f"  No story items found for @{username}")

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
    log.info("Instagram Story Monitor (Supabase edition)")
    log.info(f"Monitoring {len(TARGET_ACCOUNTS)} accounts")

    if not SESSION_B64:
        log.error("SESSION_B64 env var is not set.")
        sys.exit(1)

    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        log.warning("SUPABASE_URL or SUPABASE_SERVICE_KEY not set — alerts will not be persisted.")

    _init_headers()

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
