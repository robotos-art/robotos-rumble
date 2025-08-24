import { Room, Client } from "@colyseus/core"
import { BattleRoomState, Player, BattleUnit, BattleAction } from "../schemas/BattleRoomState"
import { BattleEngineServer } from "../game/BattleEngineServer"

export class PvPBattleRoom extends Room<BattleRoomState> {
  maxClients = 2
  private battleEngine: BattleEngineServer = new BattleEngineServer()
  private actionTimers: Map<string, NodeJS.Timeout> = new Map()
  private playerPreferences: Map<string, { teamSize: number, speed: string }> = new Map()
  private settingsAgreed: Map<string, boolean> = new Map()
  // Removed actionsInProgress - no longer needed with simplified timer logic
  
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
    this.onMessage("action-phase", this.handleActionPhase.bind(this))
    this.onMessage("target-phase", this.handleTargetPhase.bind(this))
    this.onMessage("forfeit", this.handleForfeit.bind(this))
    this.onMessage("team", this.handleTeamUpdate.bind(this))
    this.onMessage("accept-settings", (client, settings) => this.handleAcceptSettings(client, settings))
    this.onMessage("propose-settings", (client, settings) => this.handleProposeSettings(client, settings))
    this.onMessage("target-preview", this.handleTargetPreview.bind(this))
    
    // Set up phase timer countdown
    this.clock.setInterval(() => {
      if (this.state.status === "battle" && this.state.phaseTimer > 0) {
        this.state.phaseTimer--
        
        // Handle phase timeout
        if (this.state.phaseTimer === 0) {
          this.handlePhaseTimeout()
        }
      }
    }, 1000) // Update every second
    
  }
  
  onJoin(client: Client, options: any) {
    console.log(`[PvP Server] Player joining: ${client.sessionId}, address: ${options.address}`)
    
    // Special handling for test wallet - treat each session as different player
    const TEST_WALLET = "0x63989a803b61581683B54AB6188ffa0F4bAAdf28"
    const isTestWallet = options.address?.toLowerCase() === TEST_WALLET.toLowerCase()
    
    if (isTestWallet) {
      console.log(`[PvP Server] Test wallet detected - allowing multiple sessions`)
      console.log(`[PvP Server] Creating unique player for session: ${client.sessionId}`)
      console.log(`[PvP Server] Current room has ${this.state.players.size} players`)
    }
    
    // Store player preferences
    this.playerPreferences.set(client.sessionId, {
      teamSize: options.teamSize || 5,
      speed: options.speed || "speedy"
    })
    
    // Create player
    const player = new Player()
    player.id = client.sessionId
    // For test wallet, use session ID as unique identifier
    player.address = isTestWallet ? `${options.address}_${client.sessionId.slice(0, 6)}` : (options.address || "0x0000")
    // Add tab identifier for same-wallet testing
    player.name = isTestWallet 
      ? `Test Player ${this.state.players.size + 1} (Tab ${client.sessionId.slice(0, 4)})`
      : (options.name || `Player ${this.state.players.size + 1}`)
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
    
    if (this.state.status === "battle" && !consented) {
      // Player disconnected during battle - give them 30 seconds to reconnect
      this.allowReconnection(client, 30)
    } else {
      // Player left intentionally or battle hasn't started
      this.handlePlayerLeave(client.sessionId)
    }
  }
  
  async onReconnect(client: Client) {
    
    // Timer is handled by clock interval, no need to restart
    // The clock interval will continue counting down turnTimer
  }
  
  handleReady(client: Client) {
    const player = this.state.players.get(client.sessionId)
    if (!player) {
      console.error(`[PvP] Player ${client.sessionId} not found in handleReady`)
      return
    }
    
    player.ready = true
    console.log(`[PvP] Player ${client.sessionId} is ready. Players: ${this.state.players.size}, All ready: ${Array.from(this.state.players.values()).every(p => p.ready)}`)
    
    // Check if both players are ready
    const allReady = Array.from(this.state.players.values()).every(p => p.ready)
    
    if (allReady && this.state.players.size === 2) {
      console.log("[PvP] Starting battle - both players ready!")
      this.startBattle()
    }
  }
  
  handleTeamUpdate(client: Client, team: any[]) {
    const player = this.state.players.get(client.sessionId)
    if (!player) return
    
    player.team = JSON.stringify(team)
    
    // If both players have teams and are ready, start battle
    const players = Array.from(this.state.players.values())
    const allHaveTeams = players.every(p => p.team && p.team !== "[]")
    if (allHaveTeams && players.every(p => p.ready)) {
      this.startBattle()
    }
  }
  
  handleTargetPreview(client: Client, data: { targetId: string }) {
    // Broadcast target preview to opponent
    this.broadcast("target-preview", {
      attackerId: client.sessionId,
      targetId: data.targetId
    }, { except: client })
  }
  
  handleAction(client: Client, action: any) {
    if (this.state.status !== "battle") return
    
    // If we're using phase system and not in timing phase, reject
    if (this.state.currentPhase && this.state.currentPhase !== "timing") {
      console.log(`[PvP Server] Action received but not in timing phase: ${this.state.currentPhase}`)
      return
    }
    
    // Validate it's the player's turn
    const currentUnit = this.battleEngine.getCurrentUnit()
    if (!currentUnit || currentUnit.ownerId !== client.sessionId) {
      client.send("error", { message: "Not your turn!" })
      return
    }
    
    // Reset the timers to indicate action was taken
    this.state.turnTimer = -1
    this.state.phaseTimer = -1
    
    // Clear action timer (if using separate timer system)
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
      defenseBonus: 0.8 // Server-controlled defense for now, ignore client value
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
    
    // Check for battle end first
    if (result.battleEnded) {
      this.endBattle(result.winner!)
      return
    }
    
    // Determine next turn BEFORE broadcasting
    const nextUnit = this.battleEngine.getCurrentUnit()
    let nextPlayerId = null
    let nextUnitId = null
    
    if (nextUnit) {
      // Get the current unit AFTER the action (engine already advanced)
      // No need to add 1 since executeAction already advanced the turn
      nextPlayerId = nextUnit.ownerId
      nextUnitId = nextUnit.id
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
      battleEnded: false,
      nextPlayerId: nextPlayerId,
      nextUnitId: nextUnitId
    }
    
    // Broadcast action result to both players (same message for both)
    this.broadcast("action-result", actionResult)
    
    // Wait for animation to complete before advancing to next turn
    // This gives the client time to show attack animations and damage
    setTimeout(() => {
      this.nextTurn()
    }, 2500) // 2.5 seconds for animation
  }
  
  private startBattle() {
    console.log("[PvP] startBattle() called")
    
    // Parse teams
    const players = Array.from(this.state.players.values())
    const player1 = players[0]
    const player2 = players[1]
    
    const team1 = JSON.parse(player1.team).map((unit: any, i: number) => {
      console.log(`[PvP Server] Team 1 unit ${i} stats:`, unit.stats)
      return {
        ...unit,
        id: `${player1.id}:${unit.id}`, // Namespace unit ID with owner
        ownerId: player1.id,
        position: i,
        // Ensure stats are passed through
        stats: unit.stats || {
          hp: 100,
          attack: 50,
          defense: 50,
          speed: 50,
          energy: 100,
          crit: 10
        }
      }
    })
    
    const team2 = JSON.parse(player2.team).map((unit: any, i: number) => {
      console.log(`[PvP Server] Team 2 unit ${i} stats:`, unit.stats)
      return {
        ...unit,
        id: `${player2.id}:${unit.id}`, // Namespace unit ID with owner
        ownerId: player2.id,
        position: i + team1.length,
        // Ensure stats are passed through
        stats: unit.stats || {
          hp: 100,
          attack: 50,
          defense: 50,
          speed: 50,
          energy: 100,
          crit: 10
        }
      }
    })
    
    // Initialize battle engine
    this.battleEngine.initializeBattle(team1, team2)
    
    // Sync initial turn order from engine
    this.syncUnitsWithEngine()
    
    // Initialize state units (pass through all unit data for client to use)
    const allUnits = [...team1, ...team2]
    allUnits.forEach((unit: any) => {
      const battleUnit = new BattleUnit()
      battleUnit.id = unit.id
      battleUnit.ownerId = unit.ownerId
      battleUnit.name = unit.name
      battleUnit.element = unit.element
      battleUnit.imageUrl = unit.imageUrl || ""
      battleUnit.currentHp = unit.stats?.hp || unit.currentHp || 100
      battleUnit.maxHp = unit.stats?.hp || unit.maxHp || 100
      battleUnit.currentEnergy = unit.stats?.energy || unit.currentEnergy || 100
      battleUnit.maxEnergy = unit.stats?.energy || unit.maxEnergy || 100
      battleUnit.isAlive = true
      battleUnit.position = unit.position
      
      // Store abilities in the server's battle engine
      const engineUnit = this.battleEngine.units.get(unit.id)
      if (engineUnit) {
        engineUnit.abilities = unit.abilities || []
      }
      
      this.state.units.push(battleUnit)
    })
    
    // Set battle status
    this.state.status = "battle"
    this.state.battleStarted = true  // CRITICAL: Mark battle as started!
    this.state.turnNumber = 1
    
    // Start first turn
    this.nextTurn()
    
    console.log("[PvP] Battle started, first turn initiated")
    this.broadcast("battle-start", { message: "Battle has begun!" })
  }
  
  private nextTurn(): void {
    // Get current unit from engine
    const currentUnit = this.battleEngine.getCurrentUnit()
    console.log(`[PvP] nextTurn() - current unit: ${currentUnit?.id}, owner: ${currentUnit?.ownerId}`)
    if (!currentUnit) {
      // Recalculate turn order
      const engineState = this.battleEngine.getState()
      this.state.turnOrder.clear()
      engineState.turnOrder.forEach(id => this.state.turnOrder.push(id))
      this.state.turnIndex = 0
      this.state.turnNumber++
      return this.nextTurn()
    }
    
    // Reset phase to selecting for new turn
    this.state.currentPhase = "selecting"
    this.state.selectedAction = ""
    this.state.targetPreview = ""
    
    // Update state
    this.state.currentTurn = currentUnit.ownerId
    // Set phase timer based on current phase
    this.state.phaseTimer = this.getPhaseTimeout("selecting")
    this.state.turnTimer = this.state.phaseTimer // Keep backward compatibility
    
    // Notify players
    console.log(`[PvP] Broadcasting turn-start for unit ${currentUnit.id}, owner ${currentUnit.ownerId}, phase: selecting`)
    this.broadcast("turn-start", {
      unitId: currentUnit.id,
      playerId: currentUnit.ownerId,
      timer: this.state.timerDuration
    })
  }
  
  // Removed startActionTimer - using clock interval for timeouts instead
  
  private executeAutoAction(unit: any, target: any, timingBonus: number = 0.5): void {
    console.log(`[PvP Server] Executing auto-action for unit ${unit.id} against ${target.id}`)
    
    // Execute action directly when timer expires
    const result = this.battleEngine.executeAction({
      playerId: unit.ownerId,
      type: "attack",
      sourceId: unit.id,
      targetId: target.id,
      timingBonus: timingBonus, // Weak timing for timeout
      defenseBonus: 0.8 // Default defense
    })
    
    console.log(`[PvP Server] Auto-action result:`, result)
    
    // Sync state
    this.syncUnitsWithEngine()
    
    // Get next unit info AFTER the action
    const nextUnit = this.battleEngine.getCurrentUnit()
    let nextPlayerId = ""
    let nextUnitId = ""
    
    if (nextUnit) {
      nextPlayerId = nextUnit.ownerId
      nextUnitId = nextUnit.id
      console.log(`[PvP Server] Next unit will be: ${nextUnitId}`)
    } else {
      console.log(`[PvP Server] No next unit - turn order needs recalculation`)
    }
    
    // Build and broadcast result (BattleEngineServer returns simplified result)
    const actionResult = {
      damage: result.damage || 0,
      critical: false, // Server doesn't track critical separately
      events: [], // Server doesn't return events array
      attackerId: unit.id,
      targetId: target.id,
      units: Array.from(this.state.units).map(u => ({
        id: u.id,
        currentHp: u.currentHp,
        currentEnergy: u.currentEnergy,
        isAlive: u.isAlive
      })),
      turnOrder: Array.from(this.state.turnOrder),
      turnIndex: this.state.turnIndex,
      battleEnded: false,
      nextPlayerId: nextPlayerId,
      nextUnitId: nextUnitId
    }
    
    this.broadcast("action-result", actionResult)
    
    // Check for battle end
    if (result.battleEnded) {
      this.endBattle(result.winner!)
    } else {
      // Wait for animation to complete before advancing to next turn
      setTimeout(() => {
        this.nextTurn()
      }, 2500) // 2.5 seconds for animation
    }
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
    
    
    // End the battle with the other player as winner
    if (winnerId) {
      this.endBattle(winnerId)
    }
  }
  
  // Phase management methods
  private getPhaseTimeout(phase: string): number {
    // Different timeout for each phase
    const baseTimeout = this.state.speed === "speedy" ? 5 : 10
    
    switch(phase) {
      case "selecting":
        return baseTimeout // 5 or 10 seconds to select action
      case "targeting":
        return baseTimeout // 5 or 10 seconds to select target
      case "timing":
        return 3 // 3 seconds for timing minigame
      default:
        return baseTimeout
    }
  }
  
  private handlePhaseTimeout() {
    const currentUnit = this.battleEngine.getCurrentUnit()
    if (!currentUnit) return
    
    console.log(`[PvP Server] Phase timeout in phase: ${this.state.currentPhase}`)
    
    switch(this.state.currentPhase) {
      case "selecting":
        // Auto-select attack action
        this.state.selectedAction = "attack"
        this.state.currentPhase = "targeting"
        this.state.phaseTimer = this.getPhaseTimeout("targeting")
        
        // Notify clients about phase change
        this.broadcast("phase-change", {
          phase: "targeting",
          action: "attack",
          unitId: currentUnit.id
        })
        break
        
      case "targeting":
        // Auto-select random target
        const enemies = Array.from(this.state.units).filter(u => 
          u.ownerId !== currentUnit.ownerId && u.isAlive
        )
        
        if (enemies.length > 0) {
          const target = enemies[Math.floor(Math.random() * enemies.length)]
          this.state.targetPreview = target.id
          this.state.currentPhase = "timing"
          this.state.phaseTimer = this.getPhaseTimeout("timing")
          
          // Notify clients about phase change
          this.broadcast("phase-change", {
            phase: "timing",
            targetId: target.id,
            unitId: currentUnit.id
          })
        }
        break
        
      case "timing":
        // Execute action with weak timing bonus
        const target = this.state.units.find(u => u.id === this.state.targetPreview)
        if (target) {
          this.executeAutoAction(currentUnit, target, 0.5)
        }
        break
    }
  }
  
  // Modified handleAction to work with phases
  handleActionPhase(client: Client, data: { action: string }) {
    if (this.state.status !== "battle") return
    if (this.state.currentPhase !== "selecting") return
    
    const currentUnit = this.battleEngine.getCurrentUnit()
    if (!currentUnit || currentUnit.ownerId !== client.sessionId) {
      client.send("error", { message: "Not your turn!" })
      return
    }
    
    // Store selected action and move to targeting phase
    this.state.selectedAction = data.action
    this.state.currentPhase = "targeting"
    this.state.phaseTimer = this.getPhaseTimeout("targeting")
    
    // Notify all clients
    this.broadcast("phase-change", {
      phase: "targeting",
      action: data.action,
      unitId: currentUnit.id
    })
  }
  
  handleTargetPhase(client: Client, data: { targetId: string }) {
    if (this.state.status !== "battle") return
    if (this.state.currentPhase !== "targeting") return
    
    const currentUnit = this.battleEngine.getCurrentUnit()
    if (!currentUnit || currentUnit.ownerId !== client.sessionId) {
      client.send("error", { message: "Not your turn!" })
      return
    }
    
    // Store target and move to timing phase
    this.state.targetPreview = data.targetId
    this.state.currentPhase = "timing"
    this.state.phaseTimer = this.getPhaseTimeout("timing")
    
    // Notify all clients
    this.broadcast("phase-change", {
      phase: "timing",
      targetId: data.targetId,
      unitId: currentUnit.id
    })
  }
}