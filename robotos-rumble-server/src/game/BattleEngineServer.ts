// Simplified server-side battle engine that handles core combat logic
// The client already has the full BattleEngineV3, so this just validates and synchronizes

export interface BattleUnit {
  id: string
  ownerId: string
  name: string
  element: string
  stats: {
    hp: number
    attack: number
    defense: number
    speed: number
    energy: number
    crit: number
  }
  abilities: string[]
  currentHp: number
  currentEnergy: number
  isAlive: boolean
  position: number
}

export interface BattleAction {
  playerId: string
  type: 'attack' | 'ability' | 'switch'
  sourceId: string
  targetId?: string
  abilityId?: string
  timingBonus?: number
  defenseBonus?: number
}

export class BattleEngineServer {
  public units: Map<string, BattleUnit> = new Map() // Made public for ability assignment
  private turnOrder: string[] = []
  private turnIndex: number = 0
  private battleLog: string[] = []
  
  initializeBattle(playerTeam: BattleUnit[], enemyTeam: BattleUnit[]) {
    // Store all units
    const allUnits = [...playerTeam, ...enemyTeam]
    allUnits.forEach(unit => {
      console.log(`[BattleEngineServer] Initializing unit ${unit.id} with stats:`, unit.stats)
      
      // Ensure stats exist with defaults if missing
      const stats = unit.stats || {
        hp: 100,
        attack: 50,
        defense: 50,
        speed: 50,
        energy: 100,
        crit: 10
      }
      
      this.units.set(unit.id, {
        ...unit,
        stats: stats, // Ensure stats are stored
        currentHp: stats.hp,
        currentEnergy: stats.energy,
        isAlive: true
      })
    })
    
    // Calculate turn order based on speed
    this.calculateTurnOrder()
    this.battleLog.push('Battle initialized!')
  }
  
  private calculateTurnOrder() {
    const aliveUnits = Array.from(this.units.values()).filter(u => u.isAlive)
    
    // Sort by speed with small random factor
    aliveUnits.sort((a, b) => {
      const aSpeed = a.stats.speed + Math.random() * 10
      const bSpeed = b.stats.speed + Math.random() * 10
      return bSpeed - aSpeed
    })
    
    this.turnOrder = aliveUnits.map(u => u.id)
    this.turnIndex = 0
  }
  
  getCurrentUnit(): BattleUnit | null {
    if (this.turnIndex >= this.turnOrder.length) {
      return null
    }
    const unitId = this.turnOrder[this.turnIndex]
    return this.units.get(unitId) || null
  }
  
  validateAction(action: BattleAction): boolean {
    const source = this.units.get(action.sourceId)
    if (!source || !source.isAlive) return false
    
    // Check if it's this player's unit's turn
    const currentUnit = this.getCurrentUnit()
    if (!currentUnit || currentUnit.id !== action.sourceId) return false
    if (currentUnit.ownerId !== action.playerId) return false
    
    // Validate target exists
    if (action.targetId) {
      const target = this.units.get(action.targetId)
      if (!target || !target.isAlive) return false
    }
    
    return true
  }
  
  executeAction(action: BattleAction): { 
    damage?: number, 
    remainingHP?: number,
    targetKO?: boolean,
    battleEnded?: boolean,
    winner?: string 
  } {
    console.log(`[BattleEngineServer] Executing action:`, action)
    
    if (!this.validateAction(action)) {
      console.log(`[BattleEngineServer] Action validation failed`)
      return {}
    }
    
    const attacker = this.units.get(action.sourceId)!
    const target = action.targetId ? this.units.get(action.targetId) : null
    
    console.log(`[BattleEngineServer] Attacker stats:`, attacker.stats)
    console.log(`[BattleEngineServer] Target stats:`, target?.stats)
    
    let result: any = {}
    
    if (action.type === 'attack' && target) {
      // Make sure we have proper stats - default if missing
      const attackPower = attacker.stats?.attack || 50
      const defensePower = target.stats?.defense || 40
      
      // Simple damage calculation
      const baseDamage = Math.max(10, attackPower * 2 - defensePower)
      
      console.log(`[BattleEngineServer] Base damage: ${baseDamage} (attack: ${attackPower}, defense: ${defensePower})`)
      
      // Apply element multiplier
      const elementMultiplier = this.getElementMultiplier(attacker.element, target.element)
      let damage = Math.floor(baseDamage * elementMultiplier)
      
      // Apply timing bonus
      if (action.timingBonus) {
        damage = Math.floor(damage * action.timingBonus)
      }
      
      // Apply defense reduction
      if (action.defenseBonus) {
        damage = Math.floor(damage * action.defenseBonus)
      }
      
      // Critical hit chance
      if (Math.random() * 100 < (attacker.stats?.crit || 10)) {
        damage *= 2
        this.battleLog.push('Critical hit!')
      }
      
      console.log(`[BattleEngineServer] Final damage: ${damage}`)
      
      // Apply damage
      target.currentHp = Math.max(0, target.currentHp - damage)
      
      result.damage = damage
      result.remainingHP = target.currentHp
      
      // Check for KO
      if (target.currentHp <= 0) {
        target.isAlive = false
        result.targetKO = true
        this.battleLog.push(`${target.name} was defeated!`)
        
        // Check battle end
        const battleEnd = this.checkBattleEnd()
        if (battleEnd) {
          result.battleEnded = true
          result.winner = battleEnd.winner
        }
      }
      
      this.battleLog.push(`${attacker.name} attacks ${target.name} for ${damage} damage!`)
    }
    
    // Move to next turn
    this.nextTurn()
    
    return result
  }
  
  private getElementMultiplier(attackElement: string, defenseElement: string): number {
    // Simplified element chart
    const advantages: Record<string, string[]> = {
      'SURGE': ['METAL', 'CODE'],
      'CODE': ['GLITCH', 'WILD'],
      'METAL': ['WILD', 'BOND'],
      'GLITCH': ['SURGE', 'BOND'],
      'BOND': ['CODE', 'SURGE'],
      'WILD': ['GLITCH', 'SURGE']
    }
    
    const attackKey = attackElement.toUpperCase()
    const defenseKey = defenseElement.toUpperCase()
    
    if (advantages[attackKey]?.includes(defenseKey)) {
      return 1.5 // Super effective
    }
    
    // Check if defender has advantage (reverse)
    if (advantages[defenseKey]?.includes(attackKey)) {
      return 0.75 // Not very effective
    }
    
    return 1.0
  }
  
  private nextTurn() {
    this.turnIndex++
    console.log(`[BattleEngineServer] nextTurn() - turnIndex now: ${this.turnIndex}, turnOrder length: ${this.turnOrder.length}`)
    
    // If we've gone through all units, recalculate turn order
    if (this.turnIndex >= this.turnOrder.length) {
      console.log(`[BattleEngineServer] End of round, recalculating turn order`)
      this.calculateTurnOrder()
      this.battleLog.push('=== NEW ROUND ===')
    }
    
    const nextUnit = this.getCurrentUnit()
    console.log(`[BattleEngineServer] Next unit after turn advance: ${nextUnit?.id || 'none'}`)
  }
  
  private checkBattleEnd(): { winner: string } | null {
    const aliveByOwner: Record<string, number> = {}
    
    for (const unit of Array.from(this.units.values())) {
      if (unit.isAlive) {
        aliveByOwner[unit.ownerId] = (aliveByOwner[unit.ownerId] || 0) + 1
      }
    }
    
    const owners = Object.keys(aliveByOwner)
    if (owners.length === 1) {
      // One player has units remaining
      return { winner: owners[0] }
    }
    
    if (owners.length === 0) {
      // Draw (shouldn't happen)
      return { winner: 'draw' }
    }
    
    return null
  }
  
  getState() {
    return {
      units: Array.from(this.units.values()),
      turnOrder: this.turnOrder,
      turnIndex: this.turnIndex,
      currentUnit: this.getCurrentUnit(),
      battleLog: this.battleLog.slice(-10) // Last 10 log entries
    }
  }
}