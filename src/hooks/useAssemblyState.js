import { useState, useCallback } from 'react';

/**
 * Custom hook for managing assembly state
 * @returns {Object} Assembly state and functions
 */
export default function useAssemblyState() {
  const [assemblyStates, setAssemblyStates] = useState([]);
  const [currentStateIndex, setCurrentStateIndex] = useState(-1);
  const [viewMode, setViewMode] = useState('cumulative');

  const resetAssemblyState = useCallback(() => {
    setAssemblyStates([]);
    setCurrentStateIndex(-1);
  }, []);

  return {
    assemblyStates,
    setAssemblyStates,
    currentStateIndex,
    setCurrentStateIndex,
    viewMode,
    setViewMode,
    resetAssemblyState
  };
} 