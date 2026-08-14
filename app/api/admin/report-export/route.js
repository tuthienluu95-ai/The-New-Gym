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

  const sp = new URL(req.url).searchParams;
  const { dateStr } = vnParts();
  const tu = sp.get('tu') || (dateStr.slice(0, 7) + '-01');
  const den = sp.get('den') || dateStr;

  const sb = supabaseAdmin();
  const rep = await buildReport(sb, tu, den);

  const aoa = [[`Báo cáo công GROUP-X · ${tu} đến ${den}`], [], ['Mã NV', 'Giáo viên', 'Số ca', 'Số ca trễ', 'Ngày trễ', 'Thù lao/ca (đ)', 'Tổng tiền (đ)']];
  for (const r of rep.list) aoa.push([r.ma_nv, r.ho_ten, r.so_ca, r.so_tre, r.ngay_tre.join(', '), r.thu_lao, r.tong_tien]);
  aoa.push([]);
  aoa.push(['TỔNG', '', rep.totals.so_ca, rep.totals.so_tre, '', '', rep.totals.tong_tien]);

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [{ wch: 8 }, { wch: 26 }, { wch: 8 }, { wch: 9 }, { wch: 40 }, { wch: 14 }, { wch: 16 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Bao cao');
  const aoa2 = [['Ngày', 'Club', 'Giờ', 'Lớp', 'HLV phụ trách']];
  for (const m of rep.missedList) aoa2.push([m.ngay, m.club, m.gio, m.lop, m.hlv]);
  const ws2 = XLSX.utils.aoa_to_sheet(aoa2);
  ws2['!cols'] = [{ wch: 12 }, { wch: 22 }, { wch: 14 }, { wch: 18 }, { wch: 26 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Lop trong');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  return new Response(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="bao-cao-${tu}_den_${den}.xlsx"`,
    },
  });
}
