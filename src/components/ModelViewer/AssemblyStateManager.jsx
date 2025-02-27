import React, { useState, useMemo } from 'react';
import PartSelector from './PartSelector';

export default function AssemblyStateManager({ assemblyStates, setAssemblyStates, modelParts, onStateSelect }) {
  const [editingStateIndex, setEditingStateIndex] = useState(null);
  const [selectedParts, setSelectedParts] = useState([]);

  const globalSelectedParts = useMemo(() => {
    const s = new Set();
    assemblyStates.forEach(state => {
      state.parts.forEach(p => s.add(p));
    });
    return Array.from(s);
  }, [assemblyStates]);

  const handleAddState = () => {
    setAssemblyStates(prev => [...prev, { name: `Сборка ${prev.length + 1}`, parts: [] }]);
  };

  const handleRemoveState = (index) => {
    setAssemblyStates(prev => prev.filter((_, i) => i !== index));
    if (editingStateIndex === index) setEditingStateIndex(null);
    onStateSelect(-1); // Reset view if current state is removed
  };

  const handleEditParts = (index) => {
    setEditingStateIndex(index);
    setSelectedParts(assemblyStates[index].parts);
  };

  const handleSaveParts = () => {
    setAssemblyStates(prev => {
      const newStates = [...prev];
      newStates[editingStateIndex].parts = selectedParts;
      return newStates;
    });
    setEditingStateIndex(null);
  };

  const handleCancelEdit = () => {
    setEditingStateIndex(null);
  };

  return (
    <div className="absolute bottom-2.5 right-2.5 w-80 bg-white rounded shadow-lg z-10 h-[calc(100vh-120px)] overflow-hidden p-2 flex flex-col">
      <h2 className="text-lg font-bold mb-2">Сборка</h2>
      <button
        onClick={handleAddState}
        className="w-full mb-2 px-2 py-1 bg-gray-700 text-white rounded hover:bg-gray-800"
      >
        Добавить
      </button>
      <div className="flex-1 overflow-y-auto">
        <div className="flex w-full space-x-1">
          <ul className="space-y-1 w-full">
          {assemblyStates.map((state, index) => (
            <li key={index}>
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
                className="w-full mb-1 p-2 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg transition-all duration-200 ease-in-out focus:ring-none focus:bg-white focus:outline-none hover:border-gray-400"
              />
              <div className="flex w-full space-x-1">
                <button
                  onClick={() => handleEditParts(index)}
                  className="w-full px-1 py-1 bg-gray-700 text-white rounded hover:bg-gray-800"
                >
                  Редактировать
                </button>
                <button
                  onClick={() => handleRemoveState(index)}
                  className="w-full px-1 py-1 bg-red-700 text-white rounded hover:bg-red-800"
                >
                  Удалить
                </button>
                <button
                  onClick={() => onStateSelect(index)}
                  className="w-full px-1 py-1 bg-gray-700 text-white rounded hover:bg-gray-800"
                >
                  Просмотр
                </button>
              </div>
            </li>
          ))}
          </ul>
        </div>
      </div>
      {editingStateIndex !== null && (
        <div className="mt-4 border-t pt-2 max-h-[50%] overflow-y-auto">
          <h3 className="font-semibold">Выберите части для {assemblyStates[editingStateIndex].name}</h3>
          <PartSelector
            modelParts={modelParts}
            selectedParts={selectedParts}
            setSelectedParts={setSelectedParts}
            globalSelectedParts={globalSelectedParts}
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleSaveParts}
              className="flex-1 px-2 py-1 bg-gray-700 text-white rounded hover:bg-gray-800"
            >
              Сохранить
            </button>
            <button
              onClick={handleCancelEdit}
              className="flex-1 px-2 py-1 bg-gray-700 text-white rounded hover:bg-gray-800"
            >
              Отменить
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 