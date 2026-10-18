import {
  ArrowBendUpLeft,
  ArrowBendUpRight,
  ArrowClockwise,
  ArrowCounterClockwise,
  ArrowElbowUpLeft,
  ArrowElbowUpRight,
  ArrowsMerge,
  ArrowsSplit,
  ArrowUp,
  ArrowUpLeft,
  ArrowUpRight,
  ArrowUUpLeft,
  ArrowUUpRight,
  FlagCheckered,
  type Icon,
} from "@phosphor-icons/react";

/** Routes API maneuvers (https://developers.google.com/maps/documentation/routes/reference/rest/v2/Maneuver) as arrows. */
const ICONS: Record<string, Icon> = {
  TURN_LEFT: ArrowBendUpLeft,
  TURN_RIGHT: ArrowBendUpRight,
  TURN_SLIGHT_LEFT: ArrowUpLeft,
  TURN_SLIGHT_RIGHT: ArrowUpRight,
  TURN_SHARP_LEFT: ArrowElbowUpLeft,
  TURN_SHARP_RIGHT: ArrowElbowUpRight,
  UTURN_LEFT: ArrowUUpLeft,
  UTURN_RIGHT: ArrowUUpRight,
  RAMP_LEFT: ArrowUpLeft,
  RAMP_RIGHT: ArrowUpRight,
  FORK_LEFT: ArrowsSplit,
  FORK_RIGHT: ArrowsSplit,
  MERGE: ArrowsMerge,
  ROUNDABOUT_LEFT: ArrowCounterClockwise,
  ROUNDABOUT_RIGHT: ArrowClockwise,
  ARRIVE: FlagCheckered,
};

export function ManeuverIcon({ maneuver, size = 32 }: { maneuver?: string; size?: number }) {
  const Glyph = (maneuver && ICONS[maneuver]) || ArrowUp;
  return <Glyph size={size} weight="bold" aria-hidden />;
}

/** "300 M", "1.2 KM": rounded the way a driver reads it. */
export function formatDistance(metres: number) {
  if (metres < 1000) return `${Math.max(10, Math.round(metres / 10) * 10)} m`;
  return `${(metres / 1000).toFixed(metres < 10000 ? 1 : 0)} km`;
}
