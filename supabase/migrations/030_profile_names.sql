-- 030: Vor-/Nachname im Profil + Anmelde-Provider
--
-- Vorher gab es nur full_name; die Anrede war split(' ')[0]. Google liefert
-- given_name/family_name, Apple den Namen nur beim ersten Login. Jetzt:
-- eigene Spalten, Backfill, Trigger fuellt sie bei Anlage UND bei spaeteren
-- Metadaten-Updates (nativer Apple-/Google-Pfad ruft updateUser()).

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS auth_provider text;

UPDATE profiles
SET first_name = nullif(split_part(full_name, ' ', 1), ''),
    last_name  = nullif(trim(substr(full_name, length(split_part(full_name, ' ', 1)) + 1)), '')
WHERE full_name IS NOT NULL AND first_name IS NULL;

-- Namen aus den Auth-Metadaten ableiten (Google: given_name/family_name,
-- eigene Felder: first_name/last_name, sonst full_name/name splitten)
CREATE OR REPLACE FUNCTION public.names_from_meta(meta jsonb)
RETURNS TABLE (first_name text, last_name text, full_name text, avatar_url text)
LANGUAGE sql IMMUTABLE AS $$
  WITH raw AS (
    SELECT
      nullif(trim(coalesce(meta->>'first_name', meta->>'given_name', '')), '')   AS fn,
      nullif(trim(coalesce(meta->>'last_name',  meta->>'family_name', '')), '')  AS ln,
      nullif(trim(coalesce(meta->>'full_name',  meta->>'name', '')), '')         AS fulln,
      nullif(trim(coalesce(meta->>'avatar_url', meta->>'picture', '')), '')      AS av
  )
  SELECT
    coalesce(fn, nullif(split_part(fulln, ' ', 1), '')),
    coalesce(ln, nullif(trim(substr(fulln, length(split_part(fulln, ' ', 1)) + 1)), '')),
    coalesce(fulln, nullif(trim(concat_ws(' ', fn, ln)), '')),
    av
  FROM raw;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n RECORD;
BEGIN
  SELECT * INTO n FROM public.names_from_meta(coalesce(NEW.raw_user_meta_data, '{}'::jsonb));
  INSERT INTO public.profiles (id, email, full_name, first_name, last_name, avatar_url, auth_provider)
  VALUES (NEW.id, NEW.email, n.full_name, n.first_name, n.last_name, n.avatar_url,
          coalesce(NEW.raw_app_meta_data->>'provider', 'email'))
  ON CONFLICT (id) DO UPDATE SET
    email         = coalesce(profiles.email, excluded.email),
    full_name     = coalesce(profiles.full_name, excluded.full_name),
    first_name    = coalesce(profiles.first_name, excluded.first_name),
    last_name     = coalesce(profiles.last_name, excluded.last_name),
    avatar_url    = coalesce(profiles.avatar_url, excluded.avatar_url),
    auth_provider = coalesce(profiles.auth_provider, excluded.auth_provider);
  RETURN NEW;
END;
$$;

-- Spaetere Metadaten-Updates (z.B. updateUser({data:{first_name}}) nach dem
-- nativen Login) fuellen nur LEERE Profilfelder nach, ueberschreiben nie.
CREATE OR REPLACE FUNCTION public.handle_user_meta_updated()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n RECORD;
BEGIN
  IF NEW.raw_user_meta_data IS DISTINCT FROM OLD.raw_user_meta_data THEN
    SELECT * INTO n FROM public.names_from_meta(coalesce(NEW.raw_user_meta_data, '{}'::jsonb));
    UPDATE public.profiles SET
      full_name  = coalesce(full_name, n.full_name),
      first_name = coalesce(first_name, n.first_name),
      last_name  = coalesce(last_name, n.last_name),
      avatar_url = coalesce(avatar_url, n.avatar_url)
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE OF raw_user_meta_data ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_meta_updated();

SELECT 'ok_030' AS result, count(*) FILTER (WHERE first_name IS NOT NULL) AS with_first_name, count(*) AS profiles FROM profiles;
