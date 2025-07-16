export type NodeType = 'rectangle' | 'ellipse' | 'diamond' | 'text';

export interface Point {
  x: number;
  y: number;
}

export interface Node {
  id: string;
  type: NodeType;
  position: Point;
  size: {
    width: number;
    height: number;
  };
  text: string;
  fill: string;
  stroke: string;
  strokeWidth: number;
  selected?: boolean;
  dragging?: boolean;
}

export interface Edge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourceAnchor: Point;
  targetAnchor: Point;
  selected?: boolean;
}

export interface ViewportState {
  x: number;
  y: number;
  scale: number;
}

export interface HistoryState {
  nodes: Node[];
  edges: Edge[];
  viewport: ViewportState;
}

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface MindMap {
  id: string;
  name: string;
  userId: string;
  nodes: Node[];
  edges: Edge[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

export interface CanvasState {
  nodes: Node[];
  edges: Edge[];
  selectedNodes: string[];
  selectedEdges: string[];
  viewport: ViewportState;
  tool: 'select' | 'rectangle' | 'ellipse' | 'diamond' | 'text' | 'line';
  isConnecting: boolean;
  connectionSource: string | null;
  history: HistoryState[];
  historyIndex: number;
  isDragging: boolean;
  isPanning: boolean;
  selectionBox: {
    start: Point;
    end: Point;
    active: boolean;
  } | null;
}