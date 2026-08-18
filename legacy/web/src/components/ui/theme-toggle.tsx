"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

export const ThemeToggle = ({ compact = false }: { compact?: boolean }) => {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const isDark = mounted ? resolvedTheme === "dark" : true;
  const nextTheme = isDark ? "light" : "dark";

  return (
    <Button
      aria-label="Alternar tema"
      onClick={() => setTheme(nextTheme)}
      size="sm"
      variant="secondary"
      type="button"
      className={cn(compact && "w-10 px-0")}
    >
      {isDark ? <Icon name="sun" size="sm" /> : <Icon name="moon" size="sm" />}
      <span className={cn(compact && "sr-only")}>
        {isDark ? "Light" : "Dark"}
      </span>
    </Button>
  );
};
