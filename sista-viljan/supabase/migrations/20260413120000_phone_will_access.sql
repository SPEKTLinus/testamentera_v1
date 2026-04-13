-- Tracks how many times a phone number has started the will flow (abuse limit).
-- Run in Supabase SQL editor or via CLI. Service role calls reserve_will_start from the app.

CREATE TABLE IF NOT EXISTS public.phone_will_access (
  phone_normalized text PRIMARY KEY,
  will_starts integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.phone_will_access ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.reserve_will_start(p_phone text, p_max integer)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count integer;
BEGIN
  IF p_max < 1 THEN
    RETURN json_build_object('ok', false, 'error', 'invalid_max');
  END IF;

  INSERT INTO public.phone_will_access AS t (phone_normalized, will_starts)
  VALUES (p_phone, 1)
  ON CONFLICT (phone_normalized) DO UPDATE
  SET will_starts = t.will_starts + 1,
      updated_at = now()
  RETURNING will_starts INTO new_count;

  IF new_count > p_max THEN
    UPDATE public.phone_will_access
    SET will_starts = will_starts - 1,
        updated_at = now()
    WHERE phone_normalized = p_phone;
    RETURN json_build_object('ok', false, 'error', 'limit_reached', 'max', p_max);
  END IF;

  RETURN json_build_object('ok', true, 'count', new_count);
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_will_start(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reserve_will_start(text, integer) TO service_role;
