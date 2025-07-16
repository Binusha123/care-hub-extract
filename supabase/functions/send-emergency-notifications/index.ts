import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';
import { Resend } from "npm:resend@2.0.0";

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

    // Initialize Resend with API key from environment
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    if (!resendApiKey) {
      console.error('❌ RESEND_API_KEY not found in environment variables');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Email service not configured. RESEND_API_KEY missing.'
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('✅ RESEND_API_KEY found, initializing Resend...');
    const resend = new Resend(resendApiKey);
    
    console.log('📧 Sending actual emergency emails using Resend...');
    
    const emailResults = [];
    
    for (let i = 0; i < doctorEmails.length; i++) {
      const doctorEmail = doctorEmails[i];
      const doctorName = doctorNames[i];
      
      try {
        console.log(`📧 Sending emergency email to ${doctorName} (${doctorEmail})`);
        
        const emailResponse = await resend.emails.send({
          from: "MediAid Emergency <onboarding@resend.dev>",
          to: [doctorEmail],
          subject: `🚨 EMERGENCY ALERT - ${condition.toUpperCase()}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #fff; border: 2px solid #dc2626;">
              <h1 style="color: #dc2626; text-align: center; margin-bottom: 30px;">🚨 EMERGENCY ALERT</h1>
              
              <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h2 style="color: #dc2626; margin-top: 0;">Emergency Details</h2>
                <p><strong>Patient:</strong> ${patientName || 'Unknown'}</p>
                <p><strong>Location:</strong> ${location}</p>
                <p><strong>Condition:</strong> ${condition}</p>
                <p><strong>Priority:</strong> ${priority.toUpperCase()}</p>
                <p><strong>Emergency ID:</strong> ${emergencyId}</p>
                <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
              </div>
              
              <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px;">
                <p style="margin: 0; color: #374151;">
                  <strong>Dr. ${doctorName},</strong><br>
                  Immediate medical attention is required. Please respond as soon as possible.
                </p>
              </div>
              
              <div style="text-align: center; margin-top: 30px;">
                <p style="color: #6b7280; font-size: 14px;">
                  This is an automated emergency notification from MediAid Hospital Management System.
                </p>
              </div>
            </div>
          `,
          headers: {
            'X-Priority': '1',
            'X-MSMail-Priority': 'High',
            'Importance': 'high'
          }
        });

        if (emailResponse.error) {
          console.error(`❌ Error sending email to ${doctorEmail}:`, emailResponse.error);
          emailResults.push({ 
            email: doctorEmail, 
            success: false, 
            error: emailResponse.error.message 
          });
        } else {
          console.log(`✅ Email sent successfully to ${doctorEmail}:`, emailResponse.data);
          emailResults.push({ 
            email: doctorEmail, 
            success: true, 
            emailId: emailResponse.data?.id 
          });
        }
      } catch (error) {
        console.error(`❌ Exception sending email to ${doctorEmail}:`, error);
        emailResults.push({ 
          email: doctorEmail, 
          success: false, 
          error: error.message 
        });
      }
    }

    const successfulEmails = emailResults.filter(result => result.success);
    const failedEmails = emailResults.filter(result => !result.success);

    console.log(`📧 Email sending completed: ${successfulEmails.length} successful, ${failedEmails.length} failed`);
    
    return new Response(
      JSON.stringify({ 
        success: successfulEmails.length > 0,
        notificationsSent: successfulEmails.length,
        totalDoctors: doctorEmails.length,
        doctorEmailsSent: successfulEmails.map(r => r.email),
        doctorNames: doctorNames,
        message: `Emergency emails sent successfully to ${successfulEmails.length} doctor(s): ${successfulEmails.map(r => r.email).join(', ')}`,
        timestamp: new Date().toISOString(),
        emailResults: emailResults,
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