"use client";

import { useEffect, useRef, useState } from "react";

import { REACTION_VISIBLE_MS } from "@/lib/config";

/**
 * Returns the emoji to show while a *new* reaction is fresh. Reactions that already existed
 * when the tile mounted are ignored, so we don't depend on client/server clock agreement.
 */
export function useReactionBurst(reaction: string | null, reactionAt: string | null) {
  const [visible, setVisible] = useState<string | null>(null);
  const seen = useRef(reactionAt);

  useEffect(() => {
    if (!reaction || !reactionAt || reactionAt === seen.current) return;
    seen.current = reactionAt;
    setVisible(reaction);
    const timer = window.setTimeout(() => setVisible(null), REACTION_VISIBLE_MS);
    return () => window.clearTimeout(timer);
  }, [reaction, reactionAt]);

  return { emoji: visible, key: reactionAt };
}
