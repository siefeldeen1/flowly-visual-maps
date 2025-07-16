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
      if (e.evt.button === 2) { // Right mouse button for panning
        setPanning(true);
        if (stageRef.current) {
          stageRef.current.container().style.cursor = 'move';
        }
      } else if (e.evt.button === 0) { // Left mouse button
        // Check if clicking on empty space
        const clickedOnEmpty = e.target === stage;
        
        if (clickedOnEmpty) {
          clearSelection();
          startSelectionBox(worldPos);
        }
      }
    }
  }, [tool, viewport, setPanning, clearSelection, startSelectionBox]);

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
    
    // Reset cursor
    if (stageRef.current) {
      stageRef.current.container().style.cursor = 'default';
    }
    
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
        onContextMenu={(e) => e.evt.preventDefault()}
        draggable={false}
      >
        <Layer>
          {/* Infinite Grid */}
          {(() => {
            const gridSize = 20;
            const scale = viewport.scale;
            
            // Calculate visible area bounds in world coordinates
            const worldBounds = {
              left: (-viewport.x) / scale - gridSize * 10,
              top: (-viewport.y) / scale - gridSize * 10,
              right: (width - viewport.x) / scale + gridSize * 10,
              bottom: (height - viewport.y) / scale + gridSize * 10,
            };
            
            const startX = Math.floor(worldBounds.left / gridSize) * gridSize;
            const startY = Math.floor(worldBounds.top / gridSize) * gridSize;
            const endX = Math.ceil(worldBounds.right / gridSize) * gridSize;
            const endY = Math.ceil(worldBounds.bottom / gridSize) * gridSize;
            
            const lines = [];
            
            // Vertical lines
            for (let x = startX; x <= endX; x += gridSize) {
              lines.push(
                <Line
                  key={`v-${x}`}
                  points={[x, worldBounds.top, x, worldBounds.bottom]}
                  stroke="hsl(var(--canvas-grid))"
                  strokeWidth={0.5 / scale}
                  opacity={0.4}
                  listening={false}
                />
              );
            }
            
            // Horizontal lines
            for (let y = startY; y <= endY; y += gridSize) {
              lines.push(
                <Line
                  key={`h-${y}`}
                  points={[worldBounds.left, y, worldBounds.right, y]}
                  stroke="hsl(var(--canvas-grid))"
                  strokeWidth={0.5 / scale}
                  opacity={0.4}
                  listening={false}
                />
              );
            }
            
            return lines;
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