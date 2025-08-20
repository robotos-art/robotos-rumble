export class BattleNotifications {
  private static permission: NotificationPermission = 'default'
  
  // Request permission for notifications
  static async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications')
      return false
    }
    
    if (Notification.permission === 'granted') {
      this.permission = 'granted'
      return true
    }
    
    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission()
      this.permission = permission
      return permission === 'granted'
    }
    
    return false
  }
  
  // Check if notifications are enabled
  static isEnabled(): boolean {
    return 'Notification' in window && Notification.permission === 'granted'
  }
  
  // Show match found notification
  static showMatchFound(opponentName?: string) {
    if (!this.isEnabled()) return
    
    const title = '⚔️ Match Found!'
    const options: NotificationOptions = {
      body: opponentName 
        ? `${opponentName} is ready to battle!` 
        : 'An opponent has been found! Join the battle now.',
      icon: '/robotos-icon.png', // You'll need to add this icon
      badge: '/robotos-badge.png',
      tag: 'match-found',
      requireInteraction: true,
      vibrate: [200, 100, 200],
      actions: [
        { action: 'join', title: 'Join Battle' },
        { action: 'decline', title: 'Cancel' }
      ]
    }
    
    const notification = new Notification(title, options)
    
    notification.onclick = () => {
      window.focus()
      notification.close()
      // Navigate to battle if not already there
      if (!window.location.pathname.includes('/battle/pvp')) {
        window.location.href = '/battle/pvp'
      }
    }
    
    // Auto-close after 30 seconds
    setTimeout(() => notification.close(), 30000)
    
    return notification
  }
  
  // Show player waiting notification (for other players)
  static showPlayerWaiting(settings?: { teamSize: number, speed: string }) {
    if (!this.isEnabled()) return
    
    const title = '🎮 Player Looking for Match'
    const options: NotificationOptions = {
      body: settings 
        ? `Someone wants to play ${settings.teamSize}v${settings.teamSize} ${settings.speed} mode!`
        : 'A player is looking for an opponent. Join now!',
      icon: '/robotos-icon.png',
      badge: '/robotos-badge.png',
      tag: 'player-waiting',
      requireInteraction: false,
      vibrate: [100],
      actions: [
        { action: 'join', title: 'Join Match' }
      ]
    }
    
    const notification = new Notification(title, options)
    
    notification.onclick = () => {
      window.focus()
      notification.close()
      window.location.href = '/battle/pvp'
    }
    
    // Auto-close after 60 seconds
    setTimeout(() => notification.close(), 60000)
    
    return notification
  }
  
  // Show battle started notification
  static showBattleStarting(secondsLeft: number = 5) {
    if (!this.isEnabled()) return
    
    const title = '🚀 Battle Starting!'
    const options: NotificationOptions = {
      body: `Your battle begins in ${secondsLeft} seconds...`,
      icon: '/robotos-icon.png',
      badge: '/robotos-badge.png',
      tag: 'battle-starting',
      requireInteraction: false,
      silent: false,
      vibrate: [100, 50, 100]
    }
    
    const notification = new Notification(title, options)
    
    notification.onclick = () => {
      window.focus()
      notification.close()
    }
    
    // Auto-close when battle starts
    setTimeout(() => notification.close(), secondsLeft * 1000)
    
    return notification
  }
  
  // Show your turn notification
  static showYourTurn(unitName?: string) {
    if (!this.isEnabled()) return
    
    // Only show if tab is not visible
    if (document.visibilityState === 'visible') return
    
    const title = '⏰ Your Turn!'
    const options: NotificationOptions = {
      body: unitName 
        ? `It's ${unitName}'s turn to attack!`
        : 'It\'s your turn to make a move!',
      icon: '/robotos-icon.png',
      badge: '/robotos-badge.png',
      tag: 'your-turn',
      requireInteraction: false,
      vibrate: [200],
      silent: false
    }
    
    const notification = new Notification(title, options)
    
    notification.onclick = () => {
      window.focus()
      notification.close()
    }
    
    // Auto-close after 10 seconds
    setTimeout(() => notification.close(), 10000)
    
    return notification
  }
}