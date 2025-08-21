"use client";

import { useEffect } from "react";
import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();

  useEffect(() => {
    if (!isConnected || !address) {
      router.push("/");
      return;
    }

    // Redirect to the dynamic profile page
    router.push(`/profile/${address}`);
  }, [address, isConnected, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="terminal-text animate-pulse">REDIRECTING...</div>
    </div>
  );
}
