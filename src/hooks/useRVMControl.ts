import { useState, useEffect, useRef, useCallback } from 'react';

// ============================================
// TYPES
// ============================================
export interface RVMConfig {
  device: {
    id: string;
  };
  backend: {
    url: string;
    validateEndpoint: string;
    timeout: number;
  };
  local: {
    baseUrl: string;
    wsUrl: string;
    timeout: number;
  };
  motors: {
    belt: {
      toWeight: { motorId: string; type: string };
      toStepper: { motorId: string; type: string };
      reverse: { motorId: string; type: string };
      stop: { motorId: string; type: string };
    };
    compactor: {
      start: { motorId: string; type: string };
      stop: { motorId: string; type: string };
    };
    stepper: {
      moduleId: string;
      positions: {
        home: string;
        metalCan: string;
        plasticBottle: string;
      };
    };
  };
  detection: {
    METAL_CAN: number;
    PLASTIC_BOTTLE: number;
    GLASS: number;
    retryDelay: number;
    maxRetries: number;
    minValidWeight: number;
  };
  timing: {
    beltToWeight: number;
    beltToStepper: number;
    beltReverse: number;
    stepperRotate: number;
    stepperReset: number;
    compactor: number;
    gateOperation: number;
    autoPhotoDelay: number;
    sessionTimeout: number;
    sessionMaxDuration: number;
  };
  weight: {
    coefficients: { [key: number]: number };
  };
}

export interface UserData {
  userId: string;
  name?: string;
  username?: string;
  email?: string;
  sessionCode: string;
}

export interface ItemData {
  itemNumber: number;
  material: string;
  weight: number;
  confidence: number;
  timestamp: string;
}

export interface SessionSummary {
  itemsProcessed: number;
  totalWeight: number;
  userId: string | null;
  sessionCode: string | null;
  duration: number;
}

export interface ItemCounts {
  pet: number;
  aluminum: number;
  steel: number;
}

export type RVMStatus = 'idle' | 'ready' | 'processing' | 'active' | 'rejecting' | 'error';

// ============================================
// DEFAULT CONFIGURATION
// ============================================
const DEFAULT_CONFIG: RVMConfig = {
  device: {
    id: 'RVM-3101'
  },
  backend: {
    url: 'https://rebit-api.ceewen.xyz',
    validateEndpoint: '/api/rvm/RVM-3101/qr/validate',
    timeout: 10000
  },
  local: {
    baseUrl: 'http://localhost:8081',
    wsUrl: 'ws://localhost:8081/websocket/qazwsx1234',
    timeout: 10000
  },
  motors: {
    belt: {
      toWeight: { motorId: "02", type: "02" },
      toStepper: { motorId: "02", type: "03" },
      reverse: { motorId: "02", type: "01" },
      stop: { motorId: "02", type: "00" }
    },
    compactor: {
      start: { motorId: "04", type: "01" },
      stop: { motorId: "04", type: "00" }
    },
    stepper: {
      moduleId: '09',
      positions: { home: '01', metalCan: '02', plasticBottle: '03' }
    }
  },
  detection: {
    METAL_CAN: 0.22,
    PLASTIC_BOTTLE: 0.30,
    GLASS: 0.25,
    retryDelay: 2000,
    maxRetries: 3,
    minValidWeight: 5
  },
  timing: {
    beltToWeight: 3000,
    beltToStepper: 4000,
    beltReverse: 5000,
    stepperRotate: 4000,
    stepperReset: 6000,
    compactor: 24000,
    gateOperation: 1000,
    autoPhotoDelay: 5000,
    sessionTimeout: 120000,
    sessionMaxDuration: 600000
  },
  weight: {
    coefficients: { 1: 988, 2: 942, 3: 942, 4: 942 }
  }
};

// ============================================
// CUSTOM HOOK
// ============================================
export const useRVMControl = (config: RVMConfig = DEFAULT_CONFIG) => {
  // State
  const [status, setStatus] = useState<RVMStatus>('idle');
  const [isReady, setIsReady] = useState(false);
  const [moduleId, setModuleId] = useState<string | null>(null);
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionCode, setSessionCode] = useState<string | null>(null);
  const [itemsProcessed, setItemsProcessed] = useState(0);
  const [totalWeight, setTotalWeight] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [itemCounts, setItemCounts] = useState<ItemCounts>({
    pet: 0,
    aluminum: 0,
    steel: 0
  });
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [statusMessage, setStatusMessage] = useState('Initializing...');
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Refs for timers and state that don't need to trigger re-renders
  const wsRef = useRef<WebSocket | null>(null);
  const stateRef = useRef({
    sessionCode: null as string | null,
    currentUserId: null as string | null,
    isMemberSession: false,
    sessionStartTime: null as Date | null,
    sessionTimeoutTimer: null as NodeJS.Timeout | null,
    maxDurationTimer: null as NodeJS.Timeout | null,
    autoPhotoTimer: null as NodeJS.Timeout | null,
    cycleInProgress: false,
    autoCycleEnabled: false,
    awaitingDetection: false,
    detectionRetries: 0,
    aiResult: null as any,
    weight: null as any,
    calibrationAttempts: 0,
    compactorRunning: false,
    compactorTimer: null as NodeJS.Timeout | null,
  });

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const log = useCallback((message: string, type: 'info' | 'success' | 'error' | 'warn' = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] [${type.toUpperCase()}] ${message}`);
  }, []);

  const determineMaterialType = useCallback((aiData: any): string => {
    const className = (aiData.className || '').toLowerCase();
    const probability = aiData.probability || 0;
    
    let materialType = 'UNKNOWN';
    let threshold = 1.0;
    let hasStrongKeyword = false;
    
    if (className.includes('易拉罐') || className.includes('metal') || 
        className.includes('can') || className.includes('铝')) {
      materialType = 'METAL_CAN';
      threshold = config.detection.METAL_CAN;
      hasStrongKeyword = className.includes('易拉罐') || className.includes('铝');
    } 
    else if (className.includes('pet') || className.includes('plastic') || 
             className.includes('瓶') || className.includes('bottle')) {
      materialType = 'PLASTIC_BOTTLE';
      threshold = config.detection.PLASTIC_BOTTLE;
      hasStrongKeyword = className.includes('pet');
    } 
    else if (className.includes('玻璃') || className.includes('glass')) {
      materialType = 'GLASS';
      threshold = config.detection.GLASS;
      hasStrongKeyword = className.includes('玻璃');
    }
    
    const confidencePercent = Math.round(probability * 100);
    
    if (materialType !== 'UNKNOWN' && probability < threshold) {
      const relaxedThreshold = threshold * 0.3;
      if (hasStrongKeyword && probability >= relaxedThreshold) {
        log(`✅ ${materialType} detected via keyword (${confidencePercent}%)`, 'success');
        return materialType;
      }
      log(`⚠️ ${materialType} confidence too low (${confidencePercent}%)`, 'warn');
      return 'UNKNOWN';
    }
    
    if (materialType !== 'UNKNOWN') {
      log(`✅ ${materialType} detected (${confidencePercent}%)`, 'success');
    }
    
    return materialType;
  }, [config.detection, log]);

  // ============================================
  // BACKEND API CALLS
  // ============================================
  const recordItemToBackend = useCallback(async (itemData: ItemData) => {
    const state = stateRef.current;
    if (!state.sessionCode) {
      log('⚠️ No session code, skipping backend record', 'warn');
      return;
    }

    try {
      log(`📤 Recording item to backend: ${itemData.material}`, 'info');
      
      const response = await fetch(
        `${config.backend.url}/api/rvm/session/${state.sessionCode}/item`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            material: itemData.material,
            weight: itemData.weight,
            confidence: itemData.confidence / 100 // Convert back to decimal
          }),
          signal: AbortSignal.timeout(config.backend.timeout)
        }
      );

      const data = await response.json();

      if (data.success) {
        log(`✅ Item recorded to backend: ${data.session.itemsProcessed} items, ${data.session.totalPoints} pts`, 'success');
        
        // Update total points from backend
        setTotalPoints(data.session.totalPoints);
      } else {
        log(`❌ Backend record failed: ${data.error}`, 'error');
      }
    } catch (error: any) {
      log(`❌ Backend API error: ${error.message}`, 'error');
    }
  }, [config.backend, log]);

  // ============================================
  // HARDWARE CONTROL
  // ============================================
  const executeCommand = useCallback(async (action: string, params: any = {}) => {
    const deviceType = 1;
    
    if (!moduleId && action !== 'getModuleId') {
      throw new Error('Module ID not available');
    }
    
    let apiUrl: string;
    let apiPayload: any;
    
    switch (action) {
      case 'openGate':
        apiUrl = `${config.local.baseUrl}/system/serial/motorSelect`;
        apiPayload = { moduleId, motorId: '01', type: '03', deviceType };
        break;
      case 'closeGate':
        apiUrl = `${config.local.baseUrl}/system/serial/motorSelect`;
        apiPayload = { moduleId, motorId: '01', type: '00', deviceType };
        break;
      case 'getWeight':
        apiUrl = `${config.local.baseUrl}/system/serial/getWeight`;
        apiPayload = { moduleId, type: '00' };
        break;
      case 'calibrateWeight':
        apiUrl = `${config.local.baseUrl}/system/serial/weightCalibration`;
        apiPayload = { moduleId, type: '00' };
        break;
      case 'takePhoto':
        apiUrl = `${config.local.baseUrl}/system/camera/process`;
        apiPayload = {};
        break;
      case 'stepperMotor':
        apiUrl = `${config.local.baseUrl}/system/serial/stepMotorSelect`;
        apiPayload = {
          moduleId: config.motors.stepper.moduleId,
          id: params.position,
          type: params.position,
          deviceType
        };
        break;
      case 'customMotor':
        apiUrl = `${config.local.baseUrl}/system/serial/motorSelect`;
        apiPayload = {
          moduleId,
          motorId: params.motorId,
          type: params.type,
          deviceType
        };
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }
    
    log(`🔧 Executing: ${action}`, 'info');
    
    try {
      await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiPayload),
        signal: AbortSignal.timeout(config.local.timeout)
      });
      
      if (action === 'takePhoto') await delay(1500);
      if (action === 'getWeight') await delay(2000);
      
    } catch (error: any) {
      log(`❌ ${action} failed: ${error.message}`, 'error');
      throw error;
    }
  }, [moduleId, config, log, delay]);

  // ============================================
  // COMPACTOR MANAGEMENT
  // ============================================
  const startCompactor = useCallback(async () => {
    const state = stateRef.current;
    
    if (state.compactorRunning) {
      log('⏳ Waiting for compactor...', 'warn');
      const startWait = Date.now();
      while (state.compactorRunning && (Date.now() - startWait) < config.timing.compactor + 5000) {
        await delay(500);
      }
      if (state.compactorRunning) {
        await executeCommand('customMotor', config.motors.compactor.stop);
        state.compactorRunning = false;
      }
    }
    
    log('🎯 Compactor starting (parallel)', 'info');
    state.compactorRunning = true;
    await executeCommand('customMotor', config.motors.compactor.start);
    
    if (state.compactorTimer) clearTimeout(state.compactorTimer);
    
    state.compactorTimer = setTimeout(async () => {
      log('✅ Compactor finished', 'success');
      await executeCommand('customMotor', config.motors.compactor.stop);
      state.compactorRunning = false;
      state.compactorTimer = null;
    }, config.timing.compactor);
  }, [config, executeCommand, delay, log]);

  // ============================================
  // REJECTION CYCLE
  // ============================================
  const executeRejectionCycle = useCallback(async () => {
    const state = stateRef.current;
    
    log('❌ REJECTION CYCLE', 'error');
    setStatus('rejecting');
    setStatusMessage('Item rejected - unrecognized material');
    setIsProcessing(true);

    try {
      await executeCommand('customMotor', config.motors.belt.reverse);
      await delay(config.timing.beltReverse);
      await executeCommand('customMotor', config.motors.belt.stop);
      log('✅ Item rejected', 'success');
    } catch (error: any) {
      log(`❌ Rejection error: ${error.message}`, 'error');
    }

    state.aiResult = null;
    state.weight = null;
    state.detectionRetries = 0;
    state.awaitingDetection = false;
    state.cycleInProgress = false;
    setIsProcessing(false);

    if (state.autoCycleEnabled) {
      setStatus('ready');
      setStatusMessage('Ready for next item');
      
      await executeCommand('openGate');
      await delay(config.timing.gateOperation);
      
      if (state.autoPhotoTimer) clearTimeout(state.autoPhotoTimer);
      state.autoPhotoTimer = setTimeout(() => {
        if (!state.cycleInProgress && !state.awaitingDetection) {
          state.awaitingDetection = true;
          executeCommand('takePhoto');
        }
      }, config.timing.autoPhotoDelay);
    }
  }, [config, executeCommand, delay, log]);

  // ============================================
  // AUTO CYCLE
  // ============================================
  const executeAutoCycle = useCallback(async () => {
    const state = stateRef.current;
    
    if (!state.aiResult || !state.weight || state.weight.weight <= 1) {
      state.cycleInProgress = false;
      setIsProcessing(false);
      return;
    }

    const newItemsProcessed = itemsProcessed + 1;
    const newTotalWeight = totalWeight + state.weight.weight;
    
    setItemsProcessed(newItemsProcessed);
    setTotalWeight(newTotalWeight);
    
    const itemData: ItemData = {
      itemNumber: newItemsProcessed,
      material: state.aiResult.materialType,
      weight: state.weight.weight,
      confidence: state.aiResult.matchRate,
      timestamp: new Date().toISOString()
    };
    
    // Update item counts based on material type
    setItemCounts(prev => {
      const newCounts = { ...prev };
      if (itemData.material === 'PLASTIC_BOTTLE') {
        newCounts.pet++;
      } else if (itemData.material === 'METAL_CAN') {
        newCounts.aluminum++;
      } else if (itemData.material === 'GLASS') {
        newCounts.steel++;
      }
      return newCounts;
    });
    
    log(`🤖 CYCLE #${newItemsProcessed}: ${itemData.material} ${itemData.weight}g`, 'info');
    setStatus('processing');
    setStatusMessage(`Processing ${itemData.material}...`);
    setIsProcessing(true);

    try {
      // Step 1: Belt to Stepper
      await executeCommand('customMotor', config.motors.belt.toStepper);
      await delay(config.timing.beltToStepper);
      await executeCommand('customMotor', config.motors.belt.stop);

      // Step 2: Rotate Stepper
      const targetPosition = itemData.material === 'METAL_CAN' 
        ? config.motors.stepper.positions.metalCan
        : config.motors.stepper.positions.plasticBottle;
      await executeCommand('stepperMotor', { position: targetPosition });
      await delay(config.timing.stepperRotate);

      // Step 3: Reverse Belt
      await executeCommand('customMotor', config.motors.belt.reverse);
      await delay(config.timing.beltReverse);
      await executeCommand('customMotor', config.motors.belt.stop);

      // Step 4: Reset Stepper
      await executeCommand('stepperMotor', { position: config.motors.stepper.positions.home });
      await delay(config.timing.stepperReset);

      // Step 5: Start Compactor (parallel)
      await startCompactor();

      // Step 6: Record to backend
      await recordItemToBackend(itemData);

      log(`✅ CYCLE COMPLETE #${newItemsProcessed}`, 'success');

    } catch (error: any) {
      log(`❌ Cycle error: ${error.message}`, 'error');
      setError(error.message);
    }

    state.aiResult = null;
    state.weight = null;
    state.calibrationAttempts = 0;
    state.cycleInProgress = false;
    state.detectionRetries = 0;
    state.awaitingDetection = false;
    setIsProcessing(false);

    if (state.autoCycleEnabled) {
      setStatus('ready');
      setStatusMessage('Ready for next item');
      
      await executeCommand('openGate');
      await delay(config.timing.gateOperation);
      
      if (state.autoPhotoTimer) clearTimeout(state.autoPhotoTimer);
      state.autoPhotoTimer = setTimeout(() => {
        if (!state.cycleInProgress && !state.awaitingDetection) {
          state.awaitingDetection = true;
          executeCommand('takePhoto');
        }
      }, config.timing.autoPhotoDelay);
    }
  }, [itemsProcessed, totalWeight, config, executeCommand, delay, startCompactor, recordItemToBackend, log]);

  // ============================================
  // SESSION MANAGEMENT
  // ============================================
  const resetInactivityTimer = useCallback(() => {
    const state = stateRef.current;
    
    if (state.sessionTimeoutTimer) clearTimeout(state.sessionTimeoutTimer);
    state.sessionTimeoutTimer = setTimeout(() => {
      handleSessionTimeout('inactivity');
    }, config.timing.sessionTimeout);
  }, [config.timing.sessionTimeout]);

  const startSessionTimers = useCallback(() => {
    const state = stateRef.current;
    
    resetInactivityTimer();
    
    if (state.maxDurationTimer) clearTimeout(state.maxDurationTimer);
    state.maxDurationTimer = setTimeout(() => {
      handleSessionTimeout('max_duration');
    }, config.timing.sessionMaxDuration);
  }, [config.timing.sessionMaxDuration, resetInactivityTimer]);

  const clearSessionTimers = useCallback(() => {
    const state = stateRef.current;
    
    if (state.sessionTimeoutTimer) {
      clearTimeout(state.sessionTimeoutTimer);
      state.sessionTimeoutTimer = null;
    }
    if (state.maxDurationTimer) {
      clearTimeout(state.maxDurationTimer);
      state.maxDurationTimer = null;
    }
  }, []);

  const handleSessionTimeout = useCallback(async (reason: string) => {
    const state = stateRef.current;
    
    log(`⏱️ SESSION TIMEOUT: ${reason}`, 'warn');
    state.autoCycleEnabled = false;
    state.awaitingDetection = false;
    
    if (state.autoPhotoTimer) {
      clearTimeout(state.autoPhotoTimer);
      state.autoPhotoTimer = null;
    }
    
    if (state.cycleInProgress) {
      log('⏳ Waiting for cycle...', 'info');
      const maxWait = 60000;
      const startWait = Date.now();
      while (state.cycleInProgress && (Date.now() - startWait) < maxWait) {
        await delay(1000);
      }
    }
    
    await resetSystemForNextUser(false);
  }, [delay, log]);

  const startSession = useCallback(async (userData: UserData) => {
    const state = stateRef.current;
    
    log(`🎬 SESSION START: ${userData.name || userData.userId}`, 'info');
    
    state.currentUserId = userData.userId;
    state.sessionCode = userData.sessionCode;
    state.isMemberSession = true;
    state.autoCycleEnabled = true;
    state.sessionStartTime = new Date();
    state.detectionRetries = 0;
    state.awaitingDetection = false;
    
    setSessionCode(userData.sessionCode);
    setCurrentUser(userData);
    setSessionActive(true);
    setItemsProcessed(0);
    setTotalWeight(0);
    setTotalPoints(0);
    setItemCounts({ pet: 0, aluminum: 0, steel: 0 });
    setStatus('active');
    setStatusMessage('Session active - Place your bottle');
    
    startSessionTimers();
    
    log('🔧 Initializing...', 'info');
    await executeCommand('customMotor', config.motors.belt.stop);
    
    if (state.compactorRunning) {
      await executeCommand('customMotor', config.motors.compactor.stop);
      if (state.compactorTimer) {
        clearTimeout(state.compactorTimer);
        state.compactorTimer = null;
      }
      state.compactorRunning = false;
    }
    
    await executeCommand('stepperMotor', { position: config.motors.stepper.positions.home });
    await delay(2000);
    
    log('⚖️ Calibrating...', 'info');
    await executeCommand('calibrateWeight');
    await delay(1500);
    
    log('🚪 Opening gate...', 'info');
    await executeCommand('openGate');
    await delay(config.timing.gateOperation);
    
    log('✅ Session active', 'success');
    setStatus('ready');
    setStatusMessage('Ready for item - Place your bottle');
    
    if (state.autoPhotoTimer) clearTimeout(state.autoPhotoTimer);
    state.autoPhotoTimer = setTimeout(() => {
      state.awaitingDetection = true;
      executeCommand('takePhoto');
    }, config.timing.autoPhotoDelay);
  }, [config, executeCommand, delay, startSessionTimers, log]);

  const startGuestSession = useCallback(async () => {
    try {
      setError(null);
      setStatus('active');
      setStatusMessage('Starting guest session...');
      setIsProcessing(true);
  
      log('🎬 Starting GUEST session...', 'info');
      
      const url = `${config.backend.url}/api/rvm/${config.device.id}/guest/start`;
      log(`📡 Calling: ${url}`, 'info');
  
      const response = await fetch(url, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(config.backend.timeout)
      });
  
      log(`📡 Response status: ${response.status}`, 'info');
      log(`📡 Response headers: ${JSON.stringify(Object.fromEntries(response.headers))}`, 'info');
  
      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const textResponse = await response.text();
        log(`❌ Non-JSON response: ${textResponse.substring(0, 200)}`, 'error');
        throw new Error(`Server returned non-JSON response (${response.status}): ${textResponse.substring(0, 100)}`);
      }
  
      const data = await response.json();
      log(`📡 Response data: ${JSON.stringify(data)}`, 'info');
  
      if (data.success) {
        const state = stateRef.current;
        
        state.sessionCode = data.session.sessionCode;
        state.currentUserId = null;
        state.isMemberSession = false;
        state.autoCycleEnabled = true;
        state.sessionStartTime = new Date();
        state.detectionRetries = 0;
        state.awaitingDetection = false;
        
        setSessionCode(data.session.sessionCode);
        setSessionActive(true);
        setItemsProcessed(0);
        setTotalWeight(0);
        setTotalPoints(0);
        setItemCounts({ pet: 0, aluminum: 0, steel: 0 });
        
        log(`✅ Guest session created: ${data.session.sessionCode}`, 'success');
        
        startSessionTimers();
        
        // Initialize hardware
        log('🔧 Initializing hardware...', 'info');
        await executeCommand('customMotor', config.motors.belt.stop);
        
        if (state.compactorRunning) {
          await executeCommand('customMotor', config.motors.compactor.stop);
          if (state.compactorTimer) {
            clearTimeout(state.compactorTimer);
            state.compactorTimer = null;
          }
          state.compactorRunning = false;
        }
        
        await executeCommand('stepperMotor', { position: config.motors.stepper.positions.home });
        await delay(2000);
        
        log('⚖️ Calibrating weight...', 'info');
        await executeCommand('calibrateWeight');
        await delay(1500);
        
        log('🚪 Opening gate...', 'info');
        await executeCommand('openGate');
        await delay(config.timing.gateOperation);
        
        setStatus('ready');
        setStatusMessage('Ready - Place your recyclables');
        setIsProcessing(false);
        
        // Start auto detection
        if (state.autoPhotoTimer) clearTimeout(state.autoPhotoTimer);
        state.autoPhotoTimer = setTimeout(() => {
          state.awaitingDetection = true;
          executeCommand('takePhoto');
        }, config.timing.autoPhotoDelay);
        
        log('✅ Guest session ready', 'success');
        
        return {
          success: true,
          sessionCode: data.session.sessionCode,
          sessionId: data.session.sessionId,
        };
      } else {
        setError(data.error || 'Failed to start session');
        setIsProcessing(false);
        log(`❌ Guest session failed: ${data.error}`, 'error');
        return { success: false, error: data.error };
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Network error';
      setError(errorMsg);
      setIsProcessing(false);
      log(`❌ Guest session error: ${errorMsg}`, 'error');
      console.error('Full error:', err);
      return { success: false, error: errorMsg };
    }
  }, [config, executeCommand, delay, startSessionTimers, log]);

  const resetSystemForNextUser = useCallback(async (forceStop: boolean = false) => {
    const state = stateRef.current;
    
    log('🔄 RESET SYSTEM', 'info');
    
    state.autoCycleEnabled = false;
    state.awaitingDetection = false;
    
    if (state.autoPhotoTimer) {
      clearTimeout(state.autoPhotoTimer);
      state.autoPhotoTimer = null;
    }
    
    try {
      if (state.compactorRunning) {
        if (forceStop) {
          await executeCommand('customMotor', config.motors.compactor.stop);
          if (state.compactorTimer) {
            clearTimeout(state.compactorTimer);
            state.compactorTimer = null;
          }
          state.compactorRunning = false;
        } else {
          log('⏳ Waiting for compactor...', 'info');
          const maxWait = config.timing.compactor + 2000;
          const startWait = Date.now();
          while (state.compactorRunning && (Date.now() - startWait) < maxWait) {
            await delay(1000);
          }
          if (state.compactorRunning) {
            await executeCommand('customMotor', config.motors.compactor.stop);
            if (state.compactorTimer) {
              clearTimeout(state.compactorTimer);
              state.compactorTimer = null;
            }
            state.compactorRunning = false;
          }
        }
      }
      
      await executeCommand('closeGate');
      await delay(config.timing.gateOperation);
      await executeCommand('customMotor', config.motors.belt.stop);
      
    } catch (error: any) {
      log(`❌ Reset error: ${error.message}`, 'error');
    }
    
    const sessionSummary: SessionSummary = {
      itemsProcessed,
      totalWeight,
      userId: state.currentUserId,
      sessionCode: state.sessionCode,
      duration: state.sessionStartTime ? Date.now() - state.sessionStartTime.getTime() : 0
    };
    
    state.aiResult = null;
    state.weight = null;
    state.currentUserId = null;
    state.sessionCode = null;
    state.sessionStartTime = null;
    state.isMemberSession = false;
    
    clearSessionTimers();
    
    setSessionCode(null);
    setCurrentUser(null);
    setSessionActive(false);
    setItemsProcessed(0);
    setTotalWeight(0);
    setTotalPoints(0);
    setItemCounts({ pet: 0, aluminum: 0, steel: 0 });
    setStatus('ready');
    setStatusMessage('System ready');
    
    log('✅ READY', 'success');
    
    return sessionSummary;
  }, [itemsProcessed, totalWeight, config, executeCommand, delay, clearSessionTimers, log]);

  const endSession = useCallback(async () => {
    const state = stateRef.current;
    
    if (!state.sessionCode) {
      log('⚠️ No active session to end', 'warn');
      return { success: false, error: 'No active session' };
    }

    try {
      setIsProcessing(true);
      setStatus('processing');
      setStatusMessage('Ending session...');
      
      log('🏁 Ending session...', 'info');
      
      // Wait for any ongoing cycle to complete
      if (state.cycleInProgress) {
        log('⏳ Waiting for cycle to complete...', 'info');
        const maxWait = 60000;
        const startWait = Date.now();
        while (state.cycleInProgress && (Date.now() - startWait) < maxWait) {
          await delay(1000);
        }
      }

      // Call backend to end session
      const response = await fetch(
        `${config.backend.url}/api/rvm/local/session/end`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionCode: state.sessionCode,
            deviceId: config.device.id,
          }),
          signal: AbortSignal.timeout(config.backend.timeout)
        }
      );

      const data = await response.json();

      if (data.success) {
        log(`✅ Session ended: ${data.summary.totalPoints} points`, 'success');
        
        // Reset hardware
        await resetSystemForNextUser(false);
        
        setIsProcessing(false);
        
        return {
          success: true,
          qrCode: data.qrCode, // QR code from backend (for guest sessions)
          summary: data.summary,
          message: data.message,
        };
      } else {
        setError(data.error || 'Failed to end session');
        setIsProcessing(false);
        log(`❌ End session failed: ${data.error}`, 'error');
        return { success: false, error: data.error };
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Network error';
      setError(errorMsg);
      setIsProcessing(false);
      log(`❌ End session error: ${errorMsg}`, 'error');
      return { success: false, error: errorMsg };
    }
  }, [config, delay, resetSystemForNextUser, log]);

  const emergencyStop = useCallback(async () => {
    const state = stateRef.current;
    
    log('🚨 EMERGENCY STOP', 'error');
    state.autoCycleEnabled = false;
    state.cycleInProgress = false;
    
    await executeCommand('closeGate');
    await executeCommand('customMotor', config.motors.belt.stop);
    
    if (state.compactorRunning) {
      await executeCommand('customMotor', config.motors.compactor.stop);
      state.compactorRunning = false;
    }
    
    setStatus('error');
    setStatusMessage('Emergency stop activated');
  }, [config, executeCommand, log]);

  // ============================================
  // WEBSOCKET
  // ============================================
  const connectWebSocket = useCallback(() => {
    log('🔌 Connecting WebSocket...', 'info');
    
    const ws = new WebSocket(config.local.wsUrl);
    wsRef.current = ws;
    
    ws.onopen = () => {
      log('✅ WebSocket connected', 'success');
    };
    
    ws.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data);
        const state = stateRef.current;
        
        // Module ID
        if (message.function === '01') {
          setModuleId(message.moduleId);
          setIsReady(true);
          setStatus('ready');
          setStatusMessage('System ready');
          log(`📟 Module ID: ${message.moduleId}`, 'info');
          return;
        }
        
        // AI Photo Result
        if (message.function === 'aiPhoto') {
          const aiData = JSON.parse(message.data);
          const materialType = determineMaterialType(aiData);
          
          state.aiResult = {
            matchRate: Math.round((aiData.probability || 0) * 100),
            materialType: materialType,
            className: aiData.className,
            timestamp: new Date().toISOString()
          };
          
          log(`🤖 AI: ${materialType} (${state.aiResult.matchRate}%)`, 'info');
          
          if (state.autoCycleEnabled && state.awaitingDetection) {
            if (state.aiResult.materialType !== 'UNKNOWN') {
              state.detectionRetries = 0;
              state.awaitingDetection = false;
              setTimeout(() => executeCommand('getWeight'), 500);
            } else {
              state.detectionRetries++;
              if (state.detectionRetries < config.detection.maxRetries) {
                setTimeout(() => executeCommand('takePhoto'), config.detection.retryDelay);
              } else {
                state.awaitingDetection = false;
                state.cycleInProgress = true;
                setTimeout(() => executeRejectionCycle(), 1000);
              }
            }
          }
          return;
        }
        
        // Weight Result
        if (message.function === '06') {
          const weightValue = parseFloat(message.data) || 0;
          const coefficient = config.weight.coefficients[1];
          const calibratedWeight = weightValue * (coefficient / 1000);
          
          state.weight = {
            weight: Math.round(calibratedWeight * 10) / 10,
            rawWeight: weightValue,
            timestamp: new Date().toISOString()
          };
          
          log(`⚖️ ${state.weight.weight}g`, 'info');
          
          if (state.weight.weight <= 0 && state.calibrationAttempts < 2) {
            state.calibrationAttempts++;
            setTimeout(async () => {
              await executeCommand('calibrateWeight');
              setTimeout(() => executeCommand('getWeight'), 1000);
            }, 500);
            return;
          }
          
          if (state.weight.weight > 0) state.calibrationAttempts = 0;
          
          if (state.autoCycleEnabled && state.aiResult && !state.cycleInProgress) {
            if (state.weight.weight < config.detection.minValidWeight) {
              log(`⚠️ Weight too low: ${state.weight.weight}g`, 'warn');
              state.aiResult = null;
              state.weight = null;
              state.awaitingDetection = false;
              
              if (state.autoPhotoTimer) clearTimeout(state.autoPhotoTimer);
              state.autoPhotoTimer = setTimeout(() => {
                if (!state.cycleInProgress && !state.awaitingDetection) {
                  state.awaitingDetection = true;
                  executeCommand('takePhoto');
                }
              }, config.timing.autoPhotoDelay);
              return;
            }
            
            state.cycleInProgress = true;
            setTimeout(() => executeAutoCycle(), 1000);
          }
          return;
        }
        
        // Device Status
        if (message.function === 'deviceStatus') {
          const code = parseInt(message.data) || -1;
          if (code >= 0 && code <= 3) {
            const bins = ['PET', 'Metal', 'Right', 'Glass'];
            log(`⚠️ Bin full: ${bins[code]}`, 'warn');
          }
          if (code === 4 && state.autoCycleEnabled && !state.cycleInProgress && !state.awaitingDetection) {
            log('👁️ Object detected', 'info');
            state.awaitingDetection = true;
            if (state.autoPhotoTimer) clearTimeout(state.autoPhotoTimer);
            setTimeout(() => executeCommand('takePhoto'), 1000);
          }
        }
        
      } catch (error: any) {
        log(`❌ WS error: ${error.message}`, 'error');
      }
    };
    
    ws.onclose = () => {
      log('⚠️ WS closed, reconnecting...', 'warn');
      setTimeout(connectWebSocket, 5000);
    };
    
    ws.onerror = () => {
      log('❌ WS connection error', 'error');
    };
  }, [config, log, determineMaterialType, executeCommand, executeAutoCycle, executeRejectionCycle]);

  const requestModuleId = useCallback(async () => {
    try {
      await fetch(`${config.local.baseUrl}/system/serial/getModuleId`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
        signal: AbortSignal.timeout(5000)
      });
      log('📟 Module ID requested', 'info');
    } catch (error: any) {
      log(`❌ Module ID request failed: ${error.message}`, 'error');
    }
  }, [config, log]);

  // ============================================
  // INITIALIZATION
  // ============================================
  useEffect(() => {
    log('========================================', 'info');
    log('🚀 RVM CONTROL SYSTEM STARTING...', 'info');
    log('========================================', 'info');
    
    connectWebSocket();
    
    const moduleIdTimer = setTimeout(() => {
      requestModuleId();
    }, 2000);
    
    return () => {
      clearTimeout(moduleIdTimer);
      if (wsRef.current) {
        wsRef.current.close();
      }
      clearSessionTimers();
    };
  }, [connectWebSocket, requestModuleId, clearSessionTimers, log]);

  // ============================================
  // RETURN API
  // ============================================
  return {
    // State
    status,
    isReady,
    sessionActive,
    sessionCode,
    itemsProcessed,
    totalWeight,
    totalPoints,
    itemCounts,
    currentUser,
    statusMessage,
    error,
    setError,
    isProcessing,
    
    // Actions
    startSession,
    startGuestSession,
    endSession,
    emergencyStop,
  };
};