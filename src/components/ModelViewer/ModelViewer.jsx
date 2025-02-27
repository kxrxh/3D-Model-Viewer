import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Stage, BakeShadows, AdaptiveDpr, AdaptiveEvents } from '@react-three/drei';
import * as THREE from 'three';
import Model from './Model';
import LoadingSpinner from '../LoadingSpinner';
import AssemblyStateManager from './AssemblyStateManager';
import PartFocusController from './PartFocusController';

// Enable Three.js caching
THREE.Cache.enabled = true;

export default function ModelViewer() {
  const [modelParts, setModelParts] = useState({});
  const [visibleParts, setVisibleParts] = useState({});
  const [meshes, setMeshes] = useState({});
  const [selectedParts, setSelectedParts] = useState([]);
  const [modelUrl, setModelUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [assemblyStates, setAssemblyStates] = useState([]);
  const [currentStateIndex, setCurrentStateIndex] = useState(-1);
  const [viewMode, setViewMode] = useState('cumulative');
  const isInitialized = useRef(false);
  const controlsRef = useRef();

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
      setSelectedParts([]);
      setAssemblyStates([]);
      setCurrentStateIndex(-1);
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
      Object.keys(prev).forEach(part => {
        newVisibleParts[part] = visible;
      });
      return newVisibleParts;
    });
  }, []);

  const handlePartDoubleClick = useCallback((partName, e = {}) => {
    const mesh = meshes[partName];
    if (!mesh || !visibleParts[partName]) return;
    const isMultiSelect = e.ctrlKey || e.metaKey || e.shiftKey;
    if (isMultiSelect) {
      setSelectedParts(prev => 
        prev.some(part => part === mesh) 
          ? prev.filter(part => part !== mesh) 
          : [...prev, mesh]
      );
    } else {
      setSelectedParts([mesh]);
    }
  }, [meshes, visibleParts]);

  const resetView = useCallback(() => {
    setSelectedParts([]);
    setCurrentStateIndex(-1);
    if (controlsRef.current) {
      controlsRef.current.object.position.set(5, 5, 5);
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.reset();
      controlsRef.current.update();
    }
  }, []);

  const getVisibleParts = useCallback(() => {
    const visible = {};
    if (currentStateIndex >= 0) {
      if (viewMode === 'cumulative') {
        for (let i = 0; i <= currentStateIndex; i++) {
          assemblyStates[i].parts.forEach(part => {
            visible[part] = true;
          });
        }
      } else if (viewMode === 'isolated') {
        assemblyStates[currentStateIndex].parts.forEach(part => {
          visible[part] = true;
        });
      }
    } else {
      Object.keys(modelParts).forEach(part => {
        visible[part] = true;
      });
    }
    Object.keys(modelParts).forEach(part => {
      if (!(part in visible)) visible[part] = false;
    });
    return visible;
  }, [assemblyStates, currentStateIndex, viewMode, modelParts]);

  const computedVisibleParts = useMemo(() => getVisibleParts(), [getVisibleParts]);

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
          <p className="text-gray-600 mt-2.5">Поддерживаемые форматы: GLB, GLTF</p>
        </div>
      )}
      {modelUrl && (
        <>
          {isLoading && <LoadingSpinner text={"Загрузка модели..."} />}
          <div className="absolute top-2.5 left-2.5 flex gap-2.5 z-10">
            {(selectedParts.length > 0 || currentStateIndex >= 0) && (
              <button
                onClick={resetView}
                className="px-6 py-2 bg-red-700 text-white rounded hover:bg-red-800 transition-colors whitespace-nowrap"
              >
                Сбросить вид
              </button>
            )}
          </div>
          <div className="absolute top-2.5 right-2.5 flex flex-col gap-2 bg-white/90 backdrop-blur-sm rounded-lg p-1.5 shadow-lg z-10 w-80">
          <div className="gap-2 w-full text-center">
              Режим отображения
            </div>
            <div className="flex gap-1 bg-gray-100 rounded-md p-1">
              <label className="relative">
                <input
                  type="radio"
                  value="cumulative"
                  checked={viewMode === 'cumulative'}
                  onChange={() => setViewMode('cumulative')}
                  className="sr-only peer"
                />
                <span className="px-3 py-1.5 rounded cursor-pointer text-sm font-medium block transition-all duration-200 peer-checked:bg-red-700 peer-checked:text-white hover:bg-gray-200 peer-checked:hover:bg-red-800">
                  Последовательный
                </span>
              </label>
              <label className="relative">
                <input
                  type="radio"
                  value="isolated"
                  checked={viewMode === 'isolated'}
                  onChange={() => setViewMode('isolated')}
                  className="sr-only peer"
                />
                <span className="px-3 py-1.5 rounded cursor-pointer text-sm font-medium block transition-all duration-200 peer-checked:bg-red-700 peer-checked:text-white hover:bg-gray-200 peer-checked:hover:bg-red-800">
                  Изолированный
                </span>
              </label>
            </div>
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
            camera={{ position: [5, 5, 5], fov: 30, near: 0.1, far: 1000 }}
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
            <Stage adjustCamera={false} intensity={0.2}>
              <Model
                url={modelUrl}
                visibleParts={computedVisibleParts}
                onLoad={handleModelLoad}
                onPartFound={handlePartFound}
              />
            </Stage>
            <OrbitControls
              ref={controlsRef}
              makeDefault
              autoRotate={selectedParts.length === 0 && currentStateIndex < 0}
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
            <PartFocusController selectedParts={selectedParts} controls={controlsRef} />
            <AdaptiveDpr pixelated />
            <AdaptiveEvents />
            <BakeShadows />
          </Canvas>
          {Object.keys(modelParts).length > 0 && (
            <AssemblyStateManager
              assemblyStates={assemblyStates}
              setAssemblyStates={setAssemblyStates}
              modelParts={modelParts}
              onStateSelect={setCurrentStateIndex}
            />
          )}
        </>
      )}
    </div>
  );
}