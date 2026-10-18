import { cn } from "../ui/cn";

/**
 * Icons for the sign-in LCD panels, pixelated like the Figma "Pixelate" shader
 * (5px cells, 1px gap). Traced from Phosphor's Phone and ChatCircle at 84px:
 * "#" full ink, "+" and "." lighter cells where the outline only partly covers.
 */
const ICONS = {
  phone: [
    "              ",
    "   +#.        ",
    "  ##+#        ",
    " .#  #        ",
    " .#  ++       ",
    " .#  #.       ",
    "  # #+        ",
    "  #+.#  .+    ",
    "  .# +#+#+##. ",
    "   +# .#   +# ",
    "    +#+    #+ ",
    "     .######  ",
    "        ...   ",
    "              ",
  ],
  message: [
    "              ",
    "     +##+.    ",
    "   +#+..+#+   ",
    "  +#      #+  ",
    "  #        #  ",
    " ++        ++ ",
    " #.        .# ",
    " #.        .# ",
    " ++        ++ ",
    " .#        #  ",
    " .#       #+  ",
    " ####+..+#+   ",
    " .#+.+##+     ",
    "              ",
  ],
} as const;

const OPACITY: Record<string, number> = { "#": 1, "+": 0.7, ".": 0.4 };

export type LcdIconProps = { icon: keyof typeof ICONS; label: string; className?: string };

/** The green LCD panel at the top of the sign-in screens (Figma nodes 154:1297, 154:1302). */
export function LcdIcon({ icon, label, className }: LcdIconProps) {
  const rows = ICONS[icon];
  return (
    <div className={cn("flex h-[130px] w-[221px] items-center justify-center bg-lcd text-lcd-ink shadow-[var(--lcd-inset)]", className)}>
      <svg role="img" aria-label={label} width={84} height={84} viewBox="0 0 84 84" shapeRendering="crispEdges" className="fill-current">
        {rows.flatMap((row, y) =>
          [...row].map((c, x) =>
            c in OPACITY ? <rect key={`${x}-${y}`} x={x * 6} y={y * 6} width={5} height={5} fillOpacity={OPACITY[c]} /> : null,
          ),
        )}
      </svg>
    </div>
  );
}
