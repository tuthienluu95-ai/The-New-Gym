import { cookies } from 'next/headers';
import * as XLSX from 'xlsx';
import { isAdminToken, ADMIN_COOKIE } from '../../../../lib/auth';
import { supabaseAdmin } from '../../../../lib/supabase';
import { vnParts } from '../../../../lib/time';

export const dynamic = 'force-dynamic';
const sheetFrom = (rows) => XLSX.utils.json_to_sheet(rows && rows.length ? rows : [{}]);

export async function GET(req) {
  const c = cookies().get(ADMIN_COOKIE)?.value;
  if (!isAdminToken(c)) return new Response('Unauthorized', { status: 401 });
  const sb = supabaseAdmin();
  const [clubs, nv, lich, cc] = await Promise.all([
    sb.from('clubs').select('*'),
    sb.from('nhan_vien').select('*'),
    sb.from('lich_lop').select('*'),
    sb.from('cham_cong').select('*'),
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheetFrom(clubs.data), 'clubs');
  XLSX.utils.book_append_sheet(wb, sheetFrom(nv.data), 'nhan_vien');
  XLSX.utils.book_append_sheet(wb, sheetFrom(lich.data), 'lich_lop');
  XLSX.utils.book_append_sheet(wb, sheetFrom(cc.data), 'cham_cong');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const d = vnParts().dateStr;
  return new Response(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="backup-thenewgym-${d}.xlsx"`,
    },
  });
}
