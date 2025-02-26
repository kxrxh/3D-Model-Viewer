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
    <div className="p-4 border border-gray-200 rounded-xl bg-white shadow-sm">
      <div className="mb-4 flex gap-2">
        <input
          type="text"
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
          placeholder="Название новой группы"
          className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-sm outline-none transition-all duration-200 focus:border-red-500 focus:ring-2 focus:ring-red-100"
        />
        <button
          onClick={() => {
            if (newGroupName.trim()) {
              onAddGroup(newGroupName.trim());
              setNewGroupName('');
            }
          }}
          className="px-5 py-2.5 bg-red-600 text-white rounded-lg cursor-pointer text-sm font-medium hover:bg-red-700 transition-all duration-200 shadow-sm hover:shadow-md active:scale-95"
        >
          Новая группа
        </button>
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleExport}
          className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg cursor-pointer text-sm font-medium hover:bg-gray-200 transition-all duration-200 border border-gray-200"
        >
          Экспорт групп
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg cursor-pointer text-sm font-medium hover:bg-gray-200 transition-all duration-200 border border-gray-200"
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