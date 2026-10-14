-- The sign-up trigger function should only run from the trigger, never through the public API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
