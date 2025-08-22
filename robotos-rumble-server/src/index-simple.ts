// Simple test server for Colyseus Cloud
import { listen } from "@colyseus/tools";
import config from "@colyseus/tools";
import { Room, Client } from "@colyseus/core";
import { Schema, type } from "@colyseus/schema";

// Simple test room
class TestState extends Schema {
  @type("string") message = "Hello from Colyseus Cloud!";
}

class TestRoom extends Room<TestState> {
  onCreate() {
    this.setState(new TestState());
    console.log("Test room created!");
  }
  
  onJoin(client: Client) {
    console.log(`Client ${client.sessionId} joined!`);
    this.broadcast("welcome", { message: "Welcome to the test room!" });
  }
}

// Simple config
const app = config({
  initializeGameServer: (gameServer) => {
    gameServer.define("test", TestRoom);
  },

  initializeExpress: (app) => {
    // Enable CORS for all origins
    app.use((req, res, next) => {
      res.header("Access-Control-Allow-Origin", "*");
      res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
      res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
      
      if (req.method === "OPTIONS") {
        return res.sendStatus(200);
      }
      
      next();
    });
    
    app.get("/health", (req, res) => {
      res.json({ status: "ok", test: true });
    });
  },

  beforeListen: () => {
    console.log("🤖 Test server starting on port " + (process.env.PORT || 2567));
  }
});

listen(app);