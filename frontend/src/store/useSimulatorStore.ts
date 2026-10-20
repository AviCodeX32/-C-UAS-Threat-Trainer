import { create } from 'zustand';
import {
  Drone,
  JammerState,
  SpoofingState,
  KineticState,
  StationVitals,
  SimEvent,
  ScenarioPreset,
  AARScorecard,
  ServerMessage,
  ClientMessage,
  CAMERA_PRESETS,
  CameraPreset
} from '@cuas/shared';
import { SCENARIO_PRESETS } from '@cuas/shared';
import { audioEngine } from '../audio/synth';

interface SimulatorStore {
  // Connection
  wsConnected: boolean;
  initWebSocket: () => void;
  sendAction: (action: ClientMessage) => void;

  // Simulator Data
  simTime: number;
  scenarioStatus: 'idle' | 'running' | 'paused' | 'completed';
  scenario: ScenarioPreset;
  drones: Drone[];
  selectedDroneId: string | null;
  jammer: JammerState;
  spoof: SpoofingState;
  kinetic: KineticState;
  vitals: StationVitals;
  recentEvents: SimEvent[];

  // Camera & Views
  activeCameraPreset: CameraPreset;
  cameraPitch: number;
  cameraYaw: number;
  cameraZoom: number;
  thermalPalette: 'white-hot' | 'black-hot' | 'nvg';

  // UI States
  showAARModal: boolean;
  aarScorecard: AARScorecard | null;
  crtFilterEnabled: boolean;
  soundEnabled: boolean;

  // Actions
  selectDrone: (id: string | null) => void;
  setCameraPreset: (preset: CameraPreset) => void;
  setCameraAngles: (pitch: number, yaw: number, zoom?: number) => void;
  setThermalPalette: (palette: 'white-hot' | 'black-hot' | 'nvg') => void;
  toggleCRT: () => void;
  toggleSound: () => void;
  closeAARModal: () => void;

  // Controls (wrapped to sendAction)
  toggleJammerBand: (band: '2.4GHz' | '5.8GHz' | 'GNSS' | 'all') => void;
  setJammerPower: (power: number) => void;
  setJammerAzimuth: (azimuth: number, beamwidth: number) => void;
  toggleWidebandBarrage: () => void;

  toggleSpoofing: (active: boolean) => void;
  setSpoofOffset: (driftRate: number, falseHeading: number) => void;
  triggerKineticLaunch: (targetId: string) => void;
  toggleTakeCover: () => void;

  selectScenario: (scenarioId: string) => void;
  pauseSimulation: () => void;
  resumeSimulation: () => void;
  restartSimulation: () => void;
}

let socket: WebSocket | null = null;
let reconnectTimer: any = null;

export const useSimulatorStore = create<SimulatorStore>((set, get) => ({
  wsConnected: false,
  simTime: 0,
  scenarioStatus: 'idle',
  scenario: SCENARIO_PRESETS[0],
  drones: [],
  selectedDroneId: null,
  jammer: {
    active: false,
    bands: { '2.4GHz': false, '5.8GHz': false, 'GNSS': false },
    power: 50,
    azimuth: 0,
    beamwidth: 60,
    heat: 0,
    overheated: false,
    widebandBarrage: false
  },
  spoof: {
    active: false,
    targetConstellation: 'GPS_L1',
    driftRate: 5,
    falseHeading: 180,
    lockedDrones: []
  },
  kinetic: {
    ammo: 10,
    maxAmmo: 10,
    reloading: false,
    reloadProgress: 0,
    killProbability: 0.85,
    interceptors: []
  },
  vitals: {
    radarHealth: 100,
    jammerHealth: 100,
    batteryPercent: 100,
    generatorFuel: 95,
    bunkerIntegrity: 100,
    takeCoverActive: false
  },
  recentEvents: [],

  activeCameraPreset: CAMERA_PRESETS[0],
  cameraPitch: -10,
  cameraYaw: 0,
  cameraZoom: 1,
  thermalPalette: 'white-hot',

  showAARModal: false,
  aarScorecard: null,
  crtFilterEnabled: false,
  soundEnabled: true,

  initWebSocket: () => {
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const envWs = import.meta.env.VITE_WS_URL;
    let wsUrl: string;
    if (envWs) {
      wsUrl = envWs;
    } else {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsHost = window.location.port === '3000' ? 'localhost:4000' : window.location.host;
      wsUrl = `${wsProtocol}//${wsHost}`;
    }

    socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log('[WS] Connected to tactical simulator backend.');
      set({ wsConnected: true });
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    };

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as ServerMessage;
        const state = get();

        if (msg.type === 'TICK') {
          // Update audio synthesizer with live sim physics
          const activeFlyingDrones = msg.drones.filter((d: Drone) => d.status === 'flying');
          if (activeFlyingDrones.length > 0) {
            const closest = Math.min(...activeFlyingDrones.map((d: Drone) => d.distance));
            const maxSpd = Math.max(...activeFlyingDrones.map((d: Drone) => d.speed));
            audioEngine.updateRotorHum(closest, maxSpd, true);
          } else {
            audioEngine.updateRotorHum(2000, 0, false);
          }

          audioEngine.updateJammerNoise(msg.jammer.active, msg.jammer.widebandBarrage);
          audioEngine.updateTakeCoverSiren(msg.vitals.takeCoverActive);

          // Overheat alert sound
          if (msg.jammer.overheated && !state.jammer.overheated) {
            audioEngine.playOverheatAlarm();
          }

          set({
            simTime: msg.time,
            drones: msg.drones,
            jammer: msg.jammer,
            spoof: msg.spoof,
            kinetic: msg.kinetic,
            vitals: msg.vitals,
            recentEvents: msg.recentEvents,
            scenarioStatus: msg.scenarioStatus
          });
        } else if (msg.type === 'SCENARIO_LOADED') {
          set({
            scenario: msg.scenario,
            drones: msg.drones,
            jammer: msg.jammer,
            spoof: msg.spoof,
            kinetic: msg.kinetic,
            vitals: msg.vitals,
            showAARModal: false,
            aarScorecard: null,
            scenarioStatus: 'running'
          });
        } else if (msg.type === 'SCENARIO_COMPLETE') {
          audioEngine.updateRotorHum(2000, 0, false);
          audioEngine.updateJammerNoise(false, false);
          audioEngine.updateTakeCoverSiren(false);
          set({
            aarScorecard: msg.aarScorecard,
            showAARModal: true,
            scenarioStatus: 'completed'
          });
        }
      } catch (err: any) {
        console.error('[WS] Parse error:', err);
      }
    };

    socket.onclose = () => {
      console.warn('[WS] Tactical server disconnected. Reconnecting in 2s...');
      set({ wsConnected: false });
      socket = null;
      if (!reconnectTimer) {
        reconnectTimer = setTimeout(() => {
          get().initWebSocket();
        }, 2000);
      }
    };

    socket.onerror = (err) => {
      console.warn('[WS] Error:', err);
    };
  },

  sendAction: (action: ClientMessage) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(action));
    }
  },

  selectDrone: (id: string | null) => {
    set({ selectedDroneId: id });
  },

  setCameraPreset: (preset: CameraPreset) => {
    set({
      activeCameraPreset: preset,
      cameraPitch: preset.pitch,
      cameraYaw: preset.yaw,
      cameraZoom: preset.zoom
    });
  },

  setCameraAngles: (pitch: number, yaw: number, zoom?: number) => {
    set(state => ({
      cameraPitch: pitch,
      cameraYaw: yaw,
      cameraZoom: zoom !== undefined ? zoom : state.cameraZoom
    }));
  },

  setThermalPalette: (palette) => set({ thermalPalette: palette }),
  toggleCRT: () => set(s => ({ crtFilterEnabled: !s.crtFilterEnabled })),
  toggleSound: () => {
    const next = !get().soundEnabled;
    audioEngine.setMasterVolume(next ? 0.3 : 0);
    set({ soundEnabled: next });
  },
  closeAARModal: () => set({ showAARModal: false }),

  toggleJammerBand: (band) => {
    const s = get();
    const current = s.jammer.bands;
    let nextBands = { ...current };

    if (band === 'all') {
      const anyActive = current['2.4GHz'] || current['5.8GHz'] || current['GNSS'];
      nextBands = { '2.4GHz': !anyActive, '5.8GHz': !anyActive, 'GNSS': !anyActive };
    } else {
      nextBands[band] = !current[band];
    }

    const isActive = nextBands['2.4GHz'] || nextBands['5.8GHz'] || nextBands['GNSS'];

    s.sendAction({
      type: 'SET_JAMMER',
      jammer: {
        active: isActive,
        bands: nextBands
      }
    });
  },

  setJammerPower: (power) => {
    get().sendAction({
      type: 'SET_JAMMER',
      jammer: { power }
    });
  },

  setJammerAzimuth: (azimuth, beamwidth) => {
    get().sendAction({
      type: 'SET_JAMMER',
      jammer: { azimuth, beamwidth }
    });
  },

  toggleWidebandBarrage: () => {
    const s = get();
    s.sendAction({
      type: 'SET_JAMMER',
      jammer: { widebandBarrage: !s.jammer.widebandBarrage }
    });
  },

  toggleSpoofing: (active) => {
    const s = get();
    s.sendAction({
      type: 'SET_SPOOFING',
      spoof: { active }
    });
  },

  setSpoofOffset: (driftRate, falseHeading) => {
    get().sendAction({
      type: 'SET_SPOOFING',
      spoof: { driftRate, falseHeading }
    });
  },

  triggerKineticLaunch: (targetId) => {
    get().sendAction({
      type: 'TRIGGER_KINETIC',
      targetId
    });
  },

  toggleTakeCover: () => {
    const s = get();
    s.sendAction({
      type: 'TOGGLE_TAKE_COVER',
      active: !s.vitals.takeCoverActive
    });
  },

  selectScenario: (scenarioId: string) => {
    const targetPreset = SCENARIO_PRESETS.find((s: ScenarioPreset) => s.id === scenarioId);
    set({
      showAARModal: false,
      aarScorecard: null,
      scenarioStatus: 'running',
      scenario: targetPreset || get().scenario,
      drones: [],
      recentEvents: []
    });

    get().sendAction({
      type: 'START_SCENARIO',
      scenarioId
    });
  },

  pauseSimulation: () => {
    get().sendAction({ type: 'PAUSE' });
  },

  resumeSimulation: () => {
    get().sendAction({ type: 'RESUME' });
  },

  restartSimulation: () => {
    const s = get();
    s.selectScenario(s.scenario.id);
  }
}));
