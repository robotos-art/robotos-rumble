'use client'

import { useState, useEffect } from 'react'
import { Volume2, VolumeX, Volume1, Volume } from 'lucide-react'
import { Button } from '../ui/button'
import { Slider } from '../ui/slider'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import { gameSounds } from '../../lib/sounds/gameSounds'

export function SoundToggle() {
  const [isEnabled, setIsEnabled] = useState(true)
  const [volume, setVolume] = useState(50)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    // Get initial state from sound system
    setIsEnabled(gameSounds.getEnabled())
    setVolume(Math.round(gameSounds.getVolume() * 100))
  }, [])

  const toggleSound = () => {
    const newState = !isEnabled
    setIsEnabled(newState)
    gameSounds.setEnabled(newState)

    // Play a click sound on enable
    if (newState) {
      setTimeout(() => gameSounds.playClick(), 100)
    }
  }

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0]
    setVolume(newVolume)
    gameSounds.setVolume(newVolume / 100)

    // If volume is 0, disable sound
    if (newVolume === 0) {
      setIsEnabled(false)
      gameSounds.setEnabled(false)
    } else if (!isEnabled) {
      // If sound was disabled and volume > 0, enable it
      setIsEnabled(true)
      gameSounds.setEnabled(true)
    }

    // Play a test sound when adjusting volume (not at 0)
    if (newVolume > 0) {
      gameSounds.playClick()
    }
  }

  const getVolumeIcon = () => {
    const iconClass = "w-4 h-4 text-green-500/60 group-hover:text-green-400 transition-colors"
    if (!isEnabled || volume === 0) return <VolumeX className={iconClass} />
    if (volume < 30) return <Volume className={iconClass} />
    if (volume < 70) return <Volume1 className={iconClass} />
    return <Volume2 className={iconClass} />
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="terminal"
          size="icon"
          className="group h-9 w-9 md:h-10 md:w-10"
          onClick={(e) => {
            // If clicking when popover is closed, just toggle mute
            if (!isOpen) {
              e.preventDefault()
              toggleSound()
            }
          }}
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
          title={isEnabled ? 'Mute sounds' : 'Enable sounds'}
        >
          {getVolumeIcon()}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-48 bg-black/90 border-green-500/50 text-green-500"
        align="end"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
      >
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase">Volume</span>
            <span className="text-xs font-mono">{volume}%</span>
          </div>
          <Slider
            value={[volume]}
            onValueChange={handleVolumeChange}
            max={100}
            step={5}
            className="w-full"
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}