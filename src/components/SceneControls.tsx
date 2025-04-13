'use client';

import { useState } from 'react';

interface SceneControlsProps {
  onPositionChange?: (position: [number, number, number]) => void;
  onRotationChange?: (rotation: [number, number, number]) => void;
  onScaleChange?: (scale: number) => void;
}

export default function SceneControls({
  onPositionChange,
  onRotationChange,
  onScaleChange
}: SceneControlsProps) {
  const [position, setPosition] = useState<[number, number, number]>([0, 0, 0]);
  const [rotation, setRotation] = useState<[number, number, number]>([0, 0, 0]);
  const [scale, setScale] = useState<number>(1);
  
  const handlePositionChange = (axis: 'x' | 'y' | 'z', value: number) => {
    const newPosition: [number, number, number] = [...position];
    if (axis === 'x') newPosition[0] = value;
    if (axis === 'y') newPosition[1] = value;
    if (axis === 'z') newPosition[2] = value;
    
    setPosition(newPosition);
    onPositionChange?.(newPosition);
  };
  
  const handleRotationChange = (axis: 'x' | 'y' | 'z', value: number) => {
    const newRotation: [number, number, number] = [...rotation];
    if (axis === 'x') newRotation[0] = value;
    if (axis === 'y') newRotation[1] = value;
    if (axis === 'z') newRotation[2] = value;
    
    setRotation(newRotation);
    onRotationChange?.(newRotation);
  };
  
  const handleScaleChange = (value: number) => {
    setScale(value);
    onScaleChange?.(value);
  };
  
  return (
    <div className="p-4 bg-gray-800 text-white rounded-lg shadow-lg">
      <h3 className="text-lg font-bold mb-3">Model Controls</h3>
      
      <div className="mb-4">
        <h4 className="text-sm font-semibold mb-2">Position</h4>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-xs mb-1">X</label>
            <input
              type="range"
              min="-10"
              max="10"
              step="0.1"
              value={position[0]}
              onChange={(e) => handlePositionChange('x', parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="text-xs text-center">{position[0].toFixed(1)}</div>
          </div>
          <div>
            <label className="block text-xs mb-1">Y</label>
            <input
              type="range"
              min="-10"
              max="10"
              step="0.1"
              value={position[1]}
              onChange={(e) => handlePositionChange('y', parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="text-xs text-center">{position[1].toFixed(1)}</div>
          </div>
          <div>
            <label className="block text-xs mb-1">Z</label>
            <input
              type="range"
              min="-10"
              max="10"
              step="0.1"
              value={position[2]}
              onChange={(e) => handlePositionChange('z', parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="text-xs text-center">{position[2].toFixed(1)}</div>
          </div>
        </div>
      </div>
      
      <div className="mb-4">
        <h4 className="text-sm font-semibold mb-2">Rotation (degrees)</h4>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-xs mb-1">X</label>
            <input
              type="range"
              min="0"
              max="360"
              step="5"
              value={rotation[0]}
              onChange={(e) => handleRotationChange('x', parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="text-xs text-center">{rotation[0].toFixed(0)}°</div>
          </div>
          <div>
            <label className="block text-xs mb-1">Y</label>
            <input
              type="range"
              min="0"
              max="360"
              step="5"
              value={rotation[1]}
              onChange={(e) => handleRotationChange('y', parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="text-xs text-center">{rotation[1].toFixed(0)}°</div>
          </div>
          <div>
            <label className="block text-xs mb-1">Z</label>
            <input
              type="range"
              min="0"
              max="360"
              step="5"
              value={rotation[2]}
              onChange={(e) => handleRotationChange('z', parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="text-xs text-center">{rotation[2].toFixed(0)}°</div>
          </div>
        </div>
      </div>
      
      <div>
        <h4 className="text-sm font-semibold mb-2">Scale</h4>
        <input
          type="range"
          min="0.1"
          max="5"
          step="0.1"
          value={scale}
          onChange={(e) => handleScaleChange(parseFloat(e.target.value))}
          className="w-full"
        />
        <div className="text-xs text-center">{scale.toFixed(1)}x</div>
      </div>
    </div>
  );
} 