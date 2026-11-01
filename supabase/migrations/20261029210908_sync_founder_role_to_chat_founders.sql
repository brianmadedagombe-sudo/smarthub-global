/*
# Keep chat Founder status in sync with the account role

1. Modified behavior
- When an account's role is set to founder, that account is added to the chat Founder list.
- When the role changes to anything else, the account is removed from that list.

2. Security
- The sync function runs with elevated rights but is not callable by browsers or anonymous users.
- Users still cannot change their own role (see the profiles migration).

3. Important notes
- The Founder list is now derived from the account role, so there is one source of truth.
*/

CREATE OR REPLACE FUNCTION public.sync_chat_founder_from_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.role = 'founder' THEN
    INSERT INTO public.chat_founders (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  ELSE
    DELETE FROM public.chat_founders WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sync_chat_founder_from_role() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS sync_chat_founder_on_role_change ON public.profiles;
CREATE TRIGGER sync_chat_founder_on_role_change
  AFTER INSERT OR UPDATE OF role ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_chat_founder_from_role();
