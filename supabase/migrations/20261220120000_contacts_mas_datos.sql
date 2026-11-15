CREATE TABLE IF NOT EXISTS public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  full_name text NOT NULL,
  email text,
  company text,
  title text,
  source text,
  channel text,
  stage text NOT NULL DEFAULT 'new',
  notes text,
  is_sample boolean NOT NULL DEFAULT false,
  last_activity_on date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'contacts') THEN
    CREATE POLICY "contacts_members_all" ON public.contacts
      FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.org_members m WHERE m.org_id = contacts.org_id AND m.user_id = auth.uid()))
      WITH CHECK (EXISTS (SELECT 1 FROM public.org_members m WHERE m.org_id = contacts.org_id AND m.user_id = auth.uid()));
  END IF;
END $$;

ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS document text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS estimated_value numeric;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS next_follow_up_on date;
