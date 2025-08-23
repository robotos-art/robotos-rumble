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
  const [serverTurnEvent, setServerTurnEvent] = useState<any>(null);

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

      // Check if we're coming from the lobby with an existing connection
      const isConnected = sessionStorage.getItem('pvp_room_connected');
      const storedRoomId = sessionStorage.getItem('pvp_room_id');
      const storedSessionId = sessionStorage.getItem('pvp_session_id');
      
      // Clear the flag
      sessionStorage.removeItem('pvp_room_connected');
      
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

      let joinedRoom;
      
      if (isConnected === 'true' && storedRoomId === roomId && storedSessionId) {
        // Try to reconnect with the existing session
        try {
          joinedRoom = await client.reconnect(roomId, storedSessionId);
          console.log("Reconnected to existing room");
        } catch (reconnectErr) {
          console.log("Reconnect failed, trying fresh join:", reconnectErr);
          // Fall back to regular join
          joinedRoom = await client.joinById(roomId, {
            address: address,
            team: JSON.parse(savedTeam),
          });
        }
      } else {
        // Regular join
        joinedRoom = await client.joinById(roomId, {
          address: address,
          team: JSON.parse(savedTeam),
        });
      }

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
        // Pass turn event to BattleArena for server-driven phase transitions
        setServerTurnEvent({
          unitId: data.unitId,
          playerId: data.playerId,
          timer: data.timer
        });
        
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

      // Handle action results from server (unified message for both players)
      joinedRoom.onMessage("action-result", (result) => {
        setServerBattleResult(result);
        // Don't set turn here - wait for turn-start message
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
    // Load saved team data to get abilities and stats
    const savedSettings = localStorage.getItem("battle_settings");
    const settings = savedSettings
      ? JSON.parse(savedSettings)
      : { teamSize: 5, speed: "speedy" };
    const teamKey = `roboto_rumble_team_${settings.teamSize}`;
    const savedTeam = localStorage.getItem(teamKey);
    const localTeamData = savedTeam ? JSON.parse(savedTeam) : [];

    // Parse teams from state
    const units = Array.from(state.units);
    const myUnits: BattleUnitV3[] = [];
    const opponentUnits: BattleUnitV3[] = [];

    units.forEach((unit: any) => {
      // Try to find matching unit in saved team data for abilities and stats
      const savedUnit = localTeamData.find((saved: any) => 
        unit.id.includes(saved.id) || 
        unit.name === saved.name ||
        unit.id.endsWith(`:${saved.id}`)
      );

      const battleUnit: BattleUnitV3 = {
        id: unit.id,
        name: unit.name,
        element: unit.element,
        type: "roboto",
        stats: savedUnit ? savedUnit.stats : {
          hp: unit.maxHp,
          attack: 50,
          defense: 40,
          speed: 45,
          energy: unit.maxEnergy,
          crit: 10,
        },
        abilities: savedUnit ? savedUnit.abilities : [],
        traits: savedUnit ? savedUnit.traits : {},
        imageUrl: unit.imageUrl || "",
        elementModifiers: savedUnit ? savedUnit.elementModifiers : {
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
        serverTurnEvent={serverTurnEvent}
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
