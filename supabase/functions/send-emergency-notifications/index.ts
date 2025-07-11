
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

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// VAPID keys for push notifications (in production, use environment variables)
const VAPID_PUBLIC_KEY = 'BKJX3HYuWQR5K5M5M4-sj5YGZ9RKE5Y4P5M5M5M5M5M5M5M5M5M5M5M5M5M5M5M5M5M5M5M5M5M5M5M5M5M5M5M5M5M5M5M5M5';
const VAPID_PRIVATE_KEY = 'your-vapid-private-key'; // Use environment variable in production

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

    // Get push subscriptions for all on-duty doctors
    const { data: subscriptions, error: subsError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .in('user_id', doctorIds);

    if (subsError) {
      console.error('Error fetching push subscriptions:', subsError);
    }

    console.log('Found push subscriptions:', subscriptions?.length || 0);

    // Enhanced notification payload for mobile devices
    const notificationPayload = {
      title: '🚨 EMERGENCY ALERT - IMMEDIATE RESPONSE REQUIRED',
      body: `${patientName ? `Patient: ${patientName}\n` : ''}Location: ${location}\nCondition: ${condition}\nPriority: ${priority.toUpperCase()}`,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: `emergency-${emergencyId}`,
      requireInteraction: true,
      renotify: true,
      vibrate: [500, 200, 500, 200, 500],
      silent: false,
      timestamp: Date.now(),
      actions: [
        {
          action: 'respond',
          title: '🏃 Respond Now',
          icon: '/favicon.ico'
        },
        {
          action: 'dismiss',
          title: '❌ Dismiss',
          icon: '/favicon.ico'
        }
      ],
      data: {
        emergencyId,
        location,
        condition,
        patientName,
        priority,
        url: '/dashboard/doctor',
        timestamp: Date.now()
      }
    };

    let successfulNotifications = 0;
    let failedNotifications = 0;

    // Send push notifications to all subscribed doctors
    if (subscriptions && subscriptions.length > 0) {
      const pushPromises = subscriptions.map(async (subscription) => {
        try {
          const pushSubscription: PushSubscription = JSON.parse(subscription.subscription);
          
          console.log(`Sending push notification to doctor ${subscription.user_id}...`);
          
          // Create the push notification request
          const pushPayload = JSON.stringify(notificationPayload);
          
          // For now, we'll use a simple HTTP request to the push service
          // In production, you should use proper Web Push Protocol with VAPID
          const response = await fetch(pushSubscription.endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'TTL': '86400', // 24 hours
              'Content-Length': pushPayload.length.toString(),
            },
            body: pushPayload,
          });

          if (response.ok) {
            console.log(`✅ Push notification sent successfully to doctor ${subscription.user_id}`);
            successfulNotifications++;
            return { success: true, userId: subscription.user_id };
          } else {
            console.error(`❌ Failed to send push notification to doctor ${subscription.user_id}:`, response.status, response.statusText);
            failedNotifications++;
            return { success: false, userId: subscription.user_id, error: `HTTP ${response.status}` };
          }
        } catch (error) {
          console.error(`❌ Error sending push notification to doctor ${subscription.user_id}:`, error);
          failedNotifications++;
          return { success: false, userId: subscription.user_id, error: error.message };
        }
      });

      await Promise.all(pushPromises);
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
      totalSubscriptions: subscriptions?.length || 0,
      message: `Emergency alert sent to ${successfulNotifications} doctors${failedNotifications > 0 ? ` (${failedNotifications} failed)` : ''}`
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
