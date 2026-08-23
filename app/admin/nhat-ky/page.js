import { supabaseAdmin } from '../../../lib/supabase';
import { requireAdmin } from '../../../lib/guard';
import { vnParts } from '../../../lib/time';
import ClearButtons from './ClearButtons';

export const dynamic = 'force-dynamic';

function thietBi(ua) {
  if (!ua) return '—';
  const s = ua.toLowerCase();
  let os = 'Khác';
  if (s.includes('iphone') || s.includes('ipad') || s.includes('ios')) os = 'iOS';
  else if (s.includes('android')) os = 'Android';
  else if (s.includes('windows')) os = 'Windows';
  else if (s.includes('mac os') || s.includes('macintosh')) os = 'macOS';
  let br = '';
  if (s.includes('edg')) br = 'Edge';
  else if (s.includes('chrome') && !s.includes('edg')) br = 'Chrome';
  else if (s.includes('safari') && !s.includes('chrome')) br = 'Safari';
  else if (s.includes('firefox')) br = 'Firefox';
  let dv = '';
  if (s.includes('iphone')) dv = 'iPhone'; else if (s.includes('ipad')) dv = 'iPad';
  else if (s.includes('samsung')) dv = 'Samsung'; else if (s.includes('android')) dv = 'Android';
  return [dv, os, br].filter(Boolean).join(' · ') || os;
}
function vnTime(ts) {
  return new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(new Date(ts));
}

export default async function NhatKyPage({ searchParams }) {
  requireAdmin();
  const sb = supabaseAdmin();
  const { dateStr } = vnParts();
  const tu = searchParams?.tu || dateStr;
  const den = searchParams?.den || dateStr;
  const club = searchParams?.club || '';
  const kq = searchParams?.kq || '';
  const buoc = searchParams?.buoc || '';
  const maNv = (searchParams?.ma || '').trim();

  const { data: clubs } = await sb.from('clubs').select('id, ten_club').order('ma_club');
  let q = sb.from('cham_cong_log')
    .select('*, nhan_vien!nv_id ( ma_nv, ho_ten ), clubs!club_id ( ten_club )')
    .gte('created_at', tu + 'T00:00:00+07:00').lte('created_at', den + 'T23:59:59+07:00')
    .order('created_at', { ascending: false }).limit(500);
  if (club) q = q.eq('club_id', club);
  if (kq) q = q.eq('ket_qua', kq);
  if (buoc) q = q.eq('buoc', buoc);
  if (maNv) q = q.ilike('ma_nv', `%${maNv}%`);
  const { data: rows } = await q;
  const R = rows || [];
  const soOK = R.filter((r) => r.ket_qua === 'thanh_cong').length;
  const soFail = R.length - soOK;

  return (
    <div className="stack">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
        <div><h1 style={{ margin: 0 }}>Nhật ký chấm công</h1>
          <p className="muted" style={{ margin: '4px 0 0' }}>{R.length} bản ghi · <span style={{ color: '#4C8C2B' }}>{soOK} thành công</span> · <span className="warn-text">{soFail} thất bại</span></p>
        </div>
        <ClearButtons truoc={tu} />
      </div>

      <div className="card noprint">
        <form className="filters">
          <div><label>Từ ngày</label><input type="date" name="tu" defaultValue={tu} /></div>
          <div><label>Đến ngày</label><input type="date" name="den" defaultValue={den} /></div>
          <div><label>Club</label>
            <select name="club" defaultValue={club}><option value="">Tất cả</option>
              {(clubs || []).map((c) => <option key={c.id} value={c.id}>{c.ten_club}</option>)}
            </select>
          </div>
          <div><label>Kết quả</label>
            <select name="kq" defaultValue={kq}><option value="">Tất cả</option>
              <option value="thanh_cong">Thành công</option><option value="that_bai">Thất bại</option>
            </select>
          </div>
          <div><label>Bước</label>
            <select name="buoc" defaultValue={buoc}><option value="">Tất cả</option>
              <option value="auth">Đăng nhập/QR</option><option value="checkin">Chấm vào</option><option value="checkout">Chấm ra</option>
            </select>
          </div>
          <div><label>Mã NV</label><input name="ma" defaultValue={maNv} placeholder="vd: 66" /></div>
          <button className="btn primary">Lọc</button>
        </form>
      </div>

      <div className="card">
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead><tr>
              <th>Thời gian</th><th>Kết quả</th><th>Bước</th><th>NV</th><th>Club</th><th>Lý do</th><th>K.cách</th><th>Thiết bị</th><th>IP</th><th>Device ID</th>
            </tr></thead>
            <tbody>
              {R.length === 0 && <tr><td colSpan="10" className="muted">Không có bản ghi nào trong khoảng đã chọn.</td></tr>}
              {R.map((r) => (
                <tr key={r.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{vnTime(r.created_at)}</td>
                  <td>{r.ket_qua === 'thanh_cong'
                    ? <span className="tag green">OK</span>
                    : <span className="tag warn">Lỗi</span>}</td>
                  <td className="muted">{r.buoc === 'auth' ? 'Đăng nhập' : r.buoc === 'checkin' ? 'Chấm vào' : r.buoc === 'checkout' ? 'Chấm ra' : r.buoc}</td>
                  <td>{r.nhan_vien ? <><b>{r.nhan_vien.ma_nv}</b> · {r.nhan_vien.ho_ten}</> : (r.ma_nv ? <><b>{r.ma_nv}</b> <span className="warn-text">(không có)</span></> : '—')}</td>
                  <td className="muted">{r.clubs?.ten_club || '—'}</td>
                  <td style={{ maxWidth: 260 }}>{r.ly_do || '—'}</td>
                  <td className="muted">{r.khoang_cach_m != null ? r.khoang_cach_m + 'm' : '—'}</td>
                  <td className="muted" title={r.user_agent || ''}>{thietBi(r.user_agent)}</td>
                  <td className="muted">{r.ip || '—'}</td>
                  <td className="muted" title={r.device_id || ''}>{r.device_id ? r.device_id.slice(0, 8) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
