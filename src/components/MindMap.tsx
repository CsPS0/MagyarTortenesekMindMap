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
import mindMapData from "../data/mindmap.json";

// Custom node component for premium styling
const CustomNode = ({ data, targetPosition, sourcePosition, isConnectable }: NodeProps) => {
  const [isWiggling, setIsWiggling] = React.useState(false);

  React.useEffect(() => {
    if (data.collisionId) {
      setIsWiggling(true);
      const timer = setTimeout(() => setIsWiggling(false), 400);
      return () => clearTimeout(timer);
    }
  }, [data.collisionId]);

  return (
    <div className={`mindmap-node ${data.isRoot ? 'root-node' : ''} ${isWiggling ? 'colliding' : ''}`}>
      <Handle type="target" position={targetPosition || Position.Left} isConnectable={isConnectable} />
      {data.label as string}
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

  const root = d3.hierarchy(rootNode, (d: any) => d.children.length > 0 ? d.children : null);

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
    if (!layoutNode) return node;

    const s = sizeMap.get(node.id) ?? { w: nodeWidth, h: nodeHeight };
    const crossAxis: number = layoutNode.x as number;
    const depthAxis: number = (depthOffsets[layoutNode.depth] ?? 0) as number;

    const centerX: number = isLR ? depthAxis : crossAxis;
    const centerY: number = isLR ? crossAxis : depthAxis;

    return {
      ...node,
      targetPosition: isLR ? Position.Left : Position.Top,
      sourcePosition: isLR ? Position.Right : Position.Bottom,
      position: {
        x: centerX - s.w / 2,
        y: centerY - s.h / 2,
      }
    };
  });

  return { nodes: newNodes, edges };
};

// Flatten JSON to nodes and edges
const flattenMindMap = (data: any) => {
  const nodes: any[] = [];
  const edges: any[] = [];

  const traverse = (node: any, parentId: string | null = null) => {
    nodes.push({
      id: node.id,
      type: "custom",
      data: { label: node.label, isRoot: parentId === null },
      position: { x: 0, y: 0 }, // Will be calculated by dagre
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
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => flattenMindMap(mindMapData), []);
  
  const [nodes, setNodes] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  
  const [isLayoutReady, setIsLayoutReady] = React.useState(false);
  const [appliedDirection, setAppliedDirection] = React.useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = React.useState(true);
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [layoutDirection, setLayoutDirection] = React.useState("auto");
  const { fitView } = useReactFlow();

  // Helper to find all descendant IDs of a node
  const getDescendants = useCallback((nodeId: string): string[] => {
    const children = edges.filter(e => e.source === nodeId).map(e => e.target);
    let descendants = [...children];
    children.forEach(child => {
      descendants = descendants.concat(getDescendants(child));
    });
    return descendants;
  }, [edges]);

  const onNodesChangeWithCollision = useCallback(
    (changes: NodeChange[]) => {
      setNodes((nds) => {
        const nextNodes = applyNodeChanges(changes, nds);
        const positionChanges = changes.filter((c): c is NodePositionChange => c.type === 'position' && !!c.position);
        
        if (positionChanges.length === 0) return nextNodes;

        // Domino pushing logic: if A pushes B, B can push C.
        let finalNodes = [...nextNodes];

        // Find nodes that moved this frame
        const queue: { id: string; dx: number; dy: number }[] = [];
        
        for (const change of positionChanges) {
          const draggedNode = finalNodes.find((n) => n.id === change.id);
          const oldNode = nds.find((n) => n.id === change.id);
          if (draggedNode && oldNode) {
            const dx = draggedNode.position.x - oldNode.position.x;
            const dy = draggedNode.position.y - oldNode.position.y;
            if (dx !== 0 || dy !== 0) {
              queue.push({ id: draggedNode.id, dx, dy });
              
              // Move all descendants
              const descendants = getDescendants(draggedNode.id);
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
                    // Add children to the collision queue so they also push nodes out of the way!
                    queue.push({ id: descId, dx, dy });
                 }
              });
            }
          }
        }

        let iterations = 0;
        while (queue.length > 0 && iterations < 1000) {
          iterations++;
          const current = queue.shift()!;
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
              // Push the other node by the same delta
              finalNodes[i] = {
                ...otherNode,
                data: { ...otherNode.data, collisionId: Math.random() },
                position: {
                  x: otherNode.position.x + current.dx,
                  y: otherNode.position.y + current.dy,
                }
              };
              // Add the pushed node to the queue to check if it pushes anything else
              queue.push({ id: otherNode.id, dx: current.dx, dy: current.dy });
            }
          }
        }

        return finalNodes;
      });
    },
    [setNodes]
  );

  // Apply layout only after nodes are measured by React Flow or when direction changes
  useEffect(() => {
    const allMeasured = nodes.length > 0 && nodes.every((n) => n.measured?.width && n.measured?.height);
    
    if (allMeasured) {
      // Dynamic direction based on screen width or user setting
      const targetDirection = layoutDirection === "auto" ? (window.innerWidth > 1024 ? "LR" : "TB") : layoutDirection;
      
      if (appliedDirection !== targetDirection || !isLayoutReady) {
        // If the direction didn't actually change, just clear the loading state and fit view
        if (appliedDirection === targetDirection) {
           setIsLayoutReady(true);
           window.requestAnimationFrame(() => fitView({ padding: 0.2, duration: 800 }));
           return;
        }

        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
          nodes,
          initialEdges,
          targetDirection
        );
        
        setNodes([...layoutedNodes]);
        setEdges([...layoutedEdges]);
        setAppliedDirection(targetDirection);
        setIsLayoutReady(true);
        
        // Wait for React Flow to update DOM before fitting
        window.requestAnimationFrame(() => {
          fitView({ padding: 0.2, duration: 800 });
        });
      }
    }
  }, [nodes, initialEdges, appliedDirection, layoutDirection, isLayoutReady, setNodes, setEdges, fitView]);

  const onConnect = useCallback(
    (params: any) =>
      setEdges((eds) =>
        addEdge({ ...params, type: ConnectionLineType.Bezier }, eds)
      ),
    [setEdges]
  );

  return (
    <div className={isDarkMode ? "" : "light"} style={{ width: "100vw", height: "100vh", position: "relative", background: "var(--bg-color)", transition: "background 0.3s ease" }}>
      {!isLayoutReady && (
        <div style={{
          position: "absolute",
          top: 0, left: 0, right: 0, bottom: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0f1115",
          zIndex: 1000,
        }}>
          <div style={{
            width: "50px", height: "50px", 
            border: "5px solid #1e293b", 
            borderTopColor: "#3b82f6", 
            borderRadius: "50%", 
            animation: "spin 1s linear infinite"
          }} />
          <h2 style={{ marginTop: 20, color: "#3b82f6", fontWeight: "bold" }}>
            Térkép betöltése és elrendezése...
          </h2>
          <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
        </div>
      )}
      <ReactFlow
        style={{ opacity: isLayoutReady ? 1 : 0, transition: 'opacity 0.5s ease-in-out' }}
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChangeWithCollision}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        connectionLineType={ConnectionLineType.Bezier}
        proOptions={{ hideAttribution: true }}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        snapToGrid={true}
        snapGrid={[20, 20]}
      >
        <Background color="#334155" gap={20} size={1} />
        <Panel position="top-left" style={{ margin: 20 }}>
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
              
              <div style={{ 
                background: isDarkMode ? 'rgba(59, 130, 246, 0.2)' : '#e0e7ff', 
                color: '#3b82f6', 
                padding: '4px 8px', 
                borderRadius: '6px', 
                fontSize: '11px', 
                fontWeight: '600' 
              }}>
                Interaktív
              </div>
              
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
                  
                  {/* Map Direction */}
                  <div>
                    <h3 style={{ fontSize: '14px', margin: '0 0 16px 0', fontWeight: '600', opacity: 0.8 }}>Térkép iránya</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      
                      <div 
                        onClick={() => { setLayoutDirection('auto'); setIsLayoutReady(false); }}
                        style={{ border: layoutDirection === 'auto' ? '2px solid #8b5cf6' : '1px solid var(--node-border)', borderRadius: '12px', padding: '16px', cursor: 'pointer', display: 'flex', gap: '16px', alignItems: 'center', transition: 'all 0.2s', background: layoutDirection === 'auto' ? (isDarkMode ? 'rgba(139, 92, 246, 0.1)' : '#f3e8ff') : 'transparent' }}>
                        <div style={{ fontSize: '24px' }}>✨</div>
                        <div>
                          <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '4px' }}>Automatikus</div>
                          <div style={{ fontSize: '12px', opacity: 0.7, lineHeight: 1.4 }}>Képernyőméret alapján (Ajánlott)</div>
                        </div>
                      </div>

                      <div 
                        onClick={() => { setLayoutDirection('LR'); setIsLayoutReady(false); }}
                        style={{ border: layoutDirection === 'LR' ? '2px solid #8b5cf6' : '1px solid var(--node-border)', borderRadius: '12px', padding: '16px', cursor: 'pointer', display: 'flex', gap: '16px', alignItems: 'center', transition: 'all 0.2s', background: layoutDirection === 'LR' ? (isDarkMode ? 'rgba(139, 92, 246, 0.1)' : '#f3e8ff') : 'transparent' }}>
                        <div style={{ fontSize: '24px' }}>➡️</div>
                        <div>
                          <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '4px' }}>Vízszintes</div>
                          <div style={{ fontSize: '12px', opacity: 0.7, lineHeight: 1.4 }}>Balról jobbra haladó felépítés</div>
                        </div>
                      </div>

                      <div 
                        onClick={() => { setLayoutDirection('TB'); setIsLayoutReady(false); }}
                        style={{ border: layoutDirection === 'TB' ? '2px solid #8b5cf6' : '1px solid var(--node-border)', borderRadius: '12px', padding: '16px', cursor: 'pointer', display: 'flex', gap: '16px', alignItems: 'center', transition: 'all 0.2s', background: layoutDirection === 'TB' ? (isDarkMode ? 'rgba(139, 92, 246, 0.1)' : '#f3e8ff') : 'transparent' }}>
                        <div style={{ fontSize: '24px' }}>⬇️</div>
                        <div>
                          <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '4px' }}>Függőleges</div>
                          <div style={{ fontSize: '12px', opacity: 0.7, lineHeight: 1.4 }}>Fentről lefelé haladó felépítés</div>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Theme */}
                  <div>
                    <h3 style={{ fontSize: '14px', margin: '0 0 16px 0', fontWeight: '600', opacity: 0.8 }}>Térkép stílusa</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      
                      <div 
                        onClick={() => setIsDarkMode(false)}
                        style={{ border: !isDarkMode ? '2px solid #8b5cf6' : '1px solid var(--node-border)', borderRadius: '12px', padding: '16px', cursor: 'pointer', display: 'flex', gap: '16px', alignItems: 'center', transition: 'all 0.2s', background: !isDarkMode ? (isDarkMode ? 'rgba(139, 92, 246, 0.1)' : '#f3e8ff') : 'transparent' }}>
                        <div style={{ fontSize: '24px' }}>☀️</div>
                        <div>
                          <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '4px' }}>Világos mód</div>
                          <div style={{ fontSize: '12px', opacity: 0.7, lineHeight: 1.4 }}>Tiszta, könnyen olvasható megjelenés</div>
                        </div>
                      </div>

                      <div 
                        onClick={() => setIsDarkMode(true)}
                        style={{ border: isDarkMode ? '2px solid #8b5cf6' : '1px solid var(--node-border)', borderRadius: '12px', padding: '16px', cursor: 'pointer', display: 'flex', gap: '16px', alignItems: 'center', transition: 'all 0.2s', background: isDarkMode ? (isDarkMode ? 'rgba(139, 92, 246, 0.1)' : '#f3e8ff') : 'transparent' }}>
                        <div style={{ fontSize: '24px' }}>🌙</div>
                        <div>
                          <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '4px' }}>Sötét mód</div>
                          <div style={{ fontSize: '12px', opacity: 0.7, lineHeight: 1.4 }}>Kellemes éjszakai olvasáshoz</div>
                        </div>
                      </div>

                    </div>
                  </div>

                </div>
              </div>
            )}
          </div>
        </Panel>
      </ReactFlow>
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
