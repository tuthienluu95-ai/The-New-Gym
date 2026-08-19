'use client';
export default function PrintButton() {
  return <button type="button" className="btn primary" onClick={() => window.print()}>Xuất PDF / In</button>;
}
