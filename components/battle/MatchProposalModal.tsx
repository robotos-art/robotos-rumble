import React from "react";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { X, Users, Clock, AlertCircle } from "lucide-react";
import { gameSounds } from "../../lib/sounds/gameSounds";

interface MatchProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  yourSettings: {
    teamSize: number;
    speed: string;
  };
  opponentSettings: {
    teamSize: number;
    speed: string;
  };
  onAccept: (settings: { teamSize: number; speed: string }) => void;
  onPropose: (settings: { teamSize: number; speed: string }) => void;
  currentTeamSize: number;
}

export function MatchProposalModal({
  isOpen,
  onClose,
  yourSettings,
  opponentSettings,
  onAccept,
  onPropose,
  currentTeamSize,
}: MatchProposalModalProps) {
  if (!isOpen) return null;

  const teamSizeMismatch = yourSettings.teamSize !== opponentSettings.teamSize;
  const speedMismatch = yourSettings.speed !== opponentSettings.speed;
  
  // Determine which is the smaller team size
  const smallerTeamSize = Math.min(yourSettings.teamSize, opponentSettings.teamSize);
  const canUseYourTeam = currentTeamSize >= yourSettings.teamSize;
  const canUseOpponentTeam = currentTeamSize >= opponentSettings.teamSize;
  const canUseSmallerTeam = currentTeamSize >= smallerTeamSize;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="bg-black/95 border-2 border-yellow-500 max-w-lg w-full animate-pulse-border">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-bold text-yellow-400 mb-2">
                MATCH SETTINGS MISMATCH!
              </h2>
              <p className="text-green-400 text-sm">
                Your opponent has different battle preferences
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                gameSounds.play("cancel");
                onClose();
              }}
              className="text-red-500 hover:text-red-400"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Settings Comparison */}
          <div className="space-y-4 mb-6">
            {/* Team Size */}
            {teamSizeMismatch && (
              <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-red-400" />
                  <span className="text-sm font-bold text-red-400">TEAM SIZE MISMATCH</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-green-400">You want:</span>
                    <span className="ml-2 text-white font-bold">
                      {yourSettings.teamSize}v{yourSettings.teamSize}
                    </span>
                  </div>
                  <div>
                    <span className="text-yellow-400">Opponent wants:</span>
                    <span className="ml-2 text-white font-bold">
                      {opponentSettings.teamSize}v{opponentSettings.teamSize}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Speed */}
            {speedMismatch && (
              <div className="bg-orange-900/20 border border-orange-500/50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-orange-400" />
                  <span className="text-sm font-bold text-orange-400">TIMER SPEED MISMATCH</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-green-400">You want:</span>
                    <span className="ml-2 text-white font-bold uppercase">
                      {yourSettings.speed} ({yourSettings.speed === "speedy" ? "5s" : "10s"})
                    </span>
                  </div>
                  <div>
                    <span className="text-yellow-400">Opponent wants:</span>
                    <span className="ml-2 text-white font-bold uppercase">
                      {opponentSettings.speed} ({opponentSettings.speed === "speedy" ? "5s" : "10s"})
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Warning about team size */}
          {teamSizeMismatch && currentTeamSize < opponentSettings.teamSize && (
            <div className="bg-yellow-900/20 border border-yellow-500/50 rounded-lg p-3 mb-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5" />
                <div className="text-xs text-yellow-400">
                  <p className="font-bold mb-1">TEAM SIZE WARNING</p>
                  <p>
                    You only have {currentTeamSize} units selected. 
                    {currentTeamSize < smallerTeamSize && (
                      <span> You need at least {smallerTeamSize} units to play.</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {/* Accept their settings */}
            {canUseOpponentTeam && (
              <Button
                variant="terminal"
                className="w-full bg-yellow-600 hover:bg-yellow-700 text-black"
                onClick={() => {
                  gameSounds.play("confirm");
                  onAccept(opponentSettings);
                }}
              >
                ACCEPT OPPONENT&apos;S SETTINGS
                <span className="ml-2 text-xs opacity-80">
                  ({opponentSettings.teamSize}v{opponentSettings.teamSize} {opponentSettings.speed})
                </span>
              </Button>
            )}

            {/* Propose your settings */}
            {canUseYourTeam && (teamSizeMismatch || speedMismatch) && (
              <Button
                variant="terminal"
                className="w-full bg-green-600 hover:bg-green-700"
                onClick={() => {
                  gameSounds.play("menuNavigate");
                  onPropose(yourSettings);
                }}
              >
                PROPOSE YOUR SETTINGS
                <span className="ml-2 text-xs opacity-80">
                  ({yourSettings.teamSize}v{yourSettings.teamSize} {yourSettings.speed})
                </span>
              </Button>
            )}

            {/* Compromise option - use smaller team size */}
            {teamSizeMismatch && canUseSmallerTeam && smallerTeamSize !== yourSettings.teamSize && (
              <Button
                variant="terminal"
                className="w-full bg-blue-600 hover:bg-blue-700"
                onClick={() => {
                  gameSounds.play("confirm");
                  // Use smaller team size but keep speed preference
                  onAccept({
                    teamSize: smallerTeamSize,
                    speed: speedMismatch ? opponentSettings.speed : yourSettings.speed
                  });
                }}
              >
                COMPROMISE: USE {smallerTeamSize}v{smallerTeamSize}
                <span className="ml-2 text-xs opacity-80">
                  (Both use smaller team)
                </span>
              </Button>
            )}

            {/* Go to team builder if not enough units */}
            {currentTeamSize < smallerTeamSize && (
              <Button
                variant="terminal"
                className="w-full bg-purple-600 hover:bg-purple-700"
                onClick={() => {
                  gameSounds.play("menuNavigate");
                  window.location.href = "/team-builder";
                }}
              >
                GO TO TEAM BUILDER
                <span className="ml-2 text-xs opacity-80">
                  (Need {smallerTeamSize - currentTeamSize} more units)
                </span>
              </Button>
            )}

            {/* Cancel */}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                gameSounds.play("cancel");
                onClose();
              }}
            >
              CANCEL MATCH
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}