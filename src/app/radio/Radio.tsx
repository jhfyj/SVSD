"use client";

import { useRouter } from "next/navigation";
import { RadioIntro, RadioScreen } from "@/components/radio";

/** The radio with the app's navigation wired in, so RadioScreen itself stays router-free for Storybook. */
export function Radio() {
  const router = useRouter();
  return (
    <RadioIntro>
      <RadioScreen onPower={() => router.push("/")} onSettings={() => router.push("/profile?settings=1")} />
    </RadioIntro>
  );
}
