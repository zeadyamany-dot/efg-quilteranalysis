/* =====================================================================
 * interpret.js — deterministic, rule-based interpretation. No AI service
 * is called. Each KPI rule returns the six-part structure:
 *   measures · current · comparison · why · implication · limits
 * ===================================================================== */
(function (root) {
  "use strict";
  const EQ = (root.EQ = root.EQ || {});
  const E = EQ.engine, D = EQ.data;
  const f = E.fmt, isNum = E.isNum;

  /** Comparison sentence against the research baseline. */
  function vsBaseline(cur, base, unit) {
    if (!isNum(cur)) return "Cannot be compared: one or more inputs are missing or invalid.";
    if (!isNum(base)) return "No research baseline is available for comparison.";
    if (Math.abs(cur - base) < 1e-9) return `Matches the research baseline (${f(base, unit)}).`;
    const c = E.change(base, cur, unit);
    return `${cur > base ? "Up" : "Down"} ${E.fmtChange(c, unit)} from the research baseline of ${f(base, unit)}.`;
  }

  /** KPI interpretations. `m` = current metrics, `b` = baseline metrics, `i` = inputs. */
  const RULES = {
    brokerageRMS: (m, b, i) => {
      const v = m.brokerageRMS.value;
      return {
        measures: "EFG Hermes's share of EGX securities brokerage relative to its direct digital competitors (Thndr / Contact). 1.0× means parity.",
        current: isNum(v) ? `${f(v, "x")} (${f(i.efgBrokerageShare, "%")} vs ${f(i.compBrokerageShare, "%")}, a lead of ${f(m.brokerageLead.value, "pp")}).` : "Not available.",
        comparison: vsBaseline(v, b.brokerageRMS.value, "x"),
        why: "Brokerage is EFG Hermes's core capital-markets franchise. A large relative share supports pricing power and order-flow economics.",
        implication: !isNum(v) ? "—" : v >= 2 ? "EFG holds more than twice the share of its direct digital rivals, consistent with its description as Egypt's leading investment bank."
          : v >= 1 ? "EFG still leads, but by a margin that new digital entrants could narrow." : "Competitors have a larger share than EFG on these inputs.",
        limits: "This is a single 2026 snapshot with no trend. The competitor series combines two firms in a way the research does not explain. Market share by itself says nothing about profitability.",
      };
    },
    quilterRecShare: (m, b, i) => {
      const v = i.quilterRecShare, gap = m.quilterGap.value;
      return {
        measures: "Quilter's share of top-10 platform recommendations by UK financial advisers. This is a proxy for adviser preference, not for assets.",
        current: isNum(v) ? `${f(v, "%", { dp: 0 })}, rank ${f(m.quilterRank.value, "rank")} of five listed platforms; ${isNum(gap) ? (gap >= 0 ? `${f(gap, "pp")} ahead of` : `${f(-gap, "pp")} behind`) : "—"} ${m.quilterGap.note || ""}.` : "Not available.",
        comparison: vsBaseline(v, D.inputDef("quilterRecShare").value, "%"),
        why: "Quilter's model runs through advisers, so adviser recommendations drive new platform flows.",
        implication: !isNum(gap) ? "—" : gap >= 0 ? "Quilter leads adviser recommendations on these inputs." : `The top two platforms take ${f(m.top2Share.value, "%", { dp: 0 })} of recommendations. Quilter's challenge is winning share in a saturated market.`,
        limits: "Recommendation share is not market share by assets or revenue. The source behind the chart is not cited.",
      };
    },
    customerScale: (m, b, i) => {
      const v = m.customerScale.value;
      return {
        measures: "EFG's combined digital customer count (valU, Tanmeyah, Bank NXT) relative to Quilter's platform customers.",
        current: isNum(v) ? `${f(m.efgDigitalCustomers.value, "customers", { compact: true })} vs ${f(i.quilterPlatformCustomers, "customers", { compact: true })}: ${f(v, "x")}.` : "Not available.",
        comparison: vsBaseline(v, b.customerScale.value, "x"),
        why: "It contrasts EFG's mass-market reach with Quilter's narrower, higher-value advised client base.",
        implication: !isNum(v) ? "—" : v > 1 ? "EFG reaches more customers, but mainly through credit products. This is the customer base the research suggests converting into savers." : "Quilter's platform has more customers than EFG's digital products on these inputs.",
        limits: `Overlap between EFG products is unknown (set to ${f(i.productOverlap, "%", { dp: 0 })}). The counts are read off charts and come from different dates (Bank NXT is June 2025). A customer count does not show value per customer.`,
      };
    },
    efgFinancePortfolio: (m, b) => {
      const v = m.efgFinancePortfolio.value;
      return {
        measures: "Total outstanding EFG Finance portfolio across leasing, valU (BNPL) and factoring. A stock measured at a point in time.",
        current: isNum(v) ? `${f(v, "EGP bn")}; largest line ${m.largestLine.note} at ${f(m.largestLine.value, "%")}.` : "Not available.",
        comparison: vsBaseline(v, b.efgFinancePortfolio.value, "EGP bn"),
        why: "It shows that EFG Finance's business is mainly credit, the finance focus the research contrasts with Quilter's savings focus.",
        implication: !isNum(v) ? "—" : `No savings or investment line appears in the portfolio. ${m.largestLine.value >= 50 ? "One line is more than half the book." : "No single line exceeds half the book, but all three are credit exposures."}`,
        limits: "Values are read off a chart with no stated date or source. Excludes EFG Hermes's brokerage and investment banking. Without income data, no profitability or credit-quality conclusion is possible.",
      };
    },
    valueIntensity: (m, b, i) => {
      const v = m.valueIntensity.value;
      return {
        measures: "How much more value Quilter holds per platform customer than valU's portfolio per customer, both in GBP.",
        current: isNum(v) ? `Quilter ${f(m.quilterPerCustomer.value, "GBP", { compact: true })} vs valU ${f(m.valuPerCustomerGBP.value, "GBP", { compact: true })} (${f(m.valuPerCustomer.value, "EGP", { compact: true })} at ${f(i.fxEgpPerGbp, "EGP/GBP")}): ${f(v, "x", { dp: 0 })}.` : "Not available.",
        comparison: vsBaseline(v, b.valueIntensity.value, "x"),
        why: "It contrasts a wealth model (large balances, fee income) with a credit model (small balances, interest income).",
        implication: !isNum(v) ? "—" : "The gap shows how far EFG's base is from Quilter's model. Converting even a small share of borrowers into savers would change EFG's income mix.",
        limits: "This is not a like-for-like comparison. One side is client assets (an asset of the client) and the other is loans (an asset of EFG). The result depends on the exchange-rate assumption, which does not come from the research, and on the undefined £100bn figure.",
      };
    },
    inclusionGapMid: (m, b, i) => {
      const v = m.inclusionGapMid.value;
      return {
        measures: "Difference between UK financial inclusion and the mid-point of Egypt's NBFS reach.",
        current: isNum(v) ? `${f(v, "pp")} (range ${f(m.inclusionGapMid.low, "pp")} to ${f(m.inclusionGapMid.high, "pp")}).` : "Not available.",
        comparison: vsBaseline(v, b.inclusionGapMid.value, "pp"),
        why: "The research frames Egypt's challenge as access and literacy and the UK's as growth. This gap quantifies that contrast.",
        implication: !isNum(v) ? "—" : "A large share of Egyptians remain outside formal NBFS. That is room for EFG to grow, and also a constraint on how fast savings products can be adopted.",
        limits: "The two figures may use different definitions and populations ('audience' vs 'target audience'). Treat the gap as indicative only.",
      };
    },
  };

  RULES.efgROE = (m, b) => {
    const v = m.efgROE.value, q = m.qROE.value, gap = m.roeGap.value;
    return {
      measures: "Profit attributable to EFG Holding's shareholders as a share of their average equity in FY2025 (audited IFRS figures).",
      current: isNum(v) ? `${f(v, "%")} vs Quilter ${f(q, "%")} (adjusted basis; IFRS ${f(m.qIfrsROE.value, "%")}): a gap of ${f(gap, "pp")}.` : "Not available.",
      comparison: vsBaseline(v, b.efgROE.value, "%"),
      why: "ROE shows how much profit each firm earns on its shareholders' capital. It is the most direct test of whether a credit-led model and an advice-led model reward investors differently.",
      implication: !isNum(v) || !isNum(q) ? "—" : Math.abs(gap) < 1.5
        ? "The two firms earn almost the same nominal return on equity, despite very different business models and margins."
        : gap > 0 ? "EFG earns a higher nominal return on equity than Quilter." : "Quilter earns a higher nominal return on equity than EFG.",
      limits: "Nominal returns in different currencies. Egyptian inflation and interest rates were much higher than the UK's in 2025, so EFG's real (inflation-adjusted) return is lower than its nominal ROE suggests. Quilter's figure is on an adjusted basis; one year only.",
    };
  };
  RULES.efgCostIncome = (m, b) => {
    const v = m.efgCostIncome.value, q = m.qCostIncome.value;
    return {
      measures: "Share of each pound of revenue absorbed by operating costs. For EFG this includes provisions and expected credit losses.",
      current: isNum(v) ? `EFG ${f(v, "%")} vs Quilter ${f(q, "%")}.` : "Not available.",
      comparison: `${vsBaseline(v, b.efgCostIncome.value, "%")} EFG's FY2024 ratio was ${f(E.RATIO.share(D.PRIOR.efgOpex, D.PRIOR.efgRevenue), "%")}.`,
      why: "Efficiency drives margins. EFG's FY2025 costs rose 13% against 7% revenue growth, which is why its net profit fell 5%.",
      implication: !isNum(v) || !isNum(q) ? "—" : v < q
        ? "EFG converts slightly more revenue into operating profit than Quilter, even after absorbing credit-loss provisions."
        : "EFG's costs absorb a larger share of revenue than Quilter's.",
      limits: "The two ratios are defined differently: EFG includes credit provisions, while Quilter uses adjusted costs that exclude some items. Treat the comparison as indicative.",
    };
  };

  /** Plain-English reading of the FY2025 vs FY2024 profitability table. */
  function profitabilityNotes(m) {
    const notes = [];
    const moved = (v) => `${v >= 0 ? "rose" : "fell"} ${f(Math.abs(v), "%")}`;
    const ci = m.efgCostIncome.value, ci24 = E.RATIO.share(D.PRIOR.efgOpex, D.PRIOR.efgRevenue);
    if (isNum(m.efgRevenueGrowth.value) && isNum(m.efgProfitGrowth.value))
      notes.push(`EFG's revenue ${moved(m.efgRevenueGrowth.value)} in nominal EGP while net profit ${moved(m.efgProfitGrowth.value)}${isNum(ci) && ci > ci24 ? `: costs grew faster than revenue, lifting cost-to-income from ${f(ci24, "%")} to ${f(ci, "%")}` : ""}.`);
    if (isNum(m.qRevenueGrowth.value) && isNum(m.qProfitGrowth.value))
      notes.push(`Quilter's revenue ${moved(m.qRevenueGrowth.value)} and adjusted pre-tax profit ${moved(m.qProfitGrowth.value)}${m.qProfitGrowth.value > m.qRevenueGrowth.value ? ", so its margin widened slightly" : ""}.`);
    if (isNum(m.efgNetMargin.value) && isNum(m.qNetMargin.value))
      notes.push(`Quilter keeps more of each unit of revenue as profit (${f(m.qNetMargin.value, "%")} vs ${f(m.efgNetMargin.value, "%")} for EFG), partly because EFG's profit is shared with minority shareholders in its listed subsidiaries.`);
    if (isNum(m.qRevenueMargin.value))
      notes.push(`Quilter earns about ${f(m.qRevenueMargin.value, "bps", { dp: 0 })} a year on the assets it manages. That fee-on-assets model is what the research suggests EFG could add through savings products.`);
    return notes;
  }

  function interpretKPI(id, cur, base, inputs) {
    const r = RULES[id];
    return r ? r(cur, base, inputs) : null;
  }

  /** Narrative explaining what changed after the user edited inputs. */
  function narrateChanges(changed, deltas) {
    if (!changed.length) return [];
    return deltas.slice(0, 8).map((d) => {
      const names = d.drivers.map((k) => D.inputDef(k).short).join(", ");
      if (!isNum(d.to)) return `${d.def.label} can no longer be calculated because ${names} ${d.drivers.length > 1 ? "are" : "is"} missing or invalid.`;
      if (!isNum(d.from)) return `${d.def.label} is now ${f(d.to, d.def.unit)}.`;
      const dir = d.to > d.from ? "rose" : "fell";
      return `${d.def.label} ${dir} from ${f(d.from, d.def.unit)} to ${f(d.to, d.def.unit)}, a change of ${E.fmtChange(d, d.def.unit)}, driven by the change to ${names}.`;
    });
  }

  /** Short scenario narrative comparing a scenario with the base case. */
  function narrateScenario(name, res, baseRes, qa) {
    if (!res.ok) return "The scenario cannot be calculated: check that every assumption and the required inputs are valid.";
    const l = res.last;
    let s = `Under the ${name} assumptions, the illustrative platform would hold ${f(l.assetsEGPbn, "EGP bn")} after ${res.H} years. That is ${f(l.assetsGBPbn, "GBP bn")} at the projected rate of ${f(l.fx, "EGP/GBP")}, or ${f(l.pctOfQuilter, "%", { dp: 2 })} of Quilter's ~${f(qa, "GBP bn", { dp: 0 })} today.`;
    s += ` Annual fee income in the final year would be about ${f(l.feesEGPm, "EGP m")}.`;
    if (baseRes && baseRes.ok && baseRes !== res) {
      const c = E.change(baseRes.last.assetsGBPbn, l.assetsGBPbn, "GBP bn");
      s += ` Compared with the base case, final-year GBP assets are ${E.fmtChange(c, "GBP bn")}.`;
    }
    s += ` Currency depreciation removes ${f(res.fxLoss, "%")} of the GBP value over the horizon.`;
    return s;
  }

  EQ.interpret = { RULES, interpretKPI, narrateChanges, narrateScenario, vsBaseline, profitabilityNotes };
})(typeof window !== "undefined" ? window : globalThis);
