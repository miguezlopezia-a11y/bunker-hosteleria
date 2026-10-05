-- B-5 (resto): submit_review permitia reenviar el mismo token y pisar la
-- puntuacion anterior indefinidamente. Ahora falla si ya hay respuesta.

create or replace function public.submit_review(
  p_token text, p_score smallint, p_feedback text default null::text,
  p_redirected boolean default false
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
  declare
    v_id uuid;
  begin
    if p_score is null or p_score < 1 or p_score > 5 then
      raise exception 'La puntuación debe estar entre 1 y 5';
    end if;

    update review_requests
    set
      score = p_score,
      feedback = p_feedback,
      redirected = p_redirected,
      responded_at = now()
    where token = p_token
      and responded_at is null
    returning id into v_id;

    if v_id is null then
      raise exception 'Esta reseña ya se envió anteriormente';
    end if;

    return v_id;
  end;
  $function$;

revoke all on function public.submit_review(text, smallint, text, boolean) from public;
grant execute on function public.submit_review(text, smallint, text, boolean) to anon, authenticated;
