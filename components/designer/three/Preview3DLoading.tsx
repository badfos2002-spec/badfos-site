'use client';

import React from 'react';

/**
 * Clean placeholder shown as the next/dynamic fallback while the three.js
 * bundle loads. Just the branded background (no spinner) — models are warmed
 * by a preload on the category screen, so the wait is short and quiet.
 */
export default function Preview3DLoading() {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'url(/assets/designer-3d-bg.png?v=3) center / cover no-repeat',
      }}
    />
  );
}
