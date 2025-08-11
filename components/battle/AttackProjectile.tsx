'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../../lib/utils'

interface AttackProjectileProps {
  active: boolean
  type: 'energy' | 'glitch' | 'metal' | 'electric' | 'fire' | 'plasma' | 'void' | 'laser'
  from: { x: number; y: number }
  to: { x: number; y: number }
  onImpact?: () => void
}

export default function AttackProjectile({
  active,
  type,
  from,
  to,
  onImpact
}: AttackProjectileProps) {
  const [hasImpacted, setHasImpacted] = useState(false)

  useEffect(() => {
    if (active) {
      setHasImpacted(false)
      // Trigger impact callback after projectile travel time
      const timer = setTimeout(() => {
        setHasImpacted(true)
        onImpact?.()
      }, 500) // 500ms travel time

      return () => clearTimeout(timer)
    }
  }, [active, onImpact])

  if (!active || hasImpacted) return null

  // Calculate angle for projectile rotation
  const angle = Math.atan2(to.y - from.y, to.x - from.x) * (180 / Math.PI)

  // Get projectile appearance based on type
  const getProjectileStyle = () => {
    switch (type) {
      case 'energy':
        return {
          element: (
            <div className="relative">
              <div className="w-12 h-12 bg-cyan-400 rounded-full animate-pulse blur-sm" />
              <div className="absolute inset-2 bg-white rounded-full" />
            </div>
          ),
          trail: 'bg-gradient-to-r from-cyan-400/0 to-cyan-400',
          glow: 'shadow-[0_0_30px_rgba(34,211,238,0.8)]'
        }
      
      case 'glitch':
        return {
          element: (
            <div className="relative">
              <div className="w-10 h-10 bg-purple-500 animate-pulse" 
                style={{ 
                  clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
                  animation: 'glitch 0.2s infinite'
                }} 
              />
              <div className="absolute inset-0 bg-purple-300 opacity-50" 
                style={{ 
                  clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
                  transform: 'scale(1.2) rotate(45deg)'
                }} 
              />
            </div>
          ),
          trail: 'bg-gradient-to-r from-purple-500/0 via-pink-500/50 to-purple-500',
          glow: 'shadow-[0_0_30px_rgba(168,85,247,0.8)]'
        }

      case 'metal':
        return {
          element: (
            <div className="relative">
              <div className="w-8 h-8 bg-gray-400 rounded-sm rotate-45 border-2 border-gray-600" />
              <div className="absolute inset-1 bg-gray-300 rounded-sm" />
            </div>
          ),
          trail: 'bg-gradient-to-r from-gray-400/0 to-gray-400',
          glow: 'shadow-[0_0_20px_rgba(156,163,175,0.6)]'
        }

      case 'electric':
        return {
          element: (
            <div className="relative">
              <div className="w-10 h-2 bg-yellow-400 animate-pulse" />
              <div className="absolute top-0 w-10 h-2 bg-yellow-300 blur-sm animate-ping" />
              <div className="absolute -top-1 -bottom-1 w-10 bg-yellow-200/50" 
                style={{ filter: 'blur(4px)' }}
              />
            </div>
          ),
          trail: 'bg-gradient-to-r from-yellow-400/0 via-yellow-300 to-yellow-400',
          glow: 'shadow-[0_0_40px_rgba(250,204,21,0.9)]'
        }

      case 'fire':
        return {
          element: (
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-400 rounded-full animate-pulse" />
              <div className="absolute inset-2 bg-gradient-to-br from-yellow-400 to-red-400 rounded-full animate-ping" />
            </div>
          ),
          trail: 'bg-gradient-to-r from-orange-500/0 via-red-500 to-orange-500',
          glow: 'shadow-[0_0_40px_rgba(239,68,68,0.8)]'
        }

      case 'plasma':
        return {
          element: (
            <div className="relative">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-purple-600 rounded-full animate-spin" />
              <div className="absolute inset-3 bg-white rounded-full animate-pulse" />
            </div>
          ),
          trail: 'bg-gradient-to-r from-blue-400/0 via-purple-500 to-blue-400',
          glow: 'shadow-[0_0_50px_rgba(147,51,234,0.9)]'
        }

      case 'void':
        return {
          element: (
            <div className="relative">
              <div className="w-10 h-10 bg-black rounded-full border-2 border-purple-900" />
              <div className="absolute inset-0 bg-purple-900/50 rounded-full animate-ping" />
            </div>
          ),
          trail: 'bg-gradient-to-r from-black/0 to-purple-900',
          glow: 'shadow-[0_0_30px_rgba(88,28,135,0.8)]'
        }

      case 'laser':
      default:
        return {
          element: (
            <div className="relative">
              <div className="w-20 h-1 bg-red-500" />
              <div className="absolute top-0 w-20 h-1 bg-red-400 blur-sm animate-pulse" />
            </div>
          ),
          trail: 'bg-gradient-to-r from-red-500/0 to-red-500',
          glow: 'shadow-[0_0_30px_rgba(239,68,68,1)]'
        }
    }
  }

  const projectileStyle = getProjectileStyle()

  return (
    <AnimatePresence>
      {active && !hasImpacted && (
        <>
          {/* Projectile trail */}
          <motion.div
            initial={{ 
              left: from.x,
              top: from.y,
              width: 0,
              opacity: 0
            }}
            animate={{ 
              left: from.x,
              top: from.y,
              width: Math.sqrt(Math.pow(to.x - from.x, 2) + Math.pow(to.y - from.y, 2)),
              opacity: [0, 1, 1, 0]
            }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className={cn(
              "fixed h-2 pointer-events-none z-40",
              projectileStyle.trail
            )}
            style={{
              transform: `translate(-50%, -50%) rotate(${angle}deg)`,
              transformOrigin: '0 50%'
            }}
          />

          {/* Main projectile */}
          <motion.div
            initial={{ 
              left: from.x,
              top: from.y,
              scale: 0,
              opacity: 0
            }}
            animate={{ 
              left: to.x,
              top: to.y,
              scale: [0, 1.2, 1],
              opacity: [0, 1, 1]
            }}
            transition={{ 
              duration: 0.5,
              ease: "easeOut",
              scale: { duration: 0.3 }
            }}
            className={cn(
              "fixed pointer-events-none z-50",
              projectileStyle.glow
            )}
            style={{
              transform: `translate(-50%, -50%) rotate(${angle}deg)`
            }}
          >
            {projectileStyle.element}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// Add glitch animation keyframes to global styles
const glitchStyles = `
@keyframes glitch {
  0% { transform: translate(0); }
  20% { transform: translate(-1px, 1px); }
  40% { transform: translate(-1px, -1px); }
  60% { transform: translate(1px, 1px); }
  80% { transform: translate(1px, -1px); }
  100% { transform: translate(0); }
}
`

if (typeof document !== 'undefined') {
  const style = document.createElement('style')
  style.textContent = glitchStyles
  document.head.appendChild(style)
}