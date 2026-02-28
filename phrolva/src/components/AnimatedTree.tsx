// AnimatedTree — binary tree visualization with smooth spring-based layout
// Nodes appear with scale-in animation, edges draw themselves, visits pulse with glow

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { animated, useSprings } from '@react-spring/web';
import styled from 'styled-components';
import type { AnimationCommand } from '../types/animation.types';

const Container = styled.div`
  width: 100%;
  height: 500px;
  position: relative;
  overflow: auto;
`;

const SVGCanvas = styled.svg`
  width: 100%;
  height: 100%;
`;

const NodeGroup = styled(animated.g)`
  cursor: pointer;
`;

const NODE_RADIUS = 22;
const LEVEL_HEIGHT = 70;

interface TreeNode {
  id: string;
  value: any;
  x: number;
  y: number;
  parentId?: string;
  isVisited: boolean;
  isHighlighted: boolean;
  color: string;
}

interface TreeEdge {
  from: string;
  to: string;
  isTraversed: boolean;
}

// Compute tree layout positions
function computeLayout(
  nodes: Map<string, { value: any; children: string[] }>,
  rootId: string,
  width: number
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();

  function layoutSubtree(
    nodeId: string,
    depth: number,
    leftBound: number,
    rightBound: number
  ) {
    const node = nodes.get(nodeId);
    if (!node) return;

    const x = (leftBound + rightBound) / 2;
    const y = 40 + depth * LEVEL_HEIGHT;
    positions.set(nodeId, { x, y });

    const children = node.children.filter((c) => nodes.has(c));
    if (children.length === 0) return;

    const segmentWidth = (rightBound - leftBound) / children.length;
    children.forEach((childId, i) => {
      layoutSubtree(
        childId,
        depth + 1,
        leftBound + i * segmentWidth,
        leftBound + (i + 1) * segmentWidth
      );
    });
  }

  layoutSubtree(rootId, 0, 0, width);
  return positions;
}

interface AnimatedTreeProps {
  commands: AnimationCommand[];
  currentFrame: number;
  speed: number;
}

const AnimatedTree: React.FC<AnimatedTreeProps> = ({ commands, currentFrame, speed }) => {
  const [treeNodes, setTreeNodes] = useState<TreeNode[]>([]);
  const [edges, setEdges] = useState<TreeEdge[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Build tree state from commands up to currentFrame
    const nodeMap = new Map<string, { value: any; children: string[]; parentId?: string }>();
    const visitedSet = new Set<string>();
    const highlightedSet = new Set<string>();
    const traversedEdges = new Set<string>();
    let rootId: string | null = null;

    for (let i = 0; i <= Math.min(currentFrame, commands.length - 1); i++) {
      const cmd = commands[i];
      if (!cmd) continue;

      const cmdType = typeof cmd.type === 'string' ? cmd.type.toUpperCase() : '';
      const target = String(cmd.target ?? '');
      const meta = cmd.metadata || {};

      if (cmdType === 'CREATE' || cmdType.includes('INSERT')) {
        const nodeId = target || `node_${i}`;
        const parentId = meta.parent ? String(meta.parent) : undefined;

        nodeMap.set(nodeId, {
          value: cmd.value ?? nodeId,
          children: [],
          parentId,
        });

        if (!rootId) rootId = nodeId;

        if (parentId && nodeMap.has(parentId)) {
          nodeMap.get(parentId)!.children.push(nodeId);
        }
      } else if (cmdType === 'VISIT' || cmdType === 'HIGHLIGHT') {
        visitedSet.add(target);
        highlightedSet.clear();
        highlightedSet.add(target);
      } else if (cmdType === 'TRAVERSE') {
        const from = meta.from ? String(meta.from) : '';
        const to = meta.to ? String(meta.to) : target;
        if (from && to) {
          traversedEdges.add(`${from}->${to}`);
        }
        visitedSet.add(to);
      } else if (cmdType === 'UNMARK') {
        highlightedSet.delete(target);
      } else if (cmdType === 'DELETE') {
        visitedSet.delete(target);
        nodeMap.delete(target);
      }
    }

    // Compute positions
    const width = containerRef.current?.clientWidth || 800;
    if (!rootId || nodeMap.size === 0) {
      setTreeNodes([]);
      setEdges([]);
      return;
    }

    const positions = computeLayout(nodeMap, rootId, width);

    // Build node list
    const nodeList: TreeNode[] = [];
    const edgeList: TreeEdge[] = [];

    nodeMap.forEach((data, id) => {
      const pos = positions.get(id) || { x: width / 2, y: 40 };
      nodeList.push({
        id,
        value: data.value,
        x: pos.x,
        y: pos.y,
        parentId: data.parentId,
        isVisited: visitedSet.has(id),
        isHighlighted: highlightedSet.has(id),
        color: highlightedSet.has(id)
          ? '#00d4ff'
          : visitedSet.has(id)
          ? '#43e97b'
          : '#667eea',
      });

      // Create edges from parent to children
      data.children.forEach((childId) => {
        edgeList.push({
          from: id,
          to: childId,
          isTraversed: traversedEdges.has(`${id}->${childId}`),
        });
      });
    });

    setTreeNodes(nodeList);
    setEdges(edgeList);
  }, [commands, currentFrame]);

  // Spring animations for nodes
  const springs = useSprings(
    treeNodes.length,
    treeNodes.map((node) => ({
      cx: node.x,
      cy: node.y,
      scale: node.isHighlighted ? 1.3 : 1,
      opacity: 1,
      glowRadius: node.isHighlighted ? 20 : 0,
      from: { cx: node.x, cy: -30, scale: 0, opacity: 0, glowRadius: 0 },
      config: { tension: 200, friction: 25 },
    }))
  );

  // Get node position by ID
  const nodePositions = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    treeNodes.forEach((n) => map.set(n.id, { x: n.x, y: n.y }));
    return map;
  }, [treeNodes]);

  return (
    <Container ref={containerRef}>
      <SVGCanvas viewBox={`0 0 ${containerRef.current?.clientWidth || 800} 500`}>
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="edgeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#667eea" />
            <stop offset="100%" stopColor="#764ba2" />
          </linearGradient>
        </defs>

        {/* Edges */}
        {edges.map((edge, i) => {
          const from = nodePositions.get(edge.from);
          const to = nodePositions.get(edge.to);
          if (!from || !to) return null;

          return (
            <line
              key={`edge-${i}`}
              x1={from.x}
              y1={from.y + NODE_RADIUS}
              x2={to.x}
              y2={to.y - NODE_RADIUS}
              stroke={edge.isTraversed ? '#43e97b' : '#555'}
              strokeWidth={edge.isTraversed ? 3 : 2}
              strokeLinecap="round"
              opacity={0.8}
            />
          );
        })}

        {/* Nodes */}
        {springs.map((style, i) => {
          const node = treeNodes[i];
          if (!node) return null;

          return (
            <NodeGroup key={node.id}>
              {/* Glow effect for highlighted nodes */}
              {node.isHighlighted && (
                <animated.circle
                  cx={style.cx}
                  cy={style.cy}
                  r={NODE_RADIUS + 8}
                  fill="none"
                  stroke="#00d4ff"
                  strokeWidth={2}
                  opacity={0.5}
                  filter="url(#glow)"
                />
              )}
              {/* Node circle */}
              <animated.circle
                cx={style.cx}
                cy={style.cy}
                r={NODE_RADIUS}
                fill={node.color}
                stroke={node.isHighlighted ? '#fff' : '#333'}
                strokeWidth={node.isHighlighted ? 2 : 1}
                style={{
                  opacity: style.opacity,
                  filter: node.isHighlighted ? 'url(#glow)' : undefined,
                }}
              />
              {/* Node value text */}
              <animated.text
                x={style.cx}
                y={style.cy}
                textAnchor="middle"
                dominantBaseline="central"
                fill="white"
                fontSize="13"
                fontWeight="bold"
                style={{ opacity: style.opacity }}
              >
                {String(node.value)}
              </animated.text>
            </NodeGroup>
          );
        })}
      </SVGCanvas>

      {treeNodes.length === 0 && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: '#666',
            fontStyle: 'italic',
          }}
        >
          Tree visualization will appear here
        </div>
      )}
    </Container>
  );
};

export default AnimatedTree;
