import React, { useRef, useState, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Stage, BakeShadows, AdaptiveDpr, AdaptiveEvents } from '@react-three/drei';
import * as THREE from 'three';

import Model from './Model';
import CameraController from './CameraController';
import VisibilityControls from './VisibilityControls';

// Enable Three.js caching
THREE.Cache.enabled = true;

export default function ModelViewer() {
  const [modelParts, setModelParts] = useState({});
  const [visibleParts, setVisibleParts] = useState({});
  const [meshes, setMeshes] = useState({});
  const [selectedPart, setSelectedPart] = useState(null);
  const [modelUrl, setModelUrl] = useState(null);
  const isInitialized = useRef(false);

  const handleFileUpload = useCallback((event) => {
    const file = event.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setModelUrl(url);
      isInitialized.current = false;
      setModelParts({});
      setVisibleParts({});
      setMeshes({});
      setSelectedPart(null);
    }
  }, []);

  const handleModelLoad = useCallback((parts) => {
    if (!isInitialized.current) {
      setModelParts(parts);
      setVisibleParts(parts);
      isInitialized.current = true;
    }
  }, []);

  const handlePartFound = useCallback((meshRefs) => {
    setMeshes(meshRefs);
  }, []);

  const togglePartVisibility = useCallback((partName, forcedState) => {
    setVisibleParts(prev => ({
      ...prev,
      [partName]: forcedState !== undefined ? forcedState : !prev[partName]
    }));
  }, []);

  const toggleAllParts = useCallback((visible) => {
    setVisibleParts(prev => {
      const newVisibleParts = {};
      Object.keys(prev).forEach(partName => {
        newVisibleParts[partName] = visible;
      });
      return newVisibleParts;
    });
  }, []);

  const handlePartDoubleClick = useCallback((partName) => {
    const mesh = meshes[partName];
    if (mesh) {
      if (selectedPart === mesh) {
        setSelectedPart(null);
      } else {
        setSelectedPart(mesh);
      }
    }
  }, [meshes, selectedPart]);

  const resetView = useCallback(() => {
    setSelectedPart(null);
  }, []);

  return (
    <div className="w-full h-screen relative bg-gradient-to-br from-white to-gray-100">
      {!modelUrl && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center z-10">
          <label 
            htmlFor="model-upload" 
            className="inline-block px-10 py-5 bg-red-700 text-white rounded-lg cursor-pointer hover:bg-red-800 transition-colors mb-2.5"
          >
            Upload 3D Model (GLB/GLTF)
          </label>
          <input
            id="model-upload"
            type="file"
            accept=".glb,.gltf"
            onChange={handleFileUpload}
            className="hidden"
          />
          <p className="text-gray-600 mt-2.5">
            Supported formats: GLB, GLTF
          </p>
        </div>
      )}
      {modelUrl && (
        <>
          <button
            onClick={resetView}
            className={`absolute top-2.5 left-2.5 px-4 py-2 bg-red-700 text-white rounded hover:bg-red-800 transition-colors z-10 ${
              selectedPart ? 'block' : 'hidden'
            }`}
          >
            Reset View
          </button>
          <button
            onClick={() => {
              URL.revokeObjectURL(modelUrl);
              setModelUrl(null);
            }}
            className={`absolute top-2.5 ${
              selectedPart ? 'left-[120px]' : 'left-2.5'
            } px-4 py-2 bg-red-700 text-white rounded hover:bg-red-800 transition-colors z-10`}
          >
            Load Different Model
          </button>
          <Canvas
            camera={{ 
              position: [5, 5, 5], 
              fov: 30,
              near: 0.1,
              far: 1000
            }}
            className="bg-transparent"
            gl={{ 
              antialias: true,
              alpha: true,
              powerPreference: "high-performance",
              stencil: false,
              depth: true,
              logarithmicDepthBuffer: true,
              precision: "highp"
            }}
            performance={{ min: 0.1 }}
            dpr={[1, 2]}
          >
            <color attach="background" args={['#A9A9A9']} />
            <Stage
              environment="lobby"
              shadows={false}
              adjustCamera={false}
              preset="rembrandt"
              intensity={0.2}
            >
              <Model 
                url={modelUrl}
                visibleParts={visibleParts}
                onLoad={handleModelLoad}
                onPartFound={handlePartFound}
              />
            </Stage>
            <OrbitControls
              makeDefault
              autoRotate={!selectedPart}
              autoRotateSpeed={0.5}
              enableZoom={true}
              enablePan={true}
              minPolarAngle={0}
              maxPolarAngle={Math.PI}
              minAzimuthAngle={-Infinity}
              maxAzimuthAngle={Infinity}
              enableDamping={true}
              dampingFactor={0.05}
            />
            <Environment preset="studio" />
            <CameraController target={selectedPart} />
            <AdaptiveDpr pixelated />
            <AdaptiveEvents />
            <BakeShadows />
            <Environment preset="city" />
          </Canvas>
          {Object.keys(modelParts).length > 0 && (
            <VisibilityControls
              parts={modelParts}
              visibleParts={visibleParts}
              onToggle={togglePartVisibility}
              onToggleAll={toggleAllParts}
              onPartDoubleClick={handlePartDoubleClick}
            />
          )}
        </>
      )}
    </div>
  );
} 