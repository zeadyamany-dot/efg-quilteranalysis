/* =====================================================================
 * tests.js — automated tests for the calculation engine. Expected values
 * are worked out by hand from the slide figures, not by calling the
 * engine. Runs in the browser (Methodology → Run tests) and from the
 * command line on macOS: `sh tests/run-tests.sh`.
 * ===================================================================== */
(function (root) {
  "use strict";
  const EQ = (root.EQ = root.EQ || {});

  function run() {
    const E = EQ.engine, D = EQ.data, I = EQ.interpret;
    const results = [];
    const test = (name, fn) => {
      try { fn(); results.push({ name, pass: true }); }
      catch (e) { results.push({ name, pass: false, message: String(e && e.message || e) }); }
    };
    const eq = (a, b, msg) => { if (a !== b) throw new Error(`${msg || ""} expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); };
    const near = (a, b, tol, msg) => {
      if (typeof a !== "number" || Math.abs(a - b) > (tol ?? 1e-6)) throw new Error(`${msg || ""} expected ≈${b}, got ${a}`);
    };
    const base = () => D.baselineInputs();
    const M = (i) => E.computeMetrics(E.validateInputs(i).clean);

    // ---- research baseline metrics
    test("Brokerage relative market share = 29.6 / 11.9", () => near(M(base()).brokerageRMS.value, 2.487394958, 1e-8));
    test("Brokerage lead is in percentage points (17.7 pp)", () => near(M(base()).brokerageLead.value, 17.7, 1e-9));
    test("BNPL relative market share = 21 / 14.5", () => near(M(base()).bnplRMS.value, 1.448275862, 1e-8));
    test("Weakest relative share is BNPL", () => { const m = M(base()).minRMS; near(m.value, 1.448275862, 1e-8); eq(m.note, "Consumer finance / BNPL"); });
    test("Quilter ranks #2 and is 3 pp behind Aviva", () => { const m = M(base()); eq(m.quilterRank.value, 2); near(m.quilterGap.value, -3); eq(m.quilterGap.note, "Aviva"); });
    test("Top-two concentration = 30 + 27 = 57%", () => near(M(base()).top2Share.value, 57));
    test("HHI of listed platforms = 30²+27²+8²+6²+6² = 1765", () => near(M(base()).platformHHI.value, 1765));
    test("Unattributed recommendations = 100 − 77 = 23%", () => near(M(base()).otherPlatformShare.value, 23));
    test("EFG digital customers = 950k + 230k + 105k", () => near(M(base()).efgDigitalCustomers.value, 1285000));
    test("Customer scale = 1,285,000 / 480,000", () => near(M(base()).customerScale.value, 2.677083333, 1e-8));
    test("EFG Finance portfolio = 19.7 + 16.7 + 4.0 = 40.4", () => near(M(base()).efgFinancePortfolio.value, 40.4, 1e-9));
    test("Portfolio mix sums to 100%", () => { const m = M(base()); near(m.leasingMix.value + m.valuMix.value + m.factoringMix.value, 100, 1e-9); });
    test("Leasing is the largest line at 48.76%", () => { const m = M(base()).largestLine; near(m.value, 48.76237624, 1e-6); eq(m.note, "Leasing"); });
    test("valU portfolio per customer = 16.7bn / 950k EGP", () => near(M(base()).valuPerCustomer.value, 17578.94737, 1e-4));
    test("valU per customer in GBP uses the FX input", () => near(M(base()).valuPerCustomerGBP.value, 17578.94737 / 65, 1e-4));
    test("Quilter assets per customer = £100bn / 480k", () => near(M(base()).quilterPerCustomer.value, 208333.3333, 1e-3));
    test("Customers per adviser firm = 480k / 6k = 80", () => near(M(base()).customersPerFirm.value, 80));
    test("Inclusion gap mid = 97 − 65 = 32 pp (range 27–37)", () => { const m = M(base()).inclusionGapMid; near(m.value, 32); near(m.low, 27); near(m.high, 37); });
    test("UK headroom = 3 pp", () => near(M(base()).ukHeadroom.value, 3));

    // ---- profitability (reported FY2025 figures)
    test("EFG cost-to-income = 17,536 / 26,029", () => near(M(base()).efgCostIncome.value, 67.37100926, 1e-6));
    test("Quilter cost-to-income = 494 / 701", () => near(M(base()).qCostIncome.value, 70.47075606, 1e-6));
    test("EFG pre-tax margin = 7,494 / 26,029", () => near(M(base()).efgPbtMargin.value, 28.79096393, 1e-6));
    test("Quilter adjusted pre-tax margin = 207 / 701 (reported 30%)", () => near(M(base()).qPbtMargin.value, 29.52924394, 1e-6));
    test("EFG net margin = 4,058 / 26,029", () => near(M(base()).efgNetMargin.value, 15.59030312, 1e-6));
    test("EFG ROE = 3,753.3 / avg(35,422.6, 34,058.8)", () => near(M(base()).efgROE.value, 3753.3 / 34740.7 * 100, 1e-9));
    test("Quilter adjusted ROE = 154 / avg(1,466, 1,423) (reported 10.8%)", () => near(M(base()).qROE.value, 10.66112842, 1e-6));
    test("Quilter IFRS ROE = 120 / 1,444.5", () => near(M(base()).qIfrsROE.value, 8.30737279, 1e-6));
    test("ROE gap in pp", () => { const m = M(base()); near(m.roeGap.value, m.efgROE.value - m.qROE.value, 1e-12); });
    test("Quilter revenue margin = 538 / avg(141.2bn, 119.4bn) in bps", () => near(M(base()).qRevenueMargin.value, 538 / 130300 * 1e4, 1e-9));
    test("Revenue growth: EFG 26,029 vs 24,422; Quilter 701 vs 670", () => {
      const m = M(base()); near(m.efgRevenueGrowth.value, 6.58013266, 1e-6); near(m.qRevenueGrowth.value, 4.62686567, 1e-6);
    });
    test("EFG net profit growth is negative (−4.6%)", () => near(M(base()).efgProfitGrowth.value, (4058 - 4254) / 4254 * 100, 1e-9));
    test("Growth from a loss-making base is not meaningful", () => eq(E.RATIO.growth(120, -34), null));
    test("Negative average equity gives no ROE", () => eq(E.RATIO.roe(10, -5, -3), null));
    test("Zero revenue gives no margin", () => { const i = base(); i.efgRevenue = 0; const m = M(i); eq(m.efgCostIncome.value, null); eq(m.efgNetMargin.value, null); });
    test("A loss gives a negative margin, not an error", () => { const i = base(); i.qAdjPAT = -50; near(M(i).qNetMargin.value, -50 / 701 * 100, 1e-9); });
    test("FY2024 comparison uses fixed comparatives", () => {
      const t = E.profitabilityTable(E.validateInputs(base()).clean);
      const ci = t.find((r) => r.id === "ci"); near(ci.efg24, 15480 / 24422 * 100, 1e-9); near(ci.q24, 474 / 670 * 100, 1e-9);
      const roe = t.find((r) => r.id === "roe"); eq(roe.efg24, null); eq(roe.q24, 10.0);
    });
    test("Editing FY2025 revenue does not change FY2024 ratios", () => {
      const i = base(); i.efgRevenue = 30000;
      const t = E.profitabilityTable(E.validateInputs(i).clean).find((r) => r.id === "ci");
      near(t.efg24, 15480 / 24422 * 100, 1e-9); near(t.efg25, 17536 / 30000 * 100, 1e-9);
    });
    test("Reconciliation values pass input validation", () => {
      D.RECONCILE.forEach((r) => { if (r.load !== null && E.validateField(D.inputDef(r.key), r.load).error) throw new Error(r.key); });
    });

    test("Every Input Lab preset passes validation", () => {
      D.INPUT_PRESETS.forEach((pr) => {
        const errs = Object.keys(E.validateInputs(Object.assign(base(), pr.values)).errors);
        if (errs.length) throw new Error(`${pr.id}: ${errs.join(", ")}`);
      });
    });
    test("Stress preset lowers EFG ROE; growth preset raises it", () => {
      const roe = (id) => M(Object.assign(base(), D.INPUT_PRESETS.find((p) => p.id === id).values)).efgROE.value;
      eq(roe("stress") < roe("research") && roe("growth") > roe("research"), true);
    });

    // ---- missing data and division by zero
    test("Missing input gives null, never zero", () => {
      const i = base(); i.compBrokerageShare = "";
      const m = M(i);
      eq(m.brokerageRMS.value, null); eq(m.brokerageRMS.missing.includes("compBrokerageShare"), true);
      near(m.bnplRMS.value, 1.448275862, 1e-8, "unrelated metric still computes");
    });
    test("Zero denominator gives null", () => { const i = base(); i.compBnplShare = 0; eq(M(i).bnplRMS.value, null); });
    test("Zero portfolio total gives null shares", () => {
      const i = base(); i.leasingPortfolio = 0; i.valuPortfolio = 0; i.factoringPortfolio = 0;
      const m = M(i); eq(m.efgFinancePortfolio.value, 0); eq(m.leasingMix.value, null); eq(m.largestLine.value, null);
    });
    test("Product overlap reduces unique customers", () => { const i = base(); i.productOverlap = 20; near(M(i).efgDigitalCustomers.value, 1028000); });

    // ---- validation
    test("Empty value is rejected as required", () => eq(E.validateField(D.inputDef("valuCustomers"), "").error, "Required"));
    test("Text is rejected", () => eq(!!E.validateField(D.inputDef("valuCustomers"), "abc").error, true));
    test("Thousands separators are accepted", () => eq(E.validateField(D.inputDef("valuCustomers"), "1,200,000").value, 1200000));
    test("Share above 100% is rejected", () => eq(!!E.validateField(D.inputDef("quilterRecShare"), 120).error, true));
    test("Negative customers are rejected", () => eq(!!E.validateField(D.inputDef("valuCustomers"), -5).error, true));
    test("Non-integer customer count is rejected", () => eq(E.validateField(D.inputDef("valuCustomers"), 10.5).error, "Enter a whole number"));
    test("Two brokerage shares over 100% are rejected", () => {
      const i = base(); i.efgBrokerageShare = 70; i.compBrokerageShare = 40;
      const v = E.validateInputs(i); eq(!!v.errors.efgBrokerageShare, true); eq(v.clean.efgBrokerageShare, null);
    });
    test("Platform shares over 100% are rejected", () => { const i = base(); i.avivaRecShare = 60; eq(!!E.validateInputs(i).errors.quilterRecShare, true); });
    test("Reach lower bound above upper bound is rejected", () => { const i = base(); i.egyptReachLow = 80; eq(!!E.validateInputs(i).errors.egyptReachLow, true); });

    // ---- change analysis
    test("Percentage changes are reported in pp", () => { const c = E.change(29.6, 25, "%"); eq(c.isPP, true); near(c.abs, -4.6, 1e-9); eq(E.fmtChange(c, "%"), "−4.6 pp"); });
    test("Absolute changes report a relative %", () => { const c = E.change(16.7, 20, "EGP bn"); near(c.rel, 19.76047904, 1e-6); });
    test("Changed inputs and metric drivers are traced", () => {
      const b = base(), c = base(); c.valuPortfolio = 20;
      const ch = E.changedInputs(c, b); eq(ch.length, 1); eq(ch[0].key, "valuPortfolio");
      const d = E.metricDeltas(E.computeMetrics(c), E.computeMetrics(b), ch);
      eq(d.some((x) => x.id === "valuPerCustomer" && x.drivers[0] === "valuPortfolio"), true);
      eq(d.some((x) => x.id === "brokerageRMS"), false);
      eq(I.narrateChanges(ch, d).length > 0, true);
    });

    // ---- scenario model
    const sc = Object.assign({}, D.SCENARIO_PRESETS.base);
    test("Year 0 has no adopters and no assets", () => { const r = E.project(base(), sc); eq(r.rows[0].adopters, 0); eq(r.rows[0].assetsEGPbn, 0); });
    test("Base case final-year assets match hand calculation", () => {
      const r = E.project(base(), sc);
      const cust = 1285000 * Math.pow(1.08, 5), adopters = cust * 0.10, bal = 20000 * Math.pow(1.12, 4);
      const egp = adopters * bal, fx = 65 * Math.pow(1.08, 5);
      near(r.last.assetsEGPbn, egp / 1e9, 1e-9); near(r.last.assetsGBPbn, egp / fx / 1e9, 1e-12);
      near(r.last.feesEGPm, egp * 0.0075 / 1e6, 1e-6); near(r.last.pctOfQuilter, egp / fx / 1e9, 1e-10);
    });
    test("FX translation loss = 1 − 1/1.08⁵", () => near(E.project(base(), sc).fxLoss, (1 - 1 / Math.pow(1.08, 5)) * 100, 1e-9));
    test("No depreciation means no translation loss", () => near(E.project(base(), Object.assign({}, sc, { fxDep: 0 })).fxLoss, 0));
    test("Optimistic > Base > Adverse on final GBP assets", () => {
      const v = (p) => E.project(base(), D.SCENARIO_PRESETS[p]).last.assetsGBPbn;
      eq(v("optimistic") > v("base") && v("base") > v("adverse"), true);
    });
    test("Projection refuses missing inputs", () => { const i = base(); i.fxEgpPerGbp = null; eq(E.project(i, sc).ok, false); });
    test("Tornado is sorted by swing size", () => {
      const t = E.tornado(base(), sc).rows;
      for (let k = 1; k < t.length; k++) if (t[k].range > t[k - 1].range) throw new Error("not sorted");
    });
    test("Grid cell equals a direct projection", () => {
      const g = E.grid(base(), sc, [15], [25000]);
      near(g[0][0], E.project(base(), Object.assign({}, sc, { adoption: 15, balance: 25000 })).last.assetsGBPbn, 1e-12);
    });

    // ---- risks
    test("Risk statuses at baseline", () => {
      const th = {}; Object.keys(D.THRESHOLDS).forEach((k) => (th[k] = D.THRESHOLDS[k].value));
      const r = E.assessRisks(M(base()), E.project(base(), sc), th);
      const s = Object.fromEntries(r.map((x) => [x.id, x.status]));
      eq(s.currency, "watch"); eq(s.concentration, "watch"); eq(s.competition, "watch"); eq(s.inclusion, "watch"); eq(s.saturation, "watch"); eq(s.cyber, "qualitative");
      eq(s.costs, "watch");
    });
    test("Raising the competitor BNPL share escalates competition risk", () => {
      const th = {}; Object.keys(D.THRESHOLDS).forEach((k) => (th[k] = D.THRESHOLDS[k].value));
      const i = base(); i.compBnplShare = 25;
      eq(E.assessRisks(M(i), E.project(i, sc), th).find((x) => x.id === "competition").status, "elevated");
    });

    // ---- CSV
    test("CSV round-trips quotes, commas and newlines", () => {
      const rows = [["a", 'he said "hi"'], ["b,c", "line1\nline2"]];
      const back = E.parseCSV(E.toCSV(rows)); eq(JSON.stringify(back), JSON.stringify(rows));
    });
    test("CSV import applies valid rows", () => {
      const r = E.importInputs("key,value\r\nvaluCustomers,1000000\r\nfxEgpPerGbp,70\r\n", base());
      eq(r.ok, true); eq(r.values.valuCustomers, 1000000); eq(r.values.fxEgpPerGbp, 70);
    });
    test("CSV import rejects unknown keys and applies nothing", () => {
      const r = E.importInputs("key,value\nvaluCustomers,1000000\nfoo,1\n", base()); eq(r.ok, false); eq(r.errors.length, 1);
    });
    test("CSV import rejects a missing header", () => eq(E.importInputs("valuCustomers,1\n", base()).ok, false));
    test("CSV import rejects out-of-range values", () => eq(E.importInputs("key,value\nukInclusion,140\n", base()).ok, false));

    // ---- formatting and integrity
    test("Formatting conventions", () => {
      eq(E.fmt(2.4873, "x"), "2.49×"); eq(E.fmt(29.6, "%"), "29.6%"); eq(E.fmt(40.4, "EGP bn"), "EGP 40.4bn");
      eq(E.fmt(1285000, "customers", { compact: true }), "1.29m"); eq(E.fmt(null, "%"), "—");
    });
    test("Research data is frozen", () => {
      let threw = false;
      try { D.INPUTS[0].value = 1; } catch (e) { threw = true; }
      eq(D.INPUTS[0].value, 29.6); eq(threw || Object.isFrozen(D.INPUTS[0]), true);
    });

    return results;
  }

  EQ.tests = { run };
})(typeof window !== "undefined" ? window : globalThis);
