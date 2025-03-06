"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { loadThemePreference, saveThemePreference } from "@/lib/db";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
    // Load saved theme preference
    loadThemePreference().then((savedTheme) => {
      if (savedTheme) {
        setTheme(savedTheme);
      }
    });
  }, [setTheme]);

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    saveThemePreference(newTheme);
  };

  if (!mounted) {
    return null;
  }

  return (
    <button
      onClick={() => handleThemeChange(theme === "dark" ? "light" : "dark")}
      className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
      aria-label="Toggle theme"
    >
      {theme === "dark" ? (
        <Sun className="w-5 h-5" />
      ) : (
        <Moon className="w-5 h-5" />
      )}
    </button>
  );
}
