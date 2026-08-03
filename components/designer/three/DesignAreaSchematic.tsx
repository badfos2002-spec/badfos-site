'use client';

import React from 'react';

/**
 * Illustration-only schematic shown BELOW the 3D shirt. Mirrors the design
 * areas (front full / back / chest logos) as two mini tee diagrams. A zone
 * turns green when a design was uploaded to it, amber when it's the currently
 * selected area. Purely for orientation — not to scale.
 */

const GREEN = '#16a34a';
const GREEN_FILL = 'rgba(34,197,94,0.40)';
const AMBER = '#f59e0b';
const GRAY = '#9ca3af';

// Clean tee silhouette in a 0..100 (x) / 0..108 (y) box.
const TEE =
  'M36 12 L28 12 L12 28 L4 40 L16 52 L26 44 L26 100 L74 100 L74 44 L84 52 L96 40 L88 28 L72 12 L64 12 C58 20 42 20 36 12 Z';

type Zone = { id: string; x: number; y: number; w: number; h: number };

const FRONT_ZONES: Zone[] = [
  { id: 'chest_logo', x: 33, y: 33, w: 11, h: 11 },
  { id: 'chest_logo_right', x: 56, y: 33, w: 11, h: 11 },
  { id: 'front_full', x: 35, y: 48, w: 30, h: 40 },
];
const BACK_ZONES: Zone[] = [{ id: 'back', x: 33, y: 30, w: 34, h: 58 }];

function MiniTee({
  zones,
  title,
  uploaded,
  active,
}: {
  zones: Zone[];
  title: string;
  uploaded: Set<string>;
  active?: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
      <svg viewBox="0 0 100 108" width="70" height="76" aria-hidden="true">
        <path d={TEE} fill="#ffffff" stroke="#cbd5e1" strokeWidth="2.4" strokeLinejoin="round" />
        {zones.map((z) => {
          const has = uploaded.has(z.id);
          const isActive = active === z.id;
          return (
            <rect
              key={z.id}
              x={z.x}
              y={z.y}
              width={z.w}
              height={z.h}
              rx="2.5"
              fill={has ? GREEN_FILL : 'transparent'}
              stroke={has ? GREEN : isActive ? AMBER : GRAY}
              strokeWidth={has || isActive ? 2.2 : 1.5}
              strokeDasharray={has ? undefined : '3 2'}
            />
          );
        })}
      </svg>
      <span style={{ fontSize: 11, fontWeight: 700, color: '#4b5563' }}>{title}</span>
    </div>
  );
}

export default function DesignAreaSchematic({
  uploadedAreas,
  activeArea,
}: {
  uploadedAreas: Set<string>;
  activeArea?: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        padding: '12px 8px 4px',
      }}
    >
      <div style={{ display: 'flex', gap: 26, alignItems: 'flex-start' }}>
        <MiniTee zones={FRONT_ZONES} title="חזית" uploaded={uploadedAreas} active={activeArea} />
        <MiniTee zones={BACK_ZONES} title="גב" uploaded={uploadedAreas} active={activeArea} />
      </div>
      <span style={{ fontSize: 11, color: '#9ca3af' }}>אזורי הדפסה · סכמה להמחשה בלבד</span>
    </div>
  );
}
