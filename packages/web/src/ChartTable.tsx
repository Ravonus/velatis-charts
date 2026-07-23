import type { ChartResultV1 } from "@velatis/charts-contracts";

const SIGNS = [
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

export function ChartTable({ result }: { result: ChartResultV1 }) {
  return (
    <div className="chart-data">
      {result.charts.map((chart) => (
        <section className="data-card" key={chart.personId}>
          <div className="section-kicker">Positions</div>
          <h2>{chart.personName}</h2>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th scope="col">Point</th>
                  <th scope="col">Position</th>
                  <th scope="col">House</th>
                  <th scope="col">Motion</th>
                </tr>
              </thead>
              <tbody>
                {chart.planets.map((planet) => (
                  <tr key={planet.id}>
                    <th scope="row">
                      <span aria-hidden="true">{planet.glyph}</span>{" "}
                      {planet.name}
                    </th>
                    <td>
                      {planet.degreeInSign.toFixed(2)}°{" "}
                      {SIGNS[planet.signIndex]}
                    </td>
                    <td>{planet.house}</td>
                    <td>{planet.retrograde ? "Retrograde" : "Direct"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
