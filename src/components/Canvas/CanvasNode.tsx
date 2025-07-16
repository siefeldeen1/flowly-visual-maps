import React, { useRef, useCallback, useState } from 'react';
import { Group, Rect, Ellipse, Line, Text } from 'react-konva';
import Konva from 'konva';
import { Node, Point } from '@/types';
import { useCanvasStore } from '@/store/useCanvasStore';

interface CanvasNodeProps {
  node: Node;
  isSelected: boolean;
}

export const CanvasNode: React.FC<CanvasNodeProps> = ({ node, isSelected }) => {
  const groupRef = useRef<Konva.Group>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const {
    updateNode,
    selectNode,
    edges,
    updateEdgeAnchors,
    isConnecting,
    connectionSource,
    endConnection,
    startConnection,
  } = useCanvasStore();

  const handleDragStart = useCallback(() => {
    setIsDragging(true);
    if (!isSelected) {
      selectNode(node.id);
    }
  }, [isSelected, selectNode, node.id]);

  const handleDragMove = useCallback(() => {
    if (!groupRef.current) return;
    
    const newPosition = {
      x: groupRef.current.x(),
      y: groupRef.current.y(),
    };
    
    updateNode(node.id, { position: newPosition });
    
    // Update connected edges
    const connectedEdges = edges.filter(
      (edge) => edge.sourceNodeId === node.id || edge.targetNodeId === node.id
    );
    
    connectedEdges.forEach((edge) => {
      const sourceNode = edge.sourceNodeId === node.id ? 
        { ...node, position: newPosition } : 
        useCanvasStore.getState().nodes.find((n) => n.id === edge.sourceNodeId);
      
      const targetNode = edge.targetNodeId === node.id ? 
        { ...node, position: newPosition } : 
        useCanvasStore.getState().nodes.find((n) => n.id === edge.targetNodeId);
      
      if (sourceNode && targetNode) {
        const sourceAnchor = getNodeAnchor(sourceNode, targetNode);
        const targetAnchor = getNodeAnchor(targetNode, sourceNode);
        
        updateEdgeAnchors(edge.id, sourceAnchor, targetAnchor);
      }
    });
  }, [node, updateNode, edges, updateEdgeAnchors]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    useCanvasStore.getState().saveHistory();
  }, []);

  const handleClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true;
    
    if (isConnecting && connectionSource !== node.id) {
      endConnection(node.id);
    } else if (e.evt.ctrlKey || e.evt.metaKey) {
      selectNode(node.id, true);
    } else {
      selectNode(node.id);
    }
  }, [isConnecting, connectionSource, node.id, endConnection, selectNode]);

  const handleDoubleClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true;
    
    if (!isConnecting) {
      startConnection(node.id);
    }
  }, [isConnecting, startConnection, node.id]);

  const getNodeAnchor = (fromNode: Node, toNode: Node): Point => {
    const fromCenter = {
      x: fromNode.position.x + fromNode.size.width / 2,
      y: fromNode.position.y + fromNode.size.height / 2,
    };
    
    const toCenter = {
      x: toNode.position.x + toNode.size.width / 2,
      y: toNode.position.y + toNode.size.height / 2,
    };
    
    const dx = toCenter.x - fromCenter.x;
    const dy = toCenter.y - fromCenter.y;
    
    // Calculate intersection with rectangle bounds
    const halfWidth = fromNode.size.width / 2;
    const halfHeight = fromNode.size.height / 2;
    
    let x = fromCenter.x;
    let y = fromCenter.y;
    
    if (Math.abs(dx) > Math.abs(dy)) {
      // Horizontal edge
      x = fromCenter.x + (dx > 0 ? halfWidth : -halfWidth);
      y = fromCenter.y + (dy * halfWidth) / Math.abs(dx);
    } else {
      // Vertical edge
      x = fromCenter.x + (dx * halfHeight) / Math.abs(dy);
      y = fromCenter.y + (dy > 0 ? halfHeight : -halfHeight);
    }
    
    return { x, y };
  };

  const renderShape = () => {
    const shapeProps = {
      width: node.size.width,
      height: node.size.height,
      fill: node.fill,
      stroke: isSelected ? 'hsl(var(--primary))' : node.stroke,
      strokeWidth: isSelected ? 3 : node.strokeWidth,
    };

    switch (node.type) {
      case 'rectangle':
        return <Rect {...shapeProps} cornerRadius={4} />;
      
      case 'ellipse':
        return (
          <Ellipse
            radiusX={node.size.width / 2}
            radiusY={node.size.height / 2}
            x={node.size.width / 2}
            y={node.size.height / 2}
            fill={shapeProps.fill}
            stroke={shapeProps.stroke}
            strokeWidth={shapeProps.strokeWidth}
          />
        );
      
      case 'diamond':
        const points = [
          node.size.width / 2, 0, // top
          node.size.width, node.size.height / 2, // right
          node.size.width / 2, node.size.height, // bottom
          0, node.size.height / 2, // left
        ];
        return (
          <Line
            points={points}
            closed
            fill={shapeProps.fill}
            stroke={shapeProps.stroke}
            strokeWidth={shapeProps.strokeWidth}
          />
        );
      
      default:
        return <Rect {...shapeProps} />;
    }
  };

  return (
    <Group
      ref={groupRef}
      x={node.position.x}
      y={node.position.y}
      draggable
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      onDblClick={handleDoubleClick}
      opacity={isDragging ? 0.8 : 1}
    >
      {renderShape()}
      
      <Text
        text={node.text}
        x={0}
        y={0}
        width={node.size.width}
        height={node.size.height}
        align="center"
        verticalAlign="middle"
        fontSize={14}
        fontFamily="Arial"
        fill="hsl(var(--foreground))"
        wrap="word"
        ellipsis
      />
      
      {/* Selection handles */}
      {isSelected && (
        <>
          {/* Corner handles for resizing */}
          <Rect
            x={-4}
            y={-4}
            width={8}
            height={8}
            fill="hsl(var(--primary))"
            stroke="hsl(var(--background))"
            strokeWidth={1}
          />
          <Rect
            x={node.size.width - 4}
            y={-4}
            width={8}
            height={8}
            fill="hsl(var(--primary))"
            stroke="hsl(var(--background))"
            strokeWidth={1}
          />
          <Rect
            x={-4}
            y={node.size.height - 4}
            width={8}
            height={8}
            fill="hsl(var(--primary))"
            stroke="hsl(var(--background))"
            strokeWidth={1}
          />
          <Rect
            x={node.size.width - 4}
            y={node.size.height - 4}
            width={8}
            height={8}
            fill="hsl(var(--primary))"
            stroke="hsl(var(--background))"
            strokeWidth={1}
          />
        </>
      )}
    </Group>
  );
};