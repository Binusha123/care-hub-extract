
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

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('🚨 Emergency notification function called');
  console.log('📋 Environment check:');
  console.log('- SUPABASE_URL:', Deno.env.get('SUPABASE_URL') ? '✅ Set' : '❌ Missing');
  console.log('- SUPABASE_SERVICE_ROLE_KEY:', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ? '✅ Set' : '❌ Missing');
  console.log('- RESEND_API_KEY:', Deno.env.get('RESEND_API_KEY') ? '✅ Set' : '❌ Missing');

  try {
    const { emergencyId, patientName, location, condition, priority = 'high' }: EmergencyNotificationRequest = await req.json();

    console.log('🚨 Processing emergency notification:', { emergencyId, patientName, location, condition, priority });

    // Check if RESEND_API_KEY is configured
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.error('❌ RESEND_API_KEY not found');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'RESEND_API_KEY not configured. Please check Supabase Edge Function secrets.',
          notificationsSent: 0,
          doctorEmailsSent: []
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

    console.log('✅ RESEND_API_KEY found, length:', resendApiKey.length);
    
    // Initialize Resend with proper error handling
    let resend;
    try {
      resend = new Resend(resendApiKey);
      console.log('✅ Resend client initialized successfully');
    } catch (resendInitError) {
      console.error('❌ Failed to initialize Resend client:', resendInitError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to initialize email service',
          notificationsSent: 0,
          doctorEmailsSent: []
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

    // Get doctor profiles
    console.log('👨‍⚕️ Fetching doctor profiles...');
    const { data: doctorProfiles, error: doctorError } = await supabase
      .from('profiles')
      .select('user_id, name, department')
      .eq('role', 'doctor');

    if (doctorError) {
      console.error('❌ Error fetching doctor profiles:', doctorError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to fetch doctor profiles',
          notificationsSent: 0,
          doctorEmailsSent: []
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

    console.log(`👨‍⚕️ Found ${doctorProfiles?.length || 0} doctor profiles:`, doctorProfiles);

    if (!doctorProfiles || doctorProfiles.length === 0) {
      console.log('⚠️ No doctor profiles found');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No doctor profiles found. Please create doctor accounts first.', 
          notificationsSent: 0,
          doctorEmailsSent: []
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    // Send email to test doctor email for demo
    const testDoctorEmail = "abcdwxyz6712@gmail.com";
    console.log(`📧 Sending emergency email to test doctor: ${testDoctorEmail}...`);
    
    const doctorProfile = doctorProfiles[0];
    const doctorName = doctorProfile?.name || 'Doctor';
    const department = doctorProfile?.department || 'Emergency';

    let emailResponse;
    try {
      emailResponse = await resend.emails.send({
        from: "MediAid Emergency <onboarding@resend.dev>",
        to: [testDoctorEmail],
        subject: `🚨 EMERGENCY ALERT - ${location.toUpperCase()}`,
        html: `
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
                Dear Dr. ${doctorName},<br><br>
                This is a critical emergency alert from the MediAid system. Please respond immediately and proceed to the specified location for emergency medical assistance.
              </p>
              
              <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin-top: 30px;">
                <p style="margin: 0; font-size: 12px; color: #6b7280;">
                  Emergency ID: ${emergencyId}<br>
                  Department: ${department}<br>
                  Sent from MediAid Emergency System<br>
                  Time: ${new Date().toISOString()}
                </p>
              </div>
            </div>
          </div>
        `,
        headers: {
          'X-Priority': '1',
          'X-MSMail-Priority': 'High',
          'Importance': 'high'
        }
      });

      console.log('📧 Email send response:', emailResponse);

    } catch (emailError) {
      console.error('❌ Error sending email:', emailError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Email sending failed: ${emailError.message}`,
          notificationsSent: 0,
          doctorEmailsSent: []
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

    if (emailResponse.error) {
      console.error('❌ Resend API error:', emailResponse.error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Resend API error: ${emailResponse.error.message}`,
          notificationsSent: 0,
          doctorEmailsSent: []
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

    console.log(`✅ Emergency email sent successfully to ${testDoctorEmail}`);
    console.log(`📧 Email ID: ${emailResponse.data?.id}`);

    const responseData = { 
      success: true, 
      notificationsSent: 1,
      notificationsFailed: 0,
      totalDoctors: doctorProfiles.length,
      doctorEmailsSent: [testDoctorEmail],
      emailId: emailResponse.data?.id,
      message: `Emergency alert sent successfully to ${testDoctorEmail}`
    };

    console.log('📊 Emergency notification summary:', responseData);

    return new Response(
      JSON.stringify(responseData),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: any) {
    console.error('❌ Error in send-emergency-notifications function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false,
        notificationsSent: 0,
        details: 'Emergency notification system error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
