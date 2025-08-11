'use client'

import { useState, useEffect } from 'react'
import { Palette, X, Grid3x3, Sparkles, Circle, Sun, Star, Waves } from 'lucide-react'
import { Button } from '../ui/button'
import { cn } from '../../lib/utils'

export type BackgroundType = 'none' | 'grid-lines' | 'particles' | 'dot-grid' | 'light-rays' | 'galaxy' | 'aurora'

const BACKGROUND_OPTIONS: { value: BackgroundType; label: string; Icon: any }[] = [
  { value: 'none', label: 'None', Icon: X },
  { value: 'grid-lines', label: 'Grid Lines', Icon: Grid3x3 },
  { value: 'particles', label: 'Particles', Icon: Sparkles },
  { value: 'dot-grid', label: 'Dot Grid', Icon: Circle },
  { value: 'light-rays', label: 'Light Rays', Icon: Sun },
  { value: 'galaxy', label: 'Galaxy', Icon: Star },
  { value: 'aurora', label: 'Aurora', Icon: Waves }
]

interface BackgroundSelectorProps {
  onBackgroundChange?: (background: BackgroundType) => void
}

export function BackgroundSelector({ onBackgroundChange }: BackgroundSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedBackground, setSelectedBackground] = useState<BackgroundType>(() => {
    // Load from localStorage or default to random
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('roboto_rumble_background')
      if (saved && BACKGROUND_OPTIONS.some(opt => opt.value === saved)) {
        return saved as BackgroundType
      }
    }
    // Random selection excluding 'none'
    const options = BACKGROUND_OPTIONS.filter(opt => opt.value !== 'none')
    return options[Math.floor(Math.random() * options.length)].value
  })

  useEffect(() => {
    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('roboto_rumble_background', selectedBackground)
      // Dispatch custom event for other components
      window.dispatchEvent(new CustomEvent('backgroundChange', { detail: selectedBackground }))
    }
    // Notify parent component
    onBackgroundChange?.(selectedBackground)
  }, [selectedBackground, onBackgroundChange])

  const handleSelect = (value: BackgroundType) => {
    setSelectedBackground(value)
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <Button
        variant="terminal"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        title="Background Settings"
      >
        <Palette className="w-4 h-4" />
      </Button>
      
      {isOpen && (
        <div className="absolute top-full right-0 mt-1 bg-black/95 border border-green-800 rounded overflow-hidden min-w-[150px] z-50">
          <div className="px-3 py-1 text-xs text-green-600 border-b border-green-800/50">
            Backgrounds
          </div>
          {BACKGROUND_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => handleSelect(option.value)}
              className={cn(
                "flex items-center gap-2 w-full text-left px-4 py-2 text-sm hover:bg-green-900/30 transition-colors",
                selectedBackground === option.value ? 'text-green-300 bg-green-900/20' : 'text-green-400'
              )}
            >
              <option.Icon className="w-3 h-3" />
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function useBackground() {
  const [background, setBackground] = useState<BackgroundType>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('roboto_rumble_background')
      if (saved && BACKGROUND_OPTIONS.some(opt => opt.value === saved)) {
        return saved as BackgroundType
      }
    }
    const options = BACKGROUND_OPTIONS.filter(opt => opt.value !== 'none')
    return options[Math.floor(Math.random() * options.length)].value
  })

  useEffect(() => {
    // Check localStorage on mount in case it was set before this component mounted
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('roboto_rumble_background')
      if (saved && BACKGROUND_OPTIONS.some(opt => opt.value === saved)) {
        setBackground(saved as BackgroundType)
      }
    }

    const handleBackgroundChange = (event: CustomEvent) => {
      setBackground(event.detail as BackgroundType)
    }

    window.addEventListener('backgroundChange', handleBackgroundChange as EventListener)
    return () => window.removeEventListener('backgroundChange', handleBackgroundChange as EventListener)
  }, [])

  return background
}