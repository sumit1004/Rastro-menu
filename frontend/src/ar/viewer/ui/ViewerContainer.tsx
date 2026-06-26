import React from 'react';

/**
 * @module ViewerContainer
 * @description Responsive fullscreen React container preventing browser overscroll.
 * 
 * @dependencies None
 * @notes Architecture scaffolding only. No implementation.
 */
export const ViewerContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div 
      className="viewer-container" 
      style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        width: '100vw', 
        height: '100dvh', 
        overflow: 'hidden', 
        overscrollBehavior: 'none', // Prevents browser bounce
        touchAction: 'none' // Prevents native zooming/scrolling
      }}
    >
      {/* Scaffold: children goes here */}
      {children}
    </div>
  );
};
