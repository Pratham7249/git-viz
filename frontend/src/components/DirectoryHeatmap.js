'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { Search, ArrowLeft, Folder, File, ChevronRight, Maximize2 } from 'lucide-react';

export default function DirectoryHeatmap({ directoryTree, repoInfo }) {
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 850, height: 500 });
  const [currentPath, setCurrentPath] = useState([]); // Array of strings representing path segments
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredNode, setHoveredNode] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Update sizes based on viewport resizing
  useEffect(() => {
    if (!containerRef.current) return;
    const handleResize = () => {
      setDimensions({
        width: containerRef.current.clientWidth || 800,
        height: Math.max(containerRef.current.clientHeight || 500, 450)
      });
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // helper to query sub-nodes of current selected path
  const activeSubTree = useMemo(() => {
    if (!directoryTree) return null;
    let node = directoryTree;
    for (let segment of currentPath) {
      if (node && node.children) {
        node = node.children.find(c => c.name === segment);
      }
    }
    return node;
  }, [directoryTree, currentPath]);

  // Color generator based on heat property (Cold purple-blue to Hot coral-red)
  const getNodeColor = (heat) => {
    // Elegant theme-matched color interpolation
    if (heat < 0.25) {
      const t = heat / 0.25;
      return d3.interpolateRgb('#1b1b3a', '#1e3a8a')(t);
    } else if (heat < 0.5) {
      const t = (heat - 0.25) / 0.25;
      return d3.interpolateRgb('#1e3a8a', '#0d9488')(t);
    } else if (heat < 0.75) {
      const t = (heat - 0.5) / 0.25;
      return d3.interpolateRgb('#0d9488', '#d97706')(t);
    } else {
      const t = (heat - 0.75) / 0.25;
      return d3.interpolateRgb('#d97706', '#f43f5e')(t);
    }
  };

  // Compute D3 Treemap layout
  const treemapData = useMemo(() => {
    if (!activeSubTree) return [];

    // Create D3 Hierarchy structure
    const root = d3.hierarchy(activeSubTree)
      .sum(d => d.isDirectory ? 0 : (d.size || 100))
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    // Initialize treemap layout generator
    d3.treemap()
      .size([dimensions.width, dimensions.height])
      .paddingOuter(4)
      .paddingTop(14)
      .paddingInner(2)
      .round(true)
      (root);

    // Filter out only leaves (active files) for render boxes
    return root.leaves().map(leaf => {
      // Find relative path segments inside parent hierarchy
      let parentPathStr = '';
      let p = leaf.parent;
      const pathAcc = [];
      while (p && p.data.name !== 'root') {
        pathAcc.unshift(p.data.name);
        p = p.parent;
      }
      parentPathStr = pathAcc.join('/');

      return {
        id: leaf.data.path || leaf.data.name,
        name: leaf.data.name,
        fullName: leaf.data.path || leaf.data.name,
        parentPath: parentPathStr,
        x0: leaf.x0,
        y0: leaf.y0,
        x1: leaf.x1,
        y1: leaf.y1,
        width: leaf.x1 - leaf.x0,
        height: leaf.y1 - leaf.y0,
        size: leaf.data.size || 0,
        heat: leaf.data.heat || 0.1,
        data: leaf.data
      };
    });
  }, [activeSubTree, dimensions, currentPath]);

  // Handle drill down clicking on a block's parent directory
  const handleNodeClick = (node) => {
    if (!node.parentPath) return;
    
    // Split parent path or split file path to get segments relative to active directory
    const relativeParts = node.parentPath.split('/').filter(Boolean);
    
    // Create new path segments list
    const newPath = [...currentPath];
    relativeParts.forEach(segment => {
      if (!newPath.includes(segment)) {
        newPath.push(segment);
      }
    });
    
    setCurrentPath(newPath);
  };

  const traverseUp = () => {
    if (currentPath.length === 0) return;
    setCurrentPath(prev => prev.slice(0, prev.length - 1));
  };

  const navigateToBreadcrumb = (idx) => {
    setCurrentPath(prev => prev.slice(0, idx + 1));
  };

  // Perform search matches filtering
  const filteredTreemap = useMemo(() => {
    if (!searchQuery.trim()) return treemapData;
    const query = searchQuery.toLowerCase();
    return treemapData.map(node => ({
      ...node,
      isMatched: node.name.toLowerCase().includes(query) || node.fullName.toLowerCase().includes(query)
    }));
  }, [treemapData, searchQuery]);

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const bounds = containerRef.current.getBoundingClientRect();
    setTooltipPos({
      x: e.clientX - bounds.left + 15,
      y: e.clientY - bounds.top + 15
    });
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getHeatLabel = (heat) => {
    if (heat < 0.25) return 'Cold (Inactive)';
    if (heat < 0.5) return 'Low Intensity';
    if (heat < 0.75) return 'Active Shift';
    return 'Critical Hot (Highly Modified)';
  };

  return (
    <div className="directory-heatmap-container glass-panel" ref={containerRef}>
      {/* Top dashboard control panel */}
      <div className="heatmap-control-header">
        <div className="heatmap-panel-title">
          <Folder size={18} className="icon-gold" />
          <span>Filesystem Churn Heatmap</span>
        </div>

        <div className="search-bar-inline">
          <Search size={14} className="search-icon" />
          <input
            type="text"
            className="glow-input header-search-input"
            placeholder="Filter files (e.g. .js)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Breadcrumb Path Nav bar */}
      <div className="breadcrumb-nav">
        <button 
          className={`breadcrumb-node-btn ${currentPath.length === 0 ? 'active' : ''}`}
          onClick={() => setCurrentPath([])}
        >
          {repoInfo?.name || 'root'}
        </button>
        {currentPath.map((segment, idx) => (
          <React.Fragment key={idx}>
            <ChevronRight size={12} className="slash-div" />
            <button
              className={`breadcrumb-node-btn ${idx === currentPath.length - 1 ? 'active' : ''}`}
              onClick={() => navigateToBreadcrumb(idx)}
            >
              {segment}
            </button>
          </React.Fragment>
        ))}

        {currentPath.length > 0 && (
          <button className="secondary-button go-up-btn" onClick={traverseUp}>
            <ArrowLeft size={12} style={{ marginRight: '4px' }} /> Back
          </button>
        )}
      </div>

      {/* Main SVG Treemap render viewport */}
      <div 
        className="treemap-viewport-box"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredNode(null)}
      >
        <svg width="100%" height="100%" viewBox={`0 0 ${dimensions.width} ${dimensions.height}`} preserveAspectRatio="none">
          {filteredTreemap.length === 0 ? (
            <text 
              x={dimensions.width / 2} 
              y={dimensions.height / 2} 
              textAnchor="middle" 
              fill="var(--text-muted)"
              className="empty-text"
            >
              No folders or files detected inside this view.
            </text>
          ) : (
            filteredTreemap.map((node) => {
              const nodeBgColor = getNodeColor(node.heat);
              const isSearching = searchQuery.trim().length > 0;
              const isDimmed = isSearching && !node.isMatched;
              const showText = node.width > 55 && node.height > 18;

              return (
                <g 
                  key={node.id} 
                  transform={`translate(${node.x0}, ${node.y0})`}
                  className={`treemap-node-g ${isDimmed ? 'dimmed' : ''}`}
                  onMouseEnter={() => setHoveredNode(node)}
                  onClick={() => handleNodeClick(node)}
                >
                  <rect
                    width={Math.max(node.width - 1, 0)}
                    height={Math.max(node.height - 1, 0)}
                    fill={nodeBgColor}
                    stroke={hoveredNode?.id === node.id ? '#ffffff' : 'rgba(255,255,255,0.06)'}
                    strokeWidth={hoveredNode?.id === node.id ? 1.5 : 1}
                    rx={2}
                    className="treemap-rect"
                    style={{ transition: 'all 0.15s ease' }}
                  />
                  {showText && (
                    <foreignObject
                      x={4}
                      y={4}
                      width={Math.max(node.width - 8, 5)}
                      height={Math.max(node.height - 8, 5)}
                      pointerEvents="none"
                    >
                      <div className="rect-text-label" style={{
                        color: node.heat > 0.6 ? '#ffffff' : 'rgba(255,255,255,0.85)',
                        fontSize: `${Math.min(Math.max(node.width * 0.08, 9), 11.5)}px`
                      }}>
                        <div className="file-name-span">{node.name}</div>
                        {node.height > 35 && (
                          <div className="file-size-span" style={{ opacity: 0.6 }}>
                            {formatSize(node.size)}
                          </div>
                        )}
                      </div>
                    </foreignObject>
                  )}
                </g>
              );
            })
          )}
        </svg>

        {/* Hover inspector tooltip */}
        {hoveredNode && (
          <div 
            className="heatmap-tooltip custom-tooltip"
            style={{
              position: 'absolute',
              left: `${tooltipPos.x}px`,
              top: `${tooltipPos.y}px`
            }}
          >
            <div className="tooltip-file-header">
              <File size={13} className="info-icon" />
              <span className="tooltip-name">{hoveredNode.name}</span>
            </div>
            <div className="tooltip-path">{hoveredNode.fullName}</div>
            
            <div className="tooltip-details-grid">
              <div className="detail-item">
                <span className="lbl">Volume Size</span>
                <span className="val">{formatSize(hoveredNode.size)}</span>
              </div>
              <div className="detail-item">
                <span className="lbl">Change Heat</span>
                <span className="val flex-align">
                  <span className="color-indicator-dot" style={{ backgroundColor: getNodeColor(hoveredNode.heat) }} />
                  {hoveredNode.heat.toFixed(2)} - {getHeatLabel(hoveredNode.heat)}
                </span>
              </div>
            </div>
            {hoveredNode.parentPath && (
              <div className="tooltip-actions">
                <Maximize2 size={11} />
                <span>Click block to drill down parent: /{hoveredNode.parentPath}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Heatmap Legend indicator bar */}
      <div className="heatmap-legend-footer">
        <div className="legend-gradient-wrapper">
          <span className="legend-label cold">Cold</span>
          <div className="legend-color-bar" style={{
            background: 'linear-gradient(to right, #1b1b3a 0%, #1e3a8a 25%, #0d9488 50%, #d97706 75%, #f43f5e 100%)'
          }} />
          <span className="legend-label hot">Hot Churn</span>
        </div>
        <div className="legend-tip">
          * Box sizes represent file byte sizes; colors represent git change heat/activity scores.
        </div>
      </div>

      <style jsx>{`
        .directory-heatmap-container {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          height: 100%;
          min-height: 520px;
          overflow: hidden;
        }
        .heatmap-control-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 12px;
          flex-wrap: wrap;
        }
        .heatmap-panel-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: var(--font-display);
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary);
        }
        .icon-gold {
          color: var(--color-amber);
        }
        .search-bar-inline {
          position: relative;
          display: flex;
          align-items: center;
          width: 240px;
        }
        .header-search-input {
          padding: 6px 12px 6px 30px !important;
          font-size: 12px !important;
          height: 28px !important;
        }
        .search-icon {
          position: absolute;
          left: 10px;
          color: var(--text-muted);
        }
        
        .breadcrumb-nav {
          display: flex;
          align-items: center;
          gap: 6px;
          overflow-x: auto;
          font-size: 12.5px;
          padding-bottom: 4px;
          border-bottom: 1px dashed rgba(255, 255, 255, 0.04);
        }
        .slash-div {
          color: var(--text-muted);
          flex-shrink: 0;
        }
        .breadcrumb-node-btn {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          font-family: var(--font-sans);
          transition: color 0.15s ease;
          white-space: nowrap;
        }
        .breadcrumb-node-btn:hover {
          color: var(--color-accent);
        }
        .breadcrumb-node-btn.active {
          color: var(--text-primary);
          font-weight: 600;
         pointer-events: none;
        }
        .go-up-btn {
          margin-left: auto;
          padding: 3px 8px !important;
          font-size: 11px !important;
          border-radius: 4px !important;
        }

        .treemap-viewport-box {
          position: relative;
          flex-grow: 1;
          background: rgba(0, 0, 0, 0.15);
          border: 1px solid var(--border-color);
          border-radius: 6px;
          min-height: 380px;
          width: 100%;
          overflow: hidden;
        }
        .empty-text {
          font-family: var(--font-sans);
          font-size: 13px;
        }
        .treemap-node-g {
          cursor: pointer;
        }
        .treemap-node-g.dimmed {
          opacity: 0.15;
        }
        .treemap-rect:hover {
          filter: brightness(1.2) contrast(1.1);
        }
        .rect-text-label {
          font-family: var(--font-sans);
          font-weight: 500;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          line-height: 1.2;
          width: 100%;
          height: 100%;
        }
        .file-name-span {
          text-overflow: ellipsis;
          overflow: hidden;
          white-space: nowrap;
        }
        .file-size-span {
          font-size: 9px;
          margin-top: 1px;
        }

        /* Tooltip styling */
        .heatmap-tooltip {
          z-index: 200;
          min-width: 250px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-family: var(--font-sans);
          pointer-events: none;
          background: var(--bg-secondary);
          border-color: var(--border-glow);
          box-shadow: 0 10px 30px rgba(0,0,0,0.6);
        }
        .tooltip-file-header {
          display: flex;
          align-items: center;
          gap: 6px;
          font-weight: 600;
          font-size: 13.5px;
          color: var(--text-primary);
        }
        .info-icon {
          color: var(--color-accent);
        }
        .tooltip-name {
          word-break: break-all;
        }
        .tooltip-path {
          font-size: 11px;
          color: var(--text-muted);
          word-break: break-all;
          margin-top: -2px;
        }
        .tooltip-details-grid {
          display: flex;
          flex-direction: column;
          gap: 4px;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          padding-top: 6px;
          margin-top: 2px;
        }
        .detail-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
        }
        .detail-item .lbl {
          color: var(--text-muted);
        }
        .detail-item .val {
          color: var(--text-secondary);
          font-weight: 500;
        }
        .flex-align {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .color-indicator-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        .tooltip-actions {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 10.5px;
          color: var(--color-accent);
          border-top: 1px dashed rgba(56, 189, 248, 0.15);
          padding-top: 6px;
          margin-top: 2px;
        }

        .heatmap-legend-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-top: 1px solid var(--border-color);
          padding-top: 10px;
          flex-wrap: wrap;
          gap: 12px;
        }
        .legend-gradient-wrapper {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 280px;
        }
        .legend-label {
          font-size: 11px;
          color: var(--text-muted);
          text-transform: uppercase;
          font-family: var(--font-display);
        }
        .legend-color-bar {
          flex-grow: 1;
          height: 6px;
          border-radius: 3px;
        }
        .legend-tip {
          font-size: 11px;
          color: var(--text-muted);
          font-style: italic;
        }
        @media (max-width: 600px) {
          .heatmap-control-header {
            flex-direction: column;
            align-items: flex-start;
          }
          .search-bar-inline {
            width: 100%;
          }
          .heatmap-legend-footer {
            flex-direction: column;
            align-items: flex-start;
          }
          .legend-gradient-wrapper {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
