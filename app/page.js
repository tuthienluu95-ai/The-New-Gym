export default function Home() {
  return (
    <main className="wrap">
      <div className="card stack">
        <h1>The New Gym — Hệ thống chấm công</h1>
        <p className="muted">
          Nhân viên vui lòng quét mã QR dán tại club để chấm công. Trang này dành cho quản trị.
        </p>
        <div>
          <a className="btn primary" href="/admin/login">Đăng nhập quản trị</a>
        </div>
      </div>
    </main>
  );
}
