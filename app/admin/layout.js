import { headers } from 'next/headers';
import { requireAdmin } from '../../lib/guard';
import { supabaseAdmin } from '../../lib/supabase';
import { vnParts } from '../../lib/time';
import { Icon } from './_shell/icons';
import Topbar from './_shell/Topbar';

export const dynamic = 'force-dynamic';

const NAV = [
  { group: 'Vận hành', items: [
    { t: 'Bảng điều khiển', href: '/admin', icon: 'dashboard' },
    { t: 'Chấm công', href: '/admin/cham-cong', icon: 'clock', badge: true },
    { t: 'Lịch lớp', href: '/admin/lich', icon: 'calendar' },
    { t: 'Thời khoá biểu', href: '/admin/tkb', icon: 'grid' },
  ] },
  { group: 'Danh mục', items: [
    { t: 'Club', href: '/admin/clubs', icon: 'store' },
    { t: 'Nhân viên', href: '/admin/nhan-vien', icon: 'users' },
  ] },
  { group: 'Hệ thống', items: [
    { t: 'Báo cáo', href: '/admin/bao-cao', icon: 'chart' },
    { t: 'Nhật ký', href: '/admin/nhat-ky', icon: 'log' },
    { t: 'Sao lưu', href: '/api/admin/backup', icon: 'save' },
  ] },
];

export default async function AdminLayout({ children }) {
  const path = headers().get('x-tng-path') || '';
  if (path.startsWith('/admin/login')) return children;
  requireAdmin();

  // badge "cần xử lý" = buổi hôm nay chưa chấm giờ ra
  let canXuLy = 0;
  try {
    const sb = supabaseAdmin();
    const { dateStr } = vnParts();
    const { count } = await sb.from('cham_cong').select('id', { count: 'exact', head: true }).eq('ngay', dateStr).is('gio_ra', null);
    canXuLy = count || 0;
  } catch {}

  const isActive = (href) => href === '/admin' ? path === '/admin' : path.startsWith(href);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sb-brand">
          <img className="sb-logo-img" src="/logo.png" alt="The New Gym" />
          <span className="sb-sub">Admin Console</span>
        </div>
        {NAV.map((g) => (
          <div key={g.group}>
            <div className="sb-group">{g.group}</div>
            {g.items.map((it) => (
              <a key={it.href} href={it.href} className={'sb-link' + (isActive(it.href) ? ' active' : '')}>
                <Icon name={it.icon} /><span>{it.t}</span>
                {it.badge && canXuLy > 0 && <span className="sb-badge">{canXuLy}</span>}
              </a>
            ))}
          </div>
        ))}
        <div className="sb-foot">Đồng bộ dữ liệu<br />Tự sao lưu mỗi ngày</div>
      </aside>

      <div className="main-col">
        <header className="topbar">
          <Topbar initialCount={canXuLy} />
        </header>
        <main className="wrap2">{children}</main>
      </div>
    </div>
  );
}
