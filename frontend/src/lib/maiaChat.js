import { supabase } from './supabase';

const FUNCTION_URL = `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/maia-chat`;

export async function maiaChat({ message, hostalId }) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    return { error: 'chat_failed', reply: '' };
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
      return { error: 'chat_failed', reply: '' };
    }

    return await res.json();
  } catch (err) {
    return { error: 'chat_failed', reply: '' };
  }
}
