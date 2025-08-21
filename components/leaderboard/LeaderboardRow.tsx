"use client";

import Link from "next/link";
import { Trophy, User } from "lucide-react";
import { useEnsName } from "wagmi";
import { formatAddress } from "../../lib/utils/address";
import { gameSounds } from "../../lib/sounds/gameSounds";
import type { LeaderboardEntry } from "../../lib/storage/types";

interface LeaderboardRowProps {
  entry: LeaderboardEntry;
  index: number;
}

export function LeaderboardRow({ entry, index }: LeaderboardRowProps) {
  // Fetch ENS name client-side
  const { data: ensName } = useEnsName({
    address: entry.address as `0x${string}`,
    chainId: 1,
  });

  // Use the fetched ENS name, fallback to stored ENS, then display name, then address
  const displayName =
    ensName ||
    entry.ensName ||
    entry.displayName ||
    formatAddress(entry.address, "medium");

  return (
    <tr
      className="border-b border-green-500/10 hover:bg-green-500/5 transition-colors cursor-pointer"
      onMouseEnter={() => gameSounds.playHover()}
      onClick={() => gameSounds.playClick()}
    >
      <td className="p-4">
        <div className="flex items-center gap-2">
          {index === 0 && <Trophy className="w-5 h-5 text-yellow-500" />}
          {index === 1 && <Trophy className="w-5 h-5 text-gray-400" />}
          {index === 2 && <Trophy className="w-5 h-5 text-orange-600" />}
          <span className="font-mono text-lg">#{index + 1}</span>
        </div>
      </td>
      <td className="p-4 font-mono">
        <Link
          href={`/profile/${entry.address}`}
          className="flex items-center gap-3 hover:underline"
        >
          {/* Avatar */}
          <div className="flex-shrink-0">
            {entry.avatar ? (
              <img
                src={
                  entry.avatar.type === "roboto"
                    ? `https://d2lp2vbc3umjmr.cloudfront.net/${entry.avatar.tokenId}/roboto-transparent.png`
                    : entry.avatar.imageUrl || ""
                }
                alt="Avatar"
                className="w-10 h-10 rounded border border-green-500/30"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = "none";
                  const fallback = target.nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = "flex";
                }}
              />
            ) : null}
            <div
              className="w-10 h-10 rounded border border-green-500/30 bg-green-500/10 items-center justify-center"
              style={{ display: entry.avatar ? "none" : "flex" }}
            >
              <User className="w-5 h-5 text-green-500/50" />
            </div>
          </div>
          {/* Name */}
          <div className="flex flex-col">
            <span className="text-green-400">{displayName}</span>
            <span className="text-xs text-gray-500">
              {formatAddress(entry.address, "short")}
            </span>
          </div>
        </Link>
      </td>
      <td className="p-4 text-center font-mono text-green-400">{entry.wins}</td>
      <td className="p-4 text-center font-mono text-red-400">{entry.losses}</td>
      <td className="p-4 text-center font-mono">{entry.winRate.toFixed(1)}%</td>
      <td className="p-4 text-center">
        {entry.favoriteElement && (
          <span className="font-mono text-green-400">
            {entry.favoriteElement}
          </span>
        )}
      </td>
    </tr>
  );
}
