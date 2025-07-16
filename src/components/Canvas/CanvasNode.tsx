import React, { useRef, useCallback, useState } from 'react';
import { Group, Rect, Ellipse, Line, Text } from 'react-konva';
import Konva from 'konva';
import { Node, Point } from '@/types';
import { useCanvasStore } from '@/store/useCanvasStore';
import { ResizeHandles } from './ResizeHandles';

interface CanvasNodeProps {
  node: Node;
  isSelected: boolean;
}

export const CanvasNode: React.FC<CanvasNodeProps> = ({ node, isSelected }) => {
  const groupRef = useRef<Konva.Group>(null);
  const textRef = useRef<Konva.Text>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  const {
    updateNode,
    selectNode,
    edges,
    updateEdgeAnchors,
    isConnecting,
    connectionSource,
    endConnection,
    startConnection,
    tool,
    viewport,
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
    
    if (tool === 'line') {
      if (isConnecting && connectionSource) {
        if (connectionSource !== node.id) {
          // Check if connection already exists
          const existingConnection = edges.find(edge => 
            (edge.sourceNodeId === connectionSource && edge.targetNodeId === node.id) ||
            (edge.sourceNodeId === node.id && edge.targetNodeId === connectionSource)
          );
          
          if (!existingConnection) {
            endConnection(node.id);
          }
        }
      } else {
        startConnection(node.id);
      }
    } else {
      selectNode(node.id, e.evt.ctrlKey || e.evt.metaKey);
      if (node.type === 'text') {
        setIsEditing(true);
      }
    }
  }, [tool, isConnecting, connectionSource, node.id, edges, endConnection, selectNode, startConnection]);

  const handleDoubleClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true;
    
    if (node.type !== 'text') {
      setIsEditing(true);
    }
  }, [node.type]);

  const handleTextEdit = useCallback((e: Konva.KonvaEventObject<Event>) => {
    if (textRef.current) {
      const textNode = textRef.current;
      const stage = textNode.getStage();
      if (!stage) return;

      // Hide text node and create textarea
      textNode.hide();
      
      const textPosition = textNode.absolutePosition();
      const stageBox = stage.container().getBoundingClientRect();
      
      const textarea = document.createElement('textarea');
      document.body.appendChild(textarea);
      
      textarea.value = node.text || '';
      textarea.style.position = 'absolute';
      textarea.style.top = (stageBox.top + textPosition.y) + 'px';
      textarea.style.left = (stageBox.left + textPosition.x) + 'px';
      textarea.style.width = (node.size.width * viewport.scale) + 'px';
      textarea.style.height = (node.size.height * viewport.scale) + 'px';
      textarea.style.fontSize = (14 * viewport.scale) + 'px';
      textarea.style.border = '2px solid hsl(var(--primary))';
      textarea.style.padding = '4px';
      textarea.style.margin = '0px';
      textarea.style.overflow = 'hidden';
      textarea.style.background = 'hsl(var(--background))';
      textarea.style.color = 'hsl(var(--foreground))';
      textarea.style.outline = 'none';
      textarea.style.resize = 'none';
      textarea.style.textAlign = 'center';
      textarea.style.fontFamily = 'Arial';
      textarea.style.transformOrigin = 'left top';
      textarea.style.transform = `scale(${viewport.scale})`;
      
      textarea.focus();
      textarea.select();
      
      const removeTextarea = () => {
        textarea.parentNode?.removeChild(textarea);
        textNode.show();
        setIsEditing(false);
      };
      
      textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          updateNode(node.id, { text: textarea.value });
          removeTextarea();
        } else if (e.key === 'Escape') {
          removeTextarea();
        }
      });
      
      textarea.addEventListener('blur', () => {
        updateNode(node.id, { text: textarea.value });
        removeTextarea();
      });
    }
  }, [node, updateNode, viewport.scale]);

  const handleResize = useCallback((newSize: { width: number; height: number }) => {
    updateNode(node.id, { size: newSize });
  }, [node.id, updateNode]);

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
      fill: node.fill || 'hsl(var(--node-fill))',
      stroke: isSelected ? 'hsl(var(--primary))' : (node.stroke || 'hsl(var(--node-stroke))'),
      strokeWidth: (node.strokeWidth || 2) * (isSelected ? 1.5 : 1),
    };

    switch (node.type) {
      case 'text':
        // For text nodes, don't render a background shape
        return null;
      
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
      draggable={tool === 'select'}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      onDblClick={handleDoubleClick}
      opacity={isDragging ? 0.8 : 1}
    >
      {renderShape()}
      
      <Text
        ref={textRef}
        text={node.text || 'Text'}
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
        onDblClick={handleTextEdit}
      />
      
      <ResizeHandles
        node={node}
        isSelected={isSelected}
        onResize={handleResize}
        viewport={viewport}
      />
    </Group>
  );
};