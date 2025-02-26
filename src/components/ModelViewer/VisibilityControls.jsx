import React, { useState, useCallback, useMemo } from 'react';
import GroupManager from './GroupManager';

const VisibilityControls = React.memo(({ parts, visibleParts, onToggle, onToggleAll, onPartDoubleClick }) => {
  const [groups, setGroups] = useState({});
  const [editingGroup, setEditingGroup] = useState(null);
  const [draggedPart, setDraggedPart] = useState(null);
  const [hoveredGroup, setHoveredGroup] = useState(null);
  const [editingGroupName, setEditingGroupName] = useState('');

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
    <div className="absolute top-2.5 right-2.5 bg-white/95 backdrop-blur-sm p-4 rounded-2xl shadow-xl max-h-[80vh] overflow-y-auto min-w-[320px] border border-gray-100">
      <div className="flex justify-between mb-5 gap-2.5 border-b border-gray-100 pb-4">
        <h3 className="m-0 text-gray-800 text-lg font-semibold">Части модели</h3>
        <div className="flex gap-2">
          <button
            onClick={() => onToggleAll(true)}
            className="px-3 py-1.5 bg-red-700 hover:bg-red-800 text-white border-none rounded-lg cursor-pointer text-sm font-medium transition-colors duration-200 shadow-sm hover:shadow"
          >
            Показать все
          </button>
          <button
            onClick={() => onToggleAll(false)}
            className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white border-none rounded-lg cursor-pointer text-sm font-medium transition-colors duration-200 shadow-sm hover:shadow"
          >
            Скрыть все
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

      {Object.entries(groups).map(([groupName, group]) => (
        <div
          key={groupName}
          className={`mb-3 border border-gray-200 rounded-xl p-4 transition-all duration-200 ${
            hoveredGroup === groupName ? 'bg-gray-50 shadow-md' : 'bg-white'
          }`}
          onDragOver={(e) => handleGroupDragOver(e, groupName)}
          onDrop={(e) => handleGroupDrop(e, groupName)}
          onMouseEnter={() => setHoveredGroup(groupName)}
          onMouseLeave={() => setHoveredGroup(null)}
        >
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={isGroupVisible(group)}
                ref={input => {
                  if (input) {
                    input.indeterminate = isGroupPartiallyVisible(group) && !isGroupVisible(group);
                  }
                }}
                onChange={() => handleToggleGroup(groupName)}
                className="w-4 h-4 cursor-pointer accent-red-600"
              />
              {editingGroup === groupName ? (
                <input
                  type="text"
                  value={editingGroupName}
                  onChange={(e) => setEditingGroupName(e.target.value)}
                  onBlur={() => {
                    if (editingGroupName && editingGroupName !== groupName) {
                      setGroups(prev => {
                        const { [groupName]: group, ...rest } = prev;
                        return { ...rest, [editingGroupName]: { ...group, name: editingGroupName } };
                      });
                    }
                    setEditingGroup(null);
                    setEditingGroupName('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.target.blur();
                    } else if (e.key === 'Escape') {
                      setEditingGroup(null);
                      setEditingGroupName('');
                    }
                  }}
                  autoFocus
                  className="px-2 py-1 rounded border border-gray-300 text-sm"
                />
              ) : (
                <h4 
                  className="m-0 text-sm font-medium text-gray-800 cursor-pointer"
                  onDoubleClick={() => {
                    setEditingGroup(groupName);
                    setEditingGroupName(groupName);
                  }}
                >
                  {groupName}
                </h4>
              )}
              <button
                onClick={() => handleDeleteGroup(groupName)}
                className={`px-1.5 py-0.5 bg-red-700 hover:bg-red-800 text-white border-none rounded-lg cursor-pointer text-xs transition-all duration-200 ${
                  hoveredGroup === groupName ? 'opacity-100' : 'opacity-0'
                }`}
              >
                X
              </button>
            </div>
          </div>
          <div className="ml-6 space-y-1">
            {group.parts.map(part => (
              <div
                key={part}
                className="flex items-center p-2 rounded-lg hover:bg-gray-50 transition-colors duration-150"
              >
                <input
                  type="checkbox"
                  checked={visibleParts[part]}
                  onChange={() => onToggle(part)}
                  className="mr-3 cursor-pointer accent-red-600"
                />
                <span
                  className="flex-1 text-sm text-gray-600 cursor-pointer"
                  onDoubleClick={() => onPartDoubleClick(part)}
                >
                  {getDisplayName(part)}
                </span>
                <button
                  onClick={() => handleRemoveFromGroup(groupName, part)}
                  className="px-2 py-1 bg-transparent text-red-500 border border-red-500 rounded-lg cursor-pointer text-xs opacity-0 hover:opacity-100 hover:bg-red-50 transition-all duration-200"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="mt-5 p-4 bg-gray-50/50 rounded-xl border border-gray-200">
        <h4 className="mb-4 text-gray-700 text-sm font-semibold">
          Несгруппированные части
        </h4>
        <div className="max-h-[300px] overflow-y-auto pr-2">
          {Object.keys(groupedParts).sort().map((displayName) => {
            const paths = groupedParts[displayName];
            const allVisible = paths.every(path => visibleParts[path]);
            const anyVisible = paths.some(path => visibleParts[path]);

            return (
              <div 
                key={displayName} 
                className="mb-1 flex items-center p-2 rounded-lg hover:bg-white transition-colors duration-150 cursor-grab active:cursor-grabbing"
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
                  className="mr-3 cursor-pointer accent-red-600"
                />
                <label className="flex-1 text-sm text-gray-600 cursor-pointer hover:text-gray-800 transition-colors duration-150">
                  {displayName}
                </label>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});

export default VisibilityControls; 