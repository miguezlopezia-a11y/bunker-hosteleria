import { supabase } from './supabase';

const FUNCTION_URL = `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/maia-critical-alert`;

export async function sendCriticalAlert({ message, hostalId }) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    return { error: 'alert_failed' };
  }

  try {
    const res = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ message, hostal_id: hostalId }),
    });

    if (!res.ok) {
      return { error: 'alert_failed' };
    }

    return await res.json();
  } catch (err) {
    return { error: 'alert_failed' };
  }
}
