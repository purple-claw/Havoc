// AnimatedGraph - For visualizing graph algorithms with force-directed layouts
// Nodes that glow, edges that pulse, paths that highlight

import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import styled from 'styled-components';
import { useAnimationStore } from '../stores/animationStore';
import { CommandType } from '../types/animation.types';

const GraphContainer = styled.div`
  width: 100%;
  height: 500px;
  background: linear-gradient(180deg, #1a1a2e 0%, #0f0f23 100%);
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  position: relative;
`;

interface GraphNode {
  id: string;
  label: string;
  visited: boolean;
  color: string;
  x?: number;
  y?: number;
}

interface GraphEdge {
  source: string;
  target: string;
  traversed: boolean;
  color: string;
}

export const AnimatedGraph: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const { currentCommand } = useAnimationStore();
  
  // Sample graph data - in real app this comes from visualization data
  const graphData = {
    nodes: [
      { id: 'A', label: 'A', visited: false, color: '#667eea' },
      { id: 'B', label: 'B', visited: false, color: '#667eea' },
      { id: 'C', label: 'C', visited: false, color: '#667eea' },
      { id: 'D', label: 'D', visited: false, color: '#667eea' },
      { id: 'E', label: 'E', visited: false, color: '#667eea' },
      { id: 'F', label: 'F', visited: false, color: '#667eea' }
    ],
    edges: [
      { source: 'A', target: 'B', traversed: false, color: '#444' },
      { source: 'A', target: 'C', traversed: false, color: '#444' },
      { source: 'B', target: 'D', traversed: false, color: '#444' },
      { source: 'B', target: 'E', traversed: false, color: '#444' },
      { source: 'C', target: 'F', traversed: false, color: '#444' },
      { source: 'E', target: 'F', traversed: false, color: '#444' }
    ]
  };
  
  useEffect(() => {
    if (!svgRef.current) return;
    
    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;
    
    // Clear previous content
    svg.selectAll('*').remove();
    
    // Create force simulation
    const simulation = d3.forceSimulation(graphData.nodes as any)
      .force('link', d3.forceLink(graphData.edges)
        .id((d: any) => d.id)
        .distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2));
    
    // Create edges
    const link = svg.append('g')
      .selectAll('line')
      .data(graphData.edges)
      .enter().append('line')
      .attr('stroke', d => d.color)
      .attr('stroke-width', 2)
      .attr('opacity', 0.6);
    
    // Create nodes
    const node = svg.append('g')
      .selectAll('g')
      .data(graphData.nodes)
      .enter().append('g')
      .call(d3.drag<any, any>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended) as any);
    
    // Add circles to nodes
    node.append('circle')
      .attr('r', 25)
      .attr('fill', d => d.color)
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);
    
    // Add labels to nodes
    node.append('text')
      .text(d => d.label)
      .attr('text-anchor', 'middle')
      .attr('dy', '.35em')
      .attr('fill', 'white')
      .attr('font-size', '16px')
      .attr('font-weight', 'bold');
    
    // Update positions on tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);
      
      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });
    
    // Drag functions
    function dragstarted(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }
    
    function dragged(event: any, d: any) {
      d.fx = event.x;
      d.fy = event.y;
    }
    
    function dragended(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }
    
    return () => {
      simulation.stop();
    };
  }, []);
  
  // Handle animation commands
  useEffect(() => {
    if (!currentCommand || !svgRef.current) return;
    
    const svg = d3.select(svgRef.current);
    
    switch (currentCommand.type) {
      case CommandType.VISIT:
        // Animate node visit
        currentCommand.ids?.forEach(nodeId => {
          svg.selectAll('circle')
            .filter((d: any) => d.id === nodeId)
            .transition()
            .duration(currentCommand.duration)
            .attr('fill', '#ff6b6b')
            .attr('r', 30)
            .transition()
            .duration(200)
            .attr('r', 25);
        });
        break;
        
      case CommandType.TRAVERSE:
        // Animate edge traversal
        currentCommand.ids?.forEach(edgeId => {
          const [source, target] = edgeId.split('-');
          svg.selectAll('line')
            .filter((d: any) => 
              (d.source.id === source && d.target.id === target) ||
              (d.source.id === target && d.target.id === source))
            .transition()
            .duration(currentCommand.duration)
            .attr('stroke', '#4ecdc4')
            .attr('stroke-width', 4)
            .attr('opacity', 1);
        });
        break;
        
      case CommandType.MARK:
        // Mark nodes (e.g., frontier)
        currentCommand.ids?.forEach(nodeId => {
          svg.selectAll('circle')
            .filter((d: any) => d.id === nodeId)
            .transition()
            .duration(currentCommand.duration)
            .attr('fill', currentCommand.values?.color || '#ffd93d');
        });
        break;
    }
  }, [currentCommand]);
  
  return (
    <GraphContainer>
      <svg ref={svgRef} width="100%" height="100%" />
    </GraphContainer>
  );
};
