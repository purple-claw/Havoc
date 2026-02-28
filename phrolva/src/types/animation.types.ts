// Type definitions for the HAVOC animation system
// Covers all 12 adapter types with physics metadata

export enum CommandType {
  // Core operations
  HIGHLIGHT = 'HIGHLIGHT',
  SWAP = 'SWAP',
  MOVE = 'MOVE',
  COMPARE = 'COMPARE',
  SET_VALUE = 'SET_VALUE',
  VISIT = 'VISIT',
  TRAVERSE = 'TRAVERSE',
  MARK = 'MARK',
  UNMARK = 'UNMARK',
  CREATE = 'CREATE',
  DELETE = 'DELETE',
  // Stack/Queue
  PUSH = 'PUSH',
  POP = 'POP',
  ENQUEUE = 'ENQUEUE',
  DEQUEUE = 'DEQUEUE',
  // Visual
  COLOR_CHANGE = 'COLOR_CHANGE',
  PAUSE = 'PAUSE',
  LABEL = 'LABEL',
  CLEAR = 'CLEAR',
}

export type AdapterType =
  | 'AnimatedArray'
  | 'AnimatedGraph'
  | 'AnimatedString'
  | 'AnimatedStack'
  | 'AnimatedQueue'
  | 'AnimatedLinkedList'
  | 'AnimatedTree'
  | 'AnimatedHeap'
  | 'AnimatedMatrix'
  | 'AnimatedHashMap'
  | 'AnimatedSet'
  | 'AnimatedGeneric';

export interface AnimationCommand {
  type: CommandType | string;
  target?: string | number | number[];
  value?: any;
  duration: number;
  delay?: number;
  metadata?: Record<string, any>;
  // Legacy fields for backward compat
  indices?: number[];
  ids?: string[];
  values?: Record<string, any>;
}

export interface ExecutionStep {
  step_number?: number;
  line: number;
  line_number?: number;
  step_type?: string;
  variables: Record<string, any>;
  stdout?: string;
  call_stack?: Array<{ function: string; line: number }>;
}

export interface PhysicsConfig {
  spring?: { tension: number; friction: number };
  force?: { charge: number; link_distance: number };
  [key: string]: any;
}

export interface VisualizerConfig {
  component: AdapterType;
  adapter?: string;
  physics?: PhysicsConfig;
  theme?: 'dark' | 'light';
  source_code?: string;
  total_steps?: number;
  data_structures?: {
    arrays?: string[];
    dicts?: string[];
    sets?: string[];
    strings?: string[];
  };
}

export interface ExplanationData {
  overview?: string;
  algorithm_name?: string;
  time_complexity?: string;
  space_complexity?: string;
  step_explanations?: Array<{
    step_range: number[];
    title: string;
    summary: string;
    detail: string;
    concept?: string;
    tips?: string[];
    analogy?: string;
  }>;
  key_concepts?: string[];
  learning_path?: string[];
  fun_fact?: string;
}

export interface VisualizationData {
  metadata: Record<string, any>;
  execution: {
    total_steps: number;
    steps: ExecutionStep[];
    truncated?: boolean;
  };
  animations: {
    total_commands: number;
    commands: AnimationCommand[];
    duration_ms: number;
    adapter?: string;
  };
  visualizer_config: VisualizerConfig;
  explanations?: ExplanationData;
  source_code?: string;
}

export interface PlaybackState {
  isPlaying: boolean;
  isPaused: boolean;
  currentFrame: number;
  totalFrames: number;
  speed: number;
  progress: number;
}

export interface AnimationElement {
  id: string;
  value: any;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  isHighlighted: boolean;
  isComparing: boolean;
  isSwapping: boolean;
}

// API response types
export interface ExecuteResponse {
  success: boolean;
  metadata: Record<string, any>;
  execution: {
    total_steps: number;
    steps: ExecutionStep[];
    truncated?: boolean;
  };
  animations: {
    total_commands: number;
    commands: AnimationCommand[];
    duration_ms: number;
    adapter?: string;
  };
  visualizer_config: VisualizerConfig;
  explanations?: ExplanationData;
  performance: Record<string, any>;
  error?: string;
  warnings?: string[];
}

export interface GallerySnippet {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  code: string;
  code_preview?: string;
}
