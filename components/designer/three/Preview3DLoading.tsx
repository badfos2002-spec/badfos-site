'use client';

import React from 'react';

/**
 * Loading placeholder for the 3D preview. Used both as the next/dynamic
 * fallback (while the three.js bundle loads) and as an in-stage overlay
 * (while the model/textures download) so the preview never looks frozen.
 */
export default function Preview3DLoading({ overlay = false }: { overlay?: boolean }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 5,
        pointerEvents: 'none',
        background: overlay
          ? 'rgba(255,255,255,0.30)'
          : 'url(/assets/designer-3d-bg.png?v=3) center / cover no-repeat',
        backdropFilter: overlay ? 'blur(1px)' : undefined,
        WebkitBackdropFilter: overlay ? 'blur(1px)' : undefined,
      }}
    >
      <style>{`@keyframes t3dspin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div
          style={{
            width: 46,
            height: 46,
            border: '4px solid rgba(0,0,0,0.14)',
            borderTopColor: '#FFC32E',
            borderRadius: '50%',
            animation: 't3dspin 0.8s linear infinite',
          }}
        />
        <span style={{ fontFamily: '"Assistant","Rubik",system-ui,sans-serif', fontSize: 14, fontWeight: 700, color: '#3a3a36' }}>
          טוען תצוגה…
        </span>
      </div>
    </div>
  );
}
