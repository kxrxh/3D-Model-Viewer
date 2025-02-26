import React, { useState, useRef } from 'react';

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
    <div className="mb-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
      <div className="mb-3 flex gap-2">
        <input
          type="text"
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
          placeholder="Название новой группы"
          className="flex-1 px-3 py-2 rounded-md border border-gray-300 text-sm outline-none transition-colors focus:border-blue-500"
        />
        <button
          onClick={() => {
            if (newGroupName.trim()) {
              onAddGroup(newGroupName.trim());
              setNewGroupName('');
            }
          }}
          className="px-4 py-2 bg-red-700 text-white rounded-md cursor-pointer text-sm font-medium hover:bg-red-800 transition-colors"
        >
          Новая группа
        </button>
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleExport}
          className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-md cursor-pointer text-sm font-medium hover:bg-gray-700 transition-colors"
        >
          Экспорт групп
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-md cursor-pointer text-sm font-medium hover:bg-gray-700 transition-colors"
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