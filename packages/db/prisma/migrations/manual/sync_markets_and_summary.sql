-- Sincroniza schema con el nuevo diseño:
--   operating_countries: String[] -> String?   (narrativa libre)
--   operating_countries_suggested: String[] -> String?
--   onboarding_summary: Json?   (nuevo campo)
-- Sin usuarios reales → aceptamos perder datos convirtiendo array a texto concatenado.

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS onboarding_summary jsonb;

ALTER TABLE public.projects
  ALTER COLUMN operating_countries DROP DEFAULT;

ALTER TABLE public.projects
  ALTER COLUMN operating_countries TYPE text
    USING (
      CASE
        WHEN operating_countries IS NULL THEN NULL
        WHEN cardinality(operating_countries) = 0 THEN NULL
        ELSE array_to_string(operating_countries, ', ')
      END
    );

ALTER TABLE public.projects
  ALTER COLUMN operating_countries_suggested DROP DEFAULT;

ALTER TABLE public.projects
  ALTER COLUMN operating_countries_suggested TYPE text
    USING (
      CASE
        WHEN operating_countries_suggested IS NULL THEN NULL
        WHEN cardinality(operating_countries_suggested) = 0 THEN NULL
        ELSE array_to_string(operating_countries_suggested, ', ')
      END
    );
