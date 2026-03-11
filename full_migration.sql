-- ============================================================
-- FULL MIGRATION v2 - Fixed email_logs conflict
-- Paste this into: https://supabase.com/dashboard/project/srkkltoooxzdtvqwypay/sql/new
-- ============================================================

-- Step 1: Shared trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Step 2: participants
CREATE TABLE IF NOT EXISTS public.participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  team_name TEXT,
  college TEXT,
  phone TEXT,
  segment TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='participants' AND policyname='anon_select_participants') THEN
    CREATE POLICY anon_select_participants ON public.participants FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='participants' AND policyname='anon_insert_participants') THEN
    CREATE POLICY anon_insert_participants ON public.participants FOR INSERT TO anon WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='participants' AND policyname='anon_update_participants') THEN
    CREATE POLICY anon_update_participants ON public.participants FOR UPDATE TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='participants' AND policyname='anon_delete_participants') THEN
    CREATE POLICY anon_delete_participants ON public.participants FOR DELETE TO anon USING (true);
  END IF;
END $$;
CREATE OR REPLACE TRIGGER update_participants_updated_at
  BEFORE UPDATE ON public.participants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_participants_team    ON public.participants (team_name);
CREATE INDEX IF NOT EXISTS idx_participants_college ON public.participants (college);
CREATE INDEX IF NOT EXISTS idx_participants_segment ON public.participants (segment);

-- Step 3: speakers
CREATE TABLE IF NOT EXISTS public.speakers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  bio text,
  email text,
  topic text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.speakers ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='speakers' AND policyname='anon_all_speakers') THEN
    CREATE POLICY anon_all_speakers ON public.speakers USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Step 4: rooms
CREATE TABLE IF NOT EXISTS public.rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  capacity integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='rooms' AND policyname='anon_all_rooms') THEN
    CREATE POLICY anon_all_rooms ON public.rooms USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Step 5: sessions
CREATE TABLE IF NOT EXISTS public.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  speaker_id uuid REFERENCES public.speakers(id) ON DELETE SET NULL,
  room_id uuid REFERENCES public.rooms(id) ON DELETE SET NULL,
  start_time timestamptz,
  end_time timestamptz,
  duration_minutes integer NOT NULL DEFAULT 60,
  status text NOT NULL DEFAULT 'unscheduled',
  has_conflict boolean NOT NULL DEFAULT false,
  conflict_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='sessions' AND policyname='anon_all_sessions') THEN
    CREATE POLICY anon_all_sessions ON public.sessions USING (true) WITH CHECK (true);
  END IF;
END $$;
CREATE OR REPLACE TRIGGER update_sessions_updated_at
  BEFORE UPDATE ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Step 6: email_campaigns
CREATE TABLE IF NOT EXISTS public.email_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_template text NOT NULL,
  body_template text NOT NULL,
  event_name text NOT NULL DEFAULT 'Event',
  status text NOT NULL DEFAULT 'draft',
  total_recipients int NOT NULL DEFAULT 0,
  sent_count int NOT NULL DEFAULT 0,
  failed_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='email_campaigns' AND policyname='anon_all_email_campaigns') THEN
    CREATE POLICY anon_all_email_campaigns ON public.email_campaigns USING (true) WITH CHECK (true);
  END IF;
END $$;
CREATE OR REPLACE TRIGGER update_email_campaigns_updated_at
  BEFORE UPDATE ON public.email_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Step 7: email_logs (simple version - no FK to keep it independent)
CREATE TABLE IF NOT EXISTS public.email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  timestamp timestamptz NOT NULL DEFAULT now(),
  error_message text
);
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='email_logs' AND policyname='anon_all_email_logs') THEN
    CREATE POLICY anon_all_email_logs ON public.email_logs USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Step 8: generated_posts
CREATE TABLE IF NOT EXISTS public.generated_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform text NOT NULL,
  caption text,
  hashtags text[],
  suggested_time text,
  image_url text,
  scheduled_time timestamptz,
  status text NOT NULL DEFAULT 'generated',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.generated_posts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='generated_posts' AND policyname='anon_all_generated_posts') THEN
    CREATE POLICY anon_all_generated_posts ON public.generated_posts USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Step 9: agent_logs
CREATE TABLE IF NOT EXISTS public.agent_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  platform text,
  timestamp timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.agent_logs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='agent_logs' AND policyname='anon_all_agent_logs') THEN
    CREATE POLICY anon_all_agent_logs ON public.agent_logs USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Done! All 8 tables created.
SELECT 'Migration complete ✅' as status;
