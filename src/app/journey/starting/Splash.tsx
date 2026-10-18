"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";
import { StartingRadio } from "@/components/journey";

/** Plays the splash, then opens the radio in place of it. */
export function Splash() {
  const router = useRouter();
  useEffect(() => router.prefetch("/radio"), [router]);
  const open = useCallback(() => router.replace("/radio"), [router]);
  return <StartingRadio onDone={open} />;
}
