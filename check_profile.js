
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qyyhembukflbxjbctuav.supabase.co';
const supabaseKey = 'sb_publishable_iyXy7g8HFkSWS-hscoR4HQ_6ONq_SzF';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUserProfile() {
    console.log('Searching for user: emoncan23@gmail.com');

    // 1. Get User ID from Auth (simulated lookup via email if possible, or just query profile directly if email column exists there, usually it's in auth.users)
    // Since we don't have direct access to auth.users via client usually, we'll try to find by some other means if possible. 
    // Actually, `usuarios_perfiles` usually has an ID that matches auth.users.id. We might not have email in usuarios_perfiles.
    // Let's assume we can query `negocios` first, get the ID, then find the profile linked to it?
    // Or, we can try to query `usuarios_perfiles` and see if we can identify them.

    // Better strategy: We know the negocio name "Barbería de Emir2".

    const { data: negocios } = await supabase
        .from('negocios')
        .select('id, nombre')
        .eq('nombre', 'Barbería de Emir2')
        .single();

    if (!negocios) {
        console.log('Negocio not found.');
        return;
    }

    console.log('Negocio ID:', negocios.id);

    const { data: profiles, error } = await supabase
        .from('usuarios_perfiles')
        .select('*')
        .eq('negocio_id', negocios.id);

    if (error) {
        console.error('Error fetching profiles:', error);
    } else {
        console.log('Profiles associated with this business:');
        console.log(profiles);
    }
}

checkUserProfile();
