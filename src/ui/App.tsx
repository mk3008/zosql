import React from 'react';
import { Layout } from './components/Layout';
import { WorkspaceProvider } from './context/WorkspaceContext';
import { EditorProvider } from './context/EditorContext';

export const App: React.FC = () => {
  // Check if we're on the /demo path
  const isDemoPath = window.location.pathname === '/demo' || 
                     window.location.pathname.startsWith('/demo/');
  
  // If demo path is requested, always show demo workspace
  const [forceDemo] = React.useState(isDemoPath);
  
  return (
    <WorkspaceProvider forceDemo={forceDemo}>
      <EditorProvider>
        <div className="h-screen w-screen overflow-hidden bg-dark-primary text-dark-text-primary">
          <Layout forceDemo={forceDemo} />
        </div>
      </EditorProvider>
    </WorkspaceProvider>
  );
};