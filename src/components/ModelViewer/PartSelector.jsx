import React, { useState, useMemo } from 'react';
import { buildTree, filterTree } from '../../utils/treeUtils';
import TreeNode from './PartSelector/TreeNode';
import SearchInput from './PartSelector/SearchInput';

/**
 * Component for selecting parts from a hierarchical structure
 */
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
        <SearchInput 
          searchQuery={searchQuery} 
          setSearchQuery={setSearchQuery} 
        />
        
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
      
      <div className="max-h-[40vh] overflow-y-auto pr-1 -mr-1 space-y-1">
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
          <div className="text-center py-4 text-gray-500 italic">
            {searchQuery ? 'Нет результатов по запросу' : 'Нет доступных частей'}
          </div>
        )}
      </div>
    </div>
  );
} 