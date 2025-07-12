
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

  try {
    const { emergencyId, patientName, location, condition, priority = 'high' }: EmergencyNotificationRequest = await req.json();

    console.log('🚨 Processing emergency notification:', { emergencyId, patientName, location, condition, priority });

    // Check if RESEND_API_KEY is configured
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.error('❌ RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'RESEND_API_KEY not configured. Please add it in Supabase Edge Functions settings.',
          notificationsSent: 0,
          doctorEmailsSent: []
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

    const resend = new Resend(resendApiKey);

    // Get ALL users
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
      throw usersError;
    }

    console.log(`📋 Found ${users?.length || 0} total users in the system`);

    if (!users || users.length === 0) {
      console.log('⚠️ No users found in the system');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No users found in the system', 
          notificationsSent: 0,
          doctorEmailsSent: [],
          totalUsers: 0,
          totalDoctors: 0
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    // Get doctor profiles
    const { data: doctorProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, name, department')
      .eq('role', 'doctor');

    if (profilesError) {
      console.error('❌ Error fetching doctor profiles:', profilesError);
      throw profilesError;
    }

    console.log(`👨‍⚕️ Found ${doctorProfiles?.length || 0} doctor profiles`);

    if (!doctorProfiles || doctorProfiles.length === 0) {
      console.log('⚠️ No doctor profiles found - you need to create users with doctor role');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No doctor profiles found. Please create users with doctor role first.', 
          notificationsSent: 0,
          doctorEmailsSent: [],
          totalUsers: users.length,
          totalDoctors: 0,
          suggestion: 'Sign up new users and set their role to "doctor" in the profiles table'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    let successfulNotifications = 0;
    let failedNotifications = 0;
    let doctorEmailsSent = [];

    // Send emails to doctors
    for (const doctorProfile of doctorProfiles) {
      try {
        // Find the user data for this doctor
        const user = users.find(u => u.id === doctorProfile.user_id);
        
        if (!user || !user.email) {
          console.log(`⚠️ Doctor ${doctorProfile.name} has no email address`);
          failedNotifications++;
          continue;
        }

        const doctorName = doctorProfile.name || user.email.split('@')[0];
        const department = doctorProfile.department || 'General';

        console.log(`📧 Sending email notification to Dr. ${doctorName} at ${user.email}...`);
        
        const emailResponse = await resend.emails.send({
          from: "MediAid Emergency <onboarding@resend.dev>",
          to: [user.email],
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
          `
        });

        if (emailResponse.error) {
          console.error(`❌ Failed to send email to Dr. ${doctorName} at ${user.email}:`, emailResponse.error);
          failedNotifications++;
        } else {
          console.log(`✅ Email notification sent successfully to Dr. ${doctorName} at ${user.email}`);
          console.log('Email response:', emailResponse);
          successfulNotifications++;
          doctorEmailsSent.push(user.email);
        }

      } catch (error) {
        console.error(`❌ Error processing notification for doctor ${doctorProfile.name}:`, error);
        failedNotifications++;
      }
    }

    const responseData = { 
      success: true, 
      notificationsSent: successfulNotifications,
      notificationsFailed: failedNotifications,
      totalDoctors: doctorProfiles.length,
      totalUsers: users.length,
      doctorEmailsSent: doctorEmailsSent,
      message: successfulNotifications > 0 
        ? `Emergency alert sent to ${successfulNotifications} doctors via email${failedNotifications > 0 ? ` (${failedNotifications} failed)` : ''}`
        : `No emails sent - ${failedNotifications} failed attempts`
    };

    console.log('📊 Emergency notification summary:', responseData);

    return new Response(
      JSON.stringify(responseData),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('❌ Error in send-emergency-notifications function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false,
        notificationsSent: 0,
        details: 'Emergency notification system error. Check if RESEND_API_KEY is configured.'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
