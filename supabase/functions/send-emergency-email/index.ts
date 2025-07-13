
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmergencyEmailRequest {
  to: string;
  doctorName: string;
  subject: string;
  html: string;
  emergencyDetails: {
    emergencyId: string;
    patientName?: string;
    location: string;
    condition: string;
    priority: string;
  };
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('🚨 Emergency email function called');

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    if (!resendApiKey) {
      console.error('❌ RESEND_API_KEY not found in environment variables');
      console.log('📋 Available environment variables:', Object.keys(Deno.env.toObject()));
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'RESEND_API_KEY not configured. Please add it in Supabase Edge Functions settings and redeploy the function.' 
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log('✅ RESEND_API_KEY found, initializing Resend...');
    const resend = new Resend(resendApiKey);
    const { to, doctorName, subject, html, emergencyDetails }: EmergencyEmailRequest = await req.json();

    console.log(`📧 Sending emergency email to ${to} for emergency ${emergencyDetails.emergencyId}`);

    // Use onboarding@resend.dev which is pre-verified for all Resend accounts
    const emailResponse = await resend.emails.send({
      from: "MediAid Emergency <onboarding@resend.dev>",
      to: [to],
      subject: subject,
      html: html,
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'high'
      }
    });

    console.log("📧 Email send response:", emailResponse);

    if (emailResponse.error) {
      console.error("❌ Error sending emergency email:", emailResponse.error);
      return new Response(JSON.stringify({
        success: false,
        error: emailResponse.error.message,
        details: 'Failed to send emergency email via Resend'
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log("✅ Emergency email sent successfully:", emailResponse.data);

    return new Response(JSON.stringify({
      success: true,
      emailId: emailResponse.data?.id,
      message: `Emergency email sent to ${doctorName} at ${to}`
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("❌ Error in emergency email function:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        details: 'Emergency email system error. Check function logs for more details.'
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        },
      }
    );
  }
});
