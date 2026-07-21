'use client';

import React from 'react';
import { Star, GitFork, Eye, AlertCircle, GitPullRequest } from 'lucide-react';

export default function MetricsPanel({ repo, languages }) {
  if (!repo) return null;

  // Calculate total language size to get ratios
  const totalLanguageSize = (languages || []).reduce((acc, curr) => acc + curr.size, 0);

  return (
    <div className="metrics-panel-container glass-panel">
      <div className="repo-header-info">
        <span className="repo-owner-tag">{repo.owner}</span>
        <h1>{repo.name}</h1>
        <p className="repo-desc">{repo.description}</p>
      </div>

      <div className="metrics-numeric-grid">
        <div className="metric-box">
          <div className="metric-box-label">
            <Star size={16} className="met-icon text-amber" />
            <span>Stars</span>
          </div>
          <div className="metric-box-val">{repo.stars?.toLocaleString() || 0}</div>
        </div>

        <div className="metric-box">
          <div className="metric-box-label">
            <GitFork size={16} className="met-icon text-purple" />
            <span>Forks</span>
          </div>
          <div className="metric-box-val">{repo.forks?.toLocaleString() || 0}</div>
        </div>

        <div className="metric-box">
          <div className="metric-box-label">
            <Eye size={16} className="met-icon text-cyan" />
            <span>Watchers</span>
          </div>
          <div className="metric-box-val">{repo.watchers?.toLocaleString() || 0}</div>
        </div>

        <div className="metric-box">
          <div className="metric-box-label">
            <AlertCircle size={16} className="met-icon text-rose" />
            <span>Open Issues</span>
          </div>
          <div className="metric-box-val">{repo.openIssues?.toLocaleString() || 0}</div>
        </div>

        <div className="metric-box">
          <div className="metric-box-label">
            <GitPullRequest size={16} className="met-icon text-green" />
            <span>Open PRs</span>
          </div>
          <div className="metric-box-val">{repo.openPRs?.toLocaleString() || 0}</div>
        </div>
      </div>

      {languages && languages.length > 0 && (
        <div className="languages-metric-bar">
          <h3>Languages Distribution</h3>
          
          {/* Horizontal multi-color bar */}
          <div className="language-stack-bar">
            {languages.map((lang, idx) => {
              const pct = totalLanguageSize > 0 ? (lang.size / totalLanguageSize) * 100 : 0;
              if (pct < 0.5) return null; // skip tiny elements
              return (
                <div
                  key={idx}
                  className="lang-bar-segment"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: lang.color
                  }}
                  title={`${lang.name}: ${pct.toFixed(1)}%`}
                />
              );
            })}
          </div>

          {/* Languages legend list */}
          <div className="language-legend-list">
            {languages.map((lang, idx) => {
              const pct = totalLanguageSize > 0 ? (lang.size / totalLanguageSize) * 100 : 0;
              return (
                <div key={idx} className="lang-legend-item">
                  <span className="lang-dot" style={{ backgroundColor: lang.color }} />
                  <span className="lang-name">{lang.name}</span>
                  <span className="lang-pct">{pct.toFixed(1)}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <style jsx>{`
        .metrics-panel-container {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          height: 100%;
        }
        .repo-header-info h1 {
          font-size: 26px;
          color: var(--text-primary);
          line-height: 1.2;
          background: linear-gradient(135deg, #ffffff 40%, var(--color-accent) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .repo-owner-tag {
          font-family: var(--font-display);
          font-size: 12px;
          color: var(--color-accent);
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }
        .repo-desc {
          font-size: 13.5px;
          color: var(--text-secondary);
          margin-top: 8px;
          line-height: 1.4;
        }
        .metrics-numeric-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
          gap: 12px;
        }
        .metric-box {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .metric-box-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: var(--text-muted);
        }
        .met-icon {
          flex-shrink: 0;
        }
        .metric-box-val {
          font-family: var(--font-display);
          font-size: 18px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .text-amber { color: var(--color-amber); }
        .text-purple { color: var(--color-purple); }
        .text-cyan { color: var(--color-accent); }
        .text-rose { color: var(--color-rose); }
        .text-green { color: var(--color-green); }

        .languages-metric-bar h3 {
          font-size: 14px;
          margin-bottom: 10px;
          color: var(--text-primary);
          font-family: var(--font-display);
        }
        .language-stack-bar {
          display: flex;
          height: 8px;
          border-radius: 4px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.05);
          margin-bottom: 12px;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        .lang-bar-segment {
          height: 100%;
          transition: width 0.3s ease;
        }
        .language-legend-list {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
        }
        .lang-legend-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: var(--text-secondary);
        }
        .lang-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .lang-name {
          text-overflow: ellipsis;
          overflow: hidden;
          white-space: nowrap;
        }
        .lang-pct {
          color: var(--text-muted);
          margin-left: auto;
        }
      `}</style>
    </div>
  );
}
