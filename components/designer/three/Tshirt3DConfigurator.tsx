'use client';

import { Suspense, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import {
  OrbitControls,
  Environment,
  ContactShadows,
  Loader,
} from '@react-three/drei';
import Tshirt3DModel from './Tshirt3DModel';

const GOLD = '#FFC32E';

// Camera position is tunable — nudge to frame the shirt nicely.
const CAMERA = { position: [0, 0.1, 2.6] as [number, number, number], fov: 35 };

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
    <div dir="rtl" style={styles.root}>
      {/* Stage */}
      <div style={styles.stage}>
        <Canvas
          shadows
          dpr={[1, 2]}
          camera={{ position: CAMERA.position, fov: CAMERA.fov }}
          gl={{ preserveDrawingBuffer: true, antialias: true }}
        >
          <color attach="background" args={['#f2f0e9']} />
          <ambientLight intensity={0.6} />
          <directionalLight position={[3, 5, 4]} intensity={1.1} castShadow />
          <Suspense fallback={null}>
            <Environment preset="city" />
            <Tshirt3DModel color={color} decalUrl={decalUrl} />
            <ContactShadows
              position={[0, -0.9, 0]}
              opacity={0.5}
              scale={5}
              blur={2.4}
              far={2}
            />
          </Suspense>
          <OrbitControls
            autoRotate
            autoRotateSpeed={1.1}
            enablePan={false}
            minDistance={1.6}
            maxDistance={4}
            enableDamping
          />
        </Canvas>

        <div style={styles.note}>
          אב-טיפוס תלת-מימד · גררו לסובב · העלו עיצוב
        </div>
      </div>

      {/* Controls */}
      <div style={styles.controls}>
        <div style={styles.controlBlock}>
          <span style={styles.label}>צבע החולצה</span>
          <div style={styles.swatchRow}>
            {COLORS.map((c) => {
              const selected = color.toLowerCase() === c.hex.toLowerCase();
              return (
                <button
                  key={c.hex}
                  type="button"
                  title={c.name}
                  aria-label={c.name}
                  onClick={() => setColor(c.hex)}
                  style={{
                    ...styles.swatch,
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

        <div style={styles.controlBlock}>
          <span style={styles.label}>עיצוב</span>
          <div style={styles.uploadRow}>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={styles.uploadBtn}
            >
              העלאת עיצוב
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleUpload}
              style={{ display: 'none' }}
            />
            {decalUrl && (
              <button
                type="button"
                onClick={() => setDecalUrl(null)}
                style={styles.removeBtn}
              >
                הסר עיצוב
              </button>
            )}
          </div>
        </div>
      </div>

      {/* drei progress loader (must live OUTSIDE the Canvas) */}
      <Loader />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    minHeight: '100vh',
    background: '#f2f0e9',
    fontFamily:
      '"Assistant", "Rubik", system-ui, -apple-system, sans-serif',
    color: '#17181A',
  },
  stage: {
    position: 'relative',
    flex: 1,
    minHeight: '60vh',
  },
  note: {
    position: 'absolute',
    bottom: 12,
    insetInlineStart: 0,
    insetInlineEnd: 0,
    textAlign: 'center',
    fontSize: 13,
    color: '#6b6a63',
    pointerEvents: 'none',
  },
  controls: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 24,
    justifyContent: 'center',
    alignItems: 'flex-start',
    padding: '20px 16px 28px',
    background: '#ffffff',
    borderTop: '1px solid #e7e4da',
  },
  controlBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: 700,
    color: '#3a3a36',
  },
  swatchRow: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
    justifyContent: 'center',
    maxWidth: 360,
  },
  swatch: {
    width: 34,
    height: 34,
    borderRadius: '50%',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    transition: 'transform 0.12s ease, box-shadow 0.12s ease',
  },
  uploadRow: {
    display: 'flex',
    gap: 10,
    alignItems: 'center',
  },
  uploadBtn: {
    background: GOLD,
    color: '#17181A',
    border: 'none',
    borderRadius: 10,
    padding: '10px 18px',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
  },
  removeBtn: {
    background: 'transparent',
    color: '#8a2a2a',
    border: '1px solid #d9b3b3',
    borderRadius: 10,
    padding: '10px 14px',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
};
