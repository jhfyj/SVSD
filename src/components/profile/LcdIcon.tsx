import type { CSSProperties, ComponentType, SVGProps } from "react";
import {
  IconBell,
  IconLocation2,
  IconMicrophone,
  IconMsgWriting,
  IconPhone,
  IconTriangleWarning,
} from "nucleo-pixel-essential";
import { cn } from "../ui/cn";

/**
 * Pixel icons for the sign-in and Allow access screens, from Nucleo Pixel
 * (https://nucleoapp.com/app/?library=pixel). Each is drawn on a 24-unit grid with 2-unit square
 * strokes, so one icon pixel is 2 units: 12 icon pixels across.
 */
const ICONS = {
  /** Sign-in: the phone number step. */
  telephone: IconPhone,
  /** Sign-in: the code step. Its three dots (the first three paths) hop while someone types. */
  message: IconMsgWriting,
  /** Shown in place of the message bubble when the code is wrong. */
  warning: IconTriangleWarning,
  microphone: IconMicrophone,
  notifications: IconBell,
  location: IconLocation2,
} satisfies Record<string, ComponentType<SVGProps<SVGSVGElement> & { size?: number | string }>>;

export type PixelIconName = keyof typeof ICONS;

export type PixelIconProps = {
  icon: PixelIconName;
  /** Size of one icon pixel in CSS px (a whole number keeps the edges crisp); the icons are 12 across. */
  pixel?: number;
  /** Bob gently up and down. */
  floating?: boolean;
  /** Offsets the float so a column of icons doesn't move in lockstep. */
  delay?: number;
  /** Hop the message bubble's dots one after another. */
  typing?: boolean;
  label?: string;
  className?: string;
};

/** One pixel icon in the current text color. */
export function PixelIcon({ icon, pixel = 4, floating = true, delay = 0, typing = false, label, className }: PixelIconProps) {
  const Glyph = ICONS[icon];
  return (
    <Glyph
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      size={12 * pixel}
      shapeRendering="crispEdges"
      // The float moves one icon pixel at a time so the edges stay crisp.
      style={{ animationDelay: `${delay}ms`, "--pixel": `${pixel}px` } as CSSProperties}
      className={cn(floating && "pixel-float", typing && "typing-dots", className)}
    />
  );
}

export type LcdIconProps = { icon: PixelIconName; label: string; typing?: boolean; className?: string };

/** The green LCD panel at the top of the sign-in screens (Figma nodes 154:1297, 154:1302). */
export function LcdIcon({ icon, label, typing, className }: LcdIconProps) {
  return (
    <div className={cn("flex h-[130px] w-[221px] items-center justify-center bg-lcd text-lcd-ink shadow-[var(--lcd-inset)]", className)}>
      <PixelIcon icon={icon} pixel={6} label={label} typing={typing} />
    </div>
  );
}
