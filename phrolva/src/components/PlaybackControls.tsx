// Playback controls - Because animations need a remote control
// Play, pause, speed up, slow down, and scrub through time

import React from 'react';
import styled from 'styled-components';
import { Play, Pause, SkipForward, SkipBack, RotateCcw, Zap } from 'lucide-react';
import { useAnimationStore } from '../stores/animationStore';

const ControlsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
`;

const ButtonGroup = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
`;

const ControlButton = styled.button<{ $primary?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: ${props => props.$primary ? '56px' : '44px'};
  height: ${props => props.$primary ? '56px' : '44px'};
  border-radius: 50%;
  border: none;
  background: ${props => props.$primary 
    ? 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
    : 'rgba(255, 255, 255, 0.2)'};
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
    background: ${props => props.$primary 
      ? 'linear-gradient(135deg, #f5576c 0%, #f093fb 100%)'
      : 'rgba(255, 255, 255, 0.3)'};
  }
  
  &:active:not(:disabled) {
    transform: scale(0.95);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  svg {
    width: ${props => props.$primary ? '24px' : '20px'};
    height: ${props => props.$primary ? '24px' : '20px'};
  }
`;

const ProgressBar = styled.div`
  position: relative;
  height: 8px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  overflow: hidden;
  cursor: pointer;
`;

const ProgressFill = styled.div<{ $progress: number }>`
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  width: ${props => props.$progress}%;
  background: linear-gradient(90deg, #f093fb 0%, #f5576c 100%);
  border-radius: 4px;
  transition: width 0.3s ease;
`;

const SpeedControl = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
`;

const SpeedButton = styled.button<{ $active?: boolean }>`
  padding: 6px 12px;
  border-radius: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  background: ${props => props.$active 
    ? 'rgba(255, 255, 255, 0.3)' 
    : 'transparent'};
  color: white;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 255, 255, 0.5);
  }
`;

const StatsDisplay = styled.div`
  display: flex;
  justify-content: space-between;
  color: rgba(255, 255, 255, 0.9);
  font-size: 12px;
  font-family: 'Monaco', 'Courier New', monospace;
`;

export const PlaybackControls: React.FC = () => {
  const {
    playbackState,
    play,
    pause,
    stop,
    nextFrame,
    previousFrame,
    setSpeed,
    seekTo,
    animationQueue
  } = useAnimationStore();
  
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = (clickX / rect.width) * 100;
    const frame = Math.floor((percentage / 100) * animationQueue.length);
    seekTo(frame);
  };
  
  const speedOptions = [0.5, 1, 2, 4];
  
  return (
    <ControlsContainer>
      {/* Progress bar */}
      <ProgressBar onClick={handleProgressClick}>
        <ProgressFill $progress={playbackState.progress} />
      </ProgressBar>
      
      {/* Main controls */}
      <ButtonGroup>
        <ControlButton onClick={previousFrame} disabled={playbackState.currentFrame === 0}>
          <SkipBack />
        </ControlButton>
        
        <ControlButton 
          $primary 
          onClick={playbackState.isPlaying ? pause : play}
          disabled={animationQueue.length === 0}
        >
          {playbackState.isPlaying ? <Pause /> : <Play />}
        </ControlButton>
        
        <ControlButton 
          onClick={nextFrame} 
          disabled={playbackState.currentFrame >= animationQueue.length - 1}
        >
          <SkipForward />
        </ControlButton>
        
        <ControlButton onClick={stop}>
          <RotateCcw />
        </ControlButton>
      </ButtonGroup>
      
      {/* Speed controls */}
      <SpeedControl>
        <Zap size={16} />
        {speedOptions.map(speed => (
          <SpeedButton
            key={speed}
            $active={playbackState.speed === speed}
            onClick={() => setSpeed(speed)}
          >
            {speed}x
          </SpeedButton>
        ))}
      </SpeedControl>
      
      {/* Stats */}
      <StatsDisplay>
        <span>Frame: {playbackState.currentFrame}/{playbackState.totalFrames}</span>
        <span>Speed: {playbackState.speed}x</span>
        <span>{playbackState.isPlaying ? '▶ Playing' : playbackState.isPaused ? '⏸ Paused' : '⏹ Stopped'}</span>
      </StatsDisplay>
    </ControlsContainer>
  );
};
