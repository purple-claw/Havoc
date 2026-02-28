// AnimatedLinkedList — store-driven node-and-pointer visualization
// Rebuilds list from step variables, applies VISIT/TRAVERSE/CREATE effects

import React, { useEffect, useState, useCallback } from 'react';
import { useSprings, animated } from '@react-spring/web';
import styled, { css, keyframes } from 'styled-components';
import { useAnimationStore } from '../stores/animationStore';
import type { AnimationCommand } from '../types/animation.types';

const pulseGlow = keyframes`
  0%   { box-shadow: 0 0 0 0 rgba(24,255,255,0.4); }
  50%  { box-shadow: 0 0 14px 4px rgba(24,255,255,0.2); }
  100% { box-shadow: 0 0 0 0 rgba(24,255,255,0); }
`;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  padding: 2rem;
  overflow-x: auto;
  user-select: none;
`;

const ListTrack = styled.div`
  display: flex;
  align-items: center;
  padding: 1rem 2rem;
`;

type NodeStatus = 'idle' | 'visited' | 'highlight' | 'creating' | 'deleting';

const statusBg: Record<NodeStatus, string> = {
  idle: 'rgba(102,126,234,0.2)',
  visited: 'rgba(0,230,118,0.25)',
  highlight: 'rgba(24,255,255,0.2)',
  creating: 'rgba(0,230,118,0.3)',
  deleting: 'rgba(255,82,82,0.25)',
};
const statusBorder: Record<NodeStatus, string> = {
  idle: 'rgba(102,126,234,0.3)',
  visited: 'rgba(0,230,118,0.5)',
  highlight: 'rgba(24,255,255,0.5)',
  creating: 'rgba(0,230,118,0.6)',
  deleting: 'rgba(255,82,82,0.5)',
};

const NodeGroup = styled(animated.div)`
  display: flex;
  align-items: center;
`;

const DataCell = styled.div<{ $status: NodeStatus }>`
  min-width: 52px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 14px;
  font-family: var(--font-mono, monospace);
  color: var(--text-primary, #e0e0e0);
  background: ${p => statusBg[p.$status]};
  border-radius: 8px 0 0 8px;
  border: 1px solid ${p => statusBorder[p.$status]};
  border-right: none;
  transition: background 0.25s, border-color 0.25s;
  ${p => p.$status === 'highlight' && css`animation: ${pulseGlow} 0.7s ease-out;`}
`;

const PtrCell = styled.div<{ $isNull?: boolean }>`
  width: 26px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: ${p => p.$isNull ? 'var(--accent-red, #ff5252)' : 'var(--text-tertiary, #888)'};
  background: rgba(255,255,255,0.03);
  border-radius: 0 8px 8px 0;
  border: 1px solid rgba(255,255,255,0.08);
  border-left: 0;
`;

const ArrowLine = styled.div<{ $traversed?: boolean }>`
  width: 28px;
  height: 2px;
  background: ${p => p.$traversed ? 'var(--accent-green, #00e676)' : 'rgba(255,255,255,0.15)'};
  position: relative;
  margin: 0 2px;
  transition: background 0.3s;
  &::after {
    content: '';
    position: absolute;
    right: -5px;
    top: -4px;
    border-left: 7px solid ${p => p.$traversed ? 'var(--accent-green, #00e676)' : 'rgba(255,255,255,0.15)'};
    border-top: 5px solid transparent;
    border-bottom: 5px solid transparent;
  }
`;

const NullBox = styled.div`
  width: 24px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255,82,82,0.08);
  border: 1px solid rgba(255,82,82,0.25);
  border-radius: 6px;
  color: var(--accent-red, #ff5252);
  font-size: 8px;
  font-weight: 700;
`;

const InfoLabel = styled.div`
  font-size: 11px;
  color: var(--text-tertiary, #666);
  letter-spacing: 1.5px;
  text-transform: uppercase;
  margin-top: 10px;
`;

const ActionLabel = styled.div`
  margin-top: 6px;
  font-size: 12px;
  font-family: var(--font-mono, monospace);
  color: var(--accent-cyan, #18ffff);
`;

const EmptyMsg = styled.div`
  color: var(--text-tertiary, #555);
  font-style: italic;
  font-size: 13px;
`;

interface ListNodeState { value: string; status: NodeStatus; traversed: boolean; }

const AnimatedLinkedList: React.FC = () => {
  const { currentStepIndex, currentStep, debugState, vizData } = useAnimationStore();
  const currentStepCommands: AnimationCommand[] = useAnimationStore(
    s => (s as any).currentStepCommands ?? []
  );

  const [nodes, setNodes] = useState<ListNodeState[]>([]);
  const [actionText, setActionText] = useState('');

  const findListVar = useCallback((vars: Record<string, any>): any[] | null => {
    if (!vars) return null;
    const ds = vizData?.visualizer_config?.data_structures;
    const hints = [...(ds?.arrays ?? [])];
    const names = ['linked_list', 'list', 'll', 'nodes', 'head'];
    for (const n of [...hints, ...names]) {
      if (Array.isArray(vars[n])) return vars[n];
    }
    // Try to find a list variable
    for (const v of Object.values(vars)) {
      if (Array.isArray(v)) return v;
    }
    return null;
  }, [vizData]);

  useEffect(() => {
    if (currentStepIndex < 0 || !currentStep) {
      if (debugState === 'idle' || debugState === 'ready') { setNodes([]); setActionText(''); }
      return;
    }

    const arr = findListVar(currentStep.variables);
    if (!arr) return;

    const newNodes: ListNodeState[] = arr.map((v: any) => ({
      value: typeof v === 'object' ? JSON.stringify(v) : String(v),
      status: 'idle' as NodeStatus,
      traversed: false,
    }));

    // Apply command visual effects
    let action = '';
    for (const cmd of currentStepCommands) {
      const t = typeof cmd.type === 'string' ? cmd.type.toUpperCase() : '';
      const indices: number[] = (cmd as any).indices ?? [];
      const ids: string[] = (cmd as any).ids ?? [];

      if (t === 'CREATE') {
        const pos = cmd.values?.position ?? cmd.metadata?.position;
        if (pos !== undefined && newNodes[pos]) newNodes[pos].status = 'creating';
        else if (newNodes.length > 0) newNodes[newNodes.length - 1].status = 'creating';
        action = `insert(${cmd.values?.value ?? ''})`;
      } else if (t === 'DELETE') {
        action = `delete(${cmd.values?.value ?? ''})`;
      } else if (t === 'VISIT' || t === 'TRAVERSE') {
        for (const i of indices) {
          if (newNodes[i]) { newNodes[i].status = 'visited'; newNodes[i].traversed = true; }
        }
        // Mark by id too
        for (let i = 0; i < Math.min(ids.length, newNodes.length); i++) {
          newNodes[i].status = 'visited';
          newNodes[i].traversed = true;
        }
        action = t === 'TRAVERSE' ? 'traverse' : 'visit';
      } else if (t === 'HIGHLIGHT') {
        for (const i of indices) {
          if (newNodes[i]) newNodes[i].status = 'highlight';
        }
      }
    }

    setNodes(newNodes);
    if (action) setActionText(action);
  }, [currentStepIndex, currentStep, currentStepCommands, findListVar, debugState]);

  const springs = useSprings(
    nodes.length,
    nodes.map(() => ({
      opacity: 1, transform: 'scale(1)',
      config: { tension: 160, friction: 28 },
      from: { opacity: 0.5, transform: 'scale(0.8)' },
    }))
  );

  return (
    <Container>
      <ListTrack>
        {springs.map((style, i) => {
          const node = nodes[i];
          if (!node) return null;
          return (
            <React.Fragment key={i}>
              <NodeGroup style={style}>
                <DataCell $status={node.status}>{node.value}</DataCell>
                <PtrCell $isNull={i === nodes.length - 1}>
                  {i === nodes.length - 1 ? '/' : '>'}
                </PtrCell>
              </NodeGroup>
              {i < nodes.length - 1 && <ArrowLine $traversed={node.traversed} />}
            </React.Fragment>
          );
        })}
        {nodes.length > 0 && <NullBox>NULL</NullBox>}
        {nodes.length === 0 && <EmptyMsg>Empty Linked List</EmptyMsg>}
      </ListTrack>
      <InfoLabel>Linked List ({nodes.length} nodes)</InfoLabel>
      {actionText && <ActionLabel>{actionText}</ActionLabel>}
    </Container>
  );
};

export default AnimatedLinkedList;
