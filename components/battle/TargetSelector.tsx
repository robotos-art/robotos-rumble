"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { Card } from "../ui/card";
import { gameSounds } from "../../lib/sounds/gameSounds";

interface TargetSelectorProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export default function TargetSelector({
  onConfirm,
  onCancel,
}: TargetSelectorProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Enter":
        case " ":
          e.preventDefault();
          onConfirm();
          break;
        case "Escape":
          e.preventDefault();
          onCancel();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onConfirm, onCancel]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="absolute top-4 left-1/2 -translate-x-1/2 z-50"
    >
      <Card className="bg-black/90 border-green-400 px-6 py-3">
        <motion.p
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="text-green-400 text-sm font-mono"
        >
          SELECT TARGET: ↑↓ Navigate | SPACE Confirm | ESC Cancel
        </motion.p>
      </Card>
    </motion.div>
  );
}
