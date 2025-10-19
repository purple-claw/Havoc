// Type definitions for our animation system
// Because TypeScript makes everything better (and more verbose)

export enum CommandType {
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
  PUSH = 'PUSH',
  POP = 'POP',
  ENQUEUE = 'ENQUEUE',
  DEQUEUE = 'DEQUEUE',
  COLOR_CHANGE = 'COLOR_CHANGE',
  PAUSE = 'PAUSE',
  LABEL = 'LABEL',
  CLEAR = 'CLEAR'
}

export interface AnimationCommand {
  type: CommandType;
  indices?: number[];  // For array animations
  ids?: string[];      // For graph nodes/edges
  values?: Record<string, any>;
  duration: number;    // milliseconds
  delay?: number;      // milliseconds
  metadata?: Record<string, any>;
}

export interface ExecutionStep {
  step_number: number;
  line_number: number;
  variables: Record<string, any>;
  stdout?: string;
}

export interface VisualizationData {
  metadata: {
    timestamp: string;
    code_length: number;
    code_lines: number;
    variables: string[];
    data_structures: {
      arrays: string[];
      dicts: string[];
      strings: string[];
      numbers: string[];
    };
  };
  execution: {
    total_steps: number;
    steps: ExecutionStep[];
  };
  animations: {
    total_commands: number;
    commands: AnimationCommand[];
    duration_ms: number;
  };
  visualizer_config: {
    type: 'ArrayAdapter' | 'GraphAdapter' | 'StringAdapter' | 'generic';
    auto_play: boolean;
    speed: number;
  };
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
