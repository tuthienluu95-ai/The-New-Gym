import QRCode from 'qrcode';
import { headers } from 'next/headers';
import { supabaseAdmin } from '../../../../../lib/supabase';
import { requireAdmin } from '../../../../../lib/guard';
import PrintButton from './PrintButton';

export const dynamic = 'force-dynamic';

export default async function ClubQR({ params }) {
  requireAdmin();
  const sb = supabaseAdmin();
  const { data: c } = await sb.from('clubs').select('ma_club, ten_club, qr_token').eq('id', params.id).maybeSingle();
  if (!c) return <div className="card">Không tìm thấy club.</div>;
  const h = headers();
  const proto = h.get('x-forwarded-proto') || 'https';
  const host = h.get('host');
  const url = `${proto}://${host}/quet?c=${c.qr_token}`;
  const dataUrl = await QRCode.toDataURL(url, { width: 600, margin: 1 });
  return (
    <div className="stack">
      <div className="noprint"><a href="/admin/clubs">← Về danh sách club</a></div>
      <div className="card center stack" style={{ maxWidth: 360, margin: '0 auto' }}>
        <div style={{ fontWeight: 700 }}>THE NEW GYM</div>
        <div>{c.ten_club}</div>
        <img src={dataUrl} alt="Mã QR" style={{ width: 260, height: 260 }} />
        <div className="noprint" style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <a className="btn primary" href={dataUrl} download={`QR-${c.ma_club}.png`}>Tải mã QR</a>
          <PrintButton />
        </div>
      </div>
      <p className="muted center noprint">Tải hoặc in mã này gửi cho club để dán tại quầy. Nhân viên quét bằng camera điện thoại; phải ở trong bán kính club mới chấm công được.</p>
    </div>
  );
}
