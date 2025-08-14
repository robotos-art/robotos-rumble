import elements from '../data/elements.json'
import abilityCombinations from '../data/ability-combinations.json'
import abilitiesV2 from '../data/abilities-v2.json'
import traitElementMapping from '../data/trait-element-mapping.json'
import realAbilityCombinations from '../data/real-ability-combinations.json'

export interface Stats {
  hp: number        // Health Points
  attack: number    // Damage output
  defense: number   // Damage reduction
  speed: number     // Turn order
  energy: number    // Resource for abilities
  crit: number      // Critical hit chance %
}

export interface BattleUnitV3 {
  id: string
  name: string
  type: 'roboto' | 'robopet'
  element: 'SURGE' | 'CODE' | 'METAL' | 'GLITCH' | 'NEUTRAL' | 'BOND' | 'WILD'
  imageUrl: string
  stats: Stats
  abilities: string[] // Ability IDs
  traits: Record<string, string>
  elementModifiers: {
    strongAgainst: string[]
    weakAgainst: string[]
  }
  hasCompanionBonus?: boolean // Added for companion tracking
  battleId?: string // Unique identifier for battle instance
}

export interface AbilityInstance {
  id: string
  ability: any // Full ability data from abilities-v2.json
  currentCooldown: number
}

const BASE_STATS: Stats = {
  hp: 100,
  attack: 50,
  defense: 50,
  speed: 50,
  energy: 100,
  crit: 10
}

const ROBOPET_BASE_STATS: Stats = {
  hp: 80,
  attack: 40,
  defense: 40,
  speed: 60,
  energy: 80,
  crit: 15
}

export class TraitProcessorV3 {
  static processRobotoTraits(metadata: any): BattleUnitV3 {
    const traits = this.extractTraits(metadata.attributes || [])
    const element = this.determineElement(traits)
    const stats = this.calculateStats(traits, element, BASE_STATS)
    const abilities = this.findUnlockedAbilities(traits, 'roboto')
    
    return {
      id: `roboto-${metadata.tokenId || metadata.id}`,
      name: metadata.name,
      type: 'roboto',
      element,
      imageUrl: metadata.image,
      stats,
      abilities,
      traits,
      elementModifiers: {
        strongAgainst: (elements.elements as any)[element]?.strongAgainst || [],
        weakAgainst: (elements.elements as any)[element]?.weakAgainst || []
      }
    }
  }
  
  static processRobopetTraits(metadata: any): BattleUnitV3 {
    const traits = this.extractTraits(metadata.attributes || [])
    // Robopets use "Robopet Type" as their trait name
    const petType = traits['Robopet Type'] || 'default'
    
    // Get abilities and element based on the actual Robopet Type
    const petAbilities = (abilityCombinations.combinations.robopet_abilities as any)[petType] 
      || abilityCombinations.combinations.robopet_abilities.default
    
    const element = petAbilities?.element || 'BOND'
    
    let stats = this.calculateStats(traits, element, ROBOPET_BASE_STATS)
    
    // Apply rarity bonuses to Robopets
    const powerTier = petAbilities?.power_tier || 1
    const rarityMultiplier = 1 + (powerTier - 1) * 0.1 // 10% bonus per tier
    stats.hp = Math.round(stats.hp * rarityMultiplier)
    stats.attack = Math.round(stats.attack * rarityMultiplier)
    stats.defense = Math.round(stats.defense * rarityMultiplier)
    stats.energy = Math.round(stats.energy * rarityMultiplier)
    
    const abilities = petAbilities?.abilities || ["companion_shield"]
    
    return {
      id: `robopet-${metadata.tokenId || metadata.id}`,
      name: metadata.name,
      type: 'robopet',
      element: element as any,
      imageUrl: metadata.image,
      stats,
      abilities,
      traits,
      elementModifiers: {
        strongAgainst: (elements.elements as any)[element]?.strongAgainst || [],
        weakAgainst: (elements.elements as any)[element]?.weakAgainst || []
      }
    }
  }
  
  private static extractTraits(attributes: any[]): Record<string, string> {
    const traits: Record<string, string> = {}
    attributes.forEach((attr: any) => {
      if (attr.trait_type && attr.value) {
        traits[attr.trait_type] = attr.value
      }
    })
    return traits
  }
  
  private static determineElement(traits: Record<string, string>): 'SURGE' | 'CODE' | 'METAL' | 'GLITCH' | 'NEUTRAL' {
    const elementScores: Record<string, number> = {
      SURGE: 0,
      CODE: 0,
      METAL: 0,
      GLITCH: 0,
      NEUTRAL: 0
    }
    
    // Use the real trait mappings
    const mappings = traitElementMapping.trait_mappings
    
    // Very important trait types that strongly influence element
    const veryImportantTraitTypes = ['Backpack', 'Visor', 'Head', 'Chest', 'Bicep']
    // Somewhat important traits
    const importantTraitTypes = ['Forearm', 'Legs', 'Mouth', 'Eyes']
    
    // Calculate element scores based on traits
    Object.entries(traits).forEach(([traitType, traitValue]) => {
      // First check the real trait mappings
      const realMapping = (mappings as any)[traitType]?.[traitValue]
      if (realMapping) {
        // Apply multiplier for very important traits
        const multiplier = veryImportantTraitTypes.includes(traitType) ? 1.5 : 1
        
        Object.entries(realMapping).forEach(([element, weight]) => {
          if (element in elementScores) {
            elementScores[element] += (weight as number) * multiplier
          }
        })
      } else if (veryImportantTraitTypes.includes(traitType) || importantTraitTypes.includes(traitType)) {
        // For important unmapped traits, try to infer element based on trait value
        const value = traitValue.toLowerCase()
        
        // Infer elements based on trait names with stronger weights
        if (value.includes('laser') || value.includes('electric') || value.includes('volt') || value.includes('energy') || value.includes('power') || value.includes('lightning')) {
          elementScores.SURGE += veryImportantTraitTypes.includes(traitType) ? 3 : 2
        } else if (value.includes('digital') || value.includes('data') || value.includes('cyber') || value.includes('tech') || value.includes('computer') || value.includes('code')) {
          elementScores.CODE += veryImportantTraitTypes.includes(traitType) ? 3 : 2
        } else if (value.includes('metal') || value.includes('armor') || value.includes('steel') || value.includes('iron') || value.includes('tank') || value.includes('soldier')) {
          elementScores.METAL += veryImportantTraitTypes.includes(traitType) ? 3 : 2
        } else if (value.includes('glitch') || value.includes('error') || value.includes('corrupt') || value.includes('chaos') || value.includes('wild') || value.includes('crazy')) {
          elementScores.GLITCH += veryImportantTraitTypes.includes(traitType) ? 3 : 2
        }
        // Don't default to NEUTRAL for unmapped traits
      }
    })
    
    // Special boost for certain combinations
    if (traits['Robot Type'] === 'Roboto Computo') {
      elementScores.CODE += 5 // Computos are strongly CODE aligned
    }
    if (traits['Robot Type'] === 'Roboto Cyborgo') {
      elementScores.CODE += 2
      elementScores.METAL += 2
    }
    if (traits['Helmet'] === 'Mullet') {
      elementScores.GLITCH += 5 // Mullets are wild!
    }
    
    // Find dominant element
    let maxScore = 0
    let dominantElement: string = 'NEUTRAL'
    
    // Don't consider NEUTRAL in the first pass
    Object.entries(elementScores).forEach(([element, score]) => {
      if (element !== 'NEUTRAL' && score > maxScore) {
        maxScore = score
        dominantElement = element
      }
    })
    
    // Only be NEUTRAL if no element has significant score
    // Very low threshold to make elements more common
    if (maxScore < 1) {
      return 'NEUTRAL'
    }
    
    return dominantElement as 'SURGE' | 'CODE' | 'METAL' | 'GLITCH' | 'NEUTRAL'
  }
  
  private static calculateStats(
    traits: Record<string, string>, 
    element: string, 
    baseStats: Stats
  ): Stats {
    const stats = { ...baseStats }
    
    // Apply element modifiers
    const elementData = (elements.elements as any)[element]
    if (elementData?.statModifiers) {
      Object.entries(elementData.statModifiers).forEach(([stat, modifier]) => {
        const statKey = stat as keyof Stats
        if (statKey in stats) {
          const baseStat = baseStats[statKey]
          if (typeof modifier === 'number') {
            stats[statKey] = Math.round(baseStat * modifier)
          } else if (typeof modifier === 'string' && modifier.includes('-')) {
            // Handle range modifiers for GLITCH
            const parts = modifier.split('-')
            const min = Number(parts[0])
            const max = Number(parts[1])
            const randomModifier = min + Math.random() * (max - min)
            stats[statKey] = Math.round(baseStat * randomModifier)
          }
        }
      })
    }
    
    // Apply trait-based modifiers using a comprehensive system
    // Each trait contributes to stats based on its characteristics
    
    // Body modifications - based on REAL traits from traitDescriptions.md
    const bodyMods: Record<string, Partial<Stats>> = {
      // Defensive bodies
      'Tin Body with Buttons': { defense: 15, hp: 10 },
      'Tin Body with Drum Pad': { energy: 15, speed: 5 },
      'Tin Body with Slider Screen': { energy: 10, crit: 5 },
      
      // Combat bodies
      'Zapata': { attack: 15, crit: 10, speed: -5 }, // War veteran
      'Soldier Jacket': { attack: 12, defense: 8 }, // War veteran
      'Rugged Shirt': { hp: 15, defense: 5 }, // Survivor
      'Punk Jacket': { attack: 10, speed: 10, defense: -5 }, // Rebellious
      
      // Elegant bodies  
      'Suit': { energy: 15, defense: 10 },
      'Dress Pink': { speed: 10, energy: 5 },
      'Dress': { speed: 8, energy: 8 },
      
      // Casual bodies
      'Blue Hoodie': { defense: 8, energy: 10 },
      'Red Hoodie': { attack: 8, hp: 5 },
      'Red Shirt': { attack: 5, speed: 5 },
      'Blush Tee': { hp: 10, crit: 3 },
      
      // Special bodies
      'Small Top with Drum Pad': { energy: 20, crit: 5 },
      'Small Top with EKG': { hp: 20, defense: 5 },
      'Small Top with Slider Screen': { energy: 15, speed: 5 },
      'Sports Bra': { speed: 15, attack: 5 }
    }
    
    if (traits['Body'] && bodyMods[traits['Body']]) {
      Object.entries(bodyMods[traits['Body']]).forEach(([stat, value]) => {
        (stats as any)[stat] += value
      })
    }
    
    // Arm modifications - based on REAL traits
    const armMods: Record<string, Partial<Stats>> = {
      // Combat arms
      'Cruncher': { attack: 20, speed: -10 }, // Heavy damage
      'Compressor': { attack: 15, energy: 10 }, // Balanced
      'Machine Arm': { attack: 12, defense: 8 },
      'Cut Arm': { attack: 10, crit: 10 }, // Exposed cables = risk/reward
      
      // Defensive arms
      'Armor': { defense: 20, speed: -5 },
      'Ribbed': { defense: 12, hp: 8 },
      'Round Shoulder': { defense: 10, hp: 5 },
      'Bicep': { attack: 8, hp: 10 },
      
      // Technical arms
      'Torque': { energy: 15, attack: 5 },
      'Round Torque': { energy: 12, defense: 5 },
      'Pointy Pad': { crit: 10, speed: 5 },
      'Square Shoulder': { defense: 8, energy: 8 } // Cyborgo trait
    }
    
    const armKey = traits['Arm'] || traits['Arms'] || traits['Human Arm']
    if (armKey && armMods[armKey]) {
      Object.entries(armMods[armKey]).forEach(([stat, value]) => {
        (stats as any)[stat] += value
      })
    }
    
    // Backpack modifications - based on REAL traits
    const backpackMods: Record<string, Partial<Stats>> = {
      // Energy backpacks
      'Electron Battery': { energy: 25, attack: 5 },
      'Battery': { energy: 20 },
      'Brewing Lab': { energy: 15, hp: 10 }, // Energy drinks!
      
      // Combat backpacks
      'Katanas': { attack: 18, crit: 15, speed: 5 }, // Samurai style
      'Saw': { attack: 20, defense: -5 }, // High risk/reward
      
      // Movement backpacks
      'Jetpack': { speed: 25, energy: -10 },
      'Wings': { speed: 15, defense: 5 }, // Angelic
      'Volt': { speed: 20, attack: 5 }, // Red wings
      
      // No backpack
      'None': { speed: 5, energy: 5 } // Lightweight
    }
    
    if (traits['Backpack'] && backpackMods[traits['Backpack']]) {
      Object.entries(backpackMods[traits['Backpack']]).forEach(([stat, value]) => {
        (stats as any)[stat] += value
      })
    }
    
    // Eye modifications - based on REAL traits
    const eyeMods: Record<string, Partial<Stats>> = {
      // Tech eyes
      'Hally': { crit: 15, energy: 5 }, // HAL9000 reference
      'Big Visor': { energy: 10, defense: 5 },
      'Visor': { attack: 8, crit: 5 },
      'Straight Visor': { crit: 20 }, // "can see through almost anything"
      'Thin Visor': { speed: 10, crit: 5 },
      'Three Eyes': { crit: 10, energy: 5 },
      'Two Eyes': { energy: 8, speed: 5 },
      'Blinking Eyes': { speed: 8, hp: 5 },
      
      // Expression eyes
      'Annoyed': { attack: 10, defense: 5 }, // Sarcastic
      'Dead Eyes': { crit: 25, hp: -10 }, // High crit, low health
      'Hey': { attack: 12, crit: 8 }, // "looks into your soul"
      'Sleepy': { defense: 10, speed: -5 },
      'Calm': { defense: 15, energy: 10 }, // Zen meditation
      
      // Fashion eyes
      'Gradient Shades': { speed: 10, energy: 5 },
      '80s Pop': { energy: 10, crit: 5 },
      'Thug Life': { attack: 10, crit: 10 },
      'Kurts': { crit: 15, energy: 5 }, // Cobain reference
      '3D Glasses': { energy: 8, hp: 5 },
      'Eyepatch': { attack: 15, crit: 10 } // Pirate style
    }
    
    if (traits['Eyes'] && eyeMods[traits['Eyes']]) {
      Object.entries(eyeMods[traits['Eyes']]).forEach(([stat, value]) => {
        (stats as any)[stat] += value
      })
    }
    
    // Skip Head Shape - as requested, it shouldn't affect stats
    // Head Shape is purely visual
    
    // Top (hat/hair) modifications - based on REAL traits
    const topMods: Record<string, Partial<Stats>> = {
      // Punk/Combat tops
      'Mohawk': { attack: 10, crit: 8 }, // Punk style
      'Rough Mohawk': { attack: 12, crit: 10 }, // Red mohawk
      
      // Royal/Rare tops
      'Crown': { hp: 15, defense: 10, energy: 10 }, // Royal
      'Halo': { hp: 20, defense: 15 }, // Angelic
      
      // Technical tops
      'Antenna': { energy: 15, crit: 5 },
      'Bulb': { energy: 12, hp: 5 },
      'Cable': { energy: 10, speed: 5 },
      'Glass': { energy: 15, defense: -5 }, // Fragile but powerful
      
      // Style tops
      'Curly': { speed: 8, energy: 5 }, // "hiding an antenna"
      'Ginger': { hp: 8, crit: 5 },
      'Bun': { defense: 8, speed: 5 },
      'Pony Tail': { speed: 10, attack: 5 },
      
      // Hat tops
      'Baseball Cap': { speed: 5, hp: 5 },
      'Captain': { defense: 10, hp: 8 }, // Boat captain
      'Pirate Hat': { attack: 15, crit: 10 }, // Pirate theme
      'Hat Pointing Up': { speed: 8, energy: 5 },
      
      // Animal tops
      'Bear Ears': { hp: 10, defense: 5 },
      'Bear Ears Headband': { hp: 8, speed: 5 },
      'Cat': { speed: 12, crit: 8 }, // Cat hat
      'Monkey': { speed: 10, energy: 5 },
      'Sheep': { defense: 10, hp: 5 },
      'Unicorn': { energy: 15, crit: 10 }, // Magical
      
      // Special tops
      'Big Horns': { attack: 12, defense: 8 },
      'Horns': { attack: 10, hp: 5 },
      'Pyramid': { energy: 10, defense: 5 },
      'Pyramid Horns': { attack: 8, energy: 8 },
      'Seahorse': { hp: 10, energy: 8 },
      
      // No top
      'None': { speed: 5, crit: 3 } // Lightweight
    }
    
    if (traits['Top'] && topMods[traits['Top']]) {
      Object.entries(topMods[traits['Top']]).forEach(([stat, value]) => {
        (stats as any)[stat] += value
      })
    }
    
    // Mouth modifications - based on REAL traits
    const mouthMods: Record<string, Partial<Stats>> = {
      // Happy mouths
      'Smile': { hp: 5, energy: 5 },
      'Tiny Smile': { hp: 3, speed: 3 },
      'Toothy Smile': { hp: 5, attack: 3 },
      'Grin': { energy: 8, crit: 3 },
      
      // Aggressive mouths
      'Serious': { attack: 8, defense: 5 },
      'Serious Fang': { attack: 10, crit: 8 },
      'Smile and Fangs': { attack: 8, hp: 5 },
      'Buckteeth': { hp: 8, defense: 3 },
      
      // Special mouths
      'Grill': { defense: 10, crit: 5 }, // Bling!
      'Open Mouth': { energy: 8, speed: 3 },
      'Eating': { hp: 10, energy: 5 },
      'Lips': { hp: 5, defense: 5 },
      
      // Facial hair
      'Moustache': { defense: 8, hp: 5 },
      'Blue Beard': { defense: 10, energy: 5 }
    }
    
    if (traits['Mouth'] && mouthMods[traits['Mouth']]) {
      Object.entries(mouthMods[traits['Mouth']]).forEach(([stat, value]) => {
        (stats as any)[stat] += value
      })
    }
    
    // Ear modifications - based on REAL traits
    const earMods: Record<string, Partial<Stats>> = {
      // Technical ears
      'Antenna': { energy: 8, crit: 3 },
      'Vertical Antenna': { energy: 10, speed: 3 },
      'Sonar': { crit: 8, defense: 5 },
      'Ancient Sonar': { energy: 12, crit: 10 },
      
      // Simple ears
      'Bolt': { defense: 5, hp: 3 },
      'Bulb': { energy: 5, hp: 3 },
      'Chip': { crit: 5, speed: 3 },
      
      // Decorative ears
      'Blue Flower': { hp: 5, energy: 3 },
      'Red Flower': { attack: 5, hp: 3 },
      'Teal Flower': { defense: 5, energy: 3 },
      'Blurple Flower': { energy: 5, crit: 3 },
      
      // Jewelry
      'Ring': { crit: 5, speed: 3 },
      'Pearl Earring': { hp: 8, defense: 5 },
      'Lightbolt Earring': { attack: 5, crit: 5 },
      'Rhombus Earring': { energy: 5, defense: 3 }
    }
    
    if (traits['Ear'] && earMods[traits['Ear']]) {
      Object.entries(earMods[traits['Ear']]).forEach(([stat, value]) => {
        (stats as any)[stat] += value
      })
    }
    
    // Helmet modifications (for Roboto Helmeto) - based on REAL traits
    const helmetMods: Record<string, Partial<Stats>> = {
      // Special helmets
      'Mullet': { attack: 25, crit: 20, hp: 15 }, // "Mulletos" - VERY valuable!
      'Astronaut': { defense: 15, energy: 15 },
      
      // Animal helmets
      'Bear': { hp: 15, attack: 10 },
      'Cow': { hp: 12, defense: 8 },
      'Croc': { attack: 12, crit: 8 },
      'Donkey': { hp: 10, speed: 5 },
      'Mouse': { speed: 15, crit: 5 },
      'Panda': { hp: 12, defense: 10 },
      'Pink Owl': { energy: 10, crit: 5 },
      'Yellow Owl': { energy: 8, speed: 5 },
      
      // Hair helmets
      'Fro': { hp: 10, energy: 5 },
      'Mia Bangs': { speed: 8, crit: 5 }
    }
    
    if (traits['Helmet'] && helmetMods[traits['Helmet']]) {
      Object.entries(helmetMods[traits['Helmet']]).forEach(([stat, value]) => {
        (stats as any)[stat] += value
      })
    }
    
    // Cyborgo Face modifications (for Roboto Cyborgo) - based on REAL traits
    const cyborgoFaceMods: Record<string, Partial<Stats>> = {
      'Architect': { energy: 15, defense: 10 },
      'Commander': { attack: 15, hp: 10 },
      'Robyn': { speed: 12, crit: 8 },
      'Splat': { crit: 15, energy: 5 }
    }
    
    if (traits['Cyborgo Face'] && cyborgoFaceMods[traits['Cyborgo Face']]) {
      Object.entries(cyborgoFaceMods[traits['Cyborgo Face']]).forEach(([stat, value]) => {
        (stats as any)[stat] += value
      })
    }
    
    // Computo Head modifications (for Roboto Computo) - SUPER RARE!
    const computoHeadMods: Record<string, Partial<Stats>> = {
      // All Computo heads get significant bonuses as they're super rare
      'Default': { energy: 30, crit: 20, hp: 20 }
    }
    
    if (traits['Computo Head']) {
      const mod = computoHeadMods[traits['Computo Head']] || computoHeadMods['Default']
      Object.entries(mod).forEach(([stat, value]) => {
        (stats as any)[stat] += value
      })
    }
    
    // Robot Type modifications - based on REAL traits and rarity
    const typeMods: Record<string, Partial<Stats>> = {
      'Roboto': { hp: 5, attack: 5, defense: 5 }, // Common
      'Roboto Helmeto': { defense: 10, hp: 10, attack: 5 }, // Less common
      'Roboto Cyborgo': { hp: 20, attack: 15, energy: 20, crit: 10 }, // Rare & valuable
      'Roboto Computo': { energy: 40, crit: 25, hp: 20 }, // Super rare!
      'Roboto Boomboto': { attack: 30, crit: 20, defense: -10 }, // Explosive!
      'Roboto Quetzalbot': { energy: 25, speed: 20, hp: 10 }, // Aztec-inspired
      'Roboto Robodad': { hp: 25, defense: 20, energy: 10 } // Dad bod = tanky
    }
    
    if (traits['Robot Type'] && typeMods[traits['Robot Type']]) {
      Object.entries(typeMods[traits['Robot Type']]).forEach(([stat, value]) => {
        (stats as any)[stat] += value
      })
    }
    
    // Special trait bonuses - based on REAL traits
    const specialMods: Record<string, Partial<Stats>> = {
      'Ancient Marking': { hp: 10, attack: 10, defense: 10, energy: 20 },
      'Battle Scarred': { attack: 20, defense: 15, hp: -5 }, // War veteran
      'Golden': { hp: 25, defense: 20, crit: 15 }, // Very valuable
      'Charlie Cat': { speed: 20, crit: 15, energy: 10 }, // Special cat
      'Rainbow': { energy: 20, hp: 15, crit: 10 }, // Colorful power
      '1 of 1': { hp: 50, attack: 30, defense: 30, energy: 30, speed: 20, crit: 30 } // Ultra rare!
    }
    
    if (traits['Special']) {
      // Some NFTs might have multiple special traits
      const specials = Array.isArray(traits['Special']) ? traits['Special'] : [traits['Special']]
      specials.forEach((special: string) => {
        if (specialMods[special]) {
          Object.entries(specialMods[special]).forEach(([stat, value]) => {
            (stats as any)[stat] += value
          })
        }
      })
    }
    
    // Skip Background Color and Chassis Color - as requested, they shouldn't affect stats
    
    // Ensure minimum values
    stats.hp = Math.max(stats.hp, 50)
    stats.attack = Math.max(stats.attack, 20)
    stats.defense = Math.max(stats.defense, 20)
    stats.speed = Math.max(stats.speed, 10)
    stats.energy = Math.max(stats.energy, 50)
    stats.crit = Math.max(stats.crit, 5)
    
    return stats
  }
  
  private static findUnlockedAbilities(
    traits: Record<string, string>, 
    unitType: 'roboto' | 'robopet'
  ): string[] {
    const abilities: string[] = []
    
    if (unitType === 'roboto') {
      // Always add basic ability based on element
      const element = this.determineElement(traits)
      const basicAbility = (abilityCombinations.combinations.basic_abilities as any)[element]
      if (basicAbility) {
        abilities.push(basicAbility.id)
      }
      
      // Check real NFT trait combinations first
      realAbilityCombinations.combinations.forEach(combo => {
        const hasAllRequiredTraits = Object.entries(combo.requirements).every(
          ([traitType, requiredValue]) => traits[traitType] === requiredValue
        )
        
        if (hasAllRequiredTraits && !abilities.includes(combo.id)) {
          abilities.push(combo.id)
        }
      })
      
      // Then check idealized combinations (for traits not in real mapping)
      abilityCombinations.combinations.robotos.forEach(combo => {
        const hasAllRequiredTraits = Object.entries(combo.requirements).every(
          ([traitType, requiredValue]) => traits[traitType] === requiredValue
        )
        
        if (hasAllRequiredTraits && !abilities.includes(combo.id)) {
          abilities.push(combo.id)
        }
      })
      
      // Limit to 5 abilities max
      if (abilities.length > 5) {
        // Prioritize rarer abilities
        const prioritized = abilities.sort((a, b) => {
          const comboA = abilityCombinations.combinations.robotos.find(c => c.id === a)
          const comboB = abilityCombinations.combinations.robotos.find(c => c.id === b)
          
          const rarityOrder = { common: 0, rare: 1, epic: 2, legendary: 3 }
          const rarityA = comboA ? rarityOrder[comboA.rarity as keyof typeof rarityOrder] || 0 : 0
          const rarityB = comboB ? rarityOrder[comboB.rarity as keyof typeof rarityOrder] || 0 : 0
          
          return rarityB - rarityA
        })
        
        return prioritized.slice(0, 5)
      }
    }
    
    return abilities
  }
  
  static getAbilityData(abilityId: string): any {
    // Search through all ability categories
    const allAbilities = {
      ...abilitiesV2.basic_abilities,
      ...abilitiesV2.real_trait_abilities,
      ...abilitiesV2.surge_abilities,
      ...abilitiesV2.code_abilities,
      ...abilitiesV2.metal_abilities,
      ...abilitiesV2.glitch_abilities,
      ...abilitiesV2.legendary_abilities,
      ...abilitiesV2.robopet_abilities
    }
    
    return (allAbilities as any)[abilityId] || null
  }
  
  static calculateDamage(
    attacker: BattleUnitV3,
    defender: BattleUnitV3,
    ability: any
  ): number {
    // Base damage from ability power
    let baseDamage = ability.stats.power
    
    // Handle random damage ranges
    if (typeof baseDamage === 'string' && baseDamage.includes('-')) {
      const [min, max] = baseDamage.split('-').map(Number)
      baseDamage = min + Math.random() * (max - min)
    }
    
    // Apply attacker's attack stat
    const attackMultiplier = attacker.stats.attack / 50 // 50 is baseline attack
    baseDamage *= attackMultiplier
    
    // Apply element advantages
    const elementMultiplier = this.getElementMultiplier(
      ability.element || attacker.element,
      defender.element
    )
    baseDamage *= elementMultiplier
    
    // Apply defense reduction
    const defenseReduction = defender.stats.defense / (defender.stats.defense + 100)
    baseDamage *= (1 - defenseReduction * 0.5) // Defense reduces up to 50% damage
    
    // Critical hit chance
    if (Math.random() * 100 < attacker.stats.crit) {
      baseDamage *= 1.5 // 50% more damage on crit
    }
    
    // Accuracy check - use ability accuracy only (no more accuracy stat)
    const hitChance = ability.stats.accuracy || 90
    if (Math.random() * 100 > hitChance) {
      return 0 // Miss
    }
    
    return Math.max(1, Math.round(baseDamage))
  }
  
  private static getElementMultiplier(attackElement: string, defenseElement: string): number {
    if (!attackElement || !defenseElement) return 1.0
    
    const attackKey = attackElement.toLowerCase() as keyof typeof elements.typeChart
    const typeChart = elements.typeChart[attackKey]
    if (!typeChart) return 1.0
    
    return (typeChart as any)[defenseElement.toLowerCase()] || 1.0
  }
  
  static getElementColor(element: string): string {
    return (elements.elements as any)[element]?.color || '#FFFFFF'
  }
  
  static getElementSymbol(element: string): string {
    return (elements.elements as any)[element]?.symbol || '?'
  }
}