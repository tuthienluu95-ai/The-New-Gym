import { cookies } from 'next/headers';
import * as XLSX from 'xlsx';
import { isAdminToken, ADMIN_COOKIE } from '../../../../lib/auth';
import { supabaseAdmin } from '../../../../lib/supabase';
import { buildReport } from '../../../../lib/report';
import { vnParts } from '../../../../lib/time';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const c = cookies().get(ADMIN_COOKIE)?.value;
  if (!isAdminToken(c)) return new Response('Unauthorized', { status: 401 });

  const thang = new URL(req.url).searchParams.get('thang') || vnParts().dateStr.slice(0, 7);
  const sb = supabaseAdmin();
  const rep = await buildReport(sb, thang);

  const aoa = [['Mã NV', 'Giáo viên', 'Số ca', 'Số ca trễ', 'Ngày trễ', 'Thù lao/ca (đ)', 'Tổng tiền (đ)']];
  for (const r of rep.list) {
    aoa.push([r.ma_nv, r.ho_ten, r.so_ca, r.so_tre, r.ngay_tre.join(', '), r.thu_lao, r.tong_tien]);
  }
  aoa.push([]);
  aoa.push(['TỔNG', '', rep.totals.so_ca, rep.totals.so_tre, '', '', rep.totals.tong_tien]);

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [{ wch: 8 }, { wch: 26 }, { wch: 8 }, { wch: 9 }, { wch: 40 }, { wch: 14 }, { wch: 16 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Bao cao ' + thang);
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  return new Response(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="bao-cao-${thang}.xlsx"`,
    },
  });
}
