# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Roboto Rumble is a terminal-based combat game for Robotos NFT holders. It's a standalone Next.js app that enables turn-based battles using NFT traits to determine combat stats and abilities.

- **Repository**: https://github.com/robotos-art/robotos-rumble
- **Live Site**: https://rumble.robotos.art/
- **Main Site**: http://www.robotos.art

## Development Commands

```bash
# Install dependencies
yarn install

# Run development server (port 3004)
yarn dev

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