"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle({ className = "", iconSize = 14 }: { className?: string; iconSize?: number }) {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => setMounted(true), []);
  
  if (!mounted) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div style={{ width: iconSize, height: iconSize }} />
      </div>
    );
  }

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className={`flex items-center justify-center transition-colors ${className}`}
      title="Toggle Theme"
      suppressHydrationWarning
    >
      {theme === 'dark' ? <Moon size={iconSize} /> : <Sun size={iconSize} />}
    </button>
  );
}
