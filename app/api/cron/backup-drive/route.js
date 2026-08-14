import crypto from 'crypto';
import * as XLSX from 'xlsx';
import { supabaseAdmin } from '../../../../lib/supabase';
import { vnParts } from '../../../../lib/time';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

const KEEP = 30;
const PREFIX = 'backup-thenewgym-';
const sheetFrom = (rows) => XLSX.utils.json_to_sheet(rows && rows.length ? rows : [{}]);
const b64url = (buf) => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

// Ưu tiên OAuth (tài khoản của bạn) -> file do BẠN sở hữu, có dung lượng.
// Nếu không có refresh token thì thử Service Account (chỉ hợp Workspace/Shared Drive).
async function getAccessToken() {
  const rt = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;
  if (rt) {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_OAUTH_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || '',
        refresh_token: rt, grant_type: 'refresh_token',
      }),
    });
    const j = await res.json();
    if (!j.access_token) throw new Error('OAuth token lỗi: ' + JSON.stringify(j));
    return j.access_token;
  }
  const saJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!saJson) throw new Error('Chưa cấu hình GOOGLE_OAUTH_REFRESH_TOKEN (hoặc Service Account)');
  const sa = JSON.parse(saJson);
  const now = Math.floor(Date.now() / 1000);
  const unsigned = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' })) + '.' +
    b64url(JSON.stringify({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/drive', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }));
  const signer = crypto.createSign('RSA-SHA256'); signer.update(unsigned); signer.end();
  const jwt = unsigned + '.' + b64url(signer.sign(sa.private_key));
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
  });
  const j = await res.json();
  if (!j.access_token) throw new Error('SA token lỗi: ' + JSON.stringify(j));
  return j.access_token;
}

async function buildBackupBuffer(sb) {
  const [clubs, nv, lich, cc] = await Promise.all([
    sb.from('clubs').select('*'), sb.from('nhan_vien').select('*'),
    sb.from('lich_lop').select('*'), sb.from('cham_cong').select('*'),
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheetFrom(clubs.data), 'clubs');
  XLSX.utils.book_append_sheet(wb, sheetFrom(nv.data), 'nhan_vien');
  XLSX.utils.book_append_sheet(wb, sheetFrom(lich.data), 'lich_lop');
  XLSX.utils.book_append_sheet(wb, sheetFrom(cc.data), 'cham_cong');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

async function uploadToDrive(token, folderId, filename, buffer) {
  const boundary = 'tng' + Date.now();
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`),
    Buffer.from(JSON.stringify({ name: filename, parents: [folderId] })),
    Buffer.from(`\r\n--${boundary}\r\nContent-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\n\r\n`),
    buffer, Buffer.from(`\r\n--${boundary}--`),
  ]);
  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true', {
    method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': `multipart/related; boundary=${boundary}` }, body,
  });
  const j = await res.json();
  if (!j.id) throw new Error('Tải lên Drive lỗi: ' + JSON.stringify(j));
  return j;
}

async function cleanupOld(token, folderId) {
  const q = encodeURIComponent(`'${folderId}' in parents and name contains '${PREFIX}' and trashed=false`);
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)&orderBy=name desc&pageSize=200&supportsAllDrives=true&includeItemsFromAllDrives=true`, { headers: { Authorization: 'Bearer ' + token } });
  const j = await res.json();
  const toDelete = (j.files || []).slice(KEEP);
  for (const f of toDelete) {
    await fetch(`https://www.googleapis.com/drive/v3/files/${f.id}?supportsAllDrives=true`, { method: 'DELETE', headers: { Authorization: 'Bearer ' + token } });
  }
  return toDelete.length;
}

export async function GET(req) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization') || '';
  const key = new URL(req.url).searchParams.get('key') || '';
  if (!secret || (auth !== `Bearer ${secret}` && key !== secret)) return new Response('Unauthorized', { status: 401 });

  const folderId = process.env.GDRIVE_BACKUP_FOLDER_ID;
  if (!folderId) return Response.json({ ok: false, error: 'Chưa cấu hình GDRIVE_BACKUP_FOLDER_ID' }, { status: 400 });
  try {
    const token = await getAccessToken();
    const sb = supabaseAdmin();
    const buffer = await buildBackupBuffer(sb);
    const filename = `${PREFIX}${vnParts().dateStr}.xlsx`;
    const up = await uploadToDrive(token, folderId, filename, buffer);
    const deleted = await cleanupOld(token, folderId);
    return Response.json({ ok: true, file: filename, id: up.id, deleted });
  } catch (e) {
    return Response.json({ ok: false, error: String(e.message || e) }, { status: 500 });
  }
}
