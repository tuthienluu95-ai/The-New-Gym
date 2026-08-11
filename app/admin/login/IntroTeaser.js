'use client';
import { useEffect, useState } from 'react';

export default function IntroTeaser() {
  const [show, setShow] = useState(true);
  const [fading, setFading] = useState(false);

  function close() {
    setFading(true);
    setTimeout(() => setShow(false), 450);
  }

  useEffect(() => {
    const t1 = setTimeout(() => setFading(true), 5600);
    const t2 = setTimeout(() => setShow(false), 6100);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  if (!show) return null;
  return (
    <div className={'teaser' + (fading ? ' fade' : '')} onClick={close}>
      <button className="teaser-skip" onClick={(e) => { e.stopPropagation(); close(); }}>Bỏ qua ›</button>
      <div className="teaser-inner">
        <div className="teaser-logo">THE NEW GYM</div>
        <div className="teaser-tag">NEW WAY TO FIT</div>
        <div className="teaser-bar"><span /></div>
      </div>
    </div>
  );
}
