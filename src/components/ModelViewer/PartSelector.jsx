import React, { useState } from 'react';

function buildTree(parts) {
  const tree = {};
  Object.keys(parts).forEach(fullPath => {
    const segments = fullPath.split(' / ');
    let currentLevel = tree;
    let path = '';
    segments.forEach((segment, index) => {
      path = index === 0 ? segment : path + ' / ' + segment;
      if (!currentLevel[segment]) {
        currentLevel[segment] = { name: segment, fullPath: path, children: {} };
      }
      currentLevel = currentLevel[segment].children;
    });
  });
  return tree;
}

function getAllDescendantPaths(node) {
  let paths = [node.fullPath];
  Object.values(node.children).forEach(child => {
    paths = paths.concat(getAllDescendantPaths(child));
  });
  return paths;
}

function TreeNode({ node, selectedParts, setSelectedParts, globalSelectedParts, depth = 0 }) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = Object.keys(node.children).length > 0;
  const unionSelected = selectedParts.includes(node.fullPath) || (globalSelectedParts && globalSelectedParts.includes(node.fullPath));
  const isGlobalOnly = !selectedParts.includes(node.fullPath) && (globalSelectedParts && globalSelectedParts.includes(node.fullPath));

  const handleToggle = () => {
    if (isGlobalOnly) return;
    const descendantPaths = getAllDescendantPaths(node);
    if (selectedParts.includes(node.fullPath)) {
      setSelectedParts(prev => prev.filter(p => !descendantPaths.includes(p)));
    } else {
      setSelectedParts(prev => Array.from(new Set([...prev, ...descendantPaths])));
    }
  };

  return (
    <div className="relative">
      <div 
        className={`flex items-center rounded py-1.5 ${depth === 0 ? 'mb-1' : ''} transition-colors 
                    ${unionSelected ? 'bg-red-50' : 'hover:bg-gray-50'}`}
      >
        {hasChildren && (
          <button 
            onClick={() => setExpanded(!expanded)}
            className="mr-1 h-5 w-5 flex items-center justify-center text-gray-500 hover:text-gray-700"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className={`h-4 w-4 transition-transform ${expanded ? 'transform rotate-90' : ''}`} 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
        {!hasChildren && <div className="mr-1 w-5" />}
        <div className="relative flex items-center">
          <input
            type="checkbox"
            checked={unionSelected}
            onChange={handleToggle}
            disabled={isGlobalOnly}
            className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-gray-300 
              checked:border-red-500 checked:bg-red-700 
              hover:border-red-500 disabled:cursor-not-allowed disabled:opacity-50
              transition-all duration-200"
          />
          <svg
            className="pointer-events-none absolute h-5 w-5 opacity-0 peer-checked:opacity-100 text-white"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <span 
          className={`ml-2 select-none truncate text-sm ${isGlobalOnly ? 'text-gray-500 italic' : ''}`}
          title={node.name}
        >
          {node.name}
        </span>
      </div>
      
      {hasChildren && expanded && (
        <div className={`pl-6 ${depth > 0 ? 'ml-4 border-l border-gray-200' : ''}`}>
          {Object.values(node.children).map(child => (
            <TreeNode 
              key={child.fullPath} 
              node={child} 
              selectedParts={selectedParts} 
              setSelectedParts={setSelectedParts} 
              globalSelectedParts={globalSelectedParts}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function PartSelector({ modelParts, selectedParts, setSelectedParts, globalSelectedParts }) {
  const tree = buildTree(modelParts);
  
  const selectAll = () => {
    setSelectedParts(Object.keys(modelParts));
  };
  
  const deselectAll = () => {
    setSelectedParts([]);
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between pb-2 border-b border-gray-200">
        <button 
          onClick={selectAll}
          className="px-2 py-1 text-xs bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-md transition-colors"
        >
          Выбрать все
        </button>
        <button 
          onClick={deselectAll}
          className="px-2 py-1 text-xs bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-md transition-colors"
        >
          Снять выбор
        </button>
      </div>
      
      <div className="max-h-[40vh] overflow-y-auto pr-1 -mr-1 space-y-1">
        {Object.values(tree).map(node => (
          <TreeNode 
            key={node.fullPath} 
            node={node} 
            selectedParts={selectedParts} 
            setSelectedParts={setSelectedParts} 
            globalSelectedParts={globalSelectedParts} 
          />
        ))}
      </div>
    </div>
  );
} 