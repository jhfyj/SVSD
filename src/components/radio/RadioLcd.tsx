import type { CharacterId } from "@/lib/profile/characters";
import { cn } from "../ui/cn";
import { CharacterSprite } from "../profile/CharacterSprite";

/** Where a call is: off, finding someone, talking, or dropped. */
export type CallState = "off" | "connecting" | "connected" | "lost";

export type RadioLcdProps = {
  state: CallState;
  /** The other person's character, shown like a profile picture while you're connected. */
  peerCharacter: CharacterId;
  /** The other person's username, shown under their character. */
  peer?: string;
  /** Show "Currently connected to" instead of the character. */
  greeting?: boolean;
  /** The other person is talking. */
  speaking?: boolean;
};

/** What the small LCD shows for each radio state. Blank while the radio is off. */
export function RadioLcd({ state, peerCharacter, peer, greeting, speaking }: RadioLcdProps) {
  if (state === "off") return null;
  if (state === "connecting") {
    return (
      <LcdText>
        CONNECTING
        <span aria-hidden className="lcd-dots">
          <span>.</span>
          <span>.</span>
          <span>.</span>
        </span>
      </LcdText>
    );
  }
  if (state === "lost") return <LcdText>CONNECTION LOST</LcdText>;
  if (greeting) {
    return (
      <LcdText>
        <span className="block text-[11px]">CURRENTLY CONNECTED TO</span>
        <span className="mt-1 block text-[16px]">{peer}</span>
      </LcdText>
    );
  }
  return (
    <figure className="flex flex-col items-center gap-1.5 text-lcd-ink">
      <div className="relative">
        {/* Idle: the character's own two frames. Speaking: it hops a pixel and sound waves pulse beside it. */}
        <CharacterSprite character={peerCharacter} pixel={4} className={cn(speaking && "lcd-hop")} />
        <SoundWaves on={!!speaking} />
      </div>
      <figcaption className="font-mono text-[12px] leading-none">{peer}</figcaption>
    </figure>
  );
}

function LcdText({ children }: { children: React.ReactNode }) {
  return (
    <p role="status" className="px-1.5 text-center font-mono text-[14px] uppercase leading-tight text-lcd-ink">
      {children}
    </p>
  );
}

/* Two 5 × 7 frames of pixel arcs: small, then wide. "#" is an inked pixel. */
const WAVES = [
  [".....", "#....", ".#...", ".#...", ".#...", "#....", "....."],
  ["..#..", "#..#.", ".#..#", ".#..#", ".#..#", "#..#.", "..#.."],
];

/** Pixel sound waves that swap between two frames while the other person talks. Hidden when they're quiet. */
function SoundWaves({ on }: { on: boolean }) {
  return (
    <svg
      aria-hidden
      width={5 * 4}
      height={7 * 4}
      viewBox="0 0 5 7"
      shapeRendering="crispEdges"
      fill="currentColor"
      className={cn("sprite-fast absolute left-full top-1/2 ml-1 -translate-y-1/2", !on && "invisible")}
    >
      {WAVES.map((rows, f) => (
        <g key={f} className={f === 0 ? "sprite-a" : "sprite-b"}>
          {rows.flatMap((row, y) =>
            [...row].map((c, x) => (c === "#" ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} /> : null)),
          )}
        </g>
      ))}
    </svg>
  );
}
