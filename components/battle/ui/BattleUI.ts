import * as Phaser from 'phaser'
import { BattleUnitV3, TraitProcessorV3 } from '../../../lib/game-engine/TraitProcessorV3'
import { gameSounds } from '../../../lib/sounds/gameSounds'

interface ActionCallbacks {
  onAttack: () => void
  onAbility: (index: number) => void
  onSwitch: () => void
}

export class BattleUI {
  private scene: Phaser.Scene
  private actionMenu?: Phaser.GameObjects.Container
  private battleLog: string[] = []
  private logTexts: Phaser.GameObjects.Text[] = []
  
  // Menu navigation
  private menuOptions: Phaser.GameObjects.Container[] = []
  private selectedMenuIndex: number = 0
  private actionCallbacks?: ActionCallbacks
  private currentUnit?: BattleUnitV3
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  create() {
    const width = this.scene.scale.width
    const height = this.scene.scale.height
    
    // Create battle log area at bottom of screen with better positioning
    const logHeight = 80
    const logMargin = 20
    const logY = height - logHeight / 2 - logMargin
    const logBg = this.scene.add.rectangle(width / 2, logY, width * 0.8, logHeight, 0x000000, 0.9)
    logBg.setStrokeStyle(2, 0x00ff00)
    
    // Add depth to ensure UI is on top
    logBg.setDepth(100)
    
    // Create log text objects with better spacing
    for (let i = 0; i < 3; i++) {
      const text = this.scene.add.text(width * 0.12, logY - 25 + i * 18, '', {
        fontSize: '14px',
        color: '#00ff00',
        fontFamily: 'monospace'
      })
      text.setDepth(101)
      this.logTexts.push(text)
    }
  }

  showActionMenu(unit: BattleUnitV3, callbacks: ActionCallbacks) {
    // Remove existing menu if any
    this.hideActionMenu()
    
    // Store references for keyboard navigation
    this.actionCallbacks = callbacks
    this.currentUnit = unit
    this.selectedMenuIndex = 0
    this.menuOptions = []
    
    // Play menu open sound
    gameSounds.play('menuOpen')
    
    const width = this.scene.scale.width
    const height = this.scene.scale.height
    
    // Position menu based on screen orientation
    const isPortrait = width < height * 1.2
    const menuX = isPortrait ? width * 0.5 : width * 0.5
    const menuY = isPortrait ? height * 0.5 : height * 0.5
    
    this.actionMenu = this.scene.add.container(menuX, menuY)
    this.actionMenu.setDepth(110) // Above battle log
    
    // Background
    const bg = this.scene.add.rectangle(0, 0, 300, 200, 0x000000, 0.9)
    bg.setStrokeStyle(2, 0x00ff00)
    
    // Title
    const title = this.scene.add.text(0, -80, 'SELECT ACTION', {
      fontSize: '20px',
      color: '#00ff00',
      fontFamily: 'monospace'
    }).setOrigin(0.5)
    
    // Attack button
    const attackBtn = this.createButton(0, -30, 'ATTACK', () => {
      gameSounds.play('select')
      callbacks.onAttack()
    })
    this.menuOptions.push(attackBtn)
    
    // Ability button (with cooldown indicator)
    const abilityText = unit.abilities.length > 0 ? 
      `ABILITY (${unit.abilities.length})` : 'NO ABILITIES'
    const abilityBtn = this.createButton(0, 10, abilityText, () => {
      if (unit.abilities.length > 0) {
        gameSounds.play('select')
        this.showAbilityMenu(unit, callbacks.onAbility)
      } else {
        gameSounds.play('error')
      }
    })
    this.menuOptions.push(abilityBtn)
    
    // Switch button
    const switchBtn = this.createButton(0, 50, 'SWITCH', () => {
      gameSounds.play('select')
      callbacks.onSwitch()
    })
    this.menuOptions.push(switchBtn)
    
    this.actionMenu.add([bg, title, attackBtn, abilityBtn, switchBtn])
    this.scene.add.existing(this.actionMenu)
    
    // Highlight first option
    this.updateMenuSelection()
    
    // Set up keyboard navigation
    this.setupKeyboardNavigation()
  }

  hideActionMenu() {
    if (this.actionMenu) {
      gameSounds.play('menuClose')
      this.actionMenu.destroy(true)
      this.actionMenu = undefined
      this.menuOptions = []
      
      // Remove keyboard listeners
      this.removeKeyboardNavigation()
    }
  }
  
  private setupKeyboardNavigation() {
    // Store keyboard event listeners
    this.keyDownHandler = (event: KeyboardEvent) => {
      if (!this.actionMenu) return
      
      switch(event.key) {
        case 'ArrowUp':
          event.preventDefault()
          this.navigateMenu(-1)
          break
        case 'ArrowDown':
          event.preventDefault()
          this.navigateMenu(1)
          break
        case 'Enter':
        case ' ':
          event.preventDefault()
          this.selectMenuOption()
          break
      }
    }
    
    // Add keyboard listener
    this.scene.input.keyboard?.on('keydown', this.keyDownHandler)
  }
  
  private removeKeyboardNavigation() {
    if (this.keyDownHandler) {
      this.scene.input.keyboard?.off('keydown', this.keyDownHandler)
      this.keyDownHandler = undefined
    }
  }
  
  private navigateMenu(direction: number) {
    const prevIndex = this.selectedMenuIndex
    this.selectedMenuIndex += direction
    
    // Wrap around
    if (this.selectedMenuIndex < 0) {
      this.selectedMenuIndex = this.menuOptions.length - 1
    } else if (this.selectedMenuIndex >= this.menuOptions.length) {
      this.selectedMenuIndex = 0
    }
    
    // Only play sound if index changed
    if (prevIndex !== this.selectedMenuIndex) {
      gameSounds.play('menuNavigate')
      this.updateMenuSelection()
    }
  }
  
  private selectMenuOption() {
    if (this.selectedMenuIndex >= 0 && this.selectedMenuIndex < this.menuOptions.length) {
      const selectedButton = this.menuOptions[this.selectedMenuIndex]
      // Trigger the button's click handler
      const bg = selectedButton.getAt(0) as Phaser.GameObjects.Rectangle
      bg.emit('pointerdown')
    }
  }
  
  private updateMenuSelection() {
    // Reset all buttons
    this.menuOptions.forEach((button, index) => {
      const bg = button.getAt(0) as Phaser.GameObjects.Rectangle
      const label = button.getAt(1) as Phaser.GameObjects.Text
      
      if (index === this.selectedMenuIndex) {
        // Highlight selected
        bg.setFillStyle(0x005500)
        bg.setStrokeStyle(3, 0xffff00)
        label.setColor('#ffff00')
      } else {
        // Normal state
        bg.setFillStyle(0x003300, 0.8)
        bg.setStrokeStyle(1, 0x00ff00)
        label.setColor('#00ff00')
      }
    })
  }

  showAbilityMenu(unit: BattleUnitV3, onSelect: (index: number) => void) {
    this.hideActionMenu()
    
    const menu = this.scene.add.container(200, 300)
    
    // Background
    const bg = this.scene.add.rectangle(0, 0, 350, 250, 0x000000, 0.9)
    bg.setStrokeStyle(2, 0x00ff00)
    menu.add(bg)
    
    // Title
    const title = this.scene.add.text(0, -100, 'SELECT ABILITY', {
      fontSize: '18px',
      color: '#00ff00',
      fontFamily: 'monospace'
    }).setOrigin(0.5)
    menu.add(title)
    
    // List abilities
    unit.abilities.forEach((abilityId, index) => {
      const ability = TraitProcessorV3.getAbilityData(abilityId)
      if (!ability) return
      
      const y = -50 + index * 40
      const btn = this.createButton(0, y, ability.name.toUpperCase(), () => {
        gameSounds.play('abilitySelect')
        menu.destroy()
        onSelect(index)
      })
      
      // Add element color
      const elementColor = this.getElementColor(ability.element)
      const textObject = btn.getAt(1) as Phaser.GameObjects.Text
      textObject.setColor(elementColor)
      
      menu.add(btn)
    })
    
    // Back button
    const backBtn = this.createButton(0, 80, 'BACK', () => {
      gameSounds.play('cancel')
      menu.destroy()
      // Show action menu again
    })
    menu.add(backBtn)
    
    this.scene.add.existing(menu)
  }

  showSwitchMenu(team: BattleUnitV3[], currentIndex: number, onSelect: (index: number) => void) {
    this.hideActionMenu()
    
    const menu = this.scene.add.container(512, 300)
    
    // Background
    const bg = this.scene.add.rectangle(0, 0, 600, 350, 0x000000, 0.9)
    bg.setStrokeStyle(2, 0x00ff00)
    menu.add(bg)
    
    // Title
    const title = this.scene.add.text(0, -150, 'SELECT ROBOTO', {
      fontSize: '20px',
      color: '#00ff00',
      fontFamily: 'monospace'
    }).setOrigin(0.5)
    menu.add(title)
    
    // List team members
    team.forEach((unit, index) => {
      const x = -200 + (index * 100)
      const y = 0
      
      // Unit card
      const card = this.scene.add.container(x, y)
      
      // Background
      const cardBg = this.scene.add.rectangle(0, 0, 90, 120, 
        index === currentIndex ? 0x005500 : 0x003300, 0.8)
      cardBg.setStrokeStyle(1, index === currentIndex ? 0xffff00 : 0x00ff00)
      
      // Unit image placeholder
      const unitImg = this.scene.add.rectangle(0, -20, 60, 60, 0x666666)
      
      // Name
      const name = this.scene.add.text(0, 40, unit.name.slice(0, 8), {
        fontSize: '10px',
        color: '#ffffff',
        fontFamily: 'monospace'
      }).setOrigin(0.5)
      
      // HP indicator
      const hpText = this.scene.add.text(0, 55, 'HP: 100%', {
        fontSize: '10px',
        color: '#00ff00',
        fontFamily: 'monospace'
      }).setOrigin(0.5)
      
      card.add([cardBg, unitImg, name, hpText])
      
      // Make clickable if not current
      if (index !== currentIndex) {
        cardBg.setInteractive()
        cardBg.on('pointerover', () => cardBg.setFillStyle(0x005500))
        cardBg.on('pointerout', () => cardBg.setFillStyle(0x003300))
        cardBg.on('pointerdown', () => {
          menu.destroy()
          onSelect(index)
        })
      }
      
      menu.add(card)
    })
    
    // Cancel button
    const cancelBtn = this.createButton(0, 130, 'CANCEL', () => {
      gameSounds.play('cancel')
      menu.destroy()
      // Show action menu again
    })
    menu.add(cancelBtn)
    
    this.scene.add.existing(menu)
  }

  updateBattleLog(events: any[]) {
    events.forEach(event => {
      let message = ''
      
      switch (event.type) {
        case 'damage':
          message = `${event.description}`
          break
        case 'ability':
          message = `${event.description}`
          break
        case 'ko':
          message = `${event.description} was defeated!`
          break
        default:
          message = event.description
      }
      
      this.addLogMessage(message)
    })
  }

  private addLogMessage(message: string) {
    this.battleLog.push(message)
    if (this.battleLog.length > 3) {
      this.battleLog.shift()
    }
    
    // Update display
    this.battleLog.forEach((msg, index) => {
      if (index < this.logTexts.length) {
        this.logTexts[index].setText(`> ${msg}`)
      }
    })
  }

  showDamageNumber(x: number, y: number, damage: number) {
    const text = this.scene.add.text(x, y - 50, `-${damage}`, {
      fontSize: '32px',
      color: '#ff0000',
      stroke: '#000000',
      strokeThickness: 4,
      fontFamily: 'monospace'
    }).setOrigin(0.5)
    
    // Animate up and fade
    this.scene.tweens.add({
      targets: text,
      y: y - 100,
      alpha: 0,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => text.destroy()
    })
  }

  showVictoryScreen() {
    const width = this.scene.scale.width
    const height = this.scene.scale.height
    
    const overlay = this.scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8)
    
    const victoryText = this.scene.add.text(width / 2, height / 2, 'VICTORY!', {
      fontSize: '64px',
      color: '#00ff00',
      stroke: '#000000',
      strokeThickness: 6,
      fontFamily: 'monospace'
    }).setOrigin(0.5)
    
    // Pulse animation
    this.scene.tweens.add({
      targets: victoryText,
      scale: 1.2,
      duration: 500,
      yoyo: true,
      repeat: -1
    })
  }

  showDefeatScreen() {
    const width = this.scene.scale.width
    const height = this.scene.scale.height
    
    const overlay = this.scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8)
    
    const defeatText = this.scene.add.text(width / 2, height / 2, 'DEFEAT', {
      fontSize: '64px',
      color: '#ff0000',
      stroke: '#000000',
      strokeThickness: 6,
      fontFamily: 'monospace'
    }).setOrigin(0.5)
    
    const centerX = width / 2
    
    // Shake animation
    this.scene.tweens.add({
      targets: defeatText,
      x: centerX + Phaser.Math.Between(-10, 10),
      duration: 50,
      repeat: -1
    })
  }

  private createButton(x: number, y: number, text: string, onClick: () => void): Phaser.GameObjects.Container {
    const button = this.scene.add.container(x, y)
    
    const bg = this.scene.add.rectangle(0, 0, 200, 35, 0x003300, 0.8)
    bg.setStrokeStyle(1, 0x00ff00)
    bg.setInteractive()
    
    const label = this.scene.add.text(0, 0, text, {
      fontSize: '16px',
      color: '#00ff00',
      fontFamily: 'monospace'
    }).setOrigin(0.5)
    
    button.add([bg, label])
    
    // Hover effects
    bg.on('pointerover', () => {
      bg.setFillStyle(0x005500)
      label.setColor('#ffffff')
      gameSounds.play('hover')
    })
    
    bg.on('pointerout', () => {
      bg.setFillStyle(0x003300)
      label.setColor('#00ff00')
    })
    
    bg.on('pointerdown', onClick)
    
    return button
  }

  private getElementColor(element: string): string {
    const colors: Record<string, string> = {
      'SURGE': '#ffff00',
      'CODE': '#00ffff',
      'METAL': '#c0c0c0',
      'GLITCH': '#ff00ff'
    }
    return colors[element] || '#ffffff'
  }
  
  showTargetingHint() {
    if (this.targetingHint) {
      this.targetingHint.destroy(true)
    }
    
    const width = this.scene.scale.width
    const height = this.scene.scale.height
    
    this.targetingHint = this.scene.add.container(width / 2, height * 0.1)
    
    const bg = this.scene.add.rectangle(0, 0, 500, 40, 0x000000, 0.8)
    bg.setStrokeStyle(2, 0x00ff00)
    
    const text = this.scene.add.text(0, 0, 'SELECT TARGET: ↑↓ Navigate | SPACE Confirm | ESC Cancel', {
      fontSize: '16px',
      color: '#00ff00',
      fontFamily: 'monospace'
    }).setOrigin(0.5)
    
    this.targetingHint.add([bg, text])
    this.scene.add.existing(this.targetingHint)
    
    // Pulse animation
    this.scene.tweens.add({
      targets: text,
      alpha: 0.5,
      duration: 500,
      yoyo: true,
      repeat: -1
    })
  }
  
  hideTargetingHint() {
    if (this.targetingHint) {
      this.targetingHint.destroy(true)
      this.targetingHint = null
    }
  }
  
  updateBattleState(state: any) {
    // Update HP/Energy bars for all units
    // This would be called after each action
    // Implementation depends on how we want to display unit status
  }
  
  private targetingHint: Phaser.GameObjects.Container | null = null
  private keyDownHandler?: (event: KeyboardEvent) => void
}