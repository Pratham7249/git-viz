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
  const imgCache = useRef({});
  
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [isPlaying, setIsPlaying] = useState(true);
  const [graphMode, setGraphMode] = useState('collaboration'); // 'collaboration' or 'ecosystem'
  
  // Custom D3 Forces adjustments for better developer layout controls
  const [chargeStrength, setChargeStrength] = useState(-150);
  const [linkDistance, setLinkDistance] = useState(70);
  
  // Interactive Hovering Highlights
  const [hoverNode, setHoverNode] = useState(null);
  const [imagesLoadedCount, setImagesLoadedCount] = useState(0);

  // Maintain responsiveness of the canvas layout dimensions
  useEffect(() => {
    if (!containerRef.current) return;
    
    const updateSize = () => {
      setDimensions({
        width: containerRef.current.clientWidth || 800,
        height: Math.max(containerRef.current.clientHeight || 520, 520),
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

  // Adjust D3 force engine dynamically on slider values updates
  useEffect(() => {
    if (!graphRef.current) return;
    const fg = graphRef.current;
    
    // Configure D3 force values
    fg.d3Force('charge').strength(chargeStrength);
    fg.d3Force('link').distance(linkDistance);
    
    // Reheat simulation so D3 layout updates interactively
    fg.d3ReheatSimulation();
  }, [chargeStrength, linkDistance, data, graphMode]);

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

  // Preload and Cache Avatar Images for Canvas rendering
  useEffect(() => {
    if (!graphData.nodes) return;
    
    graphData.nodes.forEach(node => {
      if (node.avatarUrl && !imgCache.current[node.avatarUrl]) {
        const img = new Image();
        img.src = node.avatarUrl;
        img.onload = () => {
          imgCache.current[node.avatarUrl] = img;
          setImagesLoadedCount(prev => prev + 1);
        };
      }
    });
  }, [graphData]);

  // Derive sets of connected items for hovered focus highlights
  const highlightNodes = useMemo(() => {
    const set = new Set();
    if (!hoverNode) return set;
    
    set.add(hoverNode.id);
    graphData.links.forEach(link => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;
      
      if (sourceId === hoverNode.id) {
        set.add(targetId);
      } else if (targetId === hoverNode.id) {
        set.add(sourceId);
      }
    });
    return set;
  }, [hoverNode, graphData]);

  const highlightLinks = useMemo(() => {
    const set = new Set();
    if (!hoverNode) return set;
    
    graphData.links.forEach(link => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;
      
      if (sourceId === hoverNode.id || targetId === hoverNode.id) {
        set.add(link);
      }
    });
    return set;
  }, [hoverNode, graphData]);

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

  // Node drawing callback on HTML5 Canvas - optimized with Level of Detail (LOD) & custom preloaded avatars
  const paintCustomNode = (node, ctx, globalScale) => {
    const size = node.val || 6;
    const isSelected = selectedNode && selectedNode.id === node.id;
    const isHovered = hoverNode && hoverNode.id === node.id;
    const isNodeDimmed = hoverNode && !highlightNodes.has(node.id);

    ctx.save();
    
    // Set dynamic opacity based on hover highlight focus
    if (isNodeDimmed) {
      ctx.globalAlpha = 0.15;
    } else {
      ctx.globalAlpha = 1.0;
    }

    // LOD Level 1: Draw micro circular points at extreme distance to maximize performance
    if (globalScale < 0.35) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
      ctx.fillStyle = node.type === 'repository' ? '#a855f7' : '#38bdf8';
      ctx.fill();
      ctx.restore();
      return;
    }

    // LOD Level 2: Target border/glow drawing
    ctx.beginPath();
    ctx.arc(node.x, node.y, size + (isSelected || isHovered ? 4 : 2.5), 0, 2 * Math.PI);
    
    if (node.type === 'repository') {
      ctx.fillStyle = isSelected || isHovered ? 'rgba(168, 85, 247, 0.45)' : 'rgba(168, 85, 247, 0.15)';
      ctx.strokeStyle = '#a855f7';
    } else {
      ctx.fillStyle = isSelected || isHovered ? 'rgba(56, 189, 248, 0.45)' : 'rgba(56, 189, 248, 0.1)';
      ctx.strokeStyle = '#38bdf8';
    }
    
    ctx.lineWidth = isSelected || isHovered ? 2.5 : 1.2;
    ctx.fill();
    ctx.stroke();

    // Draw main circle background disk
    ctx.beginPath();
    ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
    ctx.fillStyle = node.type === 'repository' ? '#a855f7' : '#0a0f1d';
    ctx.fill();

    // Try to clip and draw GH profile picture inside
    if (node.type === 'developer' && node.avatarUrl && imgCache.current[node.avatarUrl]) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(node.x, node.y, size - 0.5, 0, 2 * Math.PI);
      ctx.clip();
      try {
        ctx.drawImage(imgCache.current[node.avatarUrl], node.x - size, node.y - size, size * 2, size * 2);
      } catch (err) {
        // Fallback silently if canvas drawImage fails
      }
      ctx.restore();
    } else {
      // Fills text initials instead if avatar image isn't loaded/cached
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (node.type === 'developer') {
        ctx.font = `${size * 0.7}px monospace`;
        ctx.fillStyle = '#38bdf8';
        const letters = node.username ? node.username.slice(0, 2).toUpperCase() : '??';
        ctx.fillText(letters, node.x, node.y);
      } else {
        ctx.font = `bold ${size * 0.4}px monospace`;
        ctx.fillStyle = '#ffffff';
        ctx.fillText('REPO', node.x, node.y);
      }
    }

    // Level 3: Label indicators drawing
    if (globalScale > 0.85 || isSelected || isHovered) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const labelText = node.label || node.username || '';
      
      ctx.font = isSelected || isHovered 
        ? `bold ${9 / globalScale + 4}px 'Space Grotesk', sans-serif` 
        : `${9 / globalScale + 3}px 'Space Grotesk', sans-serif`;
      
      const textWidth = ctx.measureText(labelText).width;
      
      // Draw small container backdrop behind labels to keep them readable over links
      ctx.fillStyle = 'rgba(7, 10, 19, 0.85)';
      ctx.fillRect(node.x - textWidth / 2 - 4, node.y + size + 4, textWidth + 8, size * 0.75 + 4);
      
      ctx.fillStyle = isSelected || isHovered ? '#38bdf8' : '#e2e8f0';
      ctx.fillText(labelText, node.x, node.y + size + size * 0.4 + 5);
    }
    
    ctx.restore();
  };

  const getLinkColor = (link) => {
    if (hoverNode) {
      if (highlightLinks.has(link)) {
        return link.type === 'collaboration' ? '#a855f7' : '#38bdf8';
      }
      return 'rgba(255, 255, 255, 0.05)';
    }
    return link.type === 'collaboration' ? 'rgba(168, 85, 247, 0.25)' : 'rgba(56, 189, 248, 0.25)';
  };

  const getLinkWidth = (link) => {
    const baseWidth = (link.value || 1) * 0.8;
    if (hoverNode && highlightLinks.has(link)) {
      return baseWidth * 2;
    }
    return baseWidth;
  };

  return (
    <div ref={containerRef} className="graph-container-panel glass-panel">
      {/* Top Header controls */}
      <div className="canvas-header">
        <div className="canvas-title">
          <div className="pulse-dot"></div>
          <span>Ecosystem Graph View</span>
        </div>

        {/* Dynamic Physics Sliders panel to improve node layout */}
        <div className="physics-sliders-drawer">
          <div className="slider-wrapper">
            <span className="slider-label">Spread</span>
            <input 
              type="range" 
              min="-380" 
              max="-50" 
              value={chargeStrength} 
              onChange={(e) => setChargeStrength(Number(e.target.value))}
              className="glow-range"
            />
          </div>
          <div className="slider-wrapper">
            <span className="slider-label">Spacing</span>
            <input 
              type="range" 
              min="30" 
              max="200" 
              value={linkDistance} 
              onChange={(e) => setLinkDistance(Number(e.target.value))}
              className="glow-range"
            />
          </div>
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

      {/* Main Graph Canvas */}
      <div className="canvas-viewport">
        <ForceGraph2D
          ref={graphRef}
          width={dimensions.width}
          height={dimensions.height}
          graphData={graphData}
          nodeCanvasObject={paintCustomNode}
          nodePointerAreaPaint={(node, color, ctx) => {
            ctx.beginPath();
            ctx.arc(node.x, node.y, (node.val || 6) + 4, 0, 2 * Math.PI);
            ctx.fillStyle = color;
            ctx.fill();
          }}
          onNodeClick={(node) => {
            onSelectNode(node);
          }}
          onNodeHover={(node) => {
            setHoverNode(node);
          }}
          linkWidth={getLinkWidth}
          linkColor={getLinkColor}
          linkDirectionalParticles={graphData.nodes.length > 50 ? 0 : 2}
          linkDirectionalParticleSpeed={0.005}
          linkDirectionalParticleWidth={2}
          d3VelocityDecay={0.35} // Smooth, slightly damped physics
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

        .physics-sliders-drawer {
          display: flex;
          gap: 16px;
          align-items: center;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-color);
          border-radius: 20px;
          padding: 3px 12px;
        }

        .slider-wrapper {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .slider-label {
          font-size: 10px;
          font-family: var(--font-display);
          color: var(--text-muted);
          text-transform: uppercase;
        }

        .glow-range {
          -webkit-appearance: none;
          width: 70px;
          height: 3px;
          border-radius: 2px;
          background: rgba(255, 255, 255, 0.1);
          outline: none;
          transition: all 0.2s ease;
        }

        .glow-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--color-accent);
          cursor: pointer;
          transition: transform 0.25s ease;
          box-shadow: 0 0 5px var(--color-accent);
        }

        .glow-range::-webkit-slider-thumb:hover {
          transform: scale(1.4);
        }

        @media (max-width: 900px) {
          .physics-sliders-drawer {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
