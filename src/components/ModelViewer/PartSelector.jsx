import React, { useState, useMemo } from 'react';

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

// Filter tree based on search query
function filterTree(tree, searchQuery) {
  if (!searchQuery) return tree;
  
  const searchLower = searchQuery.toLowerCase();
  const filteredTree = {};
  
  const filterNode = (node, parentKey) => {
    const nodeNameLower = node.name.toLowerCase();
    const matchesSearch = nodeNameLower.includes(searchLower);
    
    // Check if any children match the search
    const filteredChildren = {};
    let hasMatchingChildren = false;
    
    Object.entries(node.children).forEach(([key, child]) => {
      const childResult = filterNode(child, key);
      if (childResult) {
        filteredChildren[key] = childResult;
        hasMatchingChildren = true;
      }
    });
    
    // Include this node if it matches or has matching children
    if (matchesSearch || hasMatchingChildren) {
      return {
        ...node,
        children: filteredChildren
      };
    }
    
    return null;
  };
  
  Object.entries(tree).forEach(([key, node]) => {
    const filteredNode = filterNode(node, key);
    if (filteredNode) {
      filteredTree[key] = filteredNode;
    }
  });
  
  return filteredTree;
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
  const [searchQuery, setSearchQuery] = useState('');
  const tree = buildTree(modelParts);
  
  // Filter tree based on search query
  const filteredTree = useMemo(() => {
    return filterTree(tree, searchQuery);
  }, [tree, searchQuery]);
  
  const selectAll = () => {
    setSelectedParts(Object.keys(modelParts));
  };
  
  const deselectAll = () => {
    setSelectedParts([]);
  };

  const hasFilteredResults = Object.keys(filteredTree).length > 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 pb-2 border-b border-gray-200">
        {/* Search Input */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск частей..."
            className="w-full pl-8 pr-4 py-1.5 text-sm bg-gray-50 border border-gray-300 rounded-md focus:ring-1 focus:ring-red-700 focus:border-red-700 focus:outline-none"
          />
          <svg 
            className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400"
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 hover:text-gray-600"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        
        <div className="flex justify-between">
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
      </div>
      
      <div className="min-h-[200px] max-h-[40vh] overflow-y-auto pr-1 -mr-1 space-y-1">
        {hasFilteredResults ? (
          Object.values(filteredTree).map(node => (
            <TreeNode 
              key={node.fullPath} 
              node={node} 
              selectedParts={selectedParts} 
              setSelectedParts={setSelectedParts} 
              globalSelectedParts={globalSelectedParts} 
            />
          ))
        ) : (
          <div className="flex items-center justify-center h-[180px] text-center text-gray-500 italic">
            {searchQuery ? 'Нет результатов по запросу' : 'Нет доступных частей'}
          </div>
        )}
      </div>
    </div>
  );
} 