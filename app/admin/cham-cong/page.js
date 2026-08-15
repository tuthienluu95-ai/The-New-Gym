import { matchQ } from '../../../lib/search';
import { supabaseAdmin } from '../../../lib/supabase';
import { requireAdmin } from '../../../lib/guard';
import { vnParts, fmtTime, thuLabel, vnMinutesOf, hmToMin } from '../../../lib/time';
import { xoaChamCong } from './actions';
import ManualAddForm from './ManualAddForm';

export const dynamic = 'force-dynamic';
const hhmm = (t) => (t || '').slice(0, 5);

export default async function ChamCongPage({ searchParams }) {
  requireAdmin();
  const sb = supabaseAdmin();
  const { dateStr } = vnParts();
  const ngay = searchParams?.ngay || dateStr;
  const timkiem = searchParams?.q || '';

  const [{ data: rows }, { data: nvList }, { data: clubs }, { data: lopAll }] = await Promise.all([
    sb.from('cham_cong')
      .select('id, ngay, gio_vao, gio_ra, trang_thai, ghi_chu, so_hoc_vien, nhan_vien!nv_id ( ma_nv, ho_ten ), clubs!club_id ( ten_club ), lich_lop!lich_lop_id ( ten_lop, gio_bat_dau, gio_ket_thuc )')
      .eq('ngay', ngay).order('gio_vao', { ascending: true }),
    sb.from('nhan_vien').select('id, ma_nv, ho_ten').eq('trang_thai', 'dang_lam').order('ma_nv'),
    sb.from('clubs').select('id, ten_club').order('ma_club'),
    sb.from('lich_lop').select('id, nv_id, club_id, ten_lop, thu, gio_bat_dau, clubs!club_id ( ten_club )').eq('dang_ap_dung', true).order('thu').order('gio_bat_dau'),
  ]);
  const rowsF = (rows || []).filter((r) => matchQ(`${r.nhan_vien?.ma_nv || ''} ${r.nhan_vien?.ho_ten || ''} ${r.clubs?.ten_club || ''} ${r.lich_lop?.ten_lop || ''} ${r.ghi_chu || ''}`, timkiem));
  const classes = (lopAll || []).map((l) => ({ id: l.id, nv_id: l.nv_id, club_id: l.club_id, ten_lop: l.ten_lop, thu: l.thu, gio_bat_dau: l.gio_bat_dau, ten_club: l.clubs?.ten_club || '' }));
  const today = dateStr;

  return (
    <div className="stack">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}><h1>Chấm công</h1><a className="btn" href={`/api/admin/export?type=cham-cong&ngay=${ngay}&q=${encodeURIComponent(timkiem)}`}>Xuất Excel</a></div>

      {searchParams?.them === 'ok' && <div className="ok">Đã thêm chấm công thủ công.</div>}
      {searchParams?.loi === 'thieu' && <div className="err">Thiếu thông tin bắt buộc (nhân viên, ngày, giờ vào).</div>}
      {searchParams?.loi === 'trung' && <div className="err">Ca này đã có người chấm trong ngày — hãy Sửa lượt đó thay vì thêm mới.</div>}
      {searchParams?.loi === 'loplop' && <div className="err">Lớp không hợp lệ.</div>}

      <div className="card">
        <h2>Thêm chấm công thủ công</h2>
        <p className="muted">Dùng khi mất điện/wifi khiến giáo viên không tự chấm được. Chọn lớp trong lịch để gắn đúng buổi (bỏ trống = "Lớp khác").</p>
        <ManualAddForm nvList={nvList || []} clubs={clubs || []} classes={classes} defaultNgay={ngay} />
      </div>

      <div className="card">
        <div className="toolbar">
          <form className="form-grid">
            <div><label>Tìm kiếm</label><input name="q" defaultValue={timkiem} placeholder="Tên, mã, club, lớp..." /></div>
            <div><label>Chọn ngày</label><input type="date" name="ngay" defaultValue={ngay} /></div>
            <button className="btn">Xem</button>
          </form>
        </div>
        <table>
          <thead><tr><th>Mã</th><th>Nhân viên</th><th>Club</th><th>Lớp</th><th>Ca lớp</th><th>Vào</th><th>Ra</th><th>HV</th><th>Trạng thái</th><th></th></tr></thead>
          <tbody>
            {rowsF.length === 0 && <tr><td colSpan="10" className="muted">Không có lượt chấm công nào trong ngày này.</td></tr>}
            {rowsF.map((r) => {
              const quenRa = r.trang_thai === 'quen_ra' || (!r.gio_ra && r.ngay < today);
              const lateMin = (r.lich_lop?.gio_bat_dau && r.gio_vao) ? (vnMinutesOf(r.gio_vao) - hmToMin(r.lich_lop.gio_bat_dau)) : 0;
              const earlyMin = (r.lich_lop?.gio_ket_thuc && r.gio_ra) ? (hmToMin(r.lich_lop.gio_ket_thuc) - vnMinutesOf(r.gio_ra)) : 0;
              return (
                <tr key={r.id}>
                  <td><b>{r.nhan_vien?.ma_nv}</b></td>
                  <td>{r.nhan_vien?.ho_ten}</td>
                  <td className="muted">{r.clubs?.ten_club}</td>
                  <td>{r.lich_lop?.ten_lop || <span className="muted">Lớp khác</span>}{r.ghi_chu ? <span className="muted"> · {r.ghi_chu}</span> : null}</td>
                  <td className="muted">{r.lich_lop ? `${hhmm(r.lich_lop.gio_bat_dau)}–${hhmm(r.lich_lop.gio_ket_thuc)}` : '—'}</td>
                  <td>{fmtTime(r.gio_vao)}{lateMin > 0 ? <span className="warn-text"> · trễ {lateMin}p</span> : null}</td>
                  <td>{r.gio_ra ? fmtTime(r.gio_ra) : '—'}{earlyMin > 0 ? <span className="warn-text"> · ra sớm {earlyMin}p</span> : null}</td>
                  <td>{typeof r.so_hoc_vien === 'number' ? r.so_hoc_vien : <span className="muted">—</span>}{r.so_hoc_vien === 0 ? <span className="warn-text"> (50%)</span> : null}</td>
                  <td>
                    {quenRa ? <span className="tag warn">Quên chấm ra</span>
                      : r.trang_thai === 'hoan_thanh' ? <span className="tag green">Hoàn thành</span>
                      : <span className="tag gray">Đang trong ca</span>}
                  </td>
                  <td>
                    <div className="row-actions">
                      <a className="btn" href={`/admin/cham-cong/${r.id}`}>Sửa</a>
                      <form action={xoaChamCong}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="ngay" value={ngay} /><button className="btn danger">Xoá</button></form>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
