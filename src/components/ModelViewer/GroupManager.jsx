import React, { useState, useRef } from 'react';

const GroupManager = React.memo(({ groups, onAddGroup, onDeleteGroup, onEditGroup, onSaveGroups, onLoadGroups, onExportStructure }) => {
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
    <div className="flex flex-col gap-2 p-1">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Название новой группы"
          className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && newGroupName) {
              onAddGroup(newGroupName);
              setNewGroupName('');
            }
          }}
        />
        <button
          onClick={() => {
            if (newGroupName) {
              onAddGroup(newGroupName);
              setNewGroupName('');
            }
          }}
          className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-all duration-200"
        >
          Новая группа
        </button>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onExportStructure}
          className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-all duration-200"
        >
          Экспорт структуры
        </button>
        <button
          onClick={handleExport}
          className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-all duration-200"
        >
          Экспорт групп
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-all duration-200"
        >
          Импорт групп
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImport}
          className="hidden"
        />
      </div>
    </div>
  );
});

export default GroupManager; 