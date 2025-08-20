'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAccount } from 'wagmi'
import { Client, Room } from 'colyseus.js'
import { Button } from '../../../components/ui/button'
import { Card } from '../../../components/ui/card'
import { GameHeader } from '../../../components/shared/GameHeader'
import { PageLayout } from '../../../components/shared/PageLayout'
import { Users, Swords, Clock, Search, Shield, Bell } from 'lucide-react'
import { gameSounds } from '../../../lib/sounds/gameSounds'
import { BattleNotifications } from '../../../lib/notifications/battleNotifications'

export default function PvPLobby() {
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const [client, setClient] = useState<Client | null>(null)
  const [room, setRoom] = useState<Room | null>(null)
  const [lobbyRoom, setLobbyRoom] = useState<Room | null>(null)
  const [status, setStatus] = useState<'idle' | 'searching' | 'joining' | 'connected'>('idle')
  const [onlineCount, setOnlineCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [mounted, setMounted] = useState(false)
  
  // Load battle settings
  const [settings, setSettings] = useState({ teamSize: 5, speed: 'speedy' })
  
  useEffect(() => {
    setMounted(true)
    const savedSettings = localStorage.getItem('battle_settings')
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings))
    }
    
    // Initialize Colyseus client
    // Use localhost for development, will need to update for production
    const wsUrl = process.env.NEXT_PUBLIC_COLYSEUS_URL || 'ws://localhost:2567'
    console.log('Connecting to Colyseus server at:', wsUrl)
    const colyseusClient = new Client(wsUrl)
    setClient(colyseusClient)
    
    // Check notification permission status
    setNotificationsEnabled(BattleNotifications.isEnabled())
    
    // Request notification permission if not already asked
    const checkNotifications = async () => {
      const notifSetting = localStorage.getItem('pvp_notifications_asked')
      if (!notifSetting && isConnected) {
        // Wait a second before asking for permissions
        setTimeout(() => {
          requestNotificationPermission()
        }, 1000)
      }
    }
    checkNotifications()
    
    // Join lobby room to track waiting players
    const joinLobby = async () => {
      if (!colyseusClient || !isConnected) return
      
      try {
        const lobby = await colyseusClient.joinOrCreate("lobby")
        setLobbyRoom(lobby)
        
        // Listen for lobby updates
        lobby.onStateChange((state) => {
          setOnlineCount(state.totalOnline || 0)
        })
        
        // Listen for players looking for matches
        lobby.onMessage("player-looking", (data) => {
          // Show notification if we're not searching and settings match
          if (status === 'idle' && data.teamSize === settings.teamSize && data.speed === settings.speed) {
            BattleNotifications.showPlayerWaiting(data)
          }
        })
        
        // Listen for existing waiting players
        lobby.onMessage("players-waiting", (players) => {
          // Check if any match our settings
          const matching = players.find((p: any) => 
            p.teamSize === settings.teamSize && p.speed === settings.speed
          )
          if (matching && status === 'idle') {
            BattleNotifications.showPlayerWaiting({ teamSize: matching.teamSize, speed: matching.speed })
          }
        })
      } catch (err) {
        console.error("Failed to join lobby:", err)
      }
    }
    
    if (isConnected) {
      joinLobby()
    }
    
    // Cleanup on unmount
    return () => {
      if (room) {
        room.leave()
      }
      if (lobbyRoom) {
        lobbyRoom.leave()
      }
    }
  }, [isConnected])
  
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
      
      console.log('Attempting to join/create room with settings:', {
        teamSize: settings.teamSize,
        speed: settings.speed,
        address: address
      })
      
      // Try to join or create a room
      let joinedRoom: Room | null = null
      
      setStatus('joining')
      
      // Notify lobby that we're looking for a match
      if (lobbyRoom) {
        lobbyRoom.send("start-waiting", {
          address: address,
          name: `Player ${address.slice(0, 6)}`,
          teamSize: settings.teamSize,
          speed: settings.speed
        })
      }
      
      // Use joinOrCreate which will automatically handle room creation
      try {
        joinedRoom = await client.joinOrCreate("pvp_battle", {
          address: address,
          name: `Player ${address.slice(0, 6)}`,
          team: JSON.parse(savedTeam),
          teamSize: settings.teamSize,
          speed: settings.speed
        })
      } catch (joinError) {
        console.error("Failed to join/create room:", joinError)
        throw joinError
      }
      
      console.log('Successfully joined room:', joinedRoom.roomId)
      
      setRoom(joinedRoom)
      setStatus('connected')
      
      // Notify lobby that we're now in a match
      if (lobbyRoom) {
        lobbyRoom.send("stop-waiting")
      }
      
      // Set up room event listeners
      joinedRoom.onMessage("match-ready", (message) => {
        gameSounds.play('menuAccept')
        console.log("Match ready!", message)
        
        // Show notification if tab is not visible
        if (document.visibilityState !== 'visible') {
          BattleNotifications.showMatchFound()
        }
        
        // Navigate to battle arena with room ID
        // Use joinedRoom.roomId (not .id)
        setTimeout(() => {
          if (joinedRoom?.roomId) {
            router.push(`/battle/pvp/${joinedRoom.roomId}`)
          } else {
            console.error('Room ID is undefined!', { room: joinedRoom, roomId: joinedRoom?.roomId })
          }
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
      
    } catch (err: any) {
      console.error("Failed to join room:", err)
      const errorMessage = err.message || 'Failed to connect to battle server'
      setError(`Connection error: ${errorMessage}`)
      setStatus('idle')
      gameSounds.play('cancel')
    }
  }
  
  const cancelSearch = () => {
    if (room) {
      room.leave()
      setRoom(null)
    }
    // Notify lobby we stopped waiting
    if (lobbyRoom) {
      lobbyRoom.send("stop-waiting")
    }
    setStatus('idle')
    gameSounds.play('cancel')
  }
  
  const requestNotificationPermission = async () => {
    const granted = await BattleNotifications.requestPermission()
    setNotificationsEnabled(granted)
    localStorage.setItem('pvp_notifications_asked', 'true')
    
    if (granted) {
      gameSounds.play('menuAccept')
    }
  }
  
  // Don't render until mounted to avoid hydration issues
  if (!mounted) {
    return (
      <PageLayout>
        <GameHeader
          title="PvP LOBBY"
          showBackButton
          backHref="/battle"
        />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center py-20">
              <p className="text-green-400">Initializing PvP Arena...</p>
            </div>
          </div>
        </div>
      </PageLayout>
    )
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
          
          {/* Notification Permission Banner */}
          {!notificationsEnabled && isConnected && (
            <Card className="bg-yellow-500/10 border-yellow-500/50 p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-yellow-500" />
                  <div>
                    <p className="text-yellow-500 font-bold">Enable Battle Notifications</p>
                    <p className="text-xs text-yellow-500/80">
                      Get notified when players are looking for matches, even when you're not on this tab!
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={requestNotificationPermission}
                  className="text-yellow-500 border-yellow-500 hover:bg-yellow-500/10"
                >
                  Enable Notifications
                </Button>
              </div>
            </Card>
          )}
          
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
                  
                  {mounted && (
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
                  )}
                  
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
                      Looking for another Roboto holder to battle...
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
                  <p className="text-xs text-gray-400">BATTLE TIMER</p>
                  <p className="text-lg text-green-400">{mounted ? (settings.speed === 'speedy' ? '5s' : '10s') : '---'}</p>
                </div>
              </div>
            </Card>
            
            <Card className="bg-black/60 border border-green-500/30 p-4">
              <div className="flex items-center gap-3">
                <Shield className="w-8 h-8 text-green-400" />
                <div>
                  <p className="text-xs text-gray-400">MODE</p>
                  <p className="text-lg text-green-400">CASUAL</p>
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