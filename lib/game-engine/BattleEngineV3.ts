import { BattleUnitV3, TraitProcessorV3, AbilityInstance } from './TraitProcessorV3'
import elements from '../data/elements.json'
import abilitiesV2 from '../data/abilities-v2.json'

export interface BattleStateV3 {
  playerTeam: BattleUnitV3[]
  enemyTeam: BattleUnitV3[]
  currentTurn: 'player' | 'enemy'
  turnOrder: string[] // Unit IDs in order of action
  turnIndex: number
  battleLog: BattleEvent[]
  status: 'preparing' | 'active' | 'victory' | 'defeat'
  unitStatuses: Map<string, UnitStatus>
  fieldEffects: FieldEffect[]
  turn: number
}

export interface UnitStatus {
  currentHp: number
  currentEnergy: number
  statusEffects: StatusEffect[]
  cooldowns: Map<string, number> // ability id -> turns remaining
  isAlive: boolean
  position?: number // For positioning effects
}

export interface StatusEffect {
  id: string
  name: string
  element: string
  duration: number
  effect: any
}

export interface FieldEffect {
  id: string
  name: string
  duration: number
  effect: any
}

export interface BattleEvent {
  type: 'damage' | 'heal' | 'buff' | 'debuff' | 'ability' | 'element' | 'ko' | 'miss'
  source?: string
  target?: string
  value?: number
  element?: string
  description: string
  timestamp: number
}

export interface ActionResult {
  events: BattleEvent[]
  stateChanges: any[]
}

export interface BattleAction {
  type: 'attack' | 'ability' | 'switch'
  sourceId: string
  targetId?: string
  abilityId?: string
  timingBonus?: number
  defenseBonus?: number
}

export class BattleEngineV3 {
  private state: BattleStateV3
  
  constructor() {
    this.state = {
      playerTeam: [],
      enemyTeam: [],
      currentTurn: 'player',
      turnOrder: [],
      turnIndex: 0,
      battleLog: [],
      status: 'preparing',
      unitStatuses: new Map(),
      fieldEffects: [],
      turn: 0
    }
  }
  
  initializeBattle(playerTeam: BattleUnitV3[], enemyTeam: BattleUnitV3[]) {
    // Apply companion bonuses before battle starts
    this.state.playerTeam = this.applyCompanionBonuses(playerTeam)
    this.state.enemyTeam = this.applyCompanionBonuses(enemyTeam)
    
    // Initialize unit statuses
    const allUnits = [...this.state.playerTeam, ...this.state.enemyTeam]
    allUnits.forEach((unit, index) => {
      this.state.unitStatuses.set(unit.id, {
        currentHp: unit.stats.hp,
        currentEnergy: unit.stats.energy,
        statusEffects: [],
        cooldowns: new Map(),
        isAlive: true,
        position: index
      })
    })
    
    // Check for element combos
    this.checkElementCombos()
    
    // Calculate initial turn order
    this.calculateTurnOrder()
    
    // Log battle start
    this.addBattleEvent({
      type: 'ability',
      description: '=== BATTLE INITIALIZED ===',
      timestamp: Date.now()
    })
    
    // Log element advantages
    this.logElementAdvantages()
    
    this.state.status = 'active'
  }
  
  private checkElementCombos() {
    // Check player team combos
    const playerElements = this.state.playerTeam.map(u => u.element.toLowerCase())
    const uniquePlayerElements = Array.from(new Set(playerElements))
    
    // Check for dual element combos
    const elementCounts: Record<string, number> = {}
    playerElements.forEach(e => {
      elementCounts[e] = (elementCounts[e] || 0) + 1
    })
    
    Object.entries(elementCounts).forEach(([element, count]) => {
      if (count >= 2) {
        const comboKey = `${element}_${element}`
        const combo = (elements.elementCombos.dual as any)[comboKey]
        if (combo && typeof combo === 'object' && 'name' in combo) {
          this.addBattleEvent({
            type: 'element',
            description: `ELEMENT COMBO: ${combo.name} - ${combo.effect}`,
            element: element.toUpperCase(),
            timestamp: Date.now()
          })
        }
      }
    })
    
    // Check for trinity bonus
    if (uniquePlayerElements.length >= 3) {
      const trinity = elements.elementCombos.trinity
      this.addBattleEvent({
        type: 'element',
        description: `${trinity.name}: ${trinity.effect}`,
        timestamp: Date.now()
      })
    }
  }
  
  private logElementAdvantages() {
    // Log notable element advantages
    this.state.playerTeam.forEach(unit => {
      const advantages = this.state.enemyTeam.filter(enemy => 
        unit.elementModifiers.strongAgainst.includes(enemy.element.toLowerCase())
      )
      
      if (advantages.length > 0) {
        this.addBattleEvent({
          type: 'element',
          description: `${unit.name} (${unit.element}) has advantage vs ${advantages.map(a => a.element).join(', ')}!`,
          element: unit.element,
          timestamp: Date.now()
        })
      }
    })
  }
  
  private calculateTurnOrder() {
    const allUnits = [...this.state.playerTeam, ...this.state.enemyTeam]
    
    // Sort by speed with small random factor for variety
    const sortedUnits = allUnits
      .filter(unit => this.state.unitStatuses.get(unit.id)?.isAlive)
      .sort((a, b) => {
        const aSpeed = a.stats.speed + Math.random() * 10
        const bSpeed = b.stats.speed + Math.random() * 10
        return bSpeed - aSpeed
      })
    
    this.state.turnOrder = sortedUnits.map(unit => unit.id)
    this.state.turnIndex = 0
  }
  
  getCurrentUnit(): BattleUnitV3 | null {
    if (this.state.turnIndex >= this.state.turnOrder.length) {
      return null
    }
    
    const unitId = this.state.turnOrder[this.state.turnIndex]
    const unit = [...this.state.playerTeam, ...this.state.enemyTeam]
      .find(u => u.id === unitId)
    
    return unit || null
  }
  
  getAvailableAbilities(unitId: string): AbilityInstance[] {
    const unit = this.findUnit(unitId)
    if (!unit) return []
    
    const unitStatus = this.state.unitStatuses.get(unitId)
    if (!unitStatus) return []
    
    return unit.abilities.map(abilityId => {
      const abilityData = TraitProcessorV3.getAbilityData(abilityId)
      const cooldown = unitStatus.cooldowns.get(abilityId) || 0
      
      return {
        id: abilityId,
        ability: abilityData,
        currentCooldown: cooldown
      }
    }).filter(a => a.ability) // Filter out any abilities that couldn't be found
  }
  
  canUseAbility(unitId: string, abilityId: string): boolean {
    const unit = this.findUnit(unitId)
    const unitStatus = this.state.unitStatuses.get(unitId)
    const ability = TraitProcessorV3.getAbilityData(abilityId)
    
    if (!unit || !unitStatus || !ability) return false
    
    // Check cooldown
    const cooldown = unitStatus.cooldowns.get(abilityId) || 0
    if (cooldown > 0) return false
    
    // Check energy cost
    if (ability.stats.energyCost > unitStatus.currentEnergy) return false
    
    // Check if it's a once per battle ability
    if (ability.stats.cooldown === 'once_per_battle' && unitStatus.cooldowns.has(abilityId)) {
      return false
    }
    
    return true
  }
  
  executeAbility(sourceId: string, targetId: string | string[], abilityId: string) {
    const source = this.findUnit(sourceId)
    const ability = TraitProcessorV3.getAbilityData(abilityId)
    
    if (!source || !ability) return
    
    const sourceStatus = this.state.unitStatuses.get(sourceId)
    if (!sourceStatus || !sourceStatus.isAlive) return
    
    // Check if ability can be used
    if (!this.canUseAbility(sourceId, abilityId)) {
      this.addBattleEvent({
        type: 'ability',
        source: sourceId,
        description: `${source.name} cannot use ${ability.name}!`,
        timestamp: Date.now()
      })
      return
    }
    
    // Deduct energy
    sourceStatus.currentEnergy -= ability.stats.energyCost
    
    // Set cooldown
    if (ability.stats.cooldown === 'once_per_battle') {
      sourceStatus.cooldowns.set(abilityId, 999)
    } else if (ability.stats.cooldown > 0) {
      sourceStatus.cooldowns.set(abilityId, ability.stats.cooldown)
    }
    
    // Log ability use
    this.addBattleEvent({
      type: 'ability',
      source: sourceId,
      element: ability.element,
      description: `${source.name} uses ${ability.name}!`,
      timestamp: Date.now()
    })
    
    // Execute based on ability type
    switch (ability.type) {
      case 'damage':
        this.executeDamageAbility(source, targetId, ability)
        break
      case 'heal':
        this.executeHealAbility(source, targetId, ability)
        break
      case 'buff':
      case 'defensive':
        this.executeBuffAbility(source, targetId, ability)
        break
      case 'debuff':
        this.executeDebuffAbility(source, targetId, ability)
        break
      case 'field':
        this.executeFieldAbility(source, ability)
        break
      case 'utility':
        this.executeUtilityAbility(source, targetId, ability)
        break
    }
    
    // Process end of turn
    this.nextTurn()
  }
  
  private executeDamageAbility(source: BattleUnitV3, targetId: string | string[], ability: any) {
    const targets = this.resolveTargets(source, targetId, ability.targeting)
    
    targets.forEach(target => {
      const damage = TraitProcessorV3.calculateDamage(source, target, ability)
      
      if (damage === 0) {
        this.addBattleEvent({
          type: 'miss',
          source: source.id,
          target: target.id,
          description: `${source.name}'s attack missed!`,
          timestamp: Date.now()
        })
        return
      }
      
      const targetStatus = this.state.unitStatuses.get(target.id)!
      targetStatus.currentHp -= damage
      
      // Show element effectiveness
      const multiplier = this.getElementMultiplier(ability.element || source.element, target.element)
      let effectiveness = ''
      if (multiplier > 1) effectiveness = ' [SUPER EFFECTIVE!]'
      else if (multiplier < 1) effectiveness = ' [NOT VERY EFFECTIVE]'
      
      this.addBattleEvent({
        type: 'damage',
        source: source.id,
        target: target.id,
        value: damage,
        element: ability.element || source.element,
        description: `${target.name} takes ${damage} damage${effectiveness}`,
        timestamp: Date.now()
      })
      
      // Apply status effects
      if (ability.effects) {
        this.applyAbilityEffects(source, target, ability.effects)
      }
      
      // Check for KO
      if (targetStatus.currentHp <= 0) {
        targetStatus.currentHp = 0
        targetStatus.isAlive = false
        
        this.addBattleEvent({
          type: 'ko',
          target: target.id,
          description: `${target.name} SYSTEM FAILURE!`,
          timestamp: Date.now()
        })
        
        this.checkBattleEnd()
      }
    })
  }
  
  private executeHealAbility(source: BattleUnitV3, targetId: string | string[], ability: any) {
    const targets = this.resolveTargets(source, targetId, ability.targeting)
    
    targets.forEach(target => {
      const targetStatus = this.state.unitStatuses.get(target.id)!
      const healAmount = ability.stats.healPower || 50
      const actualHeal = Math.min(healAmount, target.stats.hp - targetStatus.currentHp)
      
      targetStatus.currentHp += actualHeal
      
      this.addBattleEvent({
        type: 'heal',
        source: source.id,
        target: target.id,
        value: actualHeal,
        description: `${target.name} repairs ${actualHeal} HP!`,
        timestamp: Date.now()
      })
    })
  }
  
  private executeBuffAbility(source: BattleUnitV3, targetId: string | string[], ability: any) {
    const targets = this.resolveTargets(source, targetId, ability.targeting)
    
    targets.forEach(target => {
      const targetStatus = this.state.unitStatuses.get(target.id)!
      
      // Create status effect
      const statusEffect: StatusEffect = {
        id: ability.id,
        name: ability.name,
        element: ability.element,
        duration: ability.stats.duration || 3,
        effect: ability.effects
      }
      
      targetStatus.statusEffects.push(statusEffect)
      
      this.addBattleEvent({
        type: 'buff',
        source: source.id,
        target: target.id,
        element: ability.element,
        description: `${target.name} gains ${ability.name}!`,
        timestamp: Date.now()
      })
    })
  }
  
  private executeDebuffAbility(source: BattleUnitV3, targetId: string | string[], ability: any) {
    const targets = this.resolveTargets(source, targetId, ability.targeting)
    
    targets.forEach(target => {
      const targetStatus = this.state.unitStatuses.get(target.id)!
      
      // Check for debuff immunity
      const hasImmunity = targetStatus.statusEffects.some(e => 
        e.effect.debuff_immunity || e.effect.encrypted
      )
      
      if (hasImmunity) {
        this.addBattleEvent({
          type: 'debuff',
          source: source.id,
          target: target.id,
          description: `${target.name} is protected from debuffs!`,
          timestamp: Date.now()
        })
        return
      }
      
      // Apply debuff
      const statusEffect: StatusEffect = {
        id: ability.id,
        name: ability.name,
        element: ability.element,
        duration: ability.stats.duration || 3,
        effect: ability.effects
      }
      
      targetStatus.statusEffects.push(statusEffect)
      
      this.addBattleEvent({
        type: 'debuff',
        source: source.id,
        target: target.id,
        element: ability.element,
        description: `${target.name} is affected by ${ability.name}!`,
        timestamp: Date.now()
      })
    })
  }
  
  private executeFieldAbility(source: BattleUnitV3, ability: any) {
    const fieldEffect: FieldEffect = {
      id: ability.id,
      name: ability.name,
      duration: ability.stats.duration || 5,
      effect: ability.effects
    }
    
    this.state.fieldEffects.push(fieldEffect)
    
    this.addBattleEvent({
      type: 'ability',
      source: source.id,
      element: ability.element,
      description: `${source.name} creates ${ability.name}!`,
      timestamp: Date.now()
    })
  }
  
  private executeUtilityAbility(source: BattleUnitV3, targetId: string | string[], ability: any) {
    // Handle various utility effects
    if (ability.effects.includes('cleanse')) {
      const targets = this.resolveTargets(source, targetId, ability.targeting)
      targets.forEach(target => {
        const targetStatus = this.state.unitStatuses.get(target.id)!
        targetStatus.statusEffects = targetStatus.statusEffects.filter(e => e.effect.positive)
        
        this.addBattleEvent({
          type: 'ability',
          source: source.id,
          target: target.id,
          description: `${target.name}'s systems cleaned!`,
          timestamp: Date.now()
        })
      })
    }
  }
  
  private resolveTargets(source: BattleUnitV3, targetId: string | string[], targeting: string): BattleUnitV3[] {
    const isPlayerUnit = this.state.playerTeam.some(u => u.id === source.id)
    
    switch (targeting) {
      case 'single':
        const target = this.findUnit(targetId as string)
        return target ? [target] : []
        
      case 'all_enemies':
        return isPlayerUnit ? this.state.enemyTeam : this.state.playerTeam
        
      case 'all_allies':
        return isPlayerUnit ? this.state.playerTeam : this.state.enemyTeam
        
      case 'self':
        return [source]
        
      case 'random':
        const enemies = isPlayerUnit ? this.state.enemyTeam : this.state.playerTeam
        const aliveEnemies = enemies.filter(e => this.state.unitStatuses.get(e.id)?.isAlive)
        return aliveEnemies.length > 0 
          ? [aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)]]
          : []
        
      default:
        return []
    }
  }
  
  private applyAbilityEffects(source: BattleUnitV3, target: BattleUnitV3, effects: any[]) {
    const targetStatus = this.state.unitStatuses.get(target.id)!
    
    effects.forEach(effect => {
      // Apply element-specific status effects
      const elementData = source.element !== 'NEUTRAL' ? elements.elements[source.element] : null
      
      if (effect === 'shocked' && source.element === 'SURGE') {
        const shockedEffect = elements.elements.SURGE.statusEffects.shocked
        targetStatus.statusEffects.push({
          id: 'shocked',
          name: 'Shocked',
          element: 'SURGE',
          duration: shockedEffect.duration,
          effect: shockedEffect
        })
      }
      
      if (effect === 'hacked' && source.element === 'CODE') {
        const hackedEffect = elements.elements.CODE.statusEffects.hacked
        targetStatus.statusEffects.push({
          id: 'hacked',
          name: 'Hacked',
          element: 'CODE',
          duration: hackedEffect.duration,
          effect: hackedEffect
        })
      }
    })
  }
  
  private getElementMultiplier(attackElement: string, defenseElement: string): number {
    const attackKey = attackElement.toLowerCase() as keyof typeof elements.typeChart
    const defenseKey = defenseElement.toLowerCase()
    
    const typeChart = elements.typeChart[attackKey]
    if (!typeChart) return 1.0
    
    return (typeChart as any)[defenseKey] || 1.0
  }
  
  private nextTurn() {
    // Process status effects
    this.processStatusEffects()
    
    // Reduce cooldowns
    this.reduceCooldowns()
    
    // Process field effects
    this.processFieldEffects()
    
    // Energy regeneration
    const currentUnit = this.getCurrentUnit()
    if (currentUnit) {
      const status = this.state.unitStatuses.get(currentUnit.id)!
      const energyRegen = 20
      status.currentEnergy = Math.min(
        status.currentEnergy + energyRegen,
        currentUnit.stats.energy
      )
    }
    
    // Move to next unit
    this.state.turnIndex++
    
    // If we've gone through all units, start a new round
    if (this.state.turnIndex >= this.state.turnOrder.length) {
      this.state.turn++
      this.calculateTurnOrder()
      
      this.addBattleEvent({
        type: 'ability',
        description: `=== TURN ${this.state.turn} ===`,
        timestamp: Date.now()
      })
    }
  }
  
  private processStatusEffects() {
    this.state.unitStatuses.forEach((status, unitId) => {
      const unit = this.findUnit(unitId)
      if (!unit || !status.isAlive) return
      
      status.statusEffects = status.statusEffects.filter(effect => {
        // Process effect
        if (effect.effect.damagePerTurn) {
          status.currentHp -= effect.effect.damagePerTurn
          
          this.addBattleEvent({
            type: 'damage',
            target: unitId,
            value: effect.effect.damagePerTurn,
            description: `${unit.name} takes ${effect.effect.damagePerTurn} damage from ${effect.name}!`,
            timestamp: Date.now()
          })
          
          if (status.currentHp <= 0) {
            status.currentHp = 0
            status.isAlive = false
            
            this.addBattleEvent({
              type: 'ko',
              target: unitId,
              description: `${unit.name} destroyed by ${effect.name}!`,
              timestamp: Date.now()
            })
          }
        }
        
        // Skip turn chance (for shocked)
        if (effect.effect.skipTurnChance && Math.random() < effect.effect.skipTurnChance) {
          this.addBattleEvent({
            type: 'debuff',
            target: unitId,
            description: `${unit.name} is paralyzed and skips turn!`,
            timestamp: Date.now()
          })
          // TODO: Implement turn skipping
        }
        
        // Reduce duration
        effect.duration--
        return effect.duration > 0
      })
    })
  }
  
  private reduceCooldowns() {
    this.state.unitStatuses.forEach(status => {
      status.cooldowns.forEach((cooldown, abilityId) => {
        if (cooldown > 0 && cooldown < 999) { // 999 = once per battle
          status.cooldowns.set(abilityId, cooldown - 1)
          if (cooldown - 1 <= 0) {
            status.cooldowns.delete(abilityId)
          }
        }
      })
    })
  }
  
  private processFieldEffects() {
    this.state.fieldEffects = this.state.fieldEffects.filter(effect => {
      // Process field effect on all units
      if (effect.effect.random_stat_changes) {
        const allUnits = [...this.state.playerTeam, ...this.state.enemyTeam]
        allUnits.forEach(unit => {
          if (this.state.unitStatuses.get(unit.id)?.isAlive) {
            // Random stat changes for chaos field
            // Implementation depends on specific requirements
          }
        })
      }
      
      effect.duration--
      return effect.duration > 0
    })
  }
  
  private applyCompanionBonuses(team: BattleUnitV3[]): BattleUnitV3[] {
    // Find companion pairs (Roboto and Robopet with matching IDs)
    const companionPairs: Map<string, string> = new Map() // tokenId -> battleId
    
    // First, check for matching token IDs between Robotos and Robopets
    const matchingIds: Set<string> = new Set()
    team.forEach(unit1 => {
      team.forEach(unit2 => {
        // Extract the base token ID (without type prefix)
        const id1 = unit1.id.replace(/^(roboto|robopet)-/, '')
        const id2 = unit2.id.replace(/^(roboto|robopet)-/, '')
        if (id1 === id2 && unit1.type !== unit2.type) {
          matchingIds.add(id1)
          companionPairs.set(unit1.id, unit1.id) // Track which units get bonus
          companionPairs.set(unit2.id, unit2.id)
        }
      })
    })
    
    // Apply 2% bonus to units with companions
    return team.map(unit => {
      if (companionPairs.has(unit.id)) {
        // Create a new unit with boosted stats
        const battleUnit = { ...unit }
        battleUnit.stats = { ...unit.stats }
        battleUnit.hasCompanionBonus = true
        
        // Apply 2% boost to all stats
        battleUnit.stats.hp = Math.round(unit.stats.hp * 1.02)
        battleUnit.stats.attack = Math.round(unit.stats.attack * 1.02)
        battleUnit.stats.defense = Math.round(unit.stats.defense * 1.02)
        battleUnit.stats.speed = Math.round(unit.stats.speed * 1.02)
        battleUnit.stats.energy = Math.round(unit.stats.energy * 1.02)
        battleUnit.stats.crit = Math.round(unit.stats.crit * 1.02)
        
        // Log the companion bonus
        this.addBattleEvent({
          type: 'buff',
          description: `${unit.name} gains COMPANION BONUS (+2% all stats)!`,
          timestamp: Date.now()
        })
        
        return battleUnit
      }
      
      return unit
    })
  }

  private checkBattleEnd() {
    const alivePlayerUnits = this.state.playerTeam.filter(
      unit => this.state.unitStatuses.get(unit.id)?.isAlive
    )
    
    const aliveEnemyUnits = this.state.enemyTeam.filter(
      unit => this.state.unitStatuses.get(unit.id)?.isAlive
    )
    
    if (alivePlayerUnits.length === 0) {
      this.state.status = 'defeat'
      this.addBattleEvent({
        type: 'ability',
        description: '=== SYSTEM FAILURE - DEFEAT ===',
        timestamp: Date.now()
      })
    } else if (aliveEnemyUnits.length === 0) {
      this.state.status = 'victory'
      this.addBattleEvent({
        type: 'ability',
        description: '=== VICTORY ACHIEVED ===',
        timestamp: Date.now()
      })
    }
  }
  
  private findUnit(unitId: string): BattleUnitV3 | undefined {
    return [...this.state.playerTeam, ...this.state.enemyTeam]
      .find(u => {
        const battleId = (u as any).battleId || u.id
        return battleId === unitId || u.id === unitId
      })
  }
  
  private addBattleEvent(event: BattleEvent) {
    this.state.battleLog.push(event)
  }
  
  // Simple AI for enemy turns
  executeAITurn() {
    const currentUnit = this.getCurrentUnit()
    if (!currentUnit) return
    
    const isEnemyUnit = this.state.enemyTeam.some(u => u.id === currentUnit.id)
    if (!isEnemyUnit) return
    
    const alivePlayerUnits = this.state.playerTeam.filter(
      unit => this.state.unitStatuses.get(unit.id)?.isAlive
    )
    
    if (alivePlayerUnits.length === 0) return
    
    // Get available abilities
    const availableAbilities = this.getAvailableAbilities(currentUnit.id)
      .filter(a => this.canUseAbility(currentUnit.id, a.id))
    
    if (availableAbilities.length > 0) {
      // Prioritize abilities by element advantage
      const scoredAbilities = availableAbilities.map(ability => {
        let score = 0
        
        // Prefer abilities that match unit's element
        if (ability.ability.element === currentUnit.element) {
          score += 10
        }
        
        // Prefer abilities strong against player units
        const hasAdvantage = alivePlayerUnits.some(player => {
          const multiplier = this.getElementMultiplier(
            ability.ability.element || currentUnit.element,
            player.element
          )
          return multiplier > 1
        })
        
        if (hasAdvantage) score += 20
        
        // Add some randomness
        score += Math.random() * 10
        
        return { ability, score }
      })
      
      // Sort by score and pick the best
      scoredAbilities.sort((a, b) => b.score - a.score)
      const chosenAbility = scoredAbilities[0].ability
      
      // Pick target based on ability type
      let target: string
      if (chosenAbility.ability.targeting === 'single') {
        // Target weakest enemy or one with element disadvantage
        const targetOptions = alivePlayerUnits.map(player => {
          const status = this.state.unitStatuses.get(player.id)!
          const multiplier = this.getElementMultiplier(
            chosenAbility.ability.element || currentUnit.element,
            player.element
          )
          
          return {
            unit: player,
            score: (100 - status.currentHp) + (multiplier > 1 ? 50 : 0)
          }
        })
        
        targetOptions.sort((a, b) => b.score - a.score)
        target = targetOptions[0].unit.id
      } else {
        target = alivePlayerUnits[0].id // Default target
      }
      
      this.executeAbility(currentUnit.id, target, chosenAbility.id)
    } else {
      // Skip turn if no abilities available
      this.nextTurn()
    }
  }

  // Add methods for Phaser integration
  executeAction(action: BattleAction): ActionResult {
    const events: BattleEvent[] = []
    const stateChanges: any[] = []

    switch (action.type) {
      case 'attack':
        return this.executeBasicAttack(action)
      case 'ability':
        return this.executeAbilityAction(action)
      case 'switch':
        return this.executeSwitch(action)
      default:
        return { events, stateChanges }
    }
  }

  private executeBasicAttack(action: BattleAction): ActionResult {
    const events: BattleEvent[] = []
    const attacker = this.findUnit(action.sourceId)
    const target = this.findUnit(action.targetId!)
    
    if (!attacker || !target) {
      return { events, stateChanges: [] }
    }

    const attackerStatus = this.state.unitStatuses.get(attacker.id)!
    const targetStatus = this.state.unitStatuses.get(target.id)!

    // Calculate base damage - make it more substantial
    const baseDamage = Math.max(5, attacker.stats.attack * 2 - target.stats.defense)
    let damage = baseDamage
    
    // Apply element advantage
    const elementMultiplier = this.getElementMultiplier(attacker.element, target.element)
    damage = Math.floor(damage * elementMultiplier)
    
    // Track damage at each step for debugging
    const damageSteps: {
      base: number;
      afterElement: number;
      afterAttackTiming?: number;
      afterDefenseTiming?: number;
    } = {
      base: baseDamage,
      afterElement: damage
    }
    
    // Apply timing bonus (attack timing multiplier)
    if (action.timingBonus) {
      const beforeTiming = damage
      damage = Math.floor(damage * action.timingBonus)
      damageSteps.afterAttackTiming = damage
    }
    
    // Apply defense reduction (defense timing reducer)
    if (action.defenseBonus) {
      const beforeDefense = damage
      damage = Math.floor(damage * action.defenseBonus)
      damageSteps.afterDefenseTiming = damage
    }
    
    
    // Ensure minimum damage is always at least 1
    if (damage < 1) {
      damage = 1
    }

    // Critical hit chance
    const critRoll = Math.random() * 100
    if (critRoll < attacker.stats.crit) {
      damage *= 2
      events.push({
        type: 'buff',
        description: 'Critical hit!',
        timestamp: Date.now()
      })
    }

    // Apply damage
    targetStatus.currentHp = Math.max(0, targetStatus.currentHp - damage)
    
    events.push({
      type: 'damage',
      source: attacker.id,
      target: target.id,
      value: damage,
      element: attacker.element,
      description: `${attacker.name} attacks ${target.name} for ${damage} damage!`,
      timestamp: Date.now()
    })

    // Add extra info for UI
    const damageEvent = events[events.length - 1] as any
    damageEvent.remainingHP = targetStatus.currentHp
    damageEvent.maxHP = target.stats.hp

    // Check for KO
    if (targetStatus.currentHp <= 0) {
      targetStatus.isAlive = false
      events.push({
        type: 'ko',
        target: target.id,
        description: `${target.name} was defeated!`,
        timestamp: Date.now()
      })
      
      // Check battle end
      this.checkBattleEnd()
    }

    // Add to battle log
    events.forEach(event => this.addBattleEvent(event))

    return { events, stateChanges: [] }
  }

  private executeAbilityAction(action: BattleAction): ActionResult {
    // Use the existing executeAbility method
    if (action.abilityId && action.targetId) {
      this.executeAbility(action.sourceId, action.targetId, action.abilityId)
      // Return the last few events from the battle log
      const recentEvents = this.state.battleLog.slice(-3)
      return { events: recentEvents, stateChanges: [] }
    }
    return { events: [], stateChanges: [] }
  }

  private executeSwitch(action: BattleAction): ActionResult {
    const events: BattleEvent[] = []
    events.push({
      type: 'buff',
      description: 'Switched Roboto!',
      timestamp: Date.now()
    })
    this.addBattleEvent(events[0])
    return { events, stateChanges: [] }
  }


  getState(): BattleStateV3 {
    return this.state
  }
}