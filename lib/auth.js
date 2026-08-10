import crypto from 'crypto';

const SECRET = () => process.env.SESSION_SECRET || 'doi-secret-nay-tren-vercel';
export const ADMIN_COOKIE = 'tng_admin';

export function signToken(payload, ttlSec) {
  const body = { ...payload, exp: Date.now() + ttlSec * 1000 };
  const data = Buffer.from(JSON.stringify(body)).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET()).update(data).digest('base64url');
  return data + '.' + sig;
}

export function verifyToken(token) {
  if (!token || !token.includes('.')) return null;
  const [data, sig] = token.split('.');
  const expect = crypto.createHmac('sha256', SECRET()).update(data).digest('base64url');
  if (sig !== expect) return null;
  try {
    const body = JSON.parse(Buffer.from(data, 'base64url').toString());
    if (body.exp && Date.now() > body.exp) return null;
    return body;
  } catch {
    return null;
  }
}

export function adminToken() {
  return signToken({ role: 'admin' }, 60 * 60 * 12);
}

export function isAdminToken(token) {
  const p = verifyToken(token);
  return !!(p && p.role === 'admin');
}
