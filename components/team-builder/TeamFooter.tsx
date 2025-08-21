"use client";

import { useState } from "react";
import { Settings, X } from "lucide-react";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { BattleUnitV3 } from "../../lib/game-engine/TraitProcessorV3";
import { gameSounds } from "../../lib/sounds/gameSounds";
import type { BattleSettings } from "../../app/battle/page";

interface TeamFooterProps {
  selectedTeam: BattleUnitV3[];
  settings: BattleSettings;
  onUpdateSetting: <K extends keyof BattleSettings>(
    key: K,
    value: BattleSettings[K],
  ) => void;
  onRemoveUnit: (unit: BattleUnitV3) => void;
  onStartBattle: () => void;
}

export function TeamFooter({
  selectedTeam,
  settings,
  onUpdateSetting,
  onRemoveUnit,
  onStartBattle,
}: TeamFooterProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Check for companion pairs
  const getCompanion = (unit: BattleUnitV3) => {
    const unitBaseId = unit.id.replace(/^(roboto|robopet)-/, "");
    return selectedTeam.find((u) => {
      const uBaseId = u.id.replace(/^(roboto|robopet)-/, "");
      return uBaseId === unitBaseId && u.type !== unit.type;
    });
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-black/95 border-t-2 border-green-500/50 backdrop-blur-sm">
      <div className="flex items-center justify-between h-12 sm:h-16 px-2 sm:px-4">
        {/* Left: Settings */}
        <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="terminal"
              size="icon"
              className="flex-shrink-0 h-8 w-8 sm:h-10 sm:w-10"
              onMouseEnter={() => gameSounds.playHover()}
            >
              <Settings className="w-3 h-3 sm:w-4 sm:h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="bg-black/95 border-green-500/50 text-green-500"
          >
            <DropdownMenuLabel className="text-green-400 font-mono">
              TEAM SIZE
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={settings.teamSize.toString()}
              onValueChange={(value) =>
                onUpdateSetting("teamSize", parseInt(value) as 3 | 5)
              }
            >
              <DropdownMenuRadioItem
                value="3"
                className="text-green-500 hover:bg-green-500/10"
              >
                3v3
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem
                value="5"
                className="text-green-500 hover:bg-green-500/10"
              >
                5v5
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>

            <DropdownMenuSeparator className="bg-green-500/20" />

            <DropdownMenuLabel className="text-green-400 font-mono">
              TIMER
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={settings.speed}
              onValueChange={(value) =>
                onUpdateSetting("speed", value as "calm" | "speedy")
              }
            >
              <DropdownMenuRadioItem
                value="calm"
                className="text-green-500 hover:bg-green-500/10"
              >
                CALM (10s)
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem
                value="speedy"
                className="text-green-500 hover:bg-green-500/10"
              >
                SPEEDY (5s)
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Center: Team Slots */}
        <div className="flex items-center gap-1 sm:gap-2 mx-2 sm:mx-4">
          {[...Array(settings.teamSize)].map((_, index) => {
            const unit = selectedTeam[index];
            const companion = unit ? getCompanion(unit) : null;

            return (
              <div
                key={`footer-slot-${index}`}
                className={`relative w-8 h-8 sm:w-10 sm:h-10 border-2 rounded ${
                  unit
                    ? "border-green-500 bg-black cursor-pointer hover:border-red-500 transition-colors"
                    : "border-green-500/30 border-dashed bg-black/50"
                }`}
                onClick={() => unit && onRemoveUnit(unit)}
                onMouseEnter={() => unit && gameSounds.playHover()}
                title={unit ? `${unit.name} - Click to remove` : "Empty slot"}
              >
                {unit ? (
                  <>
                    <img
                      src={unit.imageUrl}
                      alt={unit.name}
                      className="w-full h-full object-cover rounded pixelated"
                    />
                    {companion && (
                      <div className="absolute -top-1 -right-1 text-[8px] bg-yellow-500 text-black px-0.5 rounded font-bold">
                        +2%
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 bg-black/70 rounded transition-opacity">
                      <X className="w-4 h-4 text-red-500" />
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-green-500/30 text-xs">
                    ?
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Right: Start Battle */}
        <Button
          variant="terminal"
          size="sm"
          onClick={onStartBattle}
          disabled={selectedTeam.length !== settings.teamSize}
          className={`flex-shrink-0 h-8 sm:h-10 px-2 sm:px-4 text-xs sm:text-sm ${
            selectedTeam.length === settings.teamSize ? "animate-pulse" : ""
          }`}
          onMouseEnter={() =>
            selectedTeam.length === settings.teamSize && gameSounds.playHover()
          }
        >
          <span className="hidden sm:inline">START BATTLE →</span>
          <span className="sm:hidden">START →</span>
        </Button>
      </div>
    </div>
  );
}
