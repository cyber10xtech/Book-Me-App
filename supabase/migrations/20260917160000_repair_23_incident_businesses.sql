-- Migration: 20260917160000_repair_23_incident_businesses.sql
-- Description: Controlled repair of the 23 business accounts trapped with role='customer'
-- Incident: INC_20260908_ONBOARDING_ROLE_TRAP
-- Target Environment: Staging/Production (PENDING FINAL APPROVAL)

BEGIN;

-- 1. Safety Gate Assertion: Verify exact allowlist count
DO $$
DECLARE
  v_eligible_count integer;
  v_conflicting_count integer;
BEGIN
  SELECT count(*) INTO v_eligible_count
  FROM public.profiles p
  WHERE p.user_id IN (
    'c2a76410-be7b-432e-ad63-9a12ff82ed5a'::uuid,
    'ba842990-7e2b-4b58-8cee-fd046f1b999e'::uuid,
    '55ed3494-a005-46c6-abec-2e68756b7f83'::uuid,
    '38e4f752-dad8-4909-b6ac-970619d832ae'::uuid,
    'ade4c739-e75c-4a55-afae-ca27a2b0552d'::uuid,
    '9887d0d7-450e-41da-9d71-35055594e233'::uuid,
    '067cfdf6-9781-4bd1-92b0-e2ca515615dd'::uuid,
    'c32f6535-5507-4581-80ee-e48e2218beb7'::uuid,
    '8e921cbb-4117-4f2a-85ea-3b27acadced6'::uuid,
    'c53e8e35-a3c1-45da-bc23-a94de1e9d6a3'::uuid,
    '647815d1-8d94-4c6e-b889-89af2551bf2d'::uuid,
    'ac5c556c-0900-4014-8507-24e75ba000e5'::uuid,
    '0fd5564b-75cd-419a-be14-200c902bd91e'::uuid,
    'e24776a0-4c42-4f84-9e71-c1e055084c2d'::uuid,
    'f9fc5777-403c-4ec3-9c05-85fc7569126f'::uuid,
    '4320b615-d0e1-4b36-94bf-d75f5420bb00'::uuid,
    '01036929-efdb-48fe-ac6b-c578baed5fe5'::uuid,
    'f452425c-b8fa-4526-be11-430ad7f3aff1'::uuid,
    'a2518ca2-76d4-4ce6-a8ca-d68e46957ba3'::uuid,
    '34cd9f4b-c49f-43a3-8206-a25627d1bfb8'::uuid,
    '25833089-0b8e-46b1-a4bc-1451f4340e96'::uuid,
    '5f47744d-778b-40c4-bff7-9de2ff458cea'::uuid,
    '9262d0b8-dda6-45a8-9832-2bd4c33a6613'::uuid
  )
  AND p.role = 'customer';

  IF v_eligible_count != 23 THEN
    RAISE EXCEPTION 'Safety Gate Aborted: Expected exactly 23 eligible records, but found %.', v_eligible_count;
  END IF;

  -- Verify no administrative accounts exist in allowlist
  SELECT count(*) INTO v_conflicting_count
  FROM public.profiles p
  WHERE p.user_id IN (
    'c2a76410-be7b-432e-ad63-9a12ff82ed5a'::uuid,
    'ba842990-7e2b-4b58-8cee-fd046f1b999e'::uuid,
    '55ed3494-a005-46c6-abec-2e68756b7f83'::uuid,
    '38e4f752-dad8-4909-b6ac-970619d832ae'::uuid,
    'ade4c739-e75c-4a55-afae-ca27a2b0552d'::uuid,
    '9887d0d7-450e-41da-9d71-35055594e233'::uuid,
    '067cfdf6-9781-4bd1-92b0-e2ca515615dd'::uuid,
    'c32f6535-5507-4581-80ee-e48e2218beb7'::uuid,
    '8e921cbb-4117-4f2a-85ea-3b27acadced6'::uuid,
    'c53e8e35-a3c1-45da-bc23-a94de1e9d6a3'::uuid,
    '647815d1-8d94-4c6e-b889-89af2551bf2d'::uuid,
    'ac5c556c-0900-4014-8507-24e75ba000e5'::uuid,
    '0fd5564b-75cd-419a-be14-200c902bd91e'::uuid,
    'e24776a0-4c42-4f84-9e71-c1e055084c2d'::uuid,
    'f9fc5777-403c-4ec3-9c05-85fc7569126f'::uuid,
    '4320b615-d0e1-4b36-94bf-d75f5420bb00'::uuid,
    '01036929-efdb-48fe-ac6b-c578baed5fe5'::uuid,
    'f452425c-b8fa-4526-be11-430ad7f3aff1'::uuid,
    'a2518ca2-76d4-4ce6-a8ca-d68e46957ba3'::uuid,
    '34cd9f4b-c49f-43a3-8206-a25627d1bfb8'::uuid,
    '25833089-0b8e-46b1-a4bc-1451f4340e96'::uuid,
    '5f47744d-778b-40c4-bff7-9de2ff458cea'::uuid,
    '9262d0b8-dda6-45a8-9832-2bd4c33a6613'::uuid
  )
  AND (
    COALESCE(p.copilot_role, 'none') IN ('admin', 'staff', 'super_admin', 'platform_owner')
    OR p.role::text IN ('admin', 'staff', 'super_admin', 'platform_owner')
  );

  IF v_conflicting_count > 0 THEN
    RAISE EXCEPTION 'Safety Gate Aborted: % administrative account(s) detected in allowlist.', v_conflicting_count;
  END IF;
END;
$$;

-- 2. Audit Record Creation before repair
INSERT INTO public.onboarding_recovery_audit (
  profile_id,
  user_id,
  incident_code,
  action,
  previous_state,
  new_state
)
SELECT 
  p.id,
  p.user_id,
  'INC_20260908_ONBOARDING_ROLE_TRAP',
  'repair_23_incident_businesses',
  jsonb_build_object(
    'role', p.role::text,
    'onboarding_status', COALESCE(p.onboarding_status, 'incomplete'),
    'recovery_status', COALESCE(p.recovery_status, 'not_required'),
    'category_locked', COALESCE(p.category_locked, false),
    'business_name', COALESCE(p.business_name, u.raw_user_meta_data->>'business_name'),
    'category', COALESCE(p.category, u.raw_user_meta_data->>'category'),
    'email', u.email,
    'phone', COALESCE(p.phone, u.raw_user_meta_data->>'phone'),
    'address', COALESCE(p.address, u.raw_user_meta_data->>'address'),
    'is_active', p.is_active,
    'business_hours', COALESCE(p.business_hours, (u.raw_user_meta_data->>'business_hours')::jsonb),
    'created_at', u.created_at
  ),
  jsonb_build_object(
    'role', CASE 
      WHEN p.is_active = true AND EXISTS (
        SELECT 1 
        FROM jsonb_each(COALESCE(p.business_hours, (u.raw_user_meta_data->>'business_hours')::jsonb, '{}'::jsonb)) as d(k, v)
        WHERE (v->>'enabled')::boolean IS TRUE
      ) THEN 'provider'
      ELSE 'customer'
    END,
    'onboarding_status', CASE 
      WHEN p.is_active = true AND EXISTS (
        SELECT 1 
        FROM jsonb_each(COALESCE(p.business_hours, (u.raw_user_meta_data->>'business_hours')::jsonb, '{}'::jsonb)) as d(k, v)
        WHERE (v->>'enabled')::boolean IS TRUE
      ) THEN 'complete'
      ELSE 'needs_correction'
    END,
    'recovery_status', CASE 
      WHEN p.is_active = true THEN 'recovered'
      ELSE 'manual_review'
    END,
    'category_locked', true,
    'business_name', COALESCE(p.business_name, u.raw_user_meta_data->>'business_name'),
    'category', COALESCE(p.category, u.raw_user_meta_data->>'category'),
    'email', u.email,
    'phone', COALESCE(p.phone, u.raw_user_meta_data->>'phone'),
    'address', COALESCE(p.address, u.raw_user_meta_data->>'address'),
    'is_active', p.is_active,
    'business_hours', COALESCE(p.business_hours, (u.raw_user_meta_data->>'business_hours')::jsonb),
    'created_at', u.created_at,
    'repair_script', '20260917160000_repair_23_incident_businesses.sql',
    'repair_model', '18_complete_5_needs_correction'
  )
FROM public.profiles p
JOIN auth.users u ON u.id = p.user_id
WHERE p.user_id IN (
  'c2a76410-be7b-432e-ad63-9a12ff82ed5a'::uuid,
  'ba842990-7e2b-4b58-8cee-fd046f1b999e'::uuid,
  '55ed3494-a005-46c6-abec-2e68756b7f83'::uuid,
  '38e4f752-dad8-4909-b6ac-970619d832ae'::uuid,
  'ade4c739-e75c-4a55-afae-ca27a2b0552d'::uuid,
  '9887d0d7-450e-41da-9d71-35055594e233'::uuid,
  '067cfdf6-9781-4bd1-92b0-e2ca515615dd'::uuid,
  'c32f6535-5507-4581-80ee-e48e2218beb7'::uuid,
  '8e921cbb-4117-4f2a-85ea-3b27acadced6'::uuid,
  'c53e8e35-a3c1-45da-bc23-a94de1e9d6a3'::uuid,
  '647815d1-8d94-4c6e-b889-89af2551bf2d'::uuid,
  'ac5c556c-0900-4014-8507-24e75ba000e5'::uuid,
  '0fd5564b-75cd-419a-be14-200c902bd91e'::uuid,
  'e24776a0-4c42-4f84-9e71-c1e055084c2d'::uuid,
  'f9fc5777-403c-4ec3-9c05-85fc7569126f'::uuid,
  '4320b615-d0e1-4b36-94bf-d75f5420bb00'::uuid,
  '01036929-efdb-48fe-ac6b-c578baed5fe5'::uuid,
  'f452425c-b8fa-4526-be11-430ad7f3aff1'::uuid,
  'a2518ca2-76d4-4ce6-a8ca-d68e46957ba3'::uuid,
  '34cd9f4b-c49f-43a3-8206-a25627d1bfb8'::uuid,
  '25833089-0b8e-46b1-a4bc-1451f4340e96'::uuid,
  '5f47744d-778b-40c4-bff7-9de2ff458cea'::uuid,
  '9262d0b8-dda6-45a8-9832-2bd4c33a6613'::uuid
);

-- 3. Execute Controlled Repair on the 23 Profiles (18 complete, 5 incomplete)
UPDATE public.profiles p
SET 
  role = CASE 
    WHEN p.is_active = true AND EXISTS (
      SELECT 1 
      FROM jsonb_each(COALESCE(p.business_hours, (u.raw_user_meta_data->>'business_hours')::jsonb, '{}'::jsonb)) as d(k, v)
      WHERE (v->>'enabled')::boolean IS TRUE
    ) THEN 'provider'::public.user_role
    ELSE p.role
  END,
  business_name = COALESCE(p.business_name, u.raw_user_meta_data->>'business_name'),
  owner_name = COALESCE(p.owner_name, u.raw_user_meta_data->>'owner_name', p.full_name),
  phone = CASE 
    WHEN COALESCE(p.phone, u.raw_user_meta_data->>'phone') IS NOT NULL 
     AND EXISTS (
       SELECT 1 FROM public.profiles p2 
       WHERE p2.phone = COALESCE(p.phone, u.raw_user_meta_data->>'phone') 
         AND p2.id != p.id
     ) THEN p.phone
    ELSE COALESCE(p.phone, u.raw_user_meta_data->>'phone')
  END,
  address = COALESCE(p.address, u.raw_user_meta_data->>'address'),
  city = COALESCE(p.city, u.raw_user_meta_data->>'city'),
  state = COALESCE(p.state, u.raw_user_meta_data->>'state'),
  category = COALESCE(p.category, u.raw_user_meta_data->>'category'),
  category_locked = true,
  category_locked_at = now(),
  business_hours = COALESCE(p.business_hours, (u.raw_user_meta_data->>'business_hours')::jsonb),
  onboarding_status = CASE 
    WHEN p.is_active = true AND EXISTS (
      SELECT 1 
      FROM jsonb_each(COALESCE(p.business_hours, (u.raw_user_meta_data->>'business_hours')::jsonb, '{}'::jsonb)) as d(k, v)
      WHERE (v->>'enabled')::boolean IS TRUE
    ) THEN 'complete'
    ELSE 'needs_correction'
  END,
  recovery_status = CASE 
    WHEN p.is_active = true THEN 'recovered'
    ELSE 'manual_review'
  END,
  recovered_at = now(),
  recovery_incident_code = 'INC_20260908_ONBOARDING_ROLE_TRAP',
  onboarding_completed_at = CASE 
    WHEN p.is_active = true AND EXISTS (
      SELECT 1 
      FROM jsonb_each(COALESCE(p.business_hours, (u.raw_user_meta_data->>'business_hours')::jsonb, '{}'::jsonb)) as d(k, v)
      WHERE (v->>'enabled')::boolean IS TRUE
    ) THEN now()
    ELSE NULL
  END,
  updated_at = now()
FROM auth.users u
WHERE p.user_id = u.id
  AND p.user_id IN (
    'c2a76410-be7b-432e-ad63-9a12ff82ed5a'::uuid,
    'ba842990-7e2b-4b58-8cee-fd046f1b999e'::uuid,
    '55ed3494-a005-46c6-abec-2e68756b7f83'::uuid,
    '38e4f752-dad8-4909-b6ac-970619d832ae'::uuid,
    'ade4c739-e75c-4a55-afae-ca27a2b0552d'::uuid,
    '9887d0d7-450e-41da-9d71-35055594e233'::uuid,
    '067cfdf6-9781-4bd1-92b0-e2ca515615dd'::uuid,
    'c32f6535-5507-4581-80ee-e48e2218beb7'::uuid,
    '8e921cbb-4117-4f2a-85ea-3b27acadced6'::uuid,
    'c53e8e35-a3c1-45da-bc23-a94de1e9d6a3'::uuid,
    '647815d1-8d94-4c6e-b889-89af2551bf2d'::uuid,
    'ac5c556c-0900-4014-8507-24e75ba000e5'::uuid,
    '0fd5564b-75cd-419a-be14-200c902bd91e'::uuid,
    'e24776a0-4c42-4f84-9e71-c1e055084c2d'::uuid,
    'f9fc5777-403c-4ec3-9c05-85fc7569126f'::uuid,
    '4320b615-d0e1-4b36-94bf-d75f5420bb00'::uuid,
    '01036929-efdb-48fe-ac6b-c578baed5fe5'::uuid,
    'f452425c-b8fa-4526-be11-430ad7f3aff1'::uuid,
    'a2518ca2-76d4-4ce6-a8ca-d68e46957ba3'::uuid,
    '34cd9f4b-c49f-43a3-8206-a25627d1bfb8'::uuid,
    '25833089-0b8e-46b1-a4bc-1451f4340e96'::uuid,
    '5f47744d-778b-40c4-bff7-9de2ff458cea'::uuid,
    '9262d0b8-dda6-45a8-9832-2bd4c33a6613'::uuid
  );

-- 4. Post-Execution Assertion: Provider count must equal exactly 69
DO $$
DECLARE
  v_total_providers integer;
BEGIN
  SELECT count(*) INTO v_total_providers
  FROM public.profiles
  WHERE role = 'provider';

  IF v_total_providers != 70 THEN
    RAISE EXCEPTION 'Post-Execution Verification Failed: Expected exactly 70 total providers (52 pre-incident + 18 repaired), but found %.', v_total_providers;
  END IF;
END;
$$;

COMMIT;
