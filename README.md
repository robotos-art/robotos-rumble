# 🎮 ROBOTO RUMBLE

Terminal-based combat game for Robotos NFT holders.

## Features

- **Terminal Aesthetics**: Retro CRT monitor style with scanlines and phosphor glow
- **Trait-Based Combat**: Your NFT traits determine battle stats and abilities
- **Team Building**: Assemble squads of 5 units (mix Robotos and Robopets)
- **Turn-Based Battles**: Strategic combat with energy management and cooldowns

## Getting Started

```bash
# Install dependencies
yarn install

# Run development server
yarn dev

# Open http://localhost:3004
```

## How It Works

1. **Connect Wallet**: Links to your Ethereum wallet to load your NFTs
2. **Team Builder**: Select up to 5 units for your combat squad
3. **Battle**: Turn-based combat using abilities derived from NFT traits

## Trait System

NFT traits are converted to battle stats:

- **Tank Body**: +50 HP, +30 Defense, -20 Speed
- **Laser Eyes**: Grants "Laser Burst" ability
- **Ancient Markings**: Regeneration passive ability
- **Wheels**: +40 Speed, -10 Defense

## Tech Stack

- Next.js 14
- TypeScript
- Tailwind CSS
- shadcn/ui components
- Web3/Wagmi for blockchain interaction
- Socket.io (for future PvP)

## Game Modes

- **Training Mode**: Battle against AI opponents (Available)
- **Live Combat**: Real-time PvP battles (Coming Soon)
- **Tournaments**: Scheduled competitive events (Coming Soon)

## Development

The game is built as a standalone Next.js app that shares contract interfaces with the main Robotos website.