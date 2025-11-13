/**
 * WebAuthn Configuration for Railway Deployment
 * Automatically detects Railway environment and sets correct RP_ID and RP_ORIGIN
 */

export function getWebAuthnConfig() {
  // Check if running on Railway
  const isRailway = process.env.RAILWAY_ENVIRONMENT !== undefined;
  
  // Railway provides multiple domain variables - try them in order
  const railwayDomain = 
    process.env.RAILWAY_PUBLIC_DOMAIN ||  // Custom domains
    process.env.RAILWAY_STATIC_URL?.replace('https://', '') ||  // Generated railway.app URLs
    process.env.PUBLIC_URL?.replace('https://', '') ||
    process.env.RAILWAY_PROJECT_DOMAIN;
  
  // Determine RP_ID (Relying Party ID)
  let rpId: string;
  let rpOrigin: string;
  
  if (process.env.RP_ID && process.env.RP_ORIGIN) {
    // Explicit environment variables take highest priority
    rpId = process.env.RP_ID;
    rpOrigin = process.env.RP_ORIGIN;
  } else if (isRailway && railwayDomain) {
    // Railway deployment - use the Railway domain
    rpId = railwayDomain;
    rpOrigin = `https://${railwayDomain}`;
  } else if (process.env.VERCEL_URL) {
    // Vercel deployment
    rpId = process.env.VERCEL_URL;
    rpOrigin = `https://${process.env.VERCEL_URL}`;
  } else {
    // Local development
    rpId = 'localhost';
    rpOrigin = 'http://localhost:3000';
  }
  
  const rpName = process.env.RP_NAME || 'Todo App';
  
  console.log('[WebAuthn Config]', {
    isRailway,
    railwayDomain,
    rpId,
    rpOrigin,
    env: process.env.NODE_ENV
  });
  
  return {
    rpId,
    rpOrigin,
    rpName,
    isProduction: isRailway || process.env.NODE_ENV === 'production',
  };
}

// Export singleton config
export const webauthnConfig = getWebAuthnConfig();
