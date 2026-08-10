export const dynamic = 'force-dynamic';

export default function AdminLogin({ searchParams }) {
  const error = searchParams?.error;
  return (
    <main className="kiosk">
      <div className="brand"><div className="name">THE NEW GYM</div><div className="club">Trang quản trị</div></div>
      <form className="card stack" method="post" action="/api/admin/login">
        <h2>Đăng nhập admin</h2>
        {error && <div className="err">Sai mật khẩu, vui lòng thử lại.</div>}
        <div>
          <label>Mật khẩu quản trị</label>
          <input type="password" name="password" autoFocus />
        </div>
        <button className="btn primary block">Đăng nhập</button>
      </form>
    </main>
  );
}
