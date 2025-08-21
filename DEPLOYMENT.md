# Deployment Guide for Robotos Rumble PvP

## Overview

The PvP feature requires deploying two components:
1. **Main Game App** (Next.js) - Already on Vercel
2. **PvP Server** (Colyseus) - Needs separate deployment

## Step 1: Deploy the PvP Server

### Using Railway (Recommended - Free tier available)

1. **Prepare the server code**:
   ```bash
   cd robotos-rumble-server
   git init
   git add .
   git commit -m "Initial PvP server"
   ```

2. **Deploy to Railway**:
   - Go to [railway.app](https://railway.app)
   - Create new project → Deploy from GitHub repo
   - Select your repository
   - Railway will auto-detect Node.js and deploy

3. **Configure environment**:
   - In Railway dashboard, go to Variables
   - Add: `CORS_ORIGIN` = `https://rumble.robotos.art`
   - Railway provides the URL automatically

4. **Get your server URL**:
   - In Railway dashboard, go to Settings → Domains
   - Copy the generated URL (e.g., `robotos-pvp.railway.app`)

## Step 2: Update Main App Configuration

1. **Add environment variable in Vercel**:
   - Go to your Vercel project settings
   - Environment Variables → Add new
   - Name: `NEXT_PUBLIC_COLYSEUS_URL`
   - Value: `wss://your-server.railway.app` (use your Railway URL)
   - Apply to: Production, Preview, Development

2. **Redeploy the main app**:
   - Vercel will automatically redeploy when you push changes
   - Or manually trigger a redeployment in Vercel dashboard

## Step 3: Test the Deployment

### Basic Connection Test
1. Open the game at https://rumble.robotos.art
2. Navigate to Battle → VS PLAYER
3. Check browser console for any WebSocket errors
4. Try to find a match

### Full Flow Test
1. Open two browser windows (use incognito for one)
2. Connect different wallets in each
3. Both select VS PLAYER mode
4. Both click FIND MATCH
5. Verify they connect and battle starts

## Monitoring

### Server Health Check
- Visit: `https://your-server.railway.app/health`
- Should return: `{ "status": "ok" }`

### Railway Logs
- In Railway dashboard → Logs tab
- Monitor for connection errors or crashes

### Client-Side Errors
- Check browser console for WebSocket errors
- Common issues:
  - CORS errors → Check `CORS_ORIGIN` setting
  - Connection refused → Server not running
  - 404 errors → Wrong server URL

## Troubleshooting

### "Connection Failed" Error
1. Check if server is running (health endpoint)
2. Verify `NEXT_PUBLIC_COLYSEUS_URL` is correct
3. Ensure it uses `wss://` for HTTPS sites
4. Check CORS settings match your domain

### Players Can't Find Each Other
1. Verify both players have same settings (3v3 vs 5v5)
2. Check server logs for room creation
3. Ensure WebSocket connection is stable

### Battle Gets Stuck
1. Check browser console for errors
2. Monitor server logs for state sync issues
3. Verify both players have stable internet

## Rollback Plan

If PvP needs to be disabled:
1. Remove the "VS PLAYER" button by setting a feature flag
2. Or display a maintenance message in the PvP lobby
3. Server can be stopped without affecting main game

## Cost Considerations

- **Railway**: Free tier includes 500 hours/month
- **Fly.io**: Free tier with 3 shared VMs
- **Render**: Free tier with spin-down after 15 min inactivity

For production with many concurrent players, consider upgrading to paid tier (~$5-20/month).

## Next Steps After Deployment

1. Monitor for 24 hours for stability
2. Add error tracking (Sentry)
3. Implement match history persistence
4. Add reconnection support
5. Consider adding multiple server regions