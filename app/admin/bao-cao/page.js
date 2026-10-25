import { redirect } from 'next/navigation';

// Trang Báo cáo đã gộp vào Bảng điều khiển; giữ đường dẫn cũ để link/bookmark cũ vẫn dùng được.
export default function BaoCaoPage({ searchParams }) {
  const p = new URLSearchParams();
  for (const k of ['tu', 'den', 'club']) if (searchParams?.[k]) p.set(k, searchParams[k]);
  redirect('/admin' + (p.toString() ? '?' + p.toString() : ''));
}
