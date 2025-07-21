import React, { useState, useRef } from 'react';
import { Header } from './Header';
import { LeftSidebar } from './LeftSidebar';
import { MainContent, MainContentRef } from './MainContent';
import { RightSidebar } from './RightSidebar';

export const Layout: React.FC = () => {
  const [leftSidebarVisible, setLeftSidebarVisible] = useState(true);
  const [rightSidebarVisible, setRightSidebarVisible] = useState(true);
  const mainContentRef = useRef<MainContentRef>(null);

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col">
      {/* Header */}
      <Header 
        onToggleLeftSidebar={() => setLeftSidebarVisible(!leftSidebarVisible)}
        onToggleRightSidebar={() => setRightSidebarVisible(!rightSidebarVisible)}
        leftSidebarVisible={leftSidebarVisible}
        rightSidebarVisible={rightSidebarVisible}
      />
      
      {/* Main Container */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        {leftSidebarVisible && (
          <LeftSidebar 
            onOpenValuesTab={() => mainContentRef.current?.openValuesTab()} 
            onOpenFormatterTab={() => mainContentRef.current?.openFormatterTab()}
          />
        )}
        
        {/* Main Content Area */}
        <MainContent ref={mainContentRef} />
        
        {/* Right Sidebar */}
        {rightSidebarVisible && (
          <RightSidebar />
        )}
      </div>
    </div>
  );
};