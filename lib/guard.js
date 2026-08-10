import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { isAdminToken, ADMIN_COOKIE } from './auth';

export function requireAdmin() {
  const c = cookies().get(ADMIN_COOKIE)?.value;
  if (!isAdminToken(c)) redirect('/admin/login');
}
