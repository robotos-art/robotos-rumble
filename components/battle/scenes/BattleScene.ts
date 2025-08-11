import * as Phaser from 'phaser'
import { BattleUnitV3 } from '../../../lib/game-engine/TraitProcessorV3'
import { BattleEngineV3 } from '../../../lib/game-engine/BattleEngineV3'
import { TimingSystem } from '../systems/TimingSystem'
import { BattleUI } from '../ui/BattleUI'
import { RobotoSprite } from '../sprites/RobotoSprite'
import { gameSounds } from '../../../lib/sounds/gameSounds'

interface BattleSceneConfig {
  playerTeam: BattleUnitV3[]
  enemyTeam: BattleUnitV3[]
  onBattleEnd: (won: boolean) => void
}

export class BattleScene extends Phaser.Scene {
  private playerTeam: BattleUnitV3[]
  private enemyTeam: BattleUnitV3[]
  private onBattleEnd: (won: boolean) => void
  
  private battleEngine!: BattleEngineV3
  private timingSystem!: TimingSystem
  private battleUI!: BattleUI
  
  private playerSprites: Map<string, RobotoSprite> = new Map()
  private enemySprites: Map<string, RobotoSprite> = new Map()
  
  private activePlayerIndex = 0
  private activeEnemyIndex = 0
  
  constructor(config: BattleSceneConfig) {
    super({ key: 'BattleScene' })
    this.playerTeam = config.playerTeam
    this.enemyTeam = config.enemyTeam
    this.onBattleEnd = config.onBattleEnd
  }

  preload() {
    // Load default sprite
    this.load.image('default-sprite', '/battle/ui/default-sprite.svg')
    
    // For UI, we'll create them dynamically with Phaser graphics
    // No need to load images for MVP
  }

  create() {
    // Initialize systems
    this.battleEngine = new BattleEngineV3()
    this.timingSystem = new TimingSystem(this)
    this.battleUI = new BattleUI(this)
    
    // Create battle background
    this.add.rectangle(512, 288, 1024, 576, 0x001100)
    
    // Position player team (left side)
    this.playerTeam.forEach((unit, index) => {
      const x = 200
      const y = 100 + (index * 100)
      const sprite = new RobotoSprite(this, x, y, unit, 'player')
      this.playerSprites.set(unit.id, sprite)
      
      // Show only the active unit
      sprite.setVisible(index === this.activePlayerIndex)
    })
    
    // Position enemy team (right side)
    this.enemyTeam.forEach((unit, index) => {
      const x = 824
      const y = 100 + (index * 100)
      const sprite = new RobotoSprite(this, x, y, unit, 'enemy')
      this.enemySprites.set(unit.id, sprite)
      
      // Show only the active unit
      sprite.setVisible(index === this.activeEnemyIndex)
    })
    
    // Initialize battle state
    this.battleEngine.initializeBattle(this.playerTeam, this.enemyTeam)
    
    // Create UI
    this.battleUI.create()
    
    // Play round start sound
    gameSounds.play('roundStart')
    
    // Start the battle
    this.startPlayerTurn()
  }

  private startPlayerTurn() {
    gameSounds.play('turnStart')
    const activeUnit = this.playerTeam[this.activePlayerIndex]
    this.battleUI.showActionMenu(activeUnit, {
      onAttack: () => this.selectTarget(),
      onAbility: (abilityIndex) => this.selectAbilityTarget(abilityIndex),
      onSwitch: () => this.showSwitchMenu()
    })
  }

  private selectTarget() {
    // For MVP, we'll target the active enemy
    gameSounds.play('select')
    const target = this.enemyTeam[this.activeEnemyIndex]
    this.executeAttack(this.playerTeam[this.activePlayerIndex], target)
  }

  private selectAbilityTarget(abilityIndex: number) {
    // Similar to attack, but with ability
    const attacker = this.playerTeam[this.activePlayerIndex]
    const target = this.enemyTeam[this.activeEnemyIndex]
    
    // Get ability data
    const abilityId = attacker.abilities[abilityIndex]
    if (!abilityId) return
    
    this.executeAbility(attacker, target, abilityId)
  }

  private showSwitchMenu() {
    this.battleUI.showSwitchMenu(this.playerTeam, this.activePlayerIndex, (newIndex) => {
      this.switchActive('player', newIndex)
      this.endTurn()
    })
  }

  private async executeAttack(attacker: BattleUnitV3, target: BattleUnitV3) {
    // Hide action menu
    this.battleUI.hideActionMenu()
    
    // Play attack sound
    gameSounds.play('attack')
    
    // Start timing system for attack
    const timingBonus = await this.timingSystem.startAttackTiming()
    
    // Calculate damage with timing bonus
    const result = this.battleEngine.executeAction({
      type: 'attack',
      sourceId: attacker.id,
      targetId: target.id,
      timingBonus
    })
    
    // Play attack animation
    await this.playAttackAnimation(attacker.id, target.id)
    
    // Play damage sound
    gameSounds.play('damage')
    
    // Apply damage
    this.applyBattleResult(result)
    
    // Check for KO
    if (this.checkBattleEnd()) return
    
    // End turn
    this.endTurn()
  }

  private async executeAbility(attacker: BattleUnitV3, target: BattleUnitV3, abilityId: string) {
    // Similar to attack but with ability-specific timing
    this.battleUI.hideActionMenu()
    
    const timingBonus = await this.timingSystem.startAbilityTiming(abilityId)
    
    const result = this.battleEngine.executeAction({
      type: 'ability',
      sourceId: attacker.id,
      targetId: target.id,
      abilityId,
      timingBonus
    })
    
    await this.playAbilityAnimation(attacker.id, target.id, abilityId)
    this.applyBattleResult(result)
    
    if (this.checkBattleEnd()) return
    this.endTurn()
  }

  private switchActive(team: 'player' | 'enemy', newIndex: number) {
    // Play switch sound
    gameSounds.play('unitSwitch')
    
    if (team === 'player') {
      // Hide current active
      const currentSprite = this.playerSprites.get(this.playerTeam[this.activePlayerIndex].id)
      currentSprite?.setVisible(false)
      
      // Show new active
      this.activePlayerIndex = newIndex
      const newSprite = this.playerSprites.get(this.playerTeam[newIndex].id)
      newSprite?.setVisible(true)
    } else {
      // Similar for enemy
      const currentSprite = this.enemySprites.get(this.enemyTeam[this.activeEnemyIndex].id)
      currentSprite?.setVisible(false)
      
      this.activeEnemyIndex = newIndex
      const newSprite = this.enemySprites.get(this.enemyTeam[newIndex].id)
      newSprite?.setVisible(true)
    }
  }

  private async playAttackAnimation(attackerId: string, targetId: string) {
    const attackerSprite = this.playerSprites.get(attackerId) || this.enemySprites.get(attackerId)
    const targetSprite = this.playerSprites.get(targetId) || this.enemySprites.get(targetId)
    
    if (!attackerSprite || !targetSprite) return
    
    // Simple attack animation
    await attackerSprite.playAttack()
    await targetSprite.playHit()
  }

  private async playAbilityAnimation(attackerId: string, targetId: string, abilityId: string) {
    // Placeholder for ability-specific animations
    await this.playAttackAnimation(attackerId, targetId)
  }

  private applyBattleResult(result: any) {
    // Update HP bars and show damage numbers
    result.events.forEach((event: any) => {
      if (event.type === 'damage') {
        const targetSprite = this.playerSprites.get(event.target) || this.enemySprites.get(event.target)
        if (targetSprite) {
          targetSprite.updateHP(event.remainingHP, event.maxHP)
          this.battleUI.showDamageNumber(targetSprite.x, targetSprite.y, event.value)
        }
      }
    })
    
    // Update battle log
    this.battleUI.updateBattleLog(result.events)
  }

  private checkBattleEnd(): boolean {
    const state = this.battleEngine.getState()
    
    if (state.status === 'victory') {
      this.showVictory()
      return true
    } else if (state.status === 'defeat') {
      this.showDefeat()
      return true
    }
    
    return false
  }

  private endTurn() {
    // Simple turn switching for MVP
    // In full implementation, this would handle speed-based turn order
    gameSounds.play('turnEnd')
    this.startEnemyTurn()
  }

  private async startEnemyTurn() {
    // Simple AI: always attack
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const attacker = this.enemyTeam[this.activeEnemyIndex]
    const target = this.playerTeam[this.activePlayerIndex]
    
    // Give player chance to defend
    const defenseBonus = await this.timingSystem.startDefenseTiming()
    
    const result = this.battleEngine.executeAction({
      type: 'attack',
      sourceId: attacker.id,
      targetId: target.id,
      defenseBonus
    })
    
    await this.playAttackAnimation(attacker.id, target.id)
    this.applyBattleResult(result)
    
    if (this.checkBattleEnd()) return
    
    // Back to player turn
    this.startPlayerTurn()
  }

  private showVictory() {
    gameSounds.play('victory')
    this.battleUI.showVictoryScreen()
    setTimeout(() => this.onBattleEnd(true), 3000)
  }

  private showDefeat() {
    gameSounds.play('defeat')
    this.battleUI.showDefeatScreen()
    setTimeout(() => this.onBattleEnd(false), 3000)
  }
}