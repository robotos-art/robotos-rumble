'use client'

import { useRouter } from 'next/navigation'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Bot, UserCircle } from 'lucide-react'
import { gameSounds } from '../../lib/sounds/gameSounds'
import { GameHeader } from '../../components/shared/GameHeader'
import { PageLayout } from '../../components/shared/PageLayout'

export default function BattleSelect() {
  const router = useRouter()
  
  const handleModeSelect = (mode: 'computer' | 'player') => {
    if (mode === 'player') {
      // Player vs Player coming soon
      gameSounds.play('cancel')
      return
    }
    
    gameSounds.playConfirm()
    
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
          <p>REMEMBER: A FULL SQUAD OF 5 UNITS IS REQUIRED</p>
        </div>
      </div>
    </PageLayout>
  )
}