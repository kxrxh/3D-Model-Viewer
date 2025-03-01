import React, { useState, useRef, useEffect } from 'react';

const SideMenu = ({ children, title = '', initialPosition = { x: 20, y: 20 }, width = 320, minHeight = 200, isCollapsible = true, className = '' }) => {
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const menuRef = useRef(null);
  const headerRef = useRef(null);

  // Handle dragging
  const handleMouseDown = (e) => {
    if (headerRef.current && headerRef.current.contains(e.target)) {
      setIsDragging(true);
      const rect = menuRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      // Calculate new position with boundary checks
      const newX = Math.max(0, Math.min(window.innerWidth - (menuRef.current?.offsetWidth || 320), e.clientX - dragOffset.x));
      const newY = Math.max(0, Math.min(window.innerHeight - 40, e.clientY - dragOffset.y));
      
      setPosition({ x: newX, y: newY });
    }
  };

  // Add and remove event listeners
  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  // Prevent menu from going off-screen on window resize
  useEffect(() => {
    const handleResize = () => {
      if (menuRef.current) {
        setPosition(prev => ({
          x: Math.min(prev.x, window.innerWidth - menuRef.current.offsetWidth),
          y: Math.min(prev.y, window.innerHeight - 40)
        }));
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div
      ref={menuRef}
      className={`fixed z-30 ${className} ${isDragging ? 'cursor-grabbing select-none' : ''}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${width}px`,
        opacity: isDragging ? 0.8 : 1,
        transition: isDragging ? 'none' : 'opacity 0.2s, box-shadow 0.2s'
      }}
    >
      <div 
        className={`bg-white rounded-lg shadow-xl border border-gray-200
                   flex flex-col overflow-hidden transform transition-all duration-300
                   ${isDragging ? 'shadow-2xl scale-[1.01]' : ''}`}
      >
        {/* Header / Drag handle */}
        <div
          ref={headerRef}
          className="px-4 py-3 bg-red-700 text-white flex items-center justify-between cursor-grab"
          onMouseDown={handleMouseDown}
        >
          <h3 className="font-medium text-sm truncate">{title}</h3>
          <div className="flex items-center space-x-2">
            {isCollapsible && (
              <button 
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="p-1 rounded-full hover:bg-red-600 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isCollapsed ? "M19 9l-7 7-7-7" : "M5 15l7-7 7 7"} />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div 
          className="overflow-y-auto transition-all duration-300 ease-in-out"
          style={{ 
            maxHeight: isCollapsed ? '0' : '70vh',
            minHeight: isCollapsed ? '0' : minHeight,
            padding: isCollapsed ? '0 1rem' : '1rem',
            opacity: isCollapsed ? 0 : 1,
            pointerEvents: isCollapsed ? 'none' : 'auto'
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

export default SideMenu;