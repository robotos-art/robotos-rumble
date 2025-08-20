import { Server } from "@colyseus/core"
import { WebSocketTransport } from "@colyseus/ws-transport"
import express from "express"
import cors from "cors"
import { PvPBattleRoom } from "./rooms/PvPBattleRoom"
import { LobbyRoom } from "./rooms/LobbyRoom"

const port = Number(process.env.PORT) || 2567

const app = express()
app.use(cors())
app.use(express.json())

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() })
})

// Create Colyseus server
const gameServer = new Server({
  transport: new WebSocketTransport({
    server: app.listen(port)
  })
})

// Register room handlers
gameServer.define("pvp_battle", PvPBattleRoom)
  .filterBy(["teamSize", "speed"]) // Allow filtering by battle settings

// Register lobby room for tracking waiting players
gameServer.define("lobby", LobbyRoom)

console.log(`🤖 Robotos Rumble PvP Server is running on port ${port}`)
console.log(`🏥 Health: http://localhost:${port}/health`)