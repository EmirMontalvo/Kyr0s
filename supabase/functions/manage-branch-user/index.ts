import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
    const { action, email, password, userId, sucursalId, businessId, oldEmail } = await req.json()

    // Create Supabase client with Service Role Key (Admin)
    const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    try {
        if (action === 'create') {
            // 1. Create Auth User
            const { data: user, error: createError } = await supabaseAdmin.auth.admin.createUser({
                email: email,
                password: password,
                email_confirm: true, // Auto-confirm
                user_metadata: { rol: 'sucursal' }
            })

            if (createError) throw createError

            // 2. Insert Profile
            // Check if profile exists (corner case) or just insert
            const { error: profileError } = await supabaseAdmin
                .from('usuarios_perfiles')
                .insert({
                    id: user.user.id,
                    rol: 'sucursal',
                    sucursal_id: sucursalId,
                    // negocio_id might be needed if we enforce RLS by negocio
                    // Assuming we pass it or it's nullable
                    email: email // Storing for display
                })

            if (profileError) {
                // Rollback user creation? Handled manually or ignored for now
                await supabaseAdmin.auth.admin.deleteUser(user.user.id)
                throw profileError
            }

            return new Response(JSON.stringify({ user: user.user }), { headers: { "Content-Type": "application/json" } })
        }

        if (action === 'update') {
            if (!userId) throw new Error('User ID required for update')

            const updateData: any = { email }
            if (password && password.length > 0) {
                updateData.password = password
            }

            const { data: user, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
                userId,
                updateData
            )

            if (updateError) throw updateError

            // Update Profile Email
            if (email !== oldEmail) {
                await supabaseAdmin
                    .from('usuarios_perfiles')
                    .update({ email: email })
                    .eq('id', userId)
            }

            return new Response(JSON.stringify({ user: user.user }), { headers: { "Content-Type": "application/json" } })
        }

        if (action === 'get_by_branch') {
            // Helper to find the user for a branch? 
            // Or we just rely on client querying 'usuarios_perfiles' which now has email.
        }

        return new Response("Invalid action", { status: 400 })

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { "Content-Type": "application/json" } })
    }
})
