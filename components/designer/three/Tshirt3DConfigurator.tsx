'use client';

import { useRef, useState } from 'react';
import { Loader } from '@react-three/drei';
import Preview3DStage from './Preview3DStage';

const GOLD = '#FFC32E';

const COLORS: { name: string; hex: string }[] = [
  { name: 'לבן', hex: '#FFFFFF' },
  { name: 'שחור', hex: '#17181A' },
  { name: 'אפור', hex: '#AEAFB1' },
  { name: 'נייבי', hex: '#1E2A44' },
  { name: 'אדום', hex: '#C0202B' },
  { name: 'בורדו', hex: '#5E1F2A' },
  { name: 'ירוק זית', hex: '#4E5A2E' },
  { name: 'תכלת', hex: '#9AD4EC' },
];

export default function Tshirt3DConfigurator() {
  const [color, setColor] = useState('#ffffff');
  const [decalUrl, setDecalUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') setDecalUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <>
      <style>{CSS}</style>

      <div className="t3d-root">
        {/* LEFT half — the 3D shirt */}
        <div className="t3d-stage">
          <Preview3DStage
            colorHex={color}
            designs={decalUrl ? [{ area: 'front_full', url: decalUrl }] : []}
          />
          <div className="t3d-note">גררו לסובב · העלו עיצוב</div>
        </div>

        {/* RIGHT half — controls (Hebrew, RTL) */}
        <div className="t3d-controls" dir="rtl">
          <div>
            <h1 className="t3d-title">מעצב תלת-מימד</h1>
            <p className="t3d-sub">אב-טיפוס · סובבו את החולצה, החליפו צבע והעלו עיצוב</p>
          </div>

          <div className="t3d-block">
            <span className="t3d-label">צבע החולצה</span>
            <div className="t3d-swatches">
              {COLORS.map((c) => {
                const selected = color.toLowerCase() === c.hex.toLowerCase();
                return (
                  <button
                    key={c.hex}
                    type="button"
                    title={c.name}
                    aria-label={c.name}
                    onClick={() => setColor(c.hex)}
                    className="t3d-swatch"
                    style={{
                      background: c.hex,
                      boxShadow: selected
                        ? `0 0 0 3px ${GOLD}, 0 0 0 4px rgba(0,0,0,0.15)`
                        : '0 0 0 1px rgba(0,0,0,0.18)',
                      transform: selected ? 'scale(1.12)' : 'scale(1)',
                    }}
                  />
                );
              })}
            </div>
          </div>

          <div className="t3d-block">
            <span className="t3d-label">עיצוב</span>
            <div className="t3d-uploadrow">
              <button type="button" onClick={() => fileInputRef.current?.click()} className="t3d-upload-btn">
                העלאת עיצוב
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleUpload} style={{ display: 'none' }} />
              {decalUrl && (
                <button type="button" onClick={() => setDecalUrl(null)} className="t3d-remove-btn">
                  הסר עיצוב
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* drei progress loader (must live OUTSIDE the Canvas) */}
      <Loader />
    </>
  );
}

const CSS = `
.t3d-root{
  direction:ltr;               /* layout axis: shirt left, controls right */
  display:flex;
  height:calc(100vh - 72px);
  background:#f2f0e9;
  font-family:"Assistant","Rubik",system-ui,-apple-system,sans-serif;
  color:#17181A;
}
.t3d-stage{ position:relative; flex:1 1 50%; min-width:0; background:url(/assets/designer-3d-bg.png) center / cover no-repeat; }
.t3d-note{
  position:absolute; bottom:14px; left:0; right:0; text-align:center;
  font-size:13px; color:#6b6a63; pointer-events:none;
}
.t3d-controls{
  direction:rtl;
  flex:1 1 50%;
  display:flex; flex-direction:column; gap:30px; justify-content:center;
  padding:32px clamp(20px,4vw,60px);
  background:#ffffff; border-left:1px solid #e7e4da; overflow:auto;
}
.t3d-title{ margin:0; font-size:28px; font-weight:800; letter-spacing:-.01em; }
.t3d-sub{ margin:6px 0 0; font-size:14px; color:#6b6a63; }
.t3d-block{ display:flex; flex-direction:column; gap:12px; }
.t3d-label{ font-size:14px; font-weight:700; color:#3a3a36; }
.t3d-swatches{ display:flex; gap:12px; flex-wrap:wrap; }
.t3d-swatch{ width:40px; height:40px; border-radius:50%; border:none; cursor:pointer; padding:0; transition:transform .12s ease, box-shadow .12s ease; }
.t3d-uploadrow{ display:flex; gap:12px; align-items:center; }
.t3d-upload-btn{ background:${GOLD}; color:#17181A; border:none; border-radius:12px; padding:13px 24px; font-size:15px; font-weight:800; cursor:pointer; }
.t3d-remove-btn{ background:transparent; color:#8a2a2a; border:1px solid #d9b3b3; border-radius:12px; padding:13px 16px; font-size:14px; font-weight:600; cursor:pointer; }
@media (max-width:860px){
  .t3d-root{ flex-direction:column; height:auto; min-height:calc(100vh - 72px); }
  .t3d-stage{ height:52vh; flex:none; }
  .t3d-controls{ flex:none; border-left:none; border-top:1px solid #e7e4da; justify-content:flex-start; }
}
`;
