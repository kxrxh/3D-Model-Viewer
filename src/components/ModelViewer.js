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

// Add this new component before VisibilityControls
const GroupManager = React.memo(({ groups, onAddGroup, onDeleteGroup, onEditGroup, onSaveGroups, onLoadGroups }) => {
  const [newGroupName, setNewGroupName] = useState('');
  const fileInputRef = useRef();

  const handleExport = () => {
    const dataStr = JSON.stringify(groups, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'model-groups.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedGroups = JSON.parse(e.target.result);
          onLoadGroups(importedGroups);
        } catch (error) {
          console.error('Error parsing groups file:', error);
          alert('Invalid groups file format');
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div style={{
      marginBottom: '15px',
      padding: '15px',
      border: '1px solid #e0e0e0',
      borderRadius: '8px',
      backgroundColor: '#f8f9fa'
    }}>
      <div style={{ marginBottom: '12px', display: 'flex', gap: '8px' }}>
        <input
          type="text"
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
          placeholder="New group name"
          style={{
            flex: 1,
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid #ddd',
            fontSize: '14px',
            outline: 'none',
            transition: 'border-color 0.2s',
            ':focus': {
              borderColor: '#2196F3'
            }
          }}
        />
        <button
          onClick={() => {
            if (newGroupName.trim()) {
              onAddGroup(newGroupName.trim());
              setNewGroupName('');
            }
          }}
          style={{
            padding: '8px 16px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            transition: 'background-color 0.2s',
            ':hover': {
              backgroundColor: '#45a049'
            }
          }}
        >
          Add Group
        </button>
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={handleExport}
          style={{
            flex: 1,
            padding: '8px 16px',
            backgroundColor: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            transition: 'background-color 0.2s',
            ':hover': {
              backgroundColor: '#1976D2'
            }
          }}
        >
          Export Groups
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          style={{
            flex: 1,
            padding: '8px 16px',
            backgroundColor: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            transition: 'background-color 0.2s',
            ':hover': {
              backgroundColor: '#1976D2'
            }
          }}
        >
          Import Groups
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImport}
          style={{ display: 'none' }}
        />
      </div>
    </div>
  );
});

// Update VisibilityControls component
const VisibilityControls = React.memo(({ parts, visibleParts, onToggle, onToggleAll, onPartDoubleClick }) => {
  const [groups, setGroups] = useState({});
  const [editingGroup, setEditingGroup] = useState(null);
  const [draggedPart, setDraggedPart] = useState(null);
  const [hoveredGroup, setHoveredGroup] = useState(null);

  const getDisplayName = useCallback((fullPath) => {
    return fullPath.split(' / ')[0];
  }, []);

  const groupedParts = useMemo(() => {
    const ungroupedParts = {};
    Object.keys(parts).forEach(fullPath => {
      let isGrouped = false;
      Object.values(groups).forEach(group => {
        if (group.parts.includes(fullPath)) {
          isGrouped = true;
        }
      });
      if (!isGrouped) {
        const displayName = getDisplayName(fullPath);
        if (!ungroupedParts[displayName]) {
          ungroupedParts[displayName] = [];
        }
        ungroupedParts[displayName].push(fullPath);
      }
    });
    return ungroupedParts;
  }, [parts, groups, getDisplayName]);

  const handleAddGroup = (name) => {
    setGroups(prev => ({
      ...prev,
      [name]: { name, parts: [] }
    }));
  };

  const handleDeleteGroup = (groupName) => {
    setGroups(prev => {
      const { [groupName]: deleted, ...rest } = prev;
      return rest;
    });
  };

  const handlePartDragStart = (e, part) => {
    setDraggedPart(part);
  };

  const handleGroupDragOver = (e, groupName) => {
    e.preventDefault();
  };

  const handleGroupDrop = (e, groupName) => {
    e.preventDefault();
    if (draggedPart) {
      setGroups(prev => ({
        ...prev,
        [groupName]: {
          ...prev[groupName],
          parts: [...prev[groupName].parts, draggedPart]
        }
      }));
      setDraggedPart(null);
    }
  };

  const handleRemoveFromGroup = (groupName, part) => {
    setGroups(prev => ({
      ...prev,
      [groupName]: {
        ...prev[groupName],
        parts: prev[groupName].parts.filter(p => p !== part)
      }
    }));
  };

  const handleToggleGroup = useCallback((groupName, forcedState) => {
    const group = groups[groupName];
    if (group) {
      group.parts.forEach(part => {
        onToggle(part, forcedState !== undefined ? forcedState : !visibleParts[part]);
      });
    }
  }, [groups, onToggle, visibleParts]);

  const isGroupVisible = useCallback((group) => {
    return group.parts.every(part => visibleParts[part]);
  }, [visibleParts]);

  const isGroupPartiallyVisible = useCallback((group) => {
    return group.parts.some(part => visibleParts[part]);
  }, [visibleParts]);

  return (
    <div style={{
      position: 'absolute',
      top: 10,
      right: 10,
      background: 'white',
      padding: '20px',
      borderRadius: '12px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
      maxHeight: '80vh',
      overflowY: 'auto',
      minWidth: '320px'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        marginBottom: '20px',
        gap: '10px',
        borderBottom: '1px solid #eee',
        paddingBottom: '15px'
      }}>
        <h3 style={{ margin: 0, color: '#333', fontSize: '18px' }}>Model Parts</h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => onToggleAll(true)}
            style={{
              padding: '6px 12px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '500',
              transition: 'background-color 0.2s'
            }}
          >
            Show All
          </button>
          <button
            onClick={() => onToggleAll(false)}
            style={{
              padding: '6px 12px',
              backgroundColor: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '500',
              transition: 'background-color 0.2s'
            }}
          >
            Hide All
          </button>
        </div>
      </div>

      <GroupManager
        groups={groups}
        onAddGroup={handleAddGroup}
        onDeleteGroup={handleDeleteGroup}
        onEditGroup={(name, newName) => {
          setGroups(prev => {
            const { [name]: group, ...rest } = prev;
            return { ...rest, [newName]: { ...group, name: newName } };
          });
        }}
        onSaveGroups={() => {}}
        onLoadGroups={setGroups}
      />

      {/* Groups Section */}
      {Object.entries(groups).map(([groupName, group]) => (
        <div
          key={groupName}
          style={{
            marginBottom: '12px',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            padding: '12px',
            backgroundColor: hoveredGroup === groupName ? '#f8f9fa' : 'white',
            transition: 'background-color 0.2s'
          }}
          onDragOver={(e) => handleGroupDragOver(e, groupName)}
          onDrop={(e) => handleGroupDrop(e, groupName)}
          onMouseEnter={() => setHoveredGroup(groupName)}
          onMouseLeave={() => setHoveredGroup(null)}
        >
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '8px' 
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                checked={isGroupVisible(group)}
                ref={input => {
                  if (input) {
                    input.indeterminate = isGroupPartiallyVisible(group) && !isGroupVisible(group);
                  }
                }}
                onChange={() => handleToggleGroup(groupName)}
                style={{ 
                  width: '16px', 
                  height: '16px',
                  cursor: 'pointer'
                }}
              />
              {editingGroup === groupName ? (
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => {
                    const newName = e.target.value;
                    if (newName && newName !== groupName) {
                      setGroups(prev => {
                        const { [groupName]: group, ...rest } = prev;
                        return { ...rest, [newName]: { ...group, name: newName } };
                      });
                    }
                  }}
                  onBlur={() => setEditingGroup(null)}
                  autoFocus
                  style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    border: '1px solid #ddd',
                    fontSize: '14px'
                  }}
                />
              ) : (
                <h4 
                  style={{ 
                    margin: 0, 
                    fontSize: '15px',
                    fontWeight: '500',
                    color: '#333',
                    cursor: 'pointer'
                  }} 
                  onDoubleClick={() => setEditingGroup(groupName)}
                >
                  {groupName}
                </h4>
              )}
            </div>
            <button
              onClick={() => handleDeleteGroup(groupName)}
              style={{
                padding: '4px 8px',
                backgroundColor: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                opacity: hoveredGroup === groupName ? 1 : 0.7,
                transition: 'opacity 0.2s'
              }}
            >
              Delete
            </button>
          </div>
          <div style={{ marginLeft: '24px' }}>
            {group.parts.map(part => (
              <div
                key={part}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '4px',
                  padding: '4px',
                  borderRadius: '4px',
                  ':hover': {
                    backgroundColor: '#f5f5f5'
                  }
                }}
              >
                <input
                  type="checkbox"
                  checked={visibleParts[part]}
                  onChange={() => onToggle(part)}
                  style={{ 
                    marginRight: '8px',
                    cursor: 'pointer'
                  }}
                />
                <span
                  style={{
                    flex: 1,
                    fontSize: '14px',
                    color: '#555',
                    cursor: 'pointer'
                  }}
                  onDoubleClick={() => onPartDoubleClick(part)}
                >
                  {getDisplayName(part)}
                </span>
                <button
                  onClick={() => handleRemoveFromGroup(groupName, part)}
                  style={{
                    padding: '2px 6px',
                    backgroundColor: 'transparent',
                    color: '#f44336',
                    border: '1px solid #f44336',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    opacity: 0.7,
                    ':hover': {
                      opacity: 1,
                      backgroundColor: '#fee'
                    }
                  }}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Ungrouped Parts Section */}
      <div style={{ 
        marginTop: '20px',
        padding: '15px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        border: '1px solid #e0e0e0'
      }}>
        <h4 style={{ 
          marginBottom: '12px',
          color: '#666',
          fontSize: '15px',
          fontWeight: '500'
        }}>
          Ungrouped Parts
        </h4>
        {Object.keys(groupedParts).sort().map((displayName) => {
          const paths = groupedParts[displayName];
          const allVisible = paths.every(path => visibleParts[path]);
          const anyVisible = paths.some(path => visibleParts[path]);

          return (
            <div 
              key={displayName} 
              style={{ 
                marginBottom: '4px',
                display: 'flex',
                alignItems: 'center',
                padding: '6px',
                borderRadius: '4px',
                cursor: 'grab',
                ':hover': {
                  backgroundColor: '#fff'
                }
              }}
              draggable
              onDragStart={(e) => handlePartDragStart(e, paths[0])}
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
                style={{ 
                  marginRight: '8px',
                  cursor: 'pointer'
                }}
              />
              <label style={{ 
                flex: 1,
                fontSize: '14px',
                color: '#555',
                cursor: 'pointer'
              }}>
                {displayName}
              </label>
            </div>
          );
        })}
      </div>
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
