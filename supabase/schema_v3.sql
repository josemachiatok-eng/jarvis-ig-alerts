-- schema_v3.sql
-- Run in Supabase SQL Editor → New Query

-- 1. New account columns
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS is_pinned    boolean NOT NULL DEFAULT false;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS is_paused    boolean NOT NULL DEFAULT false;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS is_watched   boolean NOT NULL DEFAULT false;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS permanent_note text;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS collection   text;

-- 2. Alert priority
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'normal';
ALTER TABLE alerts DROP CONSTRAINT IF EXISTS alerts_priority_check;
ALTER TABLE alerts ADD  CONSTRAINT alerts_priority_check
  CHECK (priority IN ('urgent', 'normal', 'low'));

-- 3. Monitored accounts table (drives pipeline + Account Management UI)
CREATE TABLE IF NOT EXISTS monitored_accounts (
  username  text        PRIMARY KEY,
  is_active boolean     NOT NULL DEFAULT true,
  added_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE monitored_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "aal2 select monitored_accounts" ON monitored_accounts
  FOR SELECT TO authenticated USING ((auth.jwt() ->> 'aal') = 'aal2');
CREATE POLICY "aal2 all monitored_accounts" ON monitored_accounts
  FOR ALL TO authenticated
  USING ((auth.jwt() ->> 'aal') = 'aal2')
  WITH CHECK ((auth.jwt() ->> 'aal') = 'aal2');
CREATE POLICY "service role monitored_accounts" ON monitored_accounts
  FOR SELECT TO service_role USING (true);

-- 4. Seed monitored_accounts from the initial 82-account list
INSERT INTO monitored_accounts (username) VALUES
  ('alinta.tatana'),('kenyavillascan'),('0agusperez'),('ana_najar15'),
  ('missgeobernasconi'),('beamwalis'),('mariam_katch'),('katelynsade'),
  ('melinacherryy'),('xyanely222'),('mommyaysl'),('amyq_g'),
  ('sienameira'),('bellalui_x'),('lalimlrm'),('vivianacampanellaa'),
  ('raepiggy'),('areeliferreiro_'),('haidyhaven'),('c.a._m.i._l.a'),
  ('honeyybee.bby'),('honeyybee.bbx'),('minminyukina'),('nattimus_prime_'),
  ('cindyycifuentes'),('dddsw1230'),('_penatorres'),('ufw__ma'),
  ('realaaliyahmiller'),('shahar_leibel'),('zulebalzano_'),('___marettaa___'),
  ('camillademarie'),('serpuhovitinazlata'),('gigiodyssey'),('rrocioloreto'),
  ('_amyheslop'),('saint___helena'),('pml1030'),('lorena_cataldi'),
  ('itsyahgirlcb'),('dani_av22'),('danii__av2'),('sofibande_'),
  ('mynameislooor'),('kathylewczuk'),('ashlyn.allman1'),('xayslll'),
  ('barbie_mesi'),('dead.bxbi'),('albiitaaagc'),('seelucy'),
  ('mirandagarcya'),('thed0wnstairsdj'),('cehbaby_'),('nehaprice'),
  ('perks.of.being.claudia'),('andreanoriega.5'),('chiri_francesca'),('sarahcurr'),
  ('iirisilea'),('audryadames'),('alhanapulido'),('bigdaisy101'),
  ('shxniew'),('im_notannaa'),('jazmenjafar'),('isabella_viana___'),
  ('coral.sharon'),('cynthiajadebabe'),('imblackwidof'),('lali957xx'),
  ('reemarochelle'),('anastasiya_kvitko'),('lana_presence'),('strawberrytabbyy'),
  ('itsluxydutch'),('louisakhovanski'),('iamblackwidof'),('blackwidof'),
  ('theflirtygemini'),('mikaylademaiter')
ON CONFLICT DO NOTHING;
