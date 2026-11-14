CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id uuid NOT NULL,
  key text NOT NULL,
  values jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, key)
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_preferences' AND policyname = 'user_preferences_select_own') THEN
    CREATE POLICY user_preferences_select_own ON public.user_preferences
      FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_preferences' AND policyname = 'user_preferences_insert_own') THEN
    CREATE POLICY user_preferences_insert_own ON public.user_preferences
      FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_preferences' AND policyname = 'user_preferences_update_own') THEN
    CREATE POLICY user_preferences_update_own ON public.user_preferences
      FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_preferences' AND policyname = 'user_preferences_delete_own') THEN
    CREATE POLICY user_preferences_delete_own ON public.user_preferences
      FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;
