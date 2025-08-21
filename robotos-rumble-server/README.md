# Robotos Rumble PvP Server

Colyseus-based multiplayer server for Robotos Rumble PvP battles.

## Local Development

```bash
# Install dependencies
yarn install

# Run development server
yarn dev
```

Server runs on http://localhost:2567

## Production Deployment

### Option 1: Railway (Recommended)

1. Push this folder to a GitHub repository
2. Connect Railway to your GitHub repo
3. Set environment variables in Railway:
   - `PORT`: 2567 (or leave empty for Railway to assign)
   - `NODE_ENV`: production
   - `CORS_ORIGIN`: https://rumble.robotos.art

### Option 2: Fly.io

1. Install Fly CLI: `brew install flyctl`
2. Create app: `fly launch`
3. Deploy: `fly deploy`

### Option 3: Render

1. Create a new Web Service on Render
2. Connect your GitHub repo
3. Build Command: `yarn install && yarn build`
4. Start Command: `yarn start`

## Environment Variables

- `PORT`: Server port (default: 2567)
- `NODE_ENV`: Environment (development/production)
- `CORS_ORIGIN`: Allowed origin for CORS

## Architecture

- **Lobby Room**: Tracks online players and waiting status
- **PvP Battle Room**: Manages individual battle sessions
- **Schema**: Syncs game state between players

## Testing

After deployment, update your main app's `NEXT_PUBLIC_COLYSEUS_URL` to point to:
- Railway: `wss://your-app.railway.app`
- Fly.io: `wss://your-app.fly.dev`
- Render: `wss://your-app.onrender.com`