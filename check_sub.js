
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qyyhembukflbxjbctuav.supabase.co';
const supabaseKey = 'sb_publishable_iyXy7g8HFkSWS-hscoR4HQ_6ONq_SzF';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSubscription() {
    console.log('Searching for business: Barbería de Emir2');

    // 1. Find the business (negocio)
    const { data: negocios, error: negError } = await supabase
        .from('negocios')
        .select('*')
        .eq('nombre', 'Barbería de Emir2');

    if (negError) {
        console.error('Error fetching businesses:', negError);
        return;
    }

    if (!negocios || negocios.length === 0) {
        console.log('No business found with name "Barbería de Emir2"');
        return;
    }

    console.log(`Found ${negocios.length} business(es). Checking the first one:`, negocios[0].id);
    const negocioId = negocios[0].id;

    // 2. Check for subscription
    const { data: sub, error: subError } = await supabase
        .from('negocio_suscripciones')
        .select('*')
        .eq('negocio_id', negocioId)
        .maybeSingle();

    if (subError) {
        console.error('Error fetching subscription:', subError);
        return;
    }

    if (!sub) {
        console.log('NO SUBSCRIPTION found for this business.');
        console.log('Expected behavior: Dashboard should redirect this user to /onboarding.');
    } else {
        console.log('SUBSCRIPTION FOUND:', sub);
        console.log('Plan:', sub.planes ? sub.planes : 'N/A (check via join if needed)');
    }
}

checkSubscription();
