/*
# Create profiles with server-side roles

1. New Tables
- `profiles`: one row per sign-in account. Columns: `id` (matches the account's id), `display_name`, `role` (member, merchant, or founder), `created_at`.

2. Triggers
- A new profile row is created automatically whenever someone signs up.
- Existing sign-in accounts get a profile row backfilled.

3. Security
- Row level security is enabled on `profiles`.
- Signed-in users can read their own profile and change only their display name.
- Users cannot change their own role. Only server-side code can set it.
- No anonymous access.

4. Important notes
- Role changes are made with the database owner tools, never from the browser.
*/

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'merchant', 'founder')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON profiles TO authenticated;
GRANT UPDATE (display_name) ON profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON profiles TO service_role;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile_name" ON profiles;
CREATE POLICY "update_own_profile_name" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_sign_in_account()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'name', ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_sign_in_account() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_sign_in_account_created ON auth.users;
CREATE TRIGGER on_sign_in_account_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_sign_in_account();

INSERT INTO profiles (id, display_name)
SELECT u.id, COALESCE(u.raw_user_meta_data ->> 'name', '')
FROM auth.users u
ON CONFLICT (id) DO NOTHING;
