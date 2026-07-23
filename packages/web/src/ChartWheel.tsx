import type {
  ChartResultV1,
  NatalChart,
  PlanetPosition,
} from "@velatis/charts-contracts";

const SIGNS = [
  "♈︎",
  "♉︎",
  "♊︎",
  "♋︎",
  "♌︎",
  "♍︎",
  "♎︎",
  "♏︎",
  "♐︎",
  "♑︎",
  "♒︎",
  "♓︎",
];
const ASPECT_COLORS = {
  conjunction: "#f5d689",
  sextile: "#6ee7d2",
  square: "#f17d8d",
  trine: "#78aef2",
  opposition: "#e0648f",
};

function pointAt(longitude: number, radius: number): { x: number; y: number } {
  const radians = ((longitude - 90) * Math.PI) / 180;
  return {
    x: 300 + Math.cos(radians) * radius,
    y: 300 + Math.sin(radians) * radius,
  };
}

function lineKey(index: number, longitude: number): string {
  return `${index}-${longitude.toFixed(4)}`;
}

function PlanetGlyph({
  planet,
  radius,
}: {
  planet: PlanetPosition;
  radius: number;
}) {
  const point = pointAt(planet.longitude, radius);
  return (
    <g aria-label={`${planet.name} at ${planet.longitude.toFixed(2)} degrees`}>
      <circle className="planet-marker" cx={point.x} cy={point.y} r="17" />
      <text className="planet-glyph" x={point.x} y={point.y + 1}>
        {planet.glyph}
      </text>
      {planet.retrograde ? (
        <text className="retrograde-glyph" x={point.x + 12} y={point.y - 11}>
          ℞
        </text>
      ) : null}
    </g>
  );
}

function Aspects({ chart }: { chart: NatalChart }) {
  const planets = new Map<string, PlanetPosition>(
    chart.planets.map((planet) => [planet.id, planet]),
  );
  return chart.aspects.slice(0, 90).map((aspect, index) => {
    const from = planets.get(aspect.from);
    const to = planets.get(aspect.to);
    if (!from || !to) return null;
    const first = pointAt(from.longitude, 162);
    const second = pointAt(to.longitude, 162);
    return (
      <line
        className="aspect-line"
        key={`${aspect.from}-${aspect.to}-${index}`}
        x1={first.x}
        y1={first.y}
        x2={second.x}
        y2={second.y}
        stroke={ASPECT_COLORS[aspect.kind]}
      />
    );
  });
}

export function ChartWheel({ result }: { result: ChartResultV1 }) {
  const primary = result.charts[0];
  if (!primary) return null;
  const compare = result.charts[1];
  return (
    <figure className="wheel-figure">
      <svg
        className="chart-wheel"
        viewBox="0 0 600 600"
        role="img"
        aria-labelledby="chart-wheel-title chart-wheel-description"
      >
        <title id="chart-wheel-title">
          {result.state.mode === "compare" ? "Comparison chart" : "Natal chart"}
        </title>
        <desc id="chart-wheel-description">
          Zodiac wheel for{" "}
          {result.charts.map((chart) => chart.personName).join(" and ")}. The
          data table after the wheel provides an equivalent text view.
        </desc>
        <defs>
          <radialGradient id="wheelGlow">
            <stop offset="0%" stopColor="#1b1738" />
            <stop offset="72%" stopColor="#13102a" />
            <stop offset="100%" stopColor="#090817" />
          </radialGradient>
          <filter id="softGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <circle className="wheel-field" cx="300" cy="300" r="291" />
        <circle className="wheel-ring" cx="300" cy="300" r="260" />
        <circle
          className="wheel-ring wheel-ring-inner"
          cx="300"
          cy="300"
          r="202"
        />
        <circle className="wheel-core" cx="300" cy="300" r="160" />
        {Array.from({ length: 12 }, (_, index) => {
          const lineStart = pointAt(index * 30, 160);
          const lineEnd = pointAt(index * 30, 260);
          const signPoint = pointAt(index * 30 + 15, 231);
          return (
            <g key={index}>
              <line
                className="zodiac-divider"
                x1={lineStart.x}
                y1={lineStart.y}
                x2={lineEnd.x}
                y2={lineEnd.y}
              />
              <text className="zodiac-glyph" x={signPoint.x} y={signPoint.y}>
                {SIGNS[index]}
              </text>
            </g>
          );
        })}
        {primary.houses.map((house, index) => {
          const start = pointAt(house.longitude, 160);
          const end = pointAt(house.longitude, 202);
          const label = pointAt(house.longitude + 6, 181);
          return (
            <g key={lineKey(index, house.longitude)}>
              <line
                className="house-line"
                x1={start.x}
                y1={start.y}
                x2={end.x}
                y2={end.y}
              />
              <text className="house-label" x={label.x} y={label.y}>
                {house.number}
              </text>
            </g>
          );
        })}
        {result.state.presentation?.showAspectLines !== false ? (
          <Aspects chart={primary} />
        ) : null}
        {primary.planets.map((planet) => (
          <PlanetGlyph
            key={planet.id}
            planet={planet}
            radius={compare ? 143 : 181}
          />
        ))}
        {compare?.planets.map((planet) => (
          <PlanetGlyph key={planet.id} planet={planet} radius={180} />
        ))}
        <circle
          className="ascendant-marker"
          {...pointAt(primary.ascendant, 261)}
          r="5"
        />
        <text className="wheel-monogram" x="300" y="293">
          VC
        </text>
        <text className="wheel-person" x="300" y="322">
          {result.charts.map((chart) => chart.personName).join(" × ")}
        </text>
      </svg>
      <figcaption>
        {primary.personName} · Asc {primary.ascendant.toFixed(1)}° · MC{" "}
        {primary.midheaven.toFixed(1)}°
      </figcaption>
    </figure>
  );
}
