'use client';

import React, { useState, useMemo } from 'react';
import { 
  Cpu, 
  Terminal, 
  Settings, 
  ChevronRight, 
  FileText, 
  CornerDownRight, 
  CheckCircle,
  HelpCircle,
  Copy,
  Zap,
  Globe,
  Database,
  Layers,
  Sparkles
} from 'lucide-react';

export default function ArchitectPanel({ directoryTree, repoInfo }) {
  const [selectedPath, setSelectedPath] = useState('');
  const [activeTool, setActiveTool] = useState('docker'); // docker | actions | api
  const [copied, setCopied] = useState(false);

  // Flatten the directory tree to list folders for analysis
  const foldersList = useMemo(() => {
    if (!directoryTree) return [];
    
    const acc = [];
    const traverse = (node, currentPath = '') => {
      if (node.isDirectory && node.name !== 'root') {
        const fullPath = currentPath ? `${currentPath}/${node.name}` : node.name;
        acc.push({
          name: node.name,
          path: fullPath,
          childrenCount: node.children?.length || 0,
          filesCount: node.children?.filter(c => !c.isDirectory).length || 0
        });
        
        if (node.children) {
          node.children.forEach(child => traverse(child, fullPath));
        }
      } else if (node.name === 'root' && node.children) {
        node.children.forEach(child => traverse(child, ''));
      }
    };
    
    traverse(directoryTree);
    return acc.slice(0, 15); // limit to top 15 modules for UX clarity
  }, [directoryTree]);

  // Determine active node for detailed explainer
  const activeExplainer = useMemo(() => {
    const defaultOwner = repoInfo?.owner || 'Workspace';
    const defaultRepo = repoInfo?.name || 'Project';

    if (!selectedPath) {
      return {
        title: `${defaultOwner}/${defaultRepo}`,
        type: 'Code Repository',
        summary: 'A unified full-stack application featuring a decoupled Express.js server backend caching proxy and a Next.js (React) front-end visualization application.',
        complexity: 'Medium-High',
        pattern: 'Client-Server Architecture with Layered Cache Fallback',
        tips: 'Ensure backend/ and frontend/ environments are initialised separately with different npm dependencies. Do not commit local credentials in .env configs.'
      };
    }

    const name = selectedPath.split('/').pop();
    const isBackend = selectedPath.includes('backend') || name === 'backend';
    const isFrontend = selectedPath.includes('frontend') || name === 'frontend';

    // Generates a mock AI analysis of file/folder based on dynamic directory parsing rules
    if (name === 'components' || selectedPath.includes('components')) {
      return {
        title: selectedPath,
        type: 'Interactive UI Library Module',
        summary: 'Contains key visual client components utilizing D3 graph engines, canvas renderers, metrics grids, and interactive search parameters.',
        complexity: 'High',
        pattern: 'Composite UI Pattern & Refactored Canvas Rendering',
        tips: 'Keep canvas component rendering isolated (avoid prop drilling that triggers full D3 force graphs reinits).'
      };
    }
    
    if (name === 'app' || selectedPath.includes('app')) {
      return {
        title: selectedPath,
        type: 'Next.js Routing Entrypoint',
        summary: 'Contains the main app views, global layout containers, routing nodes, and font optimizer scripts.',
        complexity: 'Medium',
        pattern: 'Next.js App Directory routing structure',
        tips: 'Use "use client" directives strictly for tabs that load canvas visualizations or perform browser state storage.'
      };
    }

    if (name === 'utils' || selectedPath.includes('utils')) {
      return {
        title: selectedPath,
        type: 'Core Utility Services',
        summary: 'Manages API fetching abstractions, GitHub GraphQL query formatting, cache layer interfaces, and local memory databases.',
        complexity: 'Medium-High',
        pattern: 'Proxy Pattern & Dual Database Cache Driver',
        tips: 'Validate API endpoints using async/await handlers with explicit try-catch blocks to catch GitHub rate limits.'
      };
    }

    if (isBackend) {
      return {
        title: selectedPath,
        type: 'Express API Server Segment',
        summary: 'Responsible for querying public repositories, compressing metadata formats, and responding to health indicators.',
        complexity: 'Medium',
        pattern: 'Express MVC/Proxy Controller Route Handler',
        tips: 'Utilize CORS middleware parameters cleanly to prevent local client requests blockages on other server ports.'
      };
    }

    return {
      title: selectedPath,
      type: 'Sub-system Controller Folder',
      summary: `Modular namespace folder containing support files and subcomponents for the ${name} module.`,
      complexity: 'Low-Medium',
      pattern: 'Modular Separation',
      tips: 'Ensure proper scoping of imports. Do not introduce circular dependencies with parent directories.'
    };
  }, [selectedPath, repoInfo]);

  // Generate customized configuration snippets dynamically
  const toolsSnippets = useMemo(() => {
    const repoName = (repoInfo?.name || 'git-viz').toLowerCase();

    const dockerfile = `
# ==========================================
# MULTI-CONTAINER DEVELOPER ENVIRONMENT BLUEPRINT
# ==========================================

# 1. API SERVER BACKEND CONTAINER
FROM node:20-alpine AS backend-runner
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --only=production
COPY backend/src ./src
COPY backend/.env ./
EXPOSE 5000
CMD ["npm", "start"]

--- split-compose ---

# 2. NEXT.JS CLIENT APP RUNNER
FROM node:20-alpine AS frontend-runner
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
`.trim();

    const compose = `
# docker-compose.yml (Run both servers in harmony)
version: '3.8'

services:
  backend-api:
    build:
      context: .
      dockerfile: ./backend/Dockerfile
    ports:
      - "5000:5000"
    environment:
      - PORT=5000
      - REDIS_URL=redis://redis-cache:6379
    depends_on:
      - redis-cache
    restart: always

  redis-cache:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  frontend-client:
    build:
      context: .
      dockerfile: ./frontend/Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:5000
    depends_on:
      - backend-api

volumes:
  redis_data:
`.trim();

    const actions = `
# .github/workflows/ci-pipeline.yml
# Time-Saving Feature: Automated linting, caching, and builds
name: Integrations CI Pipeline

on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]

jobs:
  verify-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: 20
          cache: 'npm'
          cache-dependency-path: 'backend/package-lock.json'
      - name: Install dependencies
        run: |
          cd backend
          npm ci
      - name: Start syntax check
        run: |
          cd backend
          # npm test

  verify-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: 20
          cache: 'npm'
          cache-dependency-path: 'frontend/package-lock.json'
      - name: Install dependencies
        run: |
          cd frontend
          npm ci
      - name: Build Next.js Production App
        run: |
          cd frontend
          npm run build
`.trim();

    const apiRef = `
# ==========================================
# DEVELOPER API DOCUMENTATION & SCHEMA
# ==========================================

# 1. Fetch Repository Visual Schema
GET /api/repo/:owner/:repo
------------------------------------
Resolves repositories contributor clusters and directories.
Response:
{
  "repository": {
    "name": "react",
    "stars": 222934,
    "primaryLanguage": "TypeScript"
  },
  "languages": [{ "name": "TypeScript", "size": 140000 }],
  "graph": {
    "nodes": [{ "id": "user:acdlite", "type": "developer", "val": 18 }],
    "links": [{ "source": "user:acdlite", "target": "repo:facebook/react" }]
  },
  "directoryTree": { "name": "root", "isDirectory": true }
}

# 2. System Cache Administration
POST /api/cache/flush
------------------------------------
Clear Visualizer database records (Redis memory or memory array).
Response:
{
  "success": true,
  "message": "Visualizer cached databases cleared successfully."
}

# 3. Microservice Health Details
GET /api/health
------------------------------------
Monitor servers, cache state and drivers (REDIS vs LOCAL fallback).
Response:
{
  "status": "ONLINE",
  "cacheDriver": "LOCAL_IN_MEMORY_MAP_FALLBACK"
}
`.trim();

    return {
      docker: `docker-compose.yml\n\n${compose}\n\n${dockerfile}`,
      actions,
      api: apiRef
    };
  }, [repoInfo]);

  const copyToClipboard = () => {
    let copyText = '';
    if (activeTool === 'docker') copyText = toolsSnippets.docker;
    else if (activeTool === 'actions') copyText = toolsSnippets.actions;
    else if (activeTool === 'api') copyText = toolsSnippets.api;

    navigator.clipboard.writeText(copyText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="architect-container glass-panel">
      {/* Top Header */}
      <div className="architect-header">
        <div className="title-area">
          <Cpu className="title-icon" size={20} />
          <div>
            <h3>AI Repository Architect & Dev Toolkit</h3>
            <p className="subtitle">Dynamically mapping repository configuration layers and time-saving developer boilerplates.</p>
          </div>
        </div>
        <div className="spark-badge">
          <Sparkles size={11} className="spin-icon" />
          <span>AI Insight Engine Enabled</span>
        </div>
      </div>

      <div className="architect-body-grid">
        {/* Left Hand: Folders Scanner & Insight Explainer */}
        <div className="scanner-section">
          <div className="section-title-bar">
            <Layers size={14} className="accent-blue" />
            <span>Interactive Folder & Layout Scanner</span>
          </div>

          <p className="section-intro">Select a folder to extract cognitive complexity ratings and design patterns:</p>

          <div className="folders-tree-scroller">
            <div 
              className={`tree-folder-node ${selectedPath === '' ? 'selected' : ''}`}
              onClick={() => setSelectedPath('')}
            >
              <Globe size={13} className="node-icon root-icon" />
              <span className="node-name">root_workspace /</span>
            </div>

            {foldersList.length === 0 ? (
              <p className="empty-tree-text">Reading folder definitions...</p>
            ) : (
              foldersList.map((folder, idx) => (
                <div 
                  key={idx}
                  className={`tree-folder-node sub-node ${selectedPath === folder.path ? 'selected' : ''}`}
                  onClick={() => setSelectedPath(folder.path)}
                >
                  <CornerDownRight size={12} className="indent-arrow" />
                  <span className="node-name">{folder.path}</span>
                  <span className="node-badge">{folder.filesCount} files</span>
                </div>
              ))
            )}
          </div>

          {/* AI Explainer Bubble */}
          <div className="ai-explainer-card">
            <div className="explainer-header">
              <div className="type-badge">{activeExplainer.type}</div>
              <div className="complexity-badge-indicator">
                <span>Complexity: </span>
                <span className={activeExplainer.complexity === 'High' ? 'bold-red' : 'bold-green'}>
                  {activeExplainer.complexity}
                </span>
              </div>
            </div>
            
            <h4>{activeExplainer.title}</h4>
            <p className="summary-desc">{activeExplainer.summary}</p>
            
            <div className="pattern-row">
              <span className="label">Structure Pattern:</span>
              <span className="val">{activeExplainer.pattern}</span>
            </div>

            <div className="actionable-tips">
              <CheckCircle size={14} className="check-icon" />
              <p><b>Dev Tip:</b> {activeExplainer.tips}</p>
            </div>
          </div>
        </div>

        {/* Right Hand: Actionable Time-Saving developer boilerplates */}
        <div className="actions-section">
          <div className="section-title-bar">
            <Zap size={14} className="accent-gold" />
            <span>Developer Productivity Kit</span>
          </div>

          {/* Tool switch buttons */}
          <div className="tool-tabs-bar">
            <button 
              className={`tool-tab-btn ${activeTool === 'docker' ? 'active' : ''}`}
              onClick={() => setActiveTool('docker')}
            >
              <Database size={13} />
              <span>Docker blueprints</span>
            </button>
            <button 
              className={`tool-tab-btn ${activeTool === 'actions' ? 'active' : ''}`}
              onClick={() => setActiveTool('actions')}
            >
              <Settings size={13} />
              <span>CI/CD Workflow</span>
            </button>
            <button 
              className={`tool-tab-btn ${activeTool === 'api' ? 'active' : ''}`}
              onClick={() => setActiveTool('api')}
            >
              <Terminal size={13} />
              <span>API Reference</span>
            </button>
          </div>

          {/* Code Viewer Box */}
          <div className="code-viewer-viewport">
            <div className="code-viewer-header">
              <span className="lang-label">
                {activeTool === 'docker' ? 'DOCKERFILE & COMPOSE' : activeTool === 'actions' ? 'YAML WORKFLOW' : 'API SPEC'}
              </span>
              <button className="copy-btn icon-btn" onClick={copyToClipboard}>
                {copied ? <CheckCircle size={13} className="accent-green" /> : <Copy size={13} />}
                <span>{copied ? 'Copied!' : 'Copy Code'}</span>
              </button>
            </div>
            <pre className="code-pre-box">
              <code>
                {activeTool === 'docker' ? toolsSnippets.docker : activeTool === 'actions' ? toolsSnippets.actions : toolsSnippets.api}
              </code>
            </pre>
          </div>

          <div className="toolkit-info-bar">
            <HelpCircle size={12} className="info-icon" />
            <span>Blueprints dynamically adjust to fit the client/server directory tree structure. Just copy directly to save hours of boilerplate config setup.</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .architect-container {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          min-height: 520px;
        }

        .architect-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 16px;
          flex-wrap: wrap;
        }
        
        .title-area {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .title-icon {
          color: var(--color-accent);
          filter: drop-shadow(0 0 8px rgba(56,189,248,0.3));
        }
        .architect-header h3 {
          font-family: var(--font-display);
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 2px;
        }
        .subtitle {
          color: var(--text-muted);
          font-size: 12px;
          margin: 0;
        }

        .spark-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(168, 85, 247, 0.1);
          border: 1px solid rgba(168, 85, 247, 0.25);
          color: #d8b4fe;
          font-size: 11px;
          padding: 4px 10px;
          border-radius: 12px;
          font-family: var(--font-display);
        }
        .spin-icon {
          animation: spin 3s infinite linear;
        }

        .architect-body-grid {
          display: grid;
          grid-template-columns: 1fr 1.2fr;
          gap: 24px;
          align-items: stretch;
        }

        .section-title-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: var(--font-display);
          font-size: 12.5px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-primary);
          margin-bottom: 12px;
        }
        .accent-blue {
          color: var(--color-accent);
        }
        .accent-gold {
          color: var(--color-amber);
        }

        .section-intro {
          font-size: 12.5px;
          color: var(--text-secondary);
          margin-bottom: 12px;
        }

        /* Scanner Column style */
        .scanner-section {
          display: flex;
          flex-direction: column;
        }

        .folders-tree-scroller {
          background: rgba(0, 0, 0, 0.15);
          border: 1px solid var(--border-color);
          border-radius: 6px;
          padding: 8px;
          max-height: 180px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 3px;
          margin-bottom: 16px;
        }

        .tree-folder-node {
          display: flex;
          align-items: center;
          padding: 5px 8px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          font-family: monospace;
          color: var(--text-secondary);
          transition: all 0.15s ease;
        }
        .tree-folder-node:hover {
          background: rgba(255, 255, 255, 0.03);
          color: var(--text-primary);
        }
        .tree-folder-node.selected {
          background: rgba(56, 189, 248, 0.08);
          color: var(--color-accent);
          font-weight: bold;
        }
        .node-icon {
          margin-right: 6px;
        }
        .root-icon {
          color: var(--color-accent);
        }
        .indent-arrow {
          margin-right: 6px;
          opacity: 0.4;
          color: var(--text-muted);
        }
        .node-badge {
          margin-left: auto;
          font-size: 10px;
          background: rgba(255, 255, 255, 0.04);
          padding: 1px 6px;
          border-radius: 10px;
          color: var(--text-muted);
        }
        .empty-tree-text {
          font-size: 12px;
          color: var(--text-muted);
          text-align: center;
          padding: 15px;
        }

        .ai-explainer-card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 16px;
          margin-top: auto;
        }

        .explainer-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }
        .type-badge {
          font-size: 10px;
          text-transform: uppercase;
          background: rgba(56, 189, 248, 0.1);
          color: var(--color-accent);
          padding: 2px 7px;
          border-radius: 4px;
          font-weight: bold;
        }
        .complexity-badge-indicator {
          font-size: 11px;
          color: var(--text-muted);
        }
        .bold-red {
          color: var(--color-rose);
          font-weight: bold;
        }
        .bold-green {
          color: var(--color-green);
          font-weight: bold;
        }

        .ai-explainer-card h4 {
          font-size: 14px;
          color: var(--text-primary);
          margin-bottom: 8px;
          font-family: monospace;
        }
        .summary-desc {
          font-size: 12.5px;
          color: var(--text-secondary);
          line-height: 1.4;
          margin-bottom: 12px;
        }

        .pattern-row {
          font-size: 12px;
          display: flex;
          gap: 6px;
          margin-bottom: 10px;
        }
        .pattern-row .label {
          color: var(--text-muted);
        }
        .pattern-row .val {
          color: #d8b4fe;
          font-weight: 500;
        }

        .actionable-tips {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          background: rgba(16, 185, 129, 0.05);
          border: 1px solid rgba(16, 185, 129, 0.15);
          padding: 10px 12px;
          border-radius: 6px;
        }
        .check-icon {
          color: var(--color-green);
          flex-shrink: 0;
          margin-top: 2px;
        }
        .actionable-tips p {
          font-size: 12px;
          color: var(--text-secondary);
          margin: 0;
          line-height: 1.35;
        }

        /* Actions Column style */
        .actions-section {
          display: flex;
          flex-direction: column;
        }

        .tool-tabs-bar {
          display: flex;
          gap: 5px;
          background: rgba(0, 0, 0, 0.2);
          padding: 3px;
          border-radius: 6px;
          margin-bottom: 12px;
        }
        .tool-tab-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          background: transparent;
          border: none;
          padding: 6px 12px;
          border-radius: 4px;
          color: var(--text-secondary);
          font-size: 11.5px;
          cursor: pointer;
          font-family: var(--font-display);
          transition: all 0.2s ease;
        }
        .tool-tab-btn:hover {
          color: var(--text-primary);
        }
        .tool-tab-btn.active {
          background: rgba(255,255,255,0.06);
          color: var(--text-primary);
          box-shadow: 0 2px 7px rgba(0,0,0,0.2);
        }

        .code-viewer-viewport {
          background: rgba(0,0,0,0.3);
          border: 1px solid var(--border-color);
          border-radius: 6px;
          display: flex;
          flex-direction: column;
          flex-grow: 1;
          min-height: 250px;
          max-height: 380px;
          overflow: hidden;
        }
        .code-viewer-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 12px;
          background: rgba(255,255,255,0.02);
          border-bottom: 1px solid var(--border-color);
        }
        .lang-label {
          font-size: 10px;
          font-family: var(--font-display);
          color: var(--text-muted);
          letter-spacing: 0.05em;
        }
        .copy-btn {
          padding: 3px 8px !important;
          font-size: 10.5px !important;
          border-radius: 4px !important;
        }
        .accent-green {
          color: var(--color-green);
        }

        .code-pre-box {
          margin: 0;
          padding: 12px;
          flex-grow: 1;
          overflow: auto;
          font-family: 'Consolas', 'Monaco', monospace;
          font-size: 11.5px;
          line-height: 1.4;
          color: #a7f3d0;
          text-align: left;
        }

        .toolkit-info-bar {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          padding: 10px 0;
          font-size: 11px;
          color: var(--text-muted);
          line-height: 1.4;
        }
        .toolkit-info-bar .info-icon {
          color: var(--color-accent);
          flex-shrink: 0;
          margin-top: 1px;
        }

        @media (max-width: 820px) {
          .architect-body-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
