"use client";

import { cn } from "../../lib/utils";

interface PageLayoutProps {
  children: React.ReactNode;
  fullScreen?: boolean;
  showGrid?: boolean;
  className?: string;
}

export function PageLayout({
  children,
  fullScreen = false,
  showGrid = false,
  className,
}: PageLayoutProps) {
  return (
    <main
      className={cn(
        fullScreen ? "fixed inset-0" : "min-h-screen",
        "bg-black",
        className,
      )}
    >
      {/* Grid background */}
      {showGrid && (
        <div className="fixed inset-0 opacity-10 pointer-events-none">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(0deg, #00ff00 1px, transparent 1px), linear-gradient(90deg, #00ff00 1px, transparent 1px)",
              backgroundSize: "50px 50px",
            }}
          />
        </div>
      )}

      {/* Content - no padding or max-width constraint, let children handle it */}
      <div className={cn(fullScreen ? "h-full" : "", "relative z-10")}>
        {children}
      </div>
    </main>
  );
}
