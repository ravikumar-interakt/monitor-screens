import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRVMControl } from '../hooks/useRVMControl';

// ============================================
// TYPES
// ============================================
type RVMControlType = ReturnType<typeof useRVMControl>;

interface RVMContextValue extends RVMControlType {
  systemReady: boolean;
}

// ============================================
// CONTEXT
// ============================================
const RVMContext = createContext<RVMContextValue | null>(null);

// ============================================
// PROVIDER COMPONENT
// ============================================
export const RVMProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const rvmControl = useRVMControl();
  const [systemReady, setSystemReady] = useState(false);
  const [initializationStage, setInitializationStage] = useState('Connecting...');

  useEffect(() => {
    // Track initialization stages for better UX
    if (!rvmControl.isReady) {
      setInitializationStage('Connecting to hardware...');
    } else if (rvmControl.status === 'idle') {
      setInitializationStage('Initializing modules...');
    } else if (rvmControl.status === 'ready') {
      setInitializationStage('System ready!');
      // Small delay to show "ready" message before hiding splash
      setTimeout(() => {
        setSystemReady(true);
        console.log('✅ RVM System fully initialized and ready for operations');
      }, 500);
    }
  }, [rvmControl.isReady, rvmControl.status]);

  // Show initialization splash screen while system is starting up
  if (!systemReady) {
    return (
      <div className="w-screen h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          {/* Logo or Branding */}
          <div className="mb-8">
            <div className="w-24 h-24 mx-auto bg-[#14b8a6] rounded-full flex items-center justify-center shadow-2xl">
              <div className="text-white text-4xl font-bold">R</div>
            </div>
          </div>

          {/* Animated Spinner */}
          <div className="mb-6">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#14b8a6] mx-auto"></div>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-[#1e3a52] mb-3">
            ReBit RVM System
          </h1>

          {/* Status Message */}
          <p className="text-xl text-gray-700 font-medium mb-2">
            {initializationStage}
          </p>

          {/* Detailed Status */}
          <p className="text-sm text-gray-500">
            {rvmControl.statusMessage || 'Please wait...'}
          </p>

          {/* Error Display */}
          {rvmControl.error && (
            <div className="mt-6 px-4 py-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              <p className="font-semibold mb-1">Initialization Error</p>
              <p className="text-sm">{rvmControl.error}</p>
            </div>
          )}

          {/* Loading Progress Indicator */}
          {!rvmControl.error && (
            <div className="mt-8">
              <div className="flex justify-center gap-2">
                <div className={`h-2 w-2 rounded-full ${rvmControl.isReady ? 'bg-[#14b8a6]' : 'bg-gray-300'}`}></div>
                <div className={`h-2 w-2 rounded-full ${rvmControl.status === 'ready' ? 'bg-[#14b8a6]' : 'bg-gray-300'}`}></div>
                <div className={`h-2 w-2 rounded-full ${systemReady ? 'bg-[#14b8a6]' : 'bg-gray-300'}`}></div>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                System Initialization
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // System is ready - render the app
  return (
    <RVMContext.Provider value={{ ...rvmControl, systemReady }}>
      {children}
    </RVMContext.Provider>
  );
};

// ============================================
// CUSTOM HOOK TO USE RVM CONTEXT
// ============================================
export const useRVM = (): RVMContextValue => {
  const context = useContext(RVMContext);
  
  if (!context) {
    throw new Error(
      '❌ useRVM must be used within RVMProvider. ' +
      'Wrap your app with <RVMProvider> in App.tsx'
    );
  }
  
  return context;
};

// ============================================
// EXPORT DEFAULT
// ============================================
export default RVMProvider;