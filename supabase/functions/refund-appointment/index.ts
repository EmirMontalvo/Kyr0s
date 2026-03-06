import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
    apiVersion: '2023-10-16',
    httpClient: Stripe.createFetchHttpClient(),
})

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { cita_id } = await req.json()

        if (!cita_id) {
            throw new Error('Missing required field: cita_id')
        }

        // Get the cita with payment info
        const { data: cita, error: citaError } = await supabaseClient
            .from('citas')
            .select('stripe_payment_intent_id, estado_pago, monto_total, cliente_email')
            .eq('id', cita_id)
            .single()

        if (citaError || !cita) {
            throw new Error('Cita not found')
        }

        if (cita.estado_pago !== 'pagado') {
            throw new Error('Cannot refund: cita is not paid')
        }

        if (!cita.stripe_payment_intent_id) {
            throw new Error('Cannot refund: no payment intent found')
        }

        // Create refund in Stripe
        const refund = await stripe.refunds.create({
            payment_intent: cita.stripe_payment_intent_id,
            reason: 'requested_by_customer',
        })

        // Update cita status
        await supabaseClient
            .from('citas')
            .update({
                estado_pago: 'reembolsado',
                estado: 'cancelada'
            })
            .eq('id', cita_id)

        return new Response(
            JSON.stringify({
                success: true,
                refund_id: refund.id,
                refund_status: refund.status,
                amount_refunded: refund.amount / 100 // Convert from cents to MXN
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            },
        )
    } catch (error: any) {
        console.error('Error processing refund:', error.message)
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            },
        )
    }
})
