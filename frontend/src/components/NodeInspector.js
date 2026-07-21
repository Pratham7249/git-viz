'use client';

import React from 'react';
import { User, Building, Heart, Plus, Minus, ArrowLeft, Layers } from 'lucide-react';

export default function NodeInspector({ node, repoInfo, onClose }) {
  if (!node) {
    return (
      <div className="inspector-panel-container glass-panel empty-inspector">
        <Layers size={24} className="inspector-empty-icon" />
        <h3>Workspace Inspector</h3>
        <p>Click on any developer node in the relationship graph below to investigate contribution summaries, code additions/deletions, and reviewer activity.</p>
        <style jsx>{`
          .empty-inspector {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 40px 24px;
            text-align: center;
            color: var(--text-muted);
            min-height: 250px;
            gap: 12px;
            height: 100%;
          }
          .inspector-empty-icon {
            color: rgba(56, 189, 248, 0.25);
            animation: float 4s ease-in-out infinite;
          }
          h3 {
            font-size: 15px;
            color: var(--text-secondary);
            font-family: var(--font-display);
          }
          p {
            font-size: 12.5px;
            line-height: 1.4;
          }
          @keyframes float {
            0% { transform: translateY(0px); }
            50% { transform: translateY(-8px); }
            100% { transform: translateY(0px); }
          }
        `}</style>
      </div>
    );
  }

  const isRepo = node.type === 'repository';

  return (
    <div className="inspector-panel-container glass-panel">
      <div className="inspector-control-header">
        <button className="back-btn-label" onClick={onClose}>
          <ArrowLeft size={16} />
          <span>Clear Selection</span>
        </button>
        <span className="type-tag" style={{
          backgroundColor: isRepo ? 'rgba(168, 85, 247, 0.1)' : 'rgba(56, 189, 248, 0.1)',
          color: isRepo ? 'var(--color-purple)' : 'var(--color-accent)',
          border: `1px solid ${isRepo ? 'rgba(168, 85, 247, 0.2)' : 'rgba(56, 189, 248, 0.2)'}`
        }}>
          {isRepo ? 'Core HUB' : 'Developer'}
        </span>
      </div>

      {isRepo ? (
        <div className="inspector-body">
          <div className="repo-detail-header">
            <h3>{node.label}</h3>
            <p className="repo-sub">Principal Hub Node</p>
          </div>
          <div className="stats-list">
            <div className="stat-row">
              <span className="stat-label">Stars:</span>
              <span className="stat-value">{repoInfo?.stars?.toLocaleString()}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Description:</span>
              <span className="stat-value text-wrap">{repoInfo?.description}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="inspector-body">
          <div className="dev-detail-header">
            {node.avatarUrl ? (
              <img src={node.avatarUrl} alt={node.username} className="dev-avatar" onError={(e) => { e.target.src = 'https://github.com/identicons/' + node.username + '.png'; }} />
            ) : (
              <div className="dev-avatar-fallback">
                <User size={24} />
              </div>
            )}
            <div className="dev-header-meta">
              <h4>{node.label}</h4>
              <p className="dev-username">@{node.username}</p>
            </div>
          </div>

          {node.bio && (
            <div className="dev-bio-section">
              <Heart size={14} className="bio-icon" />
              <p className="bio-message">"{node.bio}"</p>
            </div>
          )}

          <div className="dev-meta-attributes">
            <div className="meta-attr-item">
              <Building size={14} className="attr-icon" />
              <span>{node.company || 'Guild/Independent'}</span>
            </div>
          </div>

          <div className="contribution-metrics-section">
            <h5>Contribution Volume</h5>
            <div className="contrib-numbers-grid">
              <div className="contrib-num-card">
                <span className="label">Commits</span>
                <span className="val">{node.commitsCount || 0}</span>
              </div>
              <div className="contrib-num-card">
                <span className="label">PRs Filed</span>
                <span className="val">{node.prsCount || 0}</span>
              </div>
              <div className="contrib-num-card">
                <span className="label">Reviews</span>
                <span className="val">{node.reviewsCount || 0}</span>
              </div>
            </div>
          </div>

          {/* Additions vs Deletions segment */}
          {((node.additions || 0) + (node.deletions || 0)) > 0 && (
            <div className="code-delta-section">
              <h5>Code Mutation Profile</h5>
              
              <div className="delta-stats-row">
                <div className="delta-stat-item green-text">
                  <div className="delta-label">
                    <Plus size={14} />
                    <span>Additions</span>
                  </div>
                  <span className="number">{node.additions?.toLocaleString() || 0}</span>
                </div>

                <div className="delta-stat-item rose-text">
                  <div className="delta-label">
                    <Minus size={14} />
                    <span>Deletions</span>
                  </div>
                  <span className="number">{node.deletions?.toLocaleString() || 0}</span>
                </div>
              </div>

              {/* Progress bar comparison */}
              <div className="delta-progress-bar">
                <div className="delta-add-segment" style={{
                  width: `${(node.additions / (node.additions + node.deletions || 1)) * 100}%`
                }} />
                <div className="delta-del-segment" style={{
                  width: `${(node.deletions / (node.additions + node.deletions || 1)) * 100}%`
                }} />
              </div>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .inspector-panel-container {
          padding: 24px;
          height: 100%;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .inspector-control-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 12px;
        }
        .back-btn-label {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          font-family: var(--font-sans);
          font-size: 13px;
          transition: color 0.2s ease;
        }
        .back-btn-label:hover {
          color: var(--color-accent);
        }
        .type-tag {
          font-family: var(--font-display);
          font-size: 11px;
          padding: 2px 8px;
          border-radius: 12px;
          font-weight: 500;
        }
        .inspector-body {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .repo-detail-header h3 {
          font-size: 18px;
          color: var(--text-primary);
        }
        .repo-sub {
          font-size: 12px;
          color: var(--text-muted);
        }
        .stats-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          font-size: 13px;
        }
        .stat-row {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .stat-label {
          color: var(--text-muted);
          font-weight: 500;
        }
        .stat-value {
          color: var(--text-primary);
        }
        .text-wrap {
          word-break: break-word;
          line-height: 1.4;
        }
        
        .dev-detail-header {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .dev-avatar {
          width: 48px;
          height: 48px;
          border-radius: 8px;
          border: 1px solid var(--border-color);
          background: var(--bg-primary);
        }
        .dev-avatar-fallback {
          width: 48px;
          height: 48px;
          border-radius: 8px;
          border: 1px solid var(--border-color);
          background: rgba(255, 255, 255, 0.05);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
        }
        .dev-header-meta h4 {
          font-size: 16px;
          color: var(--text-primary);
        }
        .dev-username {
          font-size: 12px;
          color: var(--color-accent);
        }
        .dev-bio-section {
          background: rgba(255, 255, 255, 0.02);
          border: 1px dashed var(--border-color);
          padding: 10px 12px;
          border-radius: 8px;
          display: flex;
          gap: 8px;
          align-items: flex-start;
        }
        .bio-icon {
          color: var(--color-purple);
          margin-top: 3px;
          flex-shrink: 0;
        }
        .bio-message {
          font-size: 12px;
          font-style: italic;
          color: var(--text-secondary);
          line-height: 1.4;
        }
        .dev-meta-attributes {
          font-size: 12px;
          color: var(--text-secondary);
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .meta-attr-item {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .attr-icon {
          color: var(--text-muted);
        }
        .contribution-metrics-section h5, .code-delta-section h5 {
          font-size: 12px;
          color: var(--text-primary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 10px;
          font-family: var(--font-display);
        }
        .contrib-numbers-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }
        .contrib-num-card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-color);
          border-radius: 6px;
          padding: 8px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }
        .contrib-num-card .label {
          font-size: 10px;
          color: var(--text-muted);
          text-transform: uppercase;
        }
        .contrib-num-card .val {
          font-family: var(--font-display);
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .delta-stats-row {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 8px;
        }
        .delta-stat-item {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .delta-label {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          color: var(--text-muted);
        }
        .delta-stat-item .number {
          font-family: var(--font-display);
          font-size: 14px;
          font-weight: 500;
        }
        .green-text .number { color: var(--color-green); }
        .rose-text .number { color: var(--color-rose); }
        .delta-progress-bar {
          display: flex;
          height: 4px;
          border-radius: 2px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.1);
        }
        .delta-add-segment {
          background: var(--color-green);
          height: 100%;
        }
        .delta-del-segment {
          background: var(--color-rose);
          height: 100%;
        }
      `}</style>
    </div>
  );
}
