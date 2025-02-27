import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Stage, BakeShadows, AdaptiveDpr, AdaptiveEvents } from '@react-three/drei';
import { Bloom } from '@react-three/postprocessing';
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

  // Add glow effect to selected part (updated to handle the "Default" material)
  useEffect(() => {
    if (selectedPart) {
      console.log('Selected part for glow:', selectedPart);
      console.log('Selected part type:', {
        isMesh: selectedPart.isMesh,
        isGroup: selectedPart.isGroup,
        isObject3D: selectedPart.isObject3D,
      });
      console.log('Selected part material:', selectedPart.material);
      console.log('Selected part geometry:', selectedPart.geometry);

      const originalMaterials = [];

      const applyGlow = (object) => {
        if (object.isMesh) {
          let originalMaterial = object.material;

          // Log the original material name for debugging
          console.log(`Original material for ${object.name || 'Unnamed'}:`, originalMaterial?.name || 'No name');

          // Handle missing or invalid materials (including "Default")
          if (!originalMaterial || originalMaterial === null || originalMaterial === undefined) {
            console.log(`Mesh ${object.name || 'Unnamed'} has no material, applying default`);
            originalMaterial = new THREE.MeshStandardMaterial({ color: 0xF3F });
            object.material = originalMaterial;
          }

          const glowMaterial = originalMaterial.clone();
          // Ensure the material supports emissive properties
          if (glowMaterial.isMeshStandardMaterial || glowMaterial.isMeshPhysicalMaterial) {
            console.log(`Applying glow to standard/physical material for ${object.name || 'Unnamed'}`);
            glowMaterial.emissive = new THREE.Color(0xF3F); // Bright white for maximum visibility
            glowMaterial.emissiveIntensity = 10; // High intensity
            glowMaterial.transparent = false; // Force opaque
            glowMaterial.opacity = 1; // Ensure full opacity
            // Disable any textures or maps that might interfere with emissive
            glowMaterial.map = null;
            glowMaterial.alphaMap = null;
            glowMaterial.envMap = null;
          } else if (glowMaterial.isMeshBasicMaterial) {
            console.log(`Applying glow to basic material for ${object.name || 'Unnamed'}`);
            glowMaterial.color = new THREE.Color(0xF3F); // Bright white
            glowMaterial.emissive = new THREE.Color(0xF3F);
            glowMaterial.emissiveIntensity = 10;
            glowMaterial.transparent = false;
            glowMaterial.opacity = 1;
          } else {
            console.log(`Fallback material for ${object.name || 'Unnamed'}: Converting to MeshStandardMaterial`);
            // Fallback for other material types (e.g., "Default" or custom materials)
            glowMaterial = new THREE.MeshStandardMaterial({
              color: 0xF3F,
              emissive: 0xF3F,
              emissiveIntensity: 10,
              transparent: false,
              opacity: 1,
            });
          }

          object.material = glowMaterial;
          originalMaterials.push({ object, originalMaterial });
        } else if (object.isGroup || object.isObject3D) {
          object.children.forEach(child => applyGlow(child));
        }
      };

      applyGlow(selectedPart);

      return () => {
        console.log('Cleaning up glow effect, restoring original materials');
        originalMaterials.forEach(({ object, originalMaterial }) => {
          object.material = originalMaterial;
        });
      };
    } else {
      console.log('No part selected for glow');
    }
  }, [selectedPart]);

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
          <button
            onClick={resetView}
            className={`absolute top-2.5 left-2.5 px-6 py-2 bg-red-700 text-white rounded hover:bg-red-800 transition-colors z-10 whitespace-nowrap ${selectedPart ? 'block' : 'hidden'
              }`}
          >
            Сбросить вид
          </button>
          <button
            onClick={() => {
              URL.revokeObjectURL(modelUrl);
              setModelUrl(null);
            }}
            className={`absolute bottom-2.5 left-2.5 px-6 py-2 bg-red-700 text-white rounded hover:bg-red-800 transition-colors z-10 whitespace-nowrap`}
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
              antialias: true,
              alpha: true,
              powerPreference: "high-performance",
              stencil: false,
              depth: true,
              logarithmicDepthBuffer: true,
              precision: "mediump"
            }}
            performance={{ min: 0.1 }}
            dpr={[1, 2]}
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
            <Bloom
              luminanceThreshold={0.0} // Lower to capture all emissive light
              luminanceSmoothing={0.025}
              intensity={1.5}
              height={300}
            />
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