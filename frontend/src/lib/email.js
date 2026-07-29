import { supabase } from './supabase';

const FUNCTION_URL = `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/send-email`;

export async function sendEmail({ to, template, variables, hostal_id }) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    return { error: 'email_failed' };
  }

  try {
    const res = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ to, template, variables, hostal_id }),
    });

    if (!res.ok) {
      return { error: 'email_failed' };
    }

    return { data: await res.json() };
  } catch (err) {
    return { error: 'email_failed' };
  }
}
