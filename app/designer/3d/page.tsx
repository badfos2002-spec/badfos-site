'use client';

import dynamic from 'next/dynamic';

// The R3F Canvas cannot be server-rendered, so load the configurator
// client-side only.
const Cfg = dynamic(
  () => import('@/components/designer/three/Tshirt3DConfigurator'),
  {
    ssr: false,
    loading: () => (
      <div style={{ padding: 40, textAlign: 'center' }}>
        טוען מעצב תלת-מימד…
      </div>
    ),
  }
);

export default function Designer3DPage() {
  return (
    <main dir="rtl" style={{ minHeight: '100vh' }}>
      <Cfg />
    </main>
  );
}
