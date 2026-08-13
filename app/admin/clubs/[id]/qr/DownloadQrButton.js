'use client';

export default function DownloadQrButton({ clubName, qr, filename }) {
  function load(src) {
    return new Promise((res, rej) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = rej;
      im.src = src;
    });
  }
  async function download() {
    try {
      const [logo, qrImg] = await Promise.all([load('/logo.png'), load(qr)]);
      try { await document.fonts.ready; } catch {}
      const W = 900, pad = 56;
      const logoW = 380, logoH = Math.round(logoW * (logo.height / logo.width));
      const nameGap = 28, nameH = 48, qrGap = 24, qrSize = 620;
      const H = pad + logoH + nameGap + nameH + qrGap + qrSize + pad;
      const cv = document.createElement('canvas');
      cv.width = W; cv.height = H;
      const ctx = cv.getContext('2d');
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);
      ctx.drawImage(logo, (W - logoW) / 2, pad, logoW, logoH);
      ctx.fillStyle = '#14202B'; ctx.textAlign = 'center';
      ctx.font = '600 36px "Be Vietnam Pro", Arial, sans-serif';
      ctx.fillText(clubName, W / 2, pad + logoH + nameGap + 36);
      ctx.drawImage(qrImg, (W - qrSize) / 2, pad + logoH + nameGap + nameH + qrGap, qrSize, qrSize);
      cv.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename; document.body.appendChild(a); a.click();
        a.remove(); URL.revokeObjectURL(url);
      }, 'image/png');
    } catch {
      // dự phòng: tải mã QR gốc nếu ghép ảnh lỗi
      const a = document.createElement('a'); a.href = qr; a.download = filename; a.click();
    }
  }
  return <button className="btn primary" onClick={download}>Tải mã QR</button>;
}
