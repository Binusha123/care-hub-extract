
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    console.log('Processing emergency notification:', { emergencyId, patientName, location, condition, priority });

    // Get all doctors who are on duty
    const { data: doctorShifts, error: shiftsError } = await supabase
      .from('doctor_shifts')
      .select(`
        doctor_id,
        profiles!inner (
          user_id,
          name,
          role
        )
      `)
      .eq('status', 'on-duty')
      .eq('profiles.role', 'doctor');

    if (shiftsError) {
      console.error('Error fetching doctor shifts:', shiftsError);
      throw shiftsError;
    }

    console.log('Found on-duty doctors:', doctorShifts?.length || 0);

    const doctorIds = doctorShifts?.map(shift => shift.doctor_id) || [];
    
    if (doctorIds.length === 0) {
      console.log('No on-duty doctors found');
      return new Response(
        JSON.stringify({ success: true, message: 'No on-duty doctors to notify', notificationsSent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get doctor emails from auth.users via profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, name')
      .in('user_id', doctorIds);

    if (profilesError) {
      console.error('Error fetching doctor profiles:', profilesError);
      throw profilesError;
    }

    let successfulNotifications = 0;
    let failedNotifications = 0;

    // Send email to each doctor
    for (const profile of profiles || []) {
      try {
        // Get user details including email
        const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(profile.user_id);
        
        if (userError || !user?.email) {
          console.error(`Error getting user email for ${profile.user_id}:`, userError);
          failedNotifications++;
          continue;
        }

        console.log(`Sending email notification to doctor ${profile.name} at ${user.email}...`);
        
        // Call the send-emergency-email function
        const { data: emailResult, error: emailError } = await supabase.functions.invoke('send-emergency-email', {
          body: {
            to: user.email,
            doctorName: profile.name,
            subject: `🚨 EMERGENCY ALERT - IMMEDIATE RESPONSE REQUIRED`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #dc2626; font-size: 24px; margin-bottom: 20px;">🚨 EMERGENCY ALERT</h1>
                
                <div style="background-color: #fee2e2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                  <h2 style="color: #991b1b; margin-top: 0;">Emergency Details</h2>
                  ${patientName ? `<p><strong>Patient:</strong> ${patientName}</p>` : ''}
                  <p><strong>Location:</strong> ${location}</p>
                  <p><strong>Condition:</strong> ${condition}</p>
                  <p><strong>Priority:</strong> <span style="color: #dc2626; font-weight: bold;">${priority.toUpperCase()}</span></p>
                  <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
                </div>
                
                <div style="margin: 20px 0;">
                  <p style="font-size: 16px; font-weight: bold; color: #dc2626;">
                    ⚠️ IMMEDIATE ACTION REQUIRED
                  </p>
                  <p>This is a critical emergency alert. Please respond immediately and proceed to the specified location.</p>
                </div>
                
                <div style="background-color: #f3f4f6; border-radius: 8px; padding: 15px;">
                  <p style="margin: 0; font-size: 14px; color: #6b7280;">
                    Emergency ID: ${emergencyId}<br>
                    Sent from MediAid Emergency System
                  </p>
                </div>
              </div>
            `,
            emergencyDetails: {
              emergencyId,
              patientName,
              location,
              condition,
              priority
            }
          }
        });

        if (emailError) {
          console.error(`Failed to send email to ${user.email}:`, emailError);
          failedNotifications++;
        } else {
          console.log(`✅ Email notification sent successfully to ${user.email}`);
          successfulNotifications++;
        }

      } catch (error) {
        console.error(`Error processing notification for doctor ${profile.user_id}:`, error);
        failedNotifications++;
      }
    }

    // Update emergency record with notification status
    const { error: updateError } = await supabase
      .from('emergencies')
      .update({ 
        updated_at: new Date().toISOString()
      })
      .eq('id', emergencyId);

    if (updateError) {
      console.error('Error updating emergency record:', updateError);
    }

    const responseData = { 
      success: true, 
      notificationsSent: successfulNotifications,
      notificationsFailed: failedNotifications,
      totalDoctors: doctorIds.length,
      message: `Emergency alert sent to ${successfulNotifications} doctors via email${failedNotifications > 0 ? ` (${failedNotifications} failed)` : ''}`
    };

    console.log('Emergency notification summary:', responseData);

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
        notificationsSent: 0
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
