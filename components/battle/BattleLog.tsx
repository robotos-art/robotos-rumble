"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "../ui/card";

interface BattleLogProps {
  events?: Array<{
    type: string;
    description?: string;
    value?: number;
    sourceId?: string;
    targetId?: string;
  }>;
}

export default function BattleLog({ events = [] }: BattleLogProps) {
  const [messages, setMessages] = useState<string[]>([]);

  useEffect(() => {
    if (events.length === 0) return;

    const newMessages = events.map((event) => {
      switch (event.type) {
        case "damage":
          return `${event.description || "Attack"} dealt ${event.value} damage!`;
        case "ability":
          return event.description || "Used ability!";
        case "ko":
          return `${event.description || "Unit"} was defeated!`;
        case "critical":
          return "Critical hit!";
        case "miss":
          return "Attack missed!";
        default:
          return event.description || "Action performed";
      }
    });

    setMessages((prev) => [...newMessages, ...prev].slice(0, 3));
  }, [events]);

  return (
    <Card className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/90 border-green-400 p-4 w-[90%] max-w-2xl">
      <div className="space-y-1 h-20 overflow-hidden">
        <AnimatePresence mode="popLayout">
          {messages.map((message, index) => (
            <motion.div
              key={`${message}-${index}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{
                opacity: index === 0 ? 1 : 0.6 - index * 0.2,
                y: 0,
              }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="text-green-400 text-sm font-mono"
            >
              {">"} {message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Card>
  );
}
