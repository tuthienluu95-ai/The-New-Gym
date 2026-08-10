import { supabaseAdmin } from '../../lib/supabase';
import { requireAdmin } from '../../lib/guard';
import { vnParts } from '../../lib/time';

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  requireAdmin();
  const sb = supabaseAdmin();
  const { dateStr } = vnParts();
  const [clubs, nv, lich, homNay, dangDay] = await Promise.all([
    sb.from('clubs').select('id', { count: 'exact', head: true }),
    sb.from('nhan_vien').select('id', { count: 'exact', head: true }).eq('trang_thai', 'dang_lam'),
    sb.from('lich_lop').select('id', { count: 'exact', head: true }).eq('dang_ap_dung', true),
    sb.from('cham_cong').select('id', { count: 'exact', head: true }).eq('ngay', dateStr),
    sb.from('cham_cong').select('id', { count: 'exact', head: true }).is('gio_ra', null),
  ]);
  const M = [
    { n: clubs.count ?? 0, l: 'Club' },
    { n: nv.count ?? 0, l: 'Nhân viên đang làm' },
    { n: lich.count ?? 0, l: 'Buổi lớp/tuần' },
    { n: homNay.count ?? 0, l: 'Lượt chấm công hôm nay' },
    { n: dangDay.count ?? 0, l: 'Đang trong ca' },
  ];
  return (
    <div className="stack">
      <h1>Bảng điều khiển</h1>
      <div className="grid">
        {M.map((m) => (<div className="metric" key={m.l}><div className="n">{m.n}</div><div className="l">{m.l}</div></div>))}
      </div>
    </div>
  );
}
