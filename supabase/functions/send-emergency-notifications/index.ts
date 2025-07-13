
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚨 Emergency notification function started');
    
    const requestBody = await req.json();
    console.log('📋 Request received:', requestBody);
    
    const { emergencyId, patientName, location, condition, priority = 'high' } = requestBody;

    // Simple validation
    if (!emergencyId || !location || !condition) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields',
          notificationsSent: 0,
          doctorEmailsSent: []
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get API key
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.error('❌ RESEND_API_KEY not found');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Email service not configured',
          notificationsSent: 0,
          doctorEmailsSent: []
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('✅ API key found, sending email...');
    
    // Initialize Resend
    const resend = new Resend(resendApiKey);
    
    // Send to test email
    const testEmail = "abcdwxyz6712@gmail.com";
    
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #dc2626; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">🚨 EMERGENCY ALERT</h1>
        </div>
        <div style="padding: 20px;">
          <h2>Emergency Details</h2>
          ${patientName ? `<p><strong>Patient:</strong> ${patientName}</p>` : ''}
          <p><strong>Location:</strong> ${location}</p>
          <p><strong>Condition:</strong> ${condition}</p>
          <p><strong>Priority:</strong> ${priority}</p>
          <p><strong>Emergency ID:</strong> ${emergencyId}</p>
          <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        </div>
      </div>
    `;

    const emailResponse = await resend.emails.send({
      from: "MediAid Emergency <onboarding@resend.dev>",
      to: [testEmail],
      subject: `🚨 EMERGENCY - ${location}`,
      html: emailHtml,
    });

    console.log('📧 Email response:', emailResponse);

    if (emailResponse.error) {
      console.error('❌ Email failed:', emailResponse.error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: emailResponse.error.message,
          notificationsSent: 0,
          doctorEmailsSent: []
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('✅ Email sent successfully!');
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        notificationsSent: 1,
        doctorEmailsSent: [testEmail],
        emailId: emailResponse.data?.id,
        message: `Emergency alert sent to ${testEmail}`
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('❌ Function error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
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
