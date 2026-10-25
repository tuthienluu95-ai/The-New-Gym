'use client';
import { useEffect, useState, useCallback, useRef } from 'react';

const PAGES = [
  { t: 'Bảng điều khiển', href: '/admin' }, { t: 'Chấm công', href: '/admin/cham-cong' },
  { t: 'Lịch lớp', href: '/admin/lich' }, { t: 'Thời khoá biểu', href: '/admin/tkb' },
  { t: 'Club', href: '/admin/clubs' }, { t: 'Nhân viên', href: '/admin/nhan-vien' },
  { t: 'Nhật ký', href: '/admin/nhat-ky' },
];
const IconSearch = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M21 21l-4.3-4.3" /><circle cx="11" cy="11" r="8" /></svg>;
const IconBell = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0" /></svg>;

export default function Topbar({ initialCount = 0 }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [res, setRes] = useState({ nhanVien: [], clubs: [], lop: [] });
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs, setNotifs] = useState({ count: initialCount, items: null });
  const [adminOpen, setAdminOpen] = useState(false);
  const inpRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); inpRef.current?.focus(); }
      if (e.key === 'Escape') { setOpen(false); setNotifOpen(false); setAdminOpen(false); inpRef.current?.blur(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!q.trim()) { setRes({ nhanVien: [], clubs: [], lop: [] }); return; }
    const id = setTimeout(async () => {
      try { const r = await fetch('/api/admin/search?q=' + encodeURIComponent(q)); if (r.ok) setRes(await r.json()); } catch {}
    }, 220);
    return () => clearTimeout(id);
  }, [q]);

  const go = (href) => { window.location.href = href; };
  const toggleNotif = useCallback(async () => {
    const next = !notifOpen; setNotifOpen(next); setAdminOpen(false);
    if (next && notifs.items === null) {
      try { const r = await fetch('/api/admin/notifications'); if (r.ok) setNotifs(await r.json()); } catch {}
    }
  }, [notifOpen, notifs.items]);

  const term = q.trim().toLowerCase();
  const pageHits = term ? PAGES.filter((p) => p.t.toLowerCase().includes(term)) : [];
  const hasAny = res.nhanVien.length || res.clubs.length || res.lop.length || pageHits.length;

  return (
    <>
      {/* Ô tìm kiếm gõ trực tiếp, kết quả xổ ngay bên dưới (không mở thêm khung tìm kiếm thứ hai) */}
      <div className="search-box">
        <label className="search-pill">
          <IconSearch />
          <input ref={inpRef} value={q} autoComplete="off" aria-label="Tìm kiếm" placeholder="Tìm nhân viên, lớp, club…"
            onChange={(e) => { setQ(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)} />
          <span className="kbd">Ctrl K</span>
        </label>
        {open && term && (
          <div className="search-drop">
            {res.nhanVien.length > 0 && <div className="cmdk-sec">Nhân viên</div>}
            {res.nhanVien.map((n) => <div className="cmdk-item" key={n.id} onMouseDown={() => go(`/admin/nhan-vien/${n.id}`)}><b>{n.ma_nv}</b> · {n.ho_ten}<span className="mut">Nhân viên</span></div>)}
            {res.clubs.length > 0 && <div className="cmdk-sec">Club</div>}
            {res.clubs.map((c) => <div className="cmdk-item" key={c.id} onMouseDown={() => go(`/admin/clubs/${c.id}`)}>{c.ten_club}<span className="mut">Club</span></div>)}
            {res.lop.length > 0 && <div className="cmdk-sec">Lớp</div>}
            {res.lop.map((t) => <div className="cmdk-item" key={t} onMouseDown={() => go('/admin/lich?q=' + encodeURIComponent(t))}>{t}<span className="mut">Xem lịch lớp</span></div>)}
            {pageHits.length > 0 && <div className="cmdk-sec">Trang</div>}
            {pageHits.map((p) => <div className="cmdk-item" key={p.href} onMouseDown={() => go(p.href)}>{p.t}<span className="mut">Mở trang</span></div>)}
            {!hasAny && <div className="cmdk-empty">Không tìm thấy “{q}”.</div>}
          </div>
        )}
      </div>
      <div className="top-right">
        <button className="icon-btn" onClick={toggleNotif} aria-label="Thông báo">
          <IconBell />{notifs.count > 0 && <span className="badge">{notifs.count}</span>}
          {notifOpen && (
            <div className="pop" onClick={(e) => e.stopPropagation()}>
              <h4>Cần xử lý {notifs.count > 0 && <span className="badge warn">{notifs.count}</span>}</h4>
              {notifs.items === null && <div className="empty">Đang tải…</div>}
              {notifs.items && notifs.items.length === 0 && <div className="empty">Không có việc cần xử lý 🎉</div>}
              {notifs.items && notifs.items.map((it) => (
                <div className="it" key={it.id}>
                  <span><b>{it.ho_ten}</b> · {it.lop}<br /><span className="muted">Chưa chấm giờ ra</span></span>
                  <a className="btn" style={{ height: 30 }} href={`/admin/cham-cong/${it.id}`}>Bổ sung</a>
                </div>
              ))}
            </div>
          )}
        </button>
        <div className="admin-chip" onClick={() => { setAdminOpen((v) => !v); setNotifOpen(false); }} style={{ position: 'relative' }}>
          <div className="avatar">AD</div>
          <div className="who"><b>Quản trị viên</b><span>The New Gym</span></div>
          {adminOpen && (
            <div className="pop" style={{ width: 180 }} onClick={(e) => e.stopPropagation()}>
              <form method="post" action="/api/admin/logout" style={{ margin: 0 }}>
                <button className="it" style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>Đăng xuất</button>
              </form>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
