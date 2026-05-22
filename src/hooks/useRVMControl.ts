import { keys } from '../config';
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
    minConfidenceRetry: number;
    positionBeforePhoto: boolean;
  };
  timing: {
    beltToWeight: number;
    beltToStepper: number;
    beltReverse: number;
    stepperRotate: number;
    stepperReset: number;
    compactorIdleStop: number;
    positionSettle: number;
    gateOperation: number;
    autoPhotoDelay: number;
    sessionTimeout: number;
    sessionMaxDuration: number;
    weightDelay: number;
    photoDelay: number;
    calibrationDelay: number;
    commandDelay: number;
    resetHomeDelay: number;
    itemDropDelay: number;
    photoPositionDelay: number;
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
  materialName: string;
  count: number;
}

export interface BinStatus {
  plastic: boolean;
  metal: boolean;
  right: boolean;
  glass: boolean;
}

export interface DetectionStats {
  totalAttempts: number;
  firstTimeSuccess: number;
  secondTimeSuccess: number;
  thirdTimeSuccess: number;
  failures: number;
  averageRetries: number;
  lastSuccessfulTiming: { retries: number; timestamp: string } | null;
  positioningHelped: number;
}

export type RVMStatus = 'idle' | 'ready' | 'processing' | 'active' | 'rejecting' | 'error';

// ============================================
// DYNAMIC DEVICE ID
// ============================================
const DEVICE_ID: string =
  (typeof process !== 'undefined' && process.env?.REACT_APP_DEVICE_ID) ||
  (keys as any)?.device_id ||
  'RVM-3102';

// ============================================
// DEFAULT CONFIGURATION
// ============================================
const DEFAULT_CONFIG: RVMConfig = {
  device: {
    id: DEVICE_ID,
  },
  backend: {
    url: 'https://app.rebit-japan.com',
    validateEndpoint: `/api/rvm/${DEVICE_ID}/qr/validate`,
    timeout: 8000,
  },
  local: {
    baseUrl: 'http://localhost:8081',
    wsUrl: 'ws://localhost:8081/websocket/qazwsx1234',
    timeout: 8000,
  },
  motors: {
    belt: {
      toWeight: { motorId: '02', type: '02' },
      toStepper: { motorId: '02', type: '03' },
      reverse: { motorId: '02', type: '01' },
      stop: { motorId: '02', type: '00' },
    },
    compactor: {
      start: { motorId: '04', type: '01' },
      stop: { motorId: '04', type: '00' },
    },
    stepper: {
      moduleId: '09',
      positions: { home: '01', metalCan: '02', plasticBottle: '03' },
    },
  },
  detection: {
    METAL_CAN: 0.65,
    PLASTIC_BOTTLE: 0.65,
    GLASS: 0.65,
    retryDelay: 1500,
    maxRetries: 2,
    minValidWeight: 2,
    minConfidenceRetry: 0.50,
    positionBeforePhoto: true,
  },
  timing: {
    beltToWeight: 1800,
    beltToStepper: 1800,
    beltReverse: 3500,
    stepperRotate: 2200,
    stepperReset: 2200,
    compactorIdleStop: 20000,
    positionSettle: 100,
    gateOperation: 600,
    autoPhotoDelay: 2500,
    sessionTimeout: 300000,
    sessionMaxDuration: 600000,
    weightDelay: 600,
    photoDelay: 300,
    calibrationDelay: 800,
    commandDelay: 100,
    resetHomeDelay: 1000,
    itemDropDelay: 300,
    photoPositionDelay: 100,
  },
  weight: {
    coefficients: { 1: 988, 2: 942, 3: 942, 4: 942 },
  },
};

// ============================================
// CUSTOM HOOK
// ============================================
export const useRVMControl = (config: RVMConfig = DEFAULT_CONFIG) => {
  const [status, setStatus] = useState<RVMStatus>('idle');
  const [isReady, setIsReady] = useState(true);
  const [moduleId, setModuleId] = useState<string | null>('09');
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionCode, setSessionCode] = useState<string | null>(null);
  const [itemsProcessed, setItemsProcessed] = useState(0);
  const [totalWeight, setTotalWeight] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [itemCounts, setItemCounts] = useState<ItemCounts[]>([]);
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [statusMessage, setStatusMessage] = useState('Initializing...');
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [binStatus, setBinStatus] = useState<BinStatus>({
    plastic: false,
    metal: false,
    right: false,
    glass: false,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const moduleIdRef = useRef<string | null>('09');
  const itemsProcessedRef = useRef(0);
  const totalWeightRef = useRef(0);

  const stateRef = useRef({
    sessionCode: null as string | null,
    currentUserId: null as string | null,
    isMemberSession: false,
    sessionStartTime: null as Date | null,
    sessionTimeoutTimer: null as ReturnType<typeof setTimeout> | null,
    maxDurationTimer: null as ReturnType<typeof setTimeout> | null,
    autoPhotoTimer: null as ReturnType<typeof setTimeout> | null,
    cycleInProgress: false,
    autoCycleEnabled: false,
    awaitingDetection: false,
    detectionRetries: 0,
    aiResult: null as any,
    weight: null as any,
    calibrationAttempts: 0,
    resetting: false,
    itemAlreadyPositioned: false,
    compactorRunning: false,
    compactorTimer: null as ReturnType<typeof setTimeout> | null,
    compactorIdleTimer: null as ReturnType<typeof setTimeout> | null,
    lastItemTime: null as number | null,
    binStatus: {
      plastic: false,
      metal: false,
      right: false,
      glass: false,
    } as BinStatus,
    lastCycleTime: null as number | null,
    averageCycleTime: null as number | null,
    cycleCount: 0,
    sessionCount: 0,
    detectionStats: {
      totalAttempts: 0,
      firstTimeSuccess: 0,
      secondTimeSuccess: 0,
      thirdTimeSuccess: 0,
      failures: 0,
      averageRetries: 0,
      lastSuccessfulTiming: null,
      positioningHelped: 0,
    } as DetectionStats,
  });

  useEffect(() => { moduleIdRef.current = moduleId; }, [moduleId]);

  // ============================================
  // UTILITY
  // ============================================
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const log = useCallback((message: string, type: 'info' | 'success' | 'error' | 'warn' | 'debug' | 'perf' | 'crusher' | 'camera' | 'detection' = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] [${type.toUpperCase()}] ${message}`);
  }, []);

  const parseWeight = useCallback((rawValue: number) => {
    const coefficient = config.weight.coefficients[1];
    const calibratedWeight = rawValue * (coefficient / 1000);
    return {
      weight: Math.round(calibratedWeight * 10) / 10,
      rawWeight: rawValue,
      coefficient,
      timestamp: new Date().toISOString(),
    };
  }, [config.weight.coefficients]);

  const waitForWeight = useCallback(async (timeoutMs: number = 2000): Promise<any> => {
    const s = stateRef.current;
    const pollInterval = 100;
    let elapsed = 0;
    while (elapsed < timeoutMs) {
      if (s.weight !== null) return s.weight;
      await delay(pollInterval);
      elapsed += pollInterval;
    }
    return null;
  }, []);

  // ============================================
  // CYCLE TIMING & DETECTION STATS
  // ============================================
  const trackCycleTime = useCallback((startTime: number) => {
    const s = stateRef.current;
    const cycleTime = Date.now() - startTime;
    s.lastCycleTime = cycleTime;
    s.cycleCount++;
    if (s.averageCycleTime === null) {
      s.averageCycleTime = cycleTime;
    } else {
      s.averageCycleTime = (s.averageCycleTime * (s.cycleCount - 1) + cycleTime) / s.cycleCount;
    }
    log(`⏱️ Cycle time: ${cycleTime}ms (avg: ${Math.round(s.averageCycleTime)}ms)`, 'perf');
  }, [log]);

  const trackDetectionAttempt = useCallback((success: boolean, retryCount: number) => {
    const stats = stateRef.current.detectionStats;
    stats.totalAttempts++;
    if (success) {
      if (retryCount === 0) stats.firstTimeSuccess++;
      else if (retryCount === 1) stats.secondTimeSuccess++;
      else if (retryCount === 2) stats.thirdTimeSuccess++;
      stats.lastSuccessfulTiming = { retries: retryCount, timestamp: new Date().toISOString() };
    } else {
      stats.failures++;
    }
    const totalRetries = (stats.secondTimeSuccess * 1) + (stats.thirdTimeSuccess * 2);
    const successfulAttempts = stats.firstTimeSuccess + stats.secondTimeSuccess + stats.thirdTimeSuccess;
    if (successfulAttempts > 0) {
      stats.averageRetries = totalRetries / successfulAttempts;
    }
  }, []);

  // ============================================
  // MATERIAL TYPE DETECTION
  // ============================================
  const determineMaterialType = useCallback((aiData: any): string => {
    const className = (aiData.className || '').toLowerCase().trim();
    const probability = aiData.probability || 0;

    let materialType = 'UNKNOWN';
    let threshold = 1.0;
    let hasStrongKeyword = false;
    let detectionFormat = 'unknown';

    if (className === '0-pet' || className.startsWith('0-pet')) {
      materialType = 'PLASTIC_BOTTLE'; threshold = config.detection.PLASTIC_BOTTLE; hasStrongKeyword = true; detectionFormat = 'new_standard';
    } else if (className === '1-can' || className.startsWith('1-can')) {
      materialType = 'METAL_CAN'; threshold = config.detection.METAL_CAN; hasStrongKeyword = true; detectionFormat = 'new_standard';
    } else if (/^0[-_\s]*(pet|plastic|bottle)/i.test(className)) {
      materialType = 'PLASTIC_BOTTLE'; threshold = config.detection.PLASTIC_BOTTLE; hasStrongKeyword = true; detectionFormat = 'variant_format';
    } else if (/^1[-_\s]*(can|metal|aluminum)/i.test(className)) {
      materialType = 'METAL_CAN'; threshold = config.detection.METAL_CAN; hasStrongKeyword = true; detectionFormat = 'variant_format';
    } else if (className.includes('易拉罐') || className.includes('铝')) {
      materialType = 'METAL_CAN'; threshold = config.detection.METAL_CAN; hasStrongKeyword = true; detectionFormat = 'legacy_chinese';
    } else if (className.includes('pet') || className.includes('瓶')) {
      materialType = 'PLASTIC_BOTTLE'; threshold = config.detection.PLASTIC_BOTTLE; hasStrongKeyword = className.includes('pet'); detectionFormat = 'legacy_keyword';
    } else if (className.includes('metal') || className.includes('can')) {
      materialType = 'METAL_CAN'; threshold = config.detection.METAL_CAN; hasStrongKeyword = false; detectionFormat = 'legacy_keyword';
    } else if (className.includes('plastic') || className.includes('bottle')) {
      materialType = 'PLASTIC_BOTTLE'; threshold = config.detection.PLASTIC_BOTTLE; hasStrongKeyword = false; detectionFormat = 'legacy_keyword';
    } else if (className.includes('玻璃') || className.includes('glass')) {
      materialType = 'GLASS'; threshold = config.detection.GLASS; hasStrongKeyword = className.includes('玻璃'); detectionFormat = 'glass_detected';
    }

    if (probability < config.detection.minConfidenceRetry && materialType === 'UNKNOWN') return 'UNKNOWN';

    if (materialType !== 'UNKNOWN' && probability < threshold) {
      const relaxedThreshold = detectionFormat === 'new_standard' ? threshold * 0.70 : threshold * 0.80;
      if (hasStrongKeyword && probability >= relaxedThreshold) return materialType;
      if (detectionFormat === 'new_standard' && probability >= 0.45) return materialType;
      return 'UNKNOWN';
    }

    return materialType;
  }, [config.detection]);

  // ============================================
  // MATERIAL NAME MAPPING
  // ============================================
  const MATERIAL_NAME_MAP: Record<string, string> = {
    'PLASTIC_BOTTLE': 'ペットボトル',
    'METAL_CAN': 'ステール缶',
    'GLASS': 'ガラス',
  };

  const getJapaneseMaterialName = useCallback((englishType: string): string => {
    return MATERIAL_NAME_MAP[englishType] || englishType;
  }, []);

  // ============================================
  // BACKEND API CALLS
  // ============================================
  const recordItemToBackend = useCallback(async (itemData: ItemData) => {
    const s = stateRef.current;
    if (!s.sessionCode) return;
    try {
      const response = await fetch(
        `${config.backend.url}/api/rvm/session/${s.sessionCode}/item`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            material: itemData.material,
            weight: itemData.weight,
            confidence: itemData.confidence / 100,
          }),
          signal: AbortSignal.timeout(config.backend.timeout),
        }
      );
      const data = await response.json();
      if (data.success) {
        setTotalPoints(data.session.totalPoints);
      }
    } catch (err: any) {
      log(`❌ Backend API error: ${err.message}`, 'error');
    }
  }, [config.backend, log]);

  // ============================================
  // HARDWARE CONTROL
  // ============================================
  const executeCommand = useCallback(async (action: string, params: any = {}) => {
    const deviceType = 1;
    const currentModuleId = moduleIdRef.current;

    let apiUrl: string;
    let apiPayload: any;

    switch (action) {
      case 'openGate':
        apiUrl = `${config.local.baseUrl}/system/serial/motorSelect`;
        apiPayload = { moduleId: currentModuleId, motorId: '01', type: '03', deviceType };
        break;
      case 'closeGate':
        apiUrl = `${config.local.baseUrl}/system/serial/motorSelect`;
        apiPayload = { moduleId: currentModuleId, motorId: '01', type: '01', deviceType };
        break;
      case 'getWeight':
        apiUrl = `${config.local.baseUrl}/system/serial/getWeight`;
        apiPayload = { moduleId: currentModuleId, type: '00' };
        break;
      case 'calibrateWeight':
        apiUrl = `${config.local.baseUrl}/system/serial/weightCalibration`;
        apiPayload = { moduleId: currentModuleId, type: '00' };
        break;
      case 'takePhoto':
        apiUrl = `${config.local.baseUrl}/system/camera/process`;
        apiPayload = {};
        break;
      case 'stepperMotor':
        apiUrl = `${config.local.baseUrl}/system/serial/stepMotorSelect`;
        apiPayload = { moduleId: config.motors.stepper.moduleId, id: params.position, type: params.position, deviceType };
        break;
      case 'customMotor':
        apiUrl = `${config.local.baseUrl}/system/serial/motorSelect`;
        apiPayload = { moduleId: currentModuleId, motorId: params.motorId, type: params.type, deviceType };
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiPayload),
        signal: AbortSignal.timeout(config.local.timeout),
      });

      // Read body exactly once
      let responseText = '';
      try { responseText = await response.text(); } catch (_) {}

      let responseData: any = null;
      if (responseText) {
        try { responseData = JSON.parse(responseText); } catch (_) {}
      }

      // Parse weight from HTTP response if hardware returns it
      // Hardware format: {"moduleId":"09","function":"06","data":"19","comId":"COM1"}
      if (action === 'getWeight' && responseData) {
        const s = stateRef.current;
        if (responseData.function === '06' && responseData.data !== undefined) {
          const weightValue = parseFloat(responseData.data) || 0;
          s.weight = parseWeight(weightValue);
        } else if (responseData.data !== undefined && responseData.data !== null) {
          const weightValue = parseFloat(responseData.data) || 0;
          if (weightValue > 0) s.weight = parseWeight(weightValue);
        } else if (responseData.weight !== undefined) {
          const weightValue = parseFloat(responseData.weight) || 0;
          if (weightValue > 0) s.weight = parseWeight(weightValue);
        }
      }

      if (action === 'takePhoto') await delay(config.timing.photoDelay);

      return responseData;
    } catch (err: any) {
      log(`❌ ${action} failed: ${err.message}`, 'error');
      throw err;
    }
  }, [config, log, parseWeight]);

  // ============================================
  // CONTINUOUS COMPACTOR MANAGEMENT
  // ============================================
  const stopCompactor = useCallback(async () => {
    const s = stateRef.current;
    if (!s.compactorRunning) return;
    try {
      await executeCommand('customMotor', config.motors.compactor.stop);
    } catch (err: any) {
      log(`Compactor stop error: ${err.message}`, 'error');
    }
    s.compactorRunning = false;
    if (s.compactorTimer) { clearTimeout(s.compactorTimer); s.compactorTimer = null; }
    if (s.compactorIdleTimer) { clearTimeout(s.compactorIdleTimer); s.compactorIdleTimer = null; }
  }, [config.motors.compactor, executeCommand, log]);

  const resetCompactorIdleTimer = useCallback(() => {
    const s = stateRef.current;
    if (s.compactorIdleTimer) clearTimeout(s.compactorIdleTimer);
    s.lastItemTime = Date.now();
    s.compactorIdleTimer = setTimeout(async () => {
      if (s.compactorRunning && s.autoCycleEnabled) await stopCompactor();
    }, config.timing.compactorIdleStop);
  }, [config.timing.compactorIdleStop, stopCompactor]);

  const startContinuousCompactor = useCallback(async () => {
    const s = stateRef.current;
    if (s.compactorIdleTimer) { clearTimeout(s.compactorIdleTimer); s.compactorIdleTimer = null; }
    if (s.compactorRunning) { resetCompactorIdleTimer(); return; }
    try {
      await executeCommand('customMotor', config.motors.compactor.start);
      s.compactorRunning = true;
      s.lastItemTime = Date.now();
      resetCompactorIdleTimer();
    } catch (err: any) {
      log(`❌ Failed to start compactor: ${err.message}`, 'error');
      s.compactorRunning = false;
      throw err;
    }
  }, [config.motors.compactor, executeCommand, resetCompactorIdleTimer, log]);

  // ============================================
  // SESSION TIMERS
  // ============================================
  const clearSessionTimers = useCallback(() => {
    const s = stateRef.current;
    if (s.sessionTimeoutTimer) { clearTimeout(s.sessionTimeoutTimer); s.sessionTimeoutTimer = null; }
    if (s.maxDurationTimer) { clearTimeout(s.maxDurationTimer); s.maxDurationTimer = null; }
  }, []);

  const scheduleNextPhotoRef = useRef<() => Promise<void>>();
  const executeAutoCycleRef = useRef<() => Promise<void>>();
  const executeRejectionCycleRef = useRef<() => Promise<void>>();
  const resetSystemRef = useRef<(forceStop?: boolean) => Promise<SessionSummary | null>>();

  const handleSessionTimeout = useCallback(async (reason: string) => {
    const s = stateRef.current;
    try { await executeCommand('closeGate'); await delay(400); } catch (_) {}
    try { await executeCommand('closeGate'); await delay(300); } catch (_) {}
    s.autoCycleEnabled = false;
    s.awaitingDetection = false;
    if (s.autoPhotoTimer) { clearTimeout(s.autoPhotoTimer); s.autoPhotoTimer = null; }
    if (s.cycleInProgress) {
      const maxWait = 60000; const startWait = Date.now();
      while (s.cycleInProgress && (Date.now() - startWait) < maxWait) await delay(1000);
    }
    s.resetting = false;
    await resetSystemRef.current?.(false);
  }, [executeCommand]);

  const resetInactivityTimer = useCallback(() => {
    const s = stateRef.current;
    if (s.sessionTimeoutTimer) clearTimeout(s.sessionTimeoutTimer);
    s.sessionTimeoutTimer = setTimeout(() => { handleSessionTimeout('inactivity'); }, config.timing.sessionTimeout);
  }, [config.timing.sessionTimeout, handleSessionTimeout]);

  const startSessionTimers = useCallback(() => {
    const s = stateRef.current;
    resetInactivityTimer();
    if (s.maxDurationTimer) clearTimeout(s.maxDurationTimer);
    s.maxDurationTimer = setTimeout(() => { handleSessionTimeout('max_duration'); }, config.timing.sessionMaxDuration);
  }, [config.timing.sessionMaxDuration, resetInactivityTimer, handleSessionTimeout]);

  // ============================================
  // REJECTION CYCLE
  // ============================================
  const executeRejectionCycle = useCallback(async () => {
    const s = stateRef.current;
    setStatus('rejecting');
    setStatusMessage('Item rejected - unrecognized material');
    setIsProcessing(true);
    try {
      await executeCommand('customMotor', config.motors.belt.reverse);
      await delay(config.timing.beltReverse);
      await executeCommand('customMotor', config.motors.belt.stop);
      trackDetectionAttempt(false, s.detectionRetries);
    } catch (err: any) {
      log(`Rejection error: ${err.message}`, 'error');
    }
    s.aiResult = null; s.weight = null; s.detectionRetries = 0;
    s.awaitingDetection = false; s.cycleInProgress = false; s.itemAlreadyPositioned = false;
    setIsProcessing(false);
    if (s.autoCycleEnabled) {
      setStatus('ready'); setStatusMessage('Ready for next item');
      await scheduleNextPhotoRef.current?.();
    }
  }, [config, executeCommand, trackDetectionAttempt, log]);

  // ============================================
  // AUTO CYCLE
  // ============================================
  const executeAutoCycle = useCallback(async () => {
    const s = stateRef.current;
    if (!s.aiResult || !s.weight || s.weight.weight <= 1) { s.cycleInProgress = false; setIsProcessing(false); return; }

    const cycleStartTime = Date.now();
    itemsProcessedRef.current += 1;
    totalWeightRef.current += s.weight.weight;
    const newItemsProcessed = itemsProcessedRef.current;

    setItemsProcessed(newItemsProcessed);
    setTotalWeight(totalWeightRef.current);
    trackDetectionAttempt(true, s.detectionRetries);
    if (s.itemAlreadyPositioned && s.detectionRetries > 0) s.detectionStats.positioningHelped++;

    const itemData: ItemData = {
      itemNumber: newItemsProcessed,
      material: s.aiResult.materialType,
      weight: s.weight.weight,
      confidence: s.aiResult.matchRate,
      timestamp: new Date().toISOString(),
    };

    const japaneseName = getJapaneseMaterialName(itemData.material);
    setItemCounts(prev => {
      const idx = prev.findIndex(m => m.materialName === japaneseName);
      if (idx !== -1) { const updated = [...prev]; updated[idx] = { ...updated[idx], count: updated[idx].count + 1 }; return updated; }
      return prev;
    });

    setStatus('processing');
    setStatusMessage(`Processing ${itemData.material}...`);
    setIsProcessing(true);
    recordItemToBackend(itemData);

    try {
      startContinuousCompactor().catch(() => {});

      await executeCommand('customMotor', config.motors.belt.toStepper);
      await delay(config.timing.beltToStepper);
      await executeCommand('customMotor', config.motors.belt.stop);

      const targetPosition = itemData.material === 'METAL_CAN'
        ? config.motors.stepper.positions.metalCan
        : config.motors.stepper.positions.plasticBottle;
      await executeCommand('stepperMotor', { position: targetPosition });
      await delay(config.timing.stepperRotate);
      await delay(config.timing.itemDropDelay);
      resetCompactorIdleTimer();

      executeCommand('stepperMotor', { position: config.motors.stepper.positions.home }).catch(() => {});
      await delay(200);

      trackCycleTime(cycleStartTime);
      resetInactivityTimer();
    } catch (err: any) {
      log(`❌ Cycle error: ${err.message}`, 'error');
      setError(err.message);
    }

    s.aiResult = null; s.weight = null; s.cycleInProgress = false;
    s.detectionRetries = 0; s.awaitingDetection = false; s.itemAlreadyPositioned = false;
    setIsProcessing(false);

    if (s.autoCycleEnabled) {
      setStatus('ready'); setStatusMessage('Ready for next item');
      await scheduleNextPhotoRef.current?.();
    }
  }, [config, executeCommand, startContinuousCompactor, resetCompactorIdleTimer,
      recordItemToBackend, trackCycleTime, trackDetectionAttempt, resetInactivityTimer, log]);

  // ============================================
  // PHOTO DETECTION WITH POSITIONING
  // ============================================
  const scheduleNextPhotoWithPositioning = useCallback(async () => {
    const s = stateRef.current;
    if (s.autoPhotoTimer) clearTimeout(s.autoPhotoTimer);

    s.autoPhotoTimer = setTimeout(async () => {
      if (!s.autoCycleEnabled || s.cycleInProgress || s.awaitingDetection) return;

      try {
        await executeCommand('customMotor', config.motors.belt.stop);
        await delay(config.timing.positionSettle);
      } catch (err: any) {
        log(`Belt pre-stop error: ${err.message}`, 'error');
      }

      try {
        s.weight = null;
        await executeCommand('getWeight');
        const weightResult = await waitForWeight(2000);

        if (!weightResult || weightResult.weight < config.detection.minValidWeight) {
          s.weight = null;
          if (s.autoCycleEnabled) await scheduleNextPhotoRef.current?.();
          return;
        }

        s.weight = null;
      } catch (err: any) {
        if (s.autoCycleEnabled) await scheduleNextPhotoRef.current?.();
        return;
      }

      s.awaitingDetection = true;
      s.itemAlreadyPositioned = false;

      try {
        if (config.detection.positionBeforePhoto) {
          await executeCommand('customMotor', config.motors.belt.toWeight);
          await delay(config.timing.beltToWeight);
          await executeCommand('customMotor', config.motors.belt.stop);
          await delay(config.timing.positionSettle);
          s.itemAlreadyPositioned = true;
        }

        await executeCommand('takePhoto');
      } catch (err: any) {
        s.awaitingDetection = false;
        s.itemAlreadyPositioned = false;
        s.weight = null;
        try { await executeCommand('customMotor', config.motors.belt.stop); } catch (_) {}
        if (s.autoCycleEnabled) await scheduleNextPhotoRef.current?.();
      }
    }, 500);
  }, [config, executeCommand, waitForWeight, log]);

  useEffect(() => { scheduleNextPhotoRef.current = scheduleNextPhotoWithPositioning; }, [scheduleNextPhotoWithPositioning]);
  useEffect(() => { executeAutoCycleRef.current = executeAutoCycle; }, [executeAutoCycle]);
  useEffect(() => { executeRejectionCycleRef.current = executeRejectionCycle; }, [executeRejectionCycle]);

  // ============================================
  // RESET SYSTEM
  // ============================================
  const resetSystemForNextUser = useCallback(async (forceStop: boolean = false): Promise<SessionSummary | null> => {
    const s = stateRef.current;
    if (s.resetting) return null;
    s.resetting = true;

    try { await executeCommand('closeGate'); await delay(400); } catch (_) {}
    try { await executeCommand('closeGate'); await delay(300); } catch (_) {}

    s.autoCycleEnabled = false;
    s.awaitingDetection = false;
    if (s.autoPhotoTimer) { clearTimeout(s.autoPhotoTimer); s.autoPhotoTimer = null; }

    if (s.cycleInProgress) {
      const maxWait = 60000; const startWait = Date.now();
      while (s.cycleInProgress && (Date.now() - startWait) < maxWait) await delay(2000);
      if (s.cycleInProgress) s.cycleInProgress = false;
    }

    try {
      if (forceStop) { await stopCompactor(); }
      else if (s.compactorRunning) { await delay(2000); await stopCompactor(); }
      await executeCommand('customMotor', config.motors.belt.stop);
    } catch (err: any) {
      log(`❌ Reset error: ${err.message}`, 'error');
    }

    if (s.sessionCode) {
      try {
        await fetch(`${config.backend.url}/api/rvm/local/session/end`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionCode: s.sessionCode, deviceId: config.device.id }),
          signal: AbortSignal.timeout(config.backend.timeout),
        });
      } catch (_) {}
    }

    const sessionSummary: SessionSummary = {
      itemsProcessed: itemsProcessedRef.current,
      totalWeight: totalWeightRef.current,
      userId: s.currentUserId,
      sessionCode: s.sessionCode,
      duration: s.sessionStartTime ? Date.now() - s.sessionStartTime.getTime() : 0,
    };

    s.aiResult = null; s.weight = null; s.currentUserId = null; s.sessionCode = null;
    s.sessionStartTime = null; s.isMemberSession = false; s.calibrationAttempts = 0;
    s.detectionRetries = 0; s.itemAlreadyPositioned = false; s.lastItemTime = null;
    clearSessionTimers();

    setSessionCode(null); setCurrentUser(null); setSessionActive(false);
    setItemsProcessed(0); setTotalWeight(0); setTotalPoints(0);
    setItemCounts(prev => prev.map(m => ({ materialName: m.materialName, count: 0 })));
    setStatus('ready'); setStatusMessage('System ready');
    itemsProcessedRef.current = 0; totalWeightRef.current = 0;
    s.resetting = false; s.sessionCount++;

    return sessionSummary;
  }, [config, executeCommand, stopCompactor, clearSessionTimers, log]);

  useEffect(() => { resetSystemRef.current = resetSystemForNextUser; }, [resetSystemForNextUser]);

  // ============================================
  // SESSION START (member)
  // ============================================
  const startSession = useCallback(async (userData: UserData) => {
    const s = stateRef.current;
    s.currentUserId = userData.userId; s.sessionCode = userData.sessionCode;
    s.isMemberSession = true; s.autoCycleEnabled = true; s.sessionStartTime = new Date();
    s.detectionRetries = 0; s.awaitingDetection = false; s.itemAlreadyPositioned = false;
    itemsProcessedRef.current = 0; totalWeightRef.current = 0;

    setSessionCode(userData.sessionCode); setCurrentUser(userData); setSessionActive(true);
    setItemsProcessed(0); setTotalWeight(0); setTotalPoints(0);
    setItemCounts(prev => prev.map(m => ({ materialName: m.materialName, count: 0 })));
    setStatus('active'); setStatusMessage('Session active - Place your bottle');
    startSessionTimers();

    await executeCommand('customMotor', config.motors.belt.stop);
    await stopCompactor();
    await executeCommand('stepperMotor', { position: config.motors.stepper.positions.home });
    await delay(config.timing.resetHomeDelay);
    await executeCommand('calibrateWeight');
    await delay(config.timing.calibrationDelay);
    await executeCommand('openGate');
    await delay(config.timing.commandDelay);

    setStatus('ready'); setStatusMessage('Ready for item - Place your bottle');
    await delay(4000);
    await scheduleNextPhotoWithPositioning();
  }, [config, executeCommand, stopCompactor, startSessionTimers, scheduleNextPhotoWithPositioning]);

  // ============================================
  // GUEST SESSION START
  // ============================================
  const startGuestSession = useCallback(async () => {
    try {
      setError(null); setStatus('active'); setStatusMessage('Starting guest session...'); setIsProcessing(true);

      const url = `${config.backend.url}/api/rvm/${config.device.id}/guest/start`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        signal: AbortSignal.timeout(config.backend.timeout),
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const textResponse = await response.text();
        throw new Error(`Server returned non-JSON (${response.status}): ${textResponse.substring(0, 100)}`);
      }

      const data = await response.json();

      if (data.success) {
        const s = stateRef.current;
        s.sessionCode = data.session.sessionCode; s.currentUserId = null;
        s.isMemberSession = false; s.autoCycleEnabled = true; s.sessionStartTime = new Date();
        s.detectionRetries = 0; s.awaitingDetection = false; s.itemAlreadyPositioned = false;
        itemsProcessedRef.current = 0; totalWeightRef.current = 0;

        setSessionCode(data.session.sessionCode); setSessionActive(true);
        setItemsProcessed(0); setTotalWeight(0); setTotalPoints(0);
        setItemCounts(prev => prev.map(m => ({ materialName: m.materialName, count: 0 })));
        startSessionTimers();

        await executeCommand('customMotor', config.motors.belt.stop);
        await stopCompactor();
        await executeCommand('stepperMotor', { position: config.motors.stepper.positions.home });
        await delay(config.timing.resetHomeDelay);
        await executeCommand('calibrateWeight');
        await delay(config.timing.calibrationDelay);
        await executeCommand('openGate');
        await delay(config.timing.commandDelay);

        setStatus('ready'); setStatusMessage('Ready - Place your recyclables'); setIsProcessing(false);
        await delay(4000);
        await scheduleNextPhotoWithPositioning();

        return { success: true, sessionCode: data.session.sessionCode, sessionId: data.session.sessionId };
      } else {
        setError(data.error || 'Failed to start session'); setIsProcessing(false);
        return { success: false, error: data.error };
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Network error';
      setError(errorMsg); setIsProcessing(false);
      return { success: false, error: errorMsg };
    }
  }, [config, executeCommand, stopCompactor, startSessionTimers, scheduleNextPhotoWithPositioning]);

  // ============================================
  // END SESSION
  // ============================================
  const endSession = useCallback(async () => {
    const s = stateRef.current;
    if (!s.sessionCode) return { success: false, error: 'No active session' };

    try {
      setIsProcessing(true); setStatus('processing'); setStatusMessage('Ending session - Gate closing...');
      s.autoCycleEnabled = false; s.awaitingDetection = false;
      if (s.autoPhotoTimer) { clearTimeout(s.autoPhotoTimer); s.autoPhotoTimer = null; }

      try { await executeCommand('closeGate'); await delay(400); } catch (_) {}
      try { await executeCommand('closeGate'); await delay(400); } catch (_) {}

      if (s.cycleInProgress) {
        const maxWait = 60000; const startWait = Date.now();
        while (s.cycleInProgress && (Date.now() - startWait) < maxWait) await delay(1000);
      }

      const response = await fetch(`${config.backend.url}/api/rvm/local/session/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionCode: s.sessionCode, deviceId: config.device.id }),
        signal: AbortSignal.timeout(config.backend.timeout),
      });

      const data = await response.json();
      if (data.success) {
        s.resetting = false;
        await resetSystemForNextUser(false);
        setIsProcessing(false);
        return { success: true, qrCode: data.qrCode, summary: data.summary, message: data.message };
      } else {
        setError(data.error || 'Failed to end session'); setIsProcessing(false);
        return { success: false, error: data.error };
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Network error';
      setError(errorMsg); setIsProcessing(false);
      return { success: false, error: errorMsg };
    }
  }, [config, executeCommand, resetSystemForNextUser]);

  // ============================================
  // EMERGENCY STOP
  // ============================================
  const emergencyStop = useCallback(async () => {
    const s = stateRef.current;
    s.autoCycleEnabled = false; s.cycleInProgress = false;
    await executeCommand('closeGate');
    await executeCommand('customMotor', config.motors.belt.stop);
    await stopCompactor();
    s.resetting = false;
    setStatus('error'); setStatusMessage('Emergency stop activated');
  }, [config, executeCommand, stopCompactor]);

  // ============================================
  // BIN STATUS MANAGEMENT
  // ============================================
  const resetBinStatus = useCallback((binKey?: keyof BinStatus) => {
    const s = stateRef.current;
    if (binKey) { s.binStatus[binKey] = false; }
    else { s.binStatus.plastic = false; s.binStatus.metal = false; s.binStatus.right = false; s.binStatus.glass = false; }
    setBinStatus({ ...s.binStatus });
  }, []);

  // ============================================
  // DIAGNOSTICS
  // ============================================
  const runDiagnostics = useCallback(() => {
    const s = stateRef.current;
    const stats = s.detectionStats;
    const total = stats.firstTimeSuccess + stats.secondTimeSuccess + stats.thirdTimeSuccess + stats.failures;
    const firstTimeRate = total > 0 ? ((stats.firstTimeSuccess / total) * 100).toFixed(1) : '0';
    console.log('\n' + '='.repeat(60));
    console.log('🔬 SYSTEM DIAGNOSTICS');
    console.log('='.repeat(60));
    console.log(`  Device ID: ${config.device.id} | Module ID: ${moduleIdRef.current}`);
    console.log(`  Auto Cycle: ${s.autoCycleEnabled} | Cycle In Prog: ${s.cycleInProgress}`);
    console.log(`  Compactor: ${s.compactorRunning ? 'ON' : 'OFF'} | Session: ${s.sessionCode || 'none'}`);
    console.log(`  Items: ${itemsProcessedRef.current} | Detection: ${stats.totalAttempts} total, ${firstTimeRate}% first-time`);
    console.log(`  Bins: P:${s.binStatus.plastic ? 'FULL' : 'OK'} M:${s.binStatus.metal ? 'FULL' : 'OK'} R:${s.binStatus.right ? 'FULL' : 'OK'} G:${s.binStatus.glass ? 'FULL' : 'OK'}`);
    if (s.averageCycleTime) console.log(`  Avg Cycle: ${Math.round(s.averageCycleTime)}ms`);
    console.log('='.repeat(60) + '\n');
  }, [config.device.id]);

  // ============================================
  // INITIALIZATION
  // ============================================
  const determineMaterialTypeRef = useRef(determineMaterialType);
  const executeCommandRef = useRef(executeCommand);
  const handleSessionTimeoutRef = useRef(handleSessionTimeout);
  const parseWeightRef = useRef(parseWeight);

  useEffect(() => { determineMaterialTypeRef.current = determineMaterialType; }, [determineMaterialType]);
  useEffect(() => { executeCommandRef.current = executeCommand; }, [executeCommand]);
  useEffect(() => { handleSessionTimeoutRef.current = handleSessionTimeout; }, [handleSessionTimeout]);
  useEffect(() => { parseWeightRef.current = parseWeight; }, [parseWeight]);

  useEffect(() => {
    let destroyed = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    function connectWS() {
      if (destroyed) return;
      if (wsRef.current) {
        try { wsRef.current.onclose = null; wsRef.current.onmessage = null; wsRef.current.close(); } catch (_) {}
        wsRef.current = null;
      }

      const ws = new WebSocket(config.local.wsUrl);
      wsRef.current = ws;
      ws.binaryType = 'arraybuffer';

      ws.onopen = () => {
        if (destroyed) { ws.close(); return; }
        setIsReady(true); setStatus('ready'); setStatusMessage('System ready');
      };

      ws.onmessage = async (event) => {
        if (destroyed) return;
        try {
          let rawData: string;
          if (typeof event.data === 'string') {
            rawData = event.data;
          } else if (event.data instanceof ArrayBuffer) {
            rawData = new TextDecoder().decode(event.data);
          } else if (event.data instanceof Blob) {
            rawData = await event.data.text();
          } else {
            rawData = String(event.data);
          }

          const message = JSON.parse(rawData);
          const s = stateRef.current;

          // Module ID from hardware
          if (message.function === '01') {
            setModuleId(message.moduleId);
            moduleIdRef.current = message.moduleId;
            setIsReady(true); setStatus('ready'); setStatusMessage('System ready');
            return;
          }

          // AI Photo Result
          if (message.function === 'aiPhoto') {
            const aiData = JSON.parse(message.data);
            const materialType = determineMaterialTypeRef.current(aiData);

            s.aiResult = {
              matchRate: Math.round((aiData.probability || 0) * 100),
              materialType,
              className: aiData.className,
              taskId: aiData.taskId,
              timestamp: new Date().toISOString(),
            };

            if (s.autoCycleEnabled && s.awaitingDetection) {
              s.awaitingDetection = false;
              s.weight = null;

              setTimeout(async () => {
                try {
                  s.weight = null;
                  await executeCommandRef.current('getWeight');

                  let waitElapsed = 0;
                  while (!s.weight && waitElapsed < 3000) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    waitElapsed += 100;
                  }

                  if (s.weight && s.aiResult && s.autoCycleEnabled && !s.cycleInProgress) {
                    if (s.weight.weight <= 0 && s.calibrationAttempts < 2) {
                      s.calibrationAttempts++;
                      await executeCommandRef.current('calibrateWeight');
                      await new Promise(resolve => setTimeout(resolve, config.timing.calibrationDelay));
                      s.weight = null;
                      await executeCommandRef.current('getWeight');
                      let w2 = 0;
                      while (!s.weight && w2 < 3000) { await new Promise(resolve => setTimeout(resolve, 100)); w2 += 100; }
                    }
                    if (s.weight && s.weight.weight > 0) s.calibrationAttempts = 0;

                    if (!s.weight || s.weight.weight < config.detection.minValidWeight) {
                      s.aiResult = null; s.weight = null; s.itemAlreadyPositioned = false;
                      await scheduleNextPhotoRef.current?.();
                      return;
                    }
                    if (s.aiResult.materialType === 'UNKNOWN') {
                      s.cycleInProgress = true;
                      executeRejectionCycleRef.current?.();
                      return;
                    }
                    s.cycleInProgress = true;
                    executeAutoCycleRef.current?.();
                  } else {
                    if (s.autoCycleEnabled && !s.cycleInProgress) {
                      s.aiResult = null; s.weight = null;
                      await scheduleNextPhotoRef.current?.();
                    }
                  }
                } catch (err: any) {
                  if (s.autoCycleEnabled && !s.cycleInProgress) await scheduleNextPhotoRef.current?.();
                }
              }, 100);
            }
            return;
          }

          // Weight Result (function '06')
          if (message.function === '06') {
            const weightValue = parseFloat(message.data) || 0;
            const parsed = parseWeightRef.current(weightValue);
            s.weight = parsed;

            if (parsed.weight <= 0 && s.calibrationAttempts < 2) {
              s.calibrationAttempts++;
              setTimeout(async () => {
                await executeCommandRef.current('calibrateWeight');
                setTimeout(() => executeCommandRef.current('getWeight'), config.timing.calibrationDelay);
              }, 200);
              return;
            }
            if (parsed.weight > 0) s.calibrationAttempts = 0;

            if (s.aiResult && s.autoCycleEnabled && !s.cycleInProgress) {
              if (parsed.weight < config.detection.minValidWeight) {
                s.aiResult = null; s.weight = null; s.itemAlreadyPositioned = false;
                await scheduleNextPhotoRef.current?.();
                return;
              }
              if (s.aiResult.materialType === 'UNKNOWN') {
                s.cycleInProgress = true;
                executeRejectionCycleRef.current?.();
                return;
              }
              s.cycleInProgress = true;
              executeAutoCycleRef.current?.();
            }
            return;
          }

          // Device Status / Bin Status
          if (message.function === 'deviceStatus') {
            const binCode = parseInt(message.data);
            const binStatusMap: Record<number, { name: string; key: keyof BinStatus | null; critical: boolean; isObjectSensor?: boolean }> = {
              0: { name: 'Plastic (PET)', key: 'plastic', critical: true },
              1: { name: 'Metal Can', key: 'metal', critical: true },
              2: { name: 'Right Bin', key: 'right', critical: false },
              3: { name: 'Glass', key: 'glass', critical: false },
              4: { name: 'Infrared Sensor', key: null, critical: false, isObjectSensor: true },
            };
            const binInfo = binStatusMap[binCode];
            if (binInfo) {
              if (binInfo.isObjectSensor) return;
              if (binInfo.key) {
                s.binStatus[binInfo.key] = true;
                setBinStatus({ ...s.binStatus });
                if (binInfo.critical && s.autoCycleEnabled) {
                  const currentMaterialBin: keyof BinStatus | null = s.aiResult?.materialType === 'METAL_CAN' ? 'metal' : 'plastic';
                  if (binInfo.key === currentMaterialBin) {
                    setTimeout(async () => { await handleSessionTimeoutRef.current('bin_full'); }, 2000);
                  }
                }
              }
            }
            return;
          }
        } catch (err: any) {
          // parse error — ignore
        }
      };

      ws.onclose = () => {
        if (destroyed) return;
        reconnectTimer = setTimeout(connectWS, 5000);
      };

      ws.onerror = () => {
        if (destroyed) return;
      };
    }

    connectWS();

    return () => {
      destroyed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (wsRef.current) {
        wsRef.current.onclose = null; wsRef.current.onmessage = null;
        wsRef.current.close(); wsRef.current = null;
      }
      const s = stateRef.current;
      if (s.sessionTimeoutTimer) clearTimeout(s.sessionTimeoutTimer);
      if (s.maxDurationTimer) clearTimeout(s.maxDurationTimer);
      if (s.autoPhotoTimer) clearTimeout(s.autoPhotoTimer);
      if (s.compactorTimer) clearTimeout(s.compactorTimer);
      if (s.compactorIdleTimer) clearTimeout(s.compactorIdleTimer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const fetchAcceptedMaterials = async () => {
      try {
        const response = await fetch(`${keys?.base_url}api/rvm/${config.device.id}/materials`);
        const data = await response?.json();
        const materials = data?.materials?.map((m: { id: string; materialName: string }) => ({
          materialName: m?.materialName, count: 0,
        }));
        setItemCounts(materials);
      } catch (err) {
        console.log(err);
      }
    };
    fetchAcceptedMaterials();
  }, []);

  // ============================================
  // RETURN API
  // ============================================
  return {
    status, isReady, sessionActive, sessionCode, itemsProcessed, totalWeight,
    totalPoints, itemCounts, currentUser, statusMessage, error, setError,
    isProcessing, binStatus,
    startSession, startGuestSession, endSession, emergencyStop, resetBinStatus, runDiagnostics,
  };
};