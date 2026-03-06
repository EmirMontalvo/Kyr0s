import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@12.0.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
    apiVersion: '2022-11-15',
})

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Stripe Mexico fee calculation: 3.6% + $3.00 MXN
const calculateTotalWithFees = (amount: number): number => {
    // amount is in MXN
    // Formula to pass fees to customer: total = (base + fixedFee) / (1 - percentFee)
    const fixedFee = 3.00; // MXN
    const percentageFee = 0.036; // 3.6%
    const totalWithFees = (amount + fixedFee) / (1 - percentageFee);
    return Math.ceil(totalWithFees * 100) / 100; // Round up to 2 decimals
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' // Use service role for unauthenticated chatbot users
        )

        const {
            cita_id,
            monto_base,
            sucursal_id,
            cliente_email,
            cliente_nombre,
            servicios_nombres,
            success_url,
            cancel_url
        } = await req.json()

        if (!cita_id || !monto_base || !sucursal_id || !cliente_email) {
            throw new Error('Missing required fields: cita_id, monto_base, sucursal_id, cliente_email')
        }

        // Calculate total with Stripe fees
        const montoTotal = calculateTotalWithFees(monto_base);

        // Get sucursal info for description
        const { data: sucursal } = await supabaseClient
            .from('sucursales')
            .select('nombre, negocio_id, stripe_account_id, stripe_onboarding_complete')
            .eq('id', sucursal_id)
            .single();

        if (!sucursal) {
            throw new Error('Sucursal not found')
        }

        // Create Stripe Checkout Session (one-time payment)
        const sessionConfig: any = {
            payment_method_types: ['card'],
            customer_email: cliente_email,
            line_items: [
                {
                    price_data: {
                        currency: 'mxn',
                        product_data: {
                            name: `Cita en ${sucursal.nombre}`,
                            description: servicios_nombres || 'Servicios de barbería',
                        },
                        unit_amount: Math.round(montoTotal * 100), // Stripe expects cents
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            payment_intent_data: {
                receipt_email: cliente_email,
            },
            success_url: success_url || `${req.headers.get('origin')}/chat/${sucursal_id}?payment=success&cita_id=${cita_id}`,
            cancel_url: cancel_url || `${req.headers.get('origin')}/chat/${sucursal_id}?payment=cancelled&cita_id=${cita_id}`,
            metadata: {
                type: 'appointment', // To distinguish from subscription payments in webhook
                cita_id: cita_id.toString(),
                sucursal_id: sucursal_id.toString(),
                negocio_id: sucursal.negocio_id,
                monto_base: monto_base.toString(),
                monto_total: montoTotal.toString(),
            }
        };

        // If the branch is completely onboarded to Stripe Connect, route funds to them directly as a Destination Charge
        if (sucursal.stripe_account_id && sucursal.stripe_onboarding_complete) {
            sessionConfig.payment_intent_data.transfer_data = {
                destination: sucursal.stripe_account_id,
            };
        }

        const session = await stripe.checkout.sessions.create(sessionConfig)

        // Update cita with session_id and calculated total
        await supabaseClient
            .from('citas')
            .update({
                stripe_session_id: session.id,
                monto_total: montoTotal,
                cliente_email: cliente_email
            })
            .eq('id', cita_id);

        return new Response(
            JSON.stringify({
                url: session.url,
                session_id: session.id,
                monto_total: montoTotal
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            },
        )
    } catch (error) {
        console.error('Error processing appointment checkout:', error.message);
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            },
        )
    }
})
