import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { orderId } = await req.json();

    if (!orderId) {
      return new Response(JSON.stringify({ error: 'Order ID required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get order with service and provider info
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        services (
          provider_id,
          provider_service_id
        )
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return new Response(JSON.stringify({ error: 'Order not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!order.services?.provider_id) {
      return new Response(JSON.stringify({ 
        status: order.status,
        message: 'No provider assigned'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get provider
    const { data: provider } = await supabase
      .from('api_providers')
      .select('*')
      .eq('id', order.services.provider_id)
      .single();

    if (!provider) {
      return new Response(JSON.stringify({ 
        status: order.status,
        message: 'Provider not found'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Use provider_order_id if available, fall back to internal orderId
    const providerOrderRef = order.provider_order_id || order.order_number;
    if (!providerOrderRef) {
      return new Response(JSON.stringify({ status: order.status, message: 'No provider order reference yet' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    const statusData = new URLSearchParams({
      key: provider.api_key,
      action: 'status',
      order: providerOrderRef
    });

    try {
      const response = await fetch(provider.api_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: statusData
      });

      const result = await response.json();
      console.log('Provider status response:', result);

      if (result.status) {
        // Map provider status to our status
        let newStatus = order.status;
        const providerStatus = result.status.toLowerCase();
        
        if (providerStatus === 'completed') newStatus = 'completed';
        else if (providerStatus === 'in progress' || providerStatus === 'processing') newStatus = 'processing';
        else if (providerStatus === 'partial') newStatus = 'partial';
        else if (providerStatus === 'canceled' || providerStatus === 'cancelled') newStatus = 'cancelled';
        else if (providerStatus === 'pending') newStatus = 'pending';

        // Update order if status changed
        if (newStatus !== order.status) {
          await supabase
            .from('orders')
            .update({ 
              status: newStatus,
              start_count: result.start_count || order.start_count,
              remains: result.remains || order.remains
            })
            .eq('id', orderId);
        }

        return new Response(JSON.stringify({ 
          status: newStatus,
          start_count: result.start_count,
          remains: result.remains,
          charge: result.charge
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    } catch (err) {
      console.error('Provider status check failed:', err);
    }

    return new Response(JSON.stringify({ 
      status: order.status,
      message: 'Status from local database'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Check status error:', error);
    return new Response(JSON.stringify({ error: error?.message || String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
