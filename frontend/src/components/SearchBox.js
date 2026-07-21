'use client';

import React, { useState } from 'react';
import { Search } from 'lucide-react';

export default function SearchBox({ onSearch, isLoading }) {
  const [inputValue, setInputValue] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const QUICK_REPOS = [
    { label: 'React Project (Mock/Sandbox)', owner: 'facebook', repo: 'react' },
    { label: 'Next.js Project (Mock/Sandbox)', owner: 'vercel', repo: 'next.js' }
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');
    
    let query = inputValue.trim();
    if (!query) {
      setErrorMsg('Please supply a repository search phrase.');
      return;
    }

    // Parse URL structure (e.g. https://github.com/facebook/react)
    // Strip protocols and base domains
    let parsedPath = query
      .replace(/^(https?:\/\/)?(www\.)?github\.com\//i, '')
      .replace(/\.git\/?$/i, '')
      .replace(/\/$/, '');

    const segments = parsedPath.split('/');
    if (segments.length < 2) {
      // If it is just a repository name, check if we recognize it as a standard demo
      const searchLower = query.toLowerCase();
      if (searchLower === 'react') {
        onSearch('facebook', 'react');
        return;
      }
      if (searchLower === 'next' || searchLower === 'next.js' || searchLower === 'nextjs') {
        onSearch('vercel', 'next.js');
        return;
      }
      setErrorMsg('Ensure your entry is formatted as "owner/repository" or matches a full github.com link.');
      return;
    }

    const [owner, repo] = segments;
    if (!owner || !repo) {
      setErrorMsg('Syntax error. Validate the owner and repository names.');
      return;
    }

    onSearch(owner, repo);
  };

  return (
    <div className="search-box-panel glass-panel">
      <h2>Analyze Repository Ecosystem</h2>
      <p className="subtitle">Visualizing developer clusters, impact metrics, and collaboration structures directly from GitHub GraphQL.</p>
      
      <form onSubmit={handleSubmit} className="search-form">
        <div className="input-glow-wrapper">
          <Search className="search-icon" size={20} />
          <input
            type="text"
            className="glow-input search-input"
            placeholder="e.g. https://github.com/facebook/react or facebook/react"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setErrorMsg('');
            }}
            disabled={isLoading}
          />
          <button type="submit" className="glow-button submit-btn" disabled={isLoading}>
            {isLoading ? 'Fetching...' : 'Visualize'}
          </button>
        </div>
        {errorMsg && <p className="error-text">{errorMsg}</p>}
      </form>

      <div className="quick-presets">
        <span>Try preset channels:</span>
        <div className="preset-chips">
          {QUICK_REPOS.map((item, idx) => (
            <button
              key={idx}
              className="preset-chip-btn"
              onClick={() => {
                setInputValue(`${item.owner}/${item.repo}`);
                onSearch(item.owner, item.repo);
              }}
              disabled={isLoading}
            >
              {item.owner}/{item.repo}
            </button>
          ))}
        </div>
      </div>

      <style jsx>{`
        .search-box-panel {
          padding: 35px 30px;
          text-align: center;
          max-width: 720px;
          margin: 0 auto;
          box-shadow: 0 15px 40px rgba(0, 0, 0, 0.4);
        }
        h2 {
          font-size: 28px;
          margin-bottom: 8px;
          background: linear-gradient(to right, #38bdf8, #a855f7);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .subtitle {
          color: var(--text-secondary);
          font-size: 14px;
          margin-bottom: 25px;
          font-weight: 400;
        }
        .search-form {
          margin-bottom: 25px;
        }
        .input-glow-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .search-input {
          padding-left: 45px !important;
          height: 48px;
          font-size: 15px;
        }
        .search-icon {
          position: absolute;
          left: 16px;
          color: var(--text-muted);
        }
        .submit-btn {
          height: 48px;
          white-space: nowrap;
          padding: 0 24px;
        }
        .error-text {
          color: var(--color-rose);
          font-size: 13px;
          margin-top: 10px;
          text-align: left;
        }
        .quick-presets {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          flex-wrap: wrap;
          font-size: 13px;
          color: var(--text-muted);
        }
        .preset-chips {
          display: flex;
          gap: 8px;
        }
        .preset-chip-btn {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--border-color);
          border-radius: 20px;
          padding: 5px 12px;
          color: var(--text-secondary);
          cursor: pointer;
          font-size: 13px;
          transition: all 0.2s ease;
          font-family: var(--font-sans);
        }
        .preset-chip-btn:hover {
          background: rgba(56, 189, 248, 0.08);
          border-color: var(--color-accent);
          color: var(--color-accent);
        }
        @media (max-width: 600px) {
          .input-glow-wrapper {
            flex-direction: column;
            width: 100%;
          }
          .submit-btn {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
