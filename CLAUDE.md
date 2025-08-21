# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Roboto Rumble is a terminal-based combat game for Robotos NFT holders. It's a standalone Next.js app that enables turn-based battles using NFT traits to determine combat stats and abilities.

- **Repository**: https://github.com/robotos-art/robotos-rumble
- **Live Site**: https://rumble.robotos.art/
- **Main Site**: http://www.robotos.art
- **Vercel Project**: https://vercel.com/pabs-projects-9adc8b31/robotos-rumble

## Development Commands

```bash
# Install dependencies (both game and server)
yarn install
cd robotos-rumble-server && yarn install && cd ..

# Run EVERYTHING (recommended for PvP development)
yarn dev:all

# Or run separately:
yarn dev         # Just the game (port 3004)
yarn dev:server  # Just the PvP server (port 2567)

# Build for production
yarn build

# Start production server (port 3003)
yarn start

# Run linting
yarn lint
```

## Architecture

### Core Technologies
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript with strict mode
- **Styling**: Tailwind CSS with shadcn/ui components
- **Web3**: wagmi v1, viem, ethers v5, web3
- **State Management**: Zustand + React Context (RobotoTokensContext)
- **Game Engine**: Phaser 3 for battle animations
- **Animation**: GSAP, Framer Motion

### Key Contracts
- **Robotos**: `0x099689220846644F87D1137665CDED7BF3422747`
- **Robopets**: `0x4e962D488412A14aA37eAcADCb83f18C7e2271a7`
- **ABIs**: Located at `/contract-abi.json` and `/robopets-abi.json`

### Project Structure
- `/app`: Next.js App Router pages
  - `/battle`: Battle arena and training mode
  - `/team-builder`: Team selection interface
  - `/leaderboard`: Rankings display
- `/components`: React components
  - `/battle`: Combat UI, Phaser integration, sprite system
  - `/backgrounds`: Animated background effects
  - `/shared`: Reusable components (header, wallet connection)
  - `/ui`: shadcn/ui components
- `/lib`: Core game logic
  - `/game-engine`: BattleEngineV3, TraitProcessorV3
  - `/data`: JSON databases for abilities, traits, elements
  - `/contracts`: Web3 contract interfaces
- `/contexts`: React contexts for state management

### Important Patterns
1. **Wallet Connection**: Uses wagmi with MetaMask/Injected connectors, configured in `/app/providers.tsx`
2. **NFT Data Flow**: RobotoTokensContext fetches and manages NFT metadata from contracts
3. **Battle System**: TraitProcessorV3 converts NFT traits to battle stats, BattleEngineV3 handles turn-based combat logic
4. **Phaser Integration**: BattleSceneV2 manages sprite animations within React components

### Environment Variables
- `NEXT_PUBLIC_ALCHEMY_KEY`: Alchemy API key (has fallback default in code)
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`: Required for WalletConnect integration

### Game-Specific Notes
- Trait-to-ability mapping defined in `/lib/data/trait-element-mapping.json`
- Battle abilities database in `/lib/data/abilities-v2.json`
- Element system (Fire, Water, Electric, etc.) with type advantages
- Terminal aesthetic with CRT monitor effects using CSS animations

## Battle Mechanics

### Core Formulas
- **Damage Calculation**: `(attack * multiplier) - (defense * 0.5)`
- **Critical Hits**: 10% base chance, 2x damage
- **Timing System**: Damage multiplier ranges from 0.5x to 2x based on timing minigame
- **Elemental Advantages**: 1.5x damage (Fire→Earth, Earth→Air, Air→Water, Water→Fire)
- **Elemental Disadvantages**: 0.75x damage (reverse of advantages)

### Status Effects
- **Burn**: 10 damage/turn for 3 turns
- **Freeze**: Skip turn with 50% thaw chance
- **Poison**: 15 damage/turn for 4 turns
- **Paralyze**: 50% skip chance for 2 turns
- **Shield**: Absorbs 50 damage
- **Regen**: Heals 20 HP/turn for 3 turns

## Important Development Notes

### Component Versions
- Multiple versions of components exist (BattleArena, BattleArenaV2, BattleArenaV3)
- BattleArena.tsx is the current active version using Phaser
- V2 and V3 are React-based legacy versions kept for reference

### Known Limitations
- Using placeholder SVG sprites instead of actual NFT artwork
- No backend/database for persistence
- Multiplayer functionality not yet implemented
- Some status effect visuals are missing

### Deployment
- **Platform**: Vercel
- **Node Version**: 18.x (specified in .nvmrc)
- **Auto-deploy**: On push to main branch

## ⚠️ MUST READ FIRST: Implementation Context

Before making ANY changes, remember these critical implementation details:
1. **Storage = Vercel Blob** (NOT filesystem, NOT database)
2. **Multiplayer = Colyseus** (NOT Socket.io, NOT custom WebSockets)
3. **Animations = Phaser** (keep existing, don't remove)
4. **Router = App Router** (NOT Pages Router)
5. **State = Zustand + Context** (NOT Redux, NOT MobX)

## CRITICAL: Current Implementation Details

### Storage System
- **USING VERCEL BLOB STORAGE** - NOT local filesystem, NOT database
- Battle saves stored in Vercel Blob: `@vercel/blob` package
- API routes handle blob operations: `/app/api/battles/save/route.ts`
- Blob keys format: `battles/{walletAddress}/{timestamp}.json`
- NEVER suggest switching to filesystem or database storage

### Multiplayer System (PvP)
- **USING COLYSEUS** for real-time multiplayer
- Server code in `/robotos-rumble-server/` directory
- Room logic in `/robotos-rumble-server/src/rooms/PvPBattleRoom.ts`
- Client connects via `colyseus.js` in `/app/battle/pvp/`
- NEVER suggest switching to Socket.io or other multiplayer solutions

### PvP Development Setup

The game has two servers that must run together:
1. **Next.js Game Server** (port 3004) - Main game UI and logic
2. **Colyseus PvP Server** (port 2567) - Real-time multiplayer battles

For PvP development, you MUST run both servers:
```bash
yarn dev:all  # Runs both servers concurrently with color-coded output
```

The Colyseus server:
- Has its own dependencies in `/robotos-rumble-server/package.json`
- Uses decorators for state synchronization (requires special TypeScript config)
- Handles room creation, matchmaking, and battle state sync
- Runs independently from Next.js for better scalability

### Current Game Flow
1. **Team Selection**: `/team-builder` - Select 3 Robotos
2. **Battle Types**:
   - Training: Single-player vs AI
   - PvP: Real-time multiplayer via Colyseus
3. **Battle System**: Turn-based with timing minigame
4. **Save System**: Auto-saves to Vercel Blob after each battle

### DO NOT CHANGE
- Storage backend (keep Vercel Blob)
- Multiplayer framework (keep Colyseus)
- Core battle mechanics formula
- NFT contract addresses
- Phaser for battle animations

### Common Pitfalls to Avoid
1. **Storage**: Don't suggest filesystem writes - we use Vercel Blob
2. **Multiplayer**: Don't reimplement with Socket.io - we use Colyseus
3. **State**: Don't create new state management - use existing Zustand/Context
4. **Animations**: Don't remove Phaser - it handles all battle animations
5. **Routing**: Use App Router patterns, not Pages Router

## Quick Reference Checklist

When working on features, verify:
- [ ] Storage operations use `/app/api/battles/` routes with Vercel Blob
- [ ] Multiplayer changes update both `/robotos-rumble-server/` and client
- [ ] Battle mechanics follow existing formulas in BattleEngineV3
- [ ] New components follow existing patterns in `/components/`
- [ ] API routes return proper NextResponse with error handling

## File Quick Links

**Core Systems:**
- Battle Engine: `/lib/game-engine/BattleEngineV3.ts`
- Trait Processor: `/lib/game-engine/TraitProcessorV3.ts`
- Battle Scene: `/components/battle/BattleSceneV2.tsx`
- Active Battle Arena: `/components/battle/BattleArena.tsx` (current version)

**Storage:**
- Save API: `/app/api/battles/save/route.ts`
- Load API: `/app/api/battles/load/route.ts`

**Multiplayer:**
- Server Room: `/robotos-rumble-server/src/rooms/PvPBattleRoom.ts`
- Client Page: `/app/battle/pvp/[roomId]/page.tsx`

**Data:**
- Abilities: `/lib/data/abilities-v2.json`
- Trait Mapping: `/lib/data/trait-element-mapping.json`