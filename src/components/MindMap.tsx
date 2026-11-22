"use client";

import React, { useCallback, useEffect, useMemo } from "react";
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  addEdge,
  ConnectionLineType,
  Panel,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  NodeProps,
  applyNodeChanges,
  NodeChange,
  NodePositionChange,
  ReactFlowProvider,
  useReactFlow
} from "@xyflow/react";
// @ts-ignore
import "@xyflow/react/dist/style.css";
import * as d3 from "d3-hierarchy";
import { toPng } from 'html-to-image';
import TimelineView from './TimelineView';

// Custom node component for premium styling
const CustomNode = ({ id, data, targetPosition, sourcePosition, isConnectable }: NodeProps) => {
  const [isWiggling, setIsWiggling] = React.useState(false);
  const { setNodes } = useReactFlow();

  React.useEffect(() => {
    if (data.collisionId) {
      setIsWiggling(true);
      const timer = setTimeout(() => setIsWiggling(false), 400);
      return () => clearTimeout(timer);
    }
  }, [data.collisionId]);

  const onToggleCollapse = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Use a custom event to tell FlowMap to update layout
    window.dispatchEvent(new CustomEvent('toggle-collapse', { detail: { id } }));
  };

  const depth = (data.depth as number) || 0;
  const depthColors = [
    '#8b5cf6', // 0: Purple (Root)
    '#3b82f6', // 1: Blue
    '#10b981', // 2: Emerald
    '#f59e0b', // 3: Amber
    '#ef4444', // 4: Red
    '#ec4899', // 5: Pink
    '#06b6d4', // 6: Cyan
  ];
  const nodeColor = depthColors[Math.min(depth, depthColors.length - 1)];

  return (
    <div 
      className={`mindmap-node ${data.isRoot ? 'root-node' : ''} ${isWiggling ? 'colliding' : ''} ${data.isSearchResult ? 'search-highlight' : ''}`}
      style={{
        borderLeft: `4px solid ${nodeColor}`,
        boxShadow: `0 4px 12px ${nodeColor}20`,
      }}
    >
      <Handle type="target" position={targetPosition || Position.Left} isConnectable={isConnectable} />
      {data.label as string}
      
      {data.hasChildren && (
        <button
          onClick={onToggleCollapse}
          className="collapse-btn"
          style={{
            position: 'absolute',
            right: '-12px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'var(--primary-color)',
            border: '2px solid var(--bg-color)',
            borderRadius: '50%',
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            cursor: 'pointer',
            fontSize: '16px',
            lineHeight: '1',
            zIndex: 10
          }}
        >
          {data.isCollapsed ? '+' : '-'}
        </button>
      )}
      
      <Handle type="source" position={sourcePosition || Position.Right} isConnectable={isConnectable} />
    </div>
  );
};

const nodeTypes = {
  custom: CustomNode,
};

const nodeWidth = 250;
const nodeHeight = 80;

const getLayoutedElements = (nodes: any[], edges: any[], direction = "TB") => {
  const isLR = direction === "LR";
  const gapBetweenNodes = 20;
  const gapBetweenRanks = 80;

  if (nodes.length === 0) return { nodes, edges };

  const sizeMap = new Map();
  nodes.forEach(node => {
    sizeMap.set(node.id, {
      w: node.measured?.width ?? nodeWidth,
      h: node.measured?.height ?? nodeHeight
    });
  });

  const nodeDataMap = new Map();
  nodes.forEach(node => {
    nodeDataMap.set(node.id, { ...node, children: [] });
  });

  const hasParent = new Set();
  edges.forEach(edge => {
    const parent = nodeDataMap.get(edge.source);
    const child = nodeDataMap.get(edge.target);
    if (parent && child) {
      parent.children.push(child);
      hasParent.add(child.id);
    }
  });

  const roots: any[] = [];
  nodeDataMap.forEach(node => {
    if (!hasParent.has(node.id)) roots.push(node);
  });

  const rootNode = roots[0];
  if (!rootNode) return { nodes, edges };

  const root = d3.hierarchy(rootNode, (d: any) => 
    (d.children.length > 0 && !d.data?.isCollapsed) ? d.children : null
  );

  const treeLayout = d3.tree()
    .nodeSize([1, 1])
    .separation((a: any, b: any) => {
      const sizeA = sizeMap.get(a.data.id);
      const sizeB = sizeMap.get(b.data.id);
      if (!sizeA || !sizeB) return 1;
      const dimA = isLR ? sizeA.h : sizeA.w;
      const dimB = isLR ? sizeB.h : sizeB.w;
      return (dimA / 2 + dimB / 2 + gapBetweenNodes);
    });

  treeLayout(root);

  const allDescendants = root.descendants();

  const maxDimPerDepth: number[] = [];
  allDescendants.forEach((d: any) => {
    const s = sizeMap.get(d.data.id);
    const dim = isLR ? s.w : s.h;
    maxDimPerDepth[d.depth] = Math.max(maxDimPerDepth[d.depth] ?? 0, dim);
  });

  const depthOffsets: number[] = [];
  let cumulative = 0;
  for (let i = 0; i < maxDimPerDepth.length; i++) {
    depthOffsets[i] = cumulative + maxDimPerDepth[i] / 2;
    cumulative += maxDimPerDepth[i] + gapBetweenRanks;
  }

  const newNodes = nodes.map((node) => {
    const layoutNode = allDescendants.find((d: any) => d.data.id === node.id);
    if (!layoutNode) {
      return { ...node, hidden: true };
    }

    const s = sizeMap.get(node.id) ?? { w: nodeWidth, h: nodeHeight };
    const crossAxis: number = layoutNode.x as number;
    const depthAxis: number = (depthOffsets[layoutNode.depth] ?? 0) as number;

    const centerX: number = isLR ? depthAxis : crossAxis;
    const centerY: number = isLR ? crossAxis : depthAxis;

    return {
      ...node,
      hidden: false,
      data: { ...node.data, depth: layoutNode.depth },
      targetPosition: isLR ? Position.Left : Position.Top,
      sourcePosition: isLR ? Position.Right : Position.Bottom,
      position: {
        x: centerX - s.w / 2,
        y: centerY - s.h / 2,
      }
    };
  });

  const hiddenNodeIds = new Set(newNodes.filter(n => n.hidden).map(n => n.id));
  const newEdges = edges.map(edge => {
    const hidden = hiddenNodeIds.has(edge.source) || hiddenNodeIds.has(edge.target);
    const sourceNode = allDescendants.find((d: any) => d.data.id === edge.source);
    const depth = sourceNode?.depth ?? 0;
    const strokeWidth = Math.max(1.5, 5 - depth * 0.8);
    
    return {
      ...edge,
      hidden,
      style: { strokeWidth, opacity: 0.5 + (1 / (depth + 2)) }
    };
  });

  return { nodes: newNodes, edges: newEdges };
};

// Flatten JSON to nodes and edges
const flattenMindMap = (data: any) => {
  const nodes: any[] = [];
  const edges: any[] = [];

  const traverse = (node: any, parentId: string | null = null) => {
    nodes.push({
      id: node.id,
      type: "custom",
      data: { 
        label: node.label, 
        isRoot: parentId === null,
        hasChildren: Boolean(node.children && node.children.length > 0),
        isCollapsed: false,
        date: node.date || null
      },
      position: { x: 0, y: 0 }, // Will be calculated by layout
    });

    if (parentId) {
      edges.push({
        id: `e-${parentId}-${node.id}`,
        source: parentId,
        target: node.id,
        type: "bezier",
        style: { stroke: "var(--edge-color)", strokeWidth: 2 },
      });
    }

    if (node.children) {
      node.children.forEach((child: any) => traverse(child, node.id));
    }
  };

  traverse(data);
  return { nodes, edges };
};

function FlowMap() {
  const [nodes, setNodes] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [baseEdges, setBaseEdges] = React.useState<any[]>([]);
  const [isLoadingData, setIsLoadingData] = React.useState(true);
  
  React.useEffect(() => {
    const storedNodes = localStorage.getItem('mindmap_nodes');
    const storedEdges = localStorage.getItem('mindmap_edges');
    
    if (storedNodes && storedEdges) {
      try {
        const parsedNodes = JSON.parse(storedNodes);
        const parsedEdges = JSON.parse(storedEdges);
        setNodes(parsedNodes);
        setEdges(parsedEdges);
        setBaseEdges(parsedEdges);
        setIsLayoutReady(true);
        setAppliedDirection('auto');
        setIsLoadingData(false);
        return; // Early return ha betöltöttünk mindent
      } catch (e) {
        console.error("Failed to parse localStorage mindmap:", e);
      }
    }

    fetch('/api/mindmap')
      .then(res => res.json())
      .then(data => {
        if (!data || data.error) return;
        const { nodes: newNodes, edges: newEdges } = flattenMindMap(data);
        setNodes(newNodes);
        setEdges(newEdges);
        setBaseEdges(newEdges);
        setIsLayoutReady(false);
        setAppliedDirection(null);
        setIsLoadingData(false);
      })
      .catch(err => {
        console.error("Failed to fetch mindmap data:", err);
        setIsLoadingData(false);
      });
  }, [setNodes, setEdges]);
  
  const [isLayoutReady, setIsLayoutReady] = React.useState(false);
  const [appliedDirection, setAppliedDirection] = React.useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = React.useState(true);
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<'map' | 'timeline'>('map');
  const [layoutDirection, setLayoutDirection] = React.useState("auto");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedNode, setSelectedNode] = React.useState<any | null>(null);
  const [layoutNeedsUpdate, setLayoutNeedsUpdate] = React.useState(false);
  const { fitView, setCenter, zoomIn, zoomOut, getZoom } = useReactFlow();

  type NodePositionMap = Record<string, { x: number, y: number }>;
  const [undoStack, setUndoStack] = React.useState<NodePositionMap[]>([]);
  const [redoStack, setRedoStack] = React.useState<NodePositionMap[]>([]);

  const saveToLocalStorage = useCallback((currentNodes: any[], currentEdges: any[]) => {
    try {
      localStorage.setItem('mindmap_nodes', JSON.stringify(currentNodes));
      localStorage.setItem('mindmap_edges', JSON.stringify(currentEdges));
    } catch (e) {
      console.error("Local storage save error", e);
    }
  }, []);

  const handleReset = () => {
    if (confirm("Biztosan visszaállítod a fát az alaphelyzetbe? Ezzel törlődik az összes kézi mozgatásod.")) {
      localStorage.removeItem('mindmap_nodes');
      localStorage.removeItem('mindmap_edges');
      window.location.reload();
    }
  };

  const getDescendants = useCallback((nodeId: string): string[] => {
    const children = edges.filter(e => e.source === nodeId).map(e => e.target);
    let descendants = [...children];
    children.forEach(child => {
      descendants = descendants.concat(getDescendants(child));
    });
    return descendants;
  }, [edges]);

  useEffect(() => {
    const handleToggleCollapse = (e: Event) => {
      const customEvent = e as CustomEvent;
      const nodeId = customEvent.detail.id;
      
      setNodes((nds) => {
        const node = nds.find(n => n.id === nodeId);
        if (!node) return nds;
        
        const isCurrentlyCollapsed = node.data.isCollapsed;
        
        return nds.map((n) => {
          if (n.id === nodeId) {
            return { ...n, data: { ...n.data, isCollapsed: !isCurrentlyCollapsed } };
          }
          return n;
        });
      });
      setLayoutNeedsUpdate(true);
    };

    window.addEventListener('toggle-collapse', handleToggleCollapse);
    return () => window.removeEventListener('toggle-collapse', handleToggleCollapse);
  }, [setNodes]);

  const onNodesChangeWithCollision = useCallback(
    (changes: NodeChange<any>[]) => {
      setNodes((nds) => {
        let finalNodes = applyNodeChanges(changes, nds);
        const positionChanges = changes.filter((c) => c.type === 'position' && c.position) as NodePositionChange[];
        
        if (positionChanges.length > 0) {
          const queue = [...positionChanges];
          
          for (const pc of positionChanges) {
            const node = finalNodes.find((n) => n.id === pc.id);
            if (node && pc.position && pc.positionAbsolute) {
              const dx = pc.positionAbsolute.x - node.position.x;
              const dy = pc.positionAbsolute.y - node.position.y;
              
              if (Math.abs(dx) > 0 || Math.abs(dy) > 0) {
                 const descendants = getDescendants(pc.id);
                 descendants.forEach(descId => {
                   const descIndex = finalNodes.findIndex(n => n.id === descId);
                   if (descIndex !== -1) {
                      finalNodes[descIndex] = {
                         ...finalNodes[descIndex],
                         position: {
                            x: finalNodes[descIndex].position.x + dx,
                            y: finalNodes[descIndex].position.y + dy,
                         }
                      };
                      queue.push({ id: descId, dx, dy } as any);
                   }
                 });
              }
            }
          }

          let iterations = 0;
          while (queue.length > 0 && iterations < 1000) {
            iterations++;
            const current: any = queue.shift()!;
            const pusher = finalNodes.find((n) => n.id === current.id);
            if (!pusher) continue;

            const rect1 = {
              x: pusher.position.x,
              y: pusher.position.y,
              width: pusher.measured?.width ?? nodeWidth,
              height: pusher.measured?.height ?? nodeHeight,
            };

            for (let i = 0; i < finalNodes.length; i++) {
              const otherNode = finalNodes[i];
              if (otherNode.id === current.id) continue;

              const rect2 = {
                x: otherNode.position.x,
                y: otherNode.position.y,
                width: otherNode.measured?.width ?? nodeWidth,
                height: otherNode.measured?.height ?? nodeHeight,
              };

              if (
                rect1.x < rect2.x + rect2.width &&
                rect1.x + rect1.width > rect2.x &&
                rect1.y < rect2.y + rect2.height &&
                rect1.y + rect1.height > rect2.y
              ) {
                finalNodes[i] = {
                  ...otherNode,
                  data: { ...otherNode.data, collisionId: Math.random() },
                  position: {
                    x: otherNode.position.x + (current.dx || 0),
                    y: otherNode.position.y + (current.dy || 0),
                  }
                };
                queue.push({ id: otherNode.id, dx: current.dx, dy: current.dy } as any);
              }
            }
          }
        }
        return finalNodes;
      });
    },
    [setNodes, getDescendants]
  );

  const [dragStartPositions, setDragStartPositions] = React.useState<NodePositionMap | null>(null);

  const onNodeDragStart = useCallback((event: React.MouseEvent, node: any, _nodes: any[]) => {
    const positions: NodePositionMap = {};
    nodes.forEach(n => {
      positions[n.id] = { ...n.position };
    });
    setDragStartPositions(positions);
  }, [nodes]);

  const onNodeDragStop = useCallback((event: React.MouseEvent, node: any, _nodes: any[]) => {
    if (dragStartPositions) {
      const moved = nodes.some(n => {
        const start = dragStartPositions[n.id];
        return start && (start.x !== n.position.x || start.y !== n.position.y);
      });
      if (moved) {
        setUndoStack(prev => [...prev, dragStartPositions]);
        setRedoStack([]);
        saveToLocalStorage(nodes, edges);
      }
      setDragStartPositions(null);
    }
  }, [dragStartPositions, nodes, edges, saveToLocalStorage]);

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const currentState: NodePositionMap = {};
    nodes.forEach(n => { currentState[n.id] = { ...n.position }; });
    
    const previousState = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));
    setRedoStack(prev => [...prev, currentState]);
    
    setNodes(nds => nds.map(n => {
      if (previousState[n.id]) {
        return { ...n, position: previousState[n.id] };
      }
      return n;
    }));
    
    setTimeout(() => saveToLocalStorage(nodes, edges), 100);
  }, [undoStack, nodes, edges, setNodes, saveToLocalStorage]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const currentState: NodePositionMap = {};
    nodes.forEach(n => { currentState[n.id] = { ...n.position }; });
    
    const nextState = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, -1));
    setUndoStack(prev => [...prev, currentState]);
    
    setNodes(nds => nds.map(n => {
      if (nextState[n.id]) {
        return { ...n, position: nextState[n.id] };
      }
      return n;
    }));

    setTimeout(() => saveToLocalStorage(nodes, edges), 100);
  }, [redoStack, nodes, edges, setNodes, saveToLocalStorage]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        handleUndo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        handleRedo();
      }
      if (e.key === 'F5' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        console.log("Ctrl+F5 blocked to prevent hard reset.");
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  useEffect(() => {
    if (isLoadingData) return;
    
    if (!isLayoutReady || layoutNeedsUpdate) {
      let targetDirection = layoutDirection;
      if (targetDirection === "auto") {
        targetDirection = window.innerWidth < 768 ? "TB" : "LR";
      }

      if (!isLayoutReady || targetDirection !== appliedDirection || layoutNeedsUpdate) {
        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
          nodes,
          baseEdges,
          targetDirection
        );

        setNodes([...layoutedNodes]);
        setEdges([...layoutedEdges]);
        saveToLocalStorage(layoutedNodes, layoutedEdges);

        const isInitialLoad = !isLayoutReady;
        setAppliedDirection(targetDirection);
        setIsLayoutReady(true);
        setLayoutNeedsUpdate(false);
        
        if (isInitialLoad) {
          window.requestAnimationFrame(() => {
            fitView({ padding: 0.2, duration: 800 });
          });
        }
      }
    }
  }, [nodes, baseEdges, appliedDirection, layoutDirection, isLayoutReady, layoutNeedsUpdate, setNodes, setEdges, fitView, isLoadingData, saveToLocalStorage]);

  const onConnect = useCallback(
    (params: any) =>
      setEdges((eds) =>
        addEdge({ ...params, type: ConnectionLineType.Bezier }, eds)
      ),
    [setEdges]
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setNodes(nds => nds.map(n => ({ ...n, data: { ...n.data, isSearchResult: false } })));
      return;
    }
    
    const query = searchQuery.toLowerCase();
    let foundNode: any = null;
    
    setNodes(nds => nds.map(n => {
      const isMatch = (n.data.label as string).toLowerCase().includes(query);
      if (isMatch && !foundNode) foundNode = n;
      return { ...n, data: { ...n.data, isSearchResult: isMatch } };
    }));
    
    if (foundNode) {
      setCenter(foundNode.position.x + nodeWidth / 2, foundNode.position.y + nodeHeight / 2, { zoom: 1, duration: 800 });
      setSelectedNode(foundNode);
    }
  };

  const onNodeClick = useCallback((event: React.MouseEvent, node: any) => {
    setSelectedNode(node);
  }, []);

  const downloadImage = () => {
    const reactFlowBounds = document.querySelector('.react-flow__viewport') as HTMLElement;
    if (reactFlowBounds) {
      toPng(reactFlowBounds, {
        backgroundColor: 'var(--bg-color)',
        width: 1920,
        height: 1080,
        style: {
          width: '1920px',
          height: '1080px',
          transform: 'translate(0, 0) scale(1)',
        },
      }).then((dataUrl) => {
        const a = document.createElement('a');
        a.setAttribute('download', 'mindmap.png');
        a.setAttribute('href', dataUrl);
        a.click();
      });
    }
  };

  if (isLoadingData) {
    return (
      <div className={isDarkMode ? "" : "light"} style={{ width: "100vw", height: "100vh", position: "relative", background: "var(--bg-color)", transition: "background 0.3s ease" }}>
        <div style={{ 
          position: "absolute", top: 0, left: 0, right: 0, bottom: 0, 
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", 
          zIndex: 1000 
        }}>
          <div style={{ 
            width: 50, height: 50, border: "5px solid var(--node-border)", 
            borderTopColor: "var(--primary-color)", borderRadius: "50%", animation: "spin 1s linear infinite"
          }} />
          <h2 style={{ marginTop: 20, color: "var(--primary-color)", fontWeight: "bold" }}>Betöltés...</h2>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  return (
    <div className={isDarkMode ? "" : "light"} style={{ width: "100vw", height: "100vh", position: "relative", background: "var(--bg-color)", transition: "background 0.3s ease", overflow: "hidden" }}>
      
      {/* Térkép / Idővonal nézetválasztó és beállítások (Mindig látható) */}
      <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 50 }}>
        <div style={{ position: 'relative' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: 'var(--node-bg)',
            padding: '8px 16px',
            borderRadius: '24px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            border: '1px solid var(--node-border)',
            gap: '16px',
            color: 'var(--text-color)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)'
          }}>
            <div style={{ fontSize: '14px', fontWeight: '500' }}>
              Magyarországi legfontosabb események
            </div>
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as 'map' | 'timeline')}
              style={{
                background: isDarkMode ? 'rgba(59, 130, 246, 0.2)' : '#e0e7ff',
                color: '#3b82f6',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                padding: '4px 8px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '600',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="map" style={{ background: 'var(--node-bg)', color: 'var(--text-color)' }}>Térkép</option>
              <option value="timeline" style={{ background: 'var(--node-bg)', color: 'var(--text-color)' }}>Idővonal</option>
            </select>
            
            <div style={{ width: '1px', height: '16px', background: 'var(--node-border)' }} />
            
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              style={{
                background: isMenuOpen ? 'rgba(139, 92, 246, 0.1)' : 'transparent',
                border: 'none',
                color: 'var(--text-color)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '6px',
                borderRadius: '50%',
                opacity: isMenuOpen ? 1 : 0.7,
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
              onMouseLeave={(e) => !isMenuOpen && (e.currentTarget.style.opacity = '0.7')}
            >
              <span style={{ fontSize: '16px' }}>⎈</span>
            </button>
          </div>

          {isMenuOpen && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              marginTop: '12px',
              background: 'var(--menu-bg)',
              width: '350px',
              maxHeight: 'calc(100vh - 100px)',
              borderRadius: '16px',
              boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
              border: '1px solid var(--node-border)',
              display: 'flex',
              flexDirection: 'column',
              color: 'var(--text-color)',
              overflowY: 'auto',
              animation: 'fadeInDown 0.2s ease-out',
              zIndex: 1000
            }}>
              <style>{`
                @keyframes fadeInDown {
                  from { opacity: 0; transform: translateY(-10px); }
                  to { opacity: 1; transform: translateY(0); }
                }
              `}</style>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderBottom: '1px solid var(--node-border)' }}>
                <h2 style={{ fontSize: '18px', margin: 0, fontWeight: '600' }}>Téma testreszabása</h2>
                <button onClick={() => setIsMenuOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-color)', fontSize: '20px', cursor: 'pointer', opacity: 0.6 }}>✕</button>
              </div>
              
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '30px' }}>
                
                <div>
                  <h3 style={{ fontSize: '14px', margin: '0 0 16px 0', fontWeight: '600', opacity: 0.8 }}>Térkép iránya</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div onClick={() => { setLayoutDirection('auto'); setIsLayoutReady(false); }} style={{ border: layoutDirection === 'auto' ? '2px solid #8b5cf6' : '1px solid var(--node-border)', borderRadius: '12px', padding: '16px', cursor: 'pointer', display: 'flex', gap: '16px', alignItems: 'center', transition: 'all 0.2s', background: layoutDirection === 'auto' ? (isDarkMode ? 'rgba(139, 92, 246, 0.1)' : '#f3e8ff') : 'transparent' }}>
                      <div style={{ fontSize: '24px' }}>✨</div>
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '4px' }}>Automatikus</div>
                        <div style={{ fontSize: '12px', opacity: 0.7, lineHeight: 1.4 }}>Képernyőméret alapján</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 style={{ fontSize: '14px', margin: '0 0 16px 0', fontWeight: '600', opacity: 0.8 }}>Térkép stílusa</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div onClick={() => setIsDarkMode(false)} style={{ border: !isDarkMode ? '2px solid #8b5cf6' : '1px solid var(--node-border)', borderRadius: '12px', padding: '16px', cursor: 'pointer', display: 'flex', gap: '16px', alignItems: 'center', transition: 'all 0.2s', background: !isDarkMode ? (isDarkMode ? 'rgba(139, 92, 246, 0.1)' : '#f3e8ff') : 'transparent' }}>
                      <div style={{ fontSize: '24px' }}>☀️</div>
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '4px' }}>Világos mód</div>
                      </div>
                    </div>
                    <div onClick={() => setIsDarkMode(true)} style={{ border: isDarkMode ? '2px solid #8b5cf6' : '1px solid var(--node-border)', borderRadius: '12px', padding: '16px', cursor: 'pointer', display: 'flex', gap: '16px', alignItems: 'center', transition: 'all 0.2s', background: isDarkMode ? (isDarkMode ? 'rgba(139, 92, 246, 0.1)' : '#f3e8ff') : 'transparent' }}>
                      <div style={{ fontSize: '24px' }}>🌙</div>
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '4px' }}>Sötét mód</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 style={{ fontSize: '14px', margin: '0 0 16px 0', fontWeight: '600', opacity: 0.8 }}>Exportálás</h3>
                  <button onClick={downloadImage} style={{ background: 'var(--primary-color)', color: 'white', border: 'none', padding: '12px 16px', borderRadius: '12px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%' }}>
                    Kép mentése (PNG)
                  </button>
                </div>

              </div>
            </div>
          )}
        </div>
      </div>

      {viewMode === 'timeline' ? (
        <TimelineView nodes={nodes} isDarkMode={isDarkMode} onNodeClick={onNodeClick} />
      ) : (
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChangeWithCollision}
          onEdgesChange={onEdgesChange}
          onNodeDragStart={onNodeDragStart}
          onNodeDragStop={onNodeDragStop}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          connectionLineType={ConnectionLineType.Bezier}
          proOptions={{ hideAttribution: true }}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.1}
          snapToGrid={true}
          snapGrid={[20, 20]}
        >
          <Background color="var(--node-border)" gap={20} size={1} />
          <MiniMap 
            pannable
            zoomable
            onClick={(event, position) => setCenter(position.x, position.y, { zoom: getZoom(), duration: 300 })}
            nodeColor={(n: any) => n.data?.isRoot ? '#8b5cf6' : 'var(--primary-color)'}
            style={{ background: 'var(--node-bg)', border: '1px solid var(--node-border)', borderRadius: '12px', overflow: 'hidden', marginBottom: '80px' }}
            maskColor={isDarkMode ? 'rgba(15, 17, 21, 0.7)' : 'rgba(248, 250, 252, 0.7)'}
          />
        </ReactFlow>
      )}

      {/* Közös UI elemek: Kereső */}
      <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 1000 }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            placeholder="Keresés..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: isDarkMode ? 'rgba(15, 17, 21, 0.7)' : 'rgba(255, 255, 255, 0.7)',
              border: '1px solid var(--node-border)',
              color: 'var(--text-color)',
              padding: '10px 16px',
              borderRadius: '24px',
              fontSize: '14px',
              outline: 'none',
              width: '250px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)'
            }}
          />
          <button type="submit" style={{ display: 'none' }}>Keresés</button>
        </form>
      </div>

      {/* Közös UI elemek: Navigációs Panel */}
      <div style={{ position: 'absolute', bottom: 20, right: 20, zIndex: 1000, display: 'flex', gap: '12px', alignItems: 'center' }}>
        <div style={{ display: 'flex', background: 'var(--node-bg)', borderRadius: '12px', border: '1px solid var(--node-border)', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', overflow: 'hidden', opacity: viewMode === 'timeline' ? 0.5 : 1 }}>
          <button onClick={() => viewMode !== 'timeline' && zoomOut({ duration: 300 })} disabled={viewMode === 'timeline'} style={{ padding: '8px 16px', background: 'transparent', border: 'none', color: 'var(--text-color)', cursor: viewMode === 'timeline' ? 'not-allowed' : 'pointer', fontSize: '20px', fontWeight: '500', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
          <div style={{ width: '1px', background: 'var(--node-border)', margin: '8px 0', opacity: 0.5 }}></div>
          <button onClick={() => viewMode !== 'timeline' && zoomIn({ duration: 300 })} disabled={viewMode === 'timeline'} style={{ padding: '8px 16px', background: 'transparent', border: 'none', color: 'var(--text-color)', cursor: viewMode === 'timeline' ? 'not-allowed' : 'pointer', fontSize: '20px', fontWeight: '500', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
        </div>
        
        <div style={{ display: 'flex', background: 'var(--node-bg)', borderRadius: '12px', border: '1px solid var(--node-border)', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', overflow: 'hidden', opacity: viewMode === 'timeline' ? 0.5 : 1 }}>
          <button onClick={handleUndo} disabled={viewMode === 'timeline' || undoStack.length === 0} style={{ padding: '8px 16px', background: 'transparent', border: 'none', color: (viewMode === 'timeline' || undoStack.length === 0) ? 'gray' : 'var(--text-color)', cursor: (viewMode === 'timeline' || undoStack.length === 0) ? 'not-allowed' : 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Visszavonás (Ctrl+Z)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 14 4 9 9 4"></polyline><path d="M20 20v-7a4 4 0 0 0-4-4H4"></path></svg>
          </button>
          <div style={{ width: '1px', background: 'var(--node-border)', margin: '8px 0', opacity: 0.5 }}></div>
          <button onClick={handleRedo} disabled={viewMode === 'timeline' || redoStack.length === 0} style={{ padding: '8px 16px', background: 'transparent', border: 'none', color: (viewMode === 'timeline' || redoStack.length === 0) ? 'gray' : 'var(--text-color)', cursor: (viewMode === 'timeline' || redoStack.length === 0) ? 'not-allowed' : 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Mégis (Ctrl+Y)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 14 20 9 15 4"></polyline><path d="M4 20v-7a4 4 0 0 1 4-4h12"></path></svg>
          </button>
        </div>

        <div style={{ display: 'flex', background: 'var(--node-bg)', borderRadius: '12px', border: '1px solid var(--node-border)', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <button onClick={() => viewMode !== 'timeline' && fitView({ padding: 0.2, duration: 800 })} disabled={viewMode === 'timeline'} style={{ padding: '8px 16px', background: 'transparent', border: 'none', color: viewMode === 'timeline' ? 'gray' : 'var(--text-color)', cursor: viewMode === 'timeline' ? 'not-allowed' : 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Középre igazítás">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="5 9 5 5 9 5"></polyline><polyline points="9 19 5 19 5 15"></polyline><polyline points="19 9 19 5 15 5"></polyline><polyline points="15 19 19 19 19 15"></polyline></svg>
          </button>
          <div style={{ width: '1px', background: 'var(--node-border)', margin: '8px 0', opacity: 0.5 }}></div>
          <button onClick={handleReset} style={{ padding: '8px 16px', background: 'transparent', border: 'none', color: 'var(--text-color)', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Adatok újratöltése / Visszaállítás">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><polyline points="3 3 3 8 8 8"></polyline></svg>
          </button>
          <div style={{ width: '1px', background: 'var(--node-border)', margin: '8px 0', opacity: 0.5 }}></div>
          <button style={{ padding: '8px 16px', background: 'transparent', border: 'none', color: 'var(--text-color)', cursor: 'pointer', fontSize: '18px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Segítség" onClick={() => alert("Görgővel: Zoomolás / Idővonal görgetés\nBal egérgomb: Mozgatás / Részletek\nReset gomb: Adatok újratöltése")}>?</button>
        </div>
      </div>

      {/* Info Panel Modal Overlay */}
      {selectedNode && (
        <div 
          onClick={() => setSelectedNode(null)}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(5px)',
            WebkitBackdropFilter: 'blur(5px)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes scaleUp {
              from { transform: scale(0.95); opacity: 0; }
              to { transform: scale(1); opacity: 1; }
            }
          `}</style>
          
          <div 
            onClick={(e) => e.stopPropagation()} // Prevent clicking inside modal from closing it
            style={{
              width: '500px',
              maxWidth: '90vw',
              maxHeight: '85vh',
              background: 'var(--menu-bg)',
              boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
              borderRadius: '24px',
              padding: '32px',
              display: 'flex',
              flexDirection: 'column',
              border: '1px solid var(--node-border)',
              animation: 'scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              overflowY: 'auto'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '26px', fontWeight: 'bold', color: 'var(--primary-color)', margin: 0, paddingRight: '16px', lineHeight: 1.3 }}>
                {selectedNode.data?.label || selectedNode.label}
              </h2>
              <button 
                onClick={() => setSelectedNode(null)}
                style={{ 
                  background: 'var(--node-bg)', border: '1px solid var(--node-border)', borderRadius: '50%',
                  color: 'var(--text-color)', fontSize: '20px', cursor: 'pointer', width: '40px', height: '40px', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.8, transition: 'all 0.2s', flexShrink: 0
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1.05)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.8'; e.currentTarget.style.transform = 'scale(1)'; }}
              >✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ padding: '20px', background: 'var(--node-bg)', borderRadius: '16px', border: '1px solid var(--node-border)' }}>
                <h3 style={{ fontSize: '14px', opacity: 0.7, margin: '0 0 12px 0', textTransform: 'uppercase', letterSpacing: '1px' }}>Részletek</h3>
                <p style={{ fontSize: '15px', lineHeight: 1.6, margin: 0 }}>
                  {selectedNode.data?.description || selectedNode.description || "További részletes információk hamarosan..."}
                </p>
              </div>
              
              {(selectedNode.data?.date || selectedNode.date) && (
                <div style={{ padding: '20px', background: 'var(--node-bg)', borderRadius: '16px', border: '1px solid var(--node-border)' }}>
                  <h3 style={{ fontSize: '14px', opacity: 0.7, margin: '0 0 12px 0', textTransform: 'uppercase', letterSpacing: '1px' }}>Dátum</h3>
                  <p style={{ fontSize: '16px', fontWeight: '600', margin: 0, color: 'var(--primary-color)' }}>{selectedNode.data?.date || selectedNode.date}</p>
                </div>
              )}
              
              {selectedNode.data?.links && selectedNode.data.links.length > 0 && (
                <div style={{ padding: '20px', background: 'var(--node-bg)', borderRadius: '16px', border: '1px solid var(--node-border)' }}>
                  <h3 style={{ fontSize: '14px', opacity: 0.7, margin: '0 0 12px 0', textTransform: 'uppercase', letterSpacing: '1px' }}>Források / Linkek</h3>
                  <ul style={{ paddingLeft: '20px', margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {selectedNode.data.links.map((link: string, idx: number) => (
                      <li key={idx}>
                        <a href={link} target="_blank" rel="noreferrer" style={{ color: 'var(--primary-color)', textDecoration: 'none', fontSize: '15px', wordBreak: 'break-all' }}>
                          {link}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Kapcsolódó események */}
              {(() => {
                const childIds = edges.filter(e => e.source === selectedNode.id).map(e => e.target);
                const children = nodes.filter(n => childIds.includes(n.id));
                if (children.length === 0) return null;
                
                return (
                  <div style={{ padding: '20px', background: 'var(--node-bg)', borderRadius: '16px', border: '1px solid var(--node-border)' }}>
                    <h3 style={{ fontSize: '14px', opacity: 0.7, margin: '0 0 12px 0', textTransform: 'uppercase', letterSpacing: '1px' }}>Kapcsolódó események</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {children.map(child => (
                        <div 
                          key={child.id}
                          onClick={(e) => { e.stopPropagation(); setSelectedNode(child); }}
                          style={{
                            padding: '12px 16px',
                            background: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            fontSize: '15px',
                            fontWeight: '500',
                            border: '1px solid var(--node-border)',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'var(--primary-color)';
                            e.currentTarget.style.color = 'var(--primary-color)';
                            e.currentTarget.style.transform = 'translateX(4px)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'var(--node-border)';
                            e.currentTarget.style.color = 'inherit';
                            e.currentTarget.style.transform = 'translateX(0)';
                          }}
                        >
                          <span>{child.data?.label || child.label}</span>
                          <span style={{ opacity: 0.5 }}>→</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MindMap() {
  return (
    <ReactFlowProvider>
      <FlowMap />
    </ReactFlowProvider>
  );
}
