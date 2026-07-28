import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  ChartAspect,
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
const SIGN_NAMES = [
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces",
];
const ASPECT_COLORS = {
  conjunction: "#f5d689",
  sextile: "#6ee7d2",
  square: "#f17d8d",
  trine: "#78aef2",
  opposition: "#e0648f",
};
const ASPECT_GLYPHS = {
  conjunction: "☌",
  sextile: "⚹",
  square: "□",
  trine: "△",
  opposition: "☍",
};
// Per-person ring accents for the compare bi-wheel: the inner (first) chart
// runs warm, the outer runs cool, matching the aspect palette's temperature.
const PERSON_ACCENTS = ["#f5d689", "#78aef2"];
const SOLO_PLANET_RADIUS = 181;
const INNER_PLANET_RADIUS = 138;
const OUTER_PLANET_RADIUS = 184;

/** One planet on the wheel, addressed across charts. */
interface WheelFocus {
  chartIndex: number;
  planetId: string;
}

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

function sameFocus(a: WheelFocus | null, b: WheelFocus): boolean {
  return (
    a !== null && a.chartIndex === b.chartIndex && a.planetId === b.planetId
  );
}

function signDegree(planet: PlanetPosition): string {
  return `${planet.degreeInSign.toFixed(1)}° ${SIGN_NAMES[planet.signIndex]}`;
}

/**
 * Does this aspect line touch the focused planet? Natal aspects live entirely
 * inside one chart; synastry aspects run from the FIRST chart's planet (`from`)
 * to the SECOND chart's (`to`), matching the server's pair ordering.
 */
function aspectTouches(
  focus: WheelFocus | null,
  aspect: ChartAspect,
  kind: "natal" | "synastry",
  chartIndex: number,
): boolean {
  if (focus === null) return false;
  if (kind === "natal") {
    return (
      focus.chartIndex === chartIndex &&
      (aspect.from === focus.planetId || aspect.to === focus.planetId)
    );
  }
  if (focus.chartIndex === 0) return aspect.from === focus.planetId;
  return aspect.to === focus.planetId;
}

interface AspectRow {
  key: string;
  kind: ChartAspect["kind"];
  partnerLabel: string;
  orb: number;
}

/** Every aspect touching one planet, for the detail modal. */
function aspectRowsFor(result: ChartResultV1, focus: WheelFocus): AspectRow[] {
  const rows: AspectRow[] = [];
  const chart = result.charts[focus.chartIndex];
  if (!chart) return rows;
  const names = new Map(
    result.charts.map((entry) => [
      entry.personId,
      new Map<string, string>(
        entry.planets.map((planet) => [planet.id, planet.name]),
      ),
    ]),
  );
  const nameOf = (personId: string, planetId: string): string =>
    names.get(personId)?.get(planetId) ?? planetId;
  chart.aspects.forEach((aspect, index) => {
    if (aspect.from !== focus.planetId && aspect.to !== focus.planetId) return;
    const partner = aspect.from === focus.planetId ? aspect.to : aspect.from;
    rows.push({
      key: `natal-${index}`,
      kind: aspect.kind,
      partnerLabel: nameOf(chart.personId, partner),
      orb: aspect.orb,
    });
  });
  const pair = result.synastry[0];
  const second = result.charts[1];
  if (pair && second) {
    pair.aspects.forEach((aspect, index) => {
      const mine = focus.chartIndex === 0 ? aspect.from : aspect.to;
      if (mine !== focus.planetId) return;
      const partnerChart = focus.chartIndex === 0 ? second : result.charts[0]!;
      const partnerId = focus.chartIndex === 0 ? aspect.to : aspect.from;
      rows.push({
        key: `syn-${index}`,
        kind: aspect.kind,
        partnerLabel: `${partnerChart.personName}'s ${nameOf(partnerChart.personId, partnerId)}`,
        orb: aspect.orb,
      });
    });
  }
  return rows.sort((a, b) => a.orb - b.orb);
}

function PlanetGlyph({
  planet,
  radius,
  order,
  accent,
  hot,
  dimmed,
  onHover,
  onSelect,
}: {
  planet: PlanetPosition;
  radius: number;
  order: number;
  accent?: string;
  hot: boolean;
  dimmed: boolean;
  onHover: (hovering: boolean) => void;
  onSelect: () => void;
}) {
  const point = pointAt(planet.longitude, radius);
  const className = [
    "planet-node",
    hot ? "is-hot" : "",
    dimmed ? "is-dimmed" : "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <g
      className={className}
      style={{ "--enter-order": order } as React.CSSProperties}
      role="button"
      tabIndex={0}
      aria-label={`${planet.name} at ${signDegree(planet)}. Press Enter for details.`}
      onPointerEnter={() => onHover(true)}
      onPointerLeave={() => onHover(false)}
      onFocus={() => onHover(true)}
      onBlur={() => onHover(false)}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        onSelect();
      }}
    >
      <circle
        className="planet-marker"
        cx={point.x}
        cy={point.y}
        r="17"
        style={accent ? { stroke: accent } : undefined}
      />
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

function AspectLines({
  aspects,
  kind,
  chartIndex,
  fromPlanets,
  toPlanets,
  fromRadius,
  toRadius,
  focus,
}: {
  aspects: ChartAspect[];
  kind: "natal" | "synastry";
  chartIndex: number;
  fromPlanets: Map<string, PlanetPosition>;
  toPlanets: Map<string, PlanetPosition>;
  fromRadius: number;
  toRadius: number;
  focus: WheelFocus | null;
}) {
  return aspects.slice(0, 90).map((aspect, index) => {
    const from = fromPlanets.get(aspect.from);
    const to = toPlanets.get(aspect.to);
    if (!from || !to) return null;
    const first = pointAt(from.longitude, fromRadius);
    const second = pointAt(to.longitude, toRadius);
    const hot = aspectTouches(focus, aspect, kind, chartIndex);
    const className = [
      "aspect-line",
      kind === "synastry" ? "synastry-line" : "",
      hot ? "is-hot" : "",
      focus !== null && !hot ? "is-dimmed" : "",
    ]
      .filter(Boolean)
      .join(" ");
    return (
      <line
        className={className}
        key={`${kind}-${aspect.from}-${aspect.to}-${index}`}
        pathLength={1}
        style={{ "--enter-order": index } as React.CSSProperties}
        x1={first.x}
        y1={first.y}
        x2={second.x}
        y2={second.y}
        stroke={ASPECT_COLORS[aspect.kind]}
      >
        <title>
          {`${from.name} ${ASPECT_GLYPHS[aspect.kind]} ${to.name} · orb ${aspect.orb.toFixed(2)}°`}
        </title>
      </line>
    );
  });
}

function PlanetModal({
  result,
  focus,
  onClose,
}: {
  result: ChartResultV1;
  focus: WheelFocus;
  onClose: () => void;
}) {
  const chart = result.charts[focus.chartIndex];
  const planet = chart?.planets.find((entry) => entry.id === focus.planetId);
  const rows = useMemo(() => aspectRowsFor(result, focus), [result, focus]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  if (!chart || !planet) return null;
  const accent =
    result.charts.length > 1 ? PERSON_ACCENTS[focus.chartIndex] : undefined;
  return (
    <div
      className="planet-modal-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <section
        className="planet-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`${planet.name} details`}
        style={accent ? { borderColor: accent } : undefined}
        onClick={(event) => event.stopPropagation()}
      >
        <header>
          <span className="planet-modal-glyph" aria-hidden="true">
            {planet.glyph}
          </span>
          <div>
            <h3>{planet.name}</h3>
            <p>
              {chart.personName}
              {planet.retrograde ? " · retrograde" : ""}
            </p>
          </div>
          {/* The dialog just opened; focusing its only control is the
              expected order. */}
          <button type="button" onClick={onClose} autoFocus>
            Close
          </button>
        </header>
        <dl className="planet-modal-facts">
          <div>
            <dt>Position</dt>
            <dd>{signDegree(planet)}</dd>
          </div>
          <div>
            <dt>House</dt>
            <dd>{planet.house}</dd>
          </div>
          <div>
            <dt>Speed</dt>
            <dd>{`${planet.speed.toFixed(3)}°/day`}</dd>
          </div>
          <div>
            <dt>Longitude</dt>
            <dd>{`${planet.longitude.toFixed(2)}°`}</dd>
          </div>
        </dl>
        <h4>{rows.length > 0 ? "Aspects" : "No aspects in orb"}</h4>
        <ul className="planet-modal-aspects">
          {rows.map((row) => (
            <li key={row.key}>
              <span
                className="aspect-chip"
                style={{ color: ASPECT_COLORS[row.kind] }}
              >
                {ASPECT_GLYPHS[row.kind]} {row.kind}
              </span>
              <span>{row.partnerLabel}</span>
              <span className="aspect-orb">{`${row.orb.toFixed(2)}° orb`}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function chartPlanetMap(chart: NatalChart): Map<string, PlanetPosition> {
  return new Map<string, PlanetPosition>(
    chart.planets.map((planet) => [planet.id, planet]),
  );
}

export function ChartWheel({ result }: { result: ChartResultV1 }) {
  const [hovered, setHovered] = useState<WheelFocus | null>(null);
  const [selected, setSelected] = useState<WheelFocus | null>(null);
  const primary = result.charts[0];
  const compare = result.charts[1];
  const focus = hovered ?? selected;
  const hover = useCallback(
    (target: WheelFocus, hovering: boolean) =>
      setHovered((current) => {
        if (hovering) return target;
        return sameFocus(current, target) ? null : current;
      }),
    [],
  );
  const primaryPlanets = useMemo(
    () =>
      primary ? chartPlanetMap(primary) : new Map<string, PlanetPosition>(),
    [primary],
  );
  const comparePlanets = useMemo(
    () => (compare ? chartPlanetMap(compare) : null),
    [compare],
  );
  if (!primary) return null;
  const pair = compare ? result.synastry[0] : undefined;
  const showAspects = result.state.presentation?.showAspectLines !== false;
  const primaryRadius = compare ? INNER_PLANET_RADIUS : SOLO_PLANET_RADIUS;
  return (
    <figure className="wheel-figure">
      {compare ? (
        <div className="wheel-legend" aria-label="Ring legend">
          {result.charts.slice(0, 2).map((chart, index) => (
            <span className="wheel-legend-chip" key={chart.personId}>
              <i style={{ background: PERSON_ACCENTS[index] }} aria-hidden />
              {chart.personName} · {index === 0 ? "inner" : "outer"}
            </span>
          ))}
        </div>
      ) : null}
      <svg
        className={`chart-wheel${focus ? " has-focus" : ""}`}
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
        {compare ? (
          <>
            {/* Ring guides: each person's lane, in their accent. */}
            <circle
              className="ring-guide"
              cx="300"
              cy="300"
              r={INNER_PLANET_RADIUS}
              style={{ stroke: PERSON_ACCENTS[0] }}
            />
            <circle
              className="ring-guide"
              cx="300"
              cy="300"
              r={OUTER_PLANET_RADIUS}
              style={{ stroke: PERSON_ACCENTS[1] }}
            />
          </>
        ) : null}
        <circle className="wheel-core" cx="300" cy="300" r="120" />
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
        {showAspects ? (
          <AspectLines
            aspects={primary.aspects}
            kind="natal"
            chartIndex={0}
            fromPlanets={primaryPlanets}
            toPlanets={primaryPlanets}
            fromRadius={compare ? 120 : 162}
            toRadius={compare ? 120 : 162}
            focus={focus}
          />
        ) : null}
        {showAspects && pair && comparePlanets ? (
          <AspectLines
            aspects={pair.aspects}
            kind="synastry"
            chartIndex={0}
            fromPlanets={primaryPlanets}
            toPlanets={comparePlanets}
            fromRadius={INNER_PLANET_RADIUS}
            toRadius={OUTER_PLANET_RADIUS}
            focus={focus}
          />
        ) : null}
        {primary.planets.map((planet, index) => (
          <PlanetGlyph
            key={planet.id}
            planet={planet}
            radius={primaryRadius}
            order={index}
            accent={compare ? PERSON_ACCENTS[0] : undefined}
            hot={
              sameFocus(focus, { chartIndex: 0, planetId: planet.id }) ||
              sameFocus(selected, { chartIndex: 0, planetId: planet.id })
            }
            dimmed={
              focus !== null &&
              !sameFocus(focus, { chartIndex: 0, planetId: planet.id })
            }
            onHover={(hovering) =>
              hover({ chartIndex: 0, planetId: planet.id }, hovering)
            }
            onSelect={() => setSelected({ chartIndex: 0, planetId: planet.id })}
          />
        ))}
        {compare?.planets.map((planet, index) => (
          <PlanetGlyph
            key={planet.id}
            planet={planet}
            radius={OUTER_PLANET_RADIUS}
            order={primary.planets.length + index}
            accent={PERSON_ACCENTS[1]}
            hot={
              sameFocus(focus, { chartIndex: 1, planetId: planet.id }) ||
              sameFocus(selected, { chartIndex: 1, planetId: planet.id })
            }
            dimmed={
              focus !== null &&
              !sameFocus(focus, { chartIndex: 1, planetId: planet.id })
            }
            onHover={(hovering) =>
              hover({ chartIndex: 1, planetId: planet.id }, hovering)
            }
            onSelect={() => setSelected({ chartIndex: 1, planetId: planet.id })}
          />
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
        {compare ? " · hover a planet to trace its aspects" : ""}
      </figcaption>
      {selected ? (
        <PlanetModal
          result={result}
          focus={selected}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </figure>
  );
}
