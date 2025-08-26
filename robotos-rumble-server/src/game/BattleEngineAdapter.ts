// Adapter to use the real BattleEngineV3 on the server
// This eliminates duplicate implementation and ensures consistency

import { BattleEngineV3, BattleAction } from '../../../shared/game-engine/BattleEngineV3';
import { BattleUnitV3, TraitProcessorV3 } from '../../../shared/game-engine/TraitProcessorV3';

export interface ServerBattleUnit {
  id: string;
  ownerId: string;
  name: string;
  element: string;
  stats: {
    hp: number;
    attack: number;
    defense: number;
    speed: number;
    energy: number;
    crit: number;
  };
  abilities: string[];
  currentHp: number;
  currentEnergy: number;
  isAlive: boolean;
  position: number;
}

export class BattleEngineAdapter {
  private engine: BattleEngineV3;
  private unitOwnerMap: Map<string, string> = new Map(); // unitId -> ownerId

  constructor() {
    this.engine = new BattleEngineV3();
  }

  initializeBattle(playerTeam: ServerBattleUnit[], enemyTeam: ServerBattleUnit[]) {
    // Convert server units to BattleEngineV3 format
    const convertedPlayerTeam: BattleUnitV3[] = playerTeam.map((unit, index) => {
      this.unitOwnerMap.set(unit.id, unit.ownerId);
      return {
        id: unit.id,
        name: unit.name,
        type: 'roboto' as const,
        element: unit.element as any,
        stats: unit.stats,
        abilities: unit.abilities,
        tokenId: unit.id.split('-')[1] || '0',
        imageUrl: '',
        position: index,
        traits: {},
        elementModifiers: {
          strongAgainst: [],
          weakAgainst: [],
        },
      };
    });

    const convertedEnemyTeam: BattleUnitV3[] = enemyTeam.map((unit, index) => {
      this.unitOwnerMap.set(unit.id, unit.ownerId);
      return {
        id: unit.id,
        name: unit.name,
        type: 'roboto' as const,
        element: unit.element as any,
        stats: unit.stats,
        abilities: unit.abilities,
        tokenId: unit.id.split('-')[1] || '0',
        imageUrl: '',
        position: index,
        traits: {},
        elementModifiers: {
          strongAgainst: [],
          weakAgainst: [],
        },
      };
    });

    // Initialize the real battle engine
    this.engine.initializeBattle(convertedPlayerTeam, convertedEnemyTeam);
  }

  validateAction(action: BattleAction, playerId: string): boolean {
    // Check if it's this player's unit
    const ownerId = this.unitOwnerMap.get(action.sourceId);
    if (ownerId !== playerId) return false;

    // Let the engine validate the rest
    const state = this.engine.getState();
    const currentUnit = this.getCurrentUnit();
    
    if (!currentUnit || currentUnit.id !== action.sourceId) return false;
    
    return true;
  }

  executeAction(action: BattleAction & { playerId?: string }): {
    damage?: number;
    remainingHP?: number;
    targetKO?: boolean;
    battleEnded?: boolean;
    winner?: string;
    events?: any[];
  } {
    // Validate if playerId is provided
    if (action.playerId && !this.validateAction(action, action.playerId)) {
      console.log(`[BattleEngineAdapter] Action validation failed for player ${action.playerId}`);
      return {};
    }

    // Remove playerId before passing to engine
    const engineAction: BattleAction = {
      type: action.type,
      sourceId: action.sourceId,
      targetId: action.targetId,
      abilityId: action.abilityId,
      timingBonus: action.timingBonus,
      defenseBonus: action.defenseBonus,
    };

    const result = this.engine.executeAction(engineAction);
    const state = this.engine.getState();

    // Extract key information from the result
    const response: any = {};

    // Check for damage events
    const damageEvent = result.events.find(e => e.type === 'damage');
    if (damageEvent) {
      response.damage = damageEvent.value;
      
      // Get target's remaining HP
      const targetStatus = state.unitStatuses.get(action.targetId!);
      if (targetStatus) {
        response.remainingHP = targetStatus.currentHp;
        response.targetKO = !targetStatus.isAlive;
      }
    }

    // Check for battle end
    if (state.status === 'victory' || state.status === 'defeat') {
      response.battleEnded = true;
      
      // Determine winner based on which team has units alive
      const playerAlive = state.playerTeam.some(u => {
        const status = state.unitStatuses.get(u.id);
        return status && status.isAlive;
      });
      
      const enemyAlive = state.enemyTeam.some(u => {
        const status = state.unitStatuses.get(u.id);
        return status && status.isAlive;
      });

      if (playerAlive && !enemyAlive) {
        // Get the owner of the first player team unit
        const firstPlayerUnit = state.playerTeam[0];
        response.winner = this.unitOwnerMap.get(firstPlayerUnit.id) || 'unknown';
      } else if (!playerAlive && enemyAlive) {
        // Get the owner of the first enemy team unit
        const firstEnemyUnit = state.enemyTeam[0];
        response.winner = this.unitOwnerMap.get(firstEnemyUnit.id) || 'unknown';
      } else {
        response.winner = 'draw';
      }
    }

    response.events = result.events;
    return response;
  }

  getCurrentUnit(): (BattleUnitV3 & { ownerId: string }) | null {
    const state = this.engine.getState();
    if (state.turnIndex >= state.turnOrder.length) {
      return null;
    }
    
    const unitId = state.turnOrder[state.turnIndex];
    const allUnits = [...state.playerTeam, ...state.enemyTeam];
    const unit = allUnits.find(u => u.id === unitId);
    
    if (!unit) return null;
    
    // Add ownerId to the unit
    return {
      ...unit,
      ownerId: this.unitOwnerMap.get(unit.id) || '',
    };
  }

  getState() {
    const state = this.engine.getState();
    const units: ServerBattleUnit[] = [];

    // Convert all units back to server format
    [...state.playerTeam, ...state.enemyTeam].forEach(unit => {
      const status = state.unitStatuses.get(unit.id);
      if (status) {
        units.push({
          id: unit.id,
          ownerId: this.unitOwnerMap.get(unit.id) || '',
          name: unit.name,
          element: unit.element,
          stats: unit.stats,
          abilities: unit.abilities,
          currentHp: status.currentHp,
          currentEnergy: status.currentEnergy,
          isAlive: status.isAlive,
          position: (unit as any).position || 0,
        });
      }
    });

    return {
      units,
      turnOrder: state.turnOrder,
      turnIndex: state.turnIndex,
      currentUnit: this.getCurrentUnit(),
      battleLog: state.battleLog.slice(-10),
      status: state.status,
    };
  }

  getUnitOwner(unitId: string): string | undefined {
    return this.unitOwnerMap.get(unitId);
  }

  // Expose units map for compatibility with existing room code
  get units(): Map<string, ServerBattleUnit> {
    const unitsMap = new Map<string, ServerBattleUnit>();
    const state = this.getState();
    
    state.units.forEach(unit => {
      unitsMap.set(unit.id, unit);
    });
    
    return unitsMap;
  }
}