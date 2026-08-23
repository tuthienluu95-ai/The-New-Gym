'use client';
export default function ClearButtons({ truoc }) {
  return (
    <div className="noprint" style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
      <form method="POST" action="/api/admin/log-clear" onSubmit={(e) => { if (!confirm('Xoá nhật ký TRƯỚC ngày đã chọn? Không thể hoàn tác.')) e.preventDefault(); }}>
        <label style={{ display: 'block', fontSize: 13, color: '#6b7280' }}>Xoá log trước ngày</label>
        <div style={{ display: 'flex', gap: 6 }}>
          <input type="date" name="truoc" defaultValue={truoc} required />
          <button className="btn" style={{ borderColor: '#E0567A', color: '#E0567A' }}>Xoá</button>
        </div>
      </form>
      <form method="POST" action="/api/admin/log-clear" onSubmit={(e) => { if (!confirm('XOÁ TOÀN BỘ nhật ký chấm công? Không thể hoàn tác.')) e.preventDefault(); }}>
        <input type="hidden" name="all" value="1" />
        <button className="btn" style={{ background: '#E0567A', color: '#fff', borderColor: '#E0567A' }}>Xoá toàn bộ</button>
      </form>
    </div>
  );
}
