'use client'

import { useState, useEffect } from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import { Button } from '../ui/button'
import { gameSounds } from '../../lib/sounds/gameSounds'

export function SoundToggle() {
  const [isEnabled, setIsEnabled] = useState(true)
  
  useEffect(() => {
    // Get initial state from sound system
    setIsEnabled(gameSounds.getEnabled())
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
  
  return (
    <Button
      variant="terminal"
      size="icon"
      onClick={toggleSound}
      title={isEnabled ? 'Mute sounds' : 'Enable sounds'}
    >
      {isEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
    </Button>
  )
}