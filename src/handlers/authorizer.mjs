import crypto from 'node:crypto';

const AUTH_SECRET = process.env.AUTH_SECRET || 'dev-secret-change-me';

function base64UrlDecode(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  return Buffer.from(padded, 'base64').toString('utf8');
}

function base64UrlEncode(value) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/=+$/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function verifyToken(token) {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [headerPart, payloadPart, signaturePart] = parts;
  const signingInput = `${headerPart}.${payloadPart}`;

  // 🛠️ FIX: Match the exact encoding sequence used in login.mjs
  const expectedSignature = crypto
    .createHmac('sha256', AUTH_SECRET)
    .update(signingInput)
    .digest('base64')
    .replace(/=+$/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  if (expectedSignature !== signaturePart) {
    console.log("❌ SIGNATURE MISMATCH");
    return null;
  }

  const payload = JSON.parse(base64UrlDecode(payloadPart));

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) {
    console.log("❌ TOKEN EXPIRED");
    return null;
  }

  return payload;
}

// export const handler = async (event) => {
//   console.log("===== AUTHORIZER INVOKED =====");

//   try {
//     const token = event.authorizationToken || '';
//     const bearerToken = token.startsWith('Bearer ')
//       ? token.slice(7)
//       : token;

//     const payload = verifyToken(bearerToken);

//     if (!payload) {
//       console.log("❌ AUTH FAILED");
//       return { isAuthorized: false };
//     }

//     console.log("✅ AUTH SUCCESS");

//     return {
//       isAuthorized: true,
//       context: {
//         loginID: payload.loginID || '',
//         role: payload.role || 'USER',
//       }
//     };

//   } catch (error) {
//     console.error("💥 AUTH ERROR:", error.message);
//     return { isAuthorized: false };
//   }
// };

export const handler = async (event) => {
  console.log("===== VERSION 1.0 AUTHORIZER INVOKED =====");
  // 🔍 Temporary debug lines to expose the hidden value mismatch
  console.log("DEBUG - CODE SECRET IS:", AUTH_SECRET);
  console.log("DEBUG - INCOMING TOKEN STRING IS:", event.authorizationToken ? "PRESENT" : "EMPTY");
  
  try {
    // Format 1.0 safely extracts the token from event.authorizationToken
    const token = event.authorizationToken || '';
    const bearerToken = token.startsWith('Bearer ') ? token.slice(7) : token;

    const payload = verifyToken(bearerToken);

    // If validation fails, return an explicit IAM "Deny" policy
    if (!payload) {
      console.log("❌ AUTH FAILED");
      return generatePolicy('user', 'Deny', event.methodArn || '*');
    }

    // console.log("✅ AUTH SUCCESS");
    // return generatePolicy(payload.loginID, 'Allow', event.methodArn || '*');

    console.log("✅ AUTH SUCCESS - ALLOWING ACCESS");
    return generatePolicy(payload.loginID, 'Allow', event.methodArn);    

  } catch (error) {
    console.error("💥 AUTH ERROR:", error.message);
    return generatePolicy('user', 'Deny', '*');
  }
};

// Helper function to build a flawless Format 1.0 IAM Policy
function generatePolicy(principalId, effect, resource) {
  return {
    principalId: principalId,
    policyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: effect,
          Resource: resource
        }
      ]
    },
    context: {
      loginID: principalId,
      role: 'ADMIN' // Simple context assignment
    }
  };
}