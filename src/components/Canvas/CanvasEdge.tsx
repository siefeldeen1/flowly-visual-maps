import React, { useCallback } from 'react';
import { Line, Circle } from 'react-konva';
import Konva from 'konva';
import { Edge } from '@/types';
import { useCanvasStore } from '@/store/useCanvasStore';

interface CanvasEdgeProps {
  edge: Edge;
}

export const CanvasEdge: React.FC<CanvasEdgeProps> = ({ edge }) => {
  const { selectedEdges, deleteEdge } = useCanvasStore();
  const isSelected = selectedEdges.includes(edge.id);

  const handleClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true;
    // TODO: Implement edge selection
  }, []);

  const handleDoubleClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true;
    deleteEdge(edge.id);
  }, [edge.id, deleteEdge]);

  // Calculate arrow head
  const dx = edge.targetAnchor.x - edge.sourceAnchor.x;
  const dy = edge.targetAnchor.y - edge.sourceAnchor.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  
  if (length === 0) return null;
  
  const unitX = dx / length;
  const unitY = dy / length;
  
  // Arrow head size
  const arrowLength = 12;
  const arrowWidth = 6;
  
  // Arrow head position (slightly before the target anchor)
  const arrowBaseX = edge.targetAnchor.x - unitX * arrowLength;
  const arrowBaseY = edge.targetAnchor.y - unitY * arrowLength;
  
  // Arrow head points
  const perpX = -unitY;
  const perpY = unitX;
  
  const arrowPoints = [
    edge.targetAnchor.x, edge.targetAnchor.y, // tip
    arrowBaseX + perpX * arrowWidth, arrowBaseY + perpY * arrowWidth, // left wing
    arrowBaseX - perpX * arrowWidth, arrowBaseY - perpY * arrowWidth, // right wing
  ];

  return (
    <>
      {/* Main line */}
      <Line
        points={[
          edge.sourceAnchor.x,
          edge.sourceAnchor.y,
          arrowBaseX,
          arrowBaseY,
        ]}
        stroke={isSelected ? 'hsl(var(--primary))' : 'hsl(var(--connection-line))'}
        strokeWidth={isSelected ? 3 : 2}
        onClick={handleClick}
        onDblClick={handleDoubleClick}
        hitStrokeWidth={8}
      />
      
      {/* Arrow head */}
      <Line
        points={arrowPoints}
        closed
        fill={isSelected ? 'hsl(var(--primary))' : 'hsl(var(--connection-line))'}
        stroke={isSelected ? 'hsl(var(--primary))' : 'hsl(var(--connection-line))'}
        strokeWidth={1}
        onClick={handleClick}
        onDblClick={handleDoubleClick}
      />
      
      {/* Source connection point */}
      <Circle
        x={edge.sourceAnchor.x}
        y={edge.sourceAnchor.y}
        radius={3}
        fill="hsl(var(--connection-line))"
        opacity={0.7}
      />
      
      {/* Target connection point */}
      <Circle
        x={edge.targetAnchor.x}
        y={edge.targetAnchor.y}
        radius={3}
        fill="hsl(var(--connection-line))"
        opacity={0.7}
      />
    </>
  );
};