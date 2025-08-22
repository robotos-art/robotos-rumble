import { Room, Client } from "@colyseus/core"
import { BattleRoomState, Player, BattleUnit, BattleAction } from "../schemas/BattleRoomState"
import { BattleEngineServer } from "../game/BattleEngineServer"

export class PvPBattleRoom extends Room<BattleRoomState> {
  maxClients = 2
  private battleEngine: BattleEngineServer = new BattleEngineServer()
  private actionTimers: Map<string, NodeJS.Timeout> = new Map()
  private playerPreferences: Map<string, { teamSize: number, speed: string }> = new Map()
  private settingsAgreed: Map<string, boolean> = new Map()
  
  onCreate(options: any) {
    this.setState(new BattleRoomState())
    
    // Don't set final settings yet - wait for both players to negotiate
    // These are just defaults that may change
    this.state.teamSize = 5
    this.state.speed = "speedy"
    this.state.timerDuration = 5
    
    // Set up message handlers
    this.onMessage("ready", this.handleReady.bind(this))
    this.onMessage("action", this.handleAction.bind(this))
    this.onMessage("forfeit", this.handleForfeit.bind(this))
    this.onMessage("team", this.handleTeamUpdate.bind(this))
    this.onMessage("accept-settings", (client, settings) => this.handleAcceptSettings(client, settings))
    this.onMessage("propose-settings", (client, settings) => this.handleProposeSettings(client, settings))
    
    console.log("PvP Battle Room created with settings:", {
      teamSize: this.state.teamSize,
      speed: this.state.speed,
      timerDuration: this.state.timerDuration
    })
  }
  
  onJoin(client: Client, options: any) {
    console.log(`${client.sessionId} joined PvP battle room`)
    
    // Store player preferences
    this.playerPreferences.set(client.sessionId, {
      teamSize: options.teamSize || 5,
      speed: options.speed || "speedy"
    })
    
    // Create player
    const player = new Player()
    player.id = client.sessionId
    player.address = options.address || "0x0000"
    player.name = options.name || `Player ${this.state.players.size + 1}`
    player.wins = options.wins || 0
    player.losses = options.losses || 0
    player.team = JSON.stringify(options.team || [])
    
    this.state.players.set(client.sessionId, player)
    
    // Check if we have 2 players
    if (this.state.players.size === 2) {
      // Check if settings match
      const prefs = Array.from(this.playerPreferences.values())
      const settingsMatch = prefs[0].teamSize === prefs[1].teamSize && 
                           prefs[0].speed === prefs[1].speed
      
      if (settingsMatch) {
        // Settings match - proceed normally
        this.state.teamSize = prefs[0].teamSize
        this.state.speed = prefs[0].speed
        this.state.timerDuration = this.state.speed === "speedy" ? 5 : 10
        this.state.status = "ready"
        this.broadcast("match-ready", { message: "Both players connected! Send your teams." })
      } else {
        // Settings don't match - need negotiation
        const players = Array.from(this.state.players.entries())
        
        // Notify each player about the mismatch
        players.forEach(([id, player]) => {
          const myPrefs = this.playerPreferences.get(id)!
          const otherPrefs = Array.from(this.playerPreferences.entries())
            .find(([otherId]) => otherId !== id)?.[1]!
          
          this.clients.find(c => c.sessionId === id)?.send("settings-mismatch", {
            yourSettings: myPrefs,
            opponentSettings: otherPrefs,
            message: `Opponent wants ${otherPrefs.teamSize}v${otherPrefs.teamSize} ${otherPrefs.speed} mode`
          })
        })
      }
    }
  }
  
  onLeave(client: Client, consented: boolean) {
    console.log(`${client.sessionId} left PvP battle room (consented: ${consented})`)
    
    if (this.state.status === "battle" && !consented) {
      // Player disconnected during battle - give them 30 seconds to reconnect
      this.allowReconnection(client, 30)
    } else {
      // Player left intentionally or battle hasn't started
      this.handlePlayerLeave(client.sessionId)
    }
  }
  
  async onReconnect(client: Client) {
    console.log(`${client.sessionId} reconnected to PvP battle`)
    
    // Resume their timer if it was their turn
    if (this.state.currentTurn === client.sessionId) {
      this.startActionTimer(client.sessionId)
    }
  }
  
  handleReady(client: Client) {
    const player = this.state.players.get(client.sessionId)
    if (!player) {
      console.log(`handleReady: Player ${client.sessionId} not found`)
      return
    }
    
    player.ready = true
    console.log(`Player ${client.sessionId} is ready. Total players: ${this.state.players.size}`)
    
    // Log all players and their ready status
    this.state.players.forEach((p, id) => {
      console.log(`  - ${id}: ready=${p.ready}, hasTeam=${p.team !== "[]"}`)
    })
    
    // Check if both players are ready
    const allReady = Array.from(this.state.players.values()).every(p => p.ready)
    console.log(`All ready: ${allReady}, Player count: ${this.state.players.size}`)
    
    if (allReady && this.state.players.size === 2) {
      console.log("Starting battle!")
      this.startBattle()
    }
  }
  
  handleTeamUpdate(client: Client, team: any[]) {
    const player = this.state.players.get(client.sessionId)
    if (!player) return
    
    player.team = JSON.stringify(team)
    console.log(`${client.sessionId} updated their team`)
    
    // If both players have teams and are ready, start battle
    const players = Array.from(this.state.players.values())
    const allHaveTeams = players.every(p => p.team && p.team !== "[]")
    if (allHaveTeams && players.every(p => p.ready)) {
      this.startBattle()
    }
  }
  
  handleAction(client: Client, action: any) {
    if (this.state.status !== "battle") return
    
    // Validate it's the player's turn
    const currentUnit = this.battleEngine.getCurrentUnit()
    if (!currentUnit || currentUnit.ownerId !== client.sessionId) {
      client.send("error", { message: "Not your turn!" })
      return
    }
    
    // Clear action timer
    const timer = this.actionTimers.get(client.sessionId)
    if (timer) {
      clearTimeout(timer)
      this.actionTimers.delete(client.sessionId)
    }
    
    // Create battle action
    const battleAction = new BattleAction()
    battleAction.playerId = client.sessionId
    battleAction.type = action.type
    battleAction.sourceId = action.sourceId
    battleAction.targetId = action.targetId
    battleAction.abilityId = action.abilityId
    battleAction.timingBonus = action.timingBonus || 1.0
    battleAction.timestamp = Date.now()
    
    // Execute action on server
    const result = this.battleEngine.executeAction({
      playerId: client.sessionId,
      type: action.type,
      sourceId: action.sourceId,
      targetId: action.targetId,
      abilityId: action.abilityId,
      timingBonus: action.timingBonus,
      defenseBonus: action.defenseBonus
    })
    
    // Update state
    this.state.lastAction = battleAction
    
    // Sync unit states
    this.syncUnitsWithEngine()
    
    // Add to battle log
    if (result.damage !== undefined) {
      this.state.battleLog.push(
        `Turn ${this.state.turnNumber}: ${action.type} for ${result.damage} damage`
      )
    }
    
    // Prepare action result data for clients
    const actionResult = {
      damage: result.damage,
      critical: false, // Server doesn't track critical hits separately yet
      attackerId: action.sourceId,
      targetId: action.targetId,
      units: Array.from(this.state.units).map(unit => ({
        id: unit.id,
        currentHp: unit.currentHp,
        currentEnergy: unit.currentEnergy,
        isAlive: unit.isAlive
      })),
      turnOrder: Array.from(this.state.turnOrder),
      turnIndex: this.state.turnIndex,
      battleEnded: result.battleEnded,
      winner: result.winner
    }
    
    // Broadcast action result to both players
    this.clients.forEach(otherClient => {
      if (otherClient.sessionId === client.sessionId) {
        // Send to acting player
        otherClient.send("action-executed", {
          ...actionResult,
          isPlayerTurn: false, // Their turn just ended
          won: result.battleEnded ? result.winner === client.sessionId : undefined
        })
      } else {
        // Send to opponent
        otherClient.send("opponent-action", {
          ...actionResult,
          isPlayerTurn: this.state.currentTurn === otherClient.sessionId,
          won: result.battleEnded ? result.winner === otherClient.sessionId : undefined
        })
      }
    })
    
    // Check for battle end
    if (result.battleEnded) {
      this.endBattle(result.winner!)
    } else {
      // Continue to next turn
      this.nextTurn()
    }
  }
  
  private startBattle() {
    console.log("Starting PvP battle!")
    
    // Parse teams
    const players = Array.from(this.state.players.values())
    const player1 = players[0]
    const player2 = players[1]
    
    const team1 = JSON.parse(player1.team).map((unit: any, i: number) => ({
      ...unit,
      ownerId: player1.id,
      position: i
    }))
    
    const team2 = JSON.parse(player2.team).map((unit: any, i: number) => ({
      ...unit,
      ownerId: player2.id,
      position: i + team1.length
    }))
    
    // Initialize battle engine
    this.battleEngine.initializeBattle(team1, team2)
    
    // Initialize state units
    const allUnits = [...team1, ...team2]
    allUnits.forEach((unit: any) => {
      const battleUnit = new BattleUnit()
      battleUnit.id = unit.id
      battleUnit.ownerId = unit.ownerId
      battleUnit.name = unit.name
      battleUnit.element = unit.element
      battleUnit.currentHp = unit.stats.hp
      battleUnit.maxHp = unit.stats.hp
      battleUnit.currentEnergy = unit.stats.energy
      battleUnit.maxEnergy = unit.stats.energy
      battleUnit.isAlive = true
      battleUnit.position = unit.position
      
      this.state.units.push(battleUnit)
    })
    
    // Set battle status
    this.state.status = "battle"
    this.state.turnNumber = 1
    
    // Start first turn
    this.nextTurn()
    
    this.broadcast("battle-start", { message: "Battle has begun!" })
  }
  
  private nextTurn(): void {
    // Get current unit from engine
    const currentUnit = this.battleEngine.getCurrentUnit()
    if (!currentUnit) {
      // Recalculate turn order
      const engineState = this.battleEngine.getState()
      this.state.turnOrder.clear()
      engineState.turnOrder.forEach(id => this.state.turnOrder.push(id))
      this.state.turnIndex = 0
      this.state.turnNumber++
      return this.nextTurn()
    }
    
    // Update state
    this.state.currentTurn = currentUnit.ownerId
    this.state.turnTimer = this.state.timerDuration
    
    // Start action timer
    this.startActionTimer(currentUnit.ownerId)
    
    // Notify players
    this.broadcast("turn-start", {
      unitId: currentUnit.id,
      playerId: currentUnit.ownerId,
      timer: this.state.timerDuration
    })
  }
  
  private startActionTimer(playerId: string) {
    // Clear any existing timer
    const existingTimer = this.actionTimers.get(playerId)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }
    
    // Set new timer
    const timer = setTimeout(() => {
      // Auto-execute basic attack on timeout
      const currentUnit = this.battleEngine.getCurrentUnit()
      if (currentUnit && currentUnit.ownerId === playerId) {
        // Find a random alive enemy
        const enemies = Array.from(this.state.units).filter(u => 
          u.ownerId !== playerId && u.isAlive
        )
        
        if (enemies.length > 0) {
          const target = enemies[Math.floor(Math.random() * enemies.length)]
          
          this.handleAction(
            { sessionId: playerId } as Client,
            {
              type: "attack",
              sourceId: currentUnit.id,
              targetId: target.id,
              timingBonus: 0.5 // Weak timing for timeout
            }
          )
        }
      }
    }, this.state.timerDuration * 1000)
    
    this.actionTimers.set(playerId, timer)
  }
  
  private syncUnitsWithEngine() {
    const engineState = this.battleEngine.getState()
    
    // Update unit states
    engineState.units.forEach(engineUnit => {
      const stateUnit = this.state.units.find(u => u.id === engineUnit.id)
      if (stateUnit) {
        stateUnit.currentHp = engineUnit.currentHp
        stateUnit.currentEnergy = engineUnit.currentEnergy
        stateUnit.isAlive = engineUnit.isAlive
      }
    })
    
    // Update turn order
    this.state.turnOrder.clear()
    engineState.turnOrder.forEach(id => this.state.turnOrder.push(id))
    this.state.turnIndex = engineState.turnIndex
  }
  
  private endBattle(winnerId: string) {
    this.state.status = "ended"
    this.state.winner = winnerId
    
    // Find loser
    const players = Array.from(this.state.players.values())
    const loser = players.find(p => p.id !== winnerId)
    if (loser) {
      this.state.loser = loser.id
    }
    
    // Clear all timers
    this.actionTimers.forEach(timer => clearTimeout(timer))
    this.actionTimers.clear()
    
    // Notify clients
    this.broadcast("battle-end", {
      winner: winnerId,
      loser: this.state.loser
    })
    
    console.log(`Battle ended! Winner: ${winnerId}`)
    
    // Disconnect after 10 seconds
    setTimeout(() => {
      this.disconnect()
    }, 10000)
  }
  
  private handlePlayerLeave(playerId: string) {
    if (this.state.status === "battle") {
      // Forfeit the battle
      const players = Array.from(this.state.players.values())
      const remainingPlayer = players.find(p => p.id !== playerId)
      if (remainingPlayer) {
        this.endBattle(remainingPlayer.id)
      }
    } else {
      // Remove player and reset room
      this.state.players.delete(playerId)
      this.state.status = "waiting"
    }
  }
  
  handleAcceptSettings(client: Client, settings: { teamSize: number, speed: string }) {
    console.log(`${client.sessionId} accepted settings:`, settings)
    
    // Mark this player as agreed
    this.settingsAgreed.set(client.sessionId, true)
    
    // Update the agreed settings
    this.state.teamSize = settings.teamSize
    this.state.speed = settings.speed
    this.state.timerDuration = settings.speed === "speedy" ? 5 : 10
    
    // Notify the other player
    this.broadcast("settings-accepted", {
      playerId: client.sessionId,
      settings: settings
    }, { except: client })
    
    // Check if both players have agreed
    if (this.settingsAgreed.size === 2) {
      this.state.status = "ready"
      this.broadcast("match-ready", { 
        message: "Settings agreed! Send your teams.",
        finalSettings: {
          teamSize: this.state.teamSize,
          speed: this.state.speed
        }
      })
    }
  }
  
  handleProposeSettings(client: Client, settings: { teamSize: number, speed: string }) {
    console.log(`${client.sessionId} proposed settings:`, settings)
    
    // Broadcast the proposal to the other player
    this.broadcast("settings-proposal", {
      playerId: client.sessionId,
      settings: settings,
      message: `Opponent proposes ${settings.teamSize}v${settings.teamSize} ${settings.speed} mode`
    }, { except: client })
  }
  
  private handleForfeit(client: Client) {
    // Find the other player as the winner
    let winnerId = ""
    this.state.players.forEach((player, id) => {
      if (id !== client.sessionId) {
        winnerId = id
      }
    })
    
    // Notify all clients about the forfeit
    this.broadcast("player-forfeited", {
      playerId: client.sessionId,
      playerName: this.state.players.get(client.sessionId)?.name || "Player"
    })
    
    console.log(`${client.sessionId} forfeited the match`)
    
    // End the battle with the other player as winner
    if (winnerId) {
      this.endBattle(winnerId)
    }
  }
}