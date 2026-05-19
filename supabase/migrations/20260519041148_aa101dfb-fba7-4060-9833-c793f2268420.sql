
-- Create admin user lgramirodecampos@gmail.com / 123456
DO $$
DECLARE
  _uid uuid;
BEGIN
  SELECT id INTO _uid FROM auth.users WHERE email = 'lgramirodecampos@gmail.com';
  IF _uid IS NULL THEN
    _uid := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_super_admin
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', _uid, 'authenticated', 'authenticated',
      'lgramirodecampos@gmail.com', crypt('123456', gen_salt('bf')),
      now(), now(), now(),
      jsonb_build_object('provider','email','providers',ARRAY['email']),
      jsonb_build_object('role','admin','full_name','Admin'),
      false
    );
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), _uid, jsonb_build_object('sub', _uid::text, 'email','lgramirodecampos@gmail.com'),
      'email', _uid::text, now(), now(), now());
  ELSE
    UPDATE auth.users SET encrypted_password = crypt('123456', gen_salt('bf')), email_confirmed_at = COALESCE(email_confirmed_at, now()) WHERE id = _uid;
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (_uid, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
END $$;
