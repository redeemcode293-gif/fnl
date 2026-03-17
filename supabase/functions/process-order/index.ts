import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OrderProcessRequest {
  orderId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Authentication: Verify the user's JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Invalid token:', authError);
      return new Response(JSON.stringify({ error: 'Invalid authentication token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Authenticated user: ${user.id}`);

    const { orderId }: OrderProcessRequest = await req.json();

    if (!orderId) {
      return new Response(JSON.stringify({ error: 'Order ID required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate orderId format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(orderId)) {
      return new Response(JSON.stringify({ error: 'Invalid order ID format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Processing order: ${orderId}`);

    // Get order with service info
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        services (
          id,
          name,
          provider_id,
          provider_service_id,
          provider_price,
          is_active
        )
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error('Order not found:', orderError);
      return new Response(JSON.stringify({ error: 'Order not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Authorization: Verify user owns this order or is admin
    if (order.user_id !== user.id) {
      // Check if user is admin
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();
      
      if (!roleData) {
        console.error(`User ${user.id} attempted to process order ${orderId} owned by ${order.user_id}`);
        return new Response(JSON.stringify({ error: 'Unauthorized to process this order' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      console.log(`Admin user ${user.id} processing order for user ${order.user_id}`);
    }

    // Validate order status - only process pending orders
    if (order.status !== 'pending') {
      console.log(`Order ${orderId} has status ${order.status}, cannot process`);
      return new Response(JSON.stringify({ 
        error: 'Order cannot be processed',
        reason: order.status === 'processing' ? 'Order is already being processed' :
                order.status === 'completed' ? 'Order has already been completed' :
                order.status === 'cancelled' ? 'Order has been cancelled' :
                order.status === 'failed' ? 'Order has failed - please create a new order' :
                `Order status is ${order.status}`
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const service = order.services;
    
    // Validate service is active
    if (!service || !service.is_active) {
      console.error('Service is not active or not found');
      await supabase
        .from('orders')
        .update({ status: 'failed' })
        .eq('id', orderId);
        
      return new Response(JSON.stringify({ error: 'Service is not available' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!service.provider_id || !service.provider_service_id) {
      // No provider assigned - mark as manual
      await supabase
        .from('orders')
        .update({ status: 'pending' })
        .eq('id', orderId);

      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Order pending manual processing',
        status: 'pending'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get providers sorted by priority for failover
    const { data: providers, error: providerError } = await supabase
      .from('api_providers')
      .select('*')
      .eq('status', 'active')
      .order('priority', { ascending: true });

    if (providerError || !providers?.length) {
      console.error('No active providers found');
      await supabase
        .from('orders')
        .update({ status: 'pending' })
        .eq('id', orderId);

      return new Response(JSON.stringify({ error: 'No active providers' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Find primary provider for this service
    let primaryProvider = providers.find(p => p.id === service.provider_id);
    const backupProviders = providers.filter(p => p.id !== service.provider_id);

    // Try primary provider first, then fallback
    const providersToTry = primaryProvider 
      ? [primaryProvider, ...backupProviders] 
      : providers;

    let lastError = null;
    let providerOrderId = null;

    for (const provider of providersToTry) {
      try {
        console.log(`Attempting order with provider: ${provider.name}`);

        // Call provider API to place order
        const orderData = new URLSearchParams({
          key: provider.api_key,
          action: 'add',
          service: service.provider_service_id,
          link: order.link,
          quantity: order.quantity.toString()
        });

        const response = await fetch(provider.api_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: orderData
        });

        const result = await response.json();
        console.log(`Provider ${provider.name} response:`, result);

        if (result.order) {
          // Success - update order
          providerOrderId = result.order;
          
          await supabase
            .from('orders')
            .update({ 
              status: 'processing',
              provider_order_id: String(result.order),
              start_count: result.start_count ? parseInt(String(result.start_count)) : 0,
              remains: result.start_count ? parseInt(String(result.start_count)) : 0,
            })
            .eq('id', orderId);

          console.log(`Order ${orderId} placed successfully with provider ${provider.name}`);

          return new Response(JSON.stringify({ 
            success: true,
            providerOrderId,
            provider: provider.name,
            status: 'processing'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        } else if (result.error) {
          lastError = result.error;
          console.log(`Provider ${provider.name} error: ${result.error}`);
          // Continue to next provider
        }
      } catch (err: any) {
        console.error(`Provider ${provider.name} failed:`, err);
        lastError = err?.message || String(err);
        // Continue to next provider
      }
    }

    // All providers failed
    console.error('All providers failed for order', orderId);
    await supabase
      .from('orders')
      .update({ status: 'failed' })
      .eq('id', orderId);

    return new Response(JSON.stringify({ 
      error: 'All providers failed',
      lastError,
      status: 'failed'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Process order error:', error);
    return new Response(JSON.stringify({ error: error?.message || String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
