-- The trigger invokes this function internally; browser roles must never call it as an RPC.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
