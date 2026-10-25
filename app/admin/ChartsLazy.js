'use client';
import dynamic from 'next/dynamic';

// Tải thư viện biểu đồ sau khi trang đã hiện số liệu, để trang mở nhanh hơn
const Loading = () => <div className="card muted">Đang tải biểu đồ…</div>;
export const ReportChartsLazy = dynamic(() => import('./ReportCharts'), { ssr: false, loading: Loading });
export const TopPayChartLazy = dynamic(() => import('./ReportCharts').then((m) => m.TopPayChart), { ssr: false, loading: Loading });
