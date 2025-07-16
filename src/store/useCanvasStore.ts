import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { Node, Edge, CanvasState, ViewportState, Point, NodeType, HistoryState } from '@/types';

interface CanvasStore extends CanvasState {
  // Node operations
  addNode: (type: NodeType, position: Point) => void;
  addTextNode: (textNode: any) => void;
  updateNode: (id: string, updates: Partial<Node>) => void;
  deleteNode: (id: string) => void;
  selectNode: (id: string, multiSelect?: boolean) => void;
  selectNodes: (ids: string[]) => void;
  clearSelection: () => void;
  deleteSelected: () => void;
  
  // Edge operations
  addEdge: (sourceNodeId: string, targetNodeId: string) => void;
  deleteEdge: (id: string) => void;
  updateEdgeAnchors: (edgeId: string, sourceAnchor: Point, targetAnchor: Point) => void;
  
  // Viewport operations
  setViewport: (viewport: Partial<ViewportState>) => void;
  zoom: (delta: number, center: Point) => void;
  pan: (delta: Point) => void;
  
  // Tool operations
  setTool: (tool: CanvasState['tool']) => void;
  startConnection: (nodeId: string) => void;
  endConnection: (nodeId: string) => void;
  cancelConnection: () => void;
  
  // Selection operations
  startSelectionBox: (point: Point) => void;
  updateSelectionBox: (point: Point) => void;
  endSelectionBox: () => void;
  
  // Interaction states
  setDragging: (isDragging: boolean) => void;
  setPanning: (isPanning: boolean) => void;
  
  // History operations
  undo: () => void;
  redo: () => void;
  saveHistory: () => void;
  
  // Canvas operations
  clear: () => void;
  loadCanvas: (nodes: Node[], edges: Edge[]) => void;
}

const DEFAULT_NODE_SIZE = { width: 120, height: 80 };
const DEFAULT_VIEWPORT = { x: 0, y: 0, scale: 1 };

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  // Initial state
  nodes: [],
  edges: [],
  selectedNodes: [],
  selectedEdges: [],
  viewport: DEFAULT_VIEWPORT,
  tool: 'select',
  isConnecting: false,
  connectionSource: null,
  history: [],
  historyIndex: -1,
  isDragging: false,
  isPanning: false,
  selectionBox: null,

  // Node operations
  addNode: (type: NodeType, position: Point) => {
    const node: Node = {
      id: uuidv4(),
      type,
      position,
      size: DEFAULT_NODE_SIZE,
      text: 'New Node',
      fill: '#ffffff',
      stroke: '#666666',
      strokeWidth: 2,
    };
    
    set((state) => ({
      nodes: [...state.nodes, node],
      selectedNodes: [node.id],
      selectedEdges: [],
    }));
    
    get().saveHistory();
  },

  addTextNode: (position: Point) => {
    const node: Node = {
      id: uuidv4(),
      type: 'text' as NodeType,
      position,
      size: { width: 100, height: 30 },
      text: 'Click to edit',
      fill: 'transparent',
      stroke: 'transparent',
      strokeWidth: 0,
    };
    
    set((state) => ({
      nodes: [...state.nodes, node],
      selectedNodes: [node.id],
      selectedEdges: [],
    }));
    
    get().saveHistory();
  },

  updateNode: (id: string, updates: Partial<Node>) => {
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === id ? { ...node, ...updates } : node
      ),
    }));
  },

  deleteNode: (id: string) => {
    set((state) => ({
      nodes: state.nodes.filter((node) => node.id !== id),
      edges: state.edges.filter(
        (edge) => edge.sourceNodeId !== id && edge.targetNodeId !== id
      ),
      selectedNodes: state.selectedNodes.filter((nodeId) => nodeId !== id),
    }));
    
    get().saveHistory();
  },

  selectNode: (id: string, multiSelect = false) => {
    set((state) => {
      const isSelected = state.selectedNodes.includes(id);
      
      if (multiSelect) {
        return {
          selectedNodes: isSelected
            ? state.selectedNodes.filter((nodeId) => nodeId !== id)
            : [...state.selectedNodes, id],
          selectedEdges: [],
        };
      }
      
      return {
        selectedNodes: isSelected ? [] : [id],
        selectedEdges: [],
      };
    });
  },

  selectNodes: (ids: string[]) => {
    set({
      selectedNodes: ids,
      selectedEdges: [],
    });
  },

  clearSelection: () => {
    set({
      selectedNodes: [],
      selectedEdges: [],
    });
  },

  deleteSelected: () => {
    const { selectedNodes, selectedEdges } = get();
    
    set((state) => ({
      nodes: state.nodes.filter((node) => !selectedNodes.includes(node.id)),
      edges: state.edges.filter(
        (edge) =>
          !selectedEdges.includes(edge.id) &&
          !selectedNodes.includes(edge.sourceNodeId) &&
          !selectedNodes.includes(edge.targetNodeId)
      ),
      selectedNodes: [],
      selectedEdges: [],
    }));
    
    get().saveHistory();
  },

  // Edge operations
  addEdge: (sourceNodeId: string, targetNodeId: string) => {
    const { nodes, edges } = get();
    const sourceNode = nodes.find((n) => n.id === sourceNodeId);
    const targetNode = nodes.find((n) => n.id === targetNodeId);
    
    if (!sourceNode || !targetNode) return;
    
    // Check if connection already exists
    const existingConnection = edges.find(edge => 
      (edge.sourceNodeId === sourceNodeId && edge.targetNodeId === targetNodeId) ||
      (edge.sourceNodeId === targetNodeId && edge.targetNodeId === sourceNodeId)
    );
    
    if (existingConnection) return; // Don't create duplicate connections
    
    // Calculate anchor points (center of nodes for now)
    const sourceAnchor = {
      x: sourceNode.position.x + sourceNode.size.width / 2,
      y: sourceNode.position.y + sourceNode.size.height / 2,
    };
    
    const targetAnchor = {
      x: targetNode.position.x + targetNode.size.width / 2,
      y: targetNode.position.y + targetNode.size.height / 2,
    };
    
    const edge: Edge = {
      id: uuidv4(),
      sourceNodeId,
      targetNodeId,
      sourceAnchor,
      targetAnchor,
    };
    
    set((state) => ({
      edges: [...state.edges, edge],
      isConnecting: false,
      connectionSource: null,
      tool: 'select', // Return to select tool
    }));
    
    get().saveHistory();
  },

  deleteEdge: (id: string) => {
    set((state) => ({
      edges: state.edges.filter((edge) => edge.id !== id),
      selectedEdges: state.selectedEdges.filter((edgeId) => edgeId !== id),
    }));
    
    get().saveHistory();
  },

  updateEdgeAnchors: (edgeId: string, sourceAnchor: Point, targetAnchor: Point) => {
    set((state) => ({
      edges: state.edges.map((edge) =>
        edge.id === edgeId ? { ...edge, sourceAnchor, targetAnchor } : edge
      ),
    }));
  },

  // Viewport operations
  setViewport: (viewport: Partial<ViewportState>) => {
    set((state) => ({
      viewport: { ...state.viewport, ...viewport },
    }));
  },

  zoom: (delta: number, center: Point) => {
    const { viewport } = get();
    const newScale = Math.max(0.1, Math.min(3, viewport.scale + delta));
    
    const scaleDiff = newScale - viewport.scale;
    const newX = viewport.x - (center.x * scaleDiff);
    const newY = viewport.y - (center.y * scaleDiff);
    
    set({
      viewport: {
        x: newX,
        y: newY,
        scale: newScale,
      },
    });
  },

  pan: (delta: Point) => {
    set((state) => ({
      viewport: {
        ...state.viewport,
        x: state.viewport.x + delta.x,
        y: state.viewport.y + delta.y,
      },
    }));
  },

  // Tool operations
  setTool: (tool: CanvasState['tool']) => {
    if (tool === 'line') {
      set({ tool });
    } else {
      set({ tool, isConnecting: false, connectionSource: null });
    }
  },

  startConnection: (nodeId: string) => {
    set({
      isConnecting: true,
      connectionSource: nodeId,
      tool: 'line',
    });
  },

  endConnection: (nodeId: string) => {
    const { connectionSource } = get();
    if (connectionSource && connectionSource !== nodeId) {
      get().addEdge(connectionSource, nodeId);
    }
    set({
      isConnecting: false,
      connectionSource: null,
      tool: 'select',
    });
  },

  cancelConnection: () => {
    set({
      isConnecting: false,
      connectionSource: null,
      tool: 'select',
    });
  },

  // Selection operations
  startSelectionBox: (point: Point) => {
    set({
      selectionBox: {
        start: point,
        end: point,
        active: true,
      },
    });
  },

  updateSelectionBox: (point: Point) => {
    set((state) => ({
      selectionBox: state.selectionBox
        ? { ...state.selectionBox, end: point }
        : null,
    }));
  },

  endSelectionBox: () => {
    const { selectionBox, nodes } = get();
    
    if (selectionBox) {
      const { start, end } = selectionBox;
      const minX = Math.min(start.x, end.x);
      const maxX = Math.max(start.x, end.x);
      const minY = Math.min(start.y, end.y);
      const maxY = Math.max(start.y, end.y);
      
      const selectedNodeIds = nodes
        .filter((node) => {
          const nodeMinX = node.position.x;
          const nodeMaxX = node.position.x + node.size.width;
          const nodeMinY = node.position.y;
          const nodeMaxY = node.position.y + node.size.height;
          
          return (
            nodeMaxX >= minX &&
            nodeMinX <= maxX &&
            nodeMaxY >= minY &&
            nodeMinY <= maxY
          );
        })
        .map((node) => node.id);
      
      set({
        selectedNodes: selectedNodeIds,
        selectedEdges: [],
        selectionBox: null,
      });
    }
  },

  // Interaction states
  setDragging: (isDragging: boolean) => {
    set({ isDragging });
  },

  setPanning: (isPanning: boolean) => {
    set({ isPanning });
  },

  // History operations
  saveHistory: () => {
    const { nodes, edges, viewport, history, historyIndex } = get();
    const newHistoryState: HistoryState = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
      viewport: { ...viewport },
    };
    
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newHistoryState);
    
    // Limit history to 50 states
    if (newHistory.length > 50) {
      newHistory.shift();
    }
    
    set({
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  undo: () => {
    const { history, historyIndex } = get();
    
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      set({
        nodes: JSON.parse(JSON.stringify(prevState.nodes)),
        edges: JSON.parse(JSON.stringify(prevState.edges)),
        viewport: { ...prevState.viewport },
        historyIndex: historyIndex - 1,
        selectedNodes: [],
        selectedEdges: [],
      });
    }
  },

  redo: () => {
    const { history, historyIndex } = get();
    
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      set({
        nodes: JSON.parse(JSON.stringify(nextState.nodes)),
        edges: JSON.parse(JSON.stringify(nextState.edges)),
        viewport: { ...nextState.viewport },
        historyIndex: historyIndex + 1,
        selectedNodes: [],
        selectedEdges: [],
      });
    }
  },

  // Canvas operations
  clear: () => {
    set({
      nodes: [],
      edges: [],
      selectedNodes: [],
      selectedEdges: [],
      viewport: DEFAULT_VIEWPORT,
    });
    get().saveHistory();
  },

  loadCanvas: (nodes: Node[], edges: Edge[]) => {
    set({
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
      selectedNodes: [],
      selectedEdges: [],
      viewport: DEFAULT_VIEWPORT,
    });
    get().saveHistory();
  },
}));