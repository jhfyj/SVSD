import type { CharacterId } from "@/lib/profile/characters";
import { CharacterSprite } from "../profile/CharacterSprite";

/** Where a call is: off, finding someone, talking, or dropped. */
export type CallState = "off" | "connecting" | "connected" | "lost";

export type RadioLcdProps = {
  state: CallState;
  character: CharacterId;
  /** The person you're connected to, shown briefly when the call comes through. */
  peer?: string;
  /** Show "Currently connected to" instead of the character. */
  greeting?: boolean;
};

/** What the small LCD shows for each radio state (Figma "Connecting", node 154:1263). */
export function RadioLcd({ state, character, peer, greeting }: RadioLcdProps) {
  if (state === "connecting") {
    return (
      <>
        <Static />
        <LcdText>CONNECTING...</LcdText>
      </>
    );
  }
  if (state === "lost") return <LcdText>CONNECTION LOST</LcdText>;
  if (state === "connected" && greeting) {
    return (
      <LcdText>
        <span className="block text-[11px]">CURRENTLY CONNECTED TO</span>
        <span className="mt-1 block text-[16px]">{peer}</span>
      </LcdText>
    );
  }
  // The account's own character, swapping its two frames like on Customize profile.
  return <CharacterSprite character={character} pixel={6.5} className="text-lcd-ink" />;
}

function LcdText({ children }: { children: React.ReactNode }) {
  return (
    <p role="status" className="relative bg-lcd px-1.5 text-center font-mono text-[14px] uppercase leading-tight text-lcd-ink">
      {children}
    </p>
  );
}

/* Radio static: two frames of random LCD pixels that swap, like a set between stations. */
const COLS = 56;
const ROWS = 33;

/** A fixed seed so the server and the browser draw the same pixels. */
function noise(seed: number) {
  let s = seed;
  const rand = () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
  const rects: Array<[number, number]> = [];
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (rand() < 0.28) rects.push([x, y]);
  return rects;
}
const FRAMES = [noise(7), noise(42)];

function Static() {
  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${COLS} ${ROWS}`}
      preserveAspectRatio="none"
      shapeRendering="crispEdges"
      className="static-play absolute inset-0 size-full fill-lcd-ink opacity-50"
    >
      {FRAMES.map((rects, f) => (
        <g key={f} className={f === 0 ? "sprite-a" : "sprite-b"}>
          {rects.map(([x, y]) => (
            <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} />
          ))}
        </g>
      ))}
    </svg>
  );
}
