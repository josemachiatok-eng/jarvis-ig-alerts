-- ╔══════════════════════════════════════════════════════╗
-- ║  Instagram Story Alert Command Center — Schema       ║
-- ╚══════════════════════════════════════════════════════╝

-- ─── Extensions ───────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Tables ───────────────────────────────────────────

-- Per-account metadata: tag, display name, freeform note.
-- Tag drives the frontend colour-coding and digest grouping.
CREATE TABLE IF NOT EXISTS accounts (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  username     TEXT        UNIQUE NOT NULL,
  tag          TEXT        NOT NULL DEFAULT 'other'
                           CHECK (tag IN ('favourite', 'special', 'other')),
  display_name TEXT,
  note         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One row per story-detection event emitted by the pipeline.
-- story_ids  = all currently-active story item IDs at detection time
-- new_ids    = subset that were not seen in the previous run
-- Keeping story_ids in every row lets the account_story_state view
-- reconstruct the "last seen" set without a separate state table.
CREATE TABLE IF NOT EXISTS alerts (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  username     TEXT        NOT NULL,
  story_count  INT         NOT NULL DEFAULT 1,
  story_ids    TEXT[]      NOT NULL DEFAULT '{}',
  new_ids      TEXT[]      NOT NULL DEFAULT '{}',
  is_read      BOOLEAN     NOT NULL DEFAULT FALSE,
  is_archived  BOOLEAN     NOT NULL DEFAULT FALSE,
  note         TEXT,
  detected_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Indexes ──────────────────────────────────────────

CREATE INDEX IF NOT EXISTS alerts_username_idx    ON alerts(username);
CREATE INDEX IF NOT EXISTS alerts_unread_idx      ON alerts(is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS alerts_archived_idx    ON alerts(is_archived);
CREATE INDEX IF NOT EXISTS alerts_detected_at_idx ON alerts(detected_at DESC);
CREATE INDEX IF NOT EXISTS accounts_username_idx  ON accounts(username);
CREATE INDEX IF NOT EXISTS accounts_tag_idx       ON accounts(tag);

-- ─── updated_at trigger ───────────────────────────────

CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS accounts_updated_at ON accounts;
CREATE TRIGGER accounts_updated_at
  BEFORE UPDATE ON accounts
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ─── State view ───────────────────────────────────────
-- Pipeline reads this instead of a local state file.
-- GitHub Actions runners are ephemeral; this view persists state
-- across runs by returning the story_ids from the latest alert row
-- per account, so the pipeline knows what was already seen.

CREATE OR REPLACE VIEW account_story_state AS
SELECT DISTINCT ON (username)
  username,
  story_ids,
  detected_at
FROM alerts
ORDER BY username, detected_at DESC;

-- ─── Row Level Security ───────────────────────────────
-- Personal single-user tool: anon key gets full read/write access.
-- Tighten these policies if you expose the frontend publicly.

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_accounts"   ON accounts;
DROP POLICY IF EXISTS "anon_insert_accounts" ON accounts;
DROP POLICY IF EXISTS "anon_update_accounts" ON accounts;
DROP POLICY IF EXISTS "anon_read_alerts"     ON alerts;
DROP POLICY IF EXISTS "anon_update_alerts"   ON alerts;
DROP POLICY IF EXISTS "anon_delete_alerts"   ON alerts;

CREATE POLICY "anon_read_accounts"   ON accounts FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_accounts" ON accounts FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_accounts" ON accounts FOR UPDATE TO anon USING (true);

CREATE POLICY "anon_read_alerts"   ON alerts FOR SELECT TO anon USING (true);
CREATE POLICY "anon_update_alerts" ON alerts FOR UPDATE TO anon USING (true);
CREATE POLICY "anon_delete_alerts" ON alerts FOR DELETE TO anon USING (true);

-- The pipeline uses the service role key, which bypasses RLS entirely,
-- so no explicit INSERT policy is needed for alerts.

-- ─── Seed accounts ────────────────────────────────────
-- Pre-populate so tags can be configured before the first alert arrives.

INSERT INTO accounts (username) VALUES
  ('tan.thanyares'), ('alinta.tatana'), ('kenyavillascan'), ('0agusperez'), ('mervdamla'),
  ('bimiau'), ('ana_najar15'), ('sadietopol_'), ('iamval3ry'), ('lina.gallegos2'),
  ('kendallangel333'), ('karenmelonsxo'), ('nenabelsito'), ('houstephh'), ('zifaabdylii'),
  ('em.anne'), ('missgeobernasconi'), ('beamwalis'), ('dawnmarie.xo'), ('bobibobiqiu'),
  ('zeynep_akcm'), ('liliancouling'), ('mariam_katch'), ('faithxamaya'), ('nanceyyareli'),
  ('cali.rookey'), ('l_adriana010'), ('katelynsade'), ('emilyemikax'), ('hsueh_hsueh_tina'),
  ('malika_malika4329'), ('melinacherryy'), ('kayvivii'), ('angunmpw_m'), ('cloietapnio'),
  ('its.sindxy'), ('sijeta__'), ('xyanely222'), ('nocarblau'), ('mommyaysl'),
  ('anyabyanna'), ('ahmuay0'), ('ma3llaj'), ('amyq_g'), ('ssannatorr'),
  ('sienameira'), ('mandaamariahh_'), ('itsaiesharai'), ('bellalui_x'), ('adel_vanshi'),
  ('lalimlrm'), ('samysacci'), ('vivianacampanellaa'), ('raepiggy'), ('badgal___tt'),
  ('areeliferreiro_'), ('ginevra_malpaganti'), ('yad.iiiiiii'), ('haidyhaven'), ('c.a._m.i._l.a'),
  ('honeyybee.bby'), ('honeyybee.bbx'), ('pearlynix'), ('dominika_kn_'), ('queen.dimitrova'),
  ('minminyukina'), ('nattimus_prime_'), ('cindyycifuentes'), ('dddsw1230'), ('_penatorres'),
  ('ufw__ma'), ('realaaliyahmiller'), ('shahar_leibel'), ('maya_gorali1'), ('zulebalzano_'),
  ('___marettaa___'), ('camillademarie'), ('serpuhovitinazlata'), ('brinanadine'), ('gigiodyssey'),
  ('sk_katelynn'), ('rrocioloreto'), ('_amyheslop'), ('samantha_dube'), ('saint___helena'),
  ('charlottesantaa'), ('pml1030'), ('muskan07_officiall'), ('queenflowrox'), ('annaalush_'),
  ('lvbelen'), ('lorena_cataldi'), ('noemi123130'), ('jjjjjadaa'), ('airi_5977'),
  ('rochimoglia'), ('luvn1chole'), ('itsyahgirlcb'), ('dani_av22'), ('danii__av2'),
  ('sofibande_'), ('linagallegos3'), ('mynameislooor'), ('mariacelesteguevaraa'), ('kaenamae'),
  ('f.erika.t'), ('kathylewczuk'), ('kedibakisli'), ('sheridanrogerss'), ('angieyoussef25'),
  ('its.sri'), ('ireneeta_'), ('ashlyn.allman1'), ('ashlleydelgado'), ('ryleigh.ivyy'),
  ('xayslll'), ('barbie_mesi'), ('liordahannn'), ('noaperetss'), ('andreaperez01_'),
  ('nataliaahoyoss'), ('haliun__b__'), ('angelabarolli'), ('dead.bxbi'), ('albiitaaagc'),
  ('marusya_petkevich'), ('annabelle.karkache'), ('seelucy'), ('vale_alia_'), ('shedidwhatttttt'),
  ('trinityy.raine'), ('mirandagarcya'), ('thed0wnstairsdj'), ('the_bxst_____'), ('yourloveaura'),
  ('sqrald'), ('cehbaby_'), ('nehaprice'), ('_nvhmia'), ('777.tals'),
  ('jessicagarella'), ('suzannakurman'), ('rociiosnb'), ('rocioosnb'), ('rnzxx32'),
  ('whoisnere.e'), ('nino___aa'), ('abida._'), ('ajm_cm22'), ('perks.of.being.claudia'),
  ('andreanoriega.5'), ('maggie_tav'), ('xchloeamber_x'), ('chiri_francesca'), ('natalkagaborska'),
  ('liam_achrak'), ('latinasariixo'), ('sarigonewild'), ('its.sariiibby'), ('sariii.bby'),
  ('sariibabyy'), ('sarahcurr'), ('_wolfrx'), ('reelsophiesx'), ('waimorgan'),
  ('maddie_fulcher2'), ('iirisilea'), ('audryadames'), ('alhanapulido'), ('imlucerorios'),
  ('mo__meowwwww.w'), ('___meowwwww.w'), ('bigdaisy101'), ('liv_drake'), ('shxniew'),
  ('torii.trevino'), ('im_notannaa'), ('jazmenjafar'), ('emilyyfiore'), ('jacklyn_roper'),
  ('joelle.rebecca'), ('sincerely.pisces'), ('piaawag'), ('newnanewjaa'), ('shereen.gk_xo'),
  ('xsophiesutherland'), ('isabella_viana___'), ('sophiarinzema'), ('liorsela_'), ('coral.sharon'),
  ('xomorgan_lanexo'), ('jaylietori'), ('urcherryx'), ('lauren.pendlebury'), ('taylorcharmed'),
  ('cynthiajadebabe'), ('a.kochanius'), ('winnyluusw'), ('meriarreghini'), ('thelolabelle'),
  ('xxsarabrooksxx'), ('blackwidofhere'), ('matiimarronii'), ('danielaariibeiro'), ('imangeljessy'),
  ('jenniegextra'), ('cc_777x'), ('siluv3rr'), ('josseline_gb98'), ('hirixie'),
  ('maybakshi_'), ('camrynplaza'), ('kirbycharlottex'), ('lola.belle.bb'), ('littlemissmaddiecaddymae'),
  ('lexiiwiinters'), ('gopa.noona'), ('paigeuncaged'), ('lali957xx'), ('angeljessyy'),
  ('reemarochelle'), ('anastasiya_kvitko'), ('kngemma'), ('photography.of.memories'), ('lana_presence'),
  ('jennieg.x'), ('martina.cammara7'), ('clacull'), ('officeluxy'), ('chelsnovek'),
  ('sylviayasx'), ('strawberrytabbyy'), ('justinebean_'), ('yellz0'), ('skyeegreyy_'),
  ('itsluxydutch'), ('louisakhovanski'), ('iamblackwidof'), ('ms.sethii'), ('madelnuiztim'),
  ('blackwidof'), ('dime'), ('pandysprive'), ('federica_salvii'), ('maddiecaddymae2.0'),
  ('demetkamburoglu'), ('rileyyrawrr'), ('aprilxhills'), ('its.britneyx'), ('theflirtygemini'),
  ('lanaxpieee'), ('ornus2'), ('anabeloha'), ('mari_nabokina'), ('pavoxy'),
  ('desi.f1ora'), ('amyfabooboo'), ('lindaosorio_offi'), ('mikaylademaiter'), ('nimkguyen'),
  ('zelaltural'), ('devon.shae'), ('colleen.333')
ON CONFLICT (username) DO NOTHING;
