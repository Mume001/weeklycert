/**
 * A made-up NY XML, shown on the review screen as an example of what the file
 * will hold (spec/19 §11: no real generation in this phase, a static example
 * from the fixtures). The structure follows spec/05 §3.2; the element order is
 * confirmed against the XSD only in step 5 (spec/13 A1).
 *
 * Nothing here belongs to a real worker, a real project or a real filing.
 */
export const SAMPLE_NY_XML = `<?xml version="1.0" encoding="UTF-8"?>
<!-- EXAMPLE. Made-up data, not a filing. -->
<ProjectRollup>
  <prcNumber>2010008390</prcNumber>
  <weekEndingDate>2026-09-12T12:00:00.000Z</weekEndingDate>
  <employeeWorkWeeks>
    <employeeWorkWeek>
      <employee>
        <firstName>David</firstName>
        <lastName>Chen</lastName>
        <ssnLast4>4417</ssnLast4>
        <nysRegisteredApprentice>false</nysRegisteredApprentice>
        <address>
          <address1>14 Cannon Street</address1>
          <city>Poughkeepsie</city>
          <state>NY</state>
          <postalCode>12601</postalCode>
        </address>
      </employee>
      <deductionGrossEarnings>2528.00</deductionGrossEarnings>
      <netWages>1794.88</netWages>
      <workWeeks>
        <workWeek>
          <workCategory>Electrician – Inside Wireman</workCategory>
          <stHourlyRate>63.20</stHourlyRate>
          <otHourlyRate>94.80</otHourlyRate>
          <days>
            <day>2026-09-07</day>
            <standardTimeHours>8.00</standardTimeHours>
            <overTimeHours>0.00</overTimeHours>
          </days>
        </workWeek>
      </workWeeks>
      <deductions>
        <deduction>
          <type>Federal tax</type>
          <amount>417.12</amount>
        </deduction>
      </deductions>
      <supplementalPayments>
        <supplementalPayment>
          <type>Health/Welfare</type>
          <standardHourlyRate>32.40</standardHourlyRate>
          <overtimeHourlyRate>32.40</overtimeHourlyRate>
        </supplementalPayment>
      </supplementalPayments>
    </employeeWorkWeek>
  </employeeWorkWeeks>
</ProjectRollup>
`
