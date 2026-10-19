"use client";

import { Flag, GearSix } from "@phosphor-icons/react";
import { useState } from "react";
import type { CharacterId } from "@/lib/profile/characters";
import { TopBar } from "../journey/TopBar";
import { SoundToggle } from "../sound/SoundToggle";
import { MenuRow } from "../ui/MenuRow";
import { TabBar } from "../ui/TabBar";
import { CharacterSprite } from "./CharacterSprite";
import { ScrambleText } from "@/components/ui/ScrambleText";

export type ProfileViewProps = {
  handle: string;
  /** The account's LCD pet; Freddie when left out. */
  character?: CharacterId;
  /** Tapping the avatar opens Customize profile. */
  onEditCharacter?: () => void;
  joinedAt: Date;
  onSettings?: () => void;
  onReport?: () => void;
  onSignOut?: () => void;
  onDeleteAccount?: () => void;
};

const monthYear = (d: Date) => d.toLocaleDateString("en-US", { month: "long", year: "numeric" });

/**
 * Profile (Figma node 123:541): avatar, then the account: Settings, Report, Sound, sign out and
 * delete. Total calls, the activities calendar and history live on the History tab.
 */
export function ProfileView({
  handle,
  character = "raccoon",
  onEditCharacter,
  joinedAt,
  onSettings,
  onReport,
  onSignOut,
  onDeleteAccount,
}: ProfileViewProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="grain flex min-h-dvh w-full max-w-[393px] flex-col bg-background text-foreground">
      <TopBar />
      <div className="flex flex-1 flex-col px-11 pb-14 pt-[79px]">
        <div className="flex flex-col items-center">
          <button
            type="button"
            onClick={onEditCharacter}
            disabled={!onEditCharacter}
            aria-label="Change character"
            className="relative flex size-[106px] items-center justify-center overflow-hidden rounded-full bg-lcd text-lcd-ink shadow-[var(--lcd-inset)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
          >
            <CharacterSprite character={character} pixel={4.4} className="opacity-80" />
          </button>
          <h1 className="mt-[18px] text-xl"><ScrambleText>{handle}</ScrambleText></h1>
          <p className="mt-1 text-base text-foreground/70">Joined {monthYear(joinedAt)}</p>
        </div>

        <div className="mt-[37px] flex flex-col gap-[17px]">
          <MenuRow icon={<GearSix size={16} aria-hidden />} label="Settings" onClick={onSettings} />
          <MenuRow icon={<Flag size={16} aria-hidden />} label="Report" onClick={onReport} />
          <SoundToggle />
        </div>

        <div className="mt-[19px] flex flex-col items-start gap-2 text-xs">
          <button type="button" onClick={onSignOut} className="text-foreground/70 underline-offset-4 hover:underline">
            SIGN OUT
          </button>
          <button
            type="button"
            onClick={() => (confirmDelete ? onDeleteAccount?.() : setConfirmDelete(true))}
            onBlur={() => setConfirmDelete(false)}
            data-cuelume-tap={confirmDelete ? "close" : "attention"}
            data-cuelume-emphasis={confirmDelete ? "strong" : undefined}
            className="text-danger underline-offset-4 hover:underline"
          >
            {confirmDelete ? "TAP AGAIN TO DELETE YOUR ACCOUNT" : "DELETE ACCOUNT"}
          </button>
        </div>
      </div>
      <TabBar current="profile" />
    </div>
  );
}
