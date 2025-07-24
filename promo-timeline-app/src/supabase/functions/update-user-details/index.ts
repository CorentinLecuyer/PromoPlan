// File: supabase/functions/update-user-details/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  // This is needed for browser calls to the function
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { updates, userIdToUpdate } = await req.json()

    // Create a Supabase client with the SERVICE_ROLE_KEY to get admin privileges
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Separate the updates for each table
    const profileTableUpdates = {
      first_name: updates.first_name,
      last_name: updates.last_name,
      country: updates.country,
      channel: updates.channel,
      manager_id: updates.manager_id,
      employee_id: updates.employee_id,
      job_title: updates.job_title,
      app_role: updates.app_role,
    }

    const authMetadataUpdates = {
      user_metadata: {
        display_name: updates.display_name,
        avatar_emoji: updates.avatar_emoji,
      },
    }

    // 2. Perform the update on the public.user_profiles table
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .update(profileTableUpdates)
      .eq('id', userIdToUpdate)
    
    if (profileError) throw profileError

    // 3. Perform the update on the auth.users table
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      userIdToUpdate,
      authMetadataUpdates
    )

    if (authError) throw authError

    return new Response(JSON.stringify({ message: 'User updated successfully' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})