import { useEffect, useMemo, useState } from "react";
import {
  ChartsClient,
  buildShareUrl,
  createDefaultChartState,
  readChartStateFromUrl,
  type ChartPerson,
  type ChartResultV1,
  type ChartStateV1,
  type HouseSystem,
} from "@velatis/charts-client";
import { ChartTable } from "./ChartTable";
import { ChartWheel } from "./ChartWheel";

const api = new ChartsClient({ baseUrl: window.location.origin });

const HOUSE_SYSTEMS: Array<[HouseSystem, string]> = [
  ["placidus", "Placidus"],
  ["whole-sign", "Whole sign"],
  ["equal", "Equal"],
  ["koch", "Koch"],
  ["porphyry", "Porphyry"],
  ["regiomontanus", "Regiomontanus"],
  ["campanus", "Campanus"],
  ["alcabitius", "Alcabitius"],
  ["morinus", "Morinus"],
  ["topocentric", "Topocentric"],
];

function initialState(): ChartStateV1 {
  try {
    return (
      readChartStateFromUrl(window.location.href) ?? createDefaultChartState()
    );
  } catch {
    return createDefaultChartState();
  }
}

function updatePerson(
  state: ChartStateV1,
  id: string,
  patch: Partial<ChartPerson>,
): ChartStateV1 {
  return {
    ...state,
    people: state.people.map((person) =>
      person.id === id ? { ...person, ...patch } : person,
    ),
  };
}

function PersonFields({
  person,
  index,
  onChange,
  onRemove,
}: {
  person: ChartPerson;
  index: number;
  onChange: (patch: Partial<ChartPerson>) => void;
  onRemove?: () => void;
}) {
  const fieldId = (name: string) => `${person.id}-${name}`;
  return (
    <fieldset className="person-card">
      <legend>
        <span>Person {index + 1}</span>
        {onRemove ? (
          <button
            className="text-button danger"
            type="button"
            onClick={onRemove}
          >
            Remove
          </button>
        ) : null}
      </legend>
      <div className="field full">
        <label htmlFor={fieldId("name")}>Name</label>
        <input
          id={fieldId("name")}
          value={person.name}
          maxLength={120}
          onChange={(event) => onChange({ name: event.currentTarget.value })}
        />
      </div>
      <div className="field">
        <label htmlFor={fieldId("date")}>Birth date</label>
        <input
          id={fieldId("date")}
          type="date"
          value={person.localDate}
          onChange={(event) =>
            onChange({ localDate: event.currentTarget.value })
          }
        />
      </div>
      <div className="field">
        <label htmlFor={fieldId("time")}>Birth time</label>
        <input
          id={fieldId("time")}
          type="time"
          step="1"
          value={person.localTime}
          onChange={(event) =>
            onChange({ localTime: event.currentTarget.value })
          }
        />
      </div>
      <div className="field full">
        <label htmlFor={fieldId("zone")}>IANA time zone</label>
        <input
          id={fieldId("zone")}
          value={person.timeZone}
          placeholder="America/Denver"
          onChange={(event) =>
            onChange({ timeZone: event.currentTarget.value })
          }
        />
        <span className="field-note">
          Example: America/New_York, Europe/London, UTC
        </span>
      </div>
      <div className="field">
        <label htmlFor={fieldId("latitude")}>Latitude</label>
        <input
          id={fieldId("latitude")}
          type="number"
          min="-90"
          max="90"
          step="any"
          value={person.latitude}
          onChange={(event) =>
            onChange({ latitude: event.currentTarget.valueAsNumber })
          }
        />
      </div>
      <div className="field">
        <label htmlFor={fieldId("longitude")}>Longitude</label>
        <input
          id={fieldId("longitude")}
          type="number"
          min="-180"
          max="180"
          step="any"
          value={person.longitude}
          onChange={(event) =>
            onChange({ longitude: event.currentTarget.valueAsNumber })
          }
        />
      </div>
    </fieldset>
  );
}

export default function App() {
  const [state, setState] = useState(initialState);
  const [result, setResult] = useState<ChartResultV1>();
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("");
  const shareUrl = useMemo(
    () => buildShareUrl(window.location.href, state),
    [state],
  );

  useEffect(() => {
    if (window.location.search.includes("chart=")) void calculate(state);
    // The initial URL is the only automatic calculation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function calculate(nextState: ChartStateV1): Promise<void> {
    setStatus("loading");
    setMessage("");
    try {
      const nextResult = await api.calculate(nextState);
      setResult(nextResult);
      setStatus("ready");
      window.history.replaceState(
        {},
        "",
        buildShareUrl(window.location.href, nextState),
      );
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "The chart could not be calculated.",
      );
    }
  }

  async function copyShareLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText(shareUrl.toString());
      setMessage(
        "Share link copied. The URL contains the chart inputs; no account or database is used.",
      );
    } catch {
      setMessage(
        "Copy was blocked. Select the URL in your address bar after calculating the chart.",
      );
    }
  }

  function addPerson(): void {
    const id = `person-${crypto.randomUUID().slice(0, 8)}`;
    setState((current) => ({
      ...current,
      mode: "compare",
      people: [
        ...current.people,
        {
          ...current.people[0]!,
          id,
          name: `Chart ${current.people.length + 1}`,
        },
      ],
    }));
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Velatis Charts home">
          <span className="brand-mark" aria-hidden="true">
            VC
          </span>
          <span>
            <strong>Velatis Charts</strong>
            <small>Open astrology charting</small>
          </span>
        </a>
        <nav aria-label="Project">
          <a href="#privacy">Privacy</a>
          <a href="https://github.com/Ravonus/velatis-charts">Source</a>
        </nav>
      </header>

      <main>
        <section className="hero">
          <div>
            <div className="eyebrow">Stateless · Shareable · Self-hostable</div>
            <h1>
              Beautiful charts.
              <br />
              Nothing else watching.
            </h1>
            <p>
              Build natal and multi-person comparison charts with Swiss
              Ephemeris. Share the exact chart as a URL or run the entire
              project yourself.
            </p>
          </div>
          <div className="command-card" aria-label="Quick start command">
            <span>Run it anywhere</span>
            <code>pnpm dlx @velatis/charts-server serve</code>
            <small>No database. No account. No tracking.</small>
          </div>
        </section>

        <div className="workspace" id="chart-workspace">
          <form
            className="control-panel"
            onSubmit={(event) => {
              event.preventDefault();
              void calculate(state);
            }}
          >
            <div className="panel-heading">
              <div>
                <div className="section-kicker">Chart builder</div>
                <h2>People & settings</h2>
              </div>
              <button
                className="secondary-button"
                type="button"
                onClick={addPerson}
                disabled={state.people.length >= 8}
              >
                + Add person
              </button>
            </div>

            <div className="people-list">
              {state.people.map((person, index) => (
                <PersonFields
                  person={person}
                  index={index}
                  key={person.id}
                  onChange={(patch) =>
                    setState((current) =>
                      updatePerson(current, person.id, patch),
                    )
                  }
                  onRemove={
                    index === 0
                      ? undefined
                      : () =>
                          setState((current) => {
                            const people = current.people.filter(
                              (entry) => entry.id !== person.id,
                            );
                            return {
                              ...current,
                              people,
                              mode: people.length > 1 ? "compare" : "natal",
                            };
                          })
                  }
                />
              ))}
            </div>

            <fieldset className="settings-card">
              <legend>Calculation</legend>
              <div className="field">
                <label htmlFor="zodiac">Zodiac</label>
                <select
                  id="zodiac"
                  value={state.settings.zodiac}
                  onChange={(event) =>
                    setState((current) => ({
                      ...current,
                      settings: {
                        ...current.settings,
                        zodiac: event.currentTarget.value as
                          "tropical" | "sidereal",
                      },
                    }))
                  }
                >
                  <option value="tropical">Tropical</option>
                  <option value="sidereal">Sidereal</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="houses">House system</label>
                <select
                  id="houses"
                  value={state.settings.houseSystem}
                  onChange={(event) =>
                    setState((current) => ({
                      ...current,
                      settings: {
                        ...current.settings,
                        houseSystem: event.currentTarget.value as HouseSystem,
                      },
                    }))
                  }
                >
                  {HOUSE_SYSTEMS.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="nodes">Lunar node</label>
                <select
                  id="nodes"
                  value={state.settings.nodeMode}
                  onChange={(event) =>
                    setState((current) => ({
                      ...current,
                      settings: {
                        ...current.settings,
                        nodeMode: event.currentTarget.value as "mean" | "true",
                      },
                    }))
                  }
                >
                  <option value="true">True node</option>
                  <option value="mean">Mean node</option>
                </select>
              </div>
            </fieldset>

            <div className="form-actions">
              <button
                className="primary-button"
                type="submit"
                disabled={status === "loading"}
              >
                {status === "loading"
                  ? "Calculating…"
                  : state.people.length > 1
                    ? "Compare charts"
                    : "Calculate chart"}
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={() => void copyShareLink()}
              >
                Copy share URL
              </button>
            </div>
            <p
              className={`status ${status === "error" ? "error" : ""}`}
              role="status"
              aria-live="polite"
            >
              {message}
            </p>
          </form>

          <section className="result-panel" aria-busy={status === "loading"}>
            {result ? (
              <>
                <ChartWheel result={result} />
                <ChartTable result={result} />
              </>
            ) : (
              <div className="empty-state">
                <div className="orbit" aria-hidden="true">
                  <span />
                </div>
                <h2>Your chart begins here</h2>
                <p>
                  Enter a birth date, exact time, IANA time zone, and
                  coordinates. Add another person to compare.
                </p>
              </div>
            )}
          </section>
        </div>

        <section className="principles" id="privacy">
          <article>
            <span>01</span>
            <h2>URL-native</h2>
            <p>
              The complete versioned chart state travels in the link. URLs
              reproduce the same inputs on any device.
            </p>
          </article>
          <article>
            <span>02</span>
            <h2>Stateless</h2>
            <p>
              The server calculates and returns. It does not create an account,
              database row, profile, or tracking ID.
            </p>
          </article>
          <article>
            <span>03</span>
            <h2>Open-ended</h2>
            <p>
              Typed contracts and namespaced extensions let downstream products
              add workflows without forking the core.
            </p>
          </article>
        </section>
      </main>

      <footer>
        <p>
          Velatis Charts · AGPL chart server and web app · Apache-2.0 client and
          contracts
        </p>
        <a href="https://github.com/Ravonus/velatis-charts">
          View corresponding source
        </a>
      </footer>
    </div>
  );
}
