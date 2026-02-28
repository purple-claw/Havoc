// ResizeHandle — A draggable edge for resizing panels horizontally
// Used between the main canvas and the debug/watch sidebar

import React, { useCallback, useRef, useEffect } from 'react';
import styled from 'styled-components';

const Handle = styled.div`
  width: 6px;
  cursor: col-resize;
  flex-shrink: 0;
  position: relative;
  z-index: 10;
  user-select: none;
  touch-action: none;

  &::after {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    left: 2px;
    width: 2px;
    background: var(--glass-border);
    transition: background var(--transition-fast);
  }

  &:hover::after,
  &:active::after {
    background: var(--accent-green);
    box-shadow: 0 0 8px rgba(0,230,118,0.3);
  }

  /* Slightly wider hit area */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    left: -3px;
    right: -3px;
  }
`;

interface ResizeHandleProps {
  onResize: (delta: number) => void;
  onResizeEnd?: () => void;
}

const ResizeHandle: React.FC<ResizeHandleProps> = ({ onResize, onResizeEnd }) => {
  const dragging = useRef(false);
  const lastX = useRef(0);

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging.current) return;
    const delta = e.clientX - lastX.current;
    lastX.current = e.clientX;
    onResize(delta);
  }, [onResize]);

  const onMouseUp = useCallback(() => {
    dragging.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    onResizeEnd?.();
  }, [onResizeEnd]);

  useEffect(() => {
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [onMouseMove, onMouseUp]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    lastX.current = e.clientX;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  return <Handle onMouseDown={onMouseDown} />;
};

export default ResizeHandle;
