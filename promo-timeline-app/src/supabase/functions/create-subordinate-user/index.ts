// Final cleaned-up version of index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const userClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    const { data: { user: manager } } = await userClient.auth.getUser();
    if (!manager) throw new Error("Could not identify the manager. Please log in again.");

    const { newUser } = await req.json();
    if (!newUser) throw new Error("Missing user data in the request.");

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        newUser.email,
        {
          data: { /* ... all your metadata ... */ },
          redirectTo: `${Deno.env.get('SITE_URL')}/promo-timeline-app/src/set-password.html`
        }
    );

    if (inviteError) throw new Error(`The invitation failed: ${inviteError.message}`);

    return new Response(
      JSON.stringify({ message: `Successfully sent invitation to ${newUser.email}` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('CRITICAL FUNCTION ERROR:', error.message);
    return new Response(
        JSON.stringify({ error: error.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
})