"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount } from "wagmi";
import { cn } from "../../lib/utils";
import {
  BattleUnitV3,
  TraitProcessorV3,
} from "../../lib/game-engine/TraitProcessorV3";
import { BattleEngineV3 } from "../../lib/game-engine/BattleEngineV3";
import { gameSounds } from "../../lib/sounds/gameSounds";
import RobotoUnit from "./RobotoUnit";
import BattleFooter from "./BattleFooter";
import TimingMeter from "../ui/TimingMeter";
import TimingMeterCharge from "../ui/TimingMeterCharge";
import TimingMeterSpinner from "../ui/TimingMeterSpinner";
import AttackAnimation from "./AttackAnimation";
import AttackProjectile from "./AttackProjectile";
import Particles from "../backgrounds/Particles";
import DotGrid from "../backgrounds/DotGrid";
import LightRays from "../backgrounds/LightRays";
import Galaxy from "../backgrounds/Galaxy";
import Aurora from "../backgrounds/Aurora";
import type { BattleSettings } from "../../app/battle/page";
import type { BattleRecord } from "../../lib/storage/types";
import { useBackground } from "../shared/BackgroundSelector";

interface BattleArenaV3Props {
  playerTeam: BattleUnitV3[];
  enemyTeam: BattleUnitV3[];
  onBattleEnd: (won: boolean) => void;
  // PvP specific props
  isPvP?: boolean;
  isPlayerTurn?: boolean;
  serverTimer?: number;
  onAction?: (action: any) => void;
}

type BattlePhase =
  | "waiting"
  | "selecting-action"
  | "selecting-target"
  | "attack-timing"
  | "defending"
  | "executing";

// Ability timing type mapping
const ABILITY_TIMING_MAP: Record<string, "charge" | "spinner" | "precision"> = {
  // Charge up abilities
  overload_protocol: "charge",
  electron_surge: "charge",
  computo_overclock: "charge",
  overcharged_compression: "charge",
  war_veteran_rage: "charge",
  synchronized_devastation: "charge",
  thunder_storm: "charge",

  // Spinner abilities
  katana_strike: "spinner",
  saw_blade_fury: "spinner",
  armored_blade_master: "spinner",
  jetpack_assault: "spinner",
  crushing_impact: "spinner",
  viral_cascade: "spinner",
  lightning_dash: "spinner",

  // Everything else defaults to precision (left-right meter)
};

export default function BattleArenaV3({
  playerTeam,
  enemyTeam,
  onBattleEnd,
  isPvP = false,
  isPlayerTurn: serverIsPlayerTurn,
  serverTimer,
  onAction: onPvPAction,
}: BattleArenaV3Props) {
  const { address } = useAccount();

  // Load battle settings
  const [settings, setSettings] = useState<BattleSettings>({
    teamSize: 5,
    speed: "speedy",
  });

  useEffect(() => {
    const savedSettings = localStorage.getItem("battle_settings");
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (e) {
        // Use defaults if parsing fails
      }
    }
  }, []);

  // Calculate timer duration based on speed setting
  const timerDuration = settings.speed === "calm" ? 10 : 5;

  // Battle tracking for stats
  const battleStartTime = useRef<number>(Date.now());
  const totalDamageDealt = useRef<number>(0);
  const totalDamageReceived = useRef<number>(0);

  // Battle state
  const [battleEngine] = useState(() => new BattleEngineV3());
  const [battleState, setBattleState] = useState(battleEngine.getState());
  const [currentUnit, setCurrentUnit] = useState<BattleUnitV3 | null>(null);
  const [targetUnit, setTargetUnit] = useState<BattleUnitV3 | null>(null);

  // UI state
  const [phase, setPhase] = useState<BattlePhase>("waiting");
  // In PvP mode, use server's turn state, otherwise manage locally
  const [localIsPlayerTurn, setLocalIsPlayerTurn] = useState(false);
  const isPlayerTurn = isPvP
    ? (serverIsPlayerTurn ?? false)
    : localIsPlayerTurn;
  const setIsPlayerTurn = isPvP ? () => {} : setLocalIsPlayerTurn;
  const [message, setMessage] = useState<string>("");
  const [pendingAction, setPendingAction] = useState<{
    type: "attack" | "ability";
    abilityId?: string;
  } | null>(null);

  // Turn order tracking
  const turnIndexRef = useRef(0);
  const [playerTurnIndex, setPlayerTurnIndex] = useState(0);
  const [enemyTurnIndex, setEnemyTurnIndex] = useState(0);

  // Use background from shared selector
  const selectedBackground = useBackground();

  // Animation states
  const [attackingUnitId, setAttackingUnitId] = useState<string | null>(null);
  const [defendingUnitId, setDefendingUnitId] = useState<string | null>(null);
  const [damageNumbers, setDamageNumbers] = useState<
    {
      unitId: string;
      damage: number;
      type: "normal" | "critical" | "effective" | "weak" | "miss";
      timestamp: number;
    }[]
  >([]);

  // New animation states
  const [projectileActive, setProjectileActive] = useState(false);
  const [explosionActive, setExplosionActive] = useState(false);
  const [attackerPosition, setAttackerPosition] = useState({ x: 0, y: 0 });
  const [defenderPosition, setDefenderPosition] = useState({ x: 0, y: 0 });
  const [currentAttackType, setCurrentAttackType] = useState<
    "normal" | "critical" | "effective" | "weak" | "miss"
  >("normal");
  const [attackElement, setAttackElement] = useState<string>("energy");

  // UI focus state
  const [focusedActionIndex, setFocusedActionIndex] = useState(0);

  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Timing states
  const [attackScore, setAttackScore] = useState(1.0);
  const [defenseScore, setDefenseScore] = useState(1.0);
  const [actionCountdown, setActionCountdown] = useState(timerDuration);
  const [targetCountdown, setTargetCountdown] = useState(timerDuration);
  const [attackCountdown, setAttackCountdown] = useState(5); // Keep at 5 for timing minigame
  const [defenseActive, setDefenseActive] = useState(false);
  const [defenseCommitted, setDefenseCommitted] = useState(false);
  const [attackCommitted, setAttackCommitted] = useState(false);

  // Store interval refs for cleanup
  const actionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const targetIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const attackIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize battle
  useEffect(() => {
    battleEngine.initializeBattle(playerTeam, enemyTeam);
    setBattleState(battleEngine.getState());
    gameSounds.play("roundStart");
    showMessage("Battle Start! Get ready!");
    setTimeout(() => startNextTurn(), 2000);

    // Cleanup intervals on unmount
    return () => {
      if (actionIntervalRef.current) clearInterval(actionIntervalRef.current);
      if (targetIntervalRef.current) clearInterval(targetIntervalRef.current);
      if (attackIntervalRef.current) clearInterval(attackIntervalRef.current);
    };
  }, []);

  const showMessage = (msg: string, duration = 2000) => {
    setMessage(msg);
    if (duration > 0) {
      setTimeout(() => setMessage(""), duration);
    }
  };

  const getNextAliveUnit = (
    team: BattleUnitV3[],
    currentIndex: number,
  ): { unit: BattleUnitV3 | null; index: number } => {
    // Start from the next index
    let index = (currentIndex + 1) % team.length;
    const startIndex = index;

    do {
      const unit = team[index];
      const status = battleState.unitStatuses.get(unit.id);
      if (status?.isAlive) {
        return { unit, index };
      }
      index = (index + 1) % team.length;
    } while (index !== startIndex);

    return { unit: null, index: -1 };
  };

  const startNextTurn = useCallback(() => {
    const state = battleEngine.getState();
    setBattleState(state);

    // Check for battle end
    const alivePlayerUnits = playerTeam.filter(
      (u) => state.unitStatuses.get(u.id)?.isAlive,
    ).length;
    const aliveEnemyUnits = enemyTeam.filter(
      (u) => state.unitStatuses.get(u.id)?.isAlive,
    ).length;

    if (alivePlayerUnits === 0 || aliveEnemyUnits === 0) {
      handleBattleEnd(alivePlayerUnits > 0);
      return;
    }

    // Alternate between teams
    const isPlayerTurnNext = turnIndexRef.current % 2 === 0;
    setIsPlayerTurn(isPlayerTurnNext);
    turnIndexRef.current += 1;

    // Get next unit in rotation
    if (isPlayerTurnNext) {
      const { unit, index } = getNextAliveUnit(playerTeam, playerTurnIndex);
      if (unit) {
        setPlayerTurnIndex(index);
        setCurrentUnit(unit);
        handleUnitActivation(unit, true);
      }
    } else {
      const { unit, index } = getNextAliveUnit(enemyTeam, enemyTurnIndex);
      if (unit) {
        setEnemyTurnIndex(index);
        setCurrentUnit(unit);
        handleUnitActivation(unit, false);
      }
    }
  }, [battleEngine, playerTeam, enemyTeam, playerTurnIndex, enemyTurnIndex]);

  const handleUnitActivation = (unit: BattleUnitV3, isPlayer: boolean) => {
    // Play different sounds for player vs enemy turns
    if (isPlayerTurn) {
      gameSounds.play("playerTurn");
    } else {
      gameSounds.play("enemyTurn");
    }
    showMessage(`${unit.name} steps forward!`);

    if (isPlayer) {
      setPhase("selecting-action");
      setActionCountdown(timerDuration);
      // Clear any existing interval
      if (actionIntervalRef.current) {
        clearInterval(actionIntervalRef.current);
        actionIntervalRef.current = null;
      }
    } else {
      // AI turn - open defense window for player
      setPhase("defending");
      setDefenseActive(true);
      setDefenseCommitted(false);
      setDefenseScore(1.0);
      setTimeout(() => executeAITurn(unit), 1500);
    }
  };

  const executeAITurn = (unit: BattleUnitV3) => {
    // Get fresh state
    const currentState = battleEngine.getState();

    // Get alive targets
    const aliveTargets = playerTeam.filter(
      (u) => currentState.unitStatuses.get(u.id)?.isAlive,
    );
    if (aliveTargets.length === 0) return;

    // Smarter AI target selection
    let target: BattleUnitV3;
    const aiIntelligence = Math.random(); // Random intelligence level for variety

    if (aiIntelligence > 0.7) {
      // Smart AI (30% chance): Target based on strategy
      const targetsWithHealth = aliveTargets.map((t) => ({
        unit: t,
        hp: currentState.unitStatuses.get(t.id)?.currentHp || 0,
        maxHp: t.stats.hp,
        hpPercent:
          ((currentState.unitStatuses.get(t.id)?.currentHp || 0) / t.stats.hp) *
          100,
      }));

      // Prioritize low health targets (under 30% HP)
      const lowHealthTargets = targetsWithHealth.filter(
        (t) => t.hpPercent < 30,
      );
      if (lowHealthTargets.length > 0) {
        target = lowHealthTargets[0].unit;
      } else {
        // Otherwise target the highest damage dealer
        target = aliveTargets.reduce((prev, curr) =>
          curr.stats.attack > prev.stats.attack ? curr : prev,
        );
      }
    } else if (aiIntelligence > 0.4) {
      // Medium AI (30% chance): Consider element advantages
      // Simple element advantage check (SURGE > METAL, CODE > SURGE, METAL > GLITCH, GLITCH > CODE)
      const hasAdvantage = (attacker: string, defender: string): boolean => {
        if (attacker === "SURGE" && defender === "METAL") return true;
        if (attacker === "CODE" && defender === "SURGE") return true;
        if (attacker === "METAL" && defender === "GLITCH") return true;
        if (attacker === "GLITCH" && defender === "CODE") return true;
        return false;
      };

      const advantageTargets = aliveTargets.filter((t) =>
        hasAdvantage(unit.element, t.element),
      );
      target =
        advantageTargets.length > 0
          ? advantageTargets[
              Math.floor(Math.random() * advantageTargets.length)
            ]
          : aliveTargets[Math.floor(Math.random() * aliveTargets.length)];
    } else {
      // Basic AI (40% chance): Random selection (original behavior)
      target = aliveTargets[Math.floor(Math.random() * aliveTargets.length)];
    }

    setTargetUnit(target);
    setDefendingUnitId(target.id);
    setAttackingUnitId(unit.id);

    // Determine if AI will use ability or basic attack
    const availableAbilities = battleEngine
      .getAvailableAbilities(unit.id)
      .filter((a) => battleEngine.canUseAbility(unit.id, a.id));

    const willUseAbility =
      availableAbilities.length > 0 && Math.random() < 0.35; // 35% chance to use ability
    const selectedAbility = willUseAbility
      ? availableAbilities[
          Math.floor(Math.random() * availableAbilities.length)
        ]
      : null;

    // Show attack message with attack type
    if (selectedAbility) {
      showMessage(`${unit.name} prepares ${selectedAbility.ability.name}!`);
    } else {
      // Pick a random basic attack name based on element
      const attackNames = getElementAttackNames(unit.element);
      const attackName =
        attackNames[Math.floor(Math.random() * attackNames.length)];
      showMessage(`${unit.name} uses ${attackName}!`);
    }

    // AI delay varies based on "thinking" time
    const aiDelay = 1200 + Math.random() * 1300; // 1.2-2.5 seconds

    setTimeout(() => {
      setPhase("executing");

      // Improved AI timing skill based on battle progress
      const turnNumber = currentState.turn || 1;
      const difficultyScale = Math.min(turnNumber / 10, 1); // Scales up over 10 turns

      // Better timing as battle progresses
      const baseScore = timerDuration === 5 ? 1.2 : 1.0; // Speedy mode gets better base
      const skillRange = timerDuration === 5 ? 0.6 : 0.5; // Speedy: 1.2-1.8x, Calm: 1.0-1.5x
      const aiAttackScore =
        baseScore + Math.random() * skillRange * (0.5 + difficultyScale * 0.5);

      // Occasionally hit perfect timing (5% chance)
      const perfectHit = Math.random() < 0.05;
      const finalAttackScore = perfectHit ? 2.0 : aiAttackScore;

      // Use player's defense score if they defended, otherwise weak defense
      const finalDefenseScore = defenseCommitted ? defenseScore : 0.8;

      // Store the action for executeAttack
      if (selectedAbility) {
        setPendingAction({
          type: "ability",
          abilityId: selectedAbility.id,
        });
      } else {
        setPendingAction({
          type: "attack",
        });
      }

      executeAttack(unit, target, finalAttackScore, finalDefenseScore);
    }, aiDelay);
  };

  // Helper function to get attack names based on element
  const getElementAttackNames = (element: string): string[] => {
    switch (element.toUpperCase()) {
      case "SURGE":
        return [
          "Lightning Strike",
          "Thunder Bolt",
          "Electric Surge",
          "Volt Tackle",
        ];
      case "CODE":
        return [
          "Data Breach",
          "System Crash",
          "Binary Blast",
          "Firewall Break",
        ];
      case "METAL":
        return ["Iron Bash", "Steel Strike", "Metal Claw", "Titanium Punch"];
      case "GLITCH":
        return [
          "Chaos Strike",
          "Corruption Wave",
          "Error Cascade",
          "System Glitch",
        ];
      case "BOND":
        return [
          "Unity Strike",
          "Harmony Blast",
          "Friendship Power",
          "Loyalty Attack",
        ];
      case "WILD":
        return ["Primal Strike", "Feral Claw", "Nature's Wrath", "Savage Bite"];
      default:
        return ["Basic Strike", "Quick Attack", "Standard Blow", "Normal Hit"];
    }
  };

  const handleBattleEnd = async (won: boolean) => {
    setPhase("waiting");
    if (won) {
      gameSounds.play("victory");
      showMessage("VICTORY! You defeated the enemy team!", 0);
    } else {
      gameSounds.play("defeat");
      showMessage("DEFEAT... Better luck next time.", 0);
    }

    // Save battle results if player is connected
    if (address) {
      try {
        const battleDuration = Math.floor(
          (Date.now() - battleStartTime.current) / 1000,
        );

        const battleData: BattleRecord = {
          id: `battle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          playerAddress: address,
          timestamp: new Date().toISOString(),
          result: won ? "victory" : "defeat",
          duration: battleDuration,
          teamUsed: playerTeam.map((u) => ({
            id: u.id,
            name: u.name,
            element: u.element,
            type: u.type,
          })),
          enemyTeam: enemyTeam.map((u) => ({
            id: u.id,
            name: u.name,
            element: u.element,
            type: u.type,
          })),
          damageDealt: totalDamageDealt.current,
          damageReceived: totalDamageReceived.current,
          elementsUsed: Array.from(new Set(playerTeam.map((u) => u.element))),
        };

        const response = await fetch("/api/battles/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(battleData),
        });

        if (response.ok) {
          const result = await response.json();

          // Show achievements if any
          if (result.newAchievements?.length > 0) {
            // TODO: Show achievement notifications
            console.log("New achievements unlocked:", result.newAchievements);
          }

          if (result.newBadges?.length > 0) {
            // TODO: Show badge notifications
            console.log("New badges earned:", result.newBadges);
          }
        }
      } catch (error) {
        console.error("Failed to save battle results:", error);
      }
    }

    setTimeout(() => {
      onBattleEnd(won);
    }, 3000);
  };

  const handleAttack = useCallback(() => {
    setPendingAction({ type: "attack" });
    setPhase("selecting-target");
    setTargetCountdown(timerDuration);

    // Pre-select first alive enemy for keyboard navigation
    // But still wait for full timer before auto-confirming
    const aliveEnemies = enemyTeam.filter(
      (u) => battleState.unitStatuses.get(u.id)?.isAlive,
    );
    if (aliveEnemies.length > 0) {
      setTargetUnit(aliveEnemies[0]);
    }

    // Clear action interval when moving to target selection
    if (actionIntervalRef.current) {
      clearInterval(actionIntervalRef.current);
      actionIntervalRef.current = null;
    }
  }, [battleState, timerDuration, enemyTeam]);

  const handleAbility = (abilityIndex: number) => {
    const abilityId = currentUnit?.abilities[abilityIndex];
    if (!abilityId) return;

    setPendingAction({ type: "ability", abilityId });
    setPhase("selecting-target");
    setTargetCountdown(timerDuration);

    // Pre-select first alive enemy for keyboard navigation
    // But still wait for full timer before auto-confirming
    const aliveEnemies = enemyTeam.filter(
      (u) => battleState.unitStatuses.get(u.id)?.isAlive,
    );
    if (aliveEnemies.length > 0) {
      setTargetUnit(aliveEnemies[0]);
    }
  };

  const handleTargetSelect = (unitId: string, autoConfirm: boolean = false) => {
    const unit = [...playerTeam, ...enemyTeam].find((u) => u.id === unitId);
    if (unit && unit.id !== targetUnit?.id) {
      gameSounds.play("targetSelect");
    }
    setTargetUnit(unit || null);

    // Auto-confirm if this was a mouse click
    if (autoConfirm && unit) {
      // Small delay to show selection before confirming
      setTimeout(() => {
        handleTargetConfirm();
      }, 100);
    }
  };

  const handleTargetConfirm = useCallback(() => {
    if (!currentUnit || !targetUnit) return;

    gameSounds.play("targetConfirm");
    showMessage(`Time your attack!`);
    setPhase("attack-timing");
    setAttackingUnitId(currentUnit.id);
    setDefendingUnitId(targetUnit.id);
    setAttackCountdown(5); // Keep at 5 for timing minigame
    setAttackScore(1.0);
    setAttackCommitted(false);

    // Clear any existing intervals
    if (targetIntervalRef.current) {
      clearInterval(targetIntervalRef.current);
      targetIntervalRef.current = null;
    }
    if (attackIntervalRef.current) {
      clearInterval(attackIntervalRef.current);
      attackIntervalRef.current = null;
    }
  }, [currentUnit, targetUnit]);

  const handleAttackTiming = (score: number) => {
    if (!currentUnit || !targetUnit || attackCommitted) return;

    // Clear attack interval when player inputs
    if (attackIntervalRef.current) {
      clearInterval(attackIntervalRef.current);
      attackIntervalRef.current = null;
    }

    setAttackScore(score);
    setAttackCommitted(true);
    setPhase("executing");
    showMessage(`${currentUnit.name} attacks ${targetUnit.name}!`);

    // Execute attack with timing bonus after a delay to show result
    setTimeout(() => {
      executeAttack(currentUnit, targetUnit, score, defenseScore);
    }, 1000); // Increased delay to 1s to better show the result
  };

  const handleDefenseTiming = (score: number) => {
    if (defenseCommitted) return;

    setDefenseScore(score);
    setDefenseCommitted(true);
    // Keep defenseActive true so the meter stays visible
    // It will be cleared when the attack executes

    const message =
      score >= 1.5
        ? "Perfect defense!"
        : score >= 1.25
          ? "Good defense!"
          : score >= 1.0
            ? "Defense ready"
            : "Weak defense";
    showMessage(message);
    gameSounds.play("defend");
  };

  // Helper function to get unit position in the DOM
  const getUnitPosition = (unitId: string): { x: number; y: number } => {
    // Try to find the actual Roboto image container inside the wrapper
    const wrapper = document.querySelector(`[data-unit-id="${unitId}"]`);
    if (wrapper) {
      // Look for the image container which has the actual Roboto
      const imageContainer = wrapper.querySelector(".roboto-image-container");
      const element = imageContainer || wrapper;

      const rect = element.getBoundingClientRect();
      // Get the center of the element
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      return {
        x: centerX,
        y: centerY,
      };
    }
    return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  };

  // Helper function to map element to projectile type
  const getProjectileType = (
    element: string,
  ):
    | "energy"
    | "glitch"
    | "metal"
    | "electric"
    | "fire"
    | "plasma"
    | "void"
    | "laser" => {
    const elementMap: Record<string, any> = {
      SURGE: "electric",
      CODE: "glitch",
      METAL: "metal",
      GLITCH: "void",
      FIRE: "fire",
      PLASMA: "plasma",
      LASER: "laser",
    };
    return elementMap[element.toUpperCase()] || "energy";
  };

  const executeAttack = (
    attacker: BattleUnitV3,
    defender: BattleUnitV3,
    atkScore: number = 1.0,
    defScore: number = 1.0,
  ) => {
    // Get attack/ability name for display
    let attackName = "Basic Attack";
    if (pendingAction?.type === "ability" && pendingAction.abilityId) {
      const abilityData = TraitProcessorV3.getAbilityData(
        pendingAction.abilityId,
      );
      attackName = abilityData?.name || "Special Attack";
    }

    // Get positions for animation
    const attackerPos = getUnitPosition(attacker.id);
    const defenderPos = getUnitPosition(defender.id);
    setAttackerPosition(attackerPos);
    setDefenderPosition(defenderPos);

    // Set attack element for projectile
    setAttackElement(getProjectileType(attacker.element));

    // Calculate defense bonus from score
    const defenseBonus =
      defScore >= 1.5
        ? 0.5
        : defScore >= 1.25
          ? 0.75
          : defScore >= 1.0
            ? 1.0
            : 1.2;

    // Get defender's HP BEFORE the attack
    const prevHp =
      battleEngine.getState().unitStatuses.get(defender.id)?.currentHp ||
      defender.stats.hp;

    // Update battle state through the engine with timing bonuses
    const result = battleEngine.executeAction({
      type: pendingAction?.type || "attack",
      sourceId: attacker.id,
      targetId: defender.id,
      abilityId: pendingAction?.abilityId,
      timingBonus: atkScore,
      defenseBonus: defenseBonus,
    } as any);

    // Get the updated state
    const newState = battleEngine.getState();
    setBattleState(newState);

    // Calculate actual damage dealt for display
    const targetStatus = newState.unitStatuses.get(defender.id);
    const actualDamage = prevHp - (targetStatus?.currentHp || 0);

    // Track damage for stats
    if (actualDamage > 0) {
      const isPlayerAttacking = playerTeam.some((u) => u.id === attacker.id);
      if (isPlayerAttacking) {
        totalDamageDealt.current += actualDamage;
      } else {
        totalDamageReceived.current += actualDamage;
      }
    }

    // Play attack sound based on damage amount
    if (actualDamage === 0) {
      gameSounds.play("miss");
    } else if (actualDamage < 30) {
      gameSounds.play("attackWeak");
    } else if (actualDamage < 60) {
      gameSounds.play("attackNormal");
    } else if (actualDamage < 100) {
      gameSounds.play("attackStrong");
    } else {
      gameSounds.play("attackDevastating");
    }

    // Determine damage type based on actual results and timing
    let damageType: "normal" | "critical" | "effective" | "weak" | "miss" =
      "normal";

    if (actualDamage === 0) {
      damageType = "miss";
    } else {
      // First check for critical hit
      const critEvent = result.events?.find((e) =>
        e.description?.includes("Critical"),
      );
      if (critEvent) {
        damageType = "critical";
        // Play special critical sound for high damage criticals
        if (actualDamage >= 100) {
          gameSounds.play("criticalSuper");
        } else if (atkScore >= 1.5) {
          gameSounds.play("criticalCombo"); // Perfect timing + critical
        } else {
          gameSounds.play("critical");
        }
      }
      // Then check element effectiveness
      else if (result.events) {
        const elementEvent = result.events.find((e) =>
          e.description?.includes("SUPER EFFECTIVE"),
        );
        const weakEvent = result.events.find((e) =>
          e.description?.includes("NOT VERY EFFECTIVE"),
        );
        if (elementEvent) {
          damageType = "effective";
        } else if (weakEvent) {
          damageType = "weak";
        }
      }
      // Default to normal for regular hits
    }

    // Add timing quality to the display
    if (atkScore >= 1.5 && damageType === "normal") {
      damageType = "critical"; // Show perfect timing as critical
    }

    // Store attack type for animation
    setCurrentAttackType(damageType);

    // Start animation sequence
    // 1. Launch projectile
    setProjectileActive(true);

    // 2. After projectile travel time, trigger explosion and damage
    setTimeout(() => {
      setProjectileActive(false);

      // Get fresh position for explosion (in case unit moved)
      const freshDefenderPos = getUnitPosition(defender.id);
      setDefenderPosition(freshDefenderPos);

      setExplosionActive(true);
      setDefendingUnitId(defender.id); // This will trigger shake animation
      gameSounds.play("explosion"); // Play explosion impact sound
      showDamage(defender.id, actualDamage, damageType);

      // 3. Clear explosion after animation
      setTimeout(() => {
        setExplosionActive(false);
        setDefendingUnitId(null); // Clear shake animation
      }, 1500);
    }, 500); // 500ms projectile travel time

    // Show what attack was used (especially for enemy attacks)
    const isPlayerAttacking = playerTeam.some((u) => u.id === attacker.id);
    if (!isPlayerAttacking && actualDamage > 0) {
      const attackMessage = `${attacker.name} used ${attackName} for ${actualDamage} damage!`;
      showMessage(attackMessage);
    }

    // Check if defender was defeated
    if (!targetStatus?.isAlive) {
      setTimeout(() => {
        showMessage(`${defender.name} has been defeated!`);
        gameSounds.play("defeat");
      }, 1000);
    }

    // Reset states and continue to next turn
    setTimeout(() => {
      setAttackingUnitId(null);
      setDefendingUnitId(null);
      setTargetUnit(null);
      setPendingAction(null);
      setPhase("waiting");
      setFocusedActionIndex(0); // Reset focus for next turn
      setDefenseActive(false);
      setDefenseCommitted(false);
      setAttackCommitted(false);
      setAttackScore(1.0);
      setDefenseScore(1.0);
      startNextTurn();
    }, 2000);
  };

  const showDamage = (
    unitId: string,
    damage: number,
    type: "normal" | "critical" | "effective" | "weak" | "miss",
  ) => {
    const timestamp = Date.now();

    // Immediately update to show only this damage for this unit
    setDamageNumbers((prev) => {
      // Remove any existing damage for this unit and add the new one
      const filtered = prev.filter((d) => d.unitId !== unitId);
      const newEntry = { unitId, damage, type, timestamp };
      return [...filtered, newEntry];
    });

    // Remove after 2 seconds
    setTimeout(() => {
      setDamageNumbers((prev) => prev.filter((d) => d.timestamp !== timestamp));
    }, 2000);
  };

  const handleCancel = () => {
    setPhase("selecting-action");
    setTargetUnit(null);
    setPendingAction(null);
  };

  const isUnitActive = (unitId: string) => currentUnit?.id === unitId;
  const isUnitAttacking = (unitId: string) => attackingUnitId === unitId;
  const isUnitDefending = (unitId: string) => defendingUnitId === unitId;
  const isUnitTarget = (unitId: string) => {
    // Show unit as selected/selectable during target phase
    const isEnemy = enemyTeam.some((u) => u.id === unitId);
    if (phase === "selecting-target" && isEnemy && isAlive(unitId)) {
      // Show the selected target
      return targetUnit?.id === unitId;
    }
    return false;
  };
  const isAlive = (unitId: string) =>
    battleState.unitStatuses.get(unitId)?.isAlive ?? true;

  // Handle action countdown
  useEffect(() => {
    if (phase === "selecting-action" && actionCountdown > 0) {
      const timer = setTimeout(() => {
        if (actionCountdown === 1) {
          // Auto-select attack on timeout
          handleAttack();
        } else {
          setActionCountdown(actionCountdown - 1);
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [phase, actionCountdown, handleAttack]);

  // Handle target countdown
  useEffect(() => {
    if (phase === "selecting-target" && targetCountdown > 0) {
      const timer = setTimeout(() => {
        if (targetCountdown === 1) {
          // Auto-confirm whatever target is selected on timeout
          // (Target should already be pre-selected from handleAttack/handleAbility)
          handleTargetConfirm();
        } else {
          setTargetCountdown(targetCountdown - 1);
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [phase, targetCountdown, handleTargetConfirm]);

  // Handle attack countdown
  useEffect(() => {
    if (phase === "attack-timing" && attackCountdown > 0) {
      const timer = setTimeout(() => {
        if (attackCountdown === 1 && currentUnit && targetUnit) {
          // Auto-execute with weak timing on timeout
          setPhase("executing");
          showMessage(`${currentUnit.name} attacks ${targetUnit.name}!`);
          setTimeout(() => {
            executeAttack(currentUnit, targetUnit, 0.8, defenseScore);
          }, 500);
        } else {
          setAttackCountdown(attackCountdown - 1);
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [phase, attackCountdown, currentUnit, targetUnit, defenseScore]);

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-black to-green-950/20 flex flex-col">
      {/* Animated Background */}
      <div className="absolute inset-0 z-0">
        {selectedBackground === "none" && null}
        {selectedBackground === "grid-lines" && (
          <div className="absolute inset-0 opacity-10">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "linear-gradient(0deg, #00ff00 1px, transparent 1px), linear-gradient(90deg, #00ff00 1px, transparent 1px)",
                backgroundSize: "50px 50px",
              }}
            />
          </div>
        )}
        {selectedBackground === "particles" && (
          <Particles
            particleCount={250}
            particleSpread={12}
            speed={0.15}
            particleColors={[
              "#00ff00",
              "#00ff00",
              "#40ff40",
              "#80ff80",
              "#ffffff",
            ]}
            moveParticlesOnHover={true}
            particleHoverFactor={1.5}
            alphaParticles={false}
            particleBaseSize={150}
            sizeRandomness={1.5}
            cameraDistance={20}
            disableRotation={false}
          />
        )}
        {selectedBackground === "dot-grid" && (
          <DotGrid
            dotSize={3}
            gap={25}
            baseColor="#003300"
            activeColor="#00ff00"
            proximity={100}
            shockRadius={250}
            shockStrength={3}
            resistance={750}
            returnDuration={1.5}
          />
        )}
        {selectedBackground === "light-rays" && (
          <>
            <LightRays
              raysOrigin="top-center"
              raysColor="#00ff00"
              raysSpeed={0.3}
              lightSpread={1.5}
              rayLength={1.0}
              followMouse={true}
              mouseInfluence={0.3}
              noiseAmount={0.05}
              distortion={0.02}
              fadeDistance={0.8}
              saturation={0.7}
            />
            {/* Grid overlay for techy look */}
            <div className="absolute inset-0 opacity-20 pointer-events-none">
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage:
                    "linear-gradient(0deg, #00ff00 1px, transparent 1px), linear-gradient(90deg, #00ff00 1px, transparent 1px)",
                  backgroundSize: "50px 50px",
                }}
              />
            </div>
          </>
        )}
        {selectedBackground === "galaxy" && (
          <Galaxy
            density={0.8}
            glowIntensity={0.2}
            saturation={0.3}
            hueShift={120}
            mouseRepulsion={true}
            mouseInteraction={true}
            twinkleIntensity={0.5}
            rotationSpeed={0.02}
            speed={0.3}
          />
        )}
        {selectedBackground === "aurora" && (
          <>
            <Aurora
              colorStops={["#00ff00", "#40ff40", "#80ff80"]}
              amplitude={1.5}
              blend={0.8}
              speed={0.5}
            />
            {/* Tighter grid overlay */}
            <div className="absolute inset-0 opacity-15 pointer-events-none">
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage:
                    "linear-gradient(0deg, #00ff00 1px, transparent 1px), linear-gradient(90deg, #00ff00 1px, transparent 1px)",
                  backgroundSize: "25px 25px",
                }}
              />
            </div>
          </>
        )}
      </div>

      {/* Battle Arena */}
      <div className="flex-1 relative overflow-hidden pb-32 pt-16 sm:pt-0 z-0">
        {/* Battle Field - Responsive: Vertical on mobile, Horizontal on desktop */}
        <div className="h-full flex flex-col-reverse sm:flex-row items-center justify-between px-2 sm:px-8 md:px-12 lg:px-16 xl:px-20 2xl:px-24 relative z-0">
          {/* Player Team - Bottom on mobile, Left on desktop */}
          <div className="grid grid-rows-2 gap-4 sm:gap-4 md:gap-6 lg:gap-8 mb-8 sm:mb-0">
            {/* Mobile: Back row (3 units behind), Desktop: Back row (3 units) */}
            <div className="grid grid-cols-3 gap-3 sm:gap-2 md:gap-3 lg:gap-4 xl:gap-5 order-2 sm:order-1">
              {playerTeam.slice(0, 3).map((unit, index) => {
                const status = battleState.unitStatuses.get(unit.id);
                return (
                  <motion.div
                    key={unit.id}
                    animate={{
                      x: isMobile ? 0 : isUnitActive(unit.id) ? 20 : 0,
                      y: isMobile ? (isUnitActive(unit.id) ? -10 : 0) : 0,
                      scale: isUnitAttacking(unit.id) ? 1.1 : 1,
                    }}
                    className="relative"
                    style={{
                      zIndex: isUnitDefending(unit.id)
                        ? 5
                        : isUnitActive(unit.id)
                          ? 3
                          : 1,
                    }}
                  >
                    <div data-unit-id={unit.id} className="inline-block">
                      <RobotoUnit
                        unit={unit}
                        isActive={isUnitActive(unit.id)}
                        isTarget={isUnitTarget(unit.id)}
                        isSelected={isUnitDefending(unit.id)}
                        isAlive={isAlive(unit.id)}
                        isBeingAttacked={
                          defendingUnitId === unit.id && explosionActive
                        }
                        onClick={() =>
                          phase === "selecting-target" &&
                          handleTargetSelect(unit.id, true)
                        }
                        delay={index * 0.1}
                        currentHp={status?.currentHp || 0}
                        maxHp={unit.stats.hp}
                      />
                    </div>
                    <AnimatePresence>
                      {damageNumbers
                        .filter((d) => d.unitId === unit.id)
                        .map((damage) => (
                          <motion.div
                            key={`${damage.unitId}-${damage.timestamp}`}
                            initial={{ opacity: 0, y: 0 }}
                            animate={{ opacity: 1, y: -30 }}
                            exit={{ opacity: 0 }}
                            className={cn(
                              "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl font-bold text-center whitespace-nowrap z-[100] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]",
                              damage.type === "miss" && "text-gray-400",
                              damage.type === "normal" && "text-yellow-400",
                              damage.type === "critical" && "text-red-500",
                              damage.type === "effective" && "text-green-400",
                              damage.type === "weak" && "text-orange-400",
                            )}
                          >
                            {damage.type === "miss"
                              ? "MISS!"
                              : damage.type === "critical"
                                ? `-${damage.damage} CRITICAL!`
                                : damage.type === "effective"
                                  ? `-${damage.damage} EFFECTIVE!`
                                  : damage.type === "weak"
                                    ? `-${damage.damage} WEAK`
                                    : `-${damage.damage} HP`}
                          </motion.div>
                        ))}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
            {/* Mobile: Front row (2 units in front), Desktop: Front row (2 units) */}
            <div className="grid grid-cols-2 gap-3 sm:gap-2 md:gap-3 lg:gap-4 xl:gap-5 mx-auto order-1 sm:order-2">
              {playerTeam.slice(3, 5).map((unit, index) => {
                const status = battleState.unitStatuses.get(unit.id);
                return (
                  <motion.div
                    key={unit.id}
                    animate={{
                      x: isMobile ? 0 : isUnitActive(unit.id) ? 20 : 0,
                      y: isMobile ? (isUnitActive(unit.id) ? -10 : 0) : 0,
                      scale: isUnitAttacking(unit.id) ? 1.1 : 1,
                    }}
                    className="relative"
                    style={{
                      zIndex: isUnitDefending(unit.id)
                        ? 5
                        : isUnitActive(unit.id)
                          ? 3
                          : 1,
                    }}
                  >
                    <RobotoUnit
                      unit={unit}
                      isActive={isUnitActive(unit.id)}
                      isTarget={isUnitTarget(unit.id)}
                      isSelected={isUnitDefending(unit.id)}
                      isAlive={isAlive(unit.id)}
                      onClick={() =>
                        phase === "selecting-target" &&
                        handleTargetSelect(unit.id, true)
                      }
                      delay={(index + 3) * 0.1}
                      currentHp={status?.currentHp || 0}
                      maxHp={unit.stats.hp}
                    />
                    <AnimatePresence>
                      {damageNumbers
                        .filter((d) => d.unitId === unit.id)
                        .map((damage, i) => (
                          <motion.div
                            key={`${damage.unitId}-${i}`}
                            initial={{ opacity: 0, y: 0 }}
                            animate={{ opacity: 1, y: -30 }}
                            exit={{ opacity: 0 }}
                            className={cn(
                              "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-center whitespace-nowrap z-[100] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]",
                              damage.type === "miss" && "text-gray-400",
                              damage.type === "normal" && "text-yellow-400",
                              damage.type === "critical" && "text-red-500",
                              damage.type === "effective" && "text-green-400",
                              damage.type === "weak" && "text-orange-400",
                            )}
                          >
                            {damage.type === "miss"
                              ? "MISS!"
                              : damage.type === "critical"
                                ? `-${damage.damage} CRITICAL!`
                                : damage.type === "effective"
                                  ? `-${damage.damage} EFFECTIVE!`
                                  : damage.type === "weak"
                                    ? `-${damage.damage} WEAK`
                                    : `-${damage.damage} HP`}
                          </motion.div>
                        ))}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Enemy Team - Top on mobile, Right on desktop */}
          <div className="grid grid-rows-2 gap-4 sm:gap-4 md:gap-6 lg:gap-8 mt-8 sm:mt-0">
            {/* Mobile: Back row (3 units behind), Desktop: Back row (3 units) */}
            <div className="grid grid-cols-3 gap-3 sm:gap-2 md:gap-3 lg:gap-4 xl:gap-5 order-2 sm:order-1">
              {enemyTeam.slice(0, 3).map((unit, index) => {
                const status = battleState.unitStatuses.get(unit.id);
                return (
                  <motion.div
                    key={unit.id}
                    animate={{
                      x: isMobile ? 0 : isUnitActive(unit.id) ? -20 : 0,
                      y: isMobile ? (isUnitActive(unit.id) ? 10 : 0) : 0,
                      scale: isUnitAttacking(unit.id) ? 1.1 : 1,
                    }}
                    className="relative"
                    style={{
                      zIndex: isUnitDefending(unit.id)
                        ? 5
                        : isUnitActive(unit.id)
                          ? 3
                          : 1,
                    }}
                  >
                    <div data-unit-id={unit.id} className="inline-block">
                      <RobotoUnit
                        unit={unit}
                        isActive={isUnitActive(unit.id)}
                        isTarget={isUnitTarget(unit.id)}
                        isSelected={isUnitDefending(unit.id)}
                        isAlive={isAlive(unit.id)}
                        isBeingAttacked={
                          defendingUnitId === unit.id && explosionActive
                        }
                        isEnemy
                        onClick={() =>
                          phase === "selecting-target" &&
                          handleTargetSelect(unit.id, true)
                        }
                        delay={index * 0.1}
                        currentHp={status?.currentHp || 0}
                        maxHp={unit.stats.hp}
                      />
                    </div>
                    <AnimatePresence>
                      {damageNumbers
                        .filter((d) => d.unitId === unit.id)
                        .map((damage, i) => (
                          <motion.div
                            key={`${damage.unitId}-${i}`}
                            initial={{ opacity: 0, y: 0 }}
                            animate={{ opacity: 1, y: -30 }}
                            exit={{ opacity: 0 }}
                            className={cn(
                              "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-center whitespace-nowrap z-[100] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]",
                              damage.type === "miss" && "text-gray-400",
                              damage.type === "normal" && "text-yellow-400",
                              damage.type === "critical" && "text-red-500",
                              damage.type === "effective" && "text-green-400",
                              damage.type === "weak" && "text-orange-400",
                            )}
                          >
                            {damage.type === "miss"
                              ? "MISS!"
                              : damage.type === "critical"
                                ? `-${damage.damage} CRITICAL!`
                                : damage.type === "effective"
                                  ? `-${damage.damage} EFFECTIVE!`
                                  : damage.type === "weak"
                                    ? `-${damage.damage} WEAK`
                                    : `-${damage.damage} HP`}
                          </motion.div>
                        ))}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
            {/* Mobile: Front row (2 units in front), Desktop: Front row (2 units) */}
            <div className="grid grid-cols-2 gap-3 sm:gap-2 md:gap-3 lg:gap-4 xl:gap-5 mx-auto order-1 sm:order-2">
              {enemyTeam.slice(3, 5).map((unit, index) => {
                const status = battleState.unitStatuses.get(unit.id);
                return (
                  <motion.div
                    key={unit.id}
                    animate={{
                      x: isMobile ? 0 : isUnitActive(unit.id) ? -20 : 0,
                      y: isMobile ? (isUnitActive(unit.id) ? 10 : 0) : 0,
                      scale: isUnitAttacking(unit.id) ? 1.1 : 1,
                    }}
                    className="relative"
                    style={{
                      zIndex: isUnitDefending(unit.id)
                        ? 5
                        : isUnitActive(unit.id)
                          ? 3
                          : 1,
                    }}
                  >
                    <RobotoUnit
                      unit={unit}
                      isActive={isUnitActive(unit.id)}
                      isTarget={isUnitTarget(unit.id)}
                      isSelected={isUnitDefending(unit.id)}
                      isAlive={isAlive(unit.id)}
                      isEnemy
                      onClick={() =>
                        phase === "selecting-target" &&
                        handleTargetSelect(unit.id, true)
                      }
                      delay={(index + 3) * 0.1}
                      currentHp={status?.currentHp || 0}
                      maxHp={unit.stats.hp}
                    />
                    <AnimatePresence>
                      {damageNumbers
                        .filter((d) => d.unitId === unit.id)
                        .map((damage, i) => (
                          <motion.div
                            key={`${damage.unitId}-${i}`}
                            initial={{ opacity: 0, y: 0 }}
                            animate={{ opacity: 1, y: -30 }}
                            exit={{ opacity: 0 }}
                            className={cn(
                              "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-center whitespace-nowrap z-[100] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]",
                              damage.type === "miss" && "text-gray-400",
                              damage.type === "normal" && "text-yellow-400",
                              damage.type === "critical" && "text-red-500",
                              damage.type === "effective" && "text-green-400",
                              damage.type === "weak" && "text-orange-400",
                            )}
                          >
                            {damage.type === "miss"
                              ? "MISS!"
                              : damage.type === "critical"
                                ? `-${damage.damage} CRITICAL!`
                                : damage.type === "effective"
                                  ? `-${damage.damage} EFFECTIVE!`
                                  : damage.type === "weak"
                                    ? `-${damage.damage} WEAK`
                                    : `-${damage.damage} HP`}
                          </motion.div>
                        ))}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Attack Timing Meter */}
        {(phase === "attack-timing" ||
          (phase === "executing" && isPlayerTurn)) &&
          (() => {
            // Determine which timing meter to show based on the ability
            const timingType = pendingAction?.abilityId
              ? ABILITY_TIMING_MAP[pendingAction.abilityId] || "precision"
              : "precision"; // Default for basic attacks

            return (
              <div className="absolute top-1/2 sm:bottom-32 sm:top-auto left-1/2 -translate-x-1/2 -translate-y-1/2 sm:translate-y-0 w-full sm:w-96 max-w-sm px-4 sm:px-0 z-50">
                <div className="bg-black/90 p-4 rounded-lg border-2 border-green-800">
                  {timingType === "charge" ? (
                    <TimingMeterCharge
                      active={phase === "attack-timing"}
                      onInput={handleAttackTiming}
                      showCountdown={true}
                      countdown={attackCountdown}
                      keepVisibleAfterInput={true}
                    />
                  ) : timingType === "spinner" ? (
                    <TimingMeterSpinner
                      active={phase === "attack-timing"}
                      onInput={handleAttackTiming}
                      showCountdown={true}
                      countdown={attackCountdown}
                      keepVisibleAfterInput={true}
                    />
                  ) : (
                    <TimingMeter
                      active={phase === "attack-timing"}
                      onInput={handleAttackTiming}
                      type="attack"
                      showCountdown={true}
                      countdown={attackCountdown}
                      keepVisibleAfterInput={true}
                    />
                  )}
                </div>
              </div>
            );
          })()}

        {/* Defense Timing Meter */}
        {phase === "defending" && defenseActive && (
          <div className="absolute top-1/2 sm:top-32 left-1/2 -translate-x-1/2 -translate-y-1/2 sm:translate-y-0 w-full sm:w-96 max-w-sm px-4 sm:px-0">
            <div className="bg-black/90 p-4 rounded-lg border-2 border-yellow-800 z-50">
              <TimingMeter
                active={!defenseCommitted}
                onInput={handleDefenseTiming}
                type="defense"
                showCountdown={false}
                keepVisibleAfterInput={true}
              />
            </div>
          </div>
        )}

        {/* Victory/Defeat Overlay */}
        <AnimatePresence>
          {battleState.status !== "active" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-black/80 flex items-center justify-center"
            >
              <motion.h1
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3, type: "spring" }}
                className={cn(
                  "text-6xl md:text-8xl font-bold",
                  battleState.status === "victory"
                    ? "text-green-400"
                    : "text-red-500",
                )}
              >
                {battleState.status === "victory" ? "VICTORY!" : "DEFEAT"}
              </motion.h1>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Attack Animations */}
      <AttackProjectile
        active={projectileActive}
        type={attackElement as any}
        from={attackerPosition}
        to={defenderPosition}
        onImpact={() => {
          // Impact callback handled in executeAttack
        }}
      />

      {/* Render explosion directly on the defending unit */}
      {explosionActive && defendingUnitId && (
        <AttackAnimation
          active={explosionActive}
          type={currentAttackType}
          unitId={defendingUnitId}
          onComplete={() => {
            // Completion handled in executeAttack
          }}
        />
      )}

      {/* Battle Footer */}
      <BattleFooter
        currentUnit={currentUnit}
        targetUnit={targetUnit}
        playerTeam={playerTeam}
        enemyTeam={enemyTeam}
        isPlayerTurn={isPlayerTurn}
        phase={phase}
        onAttack={handleAttack}
        onAbility={handleAbility}
        onTargetSelect={handleTargetSelect}
        onTargetConfirm={handleTargetConfirm}
        onCancel={handleCancel}
        actionCountdown={actionCountdown}
        targetCountdown={targetCountdown}
        message={message}
        unitStatuses={battleState.unitStatuses}
        focusedActionIndex={focusedActionIndex}
        setFocusedActionIndex={setFocusedActionIndex}
      />
    </div>
  );
}
