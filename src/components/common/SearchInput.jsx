import React from 'react';

/**
 * Reusable search input component with clear button
 * @param {Object} props Component props
 * @param {string} props.searchQuery Current search query
 * @param {Function} props.setSearchQuery Function to update search query
 * @param {string} [props.placeholder="Search..."] Placeholder text
 * @param {string} [props.className=""] Additional CSS classes
 */
function SearchInput({ 
  searchQuery, 
  setSearchQuery, 
  placeholder = "Search...", 
  className = "" 
}) {
  return (
    <div className={`relative ${className}`}>
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder={placeholder}
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
  );
}

export default SearchInput; 