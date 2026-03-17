import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all non-terminal orders that have a provider_order_id
    const { data: orders, error } = await supabase
      .from('orders')
      .select('id, order_number, status, provider_order_id, start_count, remains, service_id')
      .in('status', ['pending', 'processing', 'in_progress'])
      .limit(100);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (!orders || orders.length === 0) {
      return new Response(JSON.stringify({ success: true, checked: 0, message: 'No active orders' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // For orders without provider_order_id, try to submit them first
    const unsubmitted = orders.filter(o => !o.provider_order_id && o.status === 'pending');
    for (const order of unsubmitted.slice(0, 20)) { // max 20 at a time
      try {
        await fetch(`${supabaseUrl}/functions/v1/process-order`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseServiceKey}` },
          body: JSON.stringify({ orderId: order.id }),
        });
      } catch (e) {
        console.error(`Failed to submit order ${order.id}:`, e);
      }
    }

    // For orders WITH provider_order_id, check their status
    const submitted = orders.filter(o => o.provider_order_id);
    
    // Group by service to find their providers
    const serviceIds = [...new Set(submitted.map(o => o.service_id))].filter(Boolean);
    
    const { data: services } = await supabase
      .from('services')
      .select('id, provider_id, provider_service_id')
      .in('id', serviceIds);

    const serviceMap = new Map((services || []).map(s => [s.id, s]));

    // Get unique provider IDs
    const providerIds = [...new Set(services?.map(s => s.provider_id).filter(Boolean) || [])];
    const { data: providers } = await supabase.from('api_providers').select('*').in('id', providerIds);
    const providerMap = new Map((providers || []).map(p => [p.id, p]));

    let updated = 0, failed = 0;

    for (const order of submitted) {
      try {
        const service = serviceMap.get(order.service_id);
        if (!service?.provider_id) continue;
        const provider = providerMap.get(service.provider_id);
        if (!provider) continue;

        const resp = await fetch(provider.api_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ key: provider.api_key, action: 'status', order: order.provider_order_id }),
          signal: AbortSignal.timeout(10000),
        });
        const result = await resp.json();

        if (result.status) {
          const ps = result.status.toLowerCase().replace(' ', '_');
          let newStatus = order.status;
          if (ps === 'completed') newStatus = 'completed';
          else if (ps === 'in_progress' || ps === 'inprogress' || ps === 'processing') newStatus = 'processing';
          else if (ps === 'partial') newStatus = 'partial';
          else if (ps === 'canceled' || ps === 'cancelled') newStatus = 'cancelled';

          if (newStatus !== order.status || result.remains !== order.remains) {
            await supabase.from('orders').update({
              status: newStatus,
              start_count: result.start_count ? parseInt(result.start_count) : order.start_count,
              remains: result.remains ? parseInt(result.remains) : order.remains,
            }).eq('id', order.id);

            // Refund if cancelled
            if (newStatus === 'cancelled' && order.status !== 'cancelled') {
              const { data: orderFull } = await supabase.from('orders').select('user_id, price').eq('id', order.id).single();
              if (orderFull) {
                const { data: wallet } = await supabase.from('wallets').select('balance').eq('user_id', orderFull.user_id).single();
                if (wallet) {
                  await supabase.from('wallets').update({ balance: Number(wallet.balance) + Number(orderFull.price) }).eq('user_id', orderFull.user_id);
                  await supabase.from('transactions').insert({
                    user_id: orderFull.user_id, type: 'refund', amount: Number(orderFull.price),
                    status: 'completed', description: `Refund for cancelled order #${order.order_number}`,
                  });
                }
              }
            }
            updated++;
          }
        }
      } catch (e) {
        console.error(`Status check failed for order ${order.id}:`, e);
        failed++;
      }
    }

    return new Response(JSON.stringify({
      success: true, checked: submitted.length, updated, failed,
      submitted_new: unsubmitted.length,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
