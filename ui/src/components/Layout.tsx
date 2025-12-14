import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { LEVEL_CONFIGS, Level } from '../types'

interface LayoutProps {
  children: React.ReactNode
  currentLevel: Level
}

export function Layout({ children, currentLevel }: LayoutProps) {
  const location = useLocation()

  return (
    <div className="layout">
      <nav className="sidebar">
        <div className="sidebar-header">
          <h1>LLM Streaming</h1>
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
      </nav>
      <main className="main-content">
        {children}
      </main>
    </div>
  )
}
