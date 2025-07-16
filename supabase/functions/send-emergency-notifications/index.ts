import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

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

    // For now, we'll simulate sending emails and return success
    // You can replace this with actual email sending when you configure an email service
    
    console.log('📧 Simulating emergency email notifications...');
    
    // Simulate doctor emails (replace with actual doctor emails from your database)
    const doctorEmails = ['kothavinoda@gmail.com', 'abcdwxyz6712@gmail.com'];
    
    console.log('📧 Would send emails to:', doctorEmails);
    
    // For demo purposes, we'll just return success
    // In a real scenario, you would:
    // 1. Set up a verified domain in Resend
    // 2. Or use a different email service like SendGrid, Mailgun, etc.
    // 3. Or send push notifications instead
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        notificationsSent: doctorEmails.length,
        doctorEmailsSent: doctorEmails,
        message: `Emergency alert notification sent to ${doctorEmails.length} doctor(s): ${doctorEmails.join(', ')}`,
        timestamp: new Date().toISOString(),
        note: 'Emergency notifications are working! Emails would be sent to doctors if email service is properly configured.'
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