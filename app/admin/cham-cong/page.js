import { matchQ } from '../../../lib/search';
import { supabaseAdmin } from '../../../lib/supabase';
import { requireAdmin } from '../../../lib/guard';
import { vnParts, vnNowMinutes, fmtTime, vnMinutesOf, hmToMin } from '../../../lib/time';
import { xoaChamCong } from './actions';
import ManualAddForm from './ManualAddForm';

export const dynamic = 'force-dynamic';
const hhmm = (t) => (t || '').slice(0, 5);
const initials = (s) => (s || '?').trim().split(/\s+/).slice(-2).map((w) => w[0]).join('').toUpperCase();
const vnd = (n) => (n || 0).toLocaleString('vi-VN');

export default async function ChamCongPage({ searchParams }) {
  requireAdmin();
  const sb = supabaseAdmin();
  const { dateStr, thu } = vnParts();
  const tu = searchParams?.tu || dateStr;
  const den = searchParams?.den || tu;
  const timkiem = searchParams?.q || '';
  const tt = searchParams?.tt || 'all';     // bộ lọc trạng thái
  const view = searchParams?.view || 'list'; // tab

  const [{ data: rows }, { data: nvList }, { data: clubs }, { data: lopAll }, { data: todayRows }] = await Promise.all([
    sb.from('cham_cong')
      .select('id, ngay, gio_vao, gio_ra, trang_thai, ghi_chu, so_hoc_vien, thu_cong, nhan_vien!nv_id ( ma_nv, ho_ten ), clubs!club_id ( ten_club ), lich_lop!lich_lop_id ( ten_lop, gio_bat_dau, gio_ket_thuc )')
      .gte('ngay', tu).lte('ngay', den).order('ngay', { ascending: false }).order('gio_vao', { ascending: true }),
    sb.from('nhan_vien').select('id, ma_nv, ho_ten').eq('trang_thai', 'dang_lam').order('ma_nv'),
    sb.from('clubs').select('id, ten_club').order('ma_club'),
    sb.from('lich_lop').select('id, nv_id, club_id, ten_lop, thu, gio_bat_dau, gio_ket_thuc, clubs!club_id ( ten_club )').eq('dang_ap_dung', true).order('thu').order('gio_bat_dau'),
    sb.from('cham_cong').select('id, lich_lop_id, gio_vao, gio_ra, nhan_vien!nv_id ( ho_ten ), lich_lop!lich_lop_id ( ten_lop )').eq('ngay', dateStr),
  ]);
  const today = dateStr;
  const classes = (lopAll || []).map((l) => ({ id: l.id, nv_id: l.nv_id, club_id: l.club_id, ten_lop: l.ten_lop, thu: l.thu, gio_bat_dau: l.gio_bat_dau, gio_ket_thuc: l.gio_ket_thuc, ten_club: l.clubs?.ten_club || '' }));

  // lọc theo tìm kiếm
  let rowsF = (rows || []).filter((r) => matchQ(`${r.nhan_vien?.ma_nv || ''} ${r.nhan_vien?.ho_ten || ''} ${r.clubs?.ten_club || ''} ${r.lich_lop?.ten_lop || ''} ${r.ghi_chu || ''}`, timkiem));
  const isThieu = (r) => !r.gio_ra && !(r.trang_thai === 'hoan_thanh');
  const isDu = (r) => r.trang_thai === 'hoan_thanh';
  // KPI (trên tập đã lọc tìm kiếm, trước lọc chip)
  const kLuot = rowsF.length;
  const kDu = rowsF.filter(isDu).length;
  const kThieu = rowsF.filter(isThieu).length;
  const kThuCong = rowsF.filter((r) => r.thu_cong).length;
  let phut = 0; for (const r of rowsF) { if (r.gio_vao && r.gio_ra) { const d = vnMinutesOf(r.gio_ra) - vnMinutesOf(r.gio_vao); if (d > 0) phut += d; } }
  const kGio = (phut / 60).toFixed(1);
  const pct = (a, b) => b ? Math.round((a / b) * 100) : 0;

  // lọc chip
  if (tt === 'du') rowsF = rowsF.filter(isDu);
  else if (tt === 'thieu') rowsF = rowsF.filter(isThieu);
  else if (tt === 'thucong') rowsF = rowsF.filter((r) => r.thu_cong);

  // dữ liệu panel hôm nay
  const canXuLy = (todayRows || []).filter((r) => !r.gio_ra).map((r) => ({ id: r.id, ho_ten: r.nhan_vien?.ho_ten || 'NV', lop: r.lich_lop?.ten_lop || 'Lớp khác', gio_vao: r.gio_vao }));
  const attMap = new Map(); for (const r of (todayRows || [])) if (r.lich_lop_id) attMap.set(r.lich_lop_id, r);
  const nowMin = vnNowMinutes();
  const todayClasses = classes.filter((c) => c.thu === thu).sort((a, b) => (a.gio_bat_dau || '').localeCompare(b.gio_bat_dau || '')).slice(0, 14)
    .map((c) => {
      const att = attMap.get(c.id);
      const bd = hmToMin(c.gio_bat_dau), kt = hmToMin(c.gio_ket_thuc);
      let st = 'upcoming', lbl = 'Sắp tới';
      if (att && att.gio_ra) { st = 'done'; lbl = 'Đã xong'; }
      else if (att && !att.gio_ra) { st = 'live'; lbl = 'Đang diễn ra'; }
      else if (nowMin > kt) { st = 'done'; lbl = 'Đã qua'; }
      else if (nowMin >= bd && nowMin <= kt) { st = 'live'; lbl = 'Đang diễn ra'; }
      return { ...c, st, lbl };
    });

  const qs = (over) => { const p = new URLSearchParams({ q: timkiem, tu, den, tt, view, ...over }); return '?' + p.toString(); };
  const chips = [
    { k: 'all', t: 'Tất cả', n: kLuot }, { k: 'du', t: 'Đủ công', n: kDu },
    { k: 'thieu', t: 'Thiếu giờ ra', n: kThieu }, { k: 'thucong', t: 'Thủ công', n: kThuCong },
  ];
  const tabs = [{ k: 'list', t: 'Danh sách' }, { k: 'lop', t: 'Theo lớp' }, { k: 'nv', t: 'Theo nhân viên' }];

  // nhóm cho tab lop / nv
  const groupBy = (keyFn, labelFn) => {
    const m = new Map();
    for (const r of rowsF) { const k = keyFn(r); if (!m.has(k)) m.set(k, { label: labelFn(r), buoi: 0, hv: 0 }); const a = m.get(k); a.buoi++; if (typeof r.so_hoc_vien === 'number') a.hv += r.so_hoc_vien; }
    return Array.from(m.values()).sort((a, b) => b.buoi - a.buoi);
  };

  return (
    <div className="stack">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <h1>Chấm công</h1>
        <a className="btn primary" href={`/api/admin/export?type=cham-cong&tu=${tu}&den=${den}&q=${encodeURIComponent(timkiem)}`}>Xuất Excel</a>
      </div>

      {searchParams?.them === 'ok' && <div className="ok">Đã thêm chấm công thủ công.</div>}
      {searchParams?.loi === 'thieu' && <div className="err">Thiếu thông tin bắt buộc (nhân viên, ngày, giờ vào).</div>}
      {searchParams?.loi === 'trung' && <div className="err">Ca này đã có người chấm trong ngày — hãy Sửa lượt đó thay vì thêm mới.</div>}
      {searchParams?.loi === 'loplop' && <div className="err">Lớp không hợp lệ.</div>}

      {/* KPI */}
      <div className="kpi-row">
        <div className="kpi2"><div className="lbl">Lượt chấm công</div><div className="val">{kLuot}</div><div className="bar"><i style={{ width: pct(kDu, kLuot) + '%' }} /></div><div className="sub">Đủ công {kDu} · {pct(kDu, kLuot)}%</div></div>
        <div className="kpi2 warn"><div className="lbl">Thiếu giờ ra</div><div className="val">{kThieu}</div><div className="bar"><i style={{ width: pct(kThieu, kLuot) + '%' }} /></div><div className="sub">Cần bổ sung</div></div>
        <div className="kpi2"><div className="lbl">Chấm thủ công</div><div className="val">{kThuCong}</div><div className="bar"><i style={{ width: pct(kThuCong, kLuot) + '%' }} /></div><div className="sub">{pct(kThuCong, kLuot)}% tổng lượt</div></div>
        <div className="kpi2 green"><div className="lbl">Tổng giờ dạy</div><div className="val">{kGio}<span style={{ fontSize: 15, color: 'var(--muted)' }}> h</span></div><div className="bar"><i style={{ width: '100%' }} /></div><div className="sub">{tu === den ? tu : `${tu} → ${den}`}</div></div>
      </div>

      <div className="cc-grid">
        <div className="stack">
          <div className="card">
            <form className="form-grid">
              <div><label>Tìm kiếm</label><input name="q" defaultValue={timkiem} placeholder="Tên, mã, club, lớp..." /></div>
              <div><label>Từ ngày</label><input type="date" lang="en-GB" name="tu" defaultValue={tu} /></div>
              <div><label>Đến ngày</label><input type="date" lang="en-GB" name="den" defaultValue={den} /></div>
              <input type="hidden" name="tt" value={tt} /><input type="hidden" name="view" value={view} />
              <button className="btn">Xem</button>
            </form>
          </div>

          <div className="card">
            <div className="tabs">{tabs.map((x) => <a key={x.k} href={qs({ view: x.k })} className={'tab' + (view === x.k ? ' active' : '')}>{x.t}</a>)}</div>
            <div className="chips">{chips.map((c) => <a key={c.k} href={qs({ tt: c.k })} className={'chip' + (tt === c.k ? ' active' : '')}>{c.t} <span className="n">{c.n}</span></a>)}</div>

            {view === 'list' && (
              <table>
                <thead><tr><th>Nhân viên</th><th>Club</th><th>Lớp</th><th>Ca lớp</th><th>Vào</th><th>Ra</th><th>HV</th><th>Trạng thái</th><th></th></tr></thead>
                <tbody>
                  {rowsF.length === 0 && <tr><td colSpan="9" className="muted">Không có lượt chấm công nào.</td></tr>}
                  {rowsF.map((r) => {
                    const quenRa = r.trang_thai === 'quen_ra' || (!r.gio_ra && r.ngay < today);
                    const lateMin = (r.lich_lop?.gio_bat_dau && r.gio_vao) ? (vnMinutesOf(r.gio_vao) - hmToMin(r.lich_lop.gio_bat_dau)) : 0;
                    return (
                      <tr key={r.id}>
                        <td><div className="row-avatar"><span className="tbl-avatar">{initials(r.nhan_vien?.ho_ten)}</span><span><b>{r.nhan_vien?.ho_ten}</b><br /><span className="muted">{r.nhan_vien?.ma_nv} · {r.ngay}</span></span></div></td>
                        <td className="muted">{r.clubs?.ten_club}</td>
                        <td>{r.lich_lop?.ten_lop || <span className="muted">Lớp khác</span>}{r.thu_cong ? <span className="badge manual" style={{ marginLeft: 6 }}>Thủ công</span> : null}{r.ghi_chu ? <div className="muted">{r.ghi_chu}</div> : null}</td>
                        <td className="muted">{r.lich_lop ? `${hhmm(r.lich_lop.gio_bat_dau)}–${hhmm(r.lich_lop.gio_ket_thuc)}` : '—'}</td>
                        <td>{fmtTime(r.gio_vao)}{lateMin > 0 ? <span className="warn-text"> ·trễ {lateMin}p</span> : null}</td>
                        <td>{r.gio_ra ? fmtTime(r.gio_ra) : <span className="muted">—</span>}</td>
                        <td>{typeof r.so_hoc_vien === 'number' ? r.so_hoc_vien : <span className="muted">—</span>}{r.so_hoc_vien === 0 ? <span className="warn-text"> (50%)</span> : null}</td>
                        <td>{quenRa ? <span className="badge warn">Quên chấm ra</span> : r.trang_thai === 'hoan_thanh' ? <span className="badge ok">Đủ công</span> : <span className="badge gray">Đang trong ca</span>}</td>
                        <td><div className="row-actions"><a className="btn" style={{ height: 32 }} href={`/admin/cham-cong/${r.id}`}>Sửa</a><form action={xoaChamCong}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="ngay" value={r.ngay} /><button className="btn danger" style={{ height: 32 }}>Xoá</button></form></div></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {view === 'lop' && (
              <table>
                <thead><tr><th>Lớp</th><th>Số buổi</th><th>Tổng HV</th></tr></thead>
                <tbody>
                  {groupBy((r) => r.lich_lop?.ten_lop || 'Lớp khác', (r) => r.lich_lop?.ten_lop || 'Lớp khác').map((g, i) => <tr key={i}><td><b>{g.label}</b></td><td>{g.buoi}</td><td className="muted">{g.hv}</td></tr>)}
                  {rowsF.length === 0 && <tr><td colSpan="3" className="muted">Không có dữ liệu.</td></tr>}
                </tbody>
              </table>
            )}

            {view === 'nv' && (
              <table>
                <thead><tr><th>Nhân viên</th><th>Số buổi</th><th>Tổng HV</th></tr></thead>
                <tbody>
                  {groupBy((r) => r.nhan_vien?.ma_nv || '?', (r) => `${r.nhan_vien?.ma_nv || ''} · ${r.nhan_vien?.ho_ten || ''}`).map((g, i) => <tr key={i}><td><b>{g.label}</b></td><td>{g.buoi}</td><td className="muted">{g.hv}</td></tr>)}
                  {rowsF.length === 0 && <tr><td colSpan="3" className="muted">Không có dữ liệu.</td></tr>}
                </tbody>
              </table>
            )}
            <p className="muted" style={{ marginTop: 10 }}>{tu === den ? tu : `${tu} → ${den}`} · {rowsF.length} lượt</p>
          </div>

          <div className="card">
            <h2>Thêm chấm công thủ công</h2>
            <p className="muted">Dùng khi mất điện/wifi khiến giáo viên không tự chấm được. Gõ tên để chọn nhân viên; chọn lớp trong lịch để gắn đúng buổi (bỏ trống = "Lớp khác").</p>
            <ManualAddForm nvList={nvList || []} clubs={clubs || []} classes={classes} defaultNgay={today} />
          </div>
        </div>

        <div className="stack">
          <div className="panel">
            <h3>Cần xử lý {canXuLy.length > 0 && <span className="badge warn">{canXuLy.length}</span>}</h3>
            {canXuLy.length === 0 && <p className="muted" style={{ margin: 0 }}>Không có việc cần xử lý hôm nay 🎉</p>}
            {canXuLy.map((c) => (
              <div className="todo" key={c.id}>
                <span><b>{c.ho_ten}</b> · {c.lop}<br /><span className="muted">vào {fmtTime(c.gio_vao)}, chưa có giờ ra</span></span>
                <a className="btn" style={{ height: 32 }} href={`/admin/cham-cong/${c.id}`}>Bổ sung</a>
              </div>
            ))}
          </div>

          <div className="panel">
            <h3>Lịch lớp hôm nay</h3>
            <div className="timeline">
              {todayClasses.length === 0 && <p className="muted" style={{ margin: 0 }}>Hôm nay không có lớp theo lịch.</p>}
              {todayClasses.map((c) => (
                <div className={'tl ' + c.st} key={c.id}>
                  <span className="t">{hhmm(c.gio_bat_dau)}</span><span className="d" />
                  <span><b>{c.ten_lop}</b><br /><span className="muted">{c.ten_club} · {c.lbl}</span></span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
