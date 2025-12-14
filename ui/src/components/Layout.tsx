import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { LEVEL_CONFIGS, Level } from '../types'

interface LayoutProps {
  children: React.ReactNode
  currentLevel: Level
}

export function Layout({ children, currentLevel }: LayoutProps) {
  const location = useLocation()

  const prevLevel = currentLevel > 1 ? currentLevel - 1 : null
  const nextLevel = currentLevel < 6 ? currentLevel + 1 : null

  return (
    <div className="layout">
      <nav className="sidebar">
        <div className="sidebar-header">
          <h1>LLM Streaming</h1>
          <p>React 18 Optimizations</p>
        </div>
        <ul className="nav-list">
          {LEVEL_CONFIGS.map((config) => (
            <li key={config.level}>
              <Link
                to={`/level/${config.level}`}
                className={`nav-link ${location.pathname === `/level/${config.level}` ? 'active' : ''}`}
              >
                <span className="nav-level">Level {config.level}</span>
                <span className="nav-name">{config.name}</span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="sidebar-footer">
          <a
            href="https://react.dev/reference/react/useTransition"
            target="_blank"
            rel="noopener noreferrer"
          >
            React Docs
          </a>
        </div>
      </nav>
      <main className="main-content">
        {children}
        <nav className="level-nav">
          {prevLevel ? (
            <Link to={`/level/${prevLevel}`} className="nav-button prev">
              <span className="nav-arrow">←</span>
              <span className="nav-text">
                <span className="nav-label">Previous</span>
                <span className="nav-title">
                  Level {prevLevel}: {LEVEL_CONFIGS[prevLevel - 1].name}
                </span>
              </span>
            </Link>
          ) : (
            <div />
          )}
          {nextLevel ? (
            <Link to={`/level/${nextLevel}`} className="nav-button next">
              <span className="nav-text">
                <span className="nav-label">Next</span>
                <span className="nav-title">
                  Level {nextLevel}: {LEVEL_CONFIGS[nextLevel - 1].name}
                </span>
              </span>
              <span className="nav-arrow">→</span>
            </Link>
          ) : (
            <div />
          )}
        </nav>
      </main>
    </div>
  )
}
