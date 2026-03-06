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

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' // Service role needed to update sucursales
        )

        const { sucursal_id, return_url, refresh_url } = await req.json()

        if (!sucursal_id || !return_url || !refresh_url) {
            throw new Error('Missing required fields: sucursal_id, return_url, refresh_url')
        }

        // 1. Get the current sucursal
        const { data: sucursal, error: fetchError } = await supabaseClient
            .from('sucursales')
            .select('id, nombre, stripe_account_id')
            .eq('id', sucursal_id)
            .single()

        if (fetchError || !sucursal) {
            throw new Error(`Error fetching sucursal: ${fetchError?.message || 'Not found'}`)
        }

        let stripeAccountId = sucursal.stripe_account_id

        // 2. If the sucursal doesn't have a Stripe account yet, create one
        if (!stripeAccountId) {
            console.log(`Creating new Stripe Express Account for sucursal ${sucursal_id}`);
            const account = await stripe.accounts.create({
                type: 'express',
                capabilities: {
                    card_payments: { requested: true },
                    transfers: { requested: true },
                },
                business_profile: {
                    name: sucursal.nombre
                }
            })

            stripeAccountId = account.id

            // Save the new account ID to the database
            const { error: updateError } = await supabaseClient
                .from('sucursales')
                .update({ stripe_account_id: stripeAccountId })
                .eq('id', sucursal_id)

            if (updateError) {
                console.error('Error saving stripe_account_id:', updateError)
                throw new Error('Could not save Stripe Account ID to database')
            }
        }

        // 3. Create an Account Link for onboarding
        console.log(`Generating AccountLink for existing Stripe Account ${stripeAccountId}`);
        const accountLink = await stripe.accountLinks.create({
            account: stripeAccountId,
            refresh_url: refresh_url,
            return_url: return_url,
            type: 'account_onboarding',
        })

        // 4. Return the URL to redirect the user
        return new Response(
            JSON.stringify({ url: accountLink.url }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        )

    } catch (error: any) {
        console.error('Stripe Connect error:', error.message)
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            }
        )
    }
})
