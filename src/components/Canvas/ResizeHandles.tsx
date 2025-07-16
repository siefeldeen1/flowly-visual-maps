import React from 'react';
import { Circle } from 'react-konva';
import { Node } from '@/types';

interface ResizeHandlesProps {
  node: Node;
  isSelected: boolean;
  onResize: (newSize: { width: number; height: number }) => void;
  viewport: { scale: number };
}

export const ResizeHandles: React.FC<ResizeHandlesProps> = ({ 
  node, 
  isSelected, 
  onResize,
  viewport 
}) => {
  if (!isSelected) return null;

  const handleSize = 6 / viewport.scale;
  const strokeWidth = 1 / viewport.scale;

  const handles = [
    { x: node.position.x, y: node.position.y, cursor: 'nw-resize' }, // top-left
    { x: node.position.x + node.size.width, y: node.position.y, cursor: 'ne-resize' }, // top-right
    { x: node.position.x + node.size.width, y: node.position.y + node.size.height, cursor: 'se-resize' }, // bottom-right
    { x: node.position.x, y: node.position.y + node.size.height, cursor: 'sw-resize' }, // bottom-left
    { x: node.position.x + node.size.width / 2, y: node.position.y, cursor: 'n-resize' }, // top-center
    { x: node.position.x + node.size.width, y: node.position.y + node.size.height / 2, cursor: 'e-resize' }, // right-center
    { x: node.position.x + node.size.width / 2, y: node.position.y + node.size.height, cursor: 's-resize' }, // bottom-center
    { x: node.position.x, y: node.position.y + node.size.height / 2, cursor: 'w-resize' }, // left-center
  ];

  return (
    <>
      {handles.map((handle, index) => (
        <Circle
          key={index}
          x={handle.x}
          y={handle.y}
          radius={handleSize}
          fill="hsl(var(--background))"
          stroke="hsl(var(--primary))"
          strokeWidth={strokeWidth}
          draggable
          onDragMove={(e) => {
            const stage = e.target.getStage();
            if (!stage) return;

            const newPos = e.target.position();
            const originalPos = node.position;
            const originalSize = node.size;

            let newSize = { ...originalSize };
            let newPosition = { ...originalPos };

            // Calculate new size based on which handle is being dragged
            switch (index) {
              case 0: // top-left
                newSize.width = originalPos.x + originalSize.width - newPos.x;
                newSize.height = originalPos.y + originalSize.height - newPos.y;
                newPosition.x = newPos.x;
                newPosition.y = newPos.y;
                break;
              case 1: // top-right
                newSize.width = newPos.x - originalPos.x;
                newSize.height = originalPos.y + originalSize.height - newPos.y;
                newPosition.y = newPos.y;
                break;
              case 2: // bottom-right
                newSize.width = newPos.x - originalPos.x;
                newSize.height = newPos.y - originalPos.y;
                break;
              case 3: // bottom-left
                newSize.width = originalPos.x + originalSize.width - newPos.x;
                newSize.height = newPos.y - originalPos.y;
                newPosition.x = newPos.x;
                break;
              case 4: // top-center
                newSize.height = originalPos.y + originalSize.height - newPos.y;
                newPosition.y = newPos.y;
                break;
              case 5: // right-center
                newSize.width = newPos.x - originalPos.x;
                break;
              case 6: // bottom-center
                newSize.height = newPos.y - originalPos.y;
                break;
              case 7: // left-center
                newSize.width = originalPos.x + originalSize.width - newPos.x;
                newPosition.x = newPos.x;
                break;
            }

            // Minimum size constraints
            newSize.width = Math.max(20, newSize.width);
            newSize.height = Math.max(20, newSize.height);

            onResize(newSize);
            
            // Update node position if needed
            if (newPosition.x !== originalPos.x || newPosition.y !== originalPos.y) {
              // This should trigger a position update in the parent component
              e.target.setPosition({ x: handle.x, y: handle.y });
            }
          }}
          onMouseEnter={(e) => {
            const stage = e.target.getStage();
            if (stage) {
              stage.container().style.cursor = handle.cursor;
            }
          }}
          onMouseLeave={(e) => {
            const stage = e.target.getStage();
            if (stage) {
              stage.container().style.cursor = 'default';
            }
          }}
        />
      ))}
    </>
  );
};