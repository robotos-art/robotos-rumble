import config from "@colyseus/tools";
import { PvPBattleRoom } from "./rooms/PvPBattleRoom";
import { LobbyRoom } from "./rooms/LobbyRoom";
import { Encoder } from "@colyseus/schema";
import cors from "cors";

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
    // Enable CORS for all origins
    // Colyseus Cloud handles CORS at the NGINX level, so we need to be permissive here
    app.use(cors({
      origin: true, // Allow all origins
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
      exposedHeaders: ["X-Colyseus-Messages"]
    }));
    
    // Additional headers for Colyseus Cloud
    app.use((req, res, next) => {
      // Ensure headers are set for all responses
      res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
      res.header("Access-Control-Allow-Credentials", "true");
      res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
      res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
      
      // Handle preflight
      if (req.method === "OPTIONS") {
        return res.sendStatus(200);
      }
      
      next();
    });
    
    // Health check endpoint
    app.get("/health", (req, res) => {
      res.json({ status: "ok", timestamp: new Date().toISOString() });
    });
  },

  beforeListen: () => {
    console.log("🤖 Robotos Rumble PvP Server is starting...");
  }
});