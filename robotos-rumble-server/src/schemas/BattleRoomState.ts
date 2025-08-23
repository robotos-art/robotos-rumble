import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema"

export class Player extends Schema {
  @type("string") id: string = ""
  @type("string") address: string = ""
  @type("string") name: string = ""
  @type("boolean") ready: boolean = false
  @type("string") team: string = "" // JSON stringified team data
  @type("number") wins: number = 0
  @type("number") losses: number = 0
}

export class BattleUnit extends Schema {
  @type("string") id: string = ""
  @type("string") ownerId: string = ""
  @type("string") name: string = ""
  @type("string") element: string = ""
  @type("string") imageUrl: string = ""
  @type("number") currentHp: number = 100
  @type("number") maxHp: number = 100
  @type("number") currentEnergy: number = 100
  @type("number") maxEnergy: number = 100
  @type("boolean") isAlive: boolean = true
  @type("number") position: number = 0
}

export class BattleAction extends Schema {
  @type("string") playerId: string = ""
  @type("string") type: string = "" // 'attack', 'ability', 'switch'
  @type("string") sourceId: string = ""
  @type("string") targetId: string = ""
  @type("string") abilityId: string = ""
  @type("number") timingBonus: number = 1.0
  @type("number") timestamp: number = 0
}

export class BattleRoomState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>()
  @type([ BattleUnit ]) units = new ArraySchema<BattleUnit>()
  
  // Battle state
  @type("string") status: string = "waiting" // waiting, ready, battle, ended
  @type("boolean") battleStarted: boolean = false // Track if battle has been initialized
  @type("string") currentTurn: string = "" // player id whose turn it is
  @type("number") turnTimer: number = 0
  @type("number") turnNumber: number = 0
  
  // Turn order
  @type([ "string" ]) turnOrder = new ArraySchema<string>() // unit ids in turn order
  @type("number") turnIndex: number = 0
  
  // Battle settings
  @type("number") teamSize: number = 5 // 3 or 5
  @type("string") speed: string = "speedy" // speedy or calm
  @type("number") timerDuration: number = 5 // seconds per action
  
  // Battle results
  @type("string") winner: string = ""
  @type("string") loser: string = ""
  
  // Last action for UI updates
  @type(BattleAction) lastAction: BattleAction = new BattleAction()
  
  // Battle log (simplified for now)
  @type([ "string" ]) battleLog = new ArraySchema<string>()
}