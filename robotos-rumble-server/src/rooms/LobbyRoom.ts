import { Room, Client } from "@colyseus/core"
import { Schema, type, MapSchema } from "@colyseus/schema"

class WaitingPlayer extends Schema {
  @type("string") id: string = ""
  @type("string") address: string = ""
  @type("string") name: string = ""
  @type("number") teamSize: number = 5
  @type("string") speed: string = "speedy"
  @type("number") joinedAt: number = Date.now()
}

class LobbyState extends Schema {
  @type({ map: WaitingPlayer }) waitingPlayers = new MapSchema<WaitingPlayer>()
  @type("number") totalOnline: number = 0
}

export class LobbyRoom extends Room<LobbyState> {
  onCreate() {
    this.setState(new LobbyState())
    
    // Clean up old waiting players every minute
    this.setSimulationInterval(() => {
      const now = Date.now()
      const timeout = 5 * 60 * 1000 // 5 minutes
      
      this.state.waitingPlayers.forEach((player, key) => {
        if (now - player.joinedAt > timeout) {
          this.state.waitingPlayers.delete(key)
          console.log(`Removed inactive player from lobby: ${key}`)
        }
      })
      
      // Update total online count
      this.state.totalOnline = this.clients.length
    }, 60000) // Every minute
    
    // Register message handlers
    this.onMessage("start-waiting", (client, message) => {
      // Add player to waiting list
      const player = new WaitingPlayer()
      player.id = client.sessionId
      player.address = message.address || "0x0000"
      player.name = message.name || `Player ${client.sessionId.slice(0, 6)}`
      player.teamSize = message.teamSize || 5
      player.speed = message.speed || "speedy"
      player.joinedAt = Date.now()
      
      this.state.waitingPlayers.set(client.sessionId, player)
      
      // Notify all other clients that someone is waiting
      // Send to everyone so they can see mismatched players too
      this.broadcast("player-looking", {
        id: player.id,
        teamSize: player.teamSize,
        speed: player.speed,
        name: player.name
      }, { except: client })
      
      console.log(`${client.sessionId} is now waiting for a match (${player.teamSize}v${player.teamSize}, ${player.speed})`)
    })
    
    this.onMessage("stop-waiting", (client) => {
      // Remove player from waiting list
      if (this.state.waitingPlayers.has(client.sessionId)) {
        this.state.waitingPlayers.delete(client.sessionId)
        console.log(`${client.sessionId} stopped waiting`)
      }
    })
  }
  
  onJoin(client: Client, options: any) {
    console.log(`${client.sessionId} joined lobby`)
    
    // Update online count
    this.state.totalOnline = this.clients.length
    
    // Notify about current waiting players
    const waitingList: any[] = []
    this.state.waitingPlayers.forEach(player => {
      waitingList.push({
        teamSize: player.teamSize,
        speed: player.speed,
        waitingSince: player.joinedAt
      })
    })
    
    if (waitingList.length > 0) {
      client.send("players-waiting", waitingList)
    }
  }
  
  onLeave(client: Client) {
    console.log(`${client.sessionId} left lobby`)
    
    // Remove from waiting list if they were waiting
    if (this.state.waitingPlayers.has(client.sessionId)) {
      this.state.waitingPlayers.delete(client.sessionId)
    }
    
    // Update online count
    this.state.totalOnline = this.clients.length
  }
}