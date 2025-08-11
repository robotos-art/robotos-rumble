'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { cn } from '../../lib/utils'
import { BattleUnitV3 } from '../../lib/game-engine/TraitProcessorV3'

interface RobotoUnitProps {
  unit: BattleUnitV3
  isActive?: boolean
  isTarget?: boolean
  isSelected?: boolean
  isAlive?: boolean
  isEnemy?: boolean
  isBeingAttacked?: boolean
  onClick?: () => void
  delay?: number
  currentHp?: number
  maxHp?: number
}

const ELEMENT_COLORS = {
  SURGE: 'text-yellow-400 border-yellow-400',
  CODE: 'text-cyan-400 border-cyan-400',
  METAL: 'text-gray-400 border-gray-400',
  GLITCH: 'text-purple-400 border-purple-400'
}

export default function RobotoUnit({
  unit,
  isActive = false,
  isTarget = false,
  isSelected = false,
  isAlive = true,
  isEnemy = false,
  isBeingAttacked = false,
  onClick,
  delay = 0,
  currentHp,
  maxHp
}: RobotoUnitProps) {
  const elementColor = ELEMENT_COLORS[unit.element as keyof typeof ELEMENT_COLORS] || 'text-green-400 border-green-400'
  
  // Shake animation for when unit is attacked
  const shakeAnimation = isBeingAttacked ? {
    x: [0, -10, 10, -10, 10, 0],
    transition: {
      duration: 0.5,
      times: [0, 0.1, 0.3, 0.5, 0.7, 1]
    }
  } : {}

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ 
        scale: isActive ? 1.1 : 1, 
        opacity: isAlive ? 1 : 0.3,
        ...shakeAnimation
      }}
      transition={{ 
        delay,
        duration: 0.3,
        scale: { type: "spring", stiffness: 200 }
      }}
      whileHover={isTarget ? { scale: 1.05 } : {}}
      className={cn(
        "relative cursor-pointer transition-all",
        isTarget && "cursor-pointer",
        !isTarget && !isActive && "cursor-default",
        isSelected && "z-20",
        isActive && "z-10"
      )}
      onClick={onClick}
    >
      {/* Selection Indicator - Dashed border without scaling */}
      {isSelected && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 1 }}
            className="absolute -inset-2 border-4 border-dashed border-red-500 rounded-lg z-20"
          />
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ repeat: Infinity, duration: 1 }}
            className="absolute -top-6 left-1/2 -translate-x-1/2 text-red-500 text-lg z-20"
          >
            ▼
          </motion.div>
        </>
      )}
      
      {/* Active Unit Glow - Smaller inset to avoid overlap */}
      {isActive && (
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="absolute -inset-2 bg-yellow-400/20 rounded-lg blur-xl"
        />
      )}
      
      {/* Valid Target Indicator */}
      {isTarget && !isSelected && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="absolute -inset-2 border border-green-400 rounded-lg"
        />
      )}
      
      {/* Unit Container */}
      <div className={cn(
        "relative bg-black/50 backdrop-blur border rounded-lg p-2 transition-all",
        isActive && "border-yellow-400 border-2",
        !isActive && "border-green-800/50"
      )}>
        {/* Roboto Image */}
        <div className={cn(
          "roboto-image-container relative w-16 h-16 sm:w-20 sm:h-20 md:w-28 md:h-28 lg:w-32 lg:h-32 xl:w-36 xl:h-36 2xl:w-44 2xl:h-44 3xl:w-52 3xl:h-52 4xl:w-60 4xl:h-60 bg-black rounded-lg overflow-hidden flex items-center justify-center",
          isEnemy && "transform scale-x-[-1]"
        )}>
          {unit.imageUrl && unit.imageUrl.includes('http') ? (
            <Image
              src={unit.imageUrl}
              alt={unit.name || 'Roboto'}
              fill
              className="object-contain"
              sizes="(max-width: 640px) 64px, (max-width: 768px) 80px, (max-width: 1024px) 112px, (max-width: 1280px) 128px, (max-width: 1536px) 176px, (max-width: 1920px) 208px, 240px"
              unoptimized
            />
          ) : (
            <div className="text-green-400 text-4xl font-bold">
              {unit.name ? unit.name.charAt(0) : '?'}
            </div>
          )}
        </div>
        
        {/* HP Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-2 bg-black/80 rounded-b-xl">
          <motion.div
            initial={{ width: '100%' }}
            animate={{ 
              width: `${currentHp && maxHp ? (currentHp / maxHp) * 100 : 100}%` 
            }}
            transition={{ duration: 0.5 }}
            className={cn(
              "h-full transition-all rounded-b-xl",
              currentHp && maxHp && currentHp > maxHp * 0.5 ? "bg-green-400" :
              currentHp && maxHp && currentHp > maxHp * 0.25 ? "bg-yellow-400" :
              "bg-red-400"
            )}
          />
        </div>
        
      </div>
      
      {/* Name & Element - Outside container to avoid overlap */}
      <div className="absolute -bottom-12 left-0 right-0 text-center space-y-1 pointer-events-none">
        <p className="text-xs text-white truncate">{unit.name || 'Unknown'}</p>
        <p className={cn("text-xs font-bold", elementColor)}>
          {unit.element || 'NEUTRAL'}
        </p>
      </div>
      
      {/* Idle Animation */}
      <motion.div
        animate={{ y: [0, -5, 0] }}
        transition={{ 
          repeat: Infinity, 
          duration: 2 + delay,
          ease: "easeInOut"
        }}
        className="absolute inset-0"
      />
    </motion.div>
  )
}