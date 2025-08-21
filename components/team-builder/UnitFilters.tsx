"use client";

import { useState } from "react";
import { Search, Filter, X } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { TraitProcessorV3 } from "../../lib/game-engine/TraitProcessorV3";
import { gameSounds } from "../../lib/sounds/gameSounds";

type Element = "SURGE" | "CODE" | "METAL" | "GLITCH" | "NEUTRAL";
type RobotType =
  | "all"
  | "roboto"
  | "robopet"
  | "helmeto"
  | "mulleto"
  | "cyborgo"
  | "computo";

interface FilterState {
  search: string;
  elements: Element[];
  robotType: RobotType;
  minHp?: number;
  maxHp?: number;
  minAttack?: number;
  maxAttack?: number;
  minDefense?: number;
  maxDefense?: number;
  minSpeed?: number;
  maxSpeed?: number;
  sortBy: "name" | "element" | "hp" | "attack" | "defense" | "speed";
  sortOrder: "asc" | "desc";
}

interface UnitFiltersProps {
  onFiltersChange: (filters: FilterState) => void;
  unitCount: number;
  filteredCount: number;
}

export function UnitFilters({
  onFiltersChange,
  unitCount,
  filteredCount,
}: UnitFiltersProps) {
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    elements: [],
    robotType: "all",
    sortBy: "name",
    sortOrder: "asc",
  });

  const [showAdvanced, setShowAdvanced] = useState(false);

  const elements: Element[] = ["SURGE", "CODE", "METAL", "GLITCH", "NEUTRAL"];

  const updateFilters = (updates: Partial<FilterState>) => {
    const newFilters = { ...filters, ...updates };
    setFilters(newFilters);
    onFiltersChange(newFilters);
    gameSounds.playClick();
  };

  const toggleElement = (element: Element) => {
    const newElements = filters.elements.includes(element)
      ? filters.elements.filter((e) => e !== element)
      : [...filters.elements, element];
    updateFilters({ elements: newElements });
  };

  const clearFilters = () => {
    const defaultFilters: FilterState = {
      search: "",
      elements: [],
      robotType: "all",
      sortBy: "name",
      sortOrder: "asc",
    };
    setFilters(defaultFilters);
    onFiltersChange(defaultFilters);
    gameSounds.play("cancel");
  };

  const hasActiveFilters =
    filters.search ||
    filters.elements.length > 0 ||
    filters.robotType !== "all" ||
    filters.minHp ||
    filters.maxHp ||
    filters.minAttack ||
    filters.maxAttack ||
    filters.minDefense ||
    filters.maxDefense ||
    filters.minSpeed ||
    filters.maxSpeed;

  return (
    <div className="mb-6 space-y-4">
      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500/50" />
          <Input
            placeholder="Search by name or ID..."
            value={filters.search}
            onChange={(e) => updateFilters({ search: e.target.value })}
            className="pl-10 bg-black/60 border-green-500/30 text-green-500 placeholder:text-green-500/30"
          />
        </div>

        <Button
          variant="terminal"
          size="icon"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={showAdvanced ? "bg-green-500/20" : ""}
          title="Toggle filters"
        >
          <Filter className="w-4 h-4" />
        </Button>

        {hasActiveFilters && (
          <Button
            variant="terminal"
            size="sm"
            onClick={clearFilters}
            className="gap-2"
          >
            <X className="w-4 h-4" />
            CLEAR
          </Button>
        )}
      </div>

      {/* Element and Type Filters - Single Row */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* Element Filters */}
        <div className="flex flex-wrap gap-2 flex-1">
          {elements.map((element) => (
            <Button
              key={element}
              variant="terminal"
              size="sm"
              onClick={() => toggleElement(element)}
              className={`transition-all ${
                filters.elements.includes(element)
                  ? "bg-green-500/20 border-green-500"
                  : "opacity-60 hover:opacity-100"
              }`}
              style={{
                borderColor: filters.elements.includes(element)
                  ? TraitProcessorV3.getElementColor(element)
                  : undefined,
                color: filters.elements.includes(element)
                  ? TraitProcessorV3.getElementColor(element)
                  : undefined,
              }}
            >
              <span className="text-lg mr-1">
                {TraitProcessorV3.getElementSymbol(element)}
              </span>
              <span className="hidden sm:inline">{element}</span>
            </Button>
          ))}
        </div>

        {/* Robot Type Filter */}
        <div className="flex flex-wrap gap-2">
          <span className="text-green-400 text-sm self-center mr-2 hidden md:inline">
            TYPE:
          </span>
          {[
            { value: "all", label: "ALL" },
            { value: "roboto", label: "ROBOTO" },
            { value: "robopet", label: "ROBOPET" },
            { value: "helmeto", label: "HELMETO" },
            { value: "mulleto", label: "MULLETO" },
            { value: "cyborgo", label: "CYBORGO" },
            { value: "computo", label: "COMPUTO" },
          ].map((type) => (
            <Button
              key={type.value}
              variant="terminal"
              size="sm"
              onClick={() =>
                updateFilters({ robotType: type.value as RobotType })
              }
              className={
                filters.robotType === type.value
                  ? "bg-green-500/20"
                  : "opacity-60"
              }
            >
              {type.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Advanced Filters (Collapsible) */}
      {showAdvanced && (
        <div className="p-4 border border-green-500/30 bg-black/40 rounded-lg space-y-4">
          <h3 className="text-green-400 font-bold mb-2">STAT FILTERS</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* HP Range */}
            <div>
              <label className="text-green-400 text-sm">HP RANGE</label>
              <div className="flex gap-2 mt-1">
                <Input
                  type="number"
                  placeholder="Min"
                  value={filters.minHp || ""}
                  onChange={(e) =>
                    updateFilters({
                      minHp: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                  className="bg-black/60 border-green-500/30 text-green-500"
                />
                <span className="text-green-500 self-center">-</span>
                <Input
                  type="number"
                  placeholder="Max"
                  value={filters.maxHp || ""}
                  onChange={(e) =>
                    updateFilters({
                      maxHp: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                  className="bg-black/60 border-green-500/30 text-green-500"
                />
              </div>
            </div>

            {/* Attack Range */}
            <div>
              <label className="text-green-400 text-sm">ATTACK RANGE</label>
              <div className="flex gap-2 mt-1">
                <Input
                  type="number"
                  placeholder="Min"
                  value={filters.minAttack || ""}
                  onChange={(e) =>
                    updateFilters({
                      minAttack: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                  className="bg-black/60 border-green-500/30 text-green-500"
                />
                <span className="text-green-500 self-center">-</span>
                <Input
                  type="number"
                  placeholder="Max"
                  value={filters.maxAttack || ""}
                  onChange={(e) =>
                    updateFilters({
                      maxAttack: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                  className="bg-black/60 border-green-500/30 text-green-500"
                />
              </div>
            </div>

            {/* Defense Range */}
            <div>
              <label className="text-green-400 text-sm">DEFENSE RANGE</label>
              <div className="flex gap-2 mt-1">
                <Input
                  type="number"
                  placeholder="Min"
                  value={filters.minDefense || ""}
                  onChange={(e) =>
                    updateFilters({
                      minDefense: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                  className="bg-black/60 border-green-500/30 text-green-500"
                />
                <span className="text-green-500 self-center">-</span>
                <Input
                  type="number"
                  placeholder="Max"
                  value={filters.maxDefense || ""}
                  onChange={(e) =>
                    updateFilters({
                      maxDefense: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                  className="bg-black/60 border-green-500/30 text-green-500"
                />
              </div>
            </div>

            {/* Speed Range */}
            <div>
              <label className="text-green-400 text-sm">SPEED RANGE</label>
              <div className="flex gap-2 mt-1">
                <Input
                  type="number"
                  placeholder="Min"
                  value={filters.minSpeed || ""}
                  onChange={(e) =>
                    updateFilters({
                      minSpeed: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                  className="bg-black/60 border-green-500/30 text-green-500"
                />
                <span className="text-green-500 self-center">-</span>
                <Input
                  type="number"
                  placeholder="Max"
                  value={filters.maxSpeed || ""}
                  onChange={(e) =>
                    updateFilters({
                      maxSpeed: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                  className="bg-black/60 border-green-500/30 text-green-500"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sort Options */}
      <div className="flex items-center gap-4 flex-wrap">
        <span className="text-green-400 text-sm">SORT BY:</span>
        <select
          value={filters.sortBy}
          onChange={(e) => updateFilters({ sortBy: e.target.value as any })}
          className="bg-black/60 border border-green-500/30 text-green-500 px-3 py-1 rounded"
        >
          <option value="name">NAME</option>
          <option value="element">ELEMENT</option>
          <option value="hp">HP</option>
          <option value="attack">ATTACK</option>
          <option value="defense">DEFENSE</option>
          <option value="speed">SPEED</option>
        </select>

        <Button
          variant="terminal"
          size="sm"
          onClick={() =>
            updateFilters({
              sortOrder: filters.sortOrder === "asc" ? "desc" : "asc",
            })
          }
          className="opacity-60 hover:opacity-100"
        >
          {filters.sortOrder === "asc" ? "↑" : "↓"}
        </Button>

        <span className="text-green-400/60 text-sm ml-auto">
          SHOWING {filteredCount} OF {unitCount} UNITS
        </span>
      </div>
    </div>
  );
}
