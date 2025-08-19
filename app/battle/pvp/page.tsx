'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAccount } from 'wagmi'
import { Client, Room } from 'colyseus.js'
import { Button } from '../../../components/ui/button'
import { Card } from '../../../components/ui/card'
import { GameHeader } from '../../../components/shared/GameHeader'
import { PageLayout } from '../../../components/shared/PageLayout'
import { Users, Swords, Clock, Search, Shield } from 'lucide-react'
import { gameSounds } from '../../../lib/sounds/gameSounds'

export default function PvPLobby() {
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const [client, setClient] = useState<Client | null>(null)
  const [room, setRoom] = useState<Room | null>(null)
  const [status, setStatus] = useState<'idle' | 'searching' | 'joining' | 'connected'>('idle')
  const [onlineCount, setOnlineCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  
  // Load battle settings
  const [settings, setSettings] = useState({ teamSize: 5, speed: 'speedy' })
  
  useEffect(() => {
    const savedSettings = localStorage.getItem('battle_settings')
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings))
    }
    
    // Initialize Colyseus client
    // Use localhost for development, will need to update for production
    const wsUrl = process.env.NEXT_PUBLIC_COLYSEUS_URL || 'ws://localhost:2567'
    const colyseusClient = new Client(wsUrl)
    setClient(colyseusClient)
    
    // Cleanup on unmount
    return () => {
      if (room) {
        room.leave()
      }
    }
  }, [])
  
  const findMatch = async () => {
    if (!client || !isConnected || !address) {
      setError('Please connect your wallet first')
      return
    }
    
    // Check if team exists
    const teamKey = `roboto_rumble_team_${settings.teamSize}`
    const savedTeam = localStorage.getItem(teamKey)
    
    if (!savedTeam || savedTeam === '[]') {
      gameSounds.play('cancel')
      setError('Please build your team first!')
      setTimeout(() => {
        router.push('/team-builder')
      }, 1500)
      return
    }
    
    try {
      setStatus('searching')
      setError(null)
      gameSounds.play('menuNavigate')
      
      // Try to join existing room or create new one
      const availableRooms = await client.getAvailableRooms("pvp_battle")
      
      let joinedRoom: Room | null = null
      
      // Try to join a room with matching settings
      const matchingRoom = availableRooms.find(room => 
        room.metadata?.teamSize === settings.teamSize &&
        room.metadata?.speed === settings.speed &&
        room.clients < 2
      )
      
      if (matchingRoom) {
        setStatus('joining')
        joinedRoom = await client.joinById(matchingRoom.roomId, {
          address: address,
          name: `Player ${address.slice(0, 6)}`,
          team: JSON.parse(savedTeam),
          teamSize: settings.teamSize,
          speed: settings.speed
        })
      } else {
        // Create new room
        setStatus('joining')
        joinedRoom = await client.create("pvp_battle", {
          address: address,
          name: `Player ${address.slice(0, 6)}`,
          team: JSON.parse(savedTeam),
          teamSize: settings.teamSize,
          speed: settings.speed
        })
      }
      
      setRoom(joinedRoom)
      setStatus('connected')
      
      // Set up room event listeners
      joinedRoom.onMessage("match-ready", (message) => {
        gameSounds.play('menuAccept')
        console.log("Match ready!", message)
        
        // Navigate to battle arena with room ID
        setTimeout(() => {
          router.push(`/battle/pvp/${joinedRoom.id}`)
        }, 1000)
      })
      
      joinedRoom.onMessage("error", (message) => {
        setError(message.message)
        gameSounds.play('cancel')
      })
      
      joinedRoom.onLeave(() => {
        setStatus('idle')
        setRoom(null)
      })
      
      // Send ready signal
      joinedRoom.send("ready")
      
    } catch (err) {
      console.error("Failed to join room:", err)
      setError('Failed to connect to battle server')
      setStatus('idle')
      gameSounds.play('cancel')
    }
  }
  
  const cancelSearch = () => {
    if (room) {
      room.leave()
      setRoom(null)
    }
    setStatus('idle')
    gameSounds.play('cancel')
  }
  
  return (
    <PageLayout>
      <GameHeader
        title="PvP LOBBY"
        showBackButton
        backHref="/battle"
      />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          
          {/* Connection Status */}
          <div className="mb-6 text-center">
            <div className="flex items-center justify-center gap-2 text-green-400">
              <div className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}`} />
              <span className="text-sm uppercase tracking-wider">
                {status === 'idle' && 'Ready for Battle'}
                {status === 'searching' && 'Searching for Opponent...'}
                {status === 'joining' && 'Joining Battle...'}
                {status === 'connected' && 'Connected - Waiting for Opponent'}
              </span>
            </div>
          </div>
          
          {/* Main Action Area */}
          <Card className="bg-black/80 border-2 border-green-500 p-8 mb-6">
            <div className="text-center space-y-6">
              {status === 'idle' && (
                <>
                  <h2 className="text-2xl text-green-400 mb-4">READY FOR COMBAT?</h2>
                  
                  <div className="flex justify-center gap-4 mb-6">
                    <div className="text-sm">
                      <span className="text-gray-400">Team Size: </span>
                      <span className="text-green-400">{settings.teamSize}v{settings.teamSize}</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-400">Speed: </span>
                      <span className="text-green-400 uppercase">{settings.speed}</span>
                    </div>
                  </div>
                  
                  <Button
                    variant="terminal"
                    size="lg"
                    onClick={findMatch}
                    className="text-xl py-6 px-12"
                    disabled={!isConnected}
                  >
                    <Search className="w-6 h-6 mr-3" />
                    FIND MATCH
                  </Button>
                  
                  {!isConnected && (
                    <p className="text-yellow-500 text-sm mt-4">
                      Connect your wallet to start matchmaking
                    </p>
                  )}
                </>
              )}
              
              {(status === 'searching' || status === 'joining' || status === 'connected') && (
                <div className="space-y-6">
                  <div className="flex justify-center">
                    <div className="relative">
                      <Swords className="w-24 h-24 text-green-400 animate-pulse" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-32 h-32 border-4 border-green-400/30 rounded-full animate-spin" />
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-xl text-green-400 mb-2">
                      {status === 'connected' ? 'WAITING FOR OPPONENT' : 'SEARCHING FOR OPPONENT'}
                    </h3>
                    <p className="text-gray-400 text-sm">
                      Matching you with a pilot of similar skill...
                    </p>
                  </div>
                  
                  <Button
                    variant="outline"
                    onClick={cancelSearch}
                    className="text-red-400 border-red-400 hover:bg-red-400/10"
                  >
                    CANCEL SEARCH
                  </Button>
                </div>
              )}
              
              {error && (
                <div className="bg-red-500/10 border border-red-500 rounded p-4 mt-4">
                  <p className="text-red-400">{error}</p>
                </div>
              )}
            </div>
          </Card>
          
          {/* Info Cards */}
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="bg-black/60 border border-green-500/30 p-4">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-green-400" />
                <div>
                  <p className="text-xs text-gray-400">ONLINE NOW</p>
                  <p className="text-lg text-green-400">
                    {onlineCount > 0 ? onlineCount : '---'}
                  </p>
                </div>
              </div>
            </Card>
            
            <Card className="bg-black/60 border border-green-500/30 p-4">
              <div className="flex items-center gap-3">
                <Clock className="w-8 h-8 text-green-400" />
                <div>
                  <p className="text-xs text-gray-400">AVG WAIT TIME</p>
                  <p className="text-lg text-green-400">~30s</p>
                </div>
              </div>
            </Card>
            
            <Card className="bg-black/60 border border-green-500/30 p-4">
              <div className="flex items-center gap-3">
                <Shield className="w-8 h-8 text-green-400" />
                <div>
                  <p className="text-xs text-gray-400">MODE</p>
                  <p className="text-lg text-green-400">RANKED</p>
                </div>
              </div>
            </Card>
          </div>
          
          {/* Beta Notice */}
          <div className="mt-8 text-center p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <p className="text-yellow-500 text-sm">
              🚧 PvP MODE IS IN BETA - Report bugs in Discord
            </p>
          </div>
        </div>
      </div>
    </PageLayout>
  )
}