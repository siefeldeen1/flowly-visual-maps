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
          if (!e.evt.ctrlKey && !e.evt.metaKey) {
            clearSelection();
          }
          startSelectionBox(worldPos);
        }
      }
    } else if (tool === 'rectangle' || tool === 'ellipse' || tool === 'diamond') {
      addNode(tool, worldPos);
    }
  }, [tool, viewport, setPanning, clearSelection, startSelectionBox, addNode]);

  const handleStageMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!stageRef.current) return;

    const stage = stageRef.current;
    const pos = stage.getPointerPosition();
    if (!pos) return;

    if (isPanning) {
      const newPos = {
        x: pos.x - (stage.getPointerPosition()?.x || 0),
        y: pos.y - (stage.getPointerPosition()?.y || 0),
      };
      pan(newPos);
    } else if (selectionBox?.active) {
      const worldPos = {
        x: (pos.x - viewport.x) / viewport.scale,
        y: (pos.y - viewport.y) / viewport.scale,
      };
      updateSelectionBox(worldPos);
    }
  }, [isPanning, selectionBox, viewport, pan, updateSelectionBox]);

  const handleStageMouseUp = useCallback(() => {
    setPanning(false);
    
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
          {/* Grid */}
          {Array.from({ length: Math.ceil(width / 20) + 1 }, (_, i) => (
            <Line
              key={`v-${i}`}
              points={[i * 20, 0, i * 20, height]}
              stroke="hsl(var(--canvas-grid))"
              strokeWidth={0.5}
              opacity={0.3}
            />
          ))}
          {Array.from({ length: Math.ceil(height / 20) + 1 }, (_, i) => (
            <Line
              key={`h-${i}`}
              points={[0, i * 20, width, i * 20]}
              stroke="hsl(var(--canvas-grid))"
              strokeWidth={0.5}
              opacity={0.3}
            />
          ))}
          
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