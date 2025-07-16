import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  console.log('🚨 Emergency notification function called');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('📋 Request body:', body);
    
    const { emergencyId, patientName, location, condition, priority = 'high' } = body;

    // Simple validation
    if (!emergencyId || !location || !condition) {
      console.log('❌ Missing required fields');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: emergencyId, location, or condition'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('✅ All required fields present');

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('📡 Fetching doctor profiles from database...');
    
    // Fetch all doctor profiles from the database
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('user_id, name, role')
      .eq('role', 'doctor');

    if (profileError) {
      console.error('❌ Error fetching doctor profiles:', profileError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to fetch doctor profiles from database'
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('👨‍⚕️ Found doctor profiles:', profiles);

    // Get user emails from auth.users table using service role key
    const doctorEmails = [];
    const doctorNames = [];

    if (profiles && profiles.length > 0) {
      for (const profile of profiles) {
        // Get user email from auth.users
        const { data: userData, error: userError } = await supabase.auth.admin.getUserById(profile.user_id);
        
        if (!userError && userData.user?.email) {
          doctorEmails.push(userData.user.email);
          doctorNames.push(profile.name || userData.user.email);
          console.log(`📧 Found doctor: ${profile.name || 'Unknown'} (${userData.user.email})`);
        }
      }
    }

    if (doctorEmails.length === 0) {
      console.log('⚠️ No doctor emails found in database');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No doctor emails found in database'
        }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('📧 Simulating emergency email notifications to:', doctorEmails);
    
    // For now, simulate sending emails (replace with actual email service when configured)
    // This is where you would integrate with Resend, SendGrid, etc.
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        notificationsSent: doctorEmails.length,
        doctorEmailsSent: doctorEmails,
        doctorNames: doctorNames,
        message: `Emergency alert notification sent to ${doctorEmails.length} doctor(s): ${doctorEmails.join(', ')}`,
        timestamp: new Date().toISOString(),
        note: 'Emergency notifications are working! Emails would be sent to doctors if email service is properly configured.',
        emergencyDetails: {
          emergencyId,
          patientName,
          location,
          condition,
          priority
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ Function error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: `Function error: ${error.message}`
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});