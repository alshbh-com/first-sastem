DO $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id
  FROM public.profiles
  WHERE login_code = '01019435080' OR phone = '01019435080'
  LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    DELETE FROM public.user_roles
    WHERE user_id = v_user_id
      AND role IN ('owner', 'admin', 'courier', 'office', 'branch');

    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'moderator')
    ON CONFLICT (user_id, role) DO NOTHING;

    DELETE FROM public.user_permissions
    WHERE user_id = v_user_id;
  END IF;
END $$;