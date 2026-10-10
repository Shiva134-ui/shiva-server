import { createRemoteJWKSet, jwtVerify } from 'jose';

export interface Env {
  WAKE_TOKEN: string; // Provided by Cloudflare Secrets
}

const FIREBASE_PROJECT_ID = 'madesh-server';
const ALLOWED_UID = 'JSsVSsHZj9fXgZrCKO8kFNK0ud22';

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'https://cloud.madesh.in'
];

// JWKS URL for Firebase Auth
const JWKS_URI = 'https://www.googleapis.com/robot/v1/metadata/jwk/securetoken@system.gserviceaccount.com';
const JWKS = createRemoteJWKSet(new URL(JWKS_URI));

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const origin = request.headers.get('Origin') || '';
    const isAllowedOrigin = ALLOWED_ORIGINS.includes(origin);
    const corsHeaders = {
      'Access-Control-Allow-Origin': isAllowedOrigin ? origin : ALLOWED_ORIGINS[0],
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== 'POST' || new URL(request.url).pathname !== '/wake') {
      return new Response(JSON.stringify({ error: 'Not Found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    try {
      // 1. Extract Firebase ID token
      const authHeader = request.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: 'Missing or invalid Authorization header' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const token = authHeader.split('Bearer ')[1];

      // 2. Verify Firebase JWT securely using `jose`
      const { payload } = await jwtVerify(token, JWKS, {
        issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
        audience: FIREBASE_PROJECT_ID,
      });

      // 3. Verify the UID
      if (payload.sub !== ALLOWED_UID) {
        return new Response(JSON.stringify({ error: 'Forbidden: You do not have server control permissions.' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // 4. Send the WOL request to the ESP32 securely
      if (!env.WAKE_TOKEN) {
        return new Response(JSON.stringify({ error: `Worker configuration error: WAKE_TOKEN missing or empty. Available env keys: ${Object.keys(env).join(', ')}` }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const esp32Response = await fetch('https://wake.madesh.in/wake', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.WAKE_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      if (!esp32Response.ok) {
        throw new Error(`ESP32 returned status: ${esp32Response.status}`);
      }

      return new Response(JSON.stringify({ success: true, message: 'Wake request relayed successfully' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error: any) {
      console.error('Wake Relay Error:', error);
      const msg = error.code === 'ERR_JWT_EXPIRED' ? 'Firebase token expired' : error.message;
      return new Response(JSON.stringify({ error: msg }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
  },
};
