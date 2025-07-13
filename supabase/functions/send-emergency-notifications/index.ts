
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
          error: 'Missing required fields: emergencyId, location, or condition',
          notificationsSent: 0,
          doctorEmailsSent: []
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('✅ All required fields present');
    
    // Check for RESEND_API_KEY
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    console.log('🔑 RESEND_API_KEY present:', !!resendApiKey);
    
    if (!resendApiKey) {
      console.log('❌ RESEND_API_KEY not found');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'RESEND_API_KEY not configured in environment variables',
          notificationsSent: 0,
          doctorEmailsSent: []
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('📧 Attempting to send email...');
    
    // Create email content
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 2px solid #dc2626; border-radius: 8px;">
        <div style="background-color: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 6px 6px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">🚨 EMERGENCY ALERT</h1>
        </div>
        <div style="padding: 30px; background-color: #fff;">
          <h2 style="color: #dc2626; margin-top: 0;">Emergency Details</h2>
          <div style="background-color: #fef2f2; padding: 20px; border-radius: 6px; border-left: 4px solid #dc2626;">
            ${patientName ? `<p style="margin: 8px 0;"><strong>Patient:</strong> ${patientName}</p>` : ''}
            <p style="margin: 8px 0;"><strong>Location:</strong> ${location}</p>
            <p style="margin: 8px 0;"><strong>Condition:</strong> ${condition}</p>
            <p style="margin: 8px 0;"><strong>Priority:</strong> <span style="color: #dc2626; font-weight: bold;">${priority.toUpperCase()}</span></p>
            <p style="margin: 8px 0;"><strong>Emergency ID:</strong> ${emergencyId}</p>
            <p style="margin: 8px 0;"><strong>Time:</strong> ${new Date().toLocaleString()}</p>
          </div>
          <div style="margin-top: 20px; padding: 15px; background-color: #eff6ff; border-radius: 6px;">
            <p style="margin: 0; color: #1e40af;"><strong>⚡ IMMEDIATE ACTION REQUIRED</strong></p>
            <p style="margin: 5px 0 0 0; color: #1e40af; font-size: 14px;">Please respond to this emergency as soon as possible.</p>
          </div>
        </div>
      </div>
    `;

    const testEmail = "abcdwxyz6712@gmail.com";
    
    // Make the email request using fetch
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: "MediAid Emergency <onboarding@resend.dev>",
        to: [testEmail],
        subject: `🚨 EMERGENCY ALERT - ${location} - Priority: ${priority.toUpperCase()}`,
        html: emailHtml,
        headers: {
          'X-Priority': '1',
          'X-MSMail-Priority': 'High',
          'Importance': 'high'
        }
      }),
    });

    console.log('📧 Email API response status:', emailResponse.status);
    
    const emailData = await emailResponse.json();
    console.log('📧 Email API response data:', emailData);

    if (!emailResponse.ok) {
      console.log('❌ Email API error:', emailData);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Email API error: ${emailData.message || 'Unknown error'}`,
          details: emailData,
          notificationsSent: 0,
          doctorEmailsSent: []
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('✅ Email sent successfully! ID:', emailData.id);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        notificationsSent: 1,
        doctorEmailsSent: [testEmail],
        emailId: emailData.id,
        message: `Emergency alert sent successfully to ${testEmail}`,
        timestamp: new Date().toISOString()
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ Function error:', error);
    console.error('❌ Error stack:', error.stack);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: `Function error: ${error.message}`,
        stack: error.stack,
        notificationsSent: 0,
        doctorEmailsSent: []
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
