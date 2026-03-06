import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})
const endpointSecret = Deno.env.get('STRIPE_WEBHOOK_SIGNATURE') ?? '';

serve(async (req) => {
  const signature = req.headers.get('Stripe-Signature')

  if (!signature) {
    return new Response('No signature', { status: 400 })
  }

  try {
    const body = await req.text()
    let event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, endpointSecret);
    } catch (err) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    let result = { received: true, updateData: null, updateError: null, log: [] };
    const log = (msg) => { console.log(msg); result.log.push(msg); };

    log(`Received event type: ${event.type}`);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const paymentType = session.metadata?.type;

      log(`Processing checkout.session.completed. Type: ${paymentType || 'subscription'}`);

      // Handle APPOINTMENT payments
      if (paymentType === 'appointment') {
        const citaId = session.metadata?.cita_id;
        const montoTotal = session.metadata?.monto_total;
        const paymentIntentId = session.payment_intent;

        log(`Appointment payment. CitaID: ${citaId}, Amount: ${montoTotal}, PaymentIntent: ${paymentIntentId}`);

        if (citaId) {
          const { data, error: updateError } = await supabaseClient
            .from('citas')
            .update({
              estado_pago: 'pagado',
              estado: 'confirmada',
              stripe_payment_intent_id: paymentIntentId
            })
            .eq('id', citaId)
            .select();

          result.updateData = data;
          result.updateError = updateError;

          log('Cita update result: ' + JSON.stringify(data));
          if (updateError) {
            console.error('Cita update error:', updateError);
            log('Cita update error: ' + JSON.stringify(updateError));
          }
        } else {
          log('Missing cita_id in appointment session metadata.');
        }
      }
      // Handle SUBSCRIPTION payments
      else {
        const negocioId = session.metadata?.negocio_id;
        const subscriptionId = session.subscription;
        const amountTotal = session.amount_total;

        log(`Subscription payment. NegocioID: ${negocioId}, SubscriptionID: ${subscriptionId}, Amount: ${amountTotal}`);

        let planId = 1; // Default Free
        if (amountTotal === 19900) planId = 2; // Old Basic?
        else if (amountTotal === 49900) planId = 2; // Plan Básico ($499 MXN)
        else if (amountTotal === 99900) planId = 3; // Plan Avanzado / Regular ($999 MXN)

        log(`Determined Plan ID: ${planId}`);

        if (negocioId && subscriptionId) {
          // Calculate 30 days from now for period end
          const now = new Date();
          const periodEnd = new Date(now);
          periodEnd.setDate(periodEnd.getDate() + 30);

          const { data, error: updateError } = await supabaseClient
            .from('negocio_suscripciones')
            .update({
              stripe_subscription_id: subscriptionId,
              estado: 'active',
              plan_id: planId,
              updated_at: now.toISOString(),
              fecha_fin_periodo: periodEnd.toISOString()
            })
            .eq('negocio_id', negocioId)
            .select();

          result.updateData = data;
          result.updateError = updateError;

          log('Update result: ' + JSON.stringify(data));
          if (updateError) {
            console.error('Update error:', updateError);
            log('Update error: ' + JSON.stringify(updateError));
          }
        } else {
          log('Missing negocioId or subscriptionId in session metadata.');
        }
      }
    } else if (event.type === 'account.updated') {
      const account = event.data.object;
      log(`Processing account.updated for account: ${account.id}`);

      // Check if onboarding is complete (details submitted and charges enabled)
      const isComplete = account.details_submitted && account.charges_enabled;

      const { data, error: updateError } = await supabaseClient
        .from('sucursales')
        .update({ stripe_onboarding_complete: isComplete })
        .eq('stripe_account_id', account.id)
        .select();

      result.updateData = data;
      result.updateError = updateError;

      if (updateError) {
        console.error('Sucursal update error:', updateError);
        log('Sucursal update error: ' + JSON.stringify(updateError));
      } else {
        log(`Updated sucursal onboarding status to ${isComplete} for account ${account.id}`);
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
