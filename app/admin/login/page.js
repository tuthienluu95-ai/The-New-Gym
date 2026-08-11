import IntroTeaser from './IntroTeaser';

export const dynamic = 'force-dynamic';

export default function AdminLogin({ searchParams }) {
  const error = searchParams?.error;
  return (
    <>
      <IntroTeaser />
      <main className="authscreen">
        <div className="logo-plate"><img src="/logo.png" alt="THE NEW GYM" /></div>
        <form className="card stack" method="post" action="/api/admin/login" style={{ width: '100%', maxWidth: 420 }}>
          <h2>Đăng nhập admin</h2>
          {error && <div className="err">Sai mật khẩu, vui lòng thử lại.</div>}
          <div>
            <label>Mật khẩu quản trị</label>
            <input type="password" name="password" autoFocus />
          </div>
          <button className="btn primary block">Đăng nhập</button>
        </form>
      </main>
    </>
  );
}
