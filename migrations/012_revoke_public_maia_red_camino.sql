-- Security Advisor: vista SECURITY DEFINER maia_red_camino exponia a anon/authenticated
-- datos de reservas de todos los hostales, saltandose la RLS de reservations/hostales.

revoke select on public.maia_red_camino from anon, authenticated;
