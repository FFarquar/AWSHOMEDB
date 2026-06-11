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
  console.log("===== AUTHORIZER INVOKED =====");
  console.log(JSON.stringify(event, null, 2)); // 🚀 Temporarily log the event structure

  try {
    // 🛠️ FIX: Look inside headers instead of authorizationToken
    const headers = event.headers || {};
    const token = headers.authorization || headers.Authorization || '';

    const bearerToken = token.startsWith('Bearer ')
      ? token.slice(7)
      : token;

    const payload = verifyToken(bearerToken);

    if (!payload) {
      console.log("❌ AUTH FAILED");
      return { isAuthorized: false };
    }

    console.log("✅ AUTH SUCCESS");

    return {
      isAuthorized: true,
      context: {
        loginID: payload.loginID || '',
        role: payload.role || 'USER',
      }
    };

  } catch (error) {
    console.error("💥 AUTH ERROR:", error.message);
    return { isAuthorized: false };
  }
};