import React from 'react';

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

function TreeNode({ node, selectedParts, setSelectedParts, globalSelectedParts }) {
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
      <div className="flex items-center group py-1">
        <div className="relative flex items-center">
          <input
            type="checkbox"
            checked={unionSelected}
            onChange={handleToggle}
            disabled={isGlobalOnly}
            className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-gray-300 
              checked:border-red-500 checked:bg-red-700 
              hover:border-red-800 disabled:cursor-not-allowed disabled:opacity-50
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
        <span className="ml-2 select-none">{node.name}</span>
      </div>
      {Object.keys(node.children).length > 0 && (
        <div className="ml-6 pl-4 border-l border-gray-300">
          {Object.values(node.children).map(child => (
            <TreeNode 
              key={child.fullPath} 
              node={child} 
              selectedParts={selectedParts} 
              setSelectedParts={setSelectedParts} 
              globalSelectedParts={globalSelectedParts} 
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function PartSelector({ modelParts, selectedParts, setSelectedParts, globalSelectedParts }) {
  const tree = buildTree(modelParts);

  return (
    <div className="max-h-48 overflow-y-auto">
      {Object.values(tree).map(node => (
        <TreeNode key={node.fullPath} node={node} selectedParts={selectedParts} setSelectedParts={setSelectedParts} globalSelectedParts={globalSelectedParts} />
      ))}
    </div>
  );
} 