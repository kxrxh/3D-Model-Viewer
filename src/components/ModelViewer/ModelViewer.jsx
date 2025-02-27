import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Stage, BakeShadows, AdaptiveDpr, AdaptiveEvents } from '@react-three/drei';
import * as THREE from 'three';

import Model from './Model';
import CameraController from './CameraController';
import VisibilityControls from './VisibilityControls';
import LoadingSpinner from './LoadingSpinner';

// Enable Three.js caching
THREE.Cache.enabled = true;

export default function ModelViewer() {
  const [modelParts, setModelParts] = useState({});
  const [visibleParts, setVisibleParts] = useState({});
  const [meshes, setMeshes] = useState({});
  const [selectedPart, setSelectedPart] = useState(null);
  const [modelUrl, setModelUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const isInitialized = useRef(false);

  const handleFileUpload = useCallback((event) => {
    const file = event.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setModelUrl(url);
      setIsLoading(true);
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
      setIsLoading(false);
    }
  }, []);

  const handlePartFound = useCallback((meshRefs) => {
    setMeshes(meshRefs);

    // Helper function to create nested structure from path
    const createNestedStructure = (path, object) => {
      const parts = path.split(' / ');

      // Helper function to build the tree recursively
      const buildLevel = (nameParts, currentObject, depth = 0) => {
        const currentName = nameParts[depth];
        const isLastLevel = depth === nameParts.length - 1;

        const node = {
          name: currentName,
          children: []
        };

        // If there are more levels, recurse
        if (depth < nameParts.length - 1) {
          node.children.push(buildLevel(nameParts, currentObject, depth + 1));
        }

        return node;
      };

      return buildLevel(parts, object);
    };

    // Create a hierarchical structure
    const hierarchy = { children: [] };
    Object.entries(meshRefs).forEach(([path, mesh]) => {
      if (!mesh.isMesh) {
        const structure = createNestedStructure(path, mesh);

        // Helper function to merge nodes
        const mergeNodes = (source, targetArray) => {
          const existing = targetArray.find(node => node.name === source.name);
          if (existing) {
            // Merge children recursively
            source.children.forEach(child => {
              mergeNodes(child, existing.children);
            });
          } else {
            targetArray.push(source);
          }
        };

        mergeNodes(structure, hierarchy.children);
      }
    });
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
    console.log(`Double-clicked part: ${partName}`);
    const mesh = meshes[partName];
    if (mesh && visibleParts[partName]) {
      console.log(`Selected part details:`, mesh);
      if (selectedPart === mesh) {
        setSelectedPart(null);
      } else {
        setSelectedPart(mesh);
      }
    }
  }, [meshes, selectedPart, visibleParts]);

  const resetView = useCallback(() => {
    setSelectedPart(null);
  }, []);

  const exportPartStructure = useCallback(() => {
    // Create a hierarchical structure of the model parts
    const structure = {};
    Object.entries(meshes).forEach(([path, mesh]) => {
      if (!mesh.isMesh) {
        const parts = path.split(' / ');
        let current = structure;
        parts.forEach((part, index) => {
          if (!current[part]) {
            current[part] = {
              name: part,
              visible: visibleParts[path],
              children: {},
            };
          }
          current = current[part].children;
        });
      }
    });

    // Convert to JSON and download
    const dataStr = JSON.stringify(structure, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'part-structure.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [meshes, visibleParts]);

  return (
    <div className="w-full h-screen relative bg-gradient-to-br from-white to-gray-100">
      {!modelUrl && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center z-10">
          <label
            htmlFor="model-upload"
            className="inline-block px-10 py-5 bg-red-700 text-white rounded-lg cursor-pointer hover:bg-red-800 transition-colors mb-2.5"
          >
            Загрузить 3D модель (GLB/GLTF)
          </label>
          <input
            id="model-upload"
            type="file"
            accept=".glb,.gltf"
            onChange={handleFileUpload}
            className="hidden"
          />
          <p className="text-gray-600 mt-2.5">
            Поддерживаемые форматы: GLB, GLTF
          </p>
        </div>
      )}
      {modelUrl && (
        <>
          {isLoading && <LoadingSpinner />}
          <div className="absolute top-2.5 left-2.5 flex gap-2.5 z-10">
            {selectedPart && (
              <button
                onClick={resetView}
                className="px-6 py-2 bg-red-700 text-white rounded hover:bg-red-800 transition-colors whitespace-nowrap"
              >
                Сбросить вид
              </button>
            )}
          </div>
          <button
            onClick={() => {
              URL.revokeObjectURL(modelUrl);
              setModelUrl(null);
            }}
            className="absolute bottom-2.5 left-2.5 px-6 py-2 bg-red-700 text-white rounded hover:bg-red-800 transition-colors z-10 whitespace-nowrap"
          >
            Загрузить другую модель
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
              alpha: true,
              powerPreference: "high-performance",
              stencil: false,
              depth: true,
              antialias: false,
              precision: "mediump"
            }}
          >
            <color attach="background" args={['#A9A9A9']} />
            <Stage
              adjustCamera={false}
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
            <Environment preset="city" />
            <CameraController target={selectedPart} />
            <AdaptiveDpr pixelated />
            <AdaptiveEvents />
            <BakeShadows />
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