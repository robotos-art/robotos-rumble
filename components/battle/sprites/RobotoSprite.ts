import * as Phaser from 'phaser'
import { BattleUnitV3 } from '../../../lib/game-engine/TraitProcessorV3'

export class RobotoSprite extends Phaser.GameObjects.Container {
  private unit: BattleUnitV3
  private team: 'player' | 'enemy'
  private sprite: Phaser.GameObjects.Image
  private hpBar: Phaser.GameObjects.Rectangle
  private hpBarBg: Phaser.GameObjects.Rectangle
  private nameText: Phaser.GameObjects.Text
  private elementText: Phaser.GameObjects.Text
  
  // Fixed sprite display size
  private readonly SPRITE_SIZE = 120
  
  constructor(scene: Phaser.Scene, x: number, y: number, unit: BattleUnitV3, team: 'player' | 'enemy') {
    super(scene, x, y)
    
    this.unit = unit
    this.team = team
    
    // Create container background to ensure proper bounds
    const background = scene.add.graphics()
    background.fillStyle(0x000000, 0) // Transparent
    background.fillRect(-this.SPRITE_SIZE/2, -this.SPRITE_SIZE/2, this.SPRITE_SIZE, this.SPRITE_SIZE)
    this.add(background)
    
    // Create sprite with default image
    this.sprite = scene.add.image(0, 0, 'default-sprite')
    this.sprite.setDisplaySize(this.SPRITE_SIZE, this.SPRITE_SIZE)
    
    // Load actual image
    this.loadUnitImage()
    
    // Flip enemy sprites
    if (team === 'enemy') {
      this.sprite.setFlipX(true)
    }
    
    // Create HP bar background
    this.hpBarBg = scene.add.rectangle(0, -70, 100, 8, 0x333333)
    this.hpBarBg.setStrokeStyle(1, 0x00ff00)
    
    // Create HP bar
    this.hpBar = scene.add.rectangle(0, -70, 100, 8, 0x00ff00)
    this.hpBar.setOrigin(0.5, 0.5)
    
    // Create name text
    this.nameText = scene.add.text(0, 65, unit.name.slice(0, 15), {
      fontSize: '14px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2,
      fontFamily: 'monospace'
    }).setOrigin(0.5)
    
    // Create element text with color
    const elementColor = this.getElementColor(unit.element)
    this.elementText = scene.add.text(0, 80, unit.element, {
      fontSize: '12px',
      color: elementColor,
      stroke: '#000000',
      strokeThickness: 2,
      fontFamily: 'monospace'
    }).setOrigin(0.5)
    
    // Add all to container
    this.add([this.sprite, this.hpBarBg, this.hpBar, this.nameText, this.elementText])
    
    // Add to scene
    scene.add.existing(this)
  }

  private async loadUnitImage() {
    // Load image from URL
    const loader = this.scene.load
    const key = `roboto-${this.unit.id}`
    
    // Check if already loaded
    if (this.scene.textures.exists(key)) {
      this.sprite.setTexture(key)
      this.sprite.setDisplaySize(this.SPRITE_SIZE, this.SPRITE_SIZE)
      return
    }
    
    loader.image(key, this.unit.imageUrl)
    loader.once('complete', () => {
      this.sprite.setTexture(key)
      // CRITICAL: Force the display size to our fixed size
      this.sprite.setDisplaySize(this.SPRITE_SIZE, this.SPRITE_SIZE)
      
      // Ensure the sprite fits within our bounds
      const frame = this.sprite.frame
      if (frame.width > 0 && frame.height > 0) {
        // Calculate scale to fit within our size while maintaining aspect ratio
        const scaleX = this.SPRITE_SIZE / frame.width
        const scaleY = this.SPRITE_SIZE / frame.height
        const scale = Math.min(scaleX, scaleY)
        
        // Apply the calculated size
        this.sprite.setDisplaySize(frame.width * scale, frame.height * scale)
      }
    })
    loader.start()
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

  updateHP(currentHP: number, maxHP: number) {
    const percentage = currentHP / maxHP
    this.hpBar.scaleX = percentage
    
    // Change color based on HP
    let color = 0x00ff00 // Green
    if (percentage < 0.3) {
      color = 0xff0000 // Red
    } else if (percentage < 0.6) {
      color = 0xffff00 // Yellow
    }
    this.hpBar.setFillStyle(color)
  }

  async playAttack(): Promise<void> {
    // Simple attack animation
    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: this.sprite,
        x: this.team === 'player' ? 50 : -50,
        duration: 200,
        yoyo: true,
        onComplete: () => resolve()
      })
    })
  }

  async playHit(): Promise<void> {
    // Flash red and shake
    return new Promise((resolve) => {
      this.sprite.setTint(0xff0000)
      
      this.scene.tweens.add({
        targets: this,
        x: this.x + (this.team === 'player' ? -10 : 10),
        duration: 50,
        yoyo: true,
        repeat: 3,
        onComplete: () => {
          this.sprite.clearTint()
          resolve()
        }
      })
    })
  }

  async playDefeat(): Promise<void> {
    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: this,
        alpha: 0,
        y: this.y + 50,
        duration: 500,
        onComplete: () => resolve()
      })
    })
  }
}