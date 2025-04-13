'use client';

import { useEffect, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

// Pre-configure the loaders
useGLTF.preload('/models/placeholder.glb');

interface ModelLoaderProps {
  url?: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number | [number, number, number];
}

export default function ModelLoader({ 
  url = '/models/placeholder.glb', 
  position = [0, 0, 0], 
  rotation = [0, 0, 0],
  scale = 1 
}: ModelLoaderProps) {
  const [modelUrl, setModelUrl] = useState<string>(url);
  
  // Load the model using drei's useGLTF
  const { scene } = useGLTF(modelUrl);
  
  // Clone the scene to avoid reference issues
  const model = scene.clone();
  
  // Center the model
  useEffect(() => {
    if (model) {
      // Calculate bounding box
      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      
      // Center the model
      model.position.x -= center.x;
      model.position.y -= center.y;
      model.position.z -= center.z;
    }
  }, [model]);
  
  // Apply transformations
  const scaleArray = Array.isArray(scale) ? scale : [scale, scale, scale];
  
  return (
    <group position={position} rotation={rotation.map(r => r * Math.PI / 180) as [number, number, number]}>
      <primitive object={model} scale={scaleArray} />
    </group>
  );
} 