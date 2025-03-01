import { useState, useRef, useCallback } from 'react';

/**
 * Custom hook for managing 3D model state
 * @returns {Object} Model state and functions
 */
export default function useModelState() {
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