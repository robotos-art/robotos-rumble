'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Bot, UserCircle, Users, Clock, Settings } from 'lucide-react'
import { gameSounds } from '../../lib/sounds/gameSounds'
import { GameHeader } from '../../components/shared/GameHeader'
import { PageLayout } from '../../components/shared/PageLayout'

export interface BattleSettings {
  teamSize: 3 | 5
  speed: 'calm' | 'speedy'
}

export default function BattleSelect() {
  const router = useRouter()
  const [settings, setSettings] = useState<BattleSettings>({
    teamSize: 5,
    speed: 'speedy'
  })
  
  // Load saved settings on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('battle_settings')
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings))
      } catch (e) {
        // Use defaults if parsing fails
      }
    }
  }, [])
  
  const updateSetting = <K extends keyof BattleSettings>(
    key: K,
    value: BattleSettings[K]
  ) => {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)
    localStorage.setItem('battle_settings', JSON.stringify(newSettings))
    gameSounds.play('menuNavigate')
  }
  
  const handleModeSelect = (mode: 'computer' | 'player') => {
    if (mode === 'player') {
      // Player vs Player coming soon
      gameSounds.play('cancel')
      return
    }
    
    gameSounds.playConfirm()
    
    // Save settings before navigating
    localStorage.setItem('battle_settings', JSON.stringify(settings))
    
    // Always go to team builder for computer mode
    // Team builder will handle existing teams
    setTimeout(() => {
      router.push('/team-builder')
    }, 200)
  }
  
  return (
    <PageLayout showGrid>
      <GameHeader 
        title="BATTLE MODE"
        showBackButton
        backHref="/"
        showBackgroundSelector
      />
      
      <div className="mt-8">
        {/* Battle Settings */}
        <div className="max-w-5xl mx-auto mb-8">
          <Card className="bg-black/80 border-2 border-green-500/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Settings className="w-5 h-5" />
                BATTLE SETTINGS
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                {/* Team Size Setting */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="w-4 h-4 text-green-400" />
                    <span className="text-sm font-bold text-green-400">TEAM SIZE</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant={settings.teamSize === 3 ? "default" : "outline"}
                      className={`flex-1 ${settings.teamSize === 3 ? 'bg-green-600 hover:bg-green-700' : ''}`}
                      onClick={() => updateSetting('teamSize', 3)}
                      onMouseEnter={() => gameSounds.playHover()}
                    >
                      3v3
                    </Button>
                    <Button
                      variant={settings.teamSize === 5 ? "default" : "outline"}
                      className={`flex-1 ${settings.teamSize === 5 ? 'bg-green-600 hover:bg-green-700' : ''}`}
                      onClick={() => updateSetting('teamSize', 5)}
                      onMouseEnter={() => gameSounds.playHover()}
                    >
                      5v5
                    </Button>
                  </div>
                  <p className="text-xs text-green-400/60 mt-2">
                    {settings.teamSize === 3 ? 'Faster battles, perfect for quick matches' : 'Classic battles with full strategic depth'}
                  </p>
                </div>
                
                {/* Timer Speed Setting */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="w-4 h-4 text-green-400" />
                    <span className="text-sm font-bold text-green-400">TIMER SPEED</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant={settings.speed === 'calm' ? "default" : "outline"}
                      className={`flex-1 ${settings.speed === 'calm' ? 'bg-green-600 hover:bg-green-700' : ''}`}
                      onClick={() => updateSetting('speed', 'calm')}
                      onMouseEnter={() => gameSounds.playHover()}
                    >
                      CALM
                    </Button>
                    <Button
                      variant={settings.speed === 'speedy' ? "default" : "outline"}
                      className={`flex-1 ${settings.speed === 'speedy' ? 'bg-green-600 hover:bg-green-700' : ''}`}
                      onClick={() => updateSetting('speed', 'speedy')}
                      onMouseEnter={() => gameSounds.playHover()}
                    >
                      SPEEDY
                    </Button>
                  </div>
                  <p className="text-xs text-green-400/60 mt-2">
                    {settings.speed === 'calm' ? '10 seconds to make decisions' : '5 seconds to make decisions'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Battle Mode Selection - Taller cards */}
        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          <Card 
            className="bg-black/80 border-2 border-green-500/50 hover:border-green-500 transition-all cursor-pointer"
            onClick={() => handleModeSelect('computer')}
            onMouseEnter={() => gameSounds.playHover()}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-2xl">
                <Bot className="w-6 h-6" />
                VS COMPUTER
              </CardTitle>
              <CardDescription className="text-green-400">
                Battle against AI-controlled opponents
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="text-sm text-green-400/80 space-y-2">
                <li>• Practice your strategies</li>
                <li>• Test different team compositions</li>
                <li>• Learn element advantages</li>
                <li>• No entry fees</li>
              </ul>
              <div className="pt-4">
                <Button className="w-full terminal-button">
                  PLAY
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <Card 
            className="bg-black/80 border-2 border-green-500/50 rounded-lg opacity-50 cursor-not-allowed"
            onMouseEnter={() => gameSounds.playHover()}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-2xl">
                <UserCircle className="w-6 h-6" />
                VS PLAYER
              </CardTitle>
              <CardDescription className="text-green-400">
                Challenge other Roboto holders
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="text-sm text-green-400/80 space-y-2">
                <li>• Real-time PvP battles</li>
                <li>• Climb the leaderboard</li>
                <li>• Win rewards and glory</li>
                <li>• Stake entry fees</li>
              </ul>
              <div className="pt-4">
                <Button className="w-full terminal-button" disabled>
                  SOON
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Instructions */}
        <div className="mt-8 text-center text-green-400/60 text-sm">
          <p>BATTLE PROTOCOL: SELECT YOUR OPPONENT TYPE</p>
          <p>SQUAD SIZE: {settings.teamSize} UNITS REQUIRED</p>
        </div>
      </div>
    </PageLayout>
  )
}