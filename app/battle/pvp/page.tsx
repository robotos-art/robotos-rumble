"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { Client, Room } from "colyseus.js";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { GameHeader } from "../../../components/shared/GameHeader";
import { PageLayout } from "../../../components/shared/PageLayout";
import { Users, Swords, Clock, Search, Shield, Bell, Edit } from "lucide-react";
import { gameSounds } from "../../../lib/sounds/gameSounds";
import { BattleNotifications } from "../../../lib/notifications/battleNotifications";
import BattleArena from "../../../components/battle/BattleArena";
import {
  TraitProcessorV3,
  BattleUnitV3
} from "../../../lib/game-engine/TraitProcessorV3";
import { UnitLightbox } from "../../../components/team-builder/UnitLightbox";
import { MatchProposalModal } from "../../../components/battle/MatchProposalModal";

export default function PvPLobby() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const [client, setClient] = useState<Client | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [lobbyRoom, setLobbyRoom] = useState<Room | null>(null);
  const [status, setStatus] = useState<
    "idle" | "searching" | "joining" | "connected" | "battle"
  >("idle");
  const [onlineCount, setOnlineCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [battleStarted, setBattleStarted] = useState(false);
  const [playerTeam, setPlayerTeam] = useState<BattleUnitV3[]>([]);
  const [enemyTeam, setEnemyTeam] = useState<BattleUnitV3[]>([]);
  const [loadedTeam, setLoadedTeam] = useState<any[]>([]);
  const [isPlayerTurn, setIsPlayerTurn] = useState(false);
  const [serverBattleResult, setServerBattleResult] = useState<any>(null);
  const [serverTurnEvent, setServerTurnEvent] = useState<any>(null);
  const [opponentTargetPreview, setOpponentTargetPreview] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Settings mismatch handling
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [opponentSettings, setOpponentSettings] = useState<{ teamSize: number; speed: string } | null>(null);
  const [waitingPlayers, setWaitingPlayers] = useState<any[]>([]);

  // Load battle settings
  const [settings, setSettings] = useState({ teamSize: 5, speed: "speedy" });

  // Load team when component mounts or when returning from team-builder
  useEffect(() => {
    const loadTeam = () => {
      const savedSettings = localStorage.getItem("battle_settings");
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        setSettings(parsedSettings);

        // Load the team for the current settings
        const teamKey = `roboto_rumble_team_${parsedSettings.teamSize}`;
        const savedTeam = localStorage.getItem(teamKey);
        if (savedTeam && savedTeam !== "[]") {
          try {
            const team = JSON.parse(savedTeam);
            // Team is already processed from team-builder, no need to process again
            setLoadedTeam(team);
          } catch (e) {
            console.error("Error loading team:", e);
          }
        }
      }
    };

    setMounted(true);
    loadTeam();

    // Also reload when page becomes visible (returning from team-builder)
    const handleFocus = () => {
      loadTeam();
    };

    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  useEffect(() => {
    // Initialize Colyseus client
    const wsUrl = process.env.NEXT_PUBLIC_COLYSEUS_URL || "ws://localhost:2567";
    const colyseusClient = new Client(wsUrl);
    setClient(colyseusClient);

    // Check notification permission status
    setNotificationsEnabled(BattleNotifications.isEnabled());

    // Request notification permission if not already asked
    const checkNotifications = async () => {
      const notifSetting = localStorage.getItem("pvp_notifications_asked");
      if (!notifSetting && isConnected) {
        // Wait a second before asking for permissions
        setTimeout(() => {
          requestNotificationPermission();
        }, 1000);
      }
    };
    checkNotifications();

    // Join lobby room to track waiting players
    const joinLobby = async () => {
      if (!colyseusClient || !isConnected) return;

      try {
        const lobby = await colyseusClient.joinOrCreate("lobby");
        setLobbyRoom(lobby);

        // Listen for lobby updates
        lobby.onStateChange((state: any) => {
          setOnlineCount(state.totalOnline || 0);
        });

        // Listen for players looking for matches
        lobby.onMessage("player-looking", (data) => {
          // Store all waiting players
          setWaitingPlayers(prev => {
            const filtered = prev.filter(p => p.id !== data.id);
            return [...filtered, data];
          });

          // Show notification based on settings match
          if (status === "idle") {
            const isExactMatch = data.teamSize === settings.teamSize &&
              data.speed === settings.speed;
            const isMismatch = data.teamSize !== settings.teamSize ||
              data.speed !== settings.speed;

            if (isExactMatch) {
              // Perfect match - show strong notification
              BattleNotifications.showPlayerWaiting(data);
            } else if (isMismatch) {
              // Mismatch - show softer notification with details
              gameSounds.play("menuNavigate");
              const message = `Player waiting: ${data.teamSize}v${data.teamSize} ${data.speed}`;
              new Notification("Mismatched Player Available", {
                body: message,
                icon: "/icon-192.png"
              });
            }
          }
        });

        // Listen for existing waiting players
        lobby.onMessage("players-waiting", (players) => {
          setWaitingPlayers(players);

          // Check for any players (exact or mismatched)
          if (players.length > 0 && status === "idle") {
            const exactMatch = players.find(
              (p: any) =>
                p.teamSize === settings.teamSize && p.speed === settings.speed,
            );
            if (exactMatch) {
              BattleNotifications.showPlayerWaiting({
                teamSize: exactMatch.teamSize,
                speed: exactMatch.speed,
              });
            } else {
              // There are mismatched players waiting
              gameSounds.play("menuNavigate");
            }
          }
        });
      } catch (err) {
        console.error("Failed to join lobby:", err);
      }
    };

    if (isConnected) {
      joinLobby();
    }

    // Cleanup on unmount
    return () => {
      if (room) {
        room.leave();
      }
      if (lobbyRoom) {
        lobbyRoom.leave();
      }
    };
  }, [isConnected]);

  const findMatch = async () => {
    if (!client || !isConnected || !address) {
      setError("Please connect your wallet first");
      return;
    }

    // Check if team exists
    const teamKey = `roboto_rumble_team_${settings.teamSize}`;
    const savedTeam = localStorage.getItem(teamKey);

    if (!savedTeam || savedTeam === "[]") {
      gameSounds.play("cancel");
      setError("Please build your team first!");
      setTimeout(() => {
        router.push("/team-builder");
      }, 1500);
      return;
    }

    try {
      setStatus("searching");
      setError(null);
      gameSounds.play("menuNavigate");

      // Try to join or create a room
      let joinedRoom: Room | null = null;

      setStatus("joining");

      // Notify lobby that we're looking for a match
      if (lobbyRoom) {
        lobbyRoom.send("start-waiting", {
          address: address,
          name: `Player ${address.slice(0, 6)}`,
          teamSize: settings.teamSize,
          speed: settings.speed,
        });
      }

      // Use joinOrCreate which will automatically handle room creation
      try {
        joinedRoom = await client.joinOrCreate("pvp_battle", {
          address: address,
          name: `Player ${address.slice(0, 6)}`,
          team: JSON.parse(savedTeam),
          teamSize: settings.teamSize,
          speed: settings.speed,
        });
      } catch (joinError) {
        console.error("Failed to join/create room:", joinError);
        throw joinError;
      }

      setRoom(joinedRoom);
      setStatus("connected");

      // Notify lobby that we're now in a match
      if (lobbyRoom) {
        lobbyRoom.send("stop-waiting");
      }

      // Handle settings mismatch
      joinedRoom.onMessage("settings-mismatch", (data) => {
        setOpponentSettings(data.opponentSettings);
        setShowProposalModal(true);
        gameSounds.play("notification");
      });

      // Handle settings accepted
      joinedRoom.onMessage("settings-accepted", (data) => {
        gameSounds.play("confirm");
        setShowProposalModal(false);
        // Settings were accepted, wait for match to start
      });

      // Handle settings proposal
      joinedRoom.onMessage("settings-proposal", (data) => {
        setOpponentSettings(data.settings);
        setShowProposalModal(true);
        gameSounds.play("notification");
      });

      // Set up room event listeners
      joinedRoom.onMessage("match-ready", (message) => {
        console.log("[PvP Client] Match ready received:", message);
        gameSounds.play("confirm");

        // Show notification if tab is not visible
        if (document.visibilityState !== "visible") {
          BattleNotifications.showMatchFound();
        }

        // Set up battle state listener
        let battleInitialized = false;
        
        joinedRoom.onStateChange((state) => {
          console.log("[PvP Client] State change:", {
            status: state.status,
            battleStarted: state.battleStarted,
            battleInitialized,
            turnTimer: state.turnTimer,
            currentTurn: state.currentTurn,
            turnNumber: state.turnNumber
          });
          
          // Only setup battle ONCE when battleStarted is true and we haven't initialized yet
          if (state.status === "battle" && state.battleStarted && !battleInitialized) {
            battleInitialized = true;
            console.log("[PvP Client] Starting battle setup (ONE TIME ONLY)");
            // Build teams from state.units with proper data
            const mySessionId = joinedRoom.sessionId;
            const units = Array.from(state.units);
            const myUnits: BattleUnitV3[] = [];
            const opponentUnits: BattleUnitV3[] = [];
            
            // Load local team data for abilities
            const localTeamData = loadedTeam || [];

            units.forEach((unit: any) => {
              // Find matching unit in saved team data
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

            console.log("[PvP Client] Teams built:", {
              myUnits: myUnits.map(u => ({ id: u.id, name: u.name, abilities: u.abilities })),
              opponentUnits: opponentUnits.map(u => ({ id: u.id, name: u.name }))
            });
            
            setPlayerTeam(myUnits);
            setEnemyTeam(opponentUnits);
            setBattleStarted(true);
            setStatus("battle");
          }
        });
      });

      // Handle turn-start messages
      joinedRoom.onMessage("turn-start", (data) => {
        console.log("[PvP Client] Turn start received:", data);
        setServerTurnEvent({
          unitId: data.unitId,
          playerId: data.playerId,
          timer: data.timer
        });

        if (data.playerId === joinedRoom.sessionId) {
          setIsPlayerTurn(true);
          gameSounds.play("turnStart");
          if (document.visibilityState !== "visible") {
            BattleNotifications.showYourTurn();
          }
        } else {
          setIsPlayerTurn(false);
        }
      });

      // Handle action results
      joinedRoom.onMessage("action-result", (result) => {
        console.log("[PvP Client] Action result received:", result);
        setServerBattleResult(result);
        setOpponentTargetPreview(null); // Clear target preview after action
      });
      
      joinedRoom.onMessage("target-preview", (data) => {
        console.log("[PvP Client] Target preview received:", data);
        setOpponentTargetPreview(data.targetId);
      });

      joinedRoom.onMessage("battle-start", (message) => {
        console.log("[PvP Client] Battle start message:", message);
        gameSounds.play("confirm");
      });

      joinedRoom.onMessage("battle-end", (data) => {
        const won = data.winner === joinedRoom.sessionId;
        gameSounds.play(won ? "victory" : "defeat");
        
        setTimeout(() => {
          setBattleStarted(false);
          setStatus("idle");
          setPlayerTeam([]);
          setEnemyTeam([]);
        }, 5000);
      });

      joinedRoom.onMessage("error", (message) => {
        setError(message.message);
        gameSounds.play("cancel");
      });

      joinedRoom.onLeave(() => {
        setStatus("idle");
        setRoom(null);
      });

      // Send ready signal
      joinedRoom.send("ready");
    } catch (err: any) {
      console.error("Failed to join room:", err);
      const errorMessage = err.message || "Failed to connect to battle server";
      setError(`Connection error: ${errorMessage}`);
      setStatus("idle");
      gameSounds.play("cancel");
    }
  };

  const cancelSearch = () => {
    if (room) {
      room.leave();
      setRoom(null);
    }
    // Notify lobby we stopped waiting
    if (lobbyRoom) {
      lobbyRoom.send("stop-waiting");
    }
    setStatus("idle");
    gameSounds.play("cancel");
  };

  const requestNotificationPermission = async () => {
    const granted = await BattleNotifications.requestPermission();
    setNotificationsEnabled(granted);
    localStorage.setItem("pvp_notifications_asked", "true");

    if (granted) {
      gameSounds.play("confirm");
    }
  };

  const handleAcceptSettings = (acceptedSettings: { teamSize: number; speed: string }) => {
    if (room) {
      room.send("accept-settings", acceptedSettings);
      setShowProposalModal(false);
    }
  };

  const handleProposeSettings = (proposedSettings: { teamSize: number; speed: string }) => {
    if (room) {
      room.send("propose-settings", proposedSettings);
    }
  };

  // Don't render until mounted to avoid hydration issues
  if (!mounted) {
    return (
      <PageLayout>
        <GameHeader title="PvP LOBBY" showBackButton backHref="/battle" />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center py-20">
              <p className="text-green-400">Initializing PvP Arena...</p>
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }

  // Show battle arena when battle starts
  if (battleStarted && playerTeam.length > 0 && enemyTeam.length > 0) {
    return (
      <PageLayout fullScreen>
        <BattleArena
          playerTeam={playerTeam}
          enemyTeam={enemyTeam}
          onBattleEnd={(won) => {
            // Reset state
            setBattleStarted(false);
            setStatus("idle");
            setPlayerTeam([]);
            setEnemyTeam([]);
            if (room) {
              room.leave();
              setRoom(null);
            }
          }}
          isPvP={true}
          serverTimer={room?.state?.turnTimer}
          isPlayerTurn={isPlayerTurn}
          onAction={(action) => {
            console.log("[PvP Client] Sending action:", action);
            if (room) {
              room.send("action", action);
            } else {
              console.error("[PvP Client] No room connection!");
            }
          }}
          onTargetPreview={(targetId) => {
            if (room) {
              room.send("target-preview", { targetId });
            }
          }}
          roomState={serverBattleResult}
          serverTurnEvent={serverTurnEvent}
          opponentTargetPreview={opponentTargetPreview}
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <GameHeader title="PvP LOBBY" showBackButton backHref="/battle" />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Notification Permission Banner */}
          {!notificationsEnabled && isConnected && (
            <Card className="bg-yellow-500/10 border-yellow-500/50 p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-yellow-500" />
                  <div>
                    <p className="text-yellow-500 font-bold">
                      Enable Battle Notifications
                    </p>
                    <p className="text-xs text-yellow-500/80">
                      Get notified when players are looking for matches, even
                      when you&apos;re not on this tab!
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={requestNotificationPermission}
                  className="text-yellow-500 border-yellow-500 hover:bg-yellow-500/10"
                >
                  Enable Notifications
                </Button>
              </div>
            </Card>
          )}

          {/* Connection Status */}
          <div className="mb-6 text-center">
            <div className="flex items-center justify-center gap-2 text-green-400">
              <div
                className={`w-2 h-2 rounded-full ${status === "connected" ? "bg-green-400 animate-pulse" : "bg-gray-600"}`}
              />
              <span className="text-sm uppercase tracking-wider">
                {status === "idle" && "Ready for Battle"}
                {status === "searching" && "Searching for Opponent..."}
                {status === "joining" && "Joining Battle..."}
                {status === "connected" && "Connected - Waiting for Opponent"}
              </span>
            </div>
          </div>

          {/* Main Action Area */}
          <Card className="bg-black/80 border-2 border-green-500 p-8 mb-6">
            <div className="text-center space-y-6">
              {status === "idle" && (
                <>
                  <h2 className="text-2xl text-green-400 mb-4">
                    READY FOR COMBAT?
                  </h2>

                  {/* Show team lineup */}
                  {loadedTeam.length > 0 ? (
                    <div className="mb-4">
                      <div className="flex justify-center gap-3 mb-4">
                        {loadedTeam
                          .slice(0, settings.teamSize)
                          .map((unit, index) => {
                            // Extract ID number from unit.id (e.g., "roboto-1234" -> "1234")
                            const idNumber =
                              unit.id?.replace(/^(roboto|robopet)-/, "") ||
                              "???";
                            return (
                              <div
                                key={index}
                                className="flex flex-col items-center cursor-pointer"
                                onClick={() => {
                                  setLightboxIndex(index);
                                  gameSounds.playClick();
                                }}
                              >
                                <div className="relative group">
                                  <img
                                    src={
                                      unit.imageUrl ||
                                      unit.image ||
                                      "/placeholder-robot.png"
                                    }
                                    alt={unit.name || `Unit ${index + 1}`}
                                    className="w-20 h-20 rounded-lg border-2 border-green-500/50 hover:border-green-400 transition-colors object-cover pixelated"
                                    onError={(e) => {
                                      e.currentTarget.src =
                                        "/placeholder-robot.png";
                                    }}
                                  />
                                </div>
                                <div className="mt-1 bg-black rounded px-2 py-0.5 text-[10px] font-bold text-green-400 border border-green-500/50 whitespace-nowrap">
                                  {idNumber}-{unit.element || "None"}
                                </div>
                              </div>
                            );
                          })}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push("/team-builder")}
                          className="text-green-400 hover:text-green-300 p-1 self-center ml-2"
                          title="Edit Team"
                        >
                          <Edit className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-4">
                      <p className="text-yellow-400 text-sm">
                        No team selected!
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push("/team-builder")}
                        className="mt-2"
                      >
                        Build Your Team
                      </Button>
                    </div>
                  )}

                  {mounted && (
                    <div className="flex justify-center gap-4 mb-3">
                      <div className="text-sm">
                        <span className="text-gray-400">Team Size: </span>
                        <span className="text-green-400">
                          {settings.teamSize}v{settings.teamSize}
                        </span>
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-400">Speed: </span>
                        <span className="text-green-400 uppercase">
                          {settings.speed}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Show waiting players */}
                  {waitingPlayers.length > 0 && (
                    <div className="mb-6 p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
                      <h3 className="text-sm font-bold text-green-400 mb-3">
                        PLAYERS WAITING ({waitingPlayers.length})
                      </h3>
                      <div className="space-y-2">
                        {waitingPlayers.map((player, index) => {
                          const isExactMatch = player.teamSize === settings.teamSize &&
                            player.speed === settings.speed;
                          const teamMismatch = player.teamSize !== settings.teamSize;
                          const speedMismatch = player.speed !== settings.speed;

                          return (
                            <div
                              key={player.id || index}
                              className={`flex items-center justify-between p-2 rounded border ${isExactMatch
                                ? "bg-green-900/30 border-green-500/50"
                                : "bg-yellow-900/20 border-yellow-500/30"
                                }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-full animate-pulse ${isExactMatch ? "bg-green-400" : "bg-yellow-400"
                                  }`} />
                                <span className="text-xs text-white">
                                  {player.name || "Anonymous"}
                                </span>
                              </div>
                              <div className="flex items-center gap-4 text-xs">
                                <span className={teamMismatch ? "text-yellow-400" : "text-green-400"}>
                                  {player.teamSize}v{player.teamSize}
                                </span>
                                <span className={speedMismatch ? "text-yellow-400" : "text-green-400"}>
                                  {player.speed}
                                </span>
                                {!isExactMatch && (
                                  <span className="text-yellow-400 text-[10px]">
                                    MISMATCH
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <Button
                    variant="terminal"
                    size="lg"
                    onClick={findMatch}
                    className="text-xl py-6 px-12"
                    disabled={
                      !isConnected || loadedTeam.length !== settings.teamSize
                    }
                  >
                    <Search className="w-6 h-6 mr-3" />
                    FIND MATCH
                  </Button>

                  {!isConnected && (
                    <p className="text-yellow-500 text-sm mt-4">
                      Connect your wallet to start matchmaking
                    </p>
                  )}
                </>
              )}

              {(status === "searching" ||
                status === "joining" ||
                status === "connected") && (
                  <div className="space-y-6">
                    <div className="flex justify-center">
                      <div className="relative">
                        <Swords className="w-12 h-12 text-green-300 animate-pulse" />
                      </div>
                    </div>

                    <div>
                      <h3 className="text-xl text-green-400 mb-2">
                        {status === "connected"
                          ? "WAITING FOR OPPONENT"
                          : "SEARCHING FOR OPPONENT"}
                      </h3>
                      <p className="text-gray-400 text-sm">
                        Looking for another Roboto holder to battle...
                      </p>
                    </div>

                    {/* Show team lineup while waiting */}
                    {loadedTeam.length > 0 && (
                      <div className="mb-4">
                        <div className="flex items-center justify-center gap-2 mb-3">
                          <span className="text-sm text-gray-400">
                            Your Team:
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              cancelSearch();
                              router.push("/team-builder");
                            }}
                            className="text-green-400 hover:text-green-300 p-1"
                            title="Edit Team"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="flex justify-center gap-2">
                          {loadedTeam
                            .slice(0, settings.teamSize)
                            .map((unit, index) => {
                              // Extract ID number from unit.id (e.g., "roboto-1234" -> "1234")
                              const idNumber =
                                unit.id?.replace(/^(roboto|robopet)-/, "") ||
                                "???";
                              return (
                                <div
                                  key={index}
                                  className="flex flex-col items-center cursor-pointer"
                                  onClick={() => {
                                    setLightboxIndex(index);
                                    gameSounds.playClick();
                                  }}
                                >
                                  <div className="relative">
                                    <img
                                      src={
                                        unit.imageUrl ||
                                        unit.image ||
                                        "/placeholder-robot.png"
                                      }
                                      alt={unit.name || `Unit ${index + 1}`}
                                      className="w-16 h-16 rounded-lg border-2 border-green-500/50 hover:border-green-400 transition-colors object-cover pixelated"
                                      onError={(e) => {
                                        e.currentTarget.src =
                                          "/placeholder-robot.png";
                                      }}
                                    />
                                  </div>
                                  <div className="mt-1 bg-black rounded px-1.5 py-0.5 text-[9px] font-bold text-green-400 border border-green-500/50 whitespace-nowrap">
                                    {idNumber}-{unit.element || "None"}
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}

                    <Button
                      variant="outline"
                      onClick={cancelSearch}
                      className="text-red-400 border-red-400 hover:bg-red-400/10"
                    >
                      CANCEL SEARCH
                    </Button>
                  </div>
                )}

              {error && (
                <div className="bg-red-500/10 border border-red-500 rounded p-4 mt-4">
                  <p className="text-red-400">{error}</p>
                </div>
              )}
            </div>
          </Card>

          {/* Info Cards */}
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="bg-black/60 border border-green-500/30 p-4">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-green-400" />
                <div>
                  <p className="text-xs text-gray-400">ONLINE NOW</p>
                  <p className="text-lg text-green-400">
                    {onlineCount > 0 ? onlineCount : "---"}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="bg-black/60 border border-green-500/30 p-4">
              <div className="flex items-center gap-3">
                <Clock className="w-8 h-8 text-green-400" />
                <div>
                  <p className="text-xs text-gray-400">BATTLE TIMER</p>
                  <p className="text-lg text-green-400">
                    {mounted
                      ? settings.speed === "speedy"
                        ? "5s"
                        : "10s"
                      : "---"}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="bg-black/60 border border-green-500/30 p-4">
              <div className="flex items-center gap-3">
                <Shield className="w-8 h-8 text-green-400" />
                <div>
                  <p className="text-xs text-gray-400">MODE</p>
                  <p className="text-lg text-green-400">CASUAL</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Beta Notice */}
          <div className="mt-8 text-center p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <p className="text-yellow-500 text-sm">
              🚧 PvP MODE IS IN BETA - Report bugs in Discord
            </p>
          </div>
        </div>
      </div>

      {/* Unit Lightbox Dialog */}
      {lightboxIndex !== null && loadedTeam.length > 0 && (
        <UnitLightbox
          units={loadedTeam}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          selectedTeam={loadedTeam}
          maxTeamSize={settings.teamSize}
        />
      )}

      {/* Match Proposal Modal */}
      {showProposalModal && opponentSettings && (
        <MatchProposalModal
          isOpen={showProposalModal}
          onClose={() => {
            setShowProposalModal(false);
            if (room) {
              room.leave();
              setRoom(null);
              setStatus("idle");
            }
          }}
          yourSettings={settings}
          opponentSettings={opponentSettings}
          onAccept={handleAcceptSettings}
          onPropose={handleProposeSettings}
          currentTeamSize={loadedTeam.length}
        />
      )}
    </PageLayout>
  );
}
