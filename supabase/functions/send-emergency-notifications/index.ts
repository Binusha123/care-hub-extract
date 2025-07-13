
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmergencyNotificationRequest {
  emergencyId: string;
  patientName?: string;
  location: string;
  condition: string;
  priority?: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('🚨 Emergency notification function started');

  try {
    // Parse request body
    const requestBody: EmergencyNotificationRequest = await req.json();
    console.log('📋 Request body:', requestBody);
    
    const { emergencyId, patientName, location, condition, priority = 'high' } = requestBody;

    // Validate required fields
    if (!emergencyId || !location || !condition) {
      console.error('❌ Missing required fields');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: emergencyId, location, and condition are required',
          notificationsSent: 0,
          doctorEmailsSent: []
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    // Check environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    console.log('🔧 Environment check:');
    console.log('- SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
    console.log('- SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅ Set' : '❌ Missing');
    console.log('- RESEND_API_KEY:', resendApiKey ? '✅ Set' : '❌ Missing');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Supabase configuration missing');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Supabase configuration missing',
          notificationsSent: 0,
          doctorEmailsSent: []
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

    if (!resendApiKey) {
      console.error('❌ RESEND_API_KEY missing');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'RESEND_API_KEY not configured',
          notificationsSent: 0,
          doctorEmailsSent: []
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log('✅ Supabase client initialized');

    // Initialize Resend client
    const resend = new Resend(resendApiKey);
    console.log('✅ Resend client initialized');

    // For demo purposes, send to the test email directly
    const testDoctorEmail = "abcdwxyz6712@gmail.com";
    console.log(`📧 Sending emergency email to: ${testDoctorEmail}`);
    
    // Create email content
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <div style="background-color: #dc2626; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">🚨 EMERGENCY ALERT</h1>
          <p style="margin: 5px 0 0 0; font-size: 16px;">IMMEDIATE MEDICAL ATTENTION REQUIRED</p>
        </div>
        
        <div style="padding: 30px 20px;">
          <div style="background-color: #fee2e2; border-left: 4px solid #dc2626; padding: 20px; margin-bottom: 20px;">
            <h2 style="color: #991b1b; margin-top: 0; font-size: 18px;">Emergency Details</h2>
            ${patientName ? `<p style="margin: 8px 0;"><strong>Patient:</strong> ${patientName}</p>` : ''}
            <p style="margin: 8px 0;"><strong>Location:</strong> ${location}</p>
            <p style="margin: 8px 0;"><strong>Condition:</strong> ${condition}</p>
            <p style="margin: 8px 0;"><strong>Priority:</strong> <span style="color: #dc2626; font-weight: bold;">${priority.toUpperCase()}</span></p>
            <p style="margin: 8px 0;"><strong>Time:</strong> ${new Date().toLocaleString()}</p>
          </div>
          
          <div style="background-color: #f59e0b; color: white; padding: 15px; text-align: center; margin: 20px 0; border-radius: 5px;">
            <p style="margin: 0; font-size: 16px; font-weight: bold;">⚠️ IMMEDIATE ACTION REQUIRED</p>
          </div>
          
          <p style="font-size: 16px; line-height: 1.6;">
            Dear Doctor,<br><br>
            This is a critical emergency alert from the MediAid system. Please respond immediately and proceed to the specified location for emergency medical assistance.
          </p>
          
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin-top: 30px;">
            <p style="margin: 0; font-size: 12px; color: #6b7280;">
              Emergency ID: ${emergencyId}<br>
              Sent from MediAid Emergency System<br>
              Time: ${new Date().toISOString()}
            </p>
          </div>
        </div>
      </div>
    `;

    // Send email using Resend
    console.log('📤 Sending email via Resend...');
    const emailResponse = await resend.emails.send({
      from: "MediAid Emergency <onboarding@resend.dev>",
      to: [testDoctorEmail],
      subject: `🚨 EMERGENCY ALERT - ${location.toUpperCase()}`,
      html: emailHtml,
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'high'
      }
    });

    console.log('📧 Email response:', emailResponse);

    if (emailResponse.error) {
      console.error('❌ Email sending failed:', emailResponse.error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Email sending failed: ${emailResponse.error.message}`,
          notificationsSent: 0,
          doctorEmailsSent: []
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

    console.log('✅ Email sent successfully');
    const successResponse = { 
      success: true, 
      notificationsSent: 1,
      notificationsFailed: 0,
      totalDoctors: 1,
      doctorEmailsSent: [testDoctorEmail],
      emailId: emailResponse.data?.id,
      message: `Emergency alert sent successfully to ${testDoctorEmail}`
    };

    console.log('📊 Success response:', successResponse);

    return new Response(
      JSON.stringify(successResponse),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: any) {
    console.error('❌ Function error:', error);
    console.error('❌ Error stack:', error.stack);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'Unknown error occurred',
        notificationsSent: 0,
        doctorEmailsSent: [],
        details: 'Emergency notification system error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
