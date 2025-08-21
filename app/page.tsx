"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "../components/ui/button";
import { Swords, Trophy, Users, User } from "lucide-react";
import { gameSounds } from "../lib/sounds/gameSounds";
import { GameHeader } from "../components/shared/GameHeader";
import { PageLayout } from "../components/shared/PageLayout";
import { useAccount } from "wagmi";

export default function Home() {
  const [bootText, setBootText] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const { isConnected } = useAccount();

  useEffect(() => {
    const fullText = `ROBOTO RUMBLE v1.0.0
INITIALIZING COMBAT PROTOCOLS...
LOADING ANCIENT BATTLE SYSTEMS...
SYNCHRONIZING TRAIT MATRICES...

[OK] SYSTEM READY

PRESS ANY KEY TO CONTINUE`;

    let index = 0;
    const interval = setInterval(() => {
      if (index < fullText.length) {
        setBootText(fullText.slice(0, index + 1));
        index++;
      } else {
        clearInterval(interval);
        setTimeout(() => setShowMenu(true), 500);
      }
    }, 20);

    // Skip boot sequence on click/key press
    const skipBoot = () => {
      clearInterval(interval);
      setShowMenu(true);
      gameSounds.playClick();
    };

    document.addEventListener("click", skipBoot);
    document.addEventListener("keydown", skipBoot);

    return () => {
      clearInterval(interval);
      document.removeEventListener("click", skipBoot);
      document.removeEventListener("keydown", skipBoot);
    };
  }, []);

  if (!showMenu) {
    return (
      <PageLayout>
        <div className="min-h-screen flex items-center justify-center">
          <pre className="text-green-500 glow-sm whitespace-pre font-mono text-sm leading-relaxed">
            {bootText}
            <span className="terminal-cursor" />
          </pre>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      {/* Full width header */}
      <GameHeader />

      {/* Constrained content with better mobile padding */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6 md:py-8 flex-1 flex items-center justify-center">
        <div className="text-center max-w-4xl mx-auto w-full">
          {/* Logo with responsive text */}
          <div
            className="mb-6 sm:mb-8"
            style={{
              perspective: "300px",
            }}
          >
            <div
              className="flex flex-col items-center relative"
              style={{
                transform: "rotateX(30deg)",
                transformOrigin: "center top",
              }}
            >
              {/* Cyber scanlines effect */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-green-500/5 to-transparent animate-scan" />
              </div>

              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-normal mb-2 text-green-300 glow tracking-wider relative">
                {/* Data corruption effect */}
                <span
                  className="absolute inset-0 text-cyan-400/20 animate-glitch-1"
                  aria-hidden="true"
                >
                  ROBOTOS
                </span>
                <span className="relative">ROBOTOS</span>
              </h1>
              <h2
                className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-black text-green-500 relative"
                style={{
                  letterSpacing: "-0.05em",
                  lineHeight: "0.9",
                  textShadow:
                    "0 0 16px rgba(34, 197, 94, 0.8), 0 0 20px rgba(34, 197, 94, 0.4)",
                }}
              >
                {/* Reduced glow and added glitch layers */}
                <span
                  className="absolute inset-0 text-red-500/10 animate-glitch-2"
                  aria-hidden="true"
                >
                  RUMBLE
                </span>
                <span className="relative">RUMBLE</span>
              </h2>

              {/* Digital grid overlay */}
              <div className="absolute inset-0 pointer-events-none opacity-20 z-0">
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage:
                      "linear-gradient(0deg, transparent 24%, rgba(0, 255, 0, .05) 25%, rgba(0, 255, 0, .05) 26%, transparent 27%, transparent 74%, rgba(0, 255, 0, .05) 75%, rgba(0, 255, 0, .05) 76%, transparent 77%, transparent)",
                    backgroundSize: "50px 50px",
                  }}
                />
              </div>
            </div>
          </div>

          <p className="text-green-400 text-sm sm:text-lg mb-8 sm:mb-12 px-4">
            ANCIENT COMBAT PROTOCOL v1.0
          </p>

          {/* Main Menu Buttons */}
          <div className="space-y-6">
            <Link href="/battle">
              <Button
                variant="terminal"
                size="lg"
                className="w-full max-w-sm mx-auto text-lg sm:text-xl py-4 sm:py-6 gap-2 sm:gap-3"
                onClick={() => gameSounds.playConfirm()}
                onMouseEnter={() => gameSounds.playHover()}
              >
                <Swords className="w-6 h-6" />
                BATTLE
              </Button>
            </Link>

            <Button
              variant="terminal"
              size="lg"
              className="w-full max-w-sm mx-auto text-lg sm:text-xl py-4 sm:py-6 gap-2 sm:gap-3 opacity-50 cursor-not-allowed"
              disabled
              onMouseEnter={() => gameSounds.playHover()}
            >
              <Trophy className="w-6 h-6" />
              TOURNAMENT
              <span className="text-sm ml-2">[SOON]</span>
            </Button>

            <Link href="/leaderboard">
              <Button
                variant="terminal"
                size="lg"
                className="w-full max-w-sm mx-auto text-lg sm:text-xl py-4 sm:py-6 gap-2 sm:gap-3"
                onClick={() => gameSounds.playConfirm()}
                onMouseEnter={() => gameSounds.playHover()}
              >
                <Users className="w-6 h-6" />
                LEADERBOARD
              </Button>
            </Link>

            {isConnected && (
              <Link href="/profile">
                <Button
                  variant="terminal"
                  size="lg"
                  className="w-full max-w-sm mx-auto text-lg sm:text-xl py-4 sm:py-6 gap-2 sm:gap-3"
                  onClick={() => gameSounds.playConfirm()}
                  onMouseEnter={() => gameSounds.playHover()}
                >
                  <User className="w-6 h-6" />
                  PROFILE
                </Button>
              </Link>
            )}
          </div>

          {/* Status */}
          <div className="mt-8 sm:mt-12 text-green-400/60 text-xs sm:text-sm space-y-1">
            <p>SYSTEM STATUS: OPERATIONAL</p>
            <p className={isConnected ? "text-green-400" : ""}>
              WALLET: {isConnected ? "CONNECTED" : "NOT CONNECTED"}
            </p>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
