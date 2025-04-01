import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { InstructionStep } from '../../common/types';

interface ModelConstructorContextType {
  // Model state
  modelUrl: string | null;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  onReset: () => void;
  
  // Instructions state
  instructions: InstructionStep[];
  onInstructionsChange: (instructions: InstructionStep[]) => void;
  
  // Display settings
  highlightColor: string;
  setHighlightColor: (color: string) => void;
  highlightEnabled: boolean;
  setHighlightEnabled: (enabled: boolean) => void;
  previousStepsTransparency: boolean;
  setPreviousStepsTransparency: (enabled: boolean) => void;
  previousStepsOpacity: number;
  setPreviousStepsOpacity: (opacity: number) => void;
  autoRotationEnabled: boolean;
  setAutoRotationEnabled: (enabled: boolean) => void;
  backgroundColor: string;
  setBackgroundColor: (color: string) => void;
  displayMode: 'all' | 'selected';
  setDisplayMode: (mode: 'all' | 'selected') => void;
  
  // Step management
  currentStepIndex: number;
  setCurrentStepIndex: (index: number) => void;
  editingStep: InstructionStep | null;
  setEditingStep: (step: InstructionStep | null) => void;
  
  // Parts management
  selectedPartIds: string[];
  setSelectedPartIds: (ids: string[]) => void;
  showPartsSelector: boolean;
  setShowPartsSelector: (show: boolean) => void;
  
  // UI state
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
  showStats: boolean;
  setShowStats: (show: boolean) => void;
}

const ModelConstructorContext = createContext<ModelConstructorContextType | undefined>(undefined);

export const ModelConstructorProvider: React.FC<{
  children: ReactNode;
  modelUrl: string | null;
  instructions: InstructionStep[];
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  onReset: () => void;
  onInstructionsChange: (instructions: InstructionStep[]) => void;
}> = ({
  children,
  modelUrl,
  instructions,
  isLoading,
  setIsLoading,
  onReset,
  onInstructionsChange,
}) => {
  // Display settings
  const [highlightColor, setHighlightColor] = useState<string>("#f87171");
  const [highlightEnabled, setHighlightEnabled] = useState<boolean>(true);
  const [previousStepsTransparency, setPreviousStepsTransparency] = useState<boolean>(true);
  const [previousStepsOpacity, setPreviousStepsOpacity] = useState<number>(0.4);
  const [autoRotationEnabled, setAutoRotationEnabled] = useState<boolean>(true);
  const [backgroundColor, setBackgroundColor] = useState<string>("#E2E8F0");
  const [displayMode, setDisplayMode] = useState<'all' | 'selected'>('all');
  
  // Step management
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(-1);
  const [editingStep, setEditingStep] = useState<InstructionStep | null>(null);
  
  // Parts management
  const [selectedPartIds, setSelectedPartIds] = useState<string[]>([]);
  const [showPartsSelector, setShowPartsSelector] = useState(false);
  
  // UI state
  const [showSettings, setShowSettings] = useState(false);
  const [showStats, setShowStats] = useState(false);

  // Callbacks for settings changes with toast notifications
  const handleHighlightEnabledChange = useCallback((enabled: boolean) => {
    console.log("Изменение состояния подсветки:", enabled ? "включена" : "выключена");
    setHighlightEnabled(enabled);
  }, []);

  const handlePreviousStepsTransparencyChange = useCallback((enabled: boolean) => {
    console.log("Изменение прозрачности предыдущих шагов:", enabled ? "включена" : "выключена");
    setPreviousStepsTransparency(enabled);
  }, []);

  const handleAutoRotationChange = useCallback((enabled: boolean) => {
    console.log("Изменение автовращения модели:", enabled ? "включено" : "выключено");
    setAutoRotationEnabled(enabled);
  }, []);

  const value = {
    modelUrl,
    isLoading,
    setIsLoading,
    onReset,
    instructions,
    onInstructionsChange,
    highlightColor,
    setHighlightColor,
    highlightEnabled,
    setHighlightEnabled: handleHighlightEnabledChange,
    previousStepsTransparency,
    setPreviousStepsTransparency: handlePreviousStepsTransparencyChange,
    previousStepsOpacity,
    setPreviousStepsOpacity,
    autoRotationEnabled,
    setAutoRotationEnabled: handleAutoRotationChange,
    backgroundColor,
    setBackgroundColor,
    displayMode,
    setDisplayMode,
    currentStepIndex,
    setCurrentStepIndex,
    editingStep,
    setEditingStep,
    selectedPartIds,
    setSelectedPartIds,
    showPartsSelector,
    setShowPartsSelector,
    showSettings,
    setShowSettings,
    showStats,
    setShowStats,
  };

  return (
    <ModelConstructorContext.Provider value={value}>
      {children}
    </ModelConstructorContext.Provider>
  );
};

export const useModelConstructor = () => {
  const context = useContext(ModelConstructorContext);
  if (context === undefined) {
    throw new Error('useModelConstructor must be used within a ModelConstructorProvider');
  }
  return context;
}; 