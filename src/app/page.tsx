'use client';

import dynamic from 'next/dynamic';
import { useState, useRef } from 'react';
import { Canvas } from '@react-three/fiber';

// Use dynamic import with no SSR for Three.js components
const Scene3D = dynamic(() => import('@/components/Scene3D'), { ssr: false });

export default function Home() {

  return (
    <div className="w-full h-screen">
      <Scene3D />
    </div>
  );
}
