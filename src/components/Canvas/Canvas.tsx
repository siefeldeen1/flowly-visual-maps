import React, { useRef, useEffect, useCallback } from 'react';
import { Stage, Layer, Line, Rect } from 'react-konva';
import Konva from 'konva';
import { useCanvasStore } from '@/store/useCanvasStore';
import { Point } from '@/types';
import { CanvasNode } from './CanvasNode';
import { CanvasEdge } from './CanvasEdge';

interface CanvasProps {
  width: number;
  height: number;
}

export const Canvas: React.FC<CanvasProps> = ({ width, height }) => {
  const stageRef = useRef<Konva.Stage>(null);
  
  const {
    nodes,
    edges,
    selectedNodes,
    viewport,
    tool,
    isConnecting,
    selectionBox,
    isDragging,
    isPanning,
    zoom,
    pan,
    setViewport,
    setPanning,
    startSelectionBox,
    updateSelectionBox,
    endSelectionBox,
    clearSelection,
    addNode,
    selectNodes,
  } = useCanvasStore();

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        useCanvasStore.getState().deleteSelected();
      } else if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') {
          e.preventDefault();
          if (e.shiftKey) {
            useCanvasStore.getState().redo();
          } else {
            useCanvasStore.getState().undo();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle mouse wheel for zooming
  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    
    if (!stageRef.current) return;

    const stage = stageRef.current;
    const pointer = stage.getPointerPosition();
    
    if (pointer) {
      const zoomDelta = e.evt.deltaY > 0 ? -0.1 : 0.1;
      zoom(zoomDelta, pointer);
    }
  }, [zoom]);

  // Handle stage events
  const handleStageMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!stageRef.current) return;

    const stage = stageRef.current;
    const pos = stage.getPointerPosition();
    if (!pos) return;

    // Convert screen coordinates to world coordinates
    const worldPos = {
      x: (pos.x - viewport.x) / viewport.scale,
      y: (pos.y - viewport.y) / viewport.scale,
    };

    // Handle different tools
    if (tool === 'select') {
      if (e.evt.button === 1) { // Middle mouse button
        setPanning(true);
      } else if (e.evt.button === 0) { // Left mouse button
        // Check if clicking on empty space
        const clickedOnEmpty = e.target === stage;
        
        if (clickedOnEmpty) {
          // If holding Ctrl/Cmd, start panning instead of selection
          if (e.evt.ctrlKey || e.evt.metaKey) {
            setPanning(true);
          } else {
            clearSelection();
            startSelectionBox(worldPos);
          }
        }
      }
    } else if (tool === 'rectangle' || tool === 'ellipse' || tool === 'diamond') {
      addNode(tool, worldPos);
    } else if (tool === 'text') {
      // Add text node
      const textNode = {
        id: Date.now().toString(),
        type: 'text' as const,
        position: worldPos,
        text: 'Click to edit',
        fontSize: 16,
        fill: 'hsl(var(--foreground))',
      };
      useCanvasStore.getState().addTextNode(textNode);
    } else if (tool === 'line' && !isConnecting) {
      // When line tool is active, clicking starts connection mode
      // This will be handled by node clicks to start connections
    }
  }, [tool, viewport, setPanning, clearSelection, startSelectionBox, addNode]);

  const lastMousePos = useRef<Point | null>(null);

  const handleStageMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!stageRef.current) return;

    const stage = stageRef.current;
    const pos = stage.getPointerPosition();
    if (!pos) return;

    if (isPanning && lastMousePos.current) {
      const deltaX = pos.x - lastMousePos.current.x;
      const deltaY = pos.y - lastMousePos.current.y;
      pan({ x: deltaX, y: deltaY });
    } else if (selectionBox?.active) {
      const worldPos = {
        x: (pos.x - viewport.x) / viewport.scale,
        y: (pos.y - viewport.y) / viewport.scale,
      };
      updateSelectionBox(worldPos);
    }

    lastMousePos.current = pos;
  }, [isPanning, selectionBox, viewport, pan, updateSelectionBox]);

  const handleStageMouseUp = useCallback(() => {
    setPanning(false);
    lastMousePos.current = null;
    
    if (selectionBox?.active) {
      endSelectionBox();
    }
  }, [setPanning, selectionBox, endSelectionBox]);

  // Set up stage transform
  useEffect(() => {
    if (stageRef.current) {
      stageRef.current.position({ x: viewport.x, y: viewport.y });
      stageRef.current.scale({ x: viewport.scale, y: viewport.scale });
    }
  }, [viewport]);

  return (
    <div className="relative w-full h-full bg-canvas-bg overflow-hidden">
      <Stage
        ref={stageRef}
        width={width}
        height={height}
        onWheel={handleWheel}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
        draggable={false}
      >
        <Layer>
          {/* Infinite Grid */}
          {(() => {
            const gridSize = 20;
            const scale = viewport.scale;
            const offsetX = viewport.x % (gridSize * scale);
            const offsetY = viewport.y % (gridSize * scale);
            
            const startX = -offsetX / scale;
            const startY = -offsetY / scale;
            const endX = (width - offsetX) / scale;
            const endY = (height - offsetY) / scale;
            
            const verticalLines = [];
            const horizontalLines = [];
            
            for (let x = startX; x <= endX + gridSize; x += gridSize) {
              verticalLines.push(
                <Line
                  key={`v-${Math.floor(x / gridSize)}`}
                  points={[x, startY - gridSize, x, endY + gridSize]}
                  stroke="hsl(var(--canvas-grid))"
                  strokeWidth={0.5 / scale}
                  opacity={0.3}
                />
              );
            }
            
            for (let y = startY; y <= endY + gridSize; y += gridSize) {
              horizontalLines.push(
                <Line
                  key={`h-${Math.floor(y / gridSize)}`}
                  points={[startX - gridSize, y, endX + gridSize, y]}
                  stroke="hsl(var(--canvas-grid))"
                  strokeWidth={0.5 / scale}
                  opacity={0.3}
                />
              );
            }
            
            return [...verticalLines, ...horizontalLines];
          })()}
          
          {/* Edges */}
          {edges.map((edge) => (
            <CanvasEdge key={edge.id} edge={edge} />
          ))}
          
          {/* Nodes */}
          {nodes.map((node) => (
            <CanvasNode
              key={node.id}
              node={node}
              isSelected={selectedNodes.includes(node.id)}
            />
          ))}
          
          {/* Selection box */}
          {selectionBox?.active && (
            <Rect
              x={Math.min(selectionBox.start.x, selectionBox.end.x)}
              y={Math.min(selectionBox.start.y, selectionBox.end.y)}
              width={Math.abs(selectionBox.end.x - selectionBox.start.x)}
              height={Math.abs(selectionBox.end.y - selectionBox.start.y)}
              fill="hsl(var(--selection-box) / 0.1)"
              stroke="hsl(var(--selection-box))"
              strokeWidth={1}
              dash={[5, 5]}
            />
          )}
        </Layer>
      </Stage>
    </div>
  );
};