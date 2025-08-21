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
    // CORS configuration
    const corsOptions = {
      origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
        const allowedOrigins = [
          "http://localhost:3000",
          "http://localhost:3004", 
          "https://rumble.robotos.art",
          "https://rumble-preview.vercel.app",
          "https://robotos-rumble.vercel.app"
        ];
        
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) return callback(null, true);
        
        // Check exact matches
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        
        // Check for Vercel preview deployments
        if (origin.match(/https:\/\/robotos-rumble.*\.vercel\.app$/)) {
          return callback(null, true);
        }
        
        // Block everything else
        callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"]
    };
    
    app.use(cors(corsOptions));
    
    // Health check endpoint
    app.get("/health", (req, res) => {
      res.json({ status: "ok", timestamp: new Date().toISOString() });
    });
  },

  beforeListen: () => {
    console.log("🤖 Robotos Rumble PvP Server is starting...");
  }
});