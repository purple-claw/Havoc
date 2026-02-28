// Global state management for animations
// Zustand because Redux is overkill for this

import { create } from 'zustand';
import { AnimationCommand, PlaybackState, VisualizationData } from '../types/animation.types';

interface AnimationStore {
  // Data from backend
  visualizationData: VisualizationData | null;
  currentCommand: AnimationCommand | null;
  commandHistory: AnimationCommand[];
  
  // Playback control
  playbackState: PlaybackState;
  animationQueue: AnimationCommand[];
  
  // Actions - the fun stuff
  loadVisualization: (data: VisualizationData) => void;
  play: () => void;
  pause: () => void;
  stop: () => void;
  nextFrame: () => void;
  previousFrame: () => void;
  setSpeed: (speed: number) => void;
  seekTo: (frame: number) => void;
  
  // Animation execution
  executeCommand: (command: AnimationCommand) => Promise<void>;
  clearAnimations: () => void;
  runAnimationLoop: () => Promise<void>;
}

export const useAnimationStore = create<AnimationStore>((set, get) => ({
  // Initial state - everything starts at zero
  visualizationData: null,
  currentCommand: null,
  commandHistory: [],
  
  playbackState: {
    isPlaying: false,
    isPaused: false,
    currentFrame: 0,
    totalFrames: 0,
    speed: 1.0,
    progress: 0
  },
  
  animationQueue: [],
  
  // Load visualization data from backend
  loadVisualization: (data: VisualizationData) => {
    set({
      visualizationData: data,
      animationQueue: [...data.animations.commands],
      playbackState: {
        ...get().playbackState,
        totalFrames: data.animations.commands.length,
        currentFrame: 0,
        progress: 0
      }
    });
  },
  
  // Playback controls
  play: () => {
    const { playbackState, animationQueue } = get();
    
    if (playbackState.currentFrame >= animationQueue.length) {
      // Reset if we're at the end
      get().seekTo(0);
    }
    
    set({
      playbackState: {
        ...playbackState,
        isPlaying: true,
        isPaused: false
      }
    });
    
    // Start animation loop
    get().runAnimationLoop();
  },
  
  pause: () => {
    set(state => ({
      playbackState: {
        ...state.playbackState,
        isPlaying: false,
        isPaused: true
      }
    }));
  },
  
  stop: () => {
    set(state => ({
      playbackState: {
        ...state.playbackState,
        isPlaying: false,
        isPaused: false,
        currentFrame: 0,
        progress: 0
      },
      currentCommand: null
    }));
  },
  
  nextFrame: () => {
    const { playbackState, animationQueue } = get();
    
    if (playbackState.currentFrame < animationQueue.length - 1) {
      const nextFrame = playbackState.currentFrame + 1;
      const command = animationQueue[nextFrame];
      
      set({
        playbackState: {
          ...playbackState,
          currentFrame: nextFrame,
          progress: (nextFrame / animationQueue.length) * 100
        },
        currentCommand: command
      });
      
      get().executeCommand(command);
    }
  },
  
  previousFrame: () => {
    const { playbackState } = get();
    
    if (playbackState.currentFrame > 0) {
      const prevFrame = playbackState.currentFrame - 1;
      
      set({
        playbackState: {
          ...playbackState,
          currentFrame: prevFrame,
          progress: (prevFrame / get().animationQueue.length) * 100
        }
      });
    }
  },
  
  setSpeed: (speed: number) => {
    // Speed range: 0.25x to 4x
    const clampedSpeed = Math.max(0.25, Math.min(4, speed));
    
    set(state => ({
      playbackState: {
        ...state.playbackState,
        speed: clampedSpeed
      }
    }));
  },
  
  seekTo: (frame: number) => {
    const { animationQueue } = get();
    const clampedFrame = Math.max(0, Math.min(animationQueue.length - 1, frame));
    
    set(state => ({
      playbackState: {
        ...state.playbackState,
        currentFrame: clampedFrame,
        progress: (clampedFrame / animationQueue.length) * 100
      }
    }));
  },
  
  // Execute animation command - where the magic happens
  executeCommand: async (command: AnimationCommand) => {
    set({ currentCommand: command });
    
    // Add to history
    set(state => ({
      commandHistory: [...state.commandHistory.slice(-99), command]  // Keep last 100
    }));
    
    // Wait for animation duration
    const duration = command.duration / get().playbackState.speed;
    await new Promise(resolve => setTimeout(resolve, duration));
  },
  
  clearAnimations: () => {
    set({
      currentCommand: null,
      commandHistory: [],
      animationQueue: []
    });
  },
  
  // Private method for animation loop
  runAnimationLoop: async () => {
    const { playbackState, animationQueue } = get();
    
    while (playbackState.isPlaying && playbackState.currentFrame < animationQueue.length) {
      const command = animationQueue[playbackState.currentFrame];
      
      // Execute current command
      await get().executeCommand(command);
      
      // Check if still playing (might have been paused)
      if (!get().playbackState.isPlaying) break;
      
      // Move to next frame
      get().nextFrame();
    }
    
    // Stop when done
    if (playbackState.currentFrame >= animationQueue.length) {
      get().pause();
    }
  }
}))
