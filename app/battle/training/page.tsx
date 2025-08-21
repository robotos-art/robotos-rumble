"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { ArrowLeft } from "lucide-react";
import { gameSounds } from "../../../lib/sounds/gameSounds";
import { BattleUnitV3 } from "../../../lib/game-engine/TraitProcessorV3";
import BattleArena from "../../../components/battle/BattleArena";
import { GameHeader } from "../../../components/shared/GameHeader";
import { PageLayout } from "../../../components/shared/PageLayout";

export default function TrainingBattle() {
  const router = useRouter();
  const [playerTeam, setPlayerTeam] = useState<BattleUnitV3[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load saved team based on battle settings
    const savedSettings = localStorage.getItem("battle_settings");
    const teamSize = savedSettings ? JSON.parse(savedSettings).teamSize : 5;
    const teamKey = `roboto_rumble_team_${teamSize}`;
    const savedTeam = localStorage.getItem(teamKey);

    if (savedTeam) {
      setPlayerTeam(JSON.parse(savedTeam));
    }
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-green-400 text-xl animate-pulse">
            LOADING COMBAT SIMULATION...
          </p>
        </div>
      </PageLayout>
    );
  }

  if (playerTeam.length === 0) {
    return (
      <PageLayout>
        <GameHeader showBackButton backHref="/battle" />
        <div className="max-w-4xl mx-auto text-center mt-20">
          <h1 className="text-3xl font-bold mb-4 text-red-500">
            NO TEAM DETECTED
          </h1>
          <p className="text-green-400 mb-6">You need to build a team first!</p>
          <Link href="/team-builder">
            <Button variant="terminal" size="lg">
              [BUILD TEAM]
            </Button>
          </Link>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout fullScreen>
      <GameHeader
        showBackButton
        backHref="/battle"
        className="absolute top-0 left-0 right-0 z-50"
      />

      {/* Battle Arena takes full screen */}
      <BattleArena
        playerTeam={playerTeam}
        onBattleEnd={(won) => {
          // Handle battle end
          if (won) {
            gameSounds.playConfirm();
            // Could add rewards, experience, etc
          } else {
            gameSounds.play("defeat");
          }
          // Return to battle menu
          router.push("/battle");
        }}
      />
    </PageLayout>
  );
}
