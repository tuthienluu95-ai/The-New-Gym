import { headers } from 'next/headers';
import { requireAdmin } from '../../lib/guard';

export const dynamic = 'force-dynamic';

export default function AdminLayout({ children }) {
  const path = headers().get('x-tng-path') || '';
  if (path.startsWith('/admin/login')) {
    return children;
  }
  requireAdmin();
  return (
    <div>
      <nav className="nav">
        <div className="inner">
          <img className="brand-logo" src="/logo.png" alt="THE NEW GYM" />
          <a href="/admin">Bảng điều khiển</a>
          <a href="/admin/clubs">Club</a>
          <a href="/admin/nhan-vien">Nhân viên</a>
          <a href="/admin/lich">Lịch lớp</a>
          <a href="/admin/lich-ngay">Lịch theo ngày</a>
          <a href="/admin/cham-cong">Chấm công</a>
          <form method="post" action="/api/admin/logout" className="spacer" style={{ margin: 0, marginLeft: 'auto' }}>
            <button className="btn" style={{ height: 34 }}>Đăng xuất</button>
          </form>
        </div>
      </nav>
      <main className="wrap">{children}</main>
    </div>
  );
}
