import React, { useState, useCallback, useMemo, useEffect } from 'react';
import GroupManager from './GroupManager';

const VisibilityControls = React.memo(({ parts, visibleParts, onToggle, onToggleAll, onPartDoubleClick }) => {
  const [groups, setGroups] = useState({});
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [editingGroup, setEditingGroup] = useState(null);
  const [draggedPart, setDraggedPart] = useState(null);
  const [hoveredGroup, setHoveredGroup] = useState(null);
  const [editingGroupName, setEditingGroupName] = useState('');
  const [collapsedItems, setCollapsedItems] = useState({});

  const truncateMiddle = useCallback((text, maxLength = 20) => {
    if (text.length <= maxLength) return text;
    const start = Math.ceil(maxLength / 2);
    const end = Math.floor(maxLength / 2);
    return `${text.slice(0, start)}...${text.slice(-end)}`;
  }, []);

  const getDisplayName = useCallback((fullPath) => {
    const parts = fullPath.split(' / ');
    const name = parts[0].split(' / ')[0];
    return name.split(' / ')[0];
  }, []);

  const cleanPartName = useCallback((name) => {
    return name;
  }, []);

  const handlePartDragStart = useCallback((e, part) => {
    setDraggedPart(part);
  }, []);

  const handleGroupDragOver = useCallback((e, groupName) => {
    e.preventDefault();
    setHoveredGroup(groupName);
  }, []);

  const handleGroupDrop = useCallback((e, groupName) => {
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
  }, [draggedPart]);

  const handleRemoveFromGroup = useCallback((groupName, part) => {
    setGroups(prev => ({
      ...prev,
      [groupName]: {
        ...prev[groupName],
        parts: prev[groupName].parts.filter(p => p !== part)
      }
    }));
  }, []);

  const checkGroupVisibility = useCallback((group) => {
    if (!group || !group.parts || group.parts.length === 0) return false;
    return group.parts.every(part => visibleParts[part] === true);
  }, [visibleParts]);

  const handleToggleGroup = useCallback((groupName, forcedState) => {
    const group = groups[groupName];
    if (group) {
      const newState = forcedState !== undefined ? forcedState : !checkGroupVisibility(group);
      group.parts.forEach(part => {
        onToggle(part, newState);
      });
    }
  }, [groups, onToggle, checkGroupVisibility]);

  const handleAddGroup = useCallback((name) => {
    setGroups(prev => ({
      ...prev,
      [name]: { name, parts: [] }
    }));
    setCollapsedGroups(prev => ({ ...prev, [name]: false }));
  }, []);

  const handleDeleteGroup = useCallback((groupName) => {
    setGroups(prev => {
      const { [groupName]: deleted, ...rest } = prev;
      return rest;
    });
    setCollapsedGroups(prev => {
      const { [groupName]: deleted, ...rest } = prev;
      return rest;
    });
  }, []);

  const handleToggleCollapse = useCallback((path) => {
    setCollapsedItems(prev => ({
      ...prev,
      [path]: !prev[path]
    }));
  }, []);

  const buildHierarchy = useCallback((paths) => {
    const hierarchy = {};
    
    paths.forEach(path => {
      const parts = path.split(' / ');
      let currentLevel = hierarchy;
      
      parts.forEach((part, index) => {
        const currentPath = parts.slice(0, index + 1).join(' / ');
        if (!currentLevel[part]) {
          currentLevel[part] = {
            name: part,
            fullPath: currentPath,
            children: {},
            isLeaf: index === parts.length - 1
          };
        }
        currentLevel = currentLevel[part].children;
      });
    });

    return hierarchy;
  }, []);

  // Initialize collapsed state when parts change
  useEffect(() => {
    const newCollapsedState = {};
    Object.keys(parts).forEach(path => {
      const pathParts = path.split(' / ');
      pathParts.forEach((_, index) => {
        if (index < pathParts.length - 1) { // Don't collapse leaf nodes
          const currentPath = pathParts.slice(0, index + 1).join(' / ');
          newCollapsedState[currentPath] = true;
        }
      });
    });
    setCollapsedItems(newCollapsedState);
  }, [parts]);

  const handleCollapseAll = useCallback((collapsed = true) => {
    const newState = {};
    Object.keys(parts).forEach(path => {
      const pathParts = path.split(' / ');
      pathParts.forEach((_, index) => {
        if (index < pathParts.length - 1) { // Don't collapse leaf nodes
          const currentPath = pathParts.slice(0, index + 1).join(' / ');
          newState[currentPath] = collapsed;
        }
      });
    });
    setCollapsedItems(newState);
  }, [parts]);

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

  // Helper functions to determine group visibility
  const isGroupVisible = useCallback((group) => {
    return checkGroupVisibility(group);
  }, [checkGroupVisibility]);

  const isGroupPartiallyVisible = useCallback((group) => {
    if (!group || !group.parts || group.parts.length === 0) return false;
    const visiblePartsCount = group.parts.reduce((count, part) => {
      return count + (visibleParts[part] === true ? 1 : 0);
    }, 0);
    return visiblePartsCount > 0 && visiblePartsCount < group.parts.length;
  }, [visibleParts]);

  const HierarchyItem = useCallback(({ item, level = 0, parentPath = '' }) => {
    const cleanName = cleanPartName(item.name);
    const fullPath = item.fullPath;
    const hasChildren = Object.keys(item.children).length > 0;
    const isCollapsed = collapsedItems[fullPath];
    
    if (item.type === 'mesh') {
      return null;
    }

    const childrenArray = Object.values(item.children).filter(child => child.type !== 'mesh');

    // Recursively check visibility of all descendant items
    const checkDescendantVisibility = (children) => {
      return Object.values(children)
        .filter(child => child.type !== 'mesh')
        .every(child => {
          if (Object.keys(child.children).length > 0) {
            return checkDescendantVisibility(child.children);
          }
          return visibleParts[child.fullPath] === true;
        });
    };

    // Calculate visibility state based on children for parent items
    const isVisible = hasChildren
      ? childrenArray.length > 0 && checkDescendantVisibility(item.children)
      : visibleParts[fullPath] === true;

    // Calculate indeterminate state for parent items
    const isIndeterminate = hasChildren && childrenArray.length > 0 && 
      !checkDescendantVisibility(item.children) &&
      Object.values(item.children)
        .filter(child => child.type !== 'mesh')
        .some(child => {
          if (Object.keys(child.children).length > 0) {
            return checkDescendantVisibility(child.children);
          }
          return visibleParts[child.fullPath] === true;
        });

    const handleVisibilityToggle = () => {
      const newState = !isVisible;
      if (hasChildren) {
        const toggleChildren = (children) => {
          Object.values(children).forEach(child => {
            if (child.type !== 'mesh') {
              onToggle(child.fullPath, newState);
              if (Object.keys(child.children).length > 0) {
                toggleChildren(child.children);
              }
            }
          });
        };
        toggleChildren(item.children);
      } else {
        onToggle(fullPath, newState);
      }
    };

    return (
      <div className="flex flex-col">
        <div
          className={`flex items-center p-2 rounded-lg hover:bg-white transition-colors duration-150 ${
            level === 0 ? 'cursor-grab active:cursor-grabbing' : ''
          }`}
          draggable={level === 0}
          onDragStart={level === 0 ? (e) => handlePartDragStart(e, fullPath) : undefined}
          onDoubleClick={() => onPartDoubleClick(fullPath)}
        >
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleToggleCollapse(fullPath);
              }}
              className="mr-2 w-4 h-4 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors"
            >
              {isCollapsed ? '▶' : '▼'}
            </button>
          )}
          {!hasChildren && <div className="w-4 mr-2" />}
          <input
            type="checkbox"
            checked={isVisible}
            ref={input => {
              if (input) {
                input.indeterminate = isIndeterminate;
              }
            }}
            onChange={handleVisibilityToggle}
            className="mr-3 cursor-pointer accent-red-600"
          />
          <label 
            className={`flex-1 text-sm ${
              level === 0 
                ? 'text-gray-700 hover:text-gray-900' 
                : 'text-gray-500 hover:text-gray-700'
            } cursor-pointer transition-colors duration-150`}
            title={fullPath}
          >
            {truncateMiddle(cleanName, level === 0 ? 40 : 35)}
          </label>
        </div>
        
        {hasChildren && !isCollapsed && (
          <div className="ml-6 space-y-1">
            {childrenArray
              .sort((a, b) => cleanPartName(a.name).localeCompare(cleanPartName(b.name)))
              .map(child => (
                <HierarchyItem
                  key={child.fullPath}
                  item={child}
                  level={level + 1}
                  parentPath={fullPath}
                />
              ))}
          </div>
        )}
      </div>
    );
  }, [
    visibleParts,
    onToggle,
    onPartDoubleClick,
    handlePartDragStart,
    cleanPartName,
    truncateMiddle,
    collapsedItems,
    handleToggleCollapse
  ]);

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
          onExportStructure={() => {
            // Create a hierarchical structure of all parts
            const structure = {};
            Object.keys(parts).forEach(path => {
              const pathParts = path.split(' / ');
              let current = structure;
              pathParts.forEach((part, index) => {
                if (!current[part]) {
                  current[part] = {
                    name: part,
                    visible: visibleParts[path],
                    children: {},
                  };
                }
                current = current[part].children;
              });
            });

            // Convert to JSON and download
            const dataStr = JSON.stringify(structure, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'part-structure.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }}
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
                      input.indeterminate = isGroupPartiallyVisible(group);
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
        <div className="mb-3 flex items-center justify-between sticky top-0 bg-gray-50 py-1 z-10">
          <h4 className="text-gray-700 text-sm font-semibold flex items-center gap-2">
            Ungrouped Parts 
            <span className="px-2 py-0.5 bg-gray-200 rounded-full text-xs">
              {Object.keys(groupedParts).length}
            </span>
          </h4>
          <div className="flex gap-2">
            <button
              onClick={() => handleCollapseAll(false)}
              className="px-2 py-1 text-xs text-gray-600 hover:text-gray-900 transition-colors"
            >
              Развернуть все
            </button>
            <button
              onClick={() => handleCollapseAll(true)}
              className="px-2 py-1 text-xs text-gray-600 hover:text-gray-900 transition-colors"
            >
              Свернуть все
            </button>
          </div>
        </div>
        <div className="overflow-y-auto pr-2 space-y-1.5 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent flex-1">
          {Object.entries(groupedParts).sort().map(([displayName, paths]) => {
            const hierarchy = buildHierarchy(paths);
            return Object.values(hierarchy).map(item => (
              <HierarchyItem key={item.fullPath} item={item} />
            ));
          })}
        </div>
      </div>
    </div>
  );
});

export default VisibilityControls;