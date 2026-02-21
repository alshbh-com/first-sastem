import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

function codeToEmail(code: string): string {
  return code.replace(/@/g, '_at_').replace(/[^a-zA-Z0-9._-]/g, '_') + '@first.ship'
}

const OWNER_PASSWORD = '01278006248@01204486263'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { password, action, userData } = await req.json()

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // ---- CREATE USER (owner only) ----
    if (action === 'create-user') {
      const authHeader = req.headers.get('Authorization')
      if (!authHeader) {
        return new Response(JSON.stringify({ error: 'غير مصرح' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Verify caller is owner
      const callerClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } }, auth: { autoRefreshToken: false, persistSession: false } }
      )
      const { data: { user: caller } } = await callerClient.auth.getUser()
      if (!caller) {
        return new Response(JSON.stringify({ error: 'غير مصرح' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const { data: callerRoles } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', caller.id)
      
      const isOwner = callerRoles?.some(r => r.role === 'owner')
      if (!isOwner) {
        return new Response(JSON.stringify({ error: 'فقط المالك يمكنه إضافة مستخدمين' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const { full_name, phone, login_code, role } = userData
      const email = codeToEmail(login_code)

      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: login_code,
        email_confirm: true,
        user_metadata: { full_name }
      })

      if (createError) {
        return new Response(JSON.stringify({ error: createError.message }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Update profile
      await supabaseAdmin.from('profiles').update({ 
        full_name, 
        phone: phone || '' 
      }).eq('id', newUser.user.id)

      // Assign role
      await supabaseAdmin.from('user_roles').insert({
        user_id: newUser.user.id,
        role
      })

      return new Response(JSON.stringify({ success: true, user_id: newUser.user.id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ---- LOGIN ----
    if (!password) {
      return new Response(JSON.stringify({ error: 'كلمة المرور مطلوبة' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const email = codeToEmail(password)

    // Try to sign in
    let { data, error } = await supabaseAdmin.auth.signInWithPassword({ email, password })

    // If fails and it's the owner password, auto-create owner
    if (error && password === OWNER_PASSWORD) {
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: 'Owner' }
      })

      if (createError) {
        return new Response(JSON.stringify({ error: createError.message }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Assign owner role
      await supabaseAdmin.from('user_roles').insert({
        user_id: newUser.user.id,
        role: 'owner'
      })

      // Sign in
      const result = await supabaseAdmin.auth.signInWithPassword({ email, password })
      data = result.data
      error = result.error
    }

    if (error) {
      return new Response(JSON.stringify({ error: 'كلمة المرور غير صحيحة' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Get user role
    const { data: roles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', data.user!.id)

    return new Response(JSON.stringify({ 
      session: data.session, 
      user: data.user,
      roles: roles?.map(r => r.role) || []
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
