import assert from "node:assert/strict";
import {
  After,
  Given,
  Then,
  When,
  setWorldConstructor,
} from "@cucumber/cucumber";
import {
  buildShareUrl,
  canonicalizeChartState,
  createDefaultChartState,
  readChartStateFromUrl,
} from "../../../packages/client/dist/index.js";
import { listen } from "../../../packages/server/dist/index.js";

const SOURCE_URL = "https://github.com/Ravonus/velatis-charts/tree/main";

class ChartWorld {
  state;
  shareUrl;
  decoded;
  server;
  baseUrl;
  response;
  result;
}

setWorldConstructor(ChartWorld);

After(async function () {
  if (!this.server) return;
  await new Promise((resolve, reject) => {
    this.server.close((error) => (error ? reject(error) : resolve()));
  });
});

Given("a synthetic natal chart for {string}", function (name) {
  this.state = createDefaultChartState({
    name,
    localDate: "1990-01-01",
    localTime: "12:30",
    timeZone: "America/Denver",
    latitude: 39.7392,
    longitude: -104.9903,
  });
});

Given(
  "a synthetic comparison chart for {string} and {string}",
  function (firstName, secondName) {
    const first = createDefaultChartState({
      id: "person-1",
      name: firstName,
      timeZone: "America/Denver",
      latitude: 39.7392,
      longitude: -104.9903,
    });
    this.state = {
      ...first,
      mode: "compare",
      people: [
        first.people[0],
        {
          ...first.people[0],
          id: "person-2",
          name: secondName,
          localDate: "1988-05-20",
          timeZone: "America/New_York",
          latitude: 40.7128,
          longitude: -74.006,
        },
      ],
    };
  },
);

When("I create a public chart share URL", function () {
  this.shareUrl = buildShareUrl("https://charts.example.test", this.state);
  this.decoded = readChartStateFromUrl(this.shareUrl);
});

When("the stateless chart service calculates the chart", async function () {
  this.server = await listen({ port: 0, sourceUrl: SOURCE_URL });
  const address = this.server.address();
  assert(address && typeof address === "object");
  this.baseUrl = `http://127.0.0.1:${address.port}`;
  this.response = await fetch(`${this.baseUrl}/api/v1/charts`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(this.state),
  });
  this.result = await this.response.json();
});

Then("the share URL contains versioned chart state", function () {
  assert.equal(this.shareUrl.searchParams.has("chart"), true);
  assert.equal(this.decoded.version, 1);
});

Then("the decoded chart is the same natal chart for {string}", function (name) {
  assert.equal(this.decoded.mode, "natal");
  assert.equal(this.decoded.people[0].name, name);
  assert.deepEqual(
    this.decoded,
    JSON.parse(canonicalizeChartState(this.state)),
  );
});

Then(
  "the decoded chart contains {int} people in compare mode",
  function (count) {
    assert.equal(this.decoded.mode, "compare");
    assert.equal(this.decoded.people.length, count);
  },
);

Then(
  "the decoded people are named {string} and {string}",
  function (firstName, secondName) {
    assert.deepEqual(
      this.decoded.people.map((person) => person.name),
      [firstName, secondName],
    );
  },
);

Then("the response is successful and marked no-store", function () {
  assert.equal(this.response.status, 200);
  assert.match(this.response.headers.get("cache-control") ?? "", /no-store/u);
});

Then(
  "the result contains {int} natal charts and {int} comparison",
  function (chartCount, comparisonCount) {
    assert.equal(this.result.charts.length, chartCount);
    assert.equal(this.result.synastry.length, comparisonCount);
  },
);

Then("the health contract declares the service stateless", async function () {
  const response = await fetch(`${this.baseUrl}/api/v1/health`);
  const health = await response.json();
  assert.equal(response.status, 200);
  assert.equal(health.stateless, true);
  assert.equal(health.source, SOURCE_URL);
});
