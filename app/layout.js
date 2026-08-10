import './globals.css';

export const metadata = {
  title: 'The New Gym — Chấm công',
  description: 'Hệ thống chấm công GROUP-X',
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
