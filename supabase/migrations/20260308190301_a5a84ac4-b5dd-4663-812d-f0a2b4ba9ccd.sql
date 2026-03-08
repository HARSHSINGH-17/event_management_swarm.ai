
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
