import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { buildHostalContext, getMockAnswer, buildSystemPrompt } from '../_shared/maia.ts';
import { corsHeadersFor } from '../_shared/cors.ts';

interface LLMConfig {
  provider: string;
  endpoint: string;
  apiKey: string | undefined;
  model: string;
  headers: Record<string, string>;
}

function getLLMConfig(providerOverride?: string): LLMConfig {
  const provider = providerOverride ?? Deno.env.get('MAIA_PROVIDER') ?? 'moonshot';

  if (provider === 'openrouter') {
    return {
      provider,
      endpoint: 'https://openrouter.ai/api/v1/chat/completions',
      apiKey: Deno.env.get('OPENROUTER_API_KEY'),
      model: Deno.env.get('MAIA_MODEL') ?? 'moonshotai/kimi-k2.6',
      headers: {
        'HTTP-Referer': 'https://bunkerhostal.com',
        'X-Title': 'BunkerHostal MaiA',
      },
    };
  }

  return {
    provider,
    endpoint: 'https://api.moonshot.cn/v1/chat/completions',
    apiKey: Deno.env.get('MOONSHOT_API_KEY'),
    model: Deno.env.get('MAIA_MODEL') ?? 'moonshot-v1-8k',
    headers: {},
  };
}

function getFallbackConfig(primary: LLMConfig): LLMConfig | null {
  if (primary.provider === 'openrouter') {
    const moonshotKey = Deno.env.get('MOONSHOT_API_KEY');
    if (!moonshotKey) return null;
    return {
      provider: 'moonshot',
      endpoint: 'https://api.moonshot.cn/v1/chat/completions',
      apiKey: moonshotKey,
      model: 'moonshot-v1-8k',
      headers: {},
    };
  }

  const openrouterKey = Deno.env.get('OPENROUTER_API_KEY');
  if (!openrouterKey) return null;
  return {
    provider: 'openrouter',
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    apiKey: openrouterKey,
    model: Deno.env.get('MAIA_MODEL') ?? 'moonshot/kimi-k2',
    headers: {
      'HTTP-Referer': 'https://bunkerhostal.com',
      'X-Title': 'BunkerHostal MaiA',
    },
  };
}

async function callLLM(config: LLMConfig, systemPrompt: string, userMessage: string): Promise<Response> {
  if (!config.apiKey) {
    throw new Error(`missing_api_key_${config.provider}`);
  }

  return fetch(config.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
      ...config.headers,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
    }),
  });
}

async function tryLLMWithFallback(
  primary: LLMConfig,
  fallback: LLMConfig | null,
  systemPrompt: string,
  userMessage: string
): Promise<{ reply: string; provider: string; mock: boolean; fallback_used?: boolean }> {
  let lastError: string | null = null;

  for (const config of [primary, fallback].filter(Boolean) as LLMConfig[]) {
    try {
      const response = await callLLM(config, systemPrompt, userMessage);
      if (response.ok) {
        const data = await response.json();
        const reply = data.choices?.[0]?.message?.content;
        if (reply) {
          return {
            reply,
            provider: config.provider,
            mock: false,
            fallback_used: config.provider !== primary.provider,
          };
        }
      }
      const text = await response.text();
      lastError = `${config.provider}: ${text}`;
      console.error(`LLM error (${config.provider}):`, text);
    } catch (err) {
      lastError = `${config.provider}: ${err.message || err}`;
      console.error(`LLM exception (${config.provider}):`, err);
    }
  }

  throw new Error(lastError || 'llm_failed');
}

serve(async (req) => {
  const corsHeaders = corsHeadersFor(req.headers.get('Origin'));

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const body = await req.json().catch(() => ({}));
  const message = body?.message;
  const hostal_id = body?.hostal_id;

  if (!message || !hostal_id) {
    return new Response(JSON.stringify({ error: 'missing_params' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 401,
    });
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 401,
    });
  }

  const { data: hostalero } = await supabaseAdmin.from('hostaleros').select('hostal_id').eq('id', user.id).single();
  if (!hostalero || hostalero.hostal_id !== hostal_id) {
    return new Response(JSON.stringify({ error: 'forbidden' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 403,
    });
  }

  try {
    const context = await buildHostalContext(supabaseAdmin, hostal_id, { withHostal: true });
    const systemPrompt = buildSystemPrompt(context);

    const moonshotKey = Deno.env.get('MOONSHOT_API_KEY');
    const openrouterKey = Deno.env.get('OPENROUTER_API_KEY');
    if (!moonshotKey && !openrouterKey) {
      return new Response(JSON.stringify({ reply: getMockAnswer(message, context), mock: true, provider: 'mock' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const primary = getLLMConfig();
    const fallback = getFallbackConfig(primary);

    const result = await tryLLMWithFallback(primary, fallback, systemPrompt, message);

    return new Response(JSON.stringify({ reply: result.reply, mock: result.mock, provider: result.provider, fallback_used: result.fallback_used }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err) {
    console.error('MaiA chat error:', err);
    try {
      const context = await buildHostalContext(supabaseAdmin, hostal_id, { withHostal: true });
      return new Response(
        JSON.stringify({ reply: getMockAnswer(message, context), mock: true, provider: 'mock', fallback_reason: err.message || 'llm_failed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    } catch (_e) {
      return new Response(JSON.stringify({ error: 'chat_failed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }
  }
});
