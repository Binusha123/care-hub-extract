import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const emergencyId = url.searchParams.get('id');

    if (!emergencyId) {
      return new Response(
        JSON.stringify({ error: 'Emergency ID is required' }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    console.log(`🔄 Resolving emergency: ${emergencyId}`);

    // Get auth token from request header for public access
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Update emergency status to resolved
    const { data, error } = await supabase
      .from('emergencies')
      .update({ 
        resolved: true,
        status: 'resolved'
      })
      .eq('id', emergencyId)
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating emergency:', error);
      throw error;
    }

    console.log('✅ Emergency resolved successfully:', data);

    // Return a simple HTML success page
    const htmlResponse = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Emergency Resolved</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .success { color: #28a745; font-size: 24px; margin-bottom: 20px; }
            .info { color: #666; }
          </style>
        </head>
        <body>
          <div class="success">✅ Emergency Resolved Successfully</div>
          <div class="info">
            <p>Emergency ID: ${emergencyId}</p>
            <p>Status: Resolved</p>
            <p>This emergency has been marked as completed.</p>
          </div>
        </body>
      </html>
    `;

    return new Response(htmlResponse, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error('❌ Error in resolve-emergency function:', error);
    
    const errorHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Error Resolving Emergency</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .error { color: #dc3545; font-size: 24px; margin-bottom: 20px; }
            .info { color: #666; }
          </style>
        </head>
        <body>
          <div class="error">❌ Error Resolving Emergency</div>
          <div class="info">
            <p>An error occurred while trying to resolve the emergency.</p>
            <p>Error: ${error.message}</p>
          </div>
        </body>
      </html>
    `;

    return new Response(errorHtml, {
      status: 500,
      headers: {
        'Content-Type': 'text/html',
        ...corsHeaders,
      },
    });
  }
};

serve(handler);