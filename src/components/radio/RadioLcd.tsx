import type { CharacterId } from "@/lib/profile/characters";
import { cn } from "../ui/cn";
import { CharacterSprite } from "../profile/CharacterSprite";

/**
 * Where a call is: off, picking what you're up for, finding someone, talking, or dropped. `thanks` is the switch flipped on
 * after you've arrived: no call, just a thank-you. `timeout` is a break after hanging up on too
 * many people in a row: nobody gets connected until it runs out.
 */
export type CallState = "off" | "pick" | "connecting" | "connected" | "lost" | "thanks" | "timeout";

/** The radio introducing you both once a call connects, one LCD page per line it says. */
export type Intro = { me: string; miles: number; page: 0 | 1 };

/** What the radio says to introduce you, line by line (the LCD shows one page per line). */
export const introLines = (me: string, peer: string, miles: number) => [
  `${me}, meet ${peer}. You've got ${miles} ${miles === 1 ? "mile" : "miles"} of road together.`,
  "To start, where are you both headed tonight?",
];

export type RadioLcdProps = {
  state: CallState;
  /** The other person's character, shown like a profile picture while you're connected. */
  peerCharacter: CharacterId;
  /** The other person's username, shown under their character. */
  peer?: string;
  /** Show "Currently connected to" instead of the character. */
  greeting?: boolean;
  /** While greeting: the radio introducing you both, instead of "Currently connected to". */
  intro?: Intro;
  /** Picking: the intent that'll be kept if nothing's pressed. Connecting: what it's looking for. */
  hint?: string;
  /** The other person is talking. */
  speaking?: boolean;
  /** You're taking a break from the call. */
  away?: boolean;
  /** During a hang-up timeout: time left, like "4:59". */
  countdown?: string;
};

/** What the small LCD shows for each radio state. Blank while the radio is off. */
export function RadioLcd({ state, peerCharacter, peer, greeting, intro, hint, speaking, away, countdown }: RadioLcdProps) {
  if (state === "off") return null;
  if (state === "pick") {
    return (
      <LcdText>
        <span className="block">WHAT ARE YOU UP FOR?</span>
        <span className="mt-1 block text-[11px] normal-case">{hint ? `Keeping "${hint}" in 3 s` : "Helps us find your match"}</span>
      </LcdText>
    );
  }
  if (state === "timeout") {
    return (
      <LcdText>
        <span className="block">TOO MANY HANG-UPS</span>
        <span className="mt-1 block text-[11px] normal-case">Back on air in</span>
        <span className="block text-[20px]">{countdown}</span>
      </LcdText>
    );
  }
  if (state === "connecting") {
    return (
      <LcdText>
        CONNECTING
        <span aria-hidden className="lcd-dots">
          <span>.</span>
          <span>.</span>
          <span>.</span>
        </span>
        {hint && <span className="mt-1 block text-[11px] normal-case">{hint}</span>}
      </LcdText>
    );
  }
  if (state === "lost") return <LcdText>CONNECTION LOST</LcdText>;
  // Copy is Jennifer's own wording until it's checked against the copy doc.
  if (state === "thanks") return <LcdText>THANK YOU SO MUCH FOR RIDING WITH US</LcdText>;
  if (greeting && intro) {
    return intro.page === 0 ? (
      <LcdText>
        <span className="flex items-center gap-1.5 text-left">
          <CharacterSprite character={peerCharacter} pixel={2.3} playing={false} className="shrink-0" />
          <span>
            <span className="block text-[10px]">{intro.me}, meet</span>
            <span className="block text-[15px]">{peer}</span>
            <span className="mt-1 block text-[10px]">
              {intro.miles} {intro.miles === 1 ? "mile" : "miles"} of road together
            </span>
          </span>
        </span>
      </LcdText>
    ) : (
      <LcdText>
        <span className="flex items-center gap-1.5 text-left">
          <CharacterSprite character={peerCharacter} pixel={2.3} playing={false} className="shrink-0" />
          <span>
            <span className="block text-[10px]">To start,</span>
            <span className="mt-0.5 block text-[12px]">where are you both headed tonight?</span>
          </span>
        </span>
      </LcdText>
    );
  }
  if (greeting) {
    return (
      <LcdText>
        <span className="block text-[11px]">CURRENTLY CONNECTED TO</span>
        <span className="mt-1 block text-[16px]">{peer}</span>
      </LcdText>
    );
  }
  if (away) {
    return (
      <LcdText>
        <span className="block">ON A BREAK</span>
        <span className="mt-1 block text-[11px] normal-case">{peer} knows you&apos;re away</span>
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
      <figcaption className="font-mono text-[11px] leading-none">{peer}</figcaption>
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
