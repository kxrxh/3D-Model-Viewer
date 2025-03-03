import React, { useRef, useState, useCallback, useEffect, useMemo, Suspense, lazy } from 'react';
import { Canvas } from '@react-three/fiber';
import { 
  OrbitControls, Environment, Stage, BakeShadows, 
  AdaptiveDpr, AdaptiveEvents, Stats, 
  PerformanceMonitor
} from '@react-three/drei';
import * as THREE from 'three';
import LoadingSpinner from '../common/LoadingSpinner';

// Lazy load components to reduce initial bundle size
const Model = lazy(() => import('./core/Model'));
const AssemblyStateManager = lazy(() => import('./controls/AssemblyStateManager'));
const PartFocusController = lazy(() => import('./controls/PartFocusController'));

// Performance settings
THREE.Cache.enabled = true;
const DEFAULT_CAMERA_POSITION = [5, 5, 5];
const DEFAULT_CAMERA_TARGET = [0, 0, 0];
const MIN_DPR = 1;
const MAX_DPR = window.devicePixelRatio || 2;

// Performance profiles for different rendering quality
const PERFORMANCE_PROFILES = {
  high: {
    name: 'Высокое качество',
    dpr: Math.min(2.5, window.devicePixelRatio || 1.5),
    shadows: true,
    shadowMapSize: 2048,
    antialias: true,
    physicallyCorrectLights: true,
    environment: 'city',
    gl: {
      powerPreference: "high-performance",
      precision: "highp",
      antialias: true,
      alpha: true
    }
  },
  medium: {
    name: 'Среднее качество',
    dpr: Math.min(1.25, window.devicePixelRatio || 1),
    shadows: true,
    shadowMapSize: 1024,
    antialias: true,
    physicallyCorrectLights: true,
    environment: 'city',
    gl: {
      powerPreference: "high-performance",
      precision: "mediump",
      antialias: true
    }
  },
  low: {
    name: 'Низкое качество',
    dpr: 0.75,
    shadows: false,
    antialias: false,
    physicallyCorrectLights: false,
    environment: 'city',
    pixelRatio: 0.75,
    gl: {
      powerPreference: "low-power",
      precision: "lowp",
      antialias: false,
      depth: false,
      stencil: false
    }
  },
  auto: {
    name: 'Автоматически',
    adaptiveDpr: true,
    adaptivePerformance: true,
    dpr: window.devicePixelRatio > 2 ? 1.5 : (window.devicePixelRatio > 1 ? window.devicePixelRatio : 1),
    shadows: navigator.hardwareConcurrency > 4,
    shadowMapSize: navigator.hardwareConcurrency > 6 ? 1024 : 512,
    antialias: navigator.deviceMemory > 4 || navigator.hardwareConcurrency > 4,
    physicallyCorrectLights: navigator.hardwareConcurrency > 2,
    environment: 'city',
    regress: true,
    gl: {
      powerPreference: "high-performance",
      precision: navigator.hardwareConcurrency > 4 ? "highp" : "mediump",
      antialias: navigator.deviceMemory > 4 || navigator.hardwareConcurrency > 4,
      failIfMajorPerformanceCaveat: false
    }
  }
};

// Custom hooks for better state management
function useModelState() {
  const [modelParts, setModelParts] = useState({});
  const [visibleParts, setVisibleParts] = useState({});
  const [meshes, setMeshes] = useState({});
  const [selectedParts, setSelectedParts] = useState([]);
  const [modelUrl, setModelUrl] = useState(null);
  const isInitialized = useRef(false);

  const resetModelState = useCallback(() => {
    isInitialized.current = false;
    setModelParts({});
    setVisibleParts({});
    setMeshes({});
    setSelectedParts([]);
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
      Object.keys(prev).forEach(part => {
        newVisibleParts[part] = visible;
      });
      return newVisibleParts;
    });
  }, []);

  const handlePartSelection = useCallback((partName, e = {}) => {
    const mesh = meshes[partName];
    if (!mesh || !visibleParts[partName]) return;
    
    const isMultiSelect = e.ctrlKey || e.metaKey || e.shiftKey;
    
    setSelectedParts(prev => 
      isMultiSelect
        ? prev.some(part => part === mesh) 
          ? prev.filter(part => part !== mesh) 
          : [...prev, mesh]
        : [mesh]
    );
  }, [meshes, visibleParts]);

  return {
    modelParts,
    visibleParts,
    setVisibleParts,
    meshes, 
    selectedParts,
    setSelectedParts,
    modelUrl,
    setModelUrl,
    isInitialized,
    resetModelState,
    handleModelLoad,
    handlePartFound,
    togglePartVisibility,
    toggleAllParts,
    handlePartSelection
  };
}

function useAssemblyState() {
  const [assemblyStates, setAssemblyStates] = useState([]);
  const [currentStateIndex, setCurrentStateIndex] = useState(-1);
  const [viewMode, setViewMode] = useState('cumulative');

  const resetAssemblyState = useCallback(() => {
    setAssemblyStates([]);
    setCurrentStateIndex(-1);
  }, []);

  const handleAddState = useCallback(() => {
    setAssemblyStates(prev => [...prev, { name: `Сборка ${prev.length + 1}`, parts: [], description: '' }]);
  }, []);

  return {
    assemblyStates,
    setAssemblyStates,
    currentStateIndex,
    setCurrentStateIndex,
    viewMode,
    setViewMode,
    resetAssemblyState,
    handleAddState
  };
}

function usePerformanceProfiles() {
  const [activeProfile, setActiveProfile] = useState('auto');
  const [dpr, setDpr] = useState(PERFORMANCE_PROFILES.auto.dpr);
  const [adaptiveDprEnabled, setAdaptiveDprEnabled] = useState(true);

  const handleProfileChange = useCallback((profileKey) => {
    setActiveProfile(profileKey);
    const profile = PERFORMANCE_PROFILES[profileKey];
    setDpr(profile.dpr);
    setAdaptiveDprEnabled(profileKey === 'auto');
  }, []);

  const handlePerformanceChange = useCallback((isIncline) => {
    if (activeProfile !== 'auto') return;
    setDpr(prev => isIncline 
      ? Math.min(prev + 0.5, MAX_DPR) 
      : Math.max(prev - 0.5, MIN_DPR)
    );
  }, [activeProfile]);

  return {
    profiles: PERFORMANCE_PROFILES,
    activeProfile,
    setActiveProfile: handleProfileChange,
    dpr,
    setDpr,
    adaptiveDprEnabled,
    handlePerformanceChange
  };
}

// UI Components
const ViewModeSelector = React.memo(({ viewMode, setViewMode }) => (
  <div className="flex flex-col gap-2 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg z-10 w-80">
    <div className="gap-2 w-full text-center font-medium text-gray-700">
      Режим отображения
    </div>
    <div className="flex gap-1 bg-gray-100 rounded-md p-1">
      <label className="relative flex-1">
        <input
          type="radio"
          value="cumulative"
          checked={viewMode === 'cumulative'}
          onChange={() => setViewMode('cumulative')}
          className="sr-only peer"
        />
        <span className="px-3 py-1.5 rounded cursor-pointer text-sm font-medium block text-center transition-all duration-200 peer-checked:bg-red-700 peer-checked:text-white hover:bg-gray-200 peer-checked:hover:bg-red-800">
          Последовательный
        </span>
      </label>
      <label className="relative flex-1">
        <input
          type="radio"
          value="isolated"
          checked={viewMode === 'isolated'}
          onChange={() => setViewMode('isolated')}
          className="sr-only peer"
        />
        <span className="px-3 py-1.5 rounded cursor-pointer text-sm font-medium block text-center transition-all duration-200 peer-checked:bg-red-700 peer-checked:text-white hover:bg-gray-200 peer-checked:hover:bg-red-800">
          Изолированный
        </span>
      </label>
    </div>
  </div>
));

const ModelUploader = React.memo(({ onFileUpload }) => (
  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center z-10 bg-white/80 backdrop-blur-md p-8 rounded-xl shadow-2xl">
    <h2 className="text-2xl font-bold text-gray-800 mb-4">3D Viewer</h2>
    <label
      htmlFor="model-upload"
      className="inline-flex items-center justify-center gap-2 px-10 py-5 bg-red-700 text-white rounded-lg cursor-pointer hover:bg-red-800 transition-all duration-300 mb-4 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
      Загрузить 3D модель
    </label>
    <input
      id="model-upload"
      type="file"
      accept=".glb,.gltf"
      onChange={onFileUpload}
      className="hidden"
    />
    <p className="text-gray-600 mt-2.5">Поддерживаемые форматы: GLB, GLTF</p>
  </div>
));

const ControlPanel = React.memo(({ resetView, showStats, setShowStats }) => (
  <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-2.5 z-10">
    <button
      onClick={resetView}
      className="px-4 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800 transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 flex items-center gap-1.5"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
      Сбросить вид
    </button>
    <button
      onClick={() => setShowStats(!showStats)}
      className={`px-4 py-2 rounded-lg transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 flex items-center gap-1.5 ${
        showStats ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-700'
      }`}
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
      Статистика
    </button>
  </div>
));

// Add Performance Profile Selector component
const PerformanceProfileSelector = React.memo(({ profiles, activeProfile, setActiveProfile }) => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  
  return (
    <div className="flex flex-col bg-white/90 backdrop-blur-sm rounded-lg p-2 shadow-lg z-10 w-80">
      <div 
        className="w-full text-sm font-medium text-gray-700 flex justify-between items-center cursor-pointer py-1" 
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <span>Качество</span>
        <div className="flex items-center">
          <span className="text-xs mr-1 text-gray-500">{profiles[activeProfile].name}</span>
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className={`h-3 w-3 transition-transform duration-300 ${isCollapsed ? '' : 'transform rotate-180'}`} 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      
      {!isCollapsed && (
        <div className="flex flex-col gap-0.5 mt-1 pt-1 border-t border-gray-200">
          {Object.entries(profiles).map(([key, profile]) => (
            <label key={key} className="relative flex items-center">
              <input
                type="radio"
                value={key}
                checked={activeProfile === key}
                onChange={() => setActiveProfile(key)}
                className="sr-only peer"
              />
              <span className="px-2 py-1 rounded cursor-pointer text-xs font-medium w-full text-left transition-all duration-200 peer-checked:bg-red-700 peer-checked:text-white hover:bg-gray-200 peer-checked:hover:bg-red-800 flex justify-between">
                <span>{profile.name}</span>
                {key === 'auto' && (
                  <span className="text-xs opacity-70 self-center ml-1">
                    (А)
                  </span>
                )}
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
});

// Main component
export default function ModelViewer() {
  // Use custom hooks for state management
  const modelState = useModelState();
  const assemblyState = useAssemblyState();
  const performanceState = usePerformanceProfiles();
  
  const {
    modelParts, visibleParts, modelUrl, setModelUrl, selectedParts, setSelectedParts,
    resetModelState, handleModelLoad, handlePartFound
  } = modelState;
  
  const {
    assemblyStates, setAssemblyStates, currentStateIndex, setCurrentStateIndex,
    viewMode, setViewMode, resetAssemblyState, handleAddState
  } = assemblyState;

  const {
    profiles,
    activeProfile,
    setActiveProfile,
    dpr,
    setDpr,
    adaptiveDprEnabled,
    handlePerformanceChange
  } = performanceState;

  // Component state
  const [isLoading, setIsLoading] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const controlsRef = useRef();
  const sceneRef = useRef();

  // Declare a state for tracking the model file
  const [modelFile, setModelFile] = useState(null);
  
  // Modify the handleFileUpload function to store the model file
  const handleFileUpload = useCallback((event) => {
    const file = event.target.files[0];
    if (file) {
      // Clean up previous object URL if exists
      if (modelUrl) URL.revokeObjectURL(modelUrl);
      
      // Create and set new object URL
      const url = URL.createObjectURL(file);
      setModelUrl(url);
      setModelFile(file); // Store the model file
      setIsLoading(true);
      
      // Reset all state
      resetModelState();
      resetAssemblyState();
    }
  }, [modelUrl, resetModelState, resetAssemblyState, setModelUrl]);

  // Reset the view and camera
  const resetView = useCallback(() => {
    setSelectedParts([]);
    setCurrentStateIndex(-1);
    if (controlsRef.current) {
      controlsRef.current.object.position.set(...DEFAULT_CAMERA_POSITION);
      controlsRef.current.target.set(...DEFAULT_CAMERA_TARGET);
      controlsRef.current.reset();
      controlsRef.current.update();
    }
  }, [setSelectedParts, setCurrentStateIndex]);

  // Compute the visible parts based on assembly state and view mode
  const getVisibleParts = useCallback(() => {
    const visible = {};
    
    if (currentStateIndex >= 0 && assemblyStates.length > 0) {
      if (viewMode === 'cumulative') {
        // Show all parts up to current state
        for (let i = 0; i <= currentStateIndex; i++) {
          if (assemblyStates[i]?.parts) {
            assemblyStates[i].parts.forEach(part => {
              visible[part] = true;
            });
          }
        }
      } else if (viewMode === 'isolated') {
        // Show only parts in current state
        if (assemblyStates[currentStateIndex]?.parts) {
          assemblyStates[currentStateIndex].parts.forEach(part => {
            visible[part] = true;
          });
        }
      }
    } else {
      // Default: show all parts
      Object.keys(modelParts).forEach(part => {
        visible[part] = true;
      });
    }
    
    // Set any part not explicitly visible to false
    Object.keys(modelParts).forEach(part => {
      if (!(part in visible)) visible[part] = false;
    });
    
    return visible;
  }, [assemblyStates, currentStateIndex, viewMode, modelParts]);

  // Memoize computed visible parts to prevent unnecessary re-renders
  const computedVisibleParts = useMemo(() => getVisibleParts(), [getVisibleParts]);

  // Handle model loading completion
  useEffect(() => {
    if (modelParts && Object.keys(modelParts).length > 0) {
      setIsLoading(false);
    }
  }, [modelParts]);

  // Clean up object URL on unmount
  useEffect(() => {
    return () => {
      if (modelUrl) URL.revokeObjectURL(modelUrl);
    };
  }, [modelUrl]);

  // Memoize the 3D scene to prevent unnecessary re-renders
  const Scene3D = useMemo(() => (
    <Canvas
      ref={sceneRef}
      camera={{ position: DEFAULT_CAMERA_POSITION, fov: 30, near: 0.1, far: 1000 }}
      dpr={dpr}
      gl={{
        alpha: true,
        powerPreference: profiles[activeProfile].gl.powerPreference,
        stencil: false,
        depth: true,
        antialias: profiles[activeProfile].gl.antialias,
        precision: profiles[activeProfile].gl.precision
      }}
      shadows={profiles[activeProfile].shadows}
      onCreated={({ gl }) => {
        gl.setClearColor(new THREE.Color('#E2E8F0'), 1);
        gl.physicallyCorrectLights = profiles[activeProfile].physicallyCorrectLights;
      }}
    >
      <color attach="background" args={['#E2E8F0']} />
      
      {adaptiveDprEnabled && (
        <PerformanceMonitor
          onIncline={() => handlePerformanceChange(true)}
          onDecline={() => handlePerformanceChange(false)}
          bounds={[45, 60]} // FPS ranges for performance adjustments
          flipflops={3} // Stability before change
        />
      )}
      
      <Suspense fallback={null}>
        <Stage
          adjustCamera={false}
          intensity={1}
          shadows={profiles[activeProfile].shadows}
          environment={profiles[activeProfile].environment}
          preset="rembrandt"
          ground={false}
        >
          <Model
            url={modelUrl}
            visibleParts={computedVisibleParts}
            onLoad={handleModelLoad}
            onPartFound={handlePartFound}
            exploded={false}
          />
        </Stage>
      </Suspense>
      
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
        rotateSpeed={0.8}
        zoomSpeed={1.2}
      />
      
      <Environment preset="sunset" background={false} />
      
      <Suspense fallback={null}>
        <PartFocusController selectedParts={selectedParts} controls={controlsRef} />
      </Suspense>
      
      {adaptiveDprEnabled && <AdaptiveDpr pixelated={false} />}
      <AdaptiveEvents />
      <BakeShadows />
      
      {showStats && <Stats className="stats" position="bottom-right" />}
    </Canvas>
  ), [
    modelUrl, 
    computedVisibleParts, 
    handleModelLoad, 
    handlePartFound, 
    viewMode, 
    selectedParts, 
    currentStateIndex,
    showStats,
    dpr,
    activeProfile,
    profiles,
    adaptiveDprEnabled,
    handlePerformanceChange
  ]);

  // Memoize the AssemblyStateManager to prevent re-renders
  const AssemblyStateManagerComponent = useMemo(() => {
    if (!Object.keys(modelParts).length) return null;
    
    return (
      <Suspense fallback={<LoadingSpinner text="Загрузка интерфейса..." />}>
        <AssemblyStateManager
          assemblyStates={assemblyStates}
          setAssemblyStates={setAssemblyStates}
          modelParts={modelParts}
          onStateSelect={setCurrentStateIndex}
          currentStateIndex={currentStateIndex}
          viewMode={viewMode}
          modelUrl={modelUrl}
          modelFile={modelFile}
        />
      </Suspense>
    );
  }, [
    assemblyStates, 
    setAssemblyStates, 
    modelParts, 
    currentStateIndex, 
    viewMode, 
    setCurrentStateIndex,
    modelUrl,
    modelFile
  ]);

  return (
    <div className="w-full h-screen relative bg-gradient-to-br from-slate-100 to-slate-200">
      {!modelUrl && (
        <ModelUploader onFileUpload={handleFileUpload} />
      )}
      
      {modelUrl && (
        <>
          {isLoading && <LoadingSpinner text="Загрузка модели..." />}
          
          <ControlPanel 
            resetView={resetView} 
            showStats={showStats}
            setShowStats={setShowStats}
          />
          
          <div className="absolute top-2.5 right-2.5 z-10 flex flex-col gap-2.5">
            <ViewModeSelector viewMode={viewMode} setViewMode={setViewMode} />
            <PerformanceProfileSelector 
              profiles={profiles} 
              activeProfile={activeProfile} 
              setActiveProfile={setActiveProfile} 
            />
          </div>
          
          <button
            onClick={() => {
              if (modelUrl) URL.revokeObjectURL(modelUrl);
              setModelUrl(null);
            }}
            className="absolute bottom-2.5 left-2.5 px-6 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800 transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 z-10 flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Загрузить другую модель
          </button>
          
          {Scene3D}
          
          {AssemblyStateManagerComponent}
        </>
      )}
    </div>
  );
}