import { Room, Client } from "@colyseus/core"
import { BattleRoomState, Player, BattleUnit, BattleAction } from "../schemas/BattleRoomState"
import { BattleEngineServer } from "../game/BattleEngineServer"

export class PvPBattleRoom extends Room<BattleRoomState> {
  maxClients = 2
  private battleEngine: BattleEngineServer = new BattleEngineServer()
  private actionTimers: Map<string, NodeJS.Timeout> = new Map()
  
  onCreate(options: any) {
    this.setState(new BattleRoomState())
    
    // Set battle settings from options
    this.state.teamSize = options.teamSize || 5
    this.state.speed = options.speed || "speedy"
    this.state.timerDuration = this.state.speed === "speedy" ? 5 : 10
    
    // Set up message handlers
    this.onMessage("ready", this.handleReady.bind(this))
    this.onMessage("action", this.handleAction.bind(this))
    this.onMessage("team", this.handleTeamUpdate.bind(this))
    
    console.log("PvP Battle Room created with settings:", {
      teamSize: this.state.teamSize,
      speed: this.state.speed,
      timerDuration: this.state.timerDuration
    })
  }
  
  onJoin(client: Client, options: any) {
    console.log(`${client.sessionId} joined PvP battle room`)
    
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
      this.state.status = "ready"
      this.broadcast("match-ready", { message: "Both players connected! Send your teams." })
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
    if (!player) return
    
    player.ready = true
    
    // Check if both players are ready
    const allReady = Array.from(this.state.players.values()).every(p => p.ready)
    if (allReady && this.state.players.size === 2) {
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
}