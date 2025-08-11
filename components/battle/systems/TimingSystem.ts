import * as Phaser from 'phaser'
import { gameSounds } from '../../../lib/sounds/gameSounds'

export class TimingSystem {
  private scene: Phaser.Scene
  private timingBar?: Phaser.GameObjects.Rectangle
  private timingMarker?: Phaser.GameObjects.Rectangle
  private perfectZone?: Phaser.GameObjects.Rectangle
  private isActive = false
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  async startAttackTiming(): Promise<number> {
    return new Promise((resolve) => {
      this.createTimingUI()
      this.isActive = true
      
      // Play timing start sound
      gameSounds.play('timingStart')
      
      let markerPosition = 0
      let direction = 1
      const speed = 3
      
      // Create perfect timing zone (center area)
      const perfectStart = 450
      const perfectEnd = 550
      
      // Move marker back and forth
      const updateMarker = () => {
        if (!this.isActive) return
        
        markerPosition += speed * direction
        
        if (markerPosition >= 250 || markerPosition <= -250) {
          direction *= -1
        }
        
        if (this.timingMarker) {
          this.timingMarker.x = 512 + markerPosition
        }
      }
      
      const ticker = this.scene.time.addEvent({
        delay: 16,
        callback: updateMarker,
        loop: true
      })
      
      // Listen for spacebar
      const spaceKey = this.scene.input.keyboard?.addKey('SPACE')
      
      const handleTiming = () => {
        if (!this.isActive) return
        
        this.isActive = false
        ticker.remove()
        
        // Calculate timing bonus
        const markerX = 512 + markerPosition
        let bonus = 1.0
        
        if (markerX >= perfectStart && markerX <= perfectEnd) {
          // Perfect timing!
          bonus = 1.5
          gameSounds.play('timingPerfect')
          this.showTimingResult('PERFECT!', 0x00ff00)
        } else if (markerX >= 400 && markerX <= 600) {
          // Good timing
          bonus = 1.25
          gameSounds.play('timingGood')
          this.showTimingResult('GOOD!', 0xffff00)
        } else {
          // Poor timing
          bonus = 1.0
          gameSounds.play('timingMiss')
          this.showTimingResult('WEAK', 0xff8800)
        }
        
        this.hideTimingUI()
        spaceKey?.off('down', handleTiming)
        resolve(bonus)
      }
      
      spaceKey?.once('down', handleTiming)
      
      // Auto-resolve after 3 seconds if no input
      this.scene.time.delayedCall(3000, () => {
        if (this.isActive) {
          handleTiming()
        }
      })
    })
  }

  async startDefenseTiming(): Promise<number> {
    return new Promise((resolve) => {
      // Show defense prompt
      const defensePrompt = this.scene.add.text(512, 300, 'DEFEND!', {
        fontSize: '32px',
        color: '#00ff00',
        stroke: '#000000',
        strokeThickness: 4
      }).setOrigin(0.5)
      
      // Flash the prompt
      this.scene.tweens.add({
        targets: defensePrompt,
        alpha: 0.3,
        duration: 200,
        yoyo: true,
        repeat: 2
      })
      
      let defended = false
      const spaceKey = this.scene.input.keyboard?.addKey('SPACE')
      
      // Window for perfect defense (500ms)
      const defenseWindow = this.scene.time.delayedCall(500, () => {
        if (!defended) {
          defensePrompt.destroy()
          spaceKey?.off('down')
          resolve(1.0) // No defense bonus
        }
      })
      
      const handleDefense = () => {
        if (defended) return
        defended = true
        
        defensePrompt.destroy()
        defenseWindow.remove()
        
        // Show result
        gameSounds.play('defend')
        this.showTimingResult('BLOCKED!', 0x0088ff)
        resolve(0.5) // 50% damage reduction
      }
      
      spaceKey?.once('down', handleDefense)
    })
  }

  async startAbilityTiming(abilityId: string): Promise<number> {
    // Different timing patterns for different abilities
    // For MVP, just use attack timing
    return this.startAttackTiming()
  }

  private createTimingUI() {
    // Background bar
    this.timingBar = this.scene.add.rectangle(512, 400, 500, 40, 0x333333)
    this.timingBar.setStrokeStyle(2, 0x00ff00)
    
    // Perfect zone indicator
    this.perfectZone = this.scene.add.rectangle(512, 400, 100, 40, 0x00ff00, 0.3)
    
    // Moving marker
    this.timingMarker = this.scene.add.rectangle(512, 400, 10, 50, 0xffffff)
  }

  private hideTimingUI() {
    this.scene.time.delayedCall(500, () => {
      this.timingBar?.destroy()
      this.timingMarker?.destroy()
      this.perfectZone?.destroy()
    })
  }

  private showTimingResult(text: string, color: number) {
    const result = this.scene.add.text(512, 350, text, {
      fontSize: '48px',
      color: `#${color.toString(16).padStart(6, '0')}`,
      stroke: '#000000',
      strokeThickness: 6
    }).setOrigin(0.5)
    
    // Animate result
    this.scene.tweens.add({
      targets: result,
      y: 300,
      alpha: 0,
      scale: 1.5,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => result.destroy()
    })
  }
}