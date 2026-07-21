'use client';

import React, { useState, useEffect } from 'react';
import SearchBox from '../components/SearchBox';
import MetricsPanel from '../components/MetricsPanel';
import NodeInspector from '../components/NodeInspector';
import GraphVisualizer from '../components/GraphVisualizer';
import DirectoryHeatmap from '../components/DirectoryHeatmap';
import { fetchRepositoryEcosystem, getBackendHealth } from '../utils/api';
import { RefreshCw, Home, Compass, Radio, AlertTriangle } from 'lucide-react';

export default function HomeView() {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [repoData, setRepoData] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [searchHistory, setSearchHistory] = useState([]);
  const [backendStatus, setBackendStatus] = useState({ checked: false, online: false, mode: '' });
  const [activeTab, setActiveTab] = useState('graph');

  // Probe backend health to alert user of availability
  useEffect(() => {
    const checkHealth = async () => {
      const health = await getBackendHealth();
      if (health && health.status === 'ONLINE') {
        setBackendStatus({
          checked: true,
          online: true,
          mode: health.cacheDriver === 'REDIS_CLIENT' ? 'Redis Cache Active' : 'Memory Cache Fallback Active'
        });
      } else {
        setBackendStatus({ checked: true, online: false, mode: 'Offline' });
      }
    };
    checkHealth();
  }, []);

  const handleQuerySearch = async (owner, name) => {
    setIsLoading(true);
    setErrorMsg('');
    setSelectedNode(null);

    try {
      const payload = await fetchRepositoryEcosystem(owner, name);
      setRepoData(payload);
      
      // Save search term in dynamic session history list
      const queryKey = `${owner}/${name}`;
      if (!searchHistory.includes(queryKey)) {
        setSearchHistory(prev => [queryKey, ...prev].slice(0, 5));
      }
    } catch (err) {
      console.error('[Client Search Error]', err);
      // Custom friendly alerts if pat is not set
      if (err.code === 'AUTH_REQUIRED') {
        setErrorMsg('GitHub PAT config token missing in backend `.env` file. Mock datasets are available for "facebook/react" or "vercel/next.js".');
      } else {
        setErrorMsg(err.message || 'An unexpected error occurred during repository analysis.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearSearch = () => {
    setRepoData(null);
    setSelectedNode(null);
    setErrorMsg('');
  };

  return (
    <main className="app-layout-main">
      {/* Dynamic Ambient Background Orbs */}
      <div className="ambient-glow orb-purple" />
      <div className="ambient-glow orb-cyan" />

      {/* Global Header Bar */}
      <header className="global-navbar glass-panel">
        <div className="nav-logo" onClick={handleClearSearch}>
          <svg className="logo-icon" viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'transform 0.4s ease', color: 'var(--color-accent)' }}>
            <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
            <path d="M9 18c-4.51 2-5-2-7-2" />
          </svg>
          <h2>Antigravity <span>Visualizer</span></h2>
        </div>
        
        <div className="server-state-indicators">
          {backendStatus.checked ? (
            backendStatus.online ? (
              <div className="api-badge online">
                <Radio size={14} className="badge-pulse" />
                <span>API: Online ({backendStatus.mode})</span>
              </div>
            ) : (
              <div className="api-badge offline">
                <AlertTriangle size={14} />
                <span>API: Server Offline</span>
              </div>
            )
          ) : (
            <div className="api-badge checking">
              <RefreshCw size={12} className="spin-icon" />
              <span>API Request Pending...</span>
            </div>
          )}
        </div>
      </header>

      {/* Primary Content Container */}
      <div className="layout-body">
        {!repoData ? (
          /* Landing/Search View layout */
          <div className="landing-area-viewport">
            <div className="decorations-line">
              <Compass className="compass-icon" size={48} />
            </div>
            
            <SearchBox onSearch={handleQuerySearch} isLoading={isLoading} />
            
            {isLoading && (
              <div className="page-loader-wrapper">
                <div className="loading-orbit">
                  <div className="orbit-center"></div>
                  <div className="orbit-ring-1"></div>
                  <div className="orbit-ring-2"></div>
                </div>
                <h3>Parsing Repository Relationships</h3>
                <p>Retrieving default branch commits, active reviewers, and language splits from GitHub GraphQL...</p>
              </div>
            )}

            {errorMsg && (
              <div className="global-error-card glass-panel">
                <AlertTriangle size={20} className="err-icon" />
                <div className="err-content">
                  <h4>Ecosystem Fetch Failure</h4>
                  <p>{errorMsg}</p>
                </div>
              </div>
            )}

            {searchHistory.length > 0 && !isLoading && (
              <div className="search-history-panel glass-panel">
                <h4>Recent Session Analysis</h4>
                <div className="history-tags-grid">
                  {searchHistory.map((item, idx) => {
                    const [o, r] = item.split('/');
                    return (
                      <button
                        key={idx}
                        className="history-tag-btn"
                        onClick={() => handleQuerySearch(o, r)}
                      >
                        {item}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Visualization Dashboard Panel Grid Layout */
          <div className="visualizer-dashboard-grid">
            <div className="dashboard-header-controls">
              <button className="secondary-button icon-btn" onClick={handleClearSearch}>
                <Home size={16} />
                <span>Home Search</span>
              </button>
              <div className="active-repo-badge">
                <span className="label">Active:</span>
                <span className="val">{repoData.repository.owner}/{repoData.repository.name}</span>
                {repoData.cached && <span className="cache-hit-tag">Cached</span>}
              </div>
            </div>

            <div className="dashboard-split-content">
              {/* Left Column: Metrics & Inspector panel stack */}
              <div className="dash-sidebar-col">
                <MetricsPanel repo={repoData.repository} languages={repoData.languages} />
                <NodeInspector 
                  node={selectedNode} 
                  repoInfo={repoData.repository} 
                  onClose={() => setSelectedNode(null)} 
                />
              </div>

              {/* Right Column: Dynamic Tabs (Force Network Graph or Directory Heatmap) */}
              <div className="dash-canvas-col">
                <div className="tab-control-bar glass-panel">
                  <button 
                    className={`tab-btn ${activeTab === 'graph' ? 'active' : ''}`}
                    onClick={() => setActiveTab('graph')}
                  >
                    Developer Collaboration Network
                  </button>
                  <button 
                    className={`tab-btn ${activeTab === 'tree' ? 'active' : ''}`}
                    onClick={() => setActiveTab('tree')}
                  >
                    Repository Directory Heatmap
                  </button>
                </div>
                
                <div className="tab-content-viewport">
                  {activeTab === 'graph' ? (
                    <>
                      <GraphVisualizer 
                        data={repoData} 
                        onSelectNode={setSelectedNode} 
                        selectedNode={selectedNode} 
                      />
                      
                      <div className="info-guide-footer glass-panel">
                        <span className="accent-bullet">•</span> <b>Repository Hub</b> nodes are colored purple.
                        <span className="accent-bullet font-cyan">•</span> <b>Developers</b> are colored blue. 
                        Node sized by total contribution intensity (commits + PR reviews). Drag nodes to reposition network.
                      </div>
                    </>
                  ) : (
                    <DirectoryHeatmap 
                      directoryTree={repoData.directoryTree} 
                      repoInfo={repoData.repository}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .app-layout-main {
          position: relative;
          min-height: 100vh;
          width: 100%;
          display: flex;
          flex-direction: column;
          z-index: 1;
        }
        
        /* Positioning Glowing Background Orbs */
        .orb-purple {
          top: -150px;
          right: 15%;
          width: 500px;
          height: 500px;
          background: rgba(168, 85, 247, 0.08); /* faint royal violet */
        }
        .orb-cyan {
          bottom: -150px;
          left: 10%;
          width: 600px;
          height: 600px;
          background: rgba(56, 189, 248, 0.08); /* faint aqua cyan */
        }

        .global-navbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 40px;
          border-radius: 0 !important;
          border-left: none !important;
          border-right: none !important;
          border-top: none !important;
          background: rgba(8, 12, 22, 0.8) !important;
          position: sticky;
          top: 0;
          z-index: 100;
        }
        .nav-logo {
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
        }
        .logo-icon {
          color: var(--color-accent);
          transition: transform 0.4s ease;
        }
        .nav-logo:hover .logo-icon {
          transform: rotate(360deg) scale(1.1);
        }
        .nav-logo h2 {
          font-size: 19px;
          font-weight: 700;
          letter-spacing: -0.03em;
        }
        .nav-logo h2 span {
          color: var(--color-accent);
          font-weight: 300;
        }
        
        .api-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: var(--font-display);
          font-size: 11px;
          font-weight: 600;
          padding: 6px 14px;
          border-radius: 20px;
          text-transform: uppercase;
        }
        .api-badge.online {
          background: rgba(16, 185, 129, 0.08);
          border: 1px solid rgba(16, 185, 129, 0.2);
          color: var(--color-green);
        }
        .api-badge.offline {
          background: rgba(244, 63, 94, 0.08);
          border: 1px solid rgba(244, 63, 94, 0.2);
          color: var(--color-rose);
        }
        .api-badge.checking {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--border-color);
          color: var(--text-secondary);
        }

        .badge-pulse {
          animation: pulse-op 1.5s infinite;
        }
        @keyframes pulse-op {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        .spin-icon {
          animation: spin 2s infinite linear;
        }

        .layout-body {
          flex-grow: 1;
          display: flex;
          flex-direction: column;
          padding: 40px;
          z-index: 10;
        }

        /* Landing Area Layout */
        .landing-area-viewport {
          display: flex;
          flex-direction: column;
          gap: 30px;
          align-items: center;
          justify-content: center;
          margin-top: 5vh;
          width: 100%;
        }
        .decorations-line {
          color: rgba(255, 255, 255, 0.03);
          animation: float-compass 6s ease-in-out infinite;
        }
        @keyframes float-compass {
          0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.3; }
          50% { transform: translateY(-10px) rotate(15deg); opacity: 0.6; }
        }
        .compass-icon {
          color: var(--color-accent);
          filter: drop-shadow(0 0 15px rgba(56, 189, 248, 0.3));
        }

        /* Dynamic Loading state styling */
        .page-loader-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          margin-top: 20px;
          gap: 12px;
          max-width: 480px;
        }
        .page-loader-wrapper h3 {
          font-size: 16px;
          color: var(--text-primary);
          font-family: var(--font-display);
        }
        .page-loader-wrapper p {
          font-size: 13px;
          color: var(--text-muted);
          line-height: 1.4;
        }
        .loading-orbit {
          position: relative;
          width: 60px;
          height: 60px;
          margin-bottom: 12px;
        }
        .orbit-center {
          position: absolute;
          top: 25px;
          left: 25px;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: var(--color-purple);
          box-shadow: 0 0 10px var(--color-purple);
        }
        .orbit-ring-1 {
          position: absolute;
          top: 10px;
          left: 10px;
          width: 40px;
          height: 40px;
          border: 1px dashed rgba(56, 189, 248, 0.4);
          border-radius: 50%;
          animation: spin 3s infinite linear;
        }
        .orbit-ring-1::after {
          content: '';
          position: absolute;
          top: 0;
          left: 17px;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--color-accent);
          box-shadow: 0 0 8px var(--color-accent);
        }
        .orbit-ring-2 {
          position: absolute;
          top: 0;
          left: 0;
          width: 60px;
          height: 60px;
          border: 1px dashed rgba(168, 85, 247, 0.3);
          border-radius: 50%;
          animation: spin-reverse 5s infinite linear;
        }
        @keyframes spin-reverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }

        .global-error-card {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          padding: 20px;
          border-color: rgba(244, 63, 94, 0.25) !important;
          background: rgba(244, 63, 94, 0.05) !important;
          max-width: 600px;
          width: 100%;
        }
        .err-icon {
          color: var(--color-rose);
          flex-shrink: 0;
          margin-top: 2px;
        }
        .err-content h4 {
          font-size: 14px;
          color: var(--text-primary);
          margin-bottom: 4px;
        }
        .err-content p {
          font-size: 13px;
          color: var(--text-secondary);
          line-height: 1.4;
        }

        .search-history-panel {
          padding: 20px 24px;
          max-width: 600px;
          width: 100%;
        }
        .search-history-panel h4 {
          font-size: 13px;
          color: var(--text-secondary);
          margin-bottom: 12px;
          font-family: var(--font-display);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .history-tags-grid {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .history-tag-btn {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-color);
          border-radius: 6px;
          padding: 6px 12px;
          color: var(--text-secondary);
          font-size: 12.5px;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: var(--font-sans);
        }
        .history-tag-btn:hover {
          background: rgba(168, 85, 247, 0.05);
          border-color: var(--color-purple);
          color: var(--text-primary);
        }

        /* Visualizer Dashboard Layout */
        .visualizer-dashboard-grid {
          display: flex;
          flex-direction: column;
          gap: 20px;
          height: 100%;
          width: 100%;
          animation: fade-in 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .dashboard-header-controls {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 16px;
        }
        .icon-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(255, 255, 255, 0.02) !important;
        }
        .active-repo-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
        }
        .active-repo-badge .label {
          color: var(--text-muted);
        }
        .active-repo-badge .val {
          font-family: var(--font-display);
          color: var(--text-primary);
          font-weight: 600;
        }
        .cache-hit-tag {
          font-family: var(--font-display);
          font-size: 10px;
          text-transform: uppercase;
          background: rgba(16, 185, 129, 0.1);
          color: var(--color-green);
          border: 1px solid rgba(16, 185, 129, 0.2);
          padding: 2px 7px;
          border-radius: 4px;
          font-weight: bold;
        }

        .dashboard-split-content {
          display: grid;
          grid-template-columns: 330px 1fr;
          gap: 20px;
          align-items: stretch;
        }
        .dash-sidebar-col {
          display: flex;
          flex-direction: column;
          gap: 20px;
          height: 100%;
        }
        .dash-canvas-col {
          display: flex;
          flex-direction: column;
          gap: 20px;
          height: 100%;
        }
        
        .tab-control-bar {
          display: flex;
          gap: 4px;
          padding: 4px;
          border-radius: 8px !important;
          background: rgba(8, 12, 22, 0.6) !important;
        }
        .tab-btn {
          flex: 1;
          background: transparent;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          color: var(--text-secondary);
          font-family: var(--font-display);
          font-weight: 500;
          font-size: 13.5px;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .tab-btn:hover {
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.02);
        }
        .tab-btn.active {
          color: var(--color-accent);
          background: rgba(56, 189, 248, 0.08);
          border: 1px solid rgba(56, 189, 248, 0.15);
          box-shadow: 0 4px 15px rgba(56, 189, 248, 0.05);
        }
        .tab-content-viewport {
          flex-grow: 1;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        
        .info-guide-footer {
          padding: 12px 18px;
          font-size: 12px;
          color: var(--text-secondary);
          line-height: 1.4;
        }
        .accent-bullet {
          font-weight: bold;
          font-size: 16px;
          vertical-align: middle;
          margin-right: 3px;
          color: var(--color-purple);
        }
        .accent-bullet.font-cyan {
          color: var(--color-accent);
        }

        @media (max-width: 1024px) {
          .dashboard-split-content {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 480px) {
          .layout-body {
            padding: 16px;
          }
          .global-navbar {
            padding: 12px 20px;
          }
        }
      `}</style>
    </main>
  );
}
