-- ============================================
-- RTK Racket Circle - Database Schema
-- ============================================

-- 1. PROFILES (members)
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  gender TEXT,
  avatar_url TEXT,
  phone TEXT DEFAULT '',
  bio TEXT DEFAULT '',
  company_name TEXT DEFAULT '',
  job_title TEXT DEFAULT '',
  industry TEXT DEFAULT 'other',
  business_description TEXT DEFAULT '',
  website TEXT,
  linked_in TEXT,
  member_since DATE DEFAULT CURRENT_DATE,
  membership_tier TEXT DEFAULT 'standard',
  play_level NUMERIC,
  padel_level NUMERIC,
  family_in_rtk TEXT,
  family_photos JSONB DEFAULT '[]'::jsonb,
  rtk_competencies TEXT,
  match_interests JSONB DEFAULT '{"padelDouble": false, "padelMix": false, "tennisDouble": false, "tennisMix": false, "tennisSingle": false, "tennisSingleMix": false}',
  is_admin BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  notification_new_message BOOLEAN DEFAULT true,
  notification_new_event BOOLEAN DEFAULT true,
  notification_new_match BOOLEAN DEFAULT true,
  notification_event_update BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. EVENTS
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  location TEXT DEFAULT '',
  type TEXT DEFAULT 'social',
  max_participants INTEGER,
  created_by UUID REFERENCES profiles(id),
  is_match BOOLEAN DEFAULT false,
  sport TEXT,
  match_type TEXT,
  skill_level_min NUMERIC,
  skill_level_max NUMERIC,
  registration_deadline TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. EVENT PARTICIPANTS (many-to-many)
CREATE TABLE event_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, profile_id)
);

-- 4. MATCHES
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sport TEXT NOT NULL,
  format TEXT NOT NULL,
  status TEXT DEFAULT 'open',
  description TEXT DEFAULT '',
  date TIMESTAMPTZ NOT NULL,
  start_time TEXT,
  end_time TEXT,
  location TEXT DEFAULT '',
  level_min NUMERIC,
  level_max NUMERIC,
  max_players INTEGER DEFAULT 4,
  creator_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. MATCH PARTICIPANTS (many-to-many)
CREATE TABLE match_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(match_id, profile_id)
);

-- 6. CONVERSATIONS
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  last_message_text TEXT,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. CONVERSATION PARTICIPANTS (many-to-many)
CREATE TABLE conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  UNIQUE(conversation_id, profile_id)
);

-- 8. MESSAGES
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id),
  text TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- For now: allow all authenticated operations via anon key
-- (the app handles access control in the client)
CREATE POLICY "Allow all for profiles" ON profiles FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for events" ON events FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for event_participants" ON event_participants FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for matches" ON matches FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for match_participants" ON match_participants FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for conversations" ON conversations FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for conversation_participants" ON conversation_participants FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for messages" ON messages FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ============================================
-- REALTIME (for live messages)
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE matches;

-- ============================================
-- AUTO-UPDATE updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER events_updated_at BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER matches_updated_at BEFORE UPDATE ON matches FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- SEED DATA: Existing members
-- ============================================

INSERT INTO profiles (email, first_name, last_name, phone, bio, company_name, job_title, industry, business_description, website, member_since, membership_tier, play_level, padel_level, family_in_rtk, rtk_competencies, match_interests, is_admin, is_active) VALUES
('frederik@nielsen-consulting.dk', 'Frederik', 'Nielsen', '+45 2345 6789', 'Erfaren managementkonsulent med passion for tennis og netværk. Har spillet tennis i over 15 år og elsker at kombinere sport med professionelle relationer.', 'Nielsen Consulting', 'Managing Partner', 'consulting', 'Managementrådgivning og strategisk konsultering for mellemstore virksomheder. Specialiseret i digital transformation og organisationsudvikling.', 'https://nielsen-consulting.dk', '2020-03-15', 'premium', 3.5, 2.5, NULL, NULL, '{"padelDouble": true, "padelMix": true, "tennisDouble": true, "tennisMix": false, "tennisSingle": true, "tennisSingleMix": true}', false, true),
('anders.v@nordbank.dk', 'Anders', 'Vestergaard', '+45 3456 7890', 'Senior bankrådgiver med speciale i erhvervsfinansiering. Aktiv tennisspiller der nyder det sociale aspekt af klublivet.', 'Nordea', 'Senior Erhvervsrådgiver', 'finance', 'Erhvervsfinansiering, investeringsrådgivning og formueforvaltning for private og erhvervskunder.', NULL, '2019-06-01', 'premium', 4, 2, NULL, NULL, '{"padelDouble": false, "padelMix": false, "tennisDouble": true, "tennisMix": true, "tennisSingle": true, "tennisSingleMix": true}', false, true),
('sofie@lindqvist-law.dk', 'Sofie', 'Lindqvist', '+45 4567 8901', 'Advokat med speciale i erhvervsret og M&A. Relativt ny i tennis men elsker allerede klubmiljøet.', 'Lindqvist & Partners', 'Partner', 'legal', 'Erhvervsret, fusioner og opkøb, samt kontraktret for danske og internationale virksomheder.', 'https://lindqvist-law.dk', '2022-01-10', 'standard', 2, 1.5, NULL, NULL, '{"padelDouble": true, "padelMix": true, "tennisDouble": false, "tennisMix": true, "tennisSingle": false, "tennisSingleMix": false}', false, true),
('martin@stackflow.io', 'Martin', 'Jakobsen', '+45 5678 9012', 'Tech-iværksætter og softwareudvikler. Grundlagde StackFlow i 2018. Bruger tennis som pause fra skærmen.', 'StackFlow', 'CEO & Founder', 'technology', 'Softwareudvikling, SaaS-løsninger og IT-konsultering med fokus på cloud-baserede platforme.', 'https://stackflow.io', '2021-09-20', 'standard', 3, 3, NULL, NULL, '{"padelDouble": true, "padelMix": true, "tennisDouble": true, "tennisMix": false, "tennisSingle": true, "tennisSingleMix": true}', false, true),
('camilla@thorsen-ejendomme.dk', 'Camilla', 'Thorsen', '+45 6789 0123', 'Ejendomsmægler med over 10 års erfaring i Roskilde-området. Tennis er min foretrukne måde at netværke på.', 'Thorsen Ejendomme', 'Indehaver', 'realestate', 'Køb og salg af bolig- og erhvervsejendomme i Roskilde og omegn. Vurdering og rådgivning.', 'https://thorsen-ejendomme.dk', '2020-11-05', 'premium', 3.5, 2.5, NULL, NULL, '{"padelDouble": true, "padelMix": true, "tennisDouble": true, "tennisMix": true, "tennisSingle": false, "tennisSingleMix": false}', false, true),
('lars.eriksen@regio-hospital.dk', 'Lars', 'Eriksen', '+45 7890 1234', 'Overlæge i ortopædkirurgi. Spiller tennis for at holde mig i form og møde folk uden for hospitalet.', 'Sjællands Universitetshospital', 'Overlæge', 'healthcare', 'Ortopædkirurgi med speciale i sportsskader og ledproteser. Forskning i rehabilitering.', NULL, '2018-04-12', 'premium', 4.5, 3, NULL, NULL, '{"padelDouble": false, "padelMix": false, "tennisDouble": true, "tennisMix": false, "tennisSingle": true, "tennisSingleMix": true}', false, true),
('nadia@brightmark.dk', 'Nadia', 'Poulsen', '+45 8901 2345', 'Digital marketingekspert med fokus på sociale medier og content. Ny i tennis men hooked fra dag ét!', 'BrightMark', 'Creative Director', 'marketing', 'Digital marketing, branding, sociale medier og content creation for B2B og B2C virksomheder.', 'https://brightmark.dk', '2023-02-28', 'standard', 1.5, 2, NULL, NULL, '{"padelDouble": true, "padelMix": true, "tennisDouble": false, "tennisMix": true, "tennisSingle": false, "tennisSingleMix": false}', false, true),
('peter@andersen-skat.dk', 'Peter', 'Andersen', '+45 9012 3456', 'Statsautoriseret revisor med eget firma. Har spillet tennis hele livet og er glad for RTKs erhvervsnetværk.', 'Andersen Skat & Revision', 'Statsaut. Revisor', 'finance', 'Revision, skatterådgivning og regnskab for små og mellemstore virksomheder.', 'https://andersen-skat.dk', '2017-08-20', 'premium', 4, 3.5, NULL, NULL, '{"padelDouble": true, "padelMix": true, "tennisDouble": true, "tennisMix": true, "tennisSingle": true, "tennisSingleMix": true}', false, true),
('isabella@hotel-norden.dk', 'Isabella', 'Krüger', '+45 1234 5670', 'Hoteldirektør med passion for gastronomi og sport. Bruger netværket til at skabe forbindelser i lokalsamfundet.', 'Hotel Norden Roskilde', 'Hoteldirektør', 'hospitality', 'Hotelledelse, event-planlægning og turisme. Hotel Norden er Roskildes førende konference- og boutiquehotel.', 'https://hotel-norden.dk', '2021-05-15', 'premium', 2.5, 2, NULL, NULL, '{"padelDouble": true, "padelMix": true, "tennisDouble": false, "tennisMix": true, "tennisSingle": false, "tennisSingleMix": false}', false, true),
('thomas@berg-tech.dk', 'Thomas', 'Berg', '+45 2345 6780', 'IT-arkitekt og teknologirådgiver. Hjælper virksomheder med cloud-strategi og cybersikkerhed.', 'Berg Technology', 'CTO', 'technology', 'IT-arkitektur, cloud-migration, cybersikkerhed og teknologistrategi for erhvervskunder.', 'https://berg-tech.dk', '2022-07-01', 'standard', 3, 2.5, NULL, NULL, '{"padelDouble": true, "padelMix": true, "tennisDouble": true, "tennisMix": false, "tennisSingle": true, "tennisSingleMix": true}', false, true),
('maria@jensen-advokat.dk', 'Maria', 'Jensen', '+45 3456 7801', 'Familieretsadvokat med hjerte for pro bono arbejde. Tennis er min meditation.', 'Jensen Advokatfirma', 'Advokat', 'legal', 'Familieret, arveret og bolighandler. Personlig og nærværende juridisk rådgivning.', NULL, '2023-01-15', 'standard', 2, 1, NULL, NULL, '{"padelDouble": false, "padelMix": false, "tennisDouble": true, "tennisMix": true, "tennisSingle": false, "tennisSingleMix": false}', false, true),
('henrik@greenfield-invest.dk', 'Henrik', 'Møller', '+45 4567 8902', 'Investor og iværksætter med fokus på bæredygtige virksomheder. Tennisbanen er mit andet kontor.', 'Greenfield Invest', 'Managing Director', 'finance', 'Venturekapital og investeringer i bæredygtige startups og grøn teknologi.', 'https://greenfield-invest.dk', '2019-11-30', 'premium', 3.5, 3, NULL, NULL, '{"padelDouble": true, "padelMix": true, "tennisDouble": true, "tennisMix": false, "tennisSingle": true, "tennisSingleMix": true}', false, true),
('line@skov-arkitekter.dk', 'Line', 'Skov', '+45 5678 9023', 'Arkitekt med speciale i bæredygtigt byggeri. Ny i padel og elsker det allerede!', 'Skov Arkitekter', 'Partner', 'consulting', 'Arkitektur, byplanlægning og bæredygtigt design for bolig- og erhvervsbyggeri.', 'https://skov-arkitekter.dk', '2022-09-10', 'standard', 2.5, 3, NULL, NULL, '{"padelDouble": true, "padelMix": true, "tennisDouble": false, "tennisMix": true, "tennisSingle": false, "tennisSingleMix": false}', false, true),
('jonas@akademiet.dk', 'Jonas', 'Dahl', '+45 6789 0134', 'Gymnasielærer i matematik og fysik. Tennisinstruktør i fritiden.', 'Roskilde Gymnasium', 'Lektor', 'education', 'Undervisning i matematik og fysik på gymnasieniveau. Privat tennistræning og camps for unge.', NULL, '2018-02-01', 'standard', 4.5, 2, NULL, NULL, '{"padelDouble": false, "padelMix": false, "tennisDouble": true, "tennisMix": true, "tennisSingle": true, "tennisSingleMix": true}', false, true),
('katrine@digimed.dk', 'Katrine', 'Holm', '+45 7890 1245', 'Læge og digital sundhedsentreprenør. Arbejder på at gøre sundhedsdata mere tilgængelige.', 'DigiMed', 'CEO', 'healthcare', 'Digital sundhed, telemedicin og sundhedsapps. Fokus på patientcentreret teknologi.', 'https://digimed.dk', '2023-04-01', 'standard', 1.5, 1.5, NULL, NULL, '{"padelDouble": true, "padelMix": true, "tennisDouble": false, "tennisMix": false, "tennisSingle": false, "tennisSingleMix": false}', false, true),
('mikkel@dahl-wines.dk', 'Mikkel', 'Dahl', '+45 8901 2356', 'Vinimportør med speciale i franske og italienske vine. Arrangerer gerne vinsmagning for netværket!', 'Dahl Wines', 'Indehaver', 'hospitality', 'Import og distribution af kvalitetsvine fra Frankrig, Italien og Spanien. Vinsmagninger og events.', 'https://dahl-wines.dk', '2021-12-01', 'standard', 3, 2.5, NULL, NULL, '{"padelDouble": true, "padelMix": true, "tennisDouble": true, "tennisMix": true, "tennisSingle": false, "tennisSingleMix": false}', false, true),
('lbrus@outlook.com', 'Lars', 'B. Rasmussen', '+45 2012 3456', 'Administrator af RTK Racket Circle erhvervsnetværk.', 'RTK Racket Circle', 'Administrator', 'other', 'Administration og drift af RTK Racket Circle erhvervsnetværket.', NULL, '2024-01-01', 'standard', NULL, NULL, NULL, NULL, '{"padelDouble": false, "padelMix": false, "tennisDouble": false, "tennisMix": false, "tennisSingle": false, "tennisSingleMix": false}', true, true);
