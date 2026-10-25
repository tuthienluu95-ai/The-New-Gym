'use client';
import { useEffect, useState } from 'react';

// Nút chính trên đầu trang + khung trượt bên phải chứa form (form & server action giữ nguyên).
export default function Drawer({ label, title, sub, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <button type="button" className="btn primary" onClick={() => setOpen(true)}>{label}</button>
      {open && (
        <div className="drawer-ov" onClick={() => setOpen(false)}>
          <aside className="drawer" role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}>
            <div className="drawer-head">
              <div>
                <h2 style={{ margin: 0 }}>{title}</h2>
                {sub && <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>{sub}</div>}
              </div>
              <button type="button" className="icon-btn" aria-label="Đóng" onClick={() => setOpen(false)}>✕</button>
            </div>
            <div className="drawer-body">{children}</div>
          </aside>
        </div>
      )}
    </>
  );
}
