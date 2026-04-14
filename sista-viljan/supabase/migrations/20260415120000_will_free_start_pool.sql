-- Global pool: varje såld testamentebetalning fyller på (antal via app, standard +20).
-- Första "start testamente" per nytt mobilnummer drar 1 från poolen; återkommande samma nummer drar inte.

CREATE TABLE IF NOT EXISTS public.will_free_start_pool (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  balance integer NOT NULL DEFAULT 50,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.will_free_start_pool (id, balance)
VALUES (1, 50)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.grant_will_free_slots(p_n integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_n IS NULL OR p_n < 1 THEN
    RETURN;
  END IF;
  INSERT INTO public.will_free_start_pool (id, balance)
  VALUES (1, p_n)
  ON CONFLICT (id) DO UPDATE
  SET balance = will_free_start_pool.balance + p_n,
      updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.grant_will_free_slots(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.grant_will_free_slots(integer) TO service_role;

CREATE OR REPLACE FUNCTION public.reserve_will_start(p_phone text, p_max integer)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count integer;
  prev_starts integer;
  new_bal integer;
BEGIN
  IF p_max < 1 THEN
    RETURN json_build_object('ok', false, 'error', 'invalid_max');
  END IF;

  SELECT will_starts INTO prev_starts
  FROM public.phone_will_access
  WHERE phone_normalized = p_phone
  FOR UPDATE;

  IF NOT FOUND THEN
    UPDATE public.will_free_start_pool
    SET balance = balance - 1,
        updated_at = now()
    WHERE id = 1
      AND balance >= 1
    RETURNING balance INTO new_bal;

    IF new_bal IS NULL THEN
      RETURN json_build_object('ok', false, 'error', 'pool_empty');
    END IF;
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
