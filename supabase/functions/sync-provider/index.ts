import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const INR_TO_USD = 1 / 84;

function parsePrice(raw: string | number): number {
  if (typeof raw === 'number') return isNaN(raw) ? 0 : raw;
  if (!raw) return 0;
  let cleaned = String(raw).replace(/[^0-9,.-]/g, '').trim();
  if (!cleaned) return 0;

  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');

  // Handle locale formats:
  // 15,650.19 => 15650.19
  // 15.650,19 => 15650.19
  // 15650,19  => 15650.19
  if (hasComma && hasDot) {
    if (cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (hasComma && !hasDot) {
    cleaned = cleaned.replace(',', '.');
  }

  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

function toUsd(val: number, currency: string): number {
  if (val === 0) return 0;
  const c = (currency || 'USD').toUpperCase();
  // Some providers send INR in paise-like scaled numbers for certain rows.
  // Normalize obvious outliers before converting.
  const normalized = c === 'INR' && val > 100000 ? val / 1000 : val;
  if (c === 'INR' || c === '₹' || c === 'RS') return normalized * INR_TO_USD;
  if (normalized > 50) return normalized * INR_TO_USD; // auto-detect: real SMM prices never > $50/1K
  return normalized;
}

function detectPlatform(cat: string, name: string): string {
  const t = ((cat || '') + ' ' + (name || '')).toLowerCase();
  if (t.includes('instagram')) return 'Instagram';
  if (t.includes('youtube') || /\byt\b/.test(t)) return 'YouTube';
  if (t.includes('tiktok') || t.includes('tik tok')) return 'TikTok';
  if (t.includes('telegram')) return 'Telegram';
  if (t.includes('twitter') || t.includes('tweet') || / x /.test(t)) return 'X';
  if (t.includes('facebook') || /\bfb\b/.test(t)) return 'Facebook';
  if (t.includes('spotify')) return 'Spotify';
  if (t.includes('discord')) return 'Discord';
  if (t.includes('twitch')) return 'Twitch';
  if (t.includes('snapchat')) return 'Snapchat';
  if (t.includes('whatsapp')) return 'WhatsApp';
  if (t.includes('threads')) return 'Threads';
  if (t.includes('linkedin')) return 'LinkedIn';
  if (t.includes('pinterest')) return 'Pinterest';
  if (t.includes('reddit')) return 'Reddit';
  if (t.includes('apple') || t.includes('itunes') || t.includes('ios')) return 'Apple';
  return 'Other';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', user.id).in('role', ['admin', 'owner']).maybeSingle();
    if (!roleData) return new Response(JSON.stringify({ error: 'Admin access required' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const body = await req.json();
    const { action } = body;

    // ── fetch-preview: proxies provider API to avoid CORS ─────────────────────
    if (action === 'fetch-preview') {
      const { apiUrl, apiKey } = body;
      if (!apiUrl || !apiKey) return new Response(JSON.stringify({ error: 'apiUrl and apiKey required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      
      // Try POST form-encoded first (most SMM panels), then GET with query params
      let services: any[] | null = null;
      const methods = [
        async () => {
          const r = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ key: apiKey, action: 'services' }),
            signal: AbortSignal.timeout(60000),
          });
          return r.json();
        },
        async () => {
          const url = new URL(apiUrl);
          url.searchParams.set('key', apiKey);
          url.searchParams.set('action', 'services');
          const r = await fetch(url.toString(), { signal: AbortSignal.timeout(60000) });
          return r.json();
        },
      ];

      for (const method of methods) {
        try {
          const data = await method();
          if (Array.isArray(data)) { services = data; break; }
          if (data && typeof data === 'object' && !data.error) { services = Object.values(data); break; }
        } catch { /* try next */ }
      }

      if (!services) return new Response(JSON.stringify({ error: 'Provider did not return valid services array' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      return new Response(JSON.stringify({ services }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ── balance ───────────────────────────────────────────────────────────────
    if (action === 'balance') {
      const { providerId } = body;
      const { data: provider } = await supabase.from('api_providers').select('*').eq('id', providerId).single();
      if (!provider) return new Response(JSON.stringify({ error: 'Provider not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      const r = await fetch(provider.api_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ key: provider.api_key, action: 'balance' }),
        signal: AbortSignal.timeout(15000),
      });
      const data = await r.json();
      // Store balance in NATIVE currency — do NOT convert to USD
      const rawBalance = parsePrice(data.balance ?? data.Balance ?? '0');
      const currency = (provider.currency || 'USD').toUpperCase();
      
      await supabase.from('api_providers').update({ balance: rawBalance, currency }).eq('id', providerId);
      return new Response(JSON.stringify({ balance: rawBalance, currency }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ── services sync ─────────────────────────────────────────────────────────
    if (action === 'services') {
      const { providerId } = body;
      const { data: provider } = await supabase.from('api_providers').select('*').eq('id', providerId).single();
      if (!provider) return new Response(JSON.stringify({ error: 'Provider not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      const provCur = (provider.currency || 'USD').toUpperCase();
      const margin = parseFloat(body.margin || '0.3') || 0.3;

      const r = await fetch(provider.api_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ key: provider.api_key, action: 'services' }),
        signal: AbortSignal.timeout(120000),
      });
      const services = await r.json();
      if (!Array.isArray(services)) return new Response(JSON.stringify({ error: 'Invalid services response' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      let added = 0, updated = 0;
      const BATCH = 250;

      for (let i = 0; i < services.length; i += BATCH) {
        const batch = services.slice(i, i + BATCH);
        const pids = batch.map((s: any) => String(s.service));

        const { data: existing } = await supabase.from('services')
          .select('id, provider_service_id, service_id')
          .eq('provider_id', provider.id)
          .in('provider_service_id', pids);

        const exMap = new Map((existing || []).map((s: any) => [s.provider_service_id, s]));
        const toIns: any[] = [];
        const toUpd: any[] = [];

        for (const svc of batch) {
          const platform = detectPlatform(svc.category || '', svc.name || '');
          const rawPrice = parsePrice(svc.rate);
          const provUsd = toUsd(rawPrice, provCur);
          const panelUsd = provUsd * (1 + margin);
          const pid = String(svc.service);
          const row = {
            name: String(svc.name || 'Unnamed').trim(),
            description: String(svc.description || svc.name || '').trim(),
            platform, category: String(svc.category || 'General').trim(),
            provider_id: provider.id, provider_service_id: pid,
            provider_price: provUsd, base_price: panelUsd,
            min_quantity: Math.max(1, parseInt(String(svc.min)) || 100),
            max_quantity: Math.max(100, parseInt(String(svc.max)) || 50000),
            refill_supported: svc.refill === true || svc.refill === 'true' || svc.refill === 1,
            dripfeed_supported: svc.dripfeed === true || svc.dripfeed === 'true' || svc.dripfeed === 1,
            is_active: true,
          };

          if (exMap.has(pid)) {
            const ex = exMap.get(pid)!;
            toUpd.push({ id: ex.id, service_id: ex.service_id, ...row });
          } else {
            const numPid = parseInt(pid);
            const svcId = !isNaN(numPid) && numPid < 2_000_000_000 ? numPid : Math.floor(100000 + Math.random() * 899999);
            toIns.push({ ...row, service_id: svcId });
          }
        }

        if (toIns.length > 0) {
          const { data: ins, error: ie } = await supabase.from('services').insert(toIns).select('id, service_id, name, description, platform, category, base_price, min_quantity, max_quantity, refill_supported, dripfeed_supported');
          if (!ie && ins) {
            added += ins.length;
            const panelRows = ins.map((s: any) => ({
              service_id: s.service_id, name: s.name, description: s.description,
              platform: s.platform, category: s.category, price: s.base_price,
              min_quantity: s.min_quantity, max_quantity: s.max_quantity,
              refill_supported: !!s.refill_supported, dripfeed_supported: !!s.dripfeed_supported,
              auto_refill_supported: false, is_visible: true,
            }));
            // Upsert with fallback
            const { error: ue } = await supabase.from('panel_services').upsert(panelRows, { onConflict: 'service_id' });
            if (ue) {
              for (const row of panelRows) {
                const { data: ex } = await supabase.from('panel_services').select('id').eq('service_id', row.service_id).maybeSingle();
                if (ex) await supabase.from('panel_services').update({ is_visible: true, price: row.price }).eq('id', ex.id);
                else await supabase.from('panel_services').insert(row);
              }
            }
          } else if (ie) {
            // One-by-one fallback
            for (const s of toIns) {
              const { data: ins2 } = await supabase.from('services')
                .insert({ ...s, service_id: Math.floor(100000 + Math.random() * 899999) })
                .select('id, service_id, name, description, platform, category, base_price, min_quantity, max_quantity, refill_supported, dripfeed_supported').single();
              if (ins2) {
                added++;
                await supabase.from('panel_services').upsert({
                  service_id: ins2.service_id, name: ins2.name, description: ins2.description,
                  platform: ins2.platform, category: ins2.category, price: ins2.base_price,
                  min_quantity: ins2.min_quantity, max_quantity: ins2.max_quantity,
                  refill_supported: !!ins2.refill_supported, dripfeed_supported: !!ins2.dripfeed_supported,
                  auto_refill_supported: false, is_visible: true,
                }, { onConflict: 'service_id' });
              }
            }
          }
        }

        const updateTasks = toUpd.map(async (s) => {
          const { id, service_id, ...d } = s;
          await supabase.from('services').update({ provider_price: d.provider_price, base_price: d.base_price, min_quantity: d.min_quantity, max_quantity: d.max_quantity, refill_supported: d.refill_supported, dripfeed_supported: d.dripfeed_supported, is_active: true, category: d.category, platform: d.platform, name: d.name, description: d.description }).eq('id', id);
          await supabase.from('panel_services').update({ price: d.base_price, is_visible: true, category: d.category, platform: d.platform, name: d.name, description: d.description }).eq('service_id', service_id);
        });
        await Promise.all(updateTasks);
        updated += toUpd.length;

        console.log(`Batch ${i}-${i+BATCH}: +${toIns.length} / ~${toUpd.length}`);
      }

      await supabase.from('api_providers').update({ last_sync_at: new Date().toISOString() }).eq('id', provider.id);
      return new Response(JSON.stringify({ success: true, added, updated, total: services.length }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('sync-provider error:', msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
