import config from "@colyseus/tools";
import { PvPBattleRoom } from "./rooms/PvPBattleRoom";
import { LobbyRoom } from "./rooms/LobbyRoom";
import { Encoder } from "@colyseus/schema";

// Increase buffer size to handle larger battle states
Encoder.BUFFER_SIZE = 16 * 1024; // 16 KB instead of default

export default config({
  getId: () => "robotos_rumble_server",

  initializeGameServer: (gameServer) => {
    // Register room handlers
    gameServer.define("pvp_battle", PvPBattleRoom);
    // No filtering - allow any players to potentially match
    // The room will handle negotiating different settings

    // Register lobby room for tracking waiting players
    gameServer.define("lobby", LobbyRoom);
  },

  initializeExpress: (app) => {
    // Health check endpoint
    app.get("/health", (req, res) => {
      res.json({ status: "ok", timestamp: new Date().toISOString() });
    });
  },

  beforeListen: () => {
    console.log("🤖 Robotos Rumble PvP Server is starting...");
  }
});