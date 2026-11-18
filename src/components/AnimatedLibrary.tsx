// Animated ASCII Art Library component with fast search, category filtering,
// lazy grid rendering, and seamless Studio integration.
// Written by Saad Khalid (@saadkhalidhere).

import { useEffect, useMemo, useState } from 'react'
import {
  type AnimatedPieceMeta,
  CATEGORY_LABELS,
  fetchArtCatalog,
  NATIVE_PIECES,
} from '../engine/animatedArt'
import AnimatedCard from './AnimatedCard'
import AnimatedPlayerModal from './AnimatedPlayerModal'

interface AnimatedLibraryProps {
  onOpenInStudio: (meta: AnimatedPieceMeta) => void
  onClose?: () => void
  onToast: (msg: string) => void
}

const PAGE_SIZE = 36

export default function AnimatedLibrary({ onOpenInStudio, onClose, onToast }: AnimatedLibraryProps) {
  const [pieces, setPieces] = useState<AnimatedPieceMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'featured' | 'name' | 'fps' | 'size'>('featured')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [activeModalPiece, setActiveModalPiece] = useState<AnimatedPieceMeta | null>(null)

  // Load catalog on mount
  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const catalog = await fetchArtCatalog()
        if (active) {
          setPieces(catalog)
          setLoading(false)
        }
      } catch (err) {
        console.error('Error fetching catalog:', err)
        if (active) {
          setPieces(NATIVE_PIECES.map((p) => p.meta))
          setLoading(false)
        }
      }
    })()
    return () => {
      active = false
    }
  }, [])

  // Extract all categories with count
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: pieces.length }
    pieces.forEach((p) => {
      counts[p.category] = (counts[p.category] || 0) + 1
      if (p.source === 'native') {
        counts.featured = (counts.featured || 0) + 1
      }
    })
    return counts
  }, [pieces])

  // Extract top tags
  const topTags = useMemo(() => {
    const counts: Record<string, number> = {}
    pieces.forEach((p) => {
      p.tags.forEach((tag) => {
        counts[tag] = (counts[tag] || 0) + 1
      })
    })
    return Object.entries(counts)
      .filter(([_, c]) => c >= 5)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([t]) => t)
  }, [pieces])

  // Filtered and sorted pieces
  const filteredPieces = useMemo(() => {
    let list = pieces

    // Category filter
    if (selectedCategory === 'featured') {
      list = list.filter((p) => p.source === 'native' || p.tags.includes('hero') || p.tags.includes('wallpaper'))
    } else if (selectedCategory !== 'all') {
      list = list.filter((p) => p.category === selectedCategory)
    }

    // Tag filter
    if (selectedTag) {
      list = list.filter((p) => p.tags.includes(selectedTag))
    }

    // Search query filter
    const q = searchQuery.trim().toLowerCase()
    if (q) {
      list = list.filter((p) => {
        return (
          p.name.toLowerCase().includes(q) ||
          p.slug.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.note.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q))
        )
      })
    }

    // Sorting
    return [...list].sort((a, b) => {
      if (sortBy === 'featured') {
        const aNat = a.source === 'native' ? 1 : 0
        const bNat = b.source === 'native' ? 1 : 0
        if (aNat !== bNat) return bNat - aNat
        return a.name.localeCompare(b.name)
      }
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      if (sortBy === 'fps') return (b.fps || 20) - (a.fps || 20)
      if (sortBy === 'size') return b.cols * b.rows - a.cols * a.rows
      return 0
    })
  }, [pieces, selectedCategory, selectedTag, searchQuery, sortBy])

  const displayedPieces = useMemo(() => {
    return filteredPieces.slice(0, visibleCount)
  }, [filteredPieces, visibleCount])

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + PAGE_SIZE)
  }

  const handleOpenStudio = (meta: AnimatedPieceMeta) => {
    onOpenInStudio(meta)
    if (onClose) onClose()
  }

  return (
    <div className="animated-library-container">
      {/* Header */}
      <div className="library-head">
        <div className="library-head-info">
          <div className="library-title-row">
            <h2>🎬 Animated ASCII Art Library</h2>
            <span className="library-badge-total">{pieces.length || 750}+ Animations</span>
            <span className="library-badge-sub">60 FPS · Free · Zero Latency</span>
            <a
              href="https://github.com/enabled404/ascii-studio"
              target="_blank"
              rel="noopener noreferrer"
              className="github-nav-pill"
              title="Star and view animation library on GitHub"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ verticalAlign: 'middle', marginRight: '4px' }}>
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              GitHub
            </a>
          </div>
          <p className="library-subtitle">
            The world's largest interactive collection of animated ASCII art. Browse 3D Math, Retro Gaming &amp; Memes,
            Cyberpunk, VFX, UI Loaders, and Nature. Play, scrub frames, export GIFs, or open directly in ASCII Studio.
          </p>
        </div>
        {onClose && (
          <button className="btn icon-btn library-close-btn" onClick={onClose} aria-label="Close Library">✕</button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="library-toolbar">
        <div className="library-search-box">
          <span className="library-search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search 750+ animations (e.g. donut, matrix, pacman, fire, skull, clock)..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setVisibleCount(PAGE_SIZE)
            }}
            className="library-search-input"
            aria-label="Search animated art catalog"
          />
          {searchQuery && (
            <button
              type="button"
              className="btn small icon-btn"
              onClick={() => setSearchQuery('')}
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        <div className="library-sort-box">
          <span className="library-sort-label">Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="library-sort-select"
            aria-label="Sort animation catalog"
          >
            <option value="featured">⭐ Featured First</option>
            <option value="name">🔤 Name (A-Z)</option>
            <option value="fps">⚡ FPS (High to Low)</option>
            <option value="size">📐 Canvas Size (Large)</option>
          </select>
        </div>
      </div>

      {/* Category Pills */}
      <div className="library-category-pills" role="tablist" aria-label="Filter by category">
        {Object.entries(CATEGORY_LABELS).map(([catId, label]) => {
          const count = categoryCounts[catId]
          if (count === undefined && catId !== 'all' && catId !== 'featured') return null
          const active = selectedCategory === catId
          return (
            <button
              key={catId}
              type="button"
              className={`library-cat-pill ${active ? 'active' : ''}`}
              onClick={() => {
                setSelectedCategory(catId)
                setSelectedTag(null)
                setVisibleCount(PAGE_SIZE)
              }}
              role="tab"
              aria-selected={active}
            >
              <span>{label}</span>
              {count !== undefined && <span className="cat-pill-count">{count}</span>}
            </button>
          )
        })}
      </div>

      {/* Tag Chips */}
      {topTags.length > 0 && (
        <div className="library-tags-bar">
          <span className="tags-bar-label">Tags:</span>
          {topTags.map((tag) => {
            const active = selectedTag === tag
            return (
              <button
                key={tag}
                type="button"
                className={`library-tag-chip ${active ? 'active' : ''}`}
                onClick={() => {
                  setSelectedTag(active ? null : tag)
                  setVisibleCount(PAGE_SIZE)
                }}
              >
                #{tag}
              </button>
            )
          })}
          {selectedTag && (
            <button
              type="button"
              className="library-tag-chip clear"
              onClick={() => setSelectedTag(null)}
            >
              Clear tag ✕
            </button>
          )}
        </div>
      )}

      {/* Catalog Status Bar */}
      <div className="library-status-bar">
        <span>
          Showing <b>{displayedPieces.length}</b> of <b>{filteredPieces.length}</b> animations
          {selectedCategory !== 'all' && ` in ${CATEGORY_LABELS[selectedCategory] || selectedCategory}`}
          {selectedTag && ` tagged #${selectedTag}`}
        </span>
      </div>

      {/* Grid of Cards */}
      {loading ? (
        <div className="library-loading-state">
          <div className="library-loading-spinner" />
          <p>Loading 750+ Animated ASCII Art pieces...</p>
        </div>
      ) : displayedPieces.length === 0 ? (
        <div className="library-empty-state">
          <p className="empty-title">No animations found matching "{searchQuery}"</p>
          <p className="empty-hint">Try searching for "donut", "matrix", "cat", "wave", "skull", or clear your filter.</p>
          <button
            type="button"
            className="btn small"
            onClick={() => {
              setSearchQuery('')
              setSelectedCategory('all')
              setSelectedTag(null)
            }}
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="library-cards-grid">
          {displayedPieces.map((piece) => (
            <AnimatedCard
              key={piece.slug}
              meta={piece}
              onOpenPlayer={(m) => setActiveModalPiece(m)}
              onOpenInStudio={handleOpenStudio}
              onToast={onToast}
            />
          ))}
        </div>
      )}

      {/* Load More Button */}
      {displayedPieces.length < filteredPieces.length && (
        <div className="library-load-more-box">
          <button
            type="button"
            className="btn large primary load-more-btn"
            onClick={handleLoadMore}
          >
            Load More Animations ({filteredPieces.length - displayedPieces.length} remaining)
          </button>
        </div>
      )}

      {/* Fullscreen Player Modal */}
      {activeModalPiece && (
        <AnimatedPlayerModal
          meta={activeModalPiece}
          onClose={() => setActiveModalPiece(null)}
          onOpenInStudio={handleOpenStudio}
          onToast={onToast}
        />
      )}
    </div>
  )
}
