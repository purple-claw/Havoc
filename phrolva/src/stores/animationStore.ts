// Redesigned animation store — step-driven, real-time execution
// Each "step" = one execution step from the tracer (line + variables + animation commands)
// Stepping forward/backward drives animations in real time

import { create } from 'zustand';
import type {
  AnimationCommand,
  VisualizationData,
  ExplanationData,
} from '../types/animation.types';

export type DebugState = 'idle' | 'ready' | 'playing' | 'paused' | 'finished';

export interface StepSnapshot {
  index: number;
  line: number;
  variables: Record<string, any>;
  stdout: string;
  callStack: Array<{ function: string; line: number }>;
  commands: AnimationCommand[];
  cumulativeCommands: AnimationCommand[];
}

interface AnimationStore {
  vizData: VisualizationData | null;
  sourceCode: string;
  explanation: ExplanationData | null;

  steps: StepSnapshot[];
  totalSteps: number;

  currentStepIndex: number;
  debugState: DebugState;
  speed: number;
  autoPlayTimer: number | null;

  currentStep: StepSnapshot | null;
  currentLine: number;
  currentVariables: Record<string, any>;
  previousVariables: Record<string, any>;
  executedLines: Set<number>;

  // Legacy compat
  visualizationData: VisualizationData | null;
  currentCommand: AnimationCommand | null;
  currentStepCommands: AnimationCommand[];
  animationQueue: AnimationCommand[];
  playbackState: {
    isPlaying: boolean;
    isPaused: boolean;
    currentFrame: number;
    totalFrames: number;
    speed: number;
    progress: number;
  };

  loadVisualization: (data: VisualizationData) => void;
  reset: () => void;
  stepForward: () => void;
  stepBackward: () => void;
  goToStep: (index: number) => void;
  play: () => void;
  pause: () => void;
  stop: () => void;
  setSpeed: (speed: number) => void;

  // Legacy
  nextFrame: () => void;
  previousFrame: () => void;
  seekTo: (frame: number) => void;
  executeCommand: (cmd: AnimationCommand) => Promise<void>;
  clearAnimations: () => void;
  runAnimationLoop: () => Promise<void>;

  _tick: () => void;
}

function buildSnapshots(data: VisualizationData): StepSnapshot[] {
  const steps = data.execution.steps;
  const allCmds = data.animations.commands;
  const snapshots: StepSnapshot[] = [];
  let cumulative: AnimationCommand[] = [];

  // Normalize commands: ensure indices/ids fields exist (backend may send target_indices)
  const normCmds = allCmds.map(c => ({
    ...c,
    indices: (c as any).indices ?? (c as any).target_indices ?? [],
    ids: (c as any).ids ?? (c as any).target_ids ?? [],
  }));

  // Build a step_index → commands lookup for precise alignment
  const cmdsByStep = new Map<number, AnimationCommand[]>();
  let hasStepIndex = false;
  for (const cmd of normCmds) {
    const si = (cmd as any).step_index;
    if (si !== undefined && si >= 0) {
      hasStepIndex = true;
      if (!cmdsByStep.has(si)) cmdsByStep.set(si, []);
      cmdsByStep.get(si)!.push(cmd);
    }
  }

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    let stepCmds: AnimationCommand[] = [];

    if (hasStepIndex) {
      // Use precise step_index alignment from backend
      stepCmds = cmdsByStep.get(i) ?? [];
    } else if (normCmds.length === steps.length) {
      // 1:1 mapping fallback
      stepCmds.push(normCmds[i]);
    } else if (normCmds.length > 0) {
      // Proportional distribution fallback
      const s = Math.floor((i / steps.length) * normCmds.length);
      const e = Math.floor(((i + 1) / steps.length) * normCmds.length);
      for (let j = s; j < e; j++) {
        if (normCmds[j]) stepCmds.push(normCmds[j]);
      }
    }

    cumulative = [...cumulative, ...stepCmds];
    snapshots.push({
      index: i,
      line: step.line_number ?? step.line ?? 0,
      variables: step.variables ?? {},
      stdout: step.stdout ?? '',
      callStack: step.call_stack ?? [],
      commands: stepCmds,
      cumulativeCommands: [...cumulative],
    });
  }
  return snapshots;
}

function deriveLegacy(state: {
  debugState: DebugState;
  currentStepIndex: number;
  totalSteps: number;
  speed: number;
  steps: StepSnapshot[];
  vizData: VisualizationData | null;
}) {
  const stepCmds = state.currentStepIndex >= 0 ? state.steps[state.currentStepIndex]?.commands ?? [] : [];
  const cmd = stepCmds.length > 0 ? stepCmds[stepCmds.length - 1] : null;
  return {
    visualizationData: state.vizData,
    currentCommand: cmd,
    currentStepCommands: stepCmds,
    animationQueue: state.vizData?.animations.commands ?? [],
    playbackState: {
      isPlaying: state.debugState === 'playing',
      isPaused: state.debugState === 'paused',
      currentFrame: Math.max(0, state.currentStepIndex),
      totalFrames: state.totalSteps,
      speed: state.speed,
      progress: state.totalSteps > 0 ? (Math.max(0, state.currentStepIndex + 1) / state.totalSteps) * 100 : 0,
    },
  };
}

export const useAnimationStore = create<AnimationStore>((set, get) => ({
  vizData: null,
  sourceCode: '',
  explanation: null,
  steps: [],
  totalSteps: 0,
  currentStepIndex: -1,
  debugState: 'idle' as DebugState,
  speed: 1,
  autoPlayTimer: null,
  currentStep: null,
  currentLine: 0,
  currentVariables: {},
  previousVariables: {},
  executedLines: new Set<number>(),

  // Legacy
  visualizationData: null,
  currentCommand: null,
  currentStepCommands: [],
  animationQueue: [],
  playbackState: { isPlaying: false, isPaused: false, currentFrame: 0, totalFrames: 0, speed: 1, progress: 0 },

  loadVisualization: (data) => {
    const snaps = buildSnapshots(data);
    const base = {
      vizData: data,
      sourceCode: data.source_code ?? '',
      explanation: data.explanations ?? null,
      steps: snaps,
      totalSteps: snaps.length,
      currentStepIndex: -1,
      debugState: (snaps.length > 0 ? 'ready' : 'idle') as DebugState,
      currentStep: null,
      currentLine: 0,
      currentVariables: {},
      previousVariables: {},
      executedLines: new Set<number>(),
      speed: get().speed,
    };
    set({ ...base, ...deriveLegacy(base) });
  },

  reset: () => {
    const t = get().autoPlayTimer;
    if (t !== null) window.clearInterval(t);
    set({
      vizData: null, sourceCode: '', explanation: null,
      steps: [], totalSteps: 0, currentStepIndex: -1,
      debugState: 'idle' as DebugState, autoPlayTimer: null,
      currentStep: null, currentLine: 0,
      currentVariables: {}, previousVariables: {},
      executedLines: new Set<number>(),
      visualizationData: null, currentCommand: null, currentStepCommands: [], animationQueue: [],
      playbackState: { isPlaying: false, isPaused: false, currentFrame: 0, totalFrames: 0, speed: 1, progress: 0 },
    });
  },

  stepForward: () => {
    const { steps, currentStepIndex, speed, vizData } = get();
    if (steps.length === 0) return;
    const next = currentStepIndex + 1;
    if (next >= steps.length) {
      const ds = 'finished' as DebugState;
      set({ debugState: ds, ...deriveLegacy({ ...get(), debugState: ds }) });
      return;
    }
    const snap = steps[next];
    const prevVars = currentStepIndex >= 0 ? steps[currentStepIndex].variables : {};
    const executed = new Set(get().executedLines);
    executed.add(snap.line);
    const ds = (next >= steps.length - 1 ? 'finished' : (get().autoPlayTimer !== null ? 'playing' : 'paused')) as DebugState;

    const partial = {
      currentStepIndex: next, currentStep: snap, currentLine: snap.line,
      currentVariables: snap.variables, previousVariables: prevVars,
      executedLines: executed, debugState: ds, steps, totalSteps: steps.length, speed, vizData,
    };
    set({ ...partial, ...deriveLegacy(partial) });
  },

  stepBackward: () => {
    const { steps, currentStepIndex, speed, vizData } = get();
    if (currentStepIndex <= 0) return;
    const prev = currentStepIndex - 1;
    const snap = steps[prev];
    const prevVars = prev > 0 ? steps[prev - 1].variables : {};
    const executed = new Set<number>();
    for (let i = 0; i <= prev; i++) executed.add(steps[i].line);
    const ds = 'paused' as DebugState;

    const partial = {
      currentStepIndex: prev, currentStep: snap, currentLine: snap.line,
      currentVariables: snap.variables, previousVariables: prevVars,
      executedLines: executed, debugState: ds, steps, totalSteps: steps.length, speed, vizData,
    };
    set({ ...partial, ...deriveLegacy(partial) });
  },

  goToStep: (index) => {
    const { steps, speed, vizData } = get();
    const c = Math.max(0, Math.min(steps.length - 1, index));
    const snap = steps[c];
    if (!snap) return;
    const prevVars = c > 0 ? steps[c - 1].variables : {};
    const executed = new Set<number>();
    for (let i = 0; i <= c; i++) executed.add(steps[i].line);
    const ds = (c >= steps.length - 1 ? 'finished' : 'paused') as DebugState;

    const partial = {
      currentStepIndex: c, currentStep: snap, currentLine: snap.line,
      currentVariables: snap.variables, previousVariables: prevVars,
      executedLines: executed, debugState: ds, steps, totalSteps: steps.length, speed, vizData,
    };
    set({ ...partial, ...deriveLegacy(partial) });
  },

  play: () => {
    const { steps, currentStepIndex, autoPlayTimer, speed, vizData } = get();
    if (steps.length === 0 || autoPlayTimer !== null) return;
    if (currentStepIndex >= steps.length - 1) get().goToStep(0);

    const id = window.setInterval(() => { get()._tick(); }, 600 / get().speed);
    const ds = 'playing' as DebugState;
    const partial = { ...get(), autoPlayTimer: id, debugState: ds };
    set({ autoPlayTimer: id, debugState: ds, ...deriveLegacy(partial) });
  },

  pause: () => {
    const t = get().autoPlayTimer;
    if (t !== null) window.clearInterval(t);
    const ds = 'paused' as DebugState;
    const partial = { ...get(), autoPlayTimer: null, debugState: ds };
    set({ autoPlayTimer: null, debugState: ds, ...deriveLegacy(partial) });
  },

  stop: () => {
    const t = get().autoPlayTimer;
    if (t !== null) window.clearInterval(t);
    const ds = 'ready' as DebugState;
    set({
      autoPlayTimer: null, currentStepIndex: -1, currentStep: null,
      currentLine: 0, currentVariables: {}, previousVariables: {},
      executedLines: new Set<number>(), debugState: ds,
      ...deriveLegacy({ ...get(), currentStepIndex: -1, debugState: ds }),
    });
  },

  setSpeed: (speed) => {
    const clamped = Math.max(0.25, Math.min(4, speed));
    const { autoPlayTimer } = get();
    if (autoPlayTimer !== null) {
      window.clearInterval(autoPlayTimer);
      const id = window.setInterval(() => { get()._tick(); }, 600 / clamped);
      set({ speed: clamped, autoPlayTimer: id });
    } else {
      set({ speed: clamped });
    }
  },

  _tick: () => {
    const { steps, currentStepIndex } = get();
    if (currentStepIndex + 1 >= steps.length) {
      get().pause();
      set({ debugState: 'finished' as DebugState });
      return;
    }
    get().stepForward();
  },

  // Legacy shims
  nextFrame: () => get().stepForward(),
  previousFrame: () => get().stepBackward(),
  seekTo: (frame) => get().goToStep(frame),
  executeCommand: async () => {},
  clearAnimations: () => get().reset(),
  runAnimationLoop: async () => get().play(),
}))
