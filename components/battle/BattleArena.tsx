"use client";

import { useState, useEffect } from "react";
import {
  BattleUnitV3,
  TraitProcessorV3,
} from "../../lib/game-engine/TraitProcessorV3";
import BattleArenaV3 from "./BattleArenaV3";
import sampleRobotoDatabase from "../../lib/data/sample-roboto-database.json";
import type { BattleSettings } from "../../app/battle/page";

interface BattleArenaProps {
  playerTeam: BattleUnitV3[];
  onBattleEnd: (won: boolean) => void;
  // PvP specific props
  isPvP?: boolean;
  enemyTeam?: BattleUnitV3[];
  isPlayerTurn?: boolean;
  serverTimer?: number;
  currentPhase?: string;
  onAction?: (action: any) => void;
  onActionPhase?: (action: string) => void;
  onTargetPhase?: (targetId: string) => void;
  onTargetPreview?: (targetId: string) => void;
  roomState?: any;
  serverTurnEvent?: any;
  opponentTargetPreview?: string | null;
}

export default function BattleArena({
  playerTeam,
  onBattleEnd,
  isPvP = false,
  enemyTeam: providedEnemyTeam,
  isPlayerTurn,
  serverTimer,
  currentPhase,
  onAction,
  onActionPhase,
  onTargetPhase,
  onTargetPreview,
  roomState,
  serverTurnEvent,
  opponentTargetPreview,
}: BattleArenaProps) {
  const [enemyTeam, setEnemyTeam] = useState<BattleUnitV3[]>(
    providedEnemyTeam || [],
  );
  const [loading, setLoading] = useState(!isPvP); // No loading for PvP (teams already provided)
  const [settings, setSettings] = useState<BattleSettings>({
    teamSize: 5,
    speed: "speedy",
  });

  useEffect(() => {
    // Load battle settings
    const savedSettings = localStorage.getItem("battle_settings");
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(parsed);
      } catch (e) {
        // Use defaults if parsing fails
      }
    }

    // Skip enemy generation for PvP (teams already provided)
    if (isPvP) {
      setLoading(false);
      return;
    }

    // Generate enemy team from sample database
    const generateEnemyTeam = () => {
      const enemies: BattleUnitV3[] = [];
      const usedIndices = new Set<number>();
      const teamSize = savedSettings ? JSON.parse(savedSettings).teamSize : 5;

      // Pick random Robotos from the database matching team size
      while (enemies.length < teamSize) {
        const randomIndex = Math.floor(
          Math.random() * sampleRobotoDatabase.length,
        );
        if (usedIndices.has(randomIndex)) continue;

        usedIndices.add(randomIndex);
        const roboto = sampleRobotoDatabase[randomIndex];

        const battleUnit = TraitProcessorV3.processRobotoTraits({
          tokenId: roboto.tokenId,
          name: roboto.name,
          image: roboto.image,
          attributes: roboto.attributes,
        });

        enemies.push(battleUnit);
      }

      return enemies;
    };

    setEnemyTeam(generateEnemyTeam());
    setLoading(false);
  }, []);

  if (loading || enemyTeam.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-green-400 text-xl animate-pulse">
          LOADING BATTLE ARENA...
        </p>
      </div>
    );
  }

  return (
    <BattleArenaV3
      playerTeam={playerTeam}
      enemyTeam={enemyTeam}
      onBattleEnd={onBattleEnd}
      isPvP={isPvP}
      isPlayerTurn={isPlayerTurn}
      serverTimer={serverTimer}
      currentPhase={currentPhase}
      onAction={onAction}
      onActionPhase={onActionPhase}
      onTargetPhase={onTargetPhase}
      onTargetPreview={onTargetPreview}
      serverBattleResult={roomState}
      serverTurnEvent={serverTurnEvent}
      opponentTargetPreview={opponentTargetPreview}
    />
  );
}
