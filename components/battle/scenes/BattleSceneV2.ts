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

interface TeamLayout {
  x: number
  y: number
  spacing: number
  angle: number // For formation angle
}

export class BattleSceneV2 extends Phaser.Scene {
  private playerTeam: BattleUnitV3[]
  private enemyTeam: BattleUnitV3[]
  private onBattleEnd: (won: boolean) => void
  
  private battleEngine!: BattleEngineV3
  private timingSystem!: TimingSystem
  private battleUI!: BattleUI
  
  private playerSprites: Map<string, RobotoSprite> = new Map()
  private enemySprites: Map<string, RobotoSprite> = new Map()
  
  // Target selection
  private selectingTarget = false
  private validTargets: string[] = []
  private selectedTarget: string | null = null
  private targetIndicators: Phaser.GameObjects.Graphics[] = []
  
  // Current acting unit
  private currentActingUnit: BattleUnitV3 | null = null
  private pendingAction: { type: 'attack' | 'ability', abilityId?: string } | null = null
  
  // Team layouts - will be calculated based on screen size
  private playerLayout: TeamLayout = {
    x: 0,
    y: 0,
    spacing: 0,
    angle: -15
  }
  
  private enemyLayout: TeamLayout = {
    x: 0,
    y: 0,
    spacing: 0,
    angle: 15
  }
  
  // Layout mode based on screen orientation
  private layoutMode: 'landscape' | 'portrait' = 'landscape'
  
  // Base sprite size
  private readonly BASE_SPRITE_SIZE = 120
  private readonly SPRITE_PADDING = 20
  
  constructor(config: BattleSceneConfig) {
    super({ key: 'BattleSceneV2' })
    this.playerTeam = config.playerTeam
    this.enemyTeam = config.enemyTeam
    this.onBattleEnd = config.onBattleEnd
  }

  preload() {
    // Load sprites and UI elements
    this.load.image('default-sprite', '/battle/ui/default-sprite.svg')
    this.load.image('target-arrow', '/battle/ui/target-arrow.svg')
    this.load.image('glow-effect', '/battle/ui/glow.png')
  }

  create() {
    // Initialize systems
    this.battleEngine = new BattleEngineV3()
    this.timingSystem = new TimingSystem(this)
    this.battleUI = new BattleUI(this)
    
    // Calculate responsive layouts based on screen size
    this.calculateLayouts()
    
    // Create battle background with gradient
    this.createBackground()
    
    // Create containers for teams to ensure proper layering and containment
    const playerContainer = this.add.container(0, 0)
    const enemyContainer = this.add.container(0, 0)
    
    // Position all player team members (left side)
    this.createTeamFormation(this.playerTeam, this.playerLayout, 'player')
    
    // Position all enemy team members (right side)
    this.createTeamFormation(this.enemyTeam, this.enemyLayout, 'enemy')
    
    // Initialize battle state
    this.battleEngine.initializeBattle(this.playerTeam, this.enemyTeam)
    
    // Create UI
    this.battleUI.create()
    
    // Create target selection system
    this.createTargetSelectionSystem()
    
    // Listen for resize events
    this.scale.on('resize', this.handleResize, this)
    
    // Play round start sound
    gameSounds.play('roundStart')
    
    // Start the battle
    this.startNextTurn()
  }
  
  private calculateLayouts() {
    const width = this.scale.width
    const height = this.scale.height
    
    // Determine layout mode based on aspect ratio
    this.layoutMode = width > height * 1.2 ? 'landscape' : 'portrait'
    
    if (this.layoutMode === 'landscape') {
      // LANDSCAPE: Teams on left and right sides
      this.calculateLandscapeLayout(width, height)
    } else {
      // PORTRAIT: Enemy team on top, player team on bottom
      this.calculatePortraitLayout(width, height)
    }
  }
  
  private calculateLandscapeLayout(width: number, height: number) {
    // Reserve space for UI elements
    const uiHeight = 120 // Space for battle log at bottom
    const availableHeight = height - uiHeight
    
    // Calculate sprite size with better spacing
    const spriteSize = Math.min(
      availableHeight / 3.5, // Height for 2 rows with good spacing
      width / 12, // Width constraint for both teams
      140 // Max sprite size
    )
    const finalSpriteSize = Math.max(80, spriteSize) // Min size
    
    // Center the formations vertically (accounting for UI at bottom)
    const centerY = (height - uiHeight) / 2
    
    // Position teams with more space from edges
    const margin = width * 0.15 // 15% margin from edges
    
    // Player team on left - pyramid formation
    this.playerLayout = {
      x: margin,
      y: centerY,
      spacing: 0, // We'll use custom positioning
      angle: 0
    }
    
    // Enemy team on right - pyramid formation (mirrored)
    this.enemyLayout = {
      x: width - margin,
      y: centerY,
      spacing: 0, // We'll use custom positioning
      angle: 0
    }
  }
  
  private calculatePortraitLayout(width: number, height: number) {
    // Calculate sprite size for portrait mode
    const maxSpriteSize = Math.min(
      (width - 40) / 5, // 5 sprites horizontally with padding
      (height * 0.35) / 3, // Don't take more than 35% of height per team
      100 // Smaller max in portrait
    )
    const spriteSize = Math.max(60, maxSpriteSize)
    
    // Horizontal spacing between sprites
    const spacing = spriteSize + this.SPRITE_PADDING
    
    // Calculate starting X position to center the team
    const totalWidth = spacing * 4 + spriteSize
    const startX = (width - totalWidth) / 2 + spriteSize / 2
    
    // Vertical positioning
    const verticalMargin = height * 0.1
    
    // Enemy team on top
    this.enemyLayout = {
      x: startX,
      y: verticalMargin + spriteSize / 2,
      spacing: spacing,
      angle: 0
    }
    
    // Player team on bottom
    this.playerLayout = {
      x: startX,
      y: height - verticalMargin - spriteSize / 2,
      spacing: spacing,
      angle: 0
    }
  }
  
  private handleResize(gameSize: any) {
    // Recalculate layouts on resize
    this.calculateLayouts()
    
    // Reposition all sprites
    this.repositionAllSprites()
    
    // Update background
    this.createBackground()
  }
  
  private repositionAllSprites() {
    // Clear all sprites and recreate with new layout
    this.playerSprites.forEach(sprite => {
      // Remove all event listeners before destroying
      sprite.removeAllListeners()
      sprite.destroy()
    })
    this.enemySprites.forEach(sprite => {
      // Remove all event listeners before destroying
      sprite.removeAllListeners()
      sprite.destroy()
    })
    this.playerSprites.clear()
    this.enemySprites.clear()
    
    // Clear any active glow effects
    this.children.list
      .filter(child => child.getData && child.getData('glowEffect'))
      .forEach(child => {
        const glow = child.getData('glowEffect')
        if (glow) glow.destroy()
      })
    
    // Recreate sprites with new positions
    this.createTeamFormation(this.playerTeam, this.playerLayout, 'player')
    this.createTeamFormation(this.enemyTeam, this.enemyLayout, 'enemy')
    
    // Re-highlight active unit if there is one
    if (this.currentActingUnit) {
      this.highlightActiveUnit(this.currentActingUnit)
    }
  }
  
  private createBackground() {
    // Clear any existing background
    this.children.list
      .filter(child => child.name === 'background')
      .forEach(child => child.destroy())
    
    const graphics = this.add.graphics()
    graphics.name = 'background'
    
    const width = this.scale.width
    const height = this.scale.height
    
    // Dark green to black gradient
    const color1 = 0x001100
    const color2 = 0x000000
    
    graphics.fillGradientStyle(color1, color1, color2, color2, 1, 1, 0, 0)
    graphics.fillRect(0, 0, width, height)
    
    // Add subtle grid lines for retro feel
    graphics.lineStyle(1, 0x00ff00, 0.05)
    const gridSize = Math.max(40, Math.min(width, height) * 0.05) // Responsive grid size with constraints
    
    for (let x = 0; x < width; x += gridSize) {
      graphics.moveTo(x, 0)
      graphics.lineTo(x, height)
    }
    for (let y = 0; y < height; y += gridSize) {
      graphics.moveTo(0, y)
      graphics.lineTo(width, y)
    }
  }
  
  private createTeamFormation(team: BattleUnitV3[], layout: TeamLayout, side: 'player' | 'enemy') {
    const isPortrait = this.layoutMode === 'portrait'
    
    // Create a container for this team to ensure proper bounds
    const teamContainer = this.add.container(0, 0)
    
    // Get sprite size for spacing calculations
    const spriteScale = this.getSpriteScale()
    const scaledSpriteSize = 120 * spriteScale
    
    team.forEach((unit, index) => {
      let x: number, y: number
      
      if (isPortrait) {
        // Portrait: sprites arranged horizontally
        x = layout.x + (index * layout.spacing)
        y = layout.y
      } else {
        // Landscape: pyramid formation (3-2 arrangement)
        const positions = this.getPyramidPosition(index, layout, side, scaledSpriteSize)
        x = positions.x
        y = positions.y
      }
      
      // Debug: Show sprite positions
      if (false) { // Set to true to see debug bounds
        const debug = this.add.graphics()
        debug.lineStyle(2, 0xff0000, 0.5)
        debug.strokeRect(x - scaledSpriteSize/2, y - scaledSpriteSize/2, scaledSpriteSize, scaledSpriteSize)
        debug.setDepth(200)
      }
      
      // Create sprite
      const sprite = new RobotoSprite(this, x, y, unit, side)
      
      // Add to appropriate sprite map
      if (side === 'player') {
        this.playerSprites.set(unit.id, sprite)
      } else {
        this.enemySprites.set(unit.id, sprite)
      }
      
      // Apply scale
      sprite.setScale(spriteScale)
      
      // Add to team container
      teamContainer.add(sprite)
      
      // Add subtle idle animation with varied timing
      const baseDelay = index * 300
      this.tweens.add({
        targets: sprite,
        y: y - 8,
        duration: 2000 + (index * 100),
        delay: baseDelay,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut'
      })
      
      // Set up interaction
      this.setupSpriteInteraction(sprite, unit)
    })
  }
  
  private getPyramidPosition(index: number, layout: TeamLayout, side: 'player' | 'enemy', spriteSize: number): {x: number, y: number} {
    const horizontalSpacing = spriteSize * 1.3
    const verticalSpacing = spriteSize * 1.1
    
    // Check team size from battle settings
    const savedSettings = localStorage.getItem('battle_settings')
    const teamSize = savedSettings ? JSON.parse(savedSettings).teamSize : 5
    
    let row: number, col: number
    
    if (teamSize === 3) {
      // Triangle formation for 3v3: 2 in back, 1 in front
      // Back row: indices 0, 1
      // Front row: index 2
      if (index < 2) {
        // Back row
        row = 0
        col = index - 0.5 // -0.5, 0.5 (centered)
      } else {
        // Front row
        row = 1
        col = 0 // Centered
      }
    } else {
      // Pyramid formation for 5v5: 3 in back, 2 in front
      // Back row: indices 0, 1, 2
      // Front row: indices 3, 4
      if (index < 3) {
        // Back row
        row = 0
        col = index - 1 // -1, 0, 1 (centered)
      } else {
        // Front row
        row = 1
        col = (index - 3) - 0.5 // -0.5, 0.5 (centered between back row)
      }
    }
    
    // Mirror formation for enemy team
    const mirrorMultiplier = side === 'enemy' ? -1 : 1
    
    // Calculate vertical offset to center the formation
    // Total height is about 1 row spacing
    const formationHeight = verticalSpacing
    const verticalOffset = -formationHeight / 2
    
    // Calculate position
    const x = layout.x + (col * horizontalSpacing * mirrorMultiplier)
    const y = layout.y + (row * verticalSpacing) + verticalOffset
    
    return { x, y }
  }
  
  private getSpriteScale(): number {
    // Calculate the actual sprite size we determined in layout
    const width = this.scale.width
    const height = this.scale.height
    
    if (this.layoutMode === 'portrait') {
      const maxSpriteSize = Math.min(
        (width - 40) / 5,
        (height * 0.35) / 3,
        100
      )
      return Math.max(60, maxSpriteSize) / this.BASE_SPRITE_SIZE
    } else {
      // Landscape mode - match the layout calculation
      const uiHeight = 120
      const availableHeight = height - uiHeight
      
      const spriteSize = Math.min(
        availableHeight / 3.5,
        width / 12,
        140
      )
      return Math.max(80, spriteSize) / this.BASE_SPRITE_SIZE
    }
  }
  
  private setupSpriteInteraction(sprite: RobotoSprite, unit: BattleUnitV3) {
    // Fix interactive area for proper clicking
    const scale = sprite.scale
    const hitSize = this.BASE_SPRITE_SIZE * scale
    const hitArea = new Phaser.Geom.Rectangle(-hitSize/2, -hitSize/2, hitSize, hitSize)
    sprite.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains)
    
    // Add hover effects
    sprite.on('pointerover', () => {
      if (this.selectingTarget && this.validTargets.includes(unit.id)) {
        this.onUnitHover(unit, sprite)
        if (this.input && this.input.manager) {
          this.input.setDefaultCursor('pointer')
        }
      }
    })
    
    sprite.on('pointerout', () => {
      this.onUnitOut(unit, sprite)
      if (this.input && this.input.manager) {
        this.input.setDefaultCursor('default')
      }
    })
    
    sprite.on('pointerdown', () => {
      if (this.selectingTarget && this.validTargets.includes(unit.id)) {
        this.onUnitClick(unit)
      }
    })
  }
  
  private createTargetSelectionSystem() {
    // Create targeting indicators (arrows/highlights)
    for (let i = 0; i < 10; i++) {
      const indicator = this.add.graphics()
      indicator.setVisible(false)
      this.targetIndicators.push(indicator)
    }
    
    // Keyboard controls for target selection
    this.input.keyboard?.on('keydown-UP', () => this.navigateTargets(-1))
    this.input.keyboard?.on('keydown-DOWN', () => this.navigateTargets(1))
    this.input.keyboard?.on('keydown-SPACE', () => this.confirmTarget())
    this.input.keyboard?.on('keydown-ENTER', () => this.confirmTarget())
    this.input.keyboard?.on('keydown-ESC', () => this.cancelTargeting())
  }
  
  private startNextTurn() {
    // Check battle state first
    const state = this.battleEngine.getState()
    if (state.status !== 'active') {
      return
    }
    
    const currentUnit = this.battleEngine.getCurrentUnit()
    if (!currentUnit) {
      // No current unit means we need a new round
      // This should be handled by the battle engine after actions
      return
    }
    
    this.currentActingUnit = currentUnit
    
    // Highlight current unit
    this.highlightActiveUnit(currentUnit)
    
    // Check if it's a player or enemy turn
    const isPlayerUnit = this.playerTeam.some(u => u.id === currentUnit.id)
    
    if (isPlayerUnit) {
      this.startPlayerTurn(currentUnit)
    } else {
      this.startEnemyTurn(currentUnit)
    }
  }
  
  private getBaseScale(): number {
    const width = this.scale.width
    const height = this.scale.height
    const minScale = 0.5
    const maxScale = 1.2
    const idealScale = Math.min(width / 1920, height / 1080)
    return Math.max(minScale, Math.min(maxScale, idealScale))
  }
  
  private highlightActiveUnit(unit: BattleUnitV3) {
    const normalScale = this.getSpriteScale()
    
    // Reset all highlights
    this.playerSprites.forEach(sprite => {
      this.tweens.killTweensOf(sprite)
      sprite.setScale(normalScale)
      // Remove any existing glow effects
      const glow = sprite.getData('glowEffect')
      if (glow) {
        glow.destroy()
        sprite.setData('glowEffect', null)
      }
    })
    this.enemySprites.forEach(sprite => {
      this.tweens.killTweensOf(sprite)
      sprite.setScale(normalScale)
      // Remove any existing glow effects
      const glow = sprite.getData('glowEffect')
      if (glow) {
        glow.destroy()
        sprite.setData('glowEffect', null)
      }
    })
    
    // Highlight active unit
    const sprite = this.playerSprites.get(unit.id) || this.enemySprites.get(unit.id)
    if (sprite) {
      // Make active unit larger and add glow
      sprite.setScale(normalScale * 1.2)
      
      // Add pulsing glow effect
      const glowGraphics = this.add.graphics()
      glowGraphics.lineStyle(4, 0xffff00, 0.8)
      glowGraphics.strokeCircle(sprite.x, sprite.y, 80 * normalScale)
      
      this.tweens.add({
        targets: glowGraphics,
        alpha: 0.3,
        duration: 600,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut'
      })
      
      // Store reference to remove later
      sprite.setData('glowEffect', glowGraphics)
    }
  }
  
  private startPlayerTurn(unit: BattleUnitV3) {
    gameSounds.play('turnStart')
    
    this.battleUI.showActionMenu(unit, {
      onAttack: () => this.initiateAttack(),
      onAbility: (abilityIndex) => this.initiateAbility(abilityIndex),
      onSwitch: () => this.showSwitchMenu()
    })
  }
  
  private startEnemyTurn(unit: BattleUnitV3) {
    // AI turn - execute after a short delay
    this.time.delayedCall(1000, () => {
      // Get the last battle log entries before and after AI turn
      const logBefore = this.battleEngine.getState().battleLog.length
      
      this.battleEngine.executeAITurn()
      
      // Check for new battle events and display attack name
      const logAfter = this.battleEngine.getState().battleLog
      if (logAfter.length > logBefore) {
        const newEvents = logAfter.slice(logBefore)
        // Find the attack/ability event
        const attackEvent = newEvents.find(e => 
          e.type === 'ability' && e.description.includes('uses')
        )
        
        if (attackEvent) {
          // Display the attack name as floating text
          this.showAttackName(attackEvent.description)
        }
      }
      
      // The AI turn should handle everything including advancing turns
      // Just check if battle ended
      if (!this.checkBattleEnd()) {
        // Wait a bit then check for next turn
        this.time.delayedCall(500, () => this.startNextTurn())
      }
    })
  }
  
  private showAttackName(message: string) {
    // Create floating text in the center of the screen
    const centerX = this.cameras.main.centerX
    const centerY = this.cameras.main.centerY - 100
    
    const attackText = this.add.text(centerX, centerY, message, {
      fontSize: '28px',
      fontFamily: 'monospace',
      color: '#00ff00',
      stroke: '#000000',
      strokeThickness: 4,
      align: 'center'
    }).setOrigin(0.5)
    
    // Add glow effect
    attackText.setShadow(0, 0, '#00ff00', 10, true, true)
    
    // Animate the text
    this.tweens.add({
      targets: attackText,
      y: centerY - 30,
      alpha: { from: 1, to: 0 },
      duration: 2000,
      ease: 'Power2',
      onComplete: () => {
        attackText.destroy()
      }
    })
    
    // Also add a scale effect
    this.tweens.add({
      targets: attackText,
      scaleX: { from: 0.8, to: 1.1 },
      scaleY: { from: 0.8, to: 1.1 },
      duration: 300,
      ease: 'Back.out'
    })
  }
  
  private initiateAttack() {
    this.pendingAction = { type: 'attack' }
    this.startTargetSelection('enemy')
  }
  
  private initiateAbility(abilityIndex: number) {
    const abilityId = this.currentActingUnit?.abilities[abilityIndex]
    if (abilityId) {
      this.pendingAction = { type: 'ability', abilityId }
      // TODO: Check ability targeting type
      this.startTargetSelection('enemy')
    }
  }
  
  private startTargetSelection(targetTeam: 'player' | 'enemy' | 'all') {
    this.selectingTarget = true
    this.battleUI.hideActionMenu()
    
    // Determine valid targets
    const state = this.battleEngine.getState()
    if (targetTeam === 'enemy') {
      this.validTargets = this.enemyTeam
        .filter(unit => state.unitStatuses.get(unit.id)?.isAlive)
        .map(unit => unit.id)
    } else if (targetTeam === 'player') {
      this.validTargets = this.playerTeam
        .filter(unit => state.unitStatuses.get(unit.id)?.isAlive)
        .map(unit => unit.id)
    }
    
    // Highlight valid targets
    this.highlightValidTargets()
    
    // Select first valid target
    if (this.validTargets.length > 0) {
      this.selectedTarget = this.validTargets[0]
      this.updateTargetIndicator()
    }
    
    // Show targeting UI
    this.battleUI.showTargetingHint()
  }
  
  private highlightValidTargets() {
    // Don't use transparency - use visual indicators instead
    const baseScale = this.getBaseScale()
    
    // Add target indicators for valid targets
    this.validTargets.forEach((targetId, index) => {
      const sprite = this.playerSprites.get(targetId) || this.enemySprites.get(targetId)
      if (sprite && index < this.targetIndicators.length) {
        const indicator = this.targetIndicators[index]
        indicator.setVisible(true)
        indicator.clear()
        
        // Draw a glowing circle around valid targets
        indicator.lineStyle(3, 0x00ff00, 0.8)
        indicator.strokeCircle(sprite.x, sprite.y, 60 * baseScale)
        
        // Add pulsing effect to the indicator
        this.tweens.add({
          targets: indicator,
          alpha: 0.3,
          duration: 800,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.inOut'
        })
      }
    })
  }
  
  private updateTargetIndicator() {
    const baseScale = this.getBaseScale()
    
    if (!this.selectedTarget) return
    
    // Get target sprite
    const sprite = this.playerSprites.get(this.selectedTarget) || this.enemySprites.get(this.selectedTarget)
    if (!sprite) return
    
    // Find the main selection indicator
    const mainIndicator = this.targetIndicators[this.targetIndicators.length - 1]
    mainIndicator.setVisible(true)
    mainIndicator.clear()
    
    // Draw thick selection box
    mainIndicator.lineStyle(4, 0xffff00, 1)
    const size = 70 * baseScale
    mainIndicator.strokeRect(
      sprite.x - size,
      sprite.y - size,
      size * 2,
      size * 2
    )
    
    // Add corner accents
    const cornerSize = 15 * baseScale
    mainIndicator.lineStyle(6, 0xffff00, 1)
    
    // Top-left corner
    mainIndicator.moveTo(sprite.x - size, sprite.y - size + cornerSize)
    mainIndicator.lineTo(sprite.x - size, sprite.y - size)
    mainIndicator.lineTo(sprite.x - size + cornerSize, sprite.y - size)
    
    // Top-right corner
    mainIndicator.moveTo(sprite.x + size - cornerSize, sprite.y - size)
    mainIndicator.lineTo(sprite.x + size, sprite.y - size)
    mainIndicator.lineTo(sprite.x + size, sprite.y - size + cornerSize)
    
    // Add bouncing arrow above target
    const arrowY = sprite.y - size - 30
    this.tweens.add({
      targets: { y: arrowY },
      y: arrowY - 10,
      duration: 500,
      yoyo: true,
      repeat: -1,
      onUpdate: (tween) => {
        const y = tween.getValue()
        if (y === null) return
        
        mainIndicator.clear()
        
        // Redraw box
        mainIndicator.lineStyle(4, 0xffff00, 1)
        mainIndicator.strokeRect(sprite.x - size, sprite.y - size, size * 2, size * 2)
        
        // Draw arrow
        mainIndicator.fillStyle(0xffff00, 1)
        mainIndicator.fillTriangle(
          sprite.x, y,
          sprite.x - 10, y - 15,
          sprite.x + 10, y - 15
        )
      }
    })
  }
  
  private navigateTargets(direction: number) {
    if (!this.selectingTarget || this.validTargets.length === 0) return
    
    const currentIndex = this.validTargets.indexOf(this.selectedTarget || '')
    let newIndex = currentIndex + direction
    
    // Wrap around
    if (newIndex < 0) newIndex = this.validTargets.length - 1
    if (newIndex >= this.validTargets.length) newIndex = 0
    
    this.selectedTarget = this.validTargets[newIndex]
    this.updateTargetIndicator()
    
    gameSounds.play('menuNavigate')
  }
  
  private confirmTarget() {
    if (!this.selectingTarget || !this.selectedTarget || !this.pendingAction) return
    
    gameSounds.play('select')
    
    // Execute the pending action
    if (this.pendingAction.type === 'attack') {
      this.executeAttack(this.currentActingUnit!, this.selectedTarget)
    } else if (this.pendingAction.type === 'ability' && this.pendingAction.abilityId) {
      this.executeAbility(this.currentActingUnit!, this.selectedTarget, this.pendingAction.abilityId)
    }
    
    this.endTargeting()
  }
  
  private cancelTargeting() {
    if (!this.selectingTarget) return
    
    gameSounds.play('cancel')
    this.endTargeting()
    
    // Show action menu again
    if (this.currentActingUnit) {
      this.startPlayerTurn(this.currentActingUnit)
    }
  }
  
  private endTargeting() {
    this.selectingTarget = false
    this.selectedTarget = null
    this.pendingAction = null
    
    // Hide all indicators
    this.targetIndicators.forEach(indicator => {
      this.tweens.killTweensOf(indicator)
      indicator.clear()
      indicator.setVisible(false)
    })
    
    // Reset cursor
    if (this.input && this.input.manager) {
      this.input.setDefaultCursor('default')
    }
    
    this.battleUI.hideTargetingHint()
  }
  
  private onUnitHover(unit: BattleUnitV3, sprite: RobotoSprite) {
    if (!this.selectingTarget) return
    if (!this.validTargets.includes(unit.id)) return
    
    // Update selection
    this.selectedTarget = unit.id
    this.updateTargetIndicator()
  }
  
  private onUnitOut(unit: BattleUnitV3, sprite: RobotoSprite) {
    // Could add hover out effects here
  }
  
  private onUnitClick(unit: BattleUnitV3) {
    if (!this.selectingTarget) return
    if (!this.validTargets.includes(unit.id)) return
    
    // Select and confirm
    this.selectedTarget = unit.id
    this.confirmTarget()
  }
  
  private async executeAttack(attacker: BattleUnitV3, targetId: string) {
    const target = this.findUnit(targetId)
    if (!target) {
      return
    }
    
    // Play attack sound
    gameSounds.play('attack')
    
    // Get sprites
    const attackerSprite = this.playerSprites.get(attacker.id) || this.enemySprites.get(attacker.id)
    const targetSprite = this.playerSprites.get(target.id) || this.enemySprites.get(target.id)
    
    // Simple attack animation
    if (attackerSprite) {
      const isPlayerUnit = this.playerTeam.some(u => u.id === attacker.id)
      const moveDistance = isPlayerUnit ? 30 : -30
      
      // Move forward
      await this.tweenPromise({
        targets: attackerSprite,
        x: attackerSprite.x + moveDistance,
        duration: 150,
        ease: 'Power2'
      })
      
      // Move back
      await this.tweenPromise({
        targets: attackerSprite,
        x: attackerSprite.x,
        duration: 150,
        ease: 'Power2'
      })
    }
    
    // Skip timing for now - just use base damage
    const timingBonus = 1.0
    
    // Execute attack through battle engine
    const result = this.battleEngine.executeAction({
      type: 'attack',
      sourceId: attacker.id,
      targetId: target.id,
      timingBonus
    })
    
    // Show damage effect on target
    if (targetSprite) {
      // Flash red
      this.flashSprite(targetSprite, 0xff0000, 3, 100)
      
      // Shake
      this.shakeSprite(targetSprite, 8, 200)
      
      // Show damage number
      if (result.events && result.events.length > 0) {
        const damageEvent = result.events.find(e => e.type === 'damage')
        if (damageEvent && damageEvent.value) {
          this.showDamageNumber(targetSprite.x, targetSprite.y, damageEvent.value)
        }
      }
    }
    
    // Play damage sound
    gameSounds.play('damage')
    
    // Update HP bars and check for KO
    this.applyBattleResult(result)
    
    // Small delay before next turn
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Check for battle end
    if (this.checkBattleEnd()) return
    
    // Continue to next turn
    this.startNextTurn()
  }
  
  private async executeAbility(attacker: BattleUnitV3, targetId: string, abilityId: string) {
    // Similar to attack but with ability-specific animations
    this.battleUI.hideActionMenu()
    
    const timingBonus = await this.timingSystem.startAbilityTiming(abilityId)
    
    const result = this.battleEngine.executeAction({
      type: 'ability',
      sourceId: attacker.id,
      targetId: targetId,
      abilityId,
      timingBonus
    })
    
    // Play ability animation
    await this.playAbilityAnimation(attacker.id, targetId, abilityId)
    
    this.applyBattleResult(result)
    
    if (this.checkBattleEnd()) return
    this.startNextTurn()
  }
  
  private showSwitchMenu() {
    // For now, switching isn't implemented in 5v5 mode
    // Could implement later if needed
    gameSounds.play('cancel')
  }
  
  private flashSprite(sprite: RobotoSprite, color: number, times: number, duration: number) {
    // Since RobotoSprite is a container, we'll use alpha flashing instead
    let count = 0
    
    const flash = () => {
      sprite.setAlpha(count % 2 === 0 ? 0.5 : 1)
      count++
      
      if (count < times * 2) {
        this.time.delayedCall(duration / (times * 2), flash)
      } else {
        sprite.setAlpha(1)
      }
    }
    
    flash()
  }
  
  private shakeSprite(sprite: RobotoSprite, intensity: number, duration: number) {
    const originalX = sprite.x
    const originalY = sprite.y
    
    this.tweens.add({
      targets: sprite,
      x: originalX + Phaser.Math.Between(-intensity, intensity),
      y: originalY + Phaser.Math.Between(-intensity, intensity),
      duration: 50,
      repeat: duration / 50,
      yoyo: true,
      onComplete: () => {
        sprite.x = originalX
        sprite.y = originalY
      }
    })
  }
  
  private tweenPromise(config: Phaser.Types.Tweens.TweenBuilderConfig): Promise<void> {
    return new Promise(resolve => {
      this.tweens.add({
        ...config,
        onComplete: () => resolve()
      })
    })
  }
  
  private findUnit(unitId: string): BattleUnitV3 | undefined {
    return [...this.playerTeam, ...this.enemyTeam].find(u => u.id === unitId)
  }
  
  private applyBattleResult(result: any) {
    // Update HP bars and other UI elements
    this.battleUI.updateBattleState(this.battleEngine.getState())
    
    // Update sprite states (KO, etc)
    const state = this.battleEngine.getState()
    state.unitStatuses.forEach((status, unitId) => {
      if (!status.isAlive) {
        const sprite = this.playerSprites.get(unitId) || this.enemySprites.get(unitId)
        if (sprite) {
          // Mark as defeated with reduced opacity
          sprite.setAlpha(0.3)
        }
      }
    })
  }
  
  private checkBattleEnd(): boolean {
    const state = this.battleEngine.getState()
    
    if (state.status === 'victory') {
      this.handleVictory()
      return true
    } else if (state.status === 'defeat') {
      this.handleDefeat()
      return true
    }
    
    return false
  }
  
  private handleVictory() {
    gameSounds.play('victory')
    this.battleUI.showVictoryScreen()
    
    this.time.delayedCall(3000, () => {
      this.onBattleEnd(true)
    })
  }
  
  private handleDefeat() {
    gameSounds.play('defeat')
    this.battleUI.showDefeatScreen()
    
    this.time.delayedCall(3000, () => {
      this.onBattleEnd(false)
    })
  }
  
  private async playAttackAnimation(attackerId: string, targetId: string) {
    // Basic attack animation
    const attackerSprite = this.playerSprites.get(attackerId) || this.enemySprites.get(attackerId)
    const targetSprite = this.playerSprites.get(targetId) || this.enemySprites.get(targetId)
    
    if (!attackerSprite || !targetSprite) return
    
    // Move attacker toward target
    const originalX = attackerSprite.x
    const moveDistance = attackerSprite.x < targetSprite.x ? 100 : -100
    
    await this.tweenPromise({
      targets: attackerSprite,
      x: originalX + moveDistance,
      duration: 200,
      ease: 'Power2'
    })
    
    // Flash target
    this.flashSprite(targetSprite, 0xff0000, 3, 100)
    
    // Move back
    await this.tweenPromise({
      targets: attackerSprite,
      x: originalX,
      duration: 200,
      ease: 'Power2'
    })
  }
  
  private async playAbilityAnimation(attackerId: string, targetId: string, abilityId: string) {
    // Placeholder for ability-specific animations
    // Could add particle effects, screen flashes, etc based on ability type
    
    const targetSprite = this.playerSprites.get(targetId) || this.enemySprites.get(targetId)
    if (targetSprite) {
      // Generic ability effect
      this.flashSprite(targetSprite, 0x00ffff, 5, 150)
    }
  }
  
  private showDamageNumber(x: number, y: number, damage: number) {
    const text = this.add.text(x, y - 50, `-${damage}`, {
      fontSize: '32px',
      color: '#ff0000',
      stroke: '#000000',
      strokeThickness: 4,
      fontFamily: 'monospace'
    })
    text.setOrigin(0.5)
    
    // Animate up and fade
    this.tweens.add({
      targets: text,
      y: y - 100,
      alpha: 0,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => text.destroy()
    })
  }
}