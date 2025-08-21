"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../components/ui/tooltip";
import { WalletConnect } from "../../components/shared/WalletConnect";
import { useRobotoTokensContext } from "../../contexts/RobotoTokensContext";
import {
  TraitProcessorV3,
  BattleUnitV3,
} from "../../lib/game-engine/TraitProcessorV3";
import {
  ArrowLeft,
  Shield,
  Swords,
  Zap,
  Heart,
  Gauge,
  Sparkles,
  RefreshCw,
  Expand,
  Users,
  Clock,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { gameSounds } from "../../lib/sounds/gameSounds";
import { UnitFilters } from "../../components/team-builder/UnitFilters";
import { UnitLightbox } from "../../components/team-builder/UnitLightbox";
import { TeamFooter } from "../../components/team-builder/TeamFooter";
import {
  cardAnimations,
  buttonAnimations,
  pageTransition,
} from "../../lib/animations/gameAnimations";
import { GameHeader } from "../../components/shared/GameHeader";
import { PageLayout } from "../../components/shared/PageLayout";
import type { BattleSettings } from "../battle/page";

// Stock Robopets provided by Pablo Stanley for players without NFTs
const STOCK_ROBOPETS = [
  {
    id: "robopet-2809",
    name: "Robopet #2809",
    image: "https://d2w8sp0plvpr8a.cloudfront.net/2809/body-transparent.png",
    traits: {
      Background: "Sunset",
      Body: "Gunmetal",
      Eyes: "Visor",
      Head: "Spikes",
      Arms: "Standard",
      Chest: "Shield",
      Feet: "Wheels"
    }
  },
  {
    id: "robopet-3619",
    name: "Robopet #3619",
    image: "https://d2w8sp0plvpr8a.cloudfront.net/3619/body-transparent.png",
    traits: {
      Background: "Galaxy",
      Body: "Silver",
      Eyes: "Beam",
      Head: "Fins",
      Arms: "Cannon",
      Chest: "Battery",
      Feet: "Boosters"
    }
  },
  {
    id: "robopet-4012",
    name: "Robopet #4012",
    image: "https://d2w8sp0plvpr8a.cloudfront.net/4012/body-transparent.png",
    traits: {
      Background: "Night Sky",
      Body: "Chrome",
      Eyes: "Laser",
      Head: "Antenna",
      Arms: "Claw",
      Chest: "Core",
      Feet: "Hover"
    }
  },
  {
    id: "robopet-6211",
    name: "Robopet #6211",
    image: "https://d2w8sp0plvpr8a.cloudfront.net/6211/body-transparent.png",
    traits: {
      Background: "Digital Rain",
      Body: "Rust",
      Eyes: "Scanner",
      Head: "Dome",
      Arms: "Heavy",
      Chest: "Vents",
      Feet: "Treads"
    }
  },
  {
    id: "robopet-7386",
    name: "Robopet #7386",
    image: "https://d2w8sp0plvpr8a.cloudfront.net/7386/body-transparent.png",
    traits: {
      Background: "Neon City",
      Body: "Gold",
      Eyes: "Glow",
      Head: "Mohawk",
      Arms: "Blaster",
      Chest: "Reactor",
      Feet: "Magnetic"
    }
  },
  {
    id: "robopet-9997",
    name: "Robopet #9997",
    image: "https://d2w8sp0plvpr8a.cloudfront.net/9997/body-transparent.png",
    traits: {
      Background: "Void",
      Body: "Obsidian",
      Eyes: "Cyclops",
      Head: "Crown",
      Arms: "Energy",
      Chest: "Armor",
      Feet: "Rockets"
    }
  }
];

export default function TeamBuilder() {
  const router = useRouter();
  const { isConnected } = useAccount();
  const { robotos, robopets, loading, error, loadingProgress, refetch } =
    useRobotoTokensContext();
  const [selectedTeam, setSelectedTeam] = useState<BattleUnitV3[]>([]);
  const [mounted, setMounted] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [teamSaved, setTeamSaved] = useState(false);
  const [settings, setSettings] = useState<BattleSettings>({
    teamSize: 5,
    speed: "speedy",
  });
  const [showStockRobopets, setShowStockRobopets] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Add keyboard shortcut for clearing team (Ctrl/Cmd + Shift + C)
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "C") {
        e.preventDefault();
        if (selectedTeam.length > 0) {
          setSelectedTeam([]);
          // Clear teams for all sizes when wallet disconnects
          localStorage.setItem("roboto_rumble_team_3", JSON.stringify([]));
          localStorage.setItem("roboto_rumble_team_5", JSON.stringify([]));
          gameSounds.play("cancel");
        }
      }
    };

    window.addEventListener("keydown", handleKeyPress);

    // Load battle settings first
    let currentSettings: BattleSettings = { teamSize: 5, speed: "speedy" };
    const savedSettings = localStorage.getItem("battle_settings");
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        // Validate and ensure teamSize is 3 or 5
        const validatedSettings: BattleSettings = {
          teamSize:
            parsed.teamSize === 3 || parsed.teamSize === 5
              ? parsed.teamSize
              : 5,
          speed:
            parsed.speed === "calm" || parsed.speed === "speedy"
              ? parsed.speed
              : "speedy",
        };
        currentSettings = validatedSettings;
        setSettings(validatedSettings);
      } catch (e) {
        // Use defaults if parsing fails
      }
    }

    return () => {
      window.removeEventListener("keydown", handleKeyPress);
    };
  }, [selectedTeam.length]);

  // Process units as they load - Robotos first, then Robopets
  const processedUnits = useMemo(() => {
    const units: BattleUnitV3[] = [];
    const processedIds = new Set<string>();

    // Process Robotos first
    robotos.forEach((token) => {
      try {
        const unit = TraitProcessorV3.processRobotoTraits(token.metadata);
        if (!processedIds.has(unit.id)) {
          processedIds.add(unit.id);
          units.push(unit);
        }
      } catch (e) {
        console.warn("Failed to process Roboto:", e);
      }
    });

    // Then process Robopets
    robopets.forEach((token) => {
      try {
        const unit = TraitProcessorV3.processRobopetTraits(token.metadata);
        if (!processedIds.has(unit.id)) {
          processedIds.add(unit.id);
          units.push(unit);
        }
      } catch (e) {
        console.warn("Failed to process Robopet:", e);
      }
    });

    return units;
  }, [robotos, robopets]);
  
  // Process stock Robopets separately
  const stockUnits = useMemo(() => {
    if (!showStockRobopets) return [];
    
    const units: BattleUnitV3[] = [];
    STOCK_ROBOPETS.forEach((stockPet) => {
      try {
        const metadata = {
          ...stockPet,
          attributes: Object.entries(stockPet.traits).map(([trait_type, value]) => ({
            trait_type,
            value
          }))
        };
        const unit = TraitProcessorV3.processRobopetTraits(metadata);
        unit.isStock = true; // Mark as stock unit
        units.push(unit);
      } catch (e) {
        console.warn("Failed to process stock Robopet:", e);
      }
    });
    return units;
  }, [showStockRobopets]);

  // Load saved team after units are processed
  useEffect(() => {
    if (processedUnits.length > 0 && selectedTeam.length === 0) {
      // Load team for current team size
      const teamKey = `roboto_rumble_team_${settings.teamSize}`;
      const savedTeam = localStorage.getItem(teamKey);
      if (savedTeam) {
        try {
          const team = JSON.parse(savedTeam);
          if (Array.isArray(team)) {
            // Match saved units with processed units
            const matchedTeam = team
              .map((savedUnit) =>
                processedUnits.find(
                  (u) => u.id === savedUnit.id && u.type === savedUnit.type,
                ),
              )
              .filter(Boolean) as BattleUnitV3[];

            // If saved team is larger than current team size, truncate it
            if (matchedTeam.length > settings.teamSize) {
              setSelectedTeam(matchedTeam.slice(0, settings.teamSize));
            } else {
              setSelectedTeam(matchedTeam);
            }
          }
        } catch (e) {
          // Failed to load saved team, continue with empty team
        }
      }
    }
  }, [processedUnits, settings.teamSize]);

  // State for filters - start with default values to show all units
  const [currentFilters, setCurrentFilters] = useState<any>({
    search: "",
    elements: [],
    robotType: "all",
    sortBy: "name",
    sortOrder: "asc",
  });

  // Calculate filtered units based on current filters and processed units
  const filteredUnits = useMemo(() => {
    let filtered = [...processedUnits];

    // Search filter
    if (currentFilters.search && currentFilters.search.trim() !== "") {
      const search = currentFilters.search.toLowerCase();
      filtered = filtered.filter(
        (unit) =>
          unit.name.toLowerCase().includes(search) ||
          unit.id.toLowerCase().includes(search),
      );
    }

    // Element filter
    if (currentFilters.elements && currentFilters.elements.length > 0) {
      filtered = filtered.filter((unit) =>
        currentFilters.elements.includes(unit.element),
      );
    }

    // Robot type filter
    if (currentFilters.robotType && currentFilters.robotType !== "all") {
      filtered = filtered.filter((unit) => {
        switch (currentFilters.robotType) {
          case "roboto":
            // For regular Robotos (not Helmeto, Cyborgo, Computo)
            return (
              unit.type === "roboto" &&
              (!unit.traits["Robot Type"] ||
                unit.traits["Robot Type"] === "Roboto")
            );
          case "robopet":
            return unit.type === "robopet";
          case "helmeto":
            return (
              unit.type === "roboto" &&
              unit.traits["Robot Type"] === "Roboto Helmeto"
            );
          case "mulleto":
            // Mulleto = Helmeto with Mullet helmet
            return (
              unit.type === "roboto" &&
              unit.traits["Robot Type"] === "Roboto Helmeto" &&
              unit.traits["Helmet"] === "Mullet"
            );
          case "cyborgo":
            return (
              unit.type === "roboto" &&
              unit.traits["Robot Type"] === "Roboto Cyborgo"
            );
          case "computo":
            return (
              unit.type === "roboto" &&
              unit.traits["Robot Type"] === "Roboto Computo"
            );
          default:
            return true;
        }
      });
    }

    // Stat filters
    if (currentFilters.minHp !== undefined && currentFilters.minHp !== null) {
      filtered = filtered.filter((u) => u.stats.hp >= currentFilters.minHp);
    }
    if (currentFilters.maxHp !== undefined && currentFilters.maxHp !== null) {
      filtered = filtered.filter((u) => u.stats.hp <= currentFilters.maxHp);
    }
    if (
      currentFilters.minAttack !== undefined &&
      currentFilters.minAttack !== null
    ) {
      filtered = filtered.filter(
        (u) => u.stats.attack >= currentFilters.minAttack,
      );
    }
    if (
      currentFilters.maxAttack !== undefined &&
      currentFilters.maxAttack !== null
    ) {
      filtered = filtered.filter(
        (u) => u.stats.attack <= currentFilters.maxAttack,
      );
    }
    if (
      currentFilters.minDefense !== undefined &&
      currentFilters.minDefense !== null
    ) {
      filtered = filtered.filter(
        (u) => u.stats.defense >= currentFilters.minDefense,
      );
    }
    if (
      currentFilters.maxDefense !== undefined &&
      currentFilters.maxDefense !== null
    ) {
      filtered = filtered.filter(
        (u) => u.stats.defense <= currentFilters.maxDefense,
      );
    }
    if (
      currentFilters.minSpeed !== undefined &&
      currentFilters.minSpeed !== null
    ) {
      filtered = filtered.filter(
        (u) => u.stats.speed >= currentFilters.minSpeed,
      );
    }
    if (
      currentFilters.maxSpeed !== undefined &&
      currentFilters.maxSpeed !== null
    ) {
      filtered = filtered.filter(
        (u) => u.stats.speed <= currentFilters.maxSpeed,
      );
    }

    // Sort
    if (currentFilters.sortBy) {
      filtered.sort((a, b) => {
        // Always keep Robotos before Robopets
        if (a.type === "roboto" && b.type === "robopet") return -1;
        if (a.type === "robopet" && b.type === "roboto") return 1;

        // Then apply the selected sort
        let comparison = 0;
        switch (currentFilters.sortBy) {
          case "name":
            comparison = a.name.localeCompare(b.name);
            break;
          case "element":
            comparison = a.element.localeCompare(b.element);
            break;
          case "hp":
            comparison = a.stats.hp - b.stats.hp;
            break;
          case "attack":
            comparison = a.stats.attack - b.stats.attack;
            break;
          case "defense":
            comparison = a.stats.defense - b.stats.defense;
            break;
          case "speed":
            comparison = a.stats.speed - b.stats.speed;
            break;
        }
        return currentFilters.sortOrder === "asc" ? comparison : -comparison;
      });
    }

    return filtered;
  }, [processedUnits, currentFilters]);
  
  // Apply same filters to stock units
  const filteredStockUnits = useMemo(() => {
    let filtered = [...stockUnits];
    
    // Search filter
    if (currentFilters.search && currentFilters.search.trim() !== "") {
      const search = currentFilters.search.toLowerCase();
      filtered = filtered.filter(
        (unit) =>
          unit.name.toLowerCase().includes(search) ||
          unit.id.toLowerCase().includes(search),
      );
    }
    
    // Element filter
    if (currentFilters.elements && currentFilters.elements.length > 0) {
      filtered = filtered.filter((unit) =>
        currentFilters.elements.includes(unit.element),
      );
    }
    
    // Stock units are all Robopets, so filter by robopet type
    if (currentFilters.robotType && currentFilters.robotType !== "all" && currentFilters.robotType !== "robopet") {
      filtered = [];
    }
    
    return filtered;
  }, [stockUnits, currentFilters]);

  const toggleUnitSelection = useCallback(
    (unit: BattleUnitV3) => {
      // Check if this exact unit (type + id) is already selected
      const isSelected = selectedTeam.find(
        (u) => u.id === unit.id && u.type === unit.type,
      );

      let newTeam: BattleUnitV3[];
      if (isSelected) {
        newTeam = selectedTeam.filter(
          (u) => !(u.id === unit.id && u.type === unit.type),
        );
        setSelectedTeam(newTeam);
        gameSounds.play("removeUnit");
      } else if (selectedTeam.length < settings.teamSize) {
        newTeam = [...selectedTeam, unit];
        setSelectedTeam(newTeam);
        gameSounds.play("addUnit");

        // Play team complete sound if team is now full
        if (selectedTeam.length === settings.teamSize - 1) {
          setTimeout(() => gameSounds.play("teamComplete"), 300);
        }
      } else {
        // Team is full, play cancel sound
        gameSounds.play("cancel");
        return;
      }

      // Save team to localStorage with team size key
      const teamKey = `roboto_rumble_team_${settings.teamSize}`;
      localStorage.setItem(teamKey, JSON.stringify(newTeam));

      // Show saved feedback
      setTeamSaved(true);
      setTimeout(() => setTeamSaved(false), 2000);
    },
    [selectedTeam, settings.teamSize],
  );

  const addCompanionPair = useCallback(
    (unit: BattleUnitV3) => {
      // Find the companion unit
      const unitBaseId = unit.id.replace(/^(roboto|robopet)-/, "");
      const companion = processedUnits.find((u) => {
        const uBaseId = u.id.replace(/^(roboto|robopet)-/, "");
        return uBaseId === unitBaseId && u.type !== unit.type;
      });
      if (!companion) return;

      // Check which units are already selected
      const unitSelected = selectedTeam.find(
        (u) => u.id === unit.id && u.type === unit.type,
      );
      const companionSelected = selectedTeam.find(
        (u) => u.id === companion.id && u.type === companion.type,
      );

      let newTeam = [...selectedTeam];

      // Add units that aren't already selected
      if (!unitSelected && newTeam.length < settings.teamSize) {
        newTeam.push(unit);
      }
      if (!companionSelected && newTeam.length < settings.teamSize) {
        newTeam.push(companion);
      }

      setSelectedTeam(newTeam);
      gameSounds.play("teamComplete");

      // Save team to localStorage with team size key
      const teamKey = `roboto_rumble_team_${settings.teamSize}`;
      localStorage.setItem(teamKey, JSON.stringify(newTeam));
    },
    [processedUnits, selectedTeam, settings.teamSize],
  );

  const saveTeamAndBattle = useCallback(() => {
    // Save team to localStorage with team size key
    const teamKey = `roboto_rumble_team_${settings.teamSize}`;
    localStorage.setItem(teamKey, JSON.stringify(selectedTeam));
    gameSounds.play("confirm");

    // Navigate to battle vs computer
    setTimeout(() => {
      // Check battle mode and navigate accordingly
      const battleMode = localStorage.getItem("battle_mode");
      if (battleMode === "player") {
        router.push("/battle/pvp");
      } else {
        router.push("/battle/training");
      }
    }, 200);
  }, [selectedTeam, router]);

  const updateSetting = <K extends keyof BattleSettings>(
    key: K,
    value: BattleSettings[K],
  ) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    localStorage.setItem("battle_settings", JSON.stringify(newSettings));
    gameSounds.play("menuNavigate");

    // Handle team size changes
    if (key === "teamSize" && typeof value === "number") {
      // Save current team before switching
      const currentTeamKey = `roboto_rumble_team_${settings.teamSize}`;
      localStorage.setItem(currentTeamKey, JSON.stringify(selectedTeam));

      // Load the team for the new size
      const newTeamKey = `roboto_rumble_team_${value}`;
      const savedNewTeam = localStorage.getItem(newTeamKey);

      if (savedNewTeam) {
        try {
          const team = JSON.parse(savedNewTeam);
          // Ensure loaded team fits the new size
          setSelectedTeam(team.slice(0, value));
        } catch (e) {
          // Failed to parse, start fresh
          setSelectedTeam([]);
        }
      } else {
        // No saved team for this size, start fresh
        setSelectedTeam([]);
      }
    }
  };

  const getElementTooltip = useCallback((element: string): string => {
    switch (element) {
      case "SURGE":
        return "SURGE > METAL > CODE > GLITCH > SURGE";
      case "METAL":
        return "METAL > CODE > GLITCH > SURGE > METAL";
      case "CODE":
        return "CODE > GLITCH > SURGE > METAL > CODE";
      case "GLITCH":
        return "GLITCH > SURGE > METAL > CODE > GLITCH";
      case "NEUTRAL":
        return "No element advantages or disadvantages";
      default:
        return element;
    }
  }, []);

  // Show loading state during hydration
  if (!mounted) {
    return (
      <PageLayout>
        <div className="text-center">
          <p className="text-green-400 text-xl animate-pulse">
            INITIALIZING TEAM BUILDER...
          </p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      {/* Full width header */}
      <GameHeader title="TEAM BUILDER" showBackButton backHref="/" />

      {/* Constrained content */}
      <div className="max-w-7xl mx-auto px-2 sm:px-4 md:px-8 py-2 sm:py-4 md:py-6">
        {!isConnected ? (
          <Card className="bg-black/80 border-2 border-green-500 rounded-lg max-w-md mx-auto">
            <CardHeader>
              <CardTitle>AUTHENTICATION REQUIRED</CardTitle>
              <CardDescription className="text-green-400">
                Connect your wallet to access your combat units
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WalletConnect />
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Settings Bar */}
            <Card className="bg-black/80 border-2 border-green-500/50 mb-3 sm:mb-6">
              <CardContent className="py-2 sm:py-4 px-3 sm:px-6">
                <div className="flex items-center justify-between gap-2 sm:gap-4">
                  <div className="flex items-center gap-3 sm:gap-6">
                    {/* Team Size Setting */}
                    <div className="flex items-center gap-2 sm:gap-3">
                      <Users className="w-4 h-4 text-green-400" />
                      <span className="hidden sm:inline text-xs sm:text-sm font-bold text-green-400 whitespace-nowrap">
                        TEAM SIZE:
                      </span>
                      <div className="flex gap-1 sm:gap-2">
                        <Button
                          variant={
                            settings.teamSize === 3 ? "default" : "outline"
                          }
                          size="sm"
                          className={`px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm ${settings.teamSize === 3 ? "bg-green-600 hover:bg-green-700" : ""}`}
                          onClick={() => updateSetting("teamSize", 3)}
                          onMouseEnter={() => gameSounds.playHover()}
                        >
                          3v3
                        </Button>
                        <Button
                          variant={
                            settings.teamSize === 5 ? "default" : "outline"
                          }
                          size="sm"
                          className={`px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm ${settings.teamSize === 5 ? "bg-green-600 hover:bg-green-700" : ""}`}
                          onClick={() => updateSetting("teamSize", 5)}
                          onMouseEnter={() => gameSounds.playHover()}
                        >
                          5v5
                        </Button>
                      </div>
                    </div>
                    {/* Timer Speed Setting */}
                    <div className="flex items-center gap-2 sm:gap-3">
                      <Clock className="w-4 h-4 text-green-400" />
                      <span className="hidden sm:inline text-xs sm:text-sm font-bold text-green-400 whitespace-nowrap">
                        TIMER:
                      </span>
                      <div className="flex gap-1 sm:gap-2">
                        <Button
                          variant={
                            settings.speed === "calm" ? "default" : "outline"
                          }
                          size="sm"
                          className={`px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm ${settings.speed === "calm" ? "bg-green-600 hover:bg-green-700" : ""}`}
                          onClick={() => updateSetting("speed", "calm")}
                          onMouseEnter={() => gameSounds.playHover()}
                        >
                          CALM
                        </Button>
                        <Button
                          variant={
                            settings.speed === "speedy" ? "default" : "outline"
                          }
                          size="sm"
                          className={`px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm ${settings.speed === "speedy" ? "bg-green-600 hover:bg-green-700" : ""}`}
                          onClick={() => updateSetting("speed", "speedy")}
                          onMouseEnter={() => gameSounds.playHover()}
                        >
                          SPEEDY
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-green-400/60">
                    {settings.speed === "calm"
                      ? "10 second decisions"
                      : "5 second decisions"}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Selected Team */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-green-400">
                  SELECTED SQUAD ({selectedTeam.length}/{settings.teamSize})
                </h2>
                {teamSaved && (
                  <span className="text-sm text-green-400 animate-pulse">
                    ✓ TEAM SAVED
                  </span>
                )}
              </div>
              <div
                className={`grid ${settings.teamSize === 3 ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2 sm:grid-cols-3 md:grid-cols-5"} gap-2 sm:gap-4`}
              >
                {[...Array(settings.teamSize)].map((_, index) => {
                  const unit = selectedTeam[index];
                  const companion = unit
                    ? selectedTeam.find((u) => {
                      // Extract base IDs by removing prefixes
                      const id1 = unit.id.replace(/^(roboto|robopet)-/, "");
                      const id2 = u.id.replace(/^(roboto|robopet)-/, "");
                      return id1 === id2 && u.type !== unit.type;
                    })
                    : null;
                  const key = unit
                    ? `selected-${unit.type}-${unit.id}-${index}`
                    : `empty-slot-${index}`;
                  return (
                    <Card
                      key={key}
                      className={`bg-black/60 border-2 rounded-lg ${unit ? "border-green-500 cursor-pointer hover:border-red-500 transition-colors" : "border-green-500/30 border-dashed"} aspect-square flex items-center justify-center relative`}
                      onClick={() => unit && toggleUnitSelection(unit)}
                      onMouseEnter={() => unit && gameSounds.playHover()}
                    >
                      {unit ? (
                        <div className="text-center p-2 w-full">
                          {companion && (
                            <div className="absolute top-1 right-1 text-xs bg-yellow-500 text-black px-1 rounded font-bold">
                              +2%
                            </div>
                          )}
                          <img
                            src={unit.imageUrl}
                            alt={unit.name}
                            className="w-full h-auto mb-2 pixelated"
                          />
                          <p className="text-xs text-green-400 truncate">
                            {unit.name}
                          </p>
                        </div>
                      ) : (
                        <p className="text-green-500/50 text-4xl">?</p>
                      )}
                    </Card>
                  );
                })}
              </div>

              {selectedTeam.length === settings.teamSize && (
                <div className="mt-4 text-center">
                  <Button
                    variant="terminal"
                    size="lg"
                    onClick={saveTeamAndBattle}
                    className="animate-pulse rounded-lg"
                  >
                    START BATTLE
                  </Button>
                </div>
              )}

              {/* Team Elements */}
              {selectedTeam.length > 0 && (
                <div className="mt-4 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <h3 className="font-bold text-green-400 mb-2 justify-center text-center text-sm sm:text-base">
                    TEAM ELEMENTS
                  </h3>
                  <TooltipProvider>
                    <div className="flex gap-2 sm:gap-4 md:gap-8 justify-center flex-wrap">
                      {selectedTeam.map((unit) => (
                        <Tooltip key={`element-${unit.id}-${unit.element}`}>
                          <TooltipTrigger asChild>
                            <div
                              className="text-center cursor-crosshair"
                              style={{
                                color: TraitProcessorV3.getElementColor(
                                  unit.element,
                                ),
                              }}
                            >
                              <div className="text-xl sm:text-2xl md:text-3xl">
                                {TraitProcessorV3.getElementSymbol(
                                  unit.element,
                                )}
                              </div>
                              <div className="text-xs sm:text-sm md:text-md">
                                {unit.element}
                              </div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{getElementTooltip(unit.element)}</p>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  </TooltipProvider>
                </div>
              )}
            </div>

            {/* Available Units */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-green-400">
                  AVAILABLE UNITS
                </h2>
                {error && (
                  <Button
                    variant="terminal"
                    size="sm"
                    onClick={refetch}
                    className="gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    RETRY
                  </Button>
                )}
              </div>

              {/* Loading Progress */}
              {loading && (
                <div className="mb-6">
                  <div className="flex items-center justify-between text-sm text-green-400 mb-2">
                    <span>SCANNING COMBAT UNITS...</span>
                    <span>{loadingProgress}%</span>
                  </div>
                  <div className="w-full bg-black/60 border border-green-500/30 rounded-full h-4 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-300"
                      style={{ width: `${loadingProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded">
                  <p className="text-red-500">{error}</p>
                </div>
              )}

              {/* Filters - Only show when we have units */}
              {processedUnits.length > 0 && (
                <div className="sticky top-0 z-20 bg-black/95 backdrop-blur-sm -mx-4 px-4 py-4 md:-mx-8 md:px-8 mb-6 border-b border-green-500/20">
                  <UnitFilters
                    onFiltersChange={setCurrentFilters}
                    unitCount={processedUnits.length}
                    filteredCount={filteredUnits.length}
                  />
                </div>
              )}

              {/* Units Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredUnits.map((unit, index) => {
                  const isSelected = selectedTeam.find(
                    (u) => u.id === unit.id && u.type === unit.type,
                  );
                  const unitBaseId = unit.id.replace(/^(roboto|robopet)-/, "");
                  const companion = processedUnits.find((u) => {
                    const uBaseId = u.id.replace(/^(roboto|robopet)-/, "");
                    return uBaseId === unitBaseId && u.type !== unit.type;
                  });
                  const companionInTeam =
                    companion &&
                    selectedTeam.find(
                      (u) => u.id === companion.id && u.type === companion.type,
                    );

                  return (
                    <Card
                      key={`${unit.type}-${unit.id}`}
                      className={`bg-black/60 border-2 rounded-[0.7em] transition-all overflow-hidden relative cursor-pointer ${isSelected
                        ? "border-green-500 shadow-[0_0_20px_rgba(0,255,0,0.6)]"
                        : companionInTeam
                          ? "border-yellow-500/50 shadow-[0_0_10px_rgba(255,255,0,0.3)]"
                          : "border-green-500/30 hover:border-green-500/60"
                        }`}
                      onClick={() => toggleUnitSelection(unit)}
                      onMouseEnter={() => gameSounds.playHover()}
                    >
                      {/* Expand button */}
                      <Button
                        variant="terminal"
                        size="icon"
                        className="absolute top-1.5 right-1.5 z-10 opacity-60 hover:opacity-100 w-6 h-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLightboxIndex(index);
                          gameSounds.playClick();
                        }}
                      >
                        <Expand className="w-3 h-3 sm:w-4 sm:h-4" />
                      </Button>

                      <div className="flex">
                        {/* Left side - Image */}
                        <div className="w-32 h-32 sm:w-36 sm:h-36 p-1 flex-shrink-0 relative">
                          <img
                            src={unit.imageUrl}
                            alt={unit.name}
                            className="w-full h-full object-cover pixelated"
                          />
                        </div>

                        {/* Right side - Metadata */}
                        <div className="flex-1 p-3 sm:p-4 min-h-[128px] sm:min-h-[192px] flex flex-col">
                          {/* Header */}
                          <div className="mb-2 sm:mb-3 pr-8 sm:pr-12">
                            <div className="flex items-center gap-1 sm:gap-2 mb-1 flex-wrap">
                              <h3 className="text-sm sm:text-lg font-bold truncate">
                                {unit.name}
                              </h3>
                            </div>
                            <div
                              className="text-xs sm:text-sm"
                              style={{
                                color: TraitProcessorV3.getElementColor(
                                  unit.element,
                                ),
                              }}
                            >
                              {TraitProcessorV3.getElementSymbol(unit.element)}{" "}
                              {unit.element}
                            </div>
                          </div>

                          {/* Stats */}
                          <TooltipProvider>
                            <div className="grid grid-cols-3 gap-1 sm:gap-2 mb-2 sm:mb-4">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center gap-0.5 sm:gap-1 cursor-help">
                                    <Heart className="w-3 h-3 sm:w-4 sm:h-4 text-red-500" />
                                    <span className="text-xs sm:text-sm font-mono">
                                      {unit.stats.hp}
                                    </span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>
                                    Health Points - Total damage unit can take
                                  </p>
                                </TooltipContent>
                              </Tooltip>

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center gap-0.5 sm:gap-1 cursor-help">
                                    <Swords className="w-3 h-3 sm:w-4 sm:h-4 text-orange-500" />
                                    <span className="text-xs sm:text-sm font-mono">
                                      {unit.stats.attack}
                                    </span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Attack - Increases damage dealt</p>
                                </TooltipContent>
                              </Tooltip>

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center gap-0.5 sm:gap-1 cursor-help">
                                    <Shield className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500" />
                                    <span className="text-xs sm:text-sm font-mono">
                                      {unit.stats.defense}
                                    </span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Defense - Reduces damage taken</p>
                                </TooltipContent>
                              </Tooltip>

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center gap-0.5 sm:gap-1 cursor-help">
                                    <Zap className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-500" />
                                    <span className="text-xs sm:text-sm font-mono">
                                      {unit.stats.speed}
                                    </span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Speed - Determines turn order</p>
                                </TooltipContent>
                              </Tooltip>

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center gap-0.5 sm:gap-1 cursor-help">
                                    <Gauge className="w-3 h-3 sm:w-4 sm:h-4 text-purple-500" />
                                    <span className="text-xs sm:text-sm font-mono">
                                      {unit.stats.energy}
                                    </span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Energy - Resource for using abilities</p>
                                </TooltipContent>
                              </Tooltip>

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center gap-0.5 sm:gap-1 cursor-help">
                                    <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-pink-500" />
                                    <span className="text-xs sm:text-sm font-mono">
                                      {unit.stats.crit}%
                                    </span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Critical - Chance for 50% bonus damage</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </TooltipProvider>

                          {/* Content area that grows */}
                          <div className="flex-grow">
                            {/* Abilities */}
                            <div className="flex flex-wrap gap-1 mb-2 sm:mb-3">
                              {unit.abilities.map((abilityId) => {
                                const ability =
                                  TraitProcessorV3.getAbilityData(abilityId);
                                return ability ? (
                                  <div
                                    key={abilityId}
                                    className="text-[10px] sm:text-xs px-1 sm:px-2 py-0.5 sm:py-1 bg-black/50 border border-green-500/30 rounded"
                                    style={{
                                      borderColor:
                                        TraitProcessorV3.getElementColor(
                                          ability.element,
                                        ) + "40",
                                      backgroundColor:
                                        TraitProcessorV3.getElementColor(
                                          ability.element,
                                        ) + "0A",
                                    }}
                                  >
                                    {ability.name}
                                  </div>
                                ) : null;
                              })}
                            </div>
                          </div>

                          {/* Companion Toggle */}
                          {companion && (
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                if (
                                  !(
                                    !companionInTeam &&
                                    selectedTeam.length >= settings.teamSize
                                  )
                                ) {
                                  toggleUnitSelection(companion);
                                  gameSounds.playClick();
                                }
                              }}
                              className={`
                                flex mt-2 sm:mt-3 items-center gap-2 sm:gap-3 p-1.5 sm:p-2 rounded border transition-all w-full
                                ${companionInTeam
                                  ? "bg-yellow-500 border-yellow-400 hover:bg-yellow-400"
                                  : "bg-black/50 border-yellow-500/30 hover:border-yellow-500/50 hover:bg-yellow-500/10"
                                }
                                ${!companionInTeam &&
                                  selectedTeam.length >= settings.teamSize
                                  ? "opacity-50 cursor-not-allowed"
                                  : "cursor-pointer"
                                }
                              `}
                            >
                              <img
                                src={companion.imageUrl}
                                alt={companion.name}
                                className="w-6 h-6 sm:w-8 sm:h-8 object-cover pixelated rounded flex-shrink-0"
                              />
                              <div className="text-[10px] sm:text-xs min-w-0 text-left flex-1">
                                <div
                                  className={`truncate font-semibold ${companionInTeam ? "text-black" : "text-yellow-400"}`}
                                >
                                  {companion.name}
                                </div>
                                <div
                                  className={`font-bold ${companionInTeam ? "text-black/80" : "text-green-400/60"}`}
                                >
                                  {companionInTeam && isSelected
                                    ? "2% BOOST ✓"
                                    : companionInTeam
                                      ? "Companion ✓"
                                      : "Add Companion"}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>

              {/* Empty State */}
              {!loading && processedUnits.length === 0 && !showStockRobopets && (
                <div className="text-center py-12">
                  <p className="text-green-400/60 text-lg">
                    NO COMBAT UNITS DETECTED
                  </p>
                </div>
              )}
            </div>
            
            {/* Stock Robopets Section */}
            {isConnected && (
              <div className="mt-12 border-t border-green-500/30 pt-8">
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold text-green-400 mb-2">
                    STOCK ROBOPETS
                  </h3>
                  <p className="text-green-400/70 text-sm mb-4">
                    Don't have enough Robotos to play? Use some of Pablo Stanley's stash.
                  </p>
                  <div className="flex items-center justify-center gap-4">
                    <Button
                      variant={showStockRobopets ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setShowStockRobopets(!showStockRobopets);
                        gameSounds.play("menuNavigate");
                      }}
                      className={showStockRobopets ? "bg-green-600 hover:bg-green-700" : ""}
                    >
                      {showStockRobopets ? "Hide Stock Robopets" : "Show Stock Robopets"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        window.open("https://opensea.io/collection/robopets", "_blank");
                        gameSounds.play("confirm");
                      }}
                      className="border-blue-500 text-blue-400 hover:bg-blue-500/10"
                    >
                      Get Your Own on OpenSea →
                    </Button>
                  </div>
                  {showStockRobopets && (
                    <p className="text-xs text-yellow-400/70 mt-3">
                      ⚡ These Robopets can be used by multiple players simultaneously
                    </p>
                  )}
                </div>
                
                {/* Stock Units Grid */}
                {showStockRobopets && (
                  <div>
                    <div className="mb-4 text-center">
                      <span className="text-sm text-purple-400 font-bold">
                        PABLO'S COLLECTION ({filteredStockUnits.length} AVAILABLE)
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {filteredStockUnits.map((unit, index) => {
                        const isSelected = selectedTeam.find(
                          (u) => u.id === unit.id && u.type === unit.type,
                        );
                        
                        return (
                          <Card
                            key={`stock-${unit.id}`}
                            className={`bg-black/60 border-2 rounded-[0.7em] transition-all overflow-hidden relative cursor-pointer ${
                              isSelected
                                ? "border-green-500 shadow-[0_0_20px_rgba(0,255,0,0.6)]"
                                : "border-purple-500/30 hover:border-purple-500/60"
                            }`}
                            onClick={() => toggleUnitSelection(unit)}
                            onMouseEnter={() => gameSounds.playHover()}
                          >
                            {/* Expand button */}
                            <Button
                              variant="terminal"
                              size="icon"
                              className="absolute top-1.5 right-1.5 z-10 opacity-60 hover:opacity-100 w-6 h-6"
                              onClick={(e) => {
                                e.stopPropagation();
                                // Adjust index for lightbox
                                setLightboxIndex(processedUnits.length + index);
                                gameSounds.playClick();
                              }}
                            >
                              <Expand className="w-3 h-3 sm:w-4 sm:h-4" />
                            </Button>

                            <div className="flex">
                              {/* Left side - Image */}
                              <div className="w-32 h-32 sm:w-36 sm:h-36 p-1 flex-shrink-0 relative">
                                <div className="absolute top-2 left-2 z-10 bg-purple-600 text-white text-[10px] px-2 py-0.5 rounded font-bold">
                                  STOCK
                                </div>
                                <img
                                  src={unit.imageUrl}
                                  alt={unit.name}
                                  className="w-full h-full object-cover pixelated"
                                />
                              </div>

                              {/* Right side - Metadata */}
                              <div className="flex-1 p-3 sm:p-4 min-h-[128px] sm:min-h-[192px] flex flex-col">
                                {/* Header */}
                                <div className="mb-2 sm:mb-3 pr-8 sm:pr-12">
                                  <div className="flex items-center gap-1 sm:gap-2 mb-1 flex-wrap">
                                    <span className="text-sm sm:text-base font-bold text-green-400">
                                      {unit.name}
                                    </span>
                                    <span className="text-xs sm:text-sm text-purple-400">
                                      (Stock)
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap gap-1 text-[10px] sm:text-xs">
                                    <span className="bg-green-500/20 text-green-400 px-1 sm:px-2 py-0.5 rounded">
                                      {unit.element}
                                    </span>
                                    <span className="bg-blue-500/20 text-blue-400 px-1 sm:px-2 py-0.5 rounded">
                                      {unit.type.toUpperCase()}
                                    </span>
                                  </div>
                                </div>

                                {/* Stats Grid */}
                                <div className="grid grid-cols-3 gap-x-2 sm:gap-x-4 gap-y-1 sm:gap-y-2 text-[10px] sm:text-xs mt-auto">
                                  <div className="flex items-center gap-1">
                                    <Heart className="w-3 h-3 text-red-500" />
                                    <span>{unit.stats.hp}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Swords className="w-3 h-3 text-yellow-500" />
                                    <span>{unit.stats.attack}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Shield className="w-3 h-3 text-blue-500" />
                                    <span>{unit.stats.defense}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Zap className="w-3 h-3 text-purple-500" />
                                    <span>{unit.stats.speed}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Gauge className="w-3 h-3 text-green-500" />
                                    <span>{unit.stats.energy}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Sparkles className="w-3 h-3 text-orange-500" />
                                    <span>{unit.stats.crit}%</span>
                                  </div>
                                </div>

                                {/* Selection Status */}
                                {isSelected && (
                                  <div className="mt-2 sm:mt-3 text-center bg-green-500/20 rounded p-1">
                                    <span className="text-[10px] sm:text-xs text-green-400 font-bold">
                                      SELECTED
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                    
                    {filteredStockUnits.length === 0 && (
                      <div className="text-center py-8">
                        <p className="text-purple-400/60">
                          No stock units match your current filters
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <UnitLightbox
          units={[...filteredUnits, ...filteredStockUnits]}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onSelect={(unit) => {
            toggleUnitSelection(unit);
            setLightboxIndex(null);
          }}
          selectedTeam={selectedTeam}
          maxTeamSize={settings.teamSize}
        />
      )}

      {/* Fixed Team Footer - Only show when connected and have units */}
      {isConnected && (processedUnits.length > 0 || stockUnits.length > 0) && (
        <TeamFooter
          selectedTeam={selectedTeam}
          settings={settings}
          onUpdateSetting={updateSetting}
          onRemoveUnit={toggleUnitSelection}
          onStartBattle={saveTeamAndBattle}
        />
      )}

      {/* Add bottom padding when footer is visible */}
      {isConnected && (processedUnits.length > 0 || stockUnits.length > 0) && <div className="h-20" />}
    </PageLayout>
  );
}
