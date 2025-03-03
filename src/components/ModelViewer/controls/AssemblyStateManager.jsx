import React, { useState, useMemo, useRef } from 'react';
import PartSelector from '../PartSelector';
import Widget from '../ui/Widget';
import MicrophoneInput from '../../common/MicrophoneInput';
import ExportDialog from '../ui/ExportDialog';

export default function AssemblyStateManager({ 
  assemblyStates, 
  setAssemblyStates, 
  modelParts, 
  onStateSelect,
  currentStateIndex,
  viewMode,
  modelUrl,
  modelFile
}) {
  const [editingStateIndex, setEditingStateIndex] = useState(null);
  const [selectedParts, setSelectedParts] = useState([]);
  const [showPartSelector, setShowPartSelector] = useState(false);
  const [showDescriptionEditor, setShowDescriptionEditor] = useState(false);
  const [editingDescription, setEditingDescription] = useState(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [draggingItem, setDraggingItem] = useState(null);
  const itemRefs = useRef([]);

  const globalSelectedParts = useMemo(() => {
    const s = new Set();
    assemblyStates.forEach(state => {
      state.parts.forEach(p => s.add(p));
    });
    return Array.from(s);
  }, [assemblyStates]);

  const handleAddState = () => {
    setAssemblyStates(prev => [
      ...prev, 
      { id: Date.now(), name: `Сборка ${prev.length + 1}`, parts: [] }
    ]);
  };

  const handleRemoveState = (index) => {
    setAssemblyStates(prev => prev.filter((_, i) => i !== index));
    if (editingStateIndex === index) setEditingStateIndex(null);
    onStateSelect(-1);
  };

  const handleEditParts = (index) => {
    setEditingStateIndex(index);
    setSelectedParts(assemblyStates[index].parts);
    setShowPartSelector(true);
  };

  const handleSaveParts = () => {
    setAssemblyStates(prev => {
      const newStates = [...prev];
      newStates[editingStateIndex].parts = selectedParts;
      return newStates;
    });
    setEditingStateIndex(null);
    setShowPartSelector(false);
  };

  const handleCancelEdit = () => {
    setEditingStateIndex(null);
    setShowPartSelector(false);
  };

  const handleEditDescription = (index) => {
    setEditingStateIndex(index);
    setEditingDescription(assemblyStates[index].description || '');
    setShowDescriptionEditor(true);
  };

  const handleSaveDescription = (description) => {
    setAssemblyStates(prev => {
      const newStates = [...prev];
      newStates[editingStateIndex].description = description;
      return newStates;
    });
  };

  const handleCloseDescriptionEditor = () => {
    setEditingStateIndex(null);
    setShowDescriptionEditor(false);
  };

  const handleExportAssemblyInstructions = () => {
    setShowExportDialog(true);
  };

  const handleDragStart = (e, index) => {
    e.preventDefault();
    const draggedItem = assemblyStates[index];
    setDraggingItem(draggedItem);

    const handleDragMove = (e) => {
      const mouseY = e.clientY;
      let insertIndex = -1;

      if (itemRefs.current.length > 0) {
        const firstTop = itemRefs.current[0].getBoundingClientRect().top;
        const lastBottom = itemRefs.current[itemRefs.current.length - 1].getBoundingClientRect().bottom;

        if (mouseY < firstTop) {
          insertIndex = 0;
        } else if (mouseY >= lastBottom) {
          insertIndex = assemblyStates.length;
        } else {
          for (let k = 0; k < itemRefs.current.length; k++) {
            const rect = itemRefs.current[k].getBoundingClientRect();
            if (mouseY >= rect.top && mouseY < rect.bottom) {
              const mid = (rect.top + rect.bottom) / 2;
              insertIndex = mouseY < mid ? k : k + 1;
              break;
            }
          }
        }
      }

      if (insertIndex !== -1) {
        const currentIndex = assemblyStates.indexOf(draggedItem);
        if (currentIndex !== -1 && currentIndex !== insertIndex) {
          const newStates = assemblyStates.filter(item => item !== draggedItem);
          newStates.splice(insertIndex, 0, draggedItem);
          setAssemblyStates(newStates);
        }
      }
    };

    const handleDragEnd = () => {
      setDraggingItem(null);
      document.removeEventListener('mousemove', handleDragMove);
      document.removeEventListener('mouseup', handleDragEnd);
    };

    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
  };

  return (
    <>
      {/* Assembly States Widget */}
      <Widget 
        title="Стадии сборки" 
        initialPosition={{ x: window.innerWidth - 370, y: 120 }}
        width={360}
        minHeight={200}
        minWidth={360}
      >
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-3">
            <button
              onClick={handleAddState}
              className="w-full px-3 py-2 bg-red-700 text-white rounded-md hover:bg-red-800 transition-all duration-200 shadow hover:shadow-md flex items-center justify-center gap-1.5"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Добавить сборку
            </button>
          </div>
          
          {assemblyStates.length > 0 && (
            <div className="mb-3">
              <button
                onClick={handleExportAssemblyInstructions}
                className="w-full px-3 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-800 transition-all duration-200 shadow hover:shadow-md flex items-center justify-center gap-1.5"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Экспорт сборки
              </button>
            </div>
          )}
          
          {assemblyStates.length === 0 ? (
            <div className="text-center py-6 text-gray-500 italic">
              Нет созданных сборок. Создайте новую сборку, нажав кнопку "Добавить сборку".
            </div>
          ) : (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1 -mr-1">
              {assemblyStates.map((state, index) => (
                <div 
                  key={state.id} 
                  ref={el => itemRefs.current[index] = el}
                  className={`bg-white rounded-lg border p-3 transition-all duration-200 ${
                    state === draggingItem ? 'opacity-50' : ''
                  } ${
                    currentStateIndex === index 
                      ? 'border-red-700 shadow-md' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex">
                    <div 
                      className="drag-handle cursor-move p-1 mr-2"
                      onMouseDown={(e) => handleDragStart(e, index)}
                    >
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        className="h-4 w-4 text-gray-400" 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={2} 
                          d="M4 6h16M4 10h16M4 14h16M4 18h16" 
                        />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <input
                          type="text"
                          value={state.name}
                          onChange={(e) => {
                            const newName = e.target.value;
                            setAssemblyStates(prev => {
                              const newStates = [...prev];
                              newStates[index].name = newName;
                              return newStates;
                            });
                          }}
                          className="flex-1 p-1.5 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-md transition-all duration-200 focus:ring-1 focus:ring-red-700 focus:border-red-700 focus:bg-white focus:outline-none hover:border-gray-400"
                        />
                        <span className="ml-2 text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full">
                          {state.parts.length} {state.parts.length === 1 ? 'часть' : 'частей'}
                        </span>
                      </div>
                      
                      {state.description && (
                        <div className="mb-2 text-sm text-gray-600 bg-gray-50 p-2 rounded border border-gray-100 max-h-32 overflow-y-auto">
                          {state.description}
                        </div>
                      )}

                      <div className="flex gap-1.5 mb-1.5">
                        <button
                          onClick={() => handleEditParts(index)}
                          className="flex-1 px-2 py-1.5 bg-gray-700 text-white text-xs rounded-md hover:bg-gray-800 transition-all duration-200 flex items-center justify-center gap-1"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Редактировать
                        </button>
                        <button
                          onClick={() => handleRemoveState(index)}
                          className="px-2 py-1.5 bg-red-700 text-white text-xs rounded-md hover:bg-red-800 transition-all duration-200 flex items-center justify-center"
                          title="Удалить"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                        <button
                          onClick={() => onStateSelect(currentStateIndex === index ? -1 : index)}
                          className={`flex-1 px-2 py-1.5 text-xs rounded-md transition-all duration-200 flex items-center justify-center gap-1 ${
                            currentStateIndex === index 
                              ? 'bg-red-700 hover:bg-red-800 text-white' 
                              : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                          }`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          {currentStateIndex === index ? 'Активна' : 'Просмотр'}
                        </button>
                      </div>

                      <button
                        onClick={() => handleEditDescription(index)}
                        className="w-full px-2 py-1.5 bg-red-700 text-white text-xs rounded-md hover:bg-red-800 transition-all duration-200 flex items-center justify-center gap-1"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                        {state.description ? 'Изменить описание' : 'Добавить описание'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Widget>

      {/* Part Selector Widget */}
      {showPartSelector && (
        <Widget 
          title={editingStateIndex !== null ? `Выбор частей: ${assemblyStates[editingStateIndex].name}` : 'Выбор частей'} 
          initialPosition={{ x: 80, y: 80 }}
          width={320}
          minHeight={400}
        >
          <div className="space-y-4">
            <PartSelector
              modelParts={modelParts}
              selectedParts={selectedParts}
              setSelectedParts={setSelectedParts}
              globalSelectedParts={globalSelectedParts}
            />
            
            <div className="flex gap-2 pt-3 border-t mt-2">
              <button
                onClick={handleSaveParts}
                className="flex-1 px-3 py-2 bg-red-700 text-white rounded-md hover:bg-red-800 transition-all duration-200 shadow hover:shadow-md flex items-center justify-center gap-1.5"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Сохранить
              </button>
              <button
                onClick={handleCancelEdit}
                className="flex-1 px-3 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-all duration-200 shadow hover:shadow-md flex items-center justify-center gap-1.5"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Отменить
              </button>
            </div>
          </div>
        </Widget>
      )}

      {/* Description Editor with Speech-to-Text */}
      {showDescriptionEditor && (
        <Widget 
          title={editingStateIndex !== null ? `Описание этапа: ${assemblyStates[editingStateIndex].name}` : 'Описание этапа'} 
          initialPosition={{ x: window.innerWidth / 2 - 250, y: 80 }}
          width={500}
          minHeight={300}
        >
          <div className="space-y-4">
            <div className="text-sm text-gray-600 mb-2">
              Введите описание или используйте микрофон для голосового ввода инструкций по сборке
            </div>
            
            <MicrophoneInput
              initialText={editingDescription}
              onTranscriptComplete={handleSaveDescription}
              placeholder="Опишите шаги сборки для данного этапа..."
            />
            
            <div className="flex gap-2 pt-3 border-t mt-2">
              <button
                onClick={handleCloseDescriptionEditor}
                className="flex-1 px-3 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-all duration-200 shadow hover:shadow-md flex items-center justify-center gap-1.5"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Готово
              </button>
            </div>
          </div>
        </Widget>
      )}

      {/* Export Dialog */}
      <ExportDialog
        isOpen={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        assemblyStates={assemblyStates}
        modelParts={modelParts}
        modelUrl={modelUrl}
        modelFile={modelFile}
      />
    </>
  );
}