/**
 * WebAuthn Configuration for Railway Deployment
 * Automatically detects Railway environment and sets correct RP_ID and RP_ORIGIN
 */

export function getWebAuthnConfig() {
  // Check if running on Railway
  const isRailway = process.env.RAILWAY_ENVIRONMENT !== undefined;
  
  // Get Railway's public domain (automatically set by Railway)
  const railwayDomain = process.env.RAILWAY_PUBLIC_DOMAIN;
  
  // Determine RP_ID (Relying Party ID)
  let rpId: string;
  let rpOrigin: string;
  
  if (isRailway && railwayDomain) {
    // Railway deployment - use the Railway domain
    rpId = railwayDomain;
    rpOrigin = `https://${railwayDomain}`;
  } else if (process.env.RP_ID && process.env.RP_ORIGIN) {
    // Custom environment variables set (for other deployments)
    rpId = process.env.RP_ID;
    rpOrigin = process.env.RP_ORIGIN;
  } else {
    // Local development
    rpId = 'localhost';
    rpOrigin = 'http://localhost:3000';
  }
  
  const rpName = process.env.RP_NAME || 'Todo App';
  
  return {
    rpId,
    rpOrigin,
    rpName,
    isProduction: isRailway || process.env.NODE_ENV === 'production',
  };
}

// Export singleton config
export const webauthnConfig = getWebAuthnConfig();
