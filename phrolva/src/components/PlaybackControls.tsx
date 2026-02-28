import React from 'react';
import styled, { css } from 'styled-components';
import { Play, Pause, SkipForward, SkipBack, RotateCcw, Zap } from 'lucide-react';
import { useAnimationStore } from '../stores/animationStore';

/* ───── container ───── */
const Wrap = styled.div`
  display:flex;flex-direction:column;gap:10px;
  padding:14px 16px;border-radius:var(--radius-lg);
  background:var(--bg-card);border:1px solid var(--glass-border);
`;

/* ── progress ── */
const ProgressTrack = styled.div`
  position:relative;height:5px;border-radius:3px;
  background:rgba(255,255,255,0.06);cursor:pointer;overflow:hidden;
`;
const ProgressFill = styled.div<{$p:number}>`
  position:absolute;left:0;top:0;height:100%;
  width:${p=>p.$p}%;border-radius:3px;
  background:linear-gradient(90deg,var(--accent-green),var(--accent-cyan));
  transition:width .25s ease;
`;

/* ── buttons ── */
const BtnRow = styled.div`display:flex;justify-content:center;align-items:center;gap:6px;`;
const Btn = styled.button<{$primary?:boolean}>`
  display:flex;align-items:center;justify-content:center;
  border-radius:50%;transition:all var(--transition-fast);
  ${p=>p.$primary?css`
    width:38px;height:38px;
    background:var(--accent-green);color:#000;
    &:hover:not(:disabled){box-shadow:0 4px 16px rgba(0,230,118,0.3);transform:scale(1.06);}
  `:css`
    width:32px;height:32px;
    background:var(--glass);color:var(--text-secondary);
    &:hover:not(:disabled){background:var(--glass-hover);color:var(--text-primary);}
  `}
  &:active:not(:disabled){transform:scale(.93);}
  &:disabled{opacity:.35;cursor:not-allowed;}
`;

/* ── speed ── */
const SpeedRow = styled.div`display:flex;align-items:center;justify-content:center;gap:6px;`;
const SpeedBtn = styled.button<{$active?:boolean}>`
  padding:3px 10px;border-radius:100px;font-size:11px;font-weight:600;
  border:1px solid ${p=>p.$active?'rgba(0,230,118,0.3)':'var(--glass-border)'};
  background:${p=>p.$active?'var(--accent-green-dim)':'transparent'};
  color:${p=>p.$active?'var(--accent-green)':'var(--text-tertiary)'};
  transition:all var(--transition-fast);
  &:hover{border-color:rgba(0,230,118,0.25);color:var(--accent-green);}
`;

/* ── stats ── */
const Stats = styled.div`
  display:flex;justify-content:space-between;
  font-size:10.5px;font-family:var(--font-mono);color:var(--text-tertiary);
`;

/* ───── component ───── */
export const PlaybackControls: React.FC = () => {
  const {
    playbackState, play, pause, stop, nextFrame, previousFrame, setSpeed, seekTo, animationQueue
  } = useAnimationStore();

  const handleTrackClick = (e:React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    seekTo(Math.floor(pct * animationQueue.length));
  };

  const speeds = [0.5, 1, 2, 4];

  return (
    <Wrap>
      <ProgressTrack onClick={handleTrackClick}>
        <ProgressFill $p={playbackState.progress}/>
      </ProgressTrack>

      <BtnRow>
        <Btn onClick={previousFrame} disabled={playbackState.currentFrame===0}><SkipBack size={14}/></Btn>
        <Btn $primary onClick={playbackState.isPlaying?pause:play} disabled={animationQueue.length===0}>
          {playbackState.isPlaying?<Pause size={16}/>:<Play size={16} style={{marginLeft:2}}/>}
        </Btn>
        <Btn onClick={nextFrame} disabled={playbackState.currentFrame>=animationQueue.length-1}><SkipForward size={14}/></Btn>
        <Btn onClick={stop}><RotateCcw size={13}/></Btn>
      </BtnRow>

      <SpeedRow>
        <Zap size={11} style={{color:'var(--text-tertiary)'}}/>
        {speeds.map(s=>(
          <SpeedBtn key={s} $active={playbackState.speed===s} onClick={()=>setSpeed(s)}>{s}x</SpeedBtn>
        ))}
      </SpeedRow>

      <Stats>
        <span>{playbackState.currentFrame}/{playbackState.totalFrames}</span>
        <span>{playbackState.speed}x</span>
        <span>{playbackState.isPlaying?'▶ Playing':playbackState.isPaused?'⏸ Paused':'⏹ Stopped'}</span>
      </Stats>
    </Wrap>
  );
};
