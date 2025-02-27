import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, Stage, BakeShadows, AdaptiveDpr, AdaptiveEvents } from '@react-three/drei';
import * as THREE from 'three';

import Model from './Model';
import VisibilityControls from './VisibilityControls';
import LoadingSpinner from '../LoadingSpinner';

// Enable Three.js caching
THREE.Cache.enabled = true;

// New component to handle camera focus
function PartFocusController({ selectedPart, controls }) {
  const { camera } = useThree();

  useEffect(() => {
    if (selectedPart && controls.current) {
      // Compute the bounding box of the selected part
      const box = new THREE.Box3().setFromObject(selectedPart);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      
      // Set the OrbitControls target to the center of the part
      controls.current.target.copy(center);

      // Adjust camera distance to frame the part
      const maxDim = Math.max(size.x, size.y, size.z);
      const fov = camera.fov * (Math.PI / 180); // Convert FOV to radians
      const cameraDistance = maxDim / 2 / Math.tan(fov / 2) * 1.5; // Add padding with *1.5

      // Maintain current camera direction but adjust distance
      const direction = new THREE.Vector3()
        .subVectors(camera.position, controls.current.target)
        .normalize();
      const newPosition = center.clone().add(direction.multiplyScalar(cameraDistance));
      
      camera.position.copy(newPosition);
      controls.current.update();
    }
  }, [selectedPart, camera, controls]);

  return null;
}

export default function ModelViewer() {
  const [modelParts, setModelParts] = useState({});
  const [visibleParts, setVisibleParts] = useState({});
  const [meshes, setMeshes] = useState({});
  const [selectedPart, setSelectedPart] = useState(null);
  const [modelUrl, setModelUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const isInitialized = useRef(false);
  const controlsRef = useRef(); // Ref for OrbitControls

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
    // ... (rest of handlePartFound remains unchanged)
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
    console.log(`Available mesh keys:`, Object.keys(meshes)); // Add this line
    const mesh = meshes[partName];
    
    if (!mesh) {
      console.warn(`No mesh found for part: ${partName}`);
      return;
    }

    if (!visibleParts[partName]) {
      console.warn(`Part is not visible: ${partName}`);
      return;
    }

    console.log(`Found mesh for part: `, mesh);
    
    let targetObject = mesh;
    let foundMesh = false;

    if (!mesh.isMesh) {
      console.log(`Object is not a mesh, searching children...`);
      mesh.traverse((child) => {
        if (!foundMesh && child.isMesh) {
          console.log(`Found child mesh:`, child);
          targetObject = child;
          foundMesh = true;
        }
      });
    } else {
      console.log(`Object is a mesh, using directly`);
      foundMesh = true;
    }

    if (!foundMesh) {
      console.warn(`No suitable mesh found to focus on in part: ${partName}`);
      return;
    }

    console.log(`Setting selected part to:`, targetObject);
    if (selectedPart === targetObject) {
      console.log(`Deselecting current part`);
      setSelectedPart(null);
    } else {
      setSelectedPart(targetObject);
    }
  }, [meshes, selectedPart, visibleParts]);

  const resetView = useCallback(() => {
    setSelectedPart(null);
  }, []);

  const exportPartStructure = useCallback(() => {
    // ... (exportPartStructure remains unchanged)
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
          {isLoading && <LoadingSpinner text={"Загрузка модели..."} />}
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
              ref={controlsRef} // Add ref here
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
            <PartFocusController selectedPart={selectedPart} controls={controlsRef} />
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