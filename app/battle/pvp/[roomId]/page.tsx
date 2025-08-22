"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { Client, Room } from "colyseus.js";
import BattleArena from "../../../../components/battle/BattleArena";
import { GameHeader } from "../../../../components/shared/GameHeader";
import { PageLayout } from "../../../../components/shared/PageLayout";
import { BattleUnitV3 } from "../../../../lib/game-engine/TraitProcessorV3";
import { gameSounds } from "../../../../lib/sounds/gameSounds";
import { BattleNotifications } from "../../../../lib/notifications/battleNotifications";
import { ConfirmDialog } from "../../../../components/ui/confirm-dialog";
import { Button } from "../../../../components/ui/button";

export default function PvPBattlePage() {
  const params = useParams();
  const router = useRouter();
  const { address } = useAccount();
  const roomId = params.roomId as string;

  const [room, setRoom] = useState<Room | null>(null);
  const [playerTeam, setPlayerTeam] = useState<BattleUnitV3[]>([]);
  const [enemyTeam, setEnemyTeam] = useState<BattleUnitV3[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlayerTurn, setIsPlayerTurn] = useState(false);
  const [battleStarted, setBattleStarted] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [serverBattleResult, setServerBattleResult] = useState<any>(null);

  useEffect(() => {
    if (!roomId || !address) {
      router.push("/battle/pvp");
      return;
    }

    connectToRoom();

    return () => {
      if (room) {
        room.leave();
      }
    };
  }, [roomId]);

  const connectToRoom = async () => {
    try {
      const wsUrl =
        process.env.NEXT_PUBLIC_COLYSEUS_URL || "ws://localhost:2567";
      const client = new Client(wsUrl);

      // Load saved team
      const savedSettings = localStorage.getItem("battle_settings");
      const settings = savedSettings
        ? JSON.parse(savedSettings)
        : { teamSize: 5, speed: "speedy" };
      const teamKey = `roboto_rumble_team_${settings.teamSize}`;
      const savedTeam = localStorage.getItem(teamKey);

      if (!savedTeam) {
        setError("No team found!");
        setTimeout(() => router.push("/team-builder"), 1500);
        return;
      }

      // Rejoin the room
      const joinedRoom = await client.joinById(roomId, {
        address: address,
        team: JSON.parse(savedTeam),
      });

      setRoom(joinedRoom);

      // Send ready signal
      joinedRoom.send("ready");

      // Set up room event listeners
      joinedRoom.onStateChange((state: any) => {
        // Update battle state based on Colyseus state
        if (state.status === "battle" && !battleStarted) {
          setBattleStarted(true);
          setupBattleTeams(state, joinedRoom.sessionId);
        }

        // Update turn state
        if (state.currentTurn === joinedRoom.sessionId) {
          setIsPlayerTurn(true);
        } else {
          setIsPlayerTurn(false);
        }
      });

      joinedRoom.onMessage("battle-start", (message) => {
        gameSounds.play("confirm");
      });

      joinedRoom.onMessage("turn-start", (data) => {
        if (data.playerId === joinedRoom.sessionId) {
          setIsPlayerTurn(true);
          gameSounds.play("turnStart");
          // Show notification if tab is not visible
          if (document.visibilityState !== "visible") {
            BattleNotifications.showYourTurn();
          }
        } else {
          setIsPlayerTurn(false);
        }
      });

      // Handle action results from server
      joinedRoom.onMessage("action-executed", (result) => {
        // Our action was executed on server
        setServerBattleResult(result);
        setIsPlayerTurn(result.isPlayerTurn);
      });

      joinedRoom.onMessage("opponent-action", (result) => {
        // Opponent's action was executed on server
        setServerBattleResult(result);
        setIsPlayerTurn(result.isPlayerTurn);
      });

      joinedRoom.onMessage("battle-end", (data) => {
        const won = data.winner === joinedRoom.sessionId;
        gameSounds.play(won ? "victory" : "defeat");

        // Redirect after showing result
        setTimeout(() => {
          router.push("/battle");
        }, 5000);
      });

      joinedRoom.onMessage("error", (message) => {
        setError(message.message);
        gameSounds.play("error");
      });

      setLoading(false);
    } catch (err) {
      console.error("Failed to connect to room:", err);
      setError("Failed to connect to battle");
      setLoading(false);
    }
  };

  const setupBattleTeams = (state: any, mySessionId: string) => {
    // Parse teams from state
    const units = Array.from(state.units);
    const myUnits: BattleUnitV3[] = [];
    const opponentUnits: BattleUnitV3[] = [];

    units.forEach((unit: any) => {
      const battleUnit: BattleUnitV3 = {
        id: unit.id,
        name: unit.name,
        element: unit.element,
        type: "roboto",
        stats: {
          hp: unit.maxHp,
          attack: 50, // Default values, server handles actual combat
          defense: 40,
          speed: 45,
          energy: unit.maxEnergy,
          crit: 10,
        },
        abilities: [],
        traits: {},
        imageUrl: "",
        elementModifiers: {
          strongAgainst: [],
          weakAgainst: [],
        },
      };

      if (unit.ownerId === mySessionId) {
        myUnits.push(battleUnit);
      } else {
        opponentUnits.push(battleUnit);
      }
    });

    setPlayerTeam(myUnits);
    setEnemyTeam(opponentUnits);
  };

  const handleAction = (action: any) => {
    if (!room || !isPlayerTurn) return;

    // Send action to server
    room.send("action", {
      type: action.type,
      sourceId: action.sourceId,
      targetId: action.targetId,
      abilityId: action.abilityId,
      timingBonus: action.timingBonus,
      defenseBonus: action.defenseBonus,
    });

    setIsPlayerTurn(false);
  };

  const handleForfeit = () => {
    if (room) {
      room.send("forfeit");
      room.leave();
    }
    gameSounds.play("defeat");
    router.push("/battle");
  };

  const handleExitAttempt = () => {
    // Show confirmation dialog instead of immediately leaving
    setShowExitDialog(true);
  };

  if (loading) {
    return (
      <PageLayout>
        <GameHeader title="PvP BATTLE" />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin w-16 h-16 border-4 border-green-400 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-green-400">Connecting to battle...</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout>
        <GameHeader title="PvP BATTLE" showBackButton backHref="/battle/pvp" />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <p className="text-red-400 mb-4">{error}</p>
            <Button
              variant="terminal"
              onClick={() => router.push("/battle/pvp")}
            >
              Back to Lobby
            </Button>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (!battleStarted) {
    return (
      <PageLayout>
        <GameHeader title="PvP BATTLE" />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-pulse">
              <p className="text-2xl text-green-400 mb-2">
                WAITING FOR OPPONENT
              </p>
              <p className="text-gray-400">Get ready for battle...</p>
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      {/* Exit button overlay */}
      <div className="absolute top-4 left-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={handleExitAttempt}
          className="border-red-500 text-red-400 hover:bg-red-500/10"
        >
          EXIT BATTLE
        </Button>
      </div>

      <BattleArena
        playerTeam={playerTeam}
        enemyTeam={enemyTeam}
        isPvP={true}
        isPlayerTurn={isPlayerTurn}
        serverTimer={room?.state?.turnTimer}
        onAction={handleAction}
        roomState={serverBattleResult}
        onBattleEnd={(won) => {
          // Battle end is handled by server
        }}
      />

      {/* Exit confirmation dialog */}
      <ConfirmDialog
        open={showExitDialog}
        onOpenChange={setShowExitDialog}
        title="Leave Battle?"
        description="Leaving the battle will count as a forfeit and you will lose the match. Are you sure you want to leave?"
        confirmText="Forfeit Match"
        cancelText="Continue Fighting"
        variant="warning"
        onConfirm={handleForfeit}
      />
    </PageLayout>
  );
}
