"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../lib/utils";

interface AttackAnimationProps {
  active: boolean;
  type: "normal" | "critical" | "effective" | "weak" | "miss";
  position?: { x: number; y: number };
  unitId?: string;
  onComplete?: () => void;
}

export default function AttackAnimation({
  active,
  type,
  position,
  unitId,
  onComplete,
}: AttackAnimationProps) {
  const [showExplosion, setShowExplosion] = useState(false);
  const [dynamicPosition, setDynamicPosition] = useState({ x: 0, y: 0 });

  // Function to get unit position dynamically
  const getUnitPosition = (id: string): { x: number; y: number } => {
    const wrapper = document.querySelector(`[data-unit-id="${id}"]`);
    if (wrapper) {
      // Look for the image container which has the actual Roboto
      const imageContainer = wrapper.querySelector(".roboto-image-container");
      const element = imageContainer || wrapper;

      const rect = element.getBoundingClientRect();
      return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
    }
    return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  };

  // Update position when active or unitId changes
  useEffect(() => {
    if (active && unitId) {
      // Get initial position
      const pos = getUnitPosition(unitId);
      setDynamicPosition(pos);

      // Update position multiple times to ensure accuracy
      const updatePosition = () => {
        const newPos = getUnitPosition(unitId);
        setDynamicPosition(newPos);
      };

      // Update after a short delay to account for DOM updates
      const timer1 = setTimeout(updatePosition, 50);
      const timer2 = setTimeout(updatePosition, 100);
      const timer3 = setTimeout(updatePosition, 150);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
      };
    }
  }, [active, unitId]);

  useEffect(() => {
    if (active && type !== "miss") {
      // Trigger explosion after a short delay for impact effect
      const timer = setTimeout(() => {
        setShowExplosion(true);
      }, 100);

      // Complete animation after explosion
      const completeTimer = setTimeout(() => {
        setShowExplosion(false);
        onComplete?.();
      }, 1500);

      return () => {
        clearTimeout(timer);
        clearTimeout(completeTimer);
      };
    } else if (active && type === "miss") {
      // For miss, just complete quickly
      const timer = setTimeout(() => {
        onComplete?.();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [active, type, onComplete]);

  if (!active) return null;

  // Use dynamic position if unitId is provided, otherwise use provided position
  const explosionPosition = unitId
    ? dynamicPosition
    : position || { x: window.innerWidth / 2, y: window.innerHeight / 2 };

  // Get explosion size and color based on attack type
  const getExplosionProps = () => {
    switch (type) {
      case "critical":
        return {
          size: 250,
          color: "bg-red-500",
          particles: 20,
          spread: 150,
        };
      case "effective":
        return {
          size: 200,
          color: "bg-green-400",
          particles: 16,
          spread: 120,
        };
      case "weak":
        return {
          size: 150,
          color: "bg-orange-400",
          particles: 12,
          spread: 80,
        };
      case "normal":
      default:
        return {
          size: 180,
          color: "bg-yellow-400",
          particles: 14,
          spread: 100,
        };
    }
  };

  const explosionProps = getExplosionProps();

  // Generate random particles for explosion
  const particles = Array.from({ length: explosionProps.particles }, (_, i) => {
    const angle = (i / explosionProps.particles) * Math.PI * 2;
    const distance = explosionProps.spread + Math.random() * 50;
    return {
      id: i,
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      size: 4 + Math.random() * 8,
      delay: Math.random() * 0.1,
    };
  });

  return (
    <AnimatePresence>
      {active && (
        <div
          className="fixed pointer-events-none z-50"
          style={{
            left: explosionPosition.x,
            top: explosionPosition.y,
            transform: "translate(-50%, -50%)",
          }}
        >
          {/* Impact flash */}
          {type !== "miss" && showExplosion && (
            <>
              {/* Central flash */}
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: [0, 1, 0], scale: [0.5, 2.5, 3] }}
                transition={{ duration: 0.4 }}
                className={cn(
                  "absolute rounded-full blur-xl",
                  type === "critical" && "bg-red-500",
                  type === "effective" && "bg-green-400",
                  type === "weak" && "bg-orange-400",
                  type === "normal" && "bg-yellow-400",
                )}
                style={{
                  width: explosionProps.size,
                  height: explosionProps.size,
                  left: "50%",
                  top: "50%",
                  transform: "translate(-50%, -50%)",
                }}
              />

              {/* Shockwave ring */}
              <motion.div
                initial={{ opacity: 1, scale: 0.2 }}
                animate={{ opacity: [1, 0], scale: [0.2, 2] }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className={cn(
                  "absolute rounded-full border-4",
                  type === "critical" && "border-red-500",
                  type === "effective" && "border-green-400",
                  type === "weak" && "border-orange-400",
                  type === "normal" && "border-yellow-400",
                )}
                style={{
                  width: explosionProps.size * 1.5,
                  height: explosionProps.size * 1.5,
                  left: "50%",
                  top: "50%",
                  transform: "translate(-50%, -50%)",
                }}
              />

              {/* Particle effects */}
              {particles.map((particle) => (
                <motion.div
                  key={particle.id}
                  initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                  animate={{
                    x: particle.x,
                    y: particle.y,
                    opacity: [1, 1, 0],
                    scale: [1, 0.5, 0],
                  }}
                  transition={{
                    duration: 0.8,
                    delay: particle.delay,
                    ease: "easeOut",
                  }}
                  className={cn("absolute rounded-full", explosionProps.color)}
                  style={{
                    width: particle.size,
                    height: particle.size,
                    left: "50%",
                    top: "50%",
                    transform: "translate(-50%, -50%)",
                  }}
                />
              ))}

              {/* Secondary particles */}
              {particles.slice(0, 8).map((particle, i) => (
                <motion.div
                  key={`secondary-${i}`}
                  initial={{ x: 0, y: 0, opacity: 0.8 }}
                  animate={{
                    x: particle.x * 0.6,
                    y: particle.y * 0.6,
                    opacity: [0.8, 0],
                    scale: [1.5, 0],
                  }}
                  transition={{
                    duration: 0.5,
                    delay: particle.delay + 0.1,
                    ease: "easeOut",
                  }}
                  className={cn(
                    "absolute rounded-full blur-sm",
                    explosionProps.color,
                  )}
                  style={{
                    width: particle.size * 2,
                    height: particle.size * 2,
                    left: "50%",
                    top: "50%",
                    transform: "translate(-50%, -50%)",
                  }}
                />
              ))}
            </>
          )}

          {/* Miss indicator */}
          {type === "miss" && (
            <motion.div
              initial={{ opacity: 0, y: 0, x: 0 }}
              animate={{
                opacity: [0, 1, 1, 0],
                y: [0, -10, -20, -30],
                x: [0, 10, -10, 0],
              }}
              transition={{ duration: 0.5 }}
              className="text-2xl font-bold text-gray-400"
            >
              MISS!
            </motion.div>
          )}
        </div>
      )}
    </AnimatePresence>
  );
}
