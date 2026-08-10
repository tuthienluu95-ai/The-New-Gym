'use client';
export default function LocationButton() {
  function capture() {
    if (!navigator.geolocation) { alert('Trình duyệt không hỗ trợ định vị.'); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const f = document.forms['clubForm'];
        if (f) { f.lat.value = p.coords.latitude.toFixed(6); f.lng.value = p.coords.longitude.toFixed(6); }
      },
      () => alert('Không lấy được vị trí. Hãy cho phép truy cập vị trí và thử lại.'),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  }
  return <button type="button" className="btn" onClick={capture}>Lưu vị trí hiện tại</button>;
}
