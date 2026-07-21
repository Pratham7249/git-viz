'use client';

import React, { useRef, useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';

// Import ForceGraph2D dynamically using SSR: false, as it references window and document targets.
const ForceGraph2D = dynamic(
  () => import('react-force-graph-2d').then((mod) => mod.default),
  { ssr: false, loading: () => (
    <div className="graph-loader">
      <div className="spinner"></div>
      <p>Initializing Visual Engine...</p>
    </div>
  ) }
);

export default function GraphVisualizer({ data, onSelectNode, selectedNode }) {
  const containerRef = useRef(null);
  const graphRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [isPlaying, setIsPlaying] = useState(true);
  const [graphMode, setGraphMode] = useState('collaboration'); // 'collaboration' or 'ecosystem'

  // Maintain responsiveness of the canvas layout dimensions
  useEffect(() => {
    if (!containerRef.current) return;
    
    const updateSize = () => {
      setDimensions({
        width: containerRef.current.clientWidth,
        height: Math.max(containerRef.current.clientHeight, 500),
      });
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    
    // Fit to canvas on render
    const timer = setTimeout(() => {
      if (graphRef.current) {
        graphRef.current.zoomToFit(400, 70);
      }
    }, 600);

    return () => {
      window.removeEventListener('resize', updateSize);
      clearTimeout(timer);
    };
  }, [data, graphMode]);

  // Filter nodes and links based on the active graph visualization mode
  const graphData = useMemo(() => {
    if (!data || !data.graph) return { nodes: [], links: [] };

    if (graphMode === 'ecosystem') {
      return data.graph;
    }

    // Collaborator-only mode: Filter out repository hub nodes and related links
    const repoNodes = data.graph.nodes.filter(n => n.type === 'repository');
    const repoIds = new Set(repoNodes.map(n => n.id));

    const filteredNodes = data.graph.nodes.filter(n => n.type !== 'repository');
    const filteredLinks = data.graph.links.filter(l => {
      const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
      const targetId = typeof l.target === 'object' ? l.target.id : l.target;
      return !repoIds.has(sourceId) && !repoIds.has(targetId);
    });

    return {
      nodes: filteredNodes,
      links: filteredLinks
    };
  }, [data, graphMode]);

  const togglePhysics = () => {
    if (!graphRef.current) return;
    if (isPlaying) {
      graphRef.current.pauseAnimation();
    } else {
      graphRef.current.resumeAnimation();
    }
    setIsPlaying(!isPlaying);
  };

  const resetZoom = () => {
    if (graphRef.current) {
      graphRef.current.zoomToFit(400, 70);
    }
  };

  // Node drawing callback on HTML5 Canvas - optimized with Level of Detail (LOD)
  const paintCustomNode = (node, ctx, globalScale) => {
    const size = node.val || 5;
    const isSelected = selectedNode && selectedNode.id === node.id;
    
    // Level Of Detail (LOD) check: For extreme zooming out (globalScale < 0.35),
    // skip strokes and details completely, draw a static solid pill for high render speed.
    if (globalScale < 0.35) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
      ctx.fillStyle = node.type === 'repository' ? '#a855f7' : '#38bdf8';
      ctx.fill();
      return;
    }

    // LOD Level 2: Medium zoom scale (0.35 to 0.75). Render node background & border but skip text/avatars.
    ctx.beginPath();
    ctx.arc(node.x, node.y, size + (isSelected ? 4 : 2), 0, 2 * Math.PI);
    
    if (node.type === 'repository') {
      ctx.fillStyle = isSelected ? 'rgba(168, 85, 247, 0.45)' : 'rgba(168, 85, 247, 0.15)';
      ctx.strokeStyle = '#a855f7';
    } else {
      ctx.fillStyle = isSelected ? 'rgba(56, 189, 248, 0.45)' : 'rgba(56, 189, 248, 0.1)';
      ctx.strokeStyle = '#38bdf8';
    }
    
    ctx.lineWidth = isSelected ? 2 : 1;
    ctx.fill();
    ctx.stroke();

    // Draw main filled center body
    ctx.beginPath();
    ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
    ctx.fillStyle = node.type === 'repository' ? '#a855f7' : '#0f172a';
    ctx.fill();

    // LOD Level 3: Close zoom. Render initials and helper labels underneath.
    if (globalScale >= 0.75 || isSelected) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      if (node.type === 'developer') {
        ctx.font = `${size * 0.7}px 'Space Grotesk', sans-serif`;
        ctx.fillStyle = '#38bdf8';
        const letters = node.username ? node.username.slice(0, 2).toUpperCase() : '??';
        ctx.fillText(letters, node.x, node.y);
      } else {
        ctx.font = `600 ${size * 0.4}px 'Space Grotesk', sans-serif`;
        ctx.fillStyle = '#ffffff';
        ctx.fillText('REPO', node.x, node.y);
      }

      // Draw label tooltip under node
      if (globalScale > 1.35 || isSelected || node.type === 'repository') {
        const labelText = node.label || '';
        ctx.font = isSelected ? `600 ${8 / globalScale + 4}px 'Outfit'` : `${8 / globalScale + 3}px 'Outfit'`;
        
        const textWidth = ctx.measureText(labelText).width;
        ctx.fillStyle = 'rgba(8, 12, 22, 0.8)';
        ctx.fillRect(node.x - textWidth / 2 - 3, node.y + size + 4, textWidth + 6, 10);
        
        ctx.fillStyle = isSelected ? '#38bdf8' : '#e2e8f0';
        ctx.fillText(labelText, node.x, node.y + size + 9);
      }
    }
  };

  return (
    <div ref={containerRef} className="graph-container-panel glass-panel">
      <div className="canvas-header">
        <div className="canvas-title">
          <div className="pulse-dot"></div>
          <span>Ecosystem Graph View</span>
        </div>
        <div className="canvas-controls">
          <select 
            className="view-mode-select tint" 
            value={graphMode} 
            onChange={(e) => setGraphMode(e.target.value)}
          >
            <option value="collaboration">Collaborations Network</option>
            <option value="ecosystem">Repository Hub Map</option>
          </select>
          <button className="secondary-button ctrl-btn" onClick={togglePhysics}>
            {isPlaying ? '⏸ Pause' : '▶ Play'}
          </button>
          <button className="secondary-button ctrl-btn" onClick={resetZoom}>
            ⛶ Fit
          </button>
        </div>
      </div>

      <div className="canvas-viewport">
        <ForceGraph2D
          ref={graphRef}
          width={dimensions.width}
          height={dimensions.height}
          graphData={graphData}
          nodeCanvasObject={paintCustomNode}
          nodePointerAreaPaint={(node, color, ctx) => {
            // Define clickable boundary
            ctx.beginPath();
            ctx.arc(node.x, node.y, (node.val || 5) + 4, 0, 2 * Math.PI);
            ctx.fillStyle = color;
            ctx.fill();
          }}
          onNodeClick={(node) => {
            onSelectNode(node);
          }}
          linkWidth={(link) => (link.value || 1) * 0.8}
          linkColor={(link) => 
            link.type === 'collaboration' 
              ? 'rgba(168, 85, 247, 0.25)' 
              : 'rgba(56, 189, 248, 0.25)'
          }
          linkDirectionalParticles={graphData.nodes.length > 50 ? 0 : 2} // Suppress particle calculations for massive datasets
          linkDirectionalParticleSpeed={0.005}
          linkDirectionalParticleWidth={2}
          d3VelocityDecay={0.4}
        />
      </div>

      <style jsx global>{`
        .graph-container-panel {
          position: relative;
          display: flex;
          flex-direction: column;
          height: 100%;
          width: 100%;
          min-height: 520px;
          overflow: hidden;
        }
        .canvas-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 20px;
          border-bottom: 1px solid var(--border-color);
          background: rgba(8, 12, 22, 0.4);
          z-index: 10;
          flex-wrap: wrap;
          gap: 12px;
        }
        .canvas-title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-family: var(--font-display);
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary);
        }
        .pulse-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--color-accent);
          box-shadow: 0 0 10px var(--color-accent);
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0% { transform: scale(0.95); opacity: 0.5; }
          50% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(0.95); opacity: 0.5; }
        }
        .canvas-controls {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .ctrl-btn {
          padding: 4px 10px !important;
          font-size: 11px !important;
          height: 28px !important;
        }
        .view-mode-select {
          background: rgba(15, 22, 42, 0.8);
          border: 1px solid var(--border-color);
          border-radius: 6px;
          color: var(--text-primary);
          font-family: var(--font-sans);
          font-size: 11.5px;
          padding: 4px 8px;
          outline: none;
          cursor: pointer;
          height: 28px;
          transition: all 0.2s ease;
        }
        .view-mode-select:hover {
          border-color: var(--color-accent);
          background: rgba(15, 22, 42, 0.95);
        }
        .canvas-viewport {
          flex-grow: 1;
          width: 100%;
          height: 100%;
          cursor: grab;
        }
        .canvas-viewport:active {
          cursor: grabbing;
        }
        .graph-loader {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 500px;
          color: var(--text-secondary);
          gap: 16px;
        }
        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(56, 189, 248, 0.1);
          border-radius: 50%;
          border-top-color: var(--color-accent);
          animation: spin 1s infinite linear;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
