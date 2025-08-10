import React from 'react';
import { Layout } from './components/Layout';
import { WorkspaceProvider } from './context/WorkspaceContext';
import { EditorProvider } from './context/EditorContext';

export const App: React.FC = () => {
  // Check for demo mode using hash-based routing or query parameters
  const checkDemoMode = () => {
    const hash = window.location.hash;
    const search = window.location.search;
    
    return hash === '#demo' || 
           hash.startsWith('#demo') ||
           search.includes('mode=demo') ||
           search.includes('demo=true') ||
           // Legacy support for path-based routing (for backward compatibility)
           window.location.pathname === '/demo' || 
           window.location.pathname.startsWith('/demo/');
  };
  
  // If demo mode is requested, always show demo workspace
  const [forceDemo] = React.useState(checkDemoMode());
  
  // Update page title for demo mode
  React.useEffect(() => {
    document.title = forceDemo ? 'zosql[demo]' : 'zosql';
  }, [forceDemo]);
  
  return (
    <WorkspaceProvider>
      <EditorProvider>
        <div className="h-screen w-screen overflow-hidden bg-dark-primary text-dark-text-primary">
          <Layout forceDemo={forceDemo} />
        </div>
      </EditorProvider>
    </WorkspaceProvider>
  );
};