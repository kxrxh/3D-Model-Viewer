import React, { useState, useCallback, useMemo } from 'react';
import GroupManager from './GroupManager';

const VisibilityControls = React.memo(({ parts, visibleParts, onToggle, onToggleAll, onPartDoubleClick }) => {
  const [groups, setGroups] = useState({});
  const [collapsedGroups, setCollapsedGroups] = useState({}); // New state for collapsed groups
  const [editingGroup, setEditingGroup] = useState(null);
  const [draggedPart, setDraggedPart] = useState(null);
  const [hoveredGroup, setHoveredGroup] = useState(null);
  const [editingGroupName, setEditingGroupName] = useState('');

  const truncateMiddle = useCallback((text, maxLength = 20) => {
    if (text.length <= maxLength) return text;
    const start = Math.ceil(maxLength / 2);
    const end = Math.floor(maxLength / 2);
    return `${text.slice(0, start)}...${text.slice(-end)}`;
  }, []);

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
    setCollapsedGroups(prev => ({ ...prev, [name]: false })); // New groups start expanded
  };

  const handleDeleteGroup = (groupName) => {
    setGroups(prev => {
      const { [groupName]: deleted, ...rest } = prev;
      return rest;
    });
    setCollapsedGroups(prev => {
      const { [groupName]: deleted, ...rest } = prev;
      return rest;
    });
  };

  const handleToggleCollapse = (groupName) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  const handlePartDragStart = (e, part) => {
    setDraggedPart(part);
  };

  const handleGroupDragOver = (e, groupName) => {
    e.preventDefault();
    setHoveredGroup(groupName);
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
      setHoveredGroup(null);
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
    <div className="absolute top-2.5 right-2.5 bg-white/95 backdrop-blur-sm p-5 rounded-2xl shadow-2xl h-[calc(100vh-1.25rem)] overflow-hidden flex flex-col min-w-[360px] border border-gray-200">
      <div className="flex justify-between items-center mb-6 gap-3 border-b border-gray-200 pb-4">
        <h3 className="m-0 text-gray-900 text-xl font-semibold">Model Parts</h3>
        <div className="flex gap-2.5">
          <button
            onClick={() => onToggleAll(true)}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-all duration-200 shadow-sm hover:shadow-md active:scale-95"
          >
            Показать все
          </button>
          <button
            onClick={() => onToggleAll(false)}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-all duration-200 shadow-sm hover:shadow-md active:scale-95"
          >
            Скрыть все
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
        <GroupManager
          groups={groups}
          onAddGroup={handleAddGroup}
          onDeleteGroup={handleDeleteGroup}
          onEditGroup={(name, newName) => {
            setGroups(prev => {
              const { [name]: group, ...rest } = prev;
              return { ...rest, [newName]: { ...group, name: newName } };
            });
            setCollapsedGroups(prev => {
              const { [name]: collapsed, ...rest } = prev;
              return { ...rest, [newName]: collapsed };
            });
          }}
          onSaveGroups={() => {}}
          onLoadGroups={setGroups}
        />

        {Object.entries(groups).map(([groupName, group]) => (
          <div
            key={groupName}
            className={`justify-center align-middle border border-gray-200 rounded-xl px-4 py-2 transition-all duration-200 ${
              hoveredGroup === groupName ? 'bg-gray-50' : 'bg-white'
            }`}
            onDragOver={(e) => handleGroupDragOver(e, groupName)}
            onDrop={(e) => handleGroupDrop(e, groupName)}
            onMouseEnter={() => setHoveredGroup(groupName)}
            onMouseLeave={() => setHoveredGroup(null)}
          >
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleCollapse(groupName)}
                  className="text-gray-500 hover:text-gray-700 transition-colors duration-150"
                >
                  {collapsedGroups[groupName] ? '▶' : '▼'}
                </button>
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
                        setCollapsedGroups(prev => {
                          const { [groupName]: collapsed, ...rest } = prev;
                          return { ...rest, [editingGroupName]: collapsed };
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
                    className="px-2 py-1 rounded border border-gray-300 text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                ) : (
                  <h4 
                    className="m-0 text-sm font-medium text-gray-800 cursor-pointer hover:text-gray-900 transition-colors duration-150"
                    onDoubleClick={() => {
                      setEditingGroup(groupName);
                      setEditingGroupName(groupName);
                    }}
                  >
                    {groupName} ({group.parts.length})
                  </h4>
                )}
              </div>
              <button
                onClick={() => handleDeleteGroup(groupName)}
                className={`px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs transition-all duration-200 shadow-sm hover:shadow ${
                  hoveredGroup === groupName ? 'opacity-100' : 'opacity-0'
                }`}
              >
                ✕
              </button>
            </div>
            {!collapsedGroups[groupName] && (
              <div className="ml-6 space-y-1.5 mt-3">
                {group.parts.map(part => (
                  <div
                    key={part}
                    className="flex items-center p-2 rounded-lg hover:bg-gray-100 transition-colors duration-150"
                  >
                    <input
                      type="checkbox"
                      checked={visibleParts[part]}
                      onChange={() => onToggle(part)}
                      className="mr-3 w-4 h-4 cursor-pointer accent-red-600 rounded"
                    />
                    <span
                      className="flex-1 text-sm text-gray-700 cursor-pointer hover:text-gray-900 transition-colors duration-150"
                      onDoubleClick={() => onPartDoubleClick(part)}
                      title={getDisplayName(part)}
                    >
                      {truncateMiddle(getDisplayName(part), 20)}
                    </span>
                    <button
                      onClick={() => handleRemoveFromGroup(groupName, part)}
                      className="px-2 py-1 bg-transparent text-red-600 border border-red-600 rounded-lg text-xs opacity-0 hover:opacity-100 hover:bg-red-50 transition-all duration-200 ml-2 shrink-0"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200 flex flex-col" style={{ maxHeight: 'min(500px, 45vh)' }}>
        <h4 className="mb-3 text-gray-700 text-sm font-semibold flex items-center gap-2 sticky top-0 bg-gray-50 py-1">
          Ungrouped Parts 
          <span className="px-2 py-0.5 bg-gray-200 rounded-full text-xs">
            {Object.keys(groupedParts).length}
          </span>
        </h4>
        <div className="overflow-y-auto pr-2 space-y-1.5 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent flex-1">
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
                <label className="flex-1 text-sm text-gray-700 cursor-pointer hover:text-gray-900 transition-colors duration-150">
                  {truncateMiddle(displayName, 40)}
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