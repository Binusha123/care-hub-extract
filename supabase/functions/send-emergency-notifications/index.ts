
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

    console.log('Processing emergency notification:', { emergencyId, patientName, location, condition });

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

    // Get push subscriptions for all on-duty doctors
    const doctorIds = doctorShifts?.map(shift => shift.doctor_id) || [];
    
    if (doctorIds.length === 0) {
      console.log('No on-duty doctors found');
      return new Response(
        JSON.stringify({ success: true, message: 'No on-duty doctors to notify' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: subscriptions, error: subsError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .in('user_id', doctorIds);

    if (subsError) {
      console.error('Error fetching push subscriptions:', subsError);
    }

    console.log('Found push subscriptions:', subscriptions?.length || 0);

    // Prepare notification payload
    const notificationPayload = {
      title: '🚨 EMERGENCY ALERT',
      body: `${patientName ? `Patient: ${patientName} | ` : ''}Location: ${location} | Condition: ${condition}`,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: `emergency-${emergencyId}`,
      requireInteraction: true,
      actions: [
        {
          action: 'respond',
          title: 'Respond'
        },
        {
          action: 'dismiss',
          title: 'Dismiss'
        }
      ],
      data: {
        emergencyId,
        location,
        condition,
        patientName,
        url: '/dashboard/doctor'
      }
    };

    // Send push notifications
    const pushPromises = subscriptions?.map(async (subscription) => {
      try {
        const pushSubscription = JSON.parse(subscription.subscription);
        
        // Use Web Push Protocol to send notification
        const response = await fetch(pushSubscription.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'TTL': '86400', // 24 hours
          },
          body: JSON.stringify(notificationPayload),
        });

        if (!response.ok) {
          console.error(`Failed to send push notification to ${subscription.user_id}:`, response.statusText);
        } else {
          console.log(`Push notification sent successfully to ${subscription.user_id}`);
        }

        return { success: response.ok, userId: subscription.user_id };
      } catch (error) {
        console.error(`Error sending push notification to ${subscription.user_id}:`, error);
        return { success: false, userId: subscription.user_id, error: error.message };
      }
    }) || [];

    const pushResults = await Promise.all(pushPromises);
    const successfulPushes = pushResults.filter(result => result.success).length;

    console.log(`Sent ${successfulPushes} push notifications successfully`);

    // Send browser notifications as fallback using the service worker
    const { error: broadcastError } = await supabase
      .from('emergencies')
      .update({ 
        updated_at: new Date().toISOString() 
      })
      .eq('id', emergencyId);

    if (broadcastError) {
      console.error('Error broadcasting emergency update:', broadcastError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        notificationsSent: successfulPushes,
        totalDoctors: doctorIds.length,
        message: `Emergency alert sent to ${successfulPushes} doctors` 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in send-emergency-notifications function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
