"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { cn } from "../../lib/utils";
import { gameSounds } from "../../lib/sounds/gameSounds";

interface TimingMeterSpinnerProps {
  active: boolean;
  onInput: (score: number) => void;
  showCountdown?: boolean;
  countdown?: number;
  disabled?: boolean;
  className?: string;
  keepVisibleAfterInput?: boolean;
}

export default function TimingMeterSpinner({
  active,
  onInput,
  showCountdown = false,
  countdown = 5,
  disabled = false,
  className,
  keepVisibleAfterInput = false,
}: TimingMeterSpinnerProps) {
  const [rotation, setRotation] = useState(0);
  const [hasInput, setHasInput] = useState(false);
  const [score, setScore] = useState(0);
  const [speedMultiplier, setSpeedMultiplier] = useState(1.0);
  const animationRef = useRef<number>();

  // Reset when becoming active
  useEffect(() => {
    if (active && !hasInput) {
      setRotation(0);
      setHasInput(false);
      setScore(0);
      // Randomize speed: 0.9x to 2.1x (slightly faster range)
      const newSpeed = 0.9 + Math.random() * 1.2;
      setSpeedMultiplier(newSpeed);
    }
  }, [active, hasInput]);

  // Calculate score based on rotation angle
  const calculateScore = useCallback((angle: number) => {
    // Normalize angle to 0-360
    const normalizedAngle = ((angle % 360) + 360) % 360;

    // Perfect zone: 350-10 degrees (top center, 20 degree range)
    if (
      (normalizedAngle >= 350 && normalizedAngle <= 360) ||
      (normalizedAngle >= 0 && normalizedAngle <= 10)
    ) {
      return 1.5; // PERFECT
    }
    // Good zones: 330-350 and 10-30 (40 degree range total)
    else if (
      (normalizedAngle >= 330 && normalizedAngle < 350) ||
      (normalizedAngle > 10 && normalizedAngle <= 30)
    ) {
      return 1.25; // GOOD
    }
    // OK zones: 300-330 and 30-60 (60 degree range total)
    else if (
      (normalizedAngle >= 300 && normalizedAngle < 330) ||
      (normalizedAngle > 30 && normalizedAngle <= 60)
    ) {
      return 1.0; // OK
    }
    // Weak: everything else
    else {
      return 0.8; // WEAK
    }
  }, []);

  // Animate the spinner
  useEffect(() => {
    if (!active || hasInput || disabled) return;

    const animate = () => {
      setRotation((prev) => {
        const baseSpeed = 3; // degrees per frame at 60fps
        const speed = baseSpeed * speedMultiplier;
        return prev + speed;
      });
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [active, hasInput, disabled, speedMultiplier]);

  // Handle input
  const handleInput = useCallback(() => {
    if (hasInput || !active || disabled) return;

    const finalScore = calculateScore(rotation);
    setScore(finalScore);
    setHasInput(true);

    // Play stop sound
    gameSounds.play("spinnerStop");

    // Play timing feedback sound
    if (finalScore >= 1.5) {
      gameSounds.play("timingPerfect");
    } else if (finalScore >= 1.25) {
      gameSounds.play("timingGood");
    } else if (finalScore >= 1.0) {
      gameSounds.play("timingLocked");
    } else {
      gameSounds.play("timingMiss");
    }

    onInput(finalScore);

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  }, [rotation, hasInput, active, disabled, calculateScore, onInput]);

  // Keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === " " || e.key === "Enter") &&
        active &&
        !hasInput &&
        !disabled
      ) {
        e.preventDefault();
        handleInput();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [active, hasInput, disabled, handleInput]);

  // Get score text
  const getScoreText = (s: number) => {
    if (s >= 1.5) return "PERFECT!";
    if (s >= 1.25) return "GOOD!";
    if (s >= 1.0) return "OK";
    return "WEAK";
  };

  // Hide completely if not active and not keeping visible
  if (!active && !keepVisibleAfterInput) return null;
  // Hide if not active and keepVisible is true but no input yet
  if (!active && keepVisibleAfterInput && !hasInput) return null;

  return (
    <motion.div
      className={cn("space-y-2", className)}
      animate={{ opacity: hasInput && keepVisibleAfterInput ? 0.6 : 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-sm font-bold text-green-400">
          SPIN ATTACK
          {hasInput && keepVisibleAfterInput && (
            <span className="ml-2 text-xs text-yellow-400">(LOCKED)</span>
          )}
        </div>
        {showCountdown && countdown > 0 && !hasInput && (
          <div className="text-xl font-bold text-yellow-400">{countdown}s</div>
        )}
      </div>

      {/* Circular Spinner */}
      <div className="flex items-center justify-center">
        <div className="relative w-48 h-48">
          {/* Background circle with gradient zones */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 200">
            <defs>
              {/* Define gradient for the ring */}
              <linearGradient
                id="ringGradient"
                gradientUnits="userSpaceOnUse"
                x1="100"
                y1="0"
                x2="100"
                y2="200"
              >
                <stop
                  offset="0%"
                  stopColor="rgb(34 197 94)"
                  stopOpacity="0.5"
                />
                <stop
                  offset="5%"
                  stopColor="rgb(34 197 94)"
                  stopOpacity="0.5"
                />
                <stop
                  offset="10%"
                  stopColor="rgb(250 204 21)"
                  stopOpacity="0.4"
                />
                <stop
                  offset="15%"
                  stopColor="rgb(250 204 21)"
                  stopOpacity="0.4"
                />
                <stop
                  offset="20%"
                  stopColor="rgb(251 146 60)"
                  stopOpacity="0.3"
                />
                <stop
                  offset="30%"
                  stopColor="rgb(251 146 60)"
                  stopOpacity="0.3"
                />
                <stop
                  offset="40%"
                  stopColor="rgb(239 68 68)"
                  stopOpacity="0.2"
                />
                <stop
                  offset="70%"
                  stopColor="rgb(239 68 68)"
                  stopOpacity="0.2"
                />
                <stop
                  offset="80%"
                  stopColor="rgb(251 146 60)"
                  stopOpacity="0.3"
                />
                <stop
                  offset="85%"
                  stopColor="rgb(250 204 21)"
                  stopOpacity="0.4"
                />
                <stop
                  offset="90%"
                  stopColor="rgb(250 204 21)"
                  stopOpacity="0.4"
                />
                <stop
                  offset="95%"
                  stopColor="rgb(34 197 94)"
                  stopOpacity="0.5"
                />
                <stop
                  offset="100%"
                  stopColor="rgb(34 197 94)"
                  stopOpacity="0.5"
                />
              </linearGradient>
            </defs>

            {/* Main ring with consistent width */}
            <circle
              cx="100"
              cy="100"
              r="80"
              fill="none"
              stroke="url(#ringGradient)"
              strokeWidth="30"
              transform="rotate(-90 100 100)"
            />

            {/* Zone divider lines */}
            <g stroke="rgb(0 0 0 / 0.5)" strokeWidth="1">
              {/* Perfect zone boundaries */}
              <line
                x1="100"
                y1="20"
                x2="100"
                y2="50"
                transform="rotate(10 100 100)"
              />
              <line
                x1="100"
                y1="20"
                x2="100"
                y2="50"
                transform="rotate(-10 100 100)"
              />
              {/* Good zone boundaries */}
              <line
                x1="100"
                y1="20"
                x2="100"
                y2="50"
                transform="rotate(30 100 100)"
              />
              <line
                x1="100"
                y1="20"
                x2="100"
                y2="50"
                transform="rotate(-30 100 100)"
              />
              {/* OK zone boundaries */}
              <line
                x1="100"
                y1="20"
                x2="100"
                y2="50"
                transform="rotate(60 100 100)"
              />
              <line
                x1="100"
                y1="20"
                x2="100"
                y2="50"
                transform="rotate(-60 100 100)"
              />
            </g>

            {/* Center circle */}
            <circle
              cx="100"
              cy="100"
              r="40"
              fill="rgb(31 41 55)"
              stroke="rgb(75 85 99)"
              strokeWidth="2"
            />
          </svg>

          {/* Zone labels */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-[10px] font-bold">
              <div className="absolute top-2 left-1/2 -translate-x-1/2 text-green-400">
                PERFECT
              </div>
              <div className="absolute top-8 left-4 text-yellow-400">GOOD</div>
              <div className="absolute top-8 right-4 text-yellow-400">GOOD</div>
              <div className="absolute top-16 left-0 text-orange-400">OK</div>
              <div className="absolute top-16 right-0 text-orange-400">OK</div>
              <div className="absolute bottom-12 left-1/2 -translate-x-1/2 text-red-400">
                WEAK
              </div>
            </div>
          </div>

          {/* Spinning indicator */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            style={{ transform: `rotate(${rotation}deg)` }}
          >
            <div className="absolute w-1 h-24 -top-2">
              <div
                className={cn(
                  "w-full h-full rounded-full",
                  hasInput
                    ? score >= 1.5
                      ? "bg-green-400"
                      : score >= 1.25
                        ? "bg-yellow-400"
                        : score >= 1.0
                          ? "bg-orange-400"
                          : "bg-red-400"
                    : "bg-white",
                )}
              />
              {/* Round end cap */}
              <div
                className={cn(
                  "absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full",
                  hasInput
                    ? score >= 1.5
                      ? "bg-green-400"
                      : score >= 1.25
                        ? "bg-yellow-400"
                        : score >= 1.0
                          ? "bg-orange-400"
                          : "bg-red-400"
                    : "bg-white",
                )}
              />
            </div>
          </motion.div>

          {/* Center button hint */}
          {!hasInput && (
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="text-xs text-gray-400 font-bold"
              >
                STOP
              </motion.div>
            </div>
          )}
        </div>
      </div>

      {/* Instructions or Result */}
      <div className="text-center">
        {hasInput ? (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={cn(
              "text-lg font-bold",
              score >= 1.5 && "text-green-400",
              score >= 1.25 && score < 1.5 && "text-yellow-400",
              score >= 1.0 && score < 1.25 && "text-orange-400",
              score < 1.0 && "text-red-400",
            )}
          >
            {getScoreText(score)}
            <span className="text-sm">
              {" "}
              {`${(score * 100).toFixed(0)}% power`}
            </span>
          </motion.div>
        ) : (
          <div className="text-sm text-gray-400">
            Press <span className="text-white font-bold">SPACE</span> or{" "}
            <span className="text-white font-bold">ENTER</span> to stop!
          </div>
        )}
      </div>
    </motion.div>
  );
}
