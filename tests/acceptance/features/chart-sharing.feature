@acceptance @privacy @charting
Feature: Share charts without an account
  Velatis Charts must preserve exact synthetic chart inputs in a portable URL
  and calculate them without retaining server-side state.

  Scenario: A natal chart survives a share URL round trip
    Given a synthetic natal chart for "Avery"
    When I create a public chart share URL
    Then the share URL contains versioned chart state
    And the decoded chart is the same natal chart for "Avery"

  Scenario: Two people can be compared from one portable URL
    Given a synthetic comparison chart for "Avery" and "Jordan"
    When I create a public chart share URL
    Then the decoded chart contains 2 people in compare mode
    And the decoded people are named "Avery" and "Jordan"

  Scenario: The chart API calculates without storage
    Given a synthetic comparison chart for "Avery" and "Jordan"
    When the stateless chart service calculates the chart
    Then the response is successful and marked no-store
    And the result contains 2 natal charts and 1 comparison
    And the health contract declares the service stateless
