/**
 * The radio mascot, drawn as pixels on the LCD (traced from Figma node 123:260).
 * Each "#" is one pixel; it renders in the current text color so it takes the LCD ink.
 */
const MASCOT = [
  "...........##...........",
  "........########........",
  "......############......",
  "..####............####..",
  ".#....................#.",
  "#......#........#......#",
  "#....#...#.##.#...#....#",
  "#...#.....####.....#...#",
  ".###................###.",
  "...#...##########...#...",
  "..#...#..........#...#..",
  "..#..#.###....###.#..#..",
  "..#.#.#.#.#..#.#.#.#.#..",
  ".#..#.###.#..###.#.#..#.",
  ".#..#.###.#..###.#.#..#.",
  ".#..#..###....###..#..#.",
  ".#...#....#..#....#...#.",
  ".#....#....##....#....#.",
  ".#.....##########.....#.",
  "..#.....#......#.....#..",
  "..#....#.#....#.#....#..",
  "...#...###....###...#...",
  "....##............##....",
  "......############......",
];

export type MascotProps = {
  /** Size of one pixel in CSS px. 3.72 matches the Figma artwork (111 × 105). */
  pixel?: number;
  className?: string;
};

export function Mascot({ pixel = 3.72, className }: MascotProps) {
  const w = MASCOT[0].length;
  const h = MASCOT.length;
  return (
    <svg
      role="img"
      aria-label="Mascot"
      width={w * pixel}
      height={h * pixel}
      viewBox={`0 0 ${w} ${h}`}
      shapeRendering="crispEdges"
      className={className}
      fill="currentColor"
    >
      {MASCOT.flatMap((row, y) => {
        // One rect per horizontal run keeps the DOM small.
        const runs: Array<[number, number]> = [];
        let start = -1;
        for (let x = 0; x <= row.length; x++) {
          if (row[x] === "#" && start < 0) start = x;
          if (row[x] !== "#" && start >= 0) {
            runs.push([start, x - start]);
            start = -1;
          }
        }
        return runs.map(([x, len]) => <rect key={`${x}-${y}`} x={x} y={y} width={len} height={1} />);
      })}
    </svg>
  );
}
