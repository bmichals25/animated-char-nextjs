'use client';

import { useState } from 'react';

interface ModelUploaderProps {
  onModelSelect: (url: string) => void;
}

export default function ModelUploader({ onModelSelect }: ModelUploaderProps) {
  const [showUploadNotice, setShowUploadNotice] = useState(false);
  
  // Sample models that are commonly available
  const sampleModels = [
    { name: 'Cube (Default)', url: '' }, // Empty URL = use the default cube
    { name: 'Duck (glTF)', url: 'https://threejs.org/examples/models/gltf/Duck/glTF/Duck.gltf' },
    { name: 'Helmet (glTF)', url: 'https://threejs.org/examples/models/gltf/DamagedHelmet/glTF/DamagedHelmet.gltf' },
    { name: 'Fox (glTF)', url: 'https://threejs.org/examples/models/gltf/Fox/glTF/Fox.gltf' }
  ];
  
  const handleSampleSelect = (url: string) => {
    onModelSelect(url || '/models/placeholder.glb');
  };
  
  const handleUploadClick = () => {
    setShowUploadNotice(true);
    setTimeout(() => setShowUploadNotice(false), 5000);
  };
  
  return (
    <div className="p-4 bg-gray-800 text-white rounded-lg shadow-lg max-w-xs">
      <h3 className="text-lg font-bold mb-3">Model Selector</h3>
      
      <div className="mb-4">
        <h4 className="text-sm font-semibold mb-2">Sample Models</h4>
        <div className="flex flex-col gap-2">
          {sampleModels.map((model, index) => (
            <button
              key={index}
              onClick={() => handleSampleSelect(model.url)}
              className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-left text-sm transition-colors"
            >
              {model.name}
            </button>
          ))}
        </div>
      </div>
      
      <div className="border-t border-gray-700 pt-4">
        <h4 className="text-sm font-semibold mb-2">Upload Your Model</h4>
        <button
          onClick={handleUploadClick}
          className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded text-center font-medium transition-colors"
        >
          Upload Model
        </button>
        
        {showUploadNotice && (
          <div className="mt-3 p-2 bg-yellow-800 rounded text-xs">
            Note: For client-side only apps, place models in the <code>/public/models/</code> folder and update the code.
          </div>
        )}
        
        <div className="mt-3 text-xs text-gray-400">
          Supported formats: glTF/GLB (recommended), OBJ, FBX
        </div>
      </div>
    </div>
  );
} 