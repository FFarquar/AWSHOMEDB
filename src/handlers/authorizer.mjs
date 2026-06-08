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
  if (parts.length !== 3) {
    return null;
  }

  const [headerPart, payloadPart, signaturePart] = parts;
  const signingInput = `${headerPart}.${payloadPart}`;
  const expectedSignature = base64UrlEncode(
    crypto.createHmac('sha256', AUTH_SECRET).update(signingInput).digest()
  );

  if (expectedSignature !== signaturePart) {
    return null;
  }

  const payload = JSON.parse(base64UrlDecode(payloadPart));
  const now = Math.floor(Date.now() / 1000);

  if (payload.exp && payload.exp < now) {
    return null;
  }

  return payload;
}

export const handler = async (event) => {
  try {
    const token = event.authorizationToken || '';
    const bearerToken = token.startsWith('Bearer ') ? token.slice(7) : token;
    const payload = verifyToken(bearerToken);

    if (!payload) {
      return {
        principalId: 'anonymous',
        policyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Action: 'execute-api:Invoke',
              Effect: 'Deny',
              Resource: event.methodArn,
            },
          ],
        },
      };
    }

    return {
      principalId: payload.loginID || payload.sub || 'user',
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: 'Allow',
            Resource: event.methodArn,
          },
        ],
      },
      context: {
        loginID: payload.loginID || '',
        role: payload.role || 'USER',
      },
    };
  } catch (error) {
    console.error(error);
    return {
      principalId: 'anonymous',
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: 'Deny',
            Resource: event.methodArn,
          },
        ],
      },
    };
  }
};
