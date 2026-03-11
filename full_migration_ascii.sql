
-- Create participants table
CREATE TABLE public.participants (
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

-- Enable RLS
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to manage participants (organizer tool)
CREATE POLICY "Authenticated users can view participants"
  ON public.participants FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert participants"
  ON public.participants FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update participants"
  ON public.participants FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete participants"
  ON public.participants FOR DELETE
  TO authenticated
  USING (true);

-- Also allow anon access for demo/dev purposes
CREATE POLICY "Anon users can view participants"
  ON public.participants FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon users can insert participants"
  ON public.participants FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon users can update participants"
  ON public.participants FOR UPDATE
  TO anon
  USING (true);

CREATE POLICY "Anon users can delete participants"
  ON public.participants FOR DELETE
  TO anon
  USING (true);

-- Timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_participants_updated_at
  BEFORE UPDATE ON public.participants
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index for search
CREATE INDEX idx_participants_name ON public.participants USING GIN (to_tsvector('english', name));
CREATE INDEX idx_participants_team ON public.participants (team_name);
CREATE INDEX idx_participants_college ON public.participants (college);
CREATE INDEX idx_participants_segment ON public.participants (segment);

-- Email campaigns table
CREATE TABLE public.email_campaigns (
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

-- Email logs table
CREATE TABLE public.email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.email_campaigns(id) ON DELETE CASCADE NOT NULL,
  participant_id uuid REFERENCES public.participants(id) ON DELETE CASCADE NOT NULL,
  participant_name text NOT NULL,
  participant_email text,
  personalized_subject text,
  personalized_body text,
  status text NOT NULL DEFAULT 'pending',
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Policies for email_campaigns
CREATE POLICY "Anyone can view campaigns" ON public.email_campaigns FOR SELECT USING (true);
CREATE POLICY "Anyone can insert campaigns" ON public.email_campaigns FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update campaigns" ON public.email_campaigns FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete campaigns" ON public.email_campaigns FOR DELETE USING (true);

-- Policies for email_logs
CREATE POLICY "Anyone can view email logs" ON public.email_logs FOR SELECT USING (true);
CREATE POLICY "Anyone can insert email logs" ON public.email_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update email logs" ON public.email_logs FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete email logs" ON public.email_logs FOR DELETE USING (true);

-- Trigger for updated_at on campaigns
CREATE TRIGGER update_email_campaigns_updated_at
  BEFORE UPDATE ON public.email_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Speakers table
CREATE TABLE public.speakers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  bio text,
  email text,
  topic text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.speakers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view speakers" ON public.speakers FOR SELECT USING (true);
CREATE POLICY "Anyone can insert speakers" ON public.speakers FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update speakers" ON public.speakers FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete speakers" ON public.speakers FOR DELETE USING (true);

-- Rooms table
CREATE TABLE public.rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  capacity integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view rooms" ON public.rooms FOR SELECT USING (true);
CREATE POLICY "Anyone can insert rooms" ON public.rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update rooms" ON public.rooms FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete rooms" ON public.rooms FOR DELETE USING (true);

-- Sessions table
CREATE TABLE public.sessions (
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
CREATE POLICY "Anyone can view sessions" ON public.sessions FOR SELECT USING (true);
CREATE POLICY "Anyone can insert sessions" ON public.sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update sessions" ON public.sessions FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete sessions" ON public.sessions FOR DELETE USING (true);

CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Generated Posts table
CREATE TABLE public.generated_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform text NOT NULL,
  caption text,
  image_url text,
  scheduled_time timestamptz,
  status text NOT NULL DEFAULT 'generated', -- generated, scheduled, published
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.generated_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view generated_posts" ON public.generated_posts FOR SELECT USING (true);
CREATE POLICY "Anyone can insert generated_posts" ON public.generated_posts FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update generated_posts" ON public.generated_posts FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete generated_posts" ON public.generated_posts FOR DELETE USING (true);

-- Agent Logs table
CREATE TABLE public.agent_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  platform text,
  timestamp timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view agent_logs" ON public.agent_logs FOR SELECT USING (true);
CREATE POLICY "Anyone can insert agent_logs" ON public.agent_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update agent_logs" ON public.agent_logs FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete agent_logs" ON public.agent_logs FOR DELETE USING (true);

-- Email Logs table
CREATE TABLE IF NOT EXISTS public.email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  status text NOT NULL, -- sent, failed
  timestamp timestamptz NOT NULL DEFAULT now(),
  error_message text
);

ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view email_logs" ON public.email_logs FOR SELECT USING (true);
CREATE POLICY "Anyone can insert email_logs" ON public.email_logs FOR INSERT WITH CHECK (true);
