import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { useGLTF, OrbitControls, Environment, Stage, useAnimations, BakeShadows, AdaptiveDpr, AdaptiveEvents } from '@react-three/drei';
import * as THREE from 'three';

// Draco decoder configuration
// useGLTF.preload("/models/ss.glb");
THREE.Cache.enabled = true;

function Model({ url, visibleParts, onLoad, onPartFound }) {
  const { scene } = useGLTF(url, true); // Enable Draco compression
  const initialized = useRef(false);
  const meshRefs = useRef({});

  // Optimize materials
  useEffect(() => {
    scene.traverse((child) => {
      if (child.isMesh) {
        // Enable frustum culling
        child.frustumCulled = true;
        
        // Optimize materials and prevent z-fighting
        if (child.material) {
          child.material.side = THREE.FrontSide;
          child.material.depthWrite = true;
          child.material.depthTest = true;
          child.material.polygonOffset = true;
          child.material.polygonOffsetFactor = 1;
          child.material.polygonOffsetUnits = 1;
          child.material.needsUpdate = true;
        }

        // Optimize geometry
        if (child.geometry) {
          child.geometry.computeBoundingSphere();
          child.geometry.computeBoundingBox();
        }

        // Ensure proper rendering order
        child.renderOrder = 0;
      }
    });
  }, [scene]);

  useEffect(() => {
    if (!initialized.current) {
      const parts = {};
      
      const getFullPath = (object) => {
        const path = [];
        let current = object;
        while (current && current !== scene) {
          path.unshift(current.name || `unnamed_${current.type}`);
          current = current.parent;
        }
        return path.join(' / ');
      };

      scene.traverse((child) => {
        if (child.isMesh) {
          const fullPath = getFullPath(child);
          const name = fullPath || `Part_${Object.keys(parts).length + 1}`;
          child.name = name;
          parts[name] = true;
          meshRefs.current[name] = child;
        }
      });
      onLoad(parts);
      onPartFound(meshRefs.current);
      initialized.current = true;
    }
  }, [scene, onLoad, onPartFound]);

  // Optimize visibility updates
  useEffect(() => {
    if (visibleParts && Object.keys(visibleParts).length > 0) {
      Object.entries(meshRefs.current).forEach(([name, mesh]) => {
        if (visibleParts.hasOwnProperty(name)) {
          mesh.visible = visibleParts[name];
        }
      });
    }
  }, [visibleParts]);

  return <primitive object={scene} />;
}

// Memoize CameraController to prevent unnecessary updates
const CameraController = React.memo(({ target }) => {
  const { camera, controls } = useThree();

  useEffect(() => {
    if (controls) {
      if (target) {
        controls.autoRotate = false;

        const box = new THREE.Box3().setFromObject(target);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        const minSize = 0.1;
        const maxDim = Math.max(
          Math.max(size.x, minSize),
          Math.max(size.y, minSize),
          Math.max(size.z, minSize)
        );
        
        const fov = camera.fov * (Math.PI / 180);
        let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
        cameraZ *= 2.5;
        cameraZ = Math.max(cameraZ, maxDim * 2);

        const direction = new THREE.Vector3(1, 1, 1).normalize();
        const position = center.clone().add(direction.multiplyScalar(cameraZ));

        controls.target.copy(center);
        camera.position.copy(position);
        
        controls.minDistance = maxDim;
        controls.maxDistance = maxDim * 10;
      } else {
        // Reset to default view
        controls.autoRotate = true;
        controls.target.set(0, 0, 0);
        camera.position.set(5, 5, 5);
        controls.minDistance = 2;
        controls.maxDistance = 20;
      }
      
      controls.update();
    }
  }, [target, camera, controls]);

  return null;
});

// Memoize VisibilityControls component
const VisibilityControls = React.memo(({ parts, visibleParts, onToggle, onToggleAll, onPartDoubleClick }) => {
  const getDisplayName = useCallback((fullPath) => {
    return fullPath.split(' / ')[0];
  }, []);

  const groupedParts = useMemo(() => {
    return Object.keys(parts).reduce((acc, fullPath) => {
      const displayName = getDisplayName(fullPath);
      if (!acc[displayName]) {
        acc[displayName] = [];
      }
      acc[displayName].push(fullPath);
      return acc;
    }, {});
  }, [parts, getDisplayName]);

  return (
    <div style={{
      position: 'absolute',
      top: 10,
      right: 10,
      background: 'white',
      padding: '10px',
      borderRadius: '5px',
      boxShadow: '0 0 10px rgba(0,0,0,0.1)',
      maxHeight: '80vh',
      overflowY: 'auto',
      minWidth: '300px'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        marginBottom: '15px',
        gap: '10px'
      }}>
        <h3>Model Parts</h3>
        <div style={{ display: 'flex', gap: '5px' }}>
          <button
            onClick={() => onToggleAll(true)}
            style={{
              padding: '4px 8px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer'
            }}
          >
            Show All
          </button>
          <button
            onClick={() => onToggleAll(false)}
            style={{
              padding: '4px 8px',
              backgroundColor: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer'
            }}
          >
            Hide All
          </button>
        </div>
      </div>
      {Object.keys(groupedParts).sort().map((displayName) => {
        const paths = groupedParts[displayName];
        const allVisible = paths.every(path => visibleParts[path]);
        const anyVisible = paths.some(path => visibleParts[path]);

        return (
          <div 
            key={displayName} 
            style={{ 
              marginBottom: '5px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '5px',
              cursor: 'pointer'
            }}
            onDoubleClick={() => onPartDoubleClick(paths[0])}
          >
            <input
              type="checkbox"
              checked={allVisible}
              ref={input => {
                if (input) {
                  input.indeterminate = anyVisible && !allVisible;
                }
              }}
              onChange={() => {
                paths.forEach(path => onToggle(path, !allVisible));
              }}
              style={{ marginTop: '4px' }}
            />
            <label style={{ 
              wordBreak: 'break-word',  
              fontSize: '14px',
              lineHeight: '1.4',
              cursor: 'pointer'
            }}>
              {displayName}
            </label>
          </div>
        );
      })}
    </div>
  );
});

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
        setSelectedPart(null); // Reset if clicking the same part
      } else {
        setSelectedPart(mesh);
      }
    }
  }, [meshes, selectedPart]);

  const resetView = useCallback(() => {
    setSelectedPart(null);
  }, []);

  return (
    <div style={{ 
      width: '100%', 
      height: '100vh', 
      position: 'relative',
      background: 'linear-gradient(145deg, #ffffff 0%, #f5f5f5 100%)'
    }}>
      {!modelUrl && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          zIndex: 1000
        }}>
          <label htmlFor="model-upload" style={{
            padding: '20px 40px',
            backgroundColor: '#4CAF50',
            color: 'white',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'inline-block',
            marginBottom: '10px'
          }}>
            Upload 3D Model (GLB/GLTF)
          </label>
          <input
            id="model-upload"
            type="file"
            accept=".glb,.gltf"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
          <p style={{ color: '#666', marginTop: '10px' }}>
            Supported formats: GLB, GLTF
          </p>
        </div>
      )}
      {modelUrl && (
        <>
          <button
            onClick={resetView}
            style={{
              position: 'absolute',
              top: '10px',
              left: '10px',
              padding: '8px 16px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              zIndex: 1000,
              display: selectedPart ? 'block' : 'none'
            }}
          >
            Reset View
          </button>
          <button
            onClick={() => {
              URL.revokeObjectURL(modelUrl);
              setModelUrl(null);
            }}
            style={{
              position: 'absolute',
              top: '10px',
              left: selectedPart ? '120px' : '10px',
              padding: '8px 16px',
              backgroundColor: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              zIndex: 1000
            }}
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
            style={{ background: 'transparent' }}
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
