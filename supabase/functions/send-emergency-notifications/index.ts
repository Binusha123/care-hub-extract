
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    // Initialize Supabase client to fetch doctor emails
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    console.log('🔄 Initializing Supabase client...');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all doctor profiles with their user details
    console.log('👨‍⚕️ Fetching doctor profiles...');
    const { data: doctorProfiles, error: profileError } = await supabase
      .from('profiles')
      .select('user_id, name, department')
      .eq('role', 'doctor');

    if (profileError) {
      console.error('❌ Error fetching doctor profiles:', profileError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to fetch doctor profiles: ${profileError.message}`,
          notificationsSent: 0,
          doctorEmailsSent: []
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('👨‍⚕️ Found doctor profiles:', doctorProfiles?.length || 0);

    if (!doctorProfiles || doctorProfiles.length === 0) {
      console.log('❌ No doctor profiles found');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No doctor profiles found in the system',
          notificationsSent: 0,
          doctorEmailsSent: []
        }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get user emails for all doctors
    const doctorUserIds = doctorProfiles.map(p => p.user_id);
    console.log('📧 Fetching user emails for doctor IDs:', doctorUserIds);

    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
    if (userError) {
      console.error('❌ Error fetching users:', userError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to fetch user emails: ${userError.message}`,
          notificationsSent: 0,
          doctorEmailsSent: []
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Filter users to get only doctors
    const doctorUsers = users.filter(user => doctorUserIds.includes(user.id));
    const doctorEmails = doctorUsers.map(user => user.email).filter(email => email);

    console.log('📧 Doctor emails found:', doctorEmails);

    if (doctorEmails.length === 0) {
      console.log('❌ No doctor emails found');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No doctor email addresses found',
          notificationsSent: 0,
          doctorEmailsSent: []
        }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('📧 Attempting to send emails to doctors...');
    
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

    // Send emails to all doctors
    const emailPromises = doctorEmails.map(async (email) => {
      console.log(`📧 Sending email to: ${email}`);
      
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: "MediAid Emergency <onboarding@resend.dev>",
          to: [email],
          subject: `🚨 EMERGENCY ALERT - ${location} - Priority: ${priority.toUpperCase()}`,
          html: emailHtml,
          headers: {
            'X-Priority': '1',
            'X-MSMail-Priority': 'High',
            'Importance': 'high'
          }
        }),
      });

      const emailData = await emailResponse.json();
      
      if (!emailResponse.ok) {
        console.log(`❌ Failed to send email to ${email}:`, emailData);
        throw new Error(`Failed to send email to ${email}: ${emailData.message}`);
      }
      
      console.log(`✅ Email sent successfully to ${email}! ID:`, emailData.id);
      return { email, id: emailData.id };
    });

    // Wait for all emails to be sent
    const emailResults = await Promise.all(emailPromises);
    
    console.log('✅ All emails sent successfully!', emailResults);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        notificationsSent: emailResults.length,
        doctorEmailsSent: doctorEmails,
        emailIds: emailResults.map(r => r.id),
        message: `Emergency alert sent successfully to ${emailResults.length} doctor(s): ${doctorEmails.join(', ')}`,
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
