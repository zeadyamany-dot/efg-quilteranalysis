/* =====================================================================
 * engine.js — the single calculation engine. Every number the UI shows
 * that is not a raw input comes from a function in this file.
 *
 * Rules
 *  - Missing or invalid inputs are null, never 0. Any metric that depends
 *    on a null input is null and reports which inputs are missing.
 *  - Division by zero returns null.
 *  - Shares are stored in percent (29.6 = 29.6%). Differences between two
 *    percentages are percentage points (pp); relative changes are %.
 * ===================================================================== */
(function (root) {
  "use strict";
  const EQ = (root.EQ = root.EQ || {});
  const D = EQ.data;

  // ------------------------------------------------------------------ helpers
  const isNum = (v) => typeof v === "number" && Number.isFinite(v);
  const safeDiv = (a, b) => (isNum(a) && isNum(b) && b !== 0 ? a / b : null);
  const sum = (arr) => (arr.every(isNum) ? arr.reduce((s, v) => s + v, 0) : null);
  const round = (v, dp) => (isNum(v) ? Math.round(v * Math.pow(10, dp)) / Math.pow(10, dp) : null);

  /** Parse what a user typed. Returns {value:number|null, error:string|null}. */
  function parseNumber(raw) {
    if (raw === null || raw === undefined) return { value: null, error: "Required" };
    if (typeof raw === "number") return isNum(raw) ? { value: raw, error: null } : { value: null, error: "Enter a number" };
    const s = String(raw).trim().replace(/,/g, "").replace(/%$/, "");
    if (s === "") return { value: null, error: "Required" };
    if (!/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(s)) return { value: null, error: "Enter a number, for example 12.5" };
    return { value: Number(s), error: null };
  }

  /** Validate one field against its schema definition. */
  function validateField(def, raw) {
    const p = parseNumber(raw);
    if (p.error) return p;
    const v = p.value;
    if (def.integer && !Number.isInteger(v)) return { value: null, error: "Enter a whole number" };
    if (v < def.min) return { value: null, error: `Must be at least ${fmtPlain(def.min)} ${def.unit}` };
    if (v > def.max) return { value: null, error: `Must be at most ${fmtPlain(def.max)} ${def.unit}` };
    return { value: v, error: null };
  }

  /**
   * Validate the full input set, including cross-field rules.
   * @returns {{clean:Object<string,number|null>, errors:Object<string,string>, warnings:string[]}}
   */
  function validateInputs(raw) {
    const clean = {}, errors = {}, warnings = [];
    D.INPUTS.forEach((def) => {
      const r = validateField(def, raw[def.key]);
      clean[def.key] = r.value;
      if (r.error) errors[def.key] = r.error;
    });
    const pairCheck = (a, b, label) => {
      if (isNum(clean[a]) && isNum(clean[b]) && clean[a] + clean[b] > 100) {
        errors[a] = errors[b] = `${label}: the two shares add up to more than 100%`;
        clean[a] = clean[b] = null;
      }
    };
    pairCheck("efgBrokerageShare", "compBrokerageShare", "Brokerage");
    pairCheck("valuBnplShare", "compBnplShare", "Consumer finance");
    const plat = PLATFORM_KEYS.map((k) => clean[k]);
    if (plat.every(isNum) && plat.reduce((s, v) => s + v, 0) > 100) {
      PLATFORM_KEYS.forEach((k) => { errors[k] = "Platform shares add up to more than 100%"; clean[k] = null; });
    }
    if (isNum(clean.egyptReachLow) && isNum(clean.egyptReachHigh) && clean.egyptReachLow > clean.egyptReachHigh) {
      errors.egyptReachLow = errors.egyptReachHigh = "The lower bound is above the upper bound";
      clean.egyptReachLow = clean.egyptReachHigh = null;
    }
    if (isNum(clean.bankNxtCustomers)) warnings.push("Bank NXT customers are dated June 2025; the other EFG customer counts are 2026.");
    return { clean, errors, warnings };
  }

  // ------------------------------------------------------------------ metrics
  const PLATFORM_KEYS = ["avivaRecShare", "quilterRecShare", "fidelityRecShare", "ajbellRecShare", "swRecShare"];
  const PLATFORM_NAMES = { avivaRecShare: "Aviva", quilterRecShare: "Quilter", fidelityRecShare: "Fidelity Adviser Solutions", ajbellRecShare: "AJ Bell Investcentre", swRecShare: "Scottish Widows Platform" };
  const PORTFOLIO_KEYS = ["leasingPortfolio", "valuPortfolio", "factoringPortfolio"];
  const PORTFOLIO_NAMES = { leasingPortfolio: "Leasing", valuPortfolio: "valU (BNPL)", factoringPortfolio: "Factoring" };

  /**
   * @typedef {{id:string,label:string,unit:string,deps:string[],formula:string,
   *   kind:"ratio"|"stock"|"count"|"share"|"diff",compute:(i:Object)=>({value:number|null,num?:number|null,den?:number|null,note?:string})}} MetricDef
   */
  /** @type {MetricDef[]} */
  const METRICS = [
    { id: "brokerageRMS", label: "Relative market share: EGX brokerage", unit: "x", kind: "ratio",
      deps: ["efgBrokerageShare", "compBrokerageShare"],
      formula: "EFG Hermes brokerage share ÷ direct competitors' brokerage share",
      compute: (i) => ({ value: safeDiv(i.efgBrokerageShare, i.compBrokerageShare), num: i.efgBrokerageShare, den: i.compBrokerageShare }) },
    { id: "brokerageLead", label: "Brokerage lead over competitors", unit: "pp", kind: "diff",
      deps: ["efgBrokerageShare", "compBrokerageShare"],
      formula: "EFG Hermes brokerage share − competitors' share",
      compute: (i) => ({ value: isNum(i.efgBrokerageShare) && isNum(i.compBrokerageShare) ? i.efgBrokerageShare - i.compBrokerageShare : null }) },
    { id: "bnplRMS", label: "Relative market share: consumer finance / BNPL", unit: "x", kind: "ratio",
      deps: ["valuBnplShare", "compBnplShare"],
      formula: "valU share ÷ direct competitors' share",
      compute: (i) => ({ value: safeDiv(i.valuBnplShare, i.compBnplShare), num: i.valuBnplShare, den: i.compBnplShare }) },
    { id: "bnplLead", label: "Consumer finance lead over competitors", unit: "pp", kind: "diff",
      deps: ["valuBnplShare", "compBnplShare"],
      formula: "valU share − competitors' share",
      compute: (i) => ({ value: isNum(i.valuBnplShare) && isNum(i.compBnplShare) ? i.valuBnplShare - i.compBnplShare : null }) },
    { id: "minRMS", label: "Weakest EFG relative market share", unit: "x", kind: "ratio",
      deps: ["efgBrokerageShare", "compBrokerageShare", "valuBnplShare", "compBnplShare"],
      formula: "Lower of the brokerage and BNPL relative market shares",
      compute: (i) => {
        const a = safeDiv(i.efgBrokerageShare, i.compBrokerageShare), b = safeDiv(i.valuBnplShare, i.compBnplShare);
        if (!isNum(a) || !isNum(b)) return { value: null };
        return { value: Math.min(a, b), note: a <= b ? "EGX brokerage" : "Consumer finance / BNPL" };
      } },

    { id: "quilterRank", label: "Quilter rank among listed platforms", unit: "rank", kind: "count",
      deps: PLATFORM_KEYS,
      formula: "1 + number of listed platforms with a higher recommendation share than Quilter",
      compute: (i) => {
        if (!PLATFORM_KEYS.every((k) => isNum(i[k]))) return { value: null };
        return { value: 1 + PLATFORM_KEYS.filter((k) => k !== "quilterRecShare" && i[k] > i.quilterRecShare).length };
      } },
    { id: "quilterGap", label: "Quilter gap to nearest rival", unit: "pp", kind: "diff",
      deps: PLATFORM_KEYS,
      formula: "Quilter share − highest share among the other listed platforms",
      compute: (i) => {
        if (!PLATFORM_KEYS.every((k) => isNum(i[k]))) return { value: null };
        const others = PLATFORM_KEYS.filter((k) => k !== "quilterRecShare");
        const top = others.reduce((a, k) => (i[k] > i[a] ? k : a), others[0]);
        return { value: i.quilterRecShare - i[top], note: PLATFORM_NAMES[top] };
      } },
    { id: "top2Share", label: "Top-two platform concentration", unit: "%", kind: "share",
      deps: PLATFORM_KEYS,
      formula: "Sum of the two largest listed recommendation shares",
      compute: (i) => {
        const v = PLATFORM_KEYS.map((k) => i[k]);
        if (!v.every(isNum)) return { value: null };
        const s = v.slice().sort((a, b) => b - a);
        return { value: s[0] + s[1] };
      } },
    { id: "platformHHI", label: "Recommendation concentration index (HHI, listed platforms)", unit: "points", kind: "count",
      deps: PLATFORM_KEYS,
      formula: "Σ (share in %)² across the five listed platforms. A lower bound: the unlisted 'other' share is excluded",
      compute: (i) => {
        const v = PLATFORM_KEYS.map((k) => i[k]);
        return { value: v.every(isNum) ? v.reduce((s, x) => s + x * x, 0) : null };
      } },
    { id: "otherPlatformShare", label: "Recommendations not attributed to a listed platform", unit: "%", kind: "share",
      deps: PLATFORM_KEYS,
      formula: "100 − Σ listed platform shares",
      compute: (i) => { const s = sum(PLATFORM_KEYS.map((k) => i[k])); return { value: isNum(s) ? 100 - s : null }; } },

    { id: "efgDigitalCustomers", label: "EFG digital customers (valU + Tanmeyah + Bank NXT)", unit: "customers", kind: "count",
      deps: ["valuCustomers", "tanmeyahCustomers", "bankNxtCustomers", "productOverlap"],
      formula: "(valU + Tanmeyah + Bank NXT customers) × (1 − product overlap %)",
      compute: (i) => {
        const s = sum([i.valuCustomers, i.tanmeyahCustomers, i.bankNxtCustomers]);
        return { value: isNum(s) && isNum(i.productOverlap) ? s * (1 - i.productOverlap / 100) : null, num: s };
      } },
    { id: "customerScale", label: "EFG digital customers per Quilter platform customer", unit: "x", kind: "ratio",
      deps: ["valuCustomers", "tanmeyahCustomers", "bankNxtCustomers", "productOverlap", "quilterPlatformCustomers"],
      formula: "EFG digital customers ÷ Quilter platform customers",
      compute: (i) => {
        const s = sum([i.valuCustomers, i.tanmeyahCustomers, i.bankNxtCustomers]);
        const n = isNum(s) && isNum(i.productOverlap) ? s * (1 - i.productOverlap / 100) : null;
        return { value: safeDiv(n, i.quilterPlatformCustomers), num: n, den: i.quilterPlatformCustomers };
      } },

    { id: "efgFinancePortfolio", label: "EFG Finance portfolio (leasing + valU + factoring)", unit: "EGP bn", kind: "stock",
      deps: PORTFOLIO_KEYS,
      formula: "Leasing + valU + factoring portfolios",
      compute: (i) => ({ value: sum(PORTFOLIO_KEYS.map((k) => i[k])) }) },
    { id: "leasingMix", label: "Leasing share of portfolio", unit: "%", kind: "share", deps: PORTFOLIO_KEYS,
      formula: "Leasing ÷ total portfolio × 100",
      compute: (i) => ({ value: pct(i.leasingPortfolio, sum(PORTFOLIO_KEYS.map((k) => i[k]))), num: i.leasingPortfolio, den: sum(PORTFOLIO_KEYS.map((k) => i[k])) }) },
    { id: "valuMix", label: "valU share of portfolio", unit: "%", kind: "share", deps: PORTFOLIO_KEYS,
      formula: "valU ÷ total portfolio × 100",
      compute: (i) => ({ value: pct(i.valuPortfolio, sum(PORTFOLIO_KEYS.map((k) => i[k]))), num: i.valuPortfolio, den: sum(PORTFOLIO_KEYS.map((k) => i[k])) }) },
    { id: "factoringMix", label: "Factoring share of portfolio", unit: "%", kind: "share", deps: PORTFOLIO_KEYS,
      formula: "Factoring ÷ total portfolio × 100",
      compute: (i) => ({ value: pct(i.factoringPortfolio, sum(PORTFOLIO_KEYS.map((k) => i[k]))), num: i.factoringPortfolio, den: sum(PORTFOLIO_KEYS.map((k) => i[k])) }) },
    { id: "largestLine", label: "Largest product line share", unit: "%", kind: "share", deps: PORTFOLIO_KEYS,
      formula: "Largest single product line ÷ total portfolio × 100",
      compute: (i) => {
        const tot = sum(PORTFOLIO_KEYS.map((k) => i[k]));
        if (!isNum(tot) || tot === 0) return { value: null };
        const top = PORTFOLIO_KEYS.reduce((a, k) => (i[k] > i[a] ? k : a), PORTFOLIO_KEYS[0]);
        return { value: (i[top] / tot) * 100, num: i[top], den: tot, note: PORTFOLIO_NAMES[top] };
      } },

    { id: "valuPerCustomer", label: "valU portfolio per active customer", unit: "EGP", kind: "ratio",
      deps: ["valuPortfolio", "valuCustomers"],
      formula: "valU portfolio (EGP bn × 10⁹) ÷ valU active customers",
      compute: (i) => ({ value: safeDiv(isNum(i.valuPortfolio) ? i.valuPortfolio * 1e9 : null, i.valuCustomers), num: isNum(i.valuPortfolio) ? i.valuPortfolio * 1e9 : null, den: i.valuCustomers }) },
    { id: "valuPerCustomerGBP", label: "valU portfolio per active customer, in GBP", unit: "GBP", kind: "ratio",
      deps: ["valuPortfolio", "valuCustomers", "fxEgpPerGbp"],
      formula: "valU portfolio per customer (EGP) ÷ EGP per £1",
      compute: (i) => ({ value: safeDiv(safeDiv(isNum(i.valuPortfolio) ? i.valuPortfolio * 1e9 : null, i.valuCustomers), i.fxEgpPerGbp) }) },
    { id: "quilterPerCustomer", label: "Quilter assets per platform customer", unit: "GBP", kind: "ratio",
      deps: ["quilterAssets", "quilterPlatformCustomers"],
      formula: "Quilter assets (GBP bn × 10⁹) ÷ platform customers",
      compute: (i) => ({ value: safeDiv(isNum(i.quilterAssets) ? i.quilterAssets * 1e9 : null, i.quilterPlatformCustomers), num: isNum(i.quilterAssets) ? i.quilterAssets * 1e9 : null, den: i.quilterPlatformCustomers }) },
    { id: "valueIntensity", label: "Quilter assets per customer ÷ valU balance per customer", unit: "x", kind: "ratio",
      deps: ["quilterAssets", "quilterPlatformCustomers", "valuPortfolio", "valuCustomers", "fxEgpPerGbp"],
      formula: "Quilter assets per platform customer (GBP) ÷ valU portfolio per customer (GBP)",
      compute: (i) => {
        const q = safeDiv(isNum(i.quilterAssets) ? i.quilterAssets * 1e9 : null, i.quilterPlatformCustomers);
        const v = safeDiv(safeDiv(isNum(i.valuPortfolio) ? i.valuPortfolio * 1e9 : null, i.valuCustomers), i.fxEgpPerGbp);
        return { value: safeDiv(q, v), num: q, den: v };
      } },
    { id: "efgPortfolioGBP", label: "EFG Finance portfolio in GBP", unit: "GBP bn", kind: "stock",
      deps: [...PORTFOLIO_KEYS, "fxEgpPerGbp"],
      formula: "EFG Finance portfolio (EGP bn) ÷ EGP per £1",
      compute: (i) => ({ value: safeDiv(sum(PORTFOLIO_KEYS.map((k) => i[k])), i.fxEgpPerGbp) }) },

    { id: "customersPerFirm", label: "Quilter platform customers per adviser firm", unit: "x", kind: "ratio",
      deps: ["quilterPlatformCustomers", "quilterAdviserFirms"],
      formula: "Platform customers ÷ adviser firms",
      compute: (i) => ({ value: safeDiv(i.quilterPlatformCustomers, i.quilterAdviserFirms), num: i.quilterPlatformCustomers, den: i.quilterAdviserFirms }) },
    { id: "customersPerProfessional", label: "Quilter platform customers per advice professional", unit: "x", kind: "ratio",
      deps: ["quilterPlatformCustomers", "quilterAdviceProfessionals"],
      formula: "Platform customers ÷ advice professionals",
      compute: (i) => ({ value: safeDiv(i.quilterPlatformCustomers, i.quilterAdviceProfessionals), num: i.quilterPlatformCustomers, den: i.quilterAdviceProfessionals }) },

    { id: "inclusionGapMid", label: "Inclusion gap, UK vs Egypt (mid-point)", unit: "pp", kind: "diff",
      deps: ["ukInclusion", "egyptReachLow", "egyptReachHigh"],
      formula: "UK inclusion − mid-point of Egypt reach range",
      compute: (i) => {
        if (![i.ukInclusion, i.egyptReachLow, i.egyptReachHigh].every(isNum)) return { value: null };
        return { value: i.ukInclusion - (i.egyptReachLow + i.egyptReachHigh) / 2, low: i.ukInclusion - i.egyptReachHigh, high: i.ukInclusion - i.egyptReachLow };
      } },
    { id: "ukHeadroom", label: "UK inclusion headroom", unit: "pp", kind: "diff",
      deps: ["ukInclusion"], formula: "100 − UK inclusion",
      compute: (i) => ({ value: isNum(i.ukInclusion) ? 100 - i.ukInclusion : null }) },

    // ---- profitability (reported FY2025 financials; ratios are unitless, so no FX is needed)
    { id: "efgCostIncome", label: "EFG cost-to-income ratio", unit: "%", kind: "ratio", deps: ["efgOpex", "efgRevenue"],
      formula: "Operating expenses incl. provisions & ECL ÷ net operating revenue × 100",
      compute: (i) => ({ value: RATIO.share(i.efgOpex, i.efgRevenue), num: i.efgOpex, den: i.efgRevenue }) },
    { id: "qCostIncome", label: "Quilter cost-to-income ratio", unit: "%", kind: "ratio", deps: ["qOpex", "qRevenue"],
      formula: "Adjusted operating expenses ÷ total net revenue × 100",
      compute: (i) => ({ value: RATIO.share(i.qOpex, i.qRevenue), num: i.qOpex, den: i.qRevenue }) },
    { id: "efgPbtMargin", label: "EFG pre-tax margin", unit: "%", kind: "ratio", deps: ["efgPBT", "efgRevenue"],
      formula: "Net profit before tax ÷ net operating revenue × 100",
      compute: (i) => ({ value: RATIO.share(i.efgPBT, i.efgRevenue), num: i.efgPBT, den: i.efgRevenue }) },
    { id: "qPbtMargin", label: "Quilter pre-tax margin (adjusted)", unit: "%", kind: "ratio", deps: ["qAdjPBT", "qRevenue"],
      formula: "Adjusted profit before tax ÷ total net revenue × 100 (Quilter's 'operating margin')",
      compute: (i) => ({ value: RATIO.share(i.qAdjPBT, i.qRevenue), num: i.qAdjPBT, den: i.qRevenue }) },
    { id: "efgNetMargin", label: "EFG net profit margin", unit: "%", kind: "ratio", deps: ["efgNetProfit", "efgRevenue"],
      formula: "Net profit after tax & minority interest ÷ net operating revenue × 100",
      compute: (i) => ({ value: RATIO.share(i.efgNetProfit, i.efgRevenue), num: i.efgNetProfit, den: i.efgRevenue }) },
    { id: "qNetMargin", label: "Quilter net profit margin (adjusted)", unit: "%", kind: "ratio", deps: ["qAdjPAT", "qRevenue"],
      formula: "Adjusted profit after tax ÷ total net revenue × 100",
      compute: (i) => ({ value: RATIO.share(i.qAdjPAT, i.qRevenue), num: i.qAdjPAT, den: i.qRevenue }) },
    { id: "efgROE", label: "EFG return on average equity (IFRS)", unit: "%", kind: "ratio", deps: ["efgIfrsProfit", "efgEquity", "efgEquityPrior"],
      formula: "IFRS profit attributable to shareholders ÷ average of opening and closing owners' equity × 100",
      compute: (i) => ({ value: RATIO.roe(i.efgIfrsProfit, i.efgEquityPrior, i.efgEquity), num: i.efgIfrsProfit, den: RATIO.avg(i.efgEquityPrior, i.efgEquity) }) },
    { id: "qROE", label: "Quilter return on average equity (adjusted)", unit: "%", kind: "ratio", deps: ["qAdjPAT", "qEquity", "qEquityPrior"],
      formula: "Adjusted profit after tax ÷ average of opening and closing total equity × 100",
      compute: (i) => ({ value: RATIO.roe(i.qAdjPAT, i.qEquityPrior, i.qEquity), num: i.qAdjPAT, den: RATIO.avg(i.qEquityPrior, i.qEquity) }) },
    { id: "qIfrsROE", label: "Quilter return on average equity (IFRS)", unit: "%", kind: "ratio", deps: ["qIfrsPAT", "qEquity", "qEquityPrior"],
      formula: "IFRS profit after tax ÷ average of opening and closing total equity × 100",
      compute: (i) => ({ value: RATIO.roe(i.qIfrsPAT, i.qEquityPrior, i.qEquity), num: i.qIfrsPAT, den: RATIO.avg(i.qEquityPrior, i.qEquity) }) },
    { id: "roeGap", label: "ROE gap, EFG (IFRS) minus Quilter (adjusted)", unit: "pp", kind: "diff",
      deps: ["efgIfrsProfit", "efgEquity", "efgEquityPrior", "qAdjPAT", "qEquity", "qEquityPrior"],
      formula: "EFG ROE − Quilter ROE",
      compute: (i) => { const a = RATIO.roe(i.efgIfrsProfit, i.efgEquityPrior, i.efgEquity), b = RATIO.roe(i.qAdjPAT, i.qEquityPrior, i.qEquity); return { value: isNum(a) && isNum(b) ? a - b : null }; } },
    { id: "qRevenueMargin", label: "Quilter revenue margin", unit: "bps", kind: "ratio", deps: ["qMgmtFees", "qAuma", "qAumaPrior"],
      formula: "Net management fees ÷ average of opening and closing AuMA × 10,000",
      compute: (i) => { const avgAssets = RATIO.avg(i.qAumaPrior, i.qAuma); const r = safeDiv(i.qMgmtFees, isNum(avgAssets) ? avgAssets * 1000 : null); return { value: isNum(r) ? r * 1e4 : null, num: i.qMgmtFees, den: isNum(avgAssets) ? avgAssets * 1000 : null }; } },
    { id: "efgRevenueGrowth", label: "EFG revenue growth (FY24 → FY25, nominal EGP)", unit: "%", kind: "ratio", deps: ["efgRevenue"],
      formula: "(FY2025 revenue − FY2024 revenue) ÷ FY2024 revenue × 100",
      compute: (i) => ({ value: RATIO.growth(i.efgRevenue, D.PRIOR.efgRevenue), num: i.efgRevenue, den: D.PRIOR.efgRevenue }) },
    { id: "qRevenueGrowth", label: "Quilter revenue growth (FY24 → FY25)", unit: "%", kind: "ratio", deps: ["qRevenue"],
      formula: "(FY2025 revenue − FY2024 revenue) ÷ FY2024 revenue × 100",
      compute: (i) => ({ value: RATIO.growth(i.qRevenue, D.PRIOR.qRevenue), num: i.qRevenue, den: D.PRIOR.qRevenue }) },
    { id: "efgProfitGrowth", label: "EFG net profit growth (FY24 → FY25)", unit: "%", kind: "ratio", deps: ["efgNetProfit"],
      formula: "(FY2025 net profit − FY2024) ÷ FY2024 × 100; not meaningful if FY2024 was a loss",
      compute: (i) => ({ value: RATIO.growth(i.efgNetProfit, D.PRIOR.efgNetProfit), num: i.efgNetProfit, den: D.PRIOR.efgNetProfit }) },
    { id: "qProfitGrowth", label: "Quilter adjusted pre-tax profit growth (FY24 → FY25)", unit: "%", kind: "ratio", deps: ["qAdjPBT"],
      formula: "(FY2025 adjusted PBT − FY2024) ÷ FY2024 × 100",
      compute: (i) => ({ value: RATIO.growth(i.qAdjPBT, D.PRIOR.qAdjPBT), num: i.qAdjPBT, den: D.PRIOR.qAdjPBT }) },
  ];

  function pct(a, b) { const r = safeDiv(a, b); return isNum(r) ? r * 100 : null; }

  /** Profitability ratio formulas, shared by the FY2025 metrics and the FY2024 comparison. */
  const RATIO = {
    share: (part, whole) => (isNum(whole) && whole > 0 ? pct(part, whole) : null),
    avg: (a, b) => (isNum(a) && isNum(b) ? (a + b) / 2 : null),
    roe: (profit, eqOpen, eqClose) => {
      const e = isNum(eqOpen) && isNum(eqClose) ? (eqOpen + eqClose) / 2 : null;
      return isNum(e) && e > 0 ? pct(profit, e) : null;   // negative average equity makes ROE meaningless
    },
    // Growth is not meaningful from a zero or negative base (e.g. a prior-year loss).
    growth: (cur, prior) => (isNum(cur) && isNum(prior) && prior > 0 ? ((cur - prior) / prior) * 100 : null),
  };

  /**
   * FY2025 vs FY2024 profitability ratios for the comparison chart. FY2025 uses
   * the current (editable) inputs; FY2024 uses the fixed reported comparatives.
   * FY2024 ROE needs December 2023 equity, which was not collected, so it is
   * null for EFG and the company's own reported figure is shown for Quilter.
   */
  function profitabilityTable(i) {
    const P = D.PRIOR;
    const row = (id, label, efg25, efg24, q25, q24, note) => ({ id, label, efg25, efg24, q25, q24, note });
    return [
      row("ci", "Cost-to-income", RATIO.share(i.efgOpex, i.efgRevenue), RATIO.share(P.efgOpex, P.efgRevenue),
        RATIO.share(i.qOpex, i.qRevenue), RATIO.share(P.qOpex, P.qRevenue), "Lower is more efficient. EFG includes provisions and credit losses."),
      row("pbt", "Pre-tax margin", RATIO.share(i.efgPBT, i.efgRevenue), RATIO.share(P.efgPBT, P.efgRevenue),
        RATIO.share(i.qAdjPBT, i.qRevenue), RATIO.share(P.qAdjPBT, P.qRevenue), "Quilter on an adjusted basis."),
      row("net", "Net profit margin", RATIO.share(i.efgNetProfit, i.efgRevenue), RATIO.share(P.efgNetProfit, P.efgRevenue),
        RATIO.share(i.qAdjPAT, i.qRevenue), RATIO.share(P.qAdjPAT, P.qRevenue), "EFG after minority interest; Quilter adjusted."),
      row("roe", "Return on average equity", RATIO.roe(i.efgIfrsProfit, i.efgEquityPrior, i.efgEquity), null,
        RATIO.roe(i.qAdjPAT, i.qEquityPrior, i.qEquity), P.qReportedROE, "FY2024: Quilter's reported figure; EFG not available."),
    ];
  }

  /** Compute every metric from a (validated) input map. */
  function computeMetrics(inputs) {
    const out = {};
    METRICS.forEach((m) => {
      const missing = m.deps.filter((k) => !isNum(inputs[k]));
      if (missing.length) { out[m.id] = { id: m.id, value: null, missing }; return; }
      const r = m.compute(inputs);
      out[m.id] = Object.assign({ id: m.id, missing: [] }, r, { value: isNum(r.value) ? r.value : null });
      if (!isNum(r.value)) out[m.id].reason = "Cannot divide by zero";
    });
    return out;
  }
  const metricDef = (id) => METRICS.find((m) => m.id === id);

  // ------------------------------------------------------------------ change analysis
  const isPercentUnit = (u) => u === "%" || u === "pp" || u === "% p.a.";

  /** Describe the change from a to b in the right terms (pp for percentages). */
  function change(a, b, unit) {
    if (!isNum(a) || !isNum(b)) return { abs: null, rel: null, isPP: isPercentUnit(unit) };
    return { abs: b - a, rel: a !== 0 ? ((b - a) / Math.abs(a)) * 100 : null, isPP: isPercentUnit(unit) };
  }

  /** Inputs whose current value differs from the research baseline. */
  function changedInputs(current, baseline) {
    return D.INPUTS.filter((d) => current[d.key] !== baseline[d.key]).map((d) =>
      Object.assign({ key: d.key, def: d, from: baseline[d.key], to: current[d.key] }, change(baseline[d.key], current[d.key], d.unit)));
  }

  /** Metrics that moved, with the changed inputs that feed each one. */
  function metricDeltas(curM, baseM, changed) {
    const keys = new Set(changed.map((c) => c.key));
    return METRICS.map((m) => {
      const a = baseM[m.id].value, b = curM[m.id].value;
      const drivers = m.deps.filter((k) => keys.has(k));
      if (!drivers.length) return null;
      const c = change(a, b, m.unit);
      if (isNum(a) && isNum(b) && Math.abs(b - a) < 1e-12) return null;
      return Object.assign({ id: m.id, def: m, from: a, to: b, drivers }, c);
    }).filter(Boolean).sort((x, y) => Math.abs(y.rel || 0) - Math.abs(x.rel || 0));
  }

  // ------------------------------------------------------------------ scenario model
  /**
   * Illustrative projection of an EFG savings & investment platform.
   * t = 0 is the research baseline; adoption ramps linearly to the target.
   * customers_t = C0 × (1+g)^t
   * adopters_t  = customers_t × adoption × t/H
   * balance_t   = B × (1+bg)^(t−1)        (t ≥ 1)
   * assets_t    = adopters_t × balance_t  (EGP)
   * fees_t      = assets_t × feeBps / 10,000   (flow over year t, on closing assets)
   * fx_t        = FX0 × (1+d)^t
   * assetsGBP_t = assets_t ÷ fx_t
   */
  function project(inputs, sc) {
    const m = computeMetrics(inputs);
    const C0 = m.efgDigitalCustomers.value, fx0 = inputs.fxEgpPerGbp, qa = inputs.quilterAssets;
    const req = [C0, fx0, qa, sc.horizon, sc.growth, sc.adoption, sc.balance, sc.balanceGrowth, sc.feeBps, sc.fxDep];
    if (!req.every(isNum) || sc.horizon < 1) return { ok: false, rows: [], missing: true };
    const H = Math.round(sc.horizon), rows = [];
    for (let t = 0; t <= H; t++) {
      const customers = C0 * Math.pow(1 + sc.growth / 100, t);
      const adopters = customers * (sc.adoption / 100) * (t / H);
      const balance = t === 0 ? 0 : sc.balance * Math.pow(1 + sc.balanceGrowth / 100, t - 1);
      const assetsEGP = adopters * balance;
      const fx = fx0 * Math.pow(1 + sc.fxDep / 100, t);
      const assetsGBP = assetsEGP / fx;
      rows.push({
        year: t, customers, adopters, balance,
        assetsEGPbn: assetsEGP / 1e9,
        feesEGPm: (assetsEGP * sc.feeBps) / 1e4 / 1e6,
        fx, assetsGBPbn: assetsGBP / 1e9,
        pctOfQuilter: (assetsGBP / 1e9 / qa) * 100,
      });
    }
    const last = rows[rows.length - 1];
    const fxLoss = (1 - 1 / Math.pow(1 + sc.fxDep / 100, H)) * 100;
    return { ok: true, rows, last, fxLoss, H };
  }

  const SCENARIO_KEYS = ["horizon", "growth", "adoption", "balance", "balanceGrowth", "feeBps", "fxDep"];

  function validateScenario(raw) {
    const clean = {}, errors = {};
    D.SCENARIO_FIELDS.forEach((f) => {
      const r = validateField(f, raw[f.key]);
      clean[f.key] = r.value;
      if (r.error) errors[f.key] = r.error;
    });
    return { clean, errors };
  }

  /** One-at-a-time sensitivity of a final-year output to each driver. */
  function tornado(inputs, sc, outKey) {
    outKey = outKey || "assetsGBPbn";
    const base = project(inputs, sc);
    if (!base.ok) return { ok: false, rows: [] };
    const baseVal = base.last[outKey];
    const rows = Object.keys(D.SENSITIVITY_SWINGS).map((k) => {
      const s = D.SENSITIVITY_SWINGS[k], f = D.SCENARIO_FIELDS.find((x) => x.key === k);
      const clamp = (v) => Math.min(f.max, Math.max(f.min, v));
      const lo = clamp(s.mode === "rel" ? sc[k] * (1 - s.delta) : sc[k] - s.delta);
      const hi = clamp(s.mode === "rel" ? sc[k] * (1 + s.delta) : sc[k] + s.delta);
      const vLo = project(inputs, Object.assign({}, sc, { [k]: lo })).last[outKey];
      const vHi = project(inputs, Object.assign({}, sc, { [k]: hi })).last[outKey];
      return { key: k, label: f.short || f.label, unit: f.unit, lo, hi, vLo, vHi, dLo: vLo - baseVal, dHi: vHi - baseVal, range: Math.abs(vHi - vLo) };
    }).sort((a, b) => b.range - a.range);
    return { ok: true, base: baseVal, rows };
  }

  /** Two-way grid: adoption × launch balance → final-year output. */
  function grid(inputs, sc, adoptions, balances, outKey) {
    outKey = outKey || "assetsGBPbn";
    return adoptions.map((a) => balances.map((b) => {
      const r = project(inputs, Object.assign({}, sc, { adoption: a, balance: b }));
      return r.ok ? r.last[outKey] : null;
    }));
  }

  // ------------------------------------------------------------------ risk monitor
  function level(value, watch, elevated, direction) {
    if (!isNum(value)) return "missing";
    if (direction === "above") return value >= elevated ? "elevated" : value >= watch ? "watch" : "ok";
    return value < elevated ? "elevated" : value < watch ? "watch" : "ok";
  }

  /** Evaluate the risk register. Thresholds are analyst assumptions. */
  function assessRisks(metrics, proj, th) {
    const t = (k) => th[k];
    return [
      { id: "currency", name: "Currency risk", slide: 4,
        evidence: "The research names currency risk as a challenge in Egypt.",
        metricLabel: "GBP value lost to EGP depreciation over the scenario horizon",
        value: proj && proj.ok ? proj.fxLoss : null, unit: "%",
        status: proj && proj.ok ? level(proj.fxLoss, t("fxLossWatch"), t("fxLossElevated"), "above") : "missing",
        threshold: `Watch ≥ ${t("fxLossWatch")}%, elevated ≥ ${t("fxLossElevated")}% (illustrative)`,
        impact: "EGP-denominated savings lose value when measured in GBP. That shrinks any cross-market comparison and the real value of returns to investors.",
        mitigation: "Report in both currencies. Offer EGP savings products whose returns track domestic inflation, and disclose FX sensitivity.",
        limits: "Depends on the scenario's depreciation assumption. The research gives no exchange rate or forecast." },
      { id: "concentration", name: "Narrow product range / lending concentration", slide: 4,
        evidence: "The research names a narrow product range. The data show the portfolio is entirely leasing, BNPL and factoring, with no savings line.",
        metricLabel: `Largest product line share (${metrics.largestLine.note || "n/a"})`,
        value: metrics.largestLine.value, unit: "%",
        status: level(metrics.largestLine.value, t("concWatch"), t("concElevated"), "above"),
        threshold: `Watch ≥ ${t("concWatch")}%, elevated ≥ ${t("concElevated")}% (illustrative)`,
        impact: "Earnings depend on credit products. A downturn in leasing or consumer credit would hit most of the book at once.",
        mitigation: "Offer a greater range of investment options and prioritise savings, adding fee income that does not depend on credit.",
        limits: "Only three product lines are shown; other EFG Holding segments (brokerage, investment banking) are excluded." },
      { id: "competition", name: "Competitive pressure in Egypt", slide: 3,
        evidence: "The research compares EFG with Thndr / Contact in brokerage and BNPL.",
        metricLabel: `Weakest relative market share (${metrics.minRMS.note || "n/a"})`,
        value: metrics.minRMS.value, unit: "x",
        status: level(metrics.minRMS.value, t("rmsWatch"), t("rmsElevated"), "below"),
        threshold: `Watch < ${t("rmsWatch")}×, elevated < ${t("rmsElevated")}× (illustrative)`,
        impact: "A narrowing lead in BNPL could pressure pricing and customer acquisition costs.",
        mitigation: "Improve the digital platform and grow the consumer base through connected services.",
        limits: "Competitor bars combine Thndr and Contact; how they were combined is not stated. Single point in time; no trend." },
      { id: "inclusion", name: "Low financial literacy and reach", slide: 4,
        evidence: "Egyptian NBFS reach of 60–70% against 97% in the UK, plus low financial literacy.",
        metricLabel: "Inclusion gap, UK minus Egypt (mid-point)",
        value: metrics.inclusionGapMid.value, unit: "pp",
        status: level(metrics.inclusionGapMid.value, t("gapWatch"), t("gapElevated"), "above"),
        threshold: `Watch ≥ ${t("gapWatch")}pp, elevated ≥ ${t("gapElevated")}pp (illustrative)`,
        impact: "Limits how many customers can adopt savings and investment products, the key driver in the scenario model.",
        mitigation: "Educate customers on saving and investing within the digital platform.",
        limits: "The two inclusion figures may not share a definition or population base." },
      { id: "saturation", name: "UK growth saturation (Quilter)", slide: 4,
        evidence: "In the UK the challenge is growth rather than access.",
        metricLabel: "UK inclusion headroom",
        value: metrics.ukHeadroom.value, unit: "pp",
        status: isNum(metrics.ukHeadroom.value) ? (metrics.ukHeadroom.value <= t("headroomWatch") ? "watch" : "ok") : "missing",
        threshold: `Watch ≤ ${t("headroomWatch")}pp (illustrative)`,
        impact: "Quilter must win share from rivals such as Aviva rather than reach new customers.",
        mitigation: "Compete on adviser experience and digital tools; Quilter is currently second on recommendations.",
        limits: "Inclusion is not the same as wealth-platform penetration." },
      { id: "costs", name: "Cost pressure on EFG profitability", slide: null,
        evidence: "not in the original research. EFG's FY2025 results report costs rising 13% against 7% revenue growth, citing inflation and a weaker EGP.",
        metricLabel: "EFG cost-to-income ratio (incl. provisions & ECL)",
        value: metrics.efgCostIncome.value, unit: "%",
        status: level(metrics.efgCostIncome.value, t("ciWatch"), t("ciElevated"), "above"),
        threshold: `Watch ≥ ${t("ciWatch")}%, elevated ≥ ${t("ciElevated")}% (illustrative)`,
        impact: "Costs growing faster than revenue squeeze margins: EFG's net profit fell 5% in FY2025 even as revenue rose.",
        mitigation: "Digital applications and automation to cut costs and shorten the financing process.",
        limits: "Includes provisions and credit losses, which move with the credit cycle. One year of data; not adjusted for one-off items." },
      { id: "digitalDivide", name: "Digital divide", slide: 5, qualitative: true,
        evidence: "Only customers with adequate internet access and digital skills benefit from fully digital services.",
        metricLabel: "No quantitative indicator in the research", value: null, unit: "", status: "qualitative",
        threshold: "None",
        impact: "Digital-only channels may exclude part of the target market and limit adoption.",
        mitigation: "Keep assisted and agent channels alongside the app; design for low bandwidth.",
        limits: "Would need data on internet penetration and digital skills to quantify." },
      { id: "cyber", name: "Cybersecurity and data protection", slide: 6, qualitative: true,
        evidence: "EFG holds ISO 27001 certification; Quilter uses layered controls and certified cloud data centres.",
        metricLabel: "No quantitative indicator in the research", value: null, unit: "", status: "qualitative",
        threshold: "None",
        impact: "A breach would undermine the digital trust both firms rely on.",
        mitigation: "Maintain certification, incident response and security testing.",
        limits: "Certification shows a control framework exists; it does not measure how well controls work." },
      { id: "fairness", name: "Fairness of automated decisions", slide: 8, qualitative: true,
        evidence: "Firms must make sure automated decisions do not affect clients unfairly.",
        metricLabel: "No quantitative indicator in the research", value: null, unit: "", status: "qualitative",
        threshold: "None",
        impact: "AI-driven credit decisions in BNPL and microfinance could create conduct and regulatory risk.",
        mitigation: "Human review of adverse decisions and bias testing of models.",
        limits: "Not measured in the research." },
    ];
  }

  // ------------------------------------------------------------------ formatting
  function fmtPlain(v) { return isNum(v) ? v.toLocaleString("en-GB", { maximumFractionDigits: 6 }) : "—"; }

  /** Format a value in its unit with consistent decimals. */
  function fmt(v, unit, opts) {
    opts = opts || {};
    if (!isNum(v)) return "—";
    const dp = opts.dp;
    const n = (x, d) => x.toLocaleString("en-GB", { minimumFractionDigits: d, maximumFractionDigits: d });
    const compact = (x, prefix) => {
      const a = Math.abs(x);
      if (a >= 1e9) return `${prefix}${n(x / 1e9, dp ?? 2)}bn`;
      if (a >= 1e6) return `${prefix}${n(x / 1e6, dp ?? 2)}m`;
      if (a >= 1e4) return `${prefix}${n(x / 1e3, dp ?? 1)}k`;
      return `${prefix}${n(x, dp ?? 0)}`;
    };
    switch (unit) {
      case "%": case "% p.a.": return `${n(v, dp ?? 1)}%`;
      case "pp": return `${n(v, dp ?? 1)} pp`;
      case "x": return `${n(v, dp ?? 2)}×`;
      case "EGP": return opts.compact ? compact(v, "EGP ") : `EGP ${n(v, dp ?? 0)}`;
      case "GBP": return opts.compact ? compact(v, "£") : `£${n(v, dp ?? 0)}`;
      case "EGP bn": return `EGP ${n(v, dp ?? 1)}bn`;
      case "EGP m": return `EGP ${n(v, dp ?? 1)}m`;
      case "GBP m": return `${v < 0 ? "−" : ""}£${n(Math.abs(v), dp ?? 0)}m`;
      case "GBP bn": return `£${n(v, dp ?? 2)}bn`;
      case "EGP/GBP": return `${n(v, dp ?? 2)} EGP/£`;
      case "customers": case "people": case "firms": return opts.compact ? compact(v, "") : n(v, dp ?? 0);
      case "points": return n(v, dp ?? 0);
      case "rank": return `#${n(v, 0)}`;
      case "years": return `${n(v, 0)} yr`;
      case "bps": return `${n(v, dp ?? 0)} bps`;
      default: return n(v, dp ?? 2);
    }
  }

  /** Format a change: percentages in pp, everything else absolute + relative %. */
  function fmtChange(c, unit) {
    if (!isNum(c.abs)) return "—";
    const sign = c.abs > 0 ? "+" : c.abs < 0 ? "−" : "±";
    if (c.isPP) return `${sign}${Math.abs(c.abs).toLocaleString("en-GB", { maximumFractionDigits: 2 })} pp`;
    const absTxt = fmt(Math.abs(c.abs), unit, { compact: true });
    const rel = isNum(c.rel) ? ` (${c.rel > 0 ? "+" : c.rel < 0 ? "−" : ""}${Math.abs(c.rel).toFixed(1)}%)` : "";
    return `${sign}${absTxt}${rel}`;
  }

  // ------------------------------------------------------------------ CSV
  function csvCell(v) {
    if (v === null || v === undefined) return "";
    const s = String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }
  function toCSV(rows) { return rows.map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n"; }

  /** Minimal RFC-4180 parser (quoted fields, escaped quotes, CRLF). */
  function parseCSV(text) {
    const rows = []; let row = [], cell = "", q = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) {
        if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
        else cell += ch;
      } else if (ch === '"') q = true;
      else if (ch === ",") { row.push(cell); cell = ""; }
      else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && text[i + 1] === "\n") i++;
        row.push(cell); rows.push(row); row = []; cell = "";
      } else cell += ch;
    }
    if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
    return rows.filter((r) => r.some((c) => c.trim() !== ""));
  }

  /**
   * Import inputs from CSV. Format: header row with columns `key,value`
   * (other columns ignored), one row per input. Unknown keys are reported;
   * nothing is applied unless every row is valid.
   */
  function importInputs(text, current) {
    const rows = parseCSV(text.replace(/^﻿/, ""));
    if (!rows.length) return { ok: false, errors: ["The file is empty."] };
    const head = rows[0].map((h) => h.trim().toLowerCase());
    const ki = head.indexOf("key"), vi = head.indexOf("value"), si = head.indexOf("section");
    if (ki < 0 || vi < 0) return { ok: false, errors: ["The first row must contain the column names 'key' and 'value'."] };
    const next = Object.assign({}, current), errors = [], applied = [];
    rows.slice(1).forEach((r, n) => {
      const key = (r[ki] || "").trim();
      if (!key) return;
      // A full dashboard export carries metric and scenario rows too: only "input" rows are read.
      if (si >= 0 && (r[si] || "").trim() !== "input") return;
      const def = D.inputDef(key);
      if (!def) { errors.push(`Row ${n + 2}: '${key}' is not a recognised input key.`); return; }
      const res = validateField(def, r[vi]);
      if (res.error) { errors.push(`Row ${n + 2} (${key}): ${res.error}.`); return; }
      next[key] = res.value; applied.push(key);
    });
    if (!applied.length && !errors.length) errors.push("No input rows were found under the header.");
    if (errors.length) return { ok: false, errors };
    const v = validateInputs(next);
    const cross = Object.keys(v.errors).filter((k) => applied.includes(k));
    if (cross.length) return { ok: false, errors: [...new Set(cross.map((k) => `${k}: ${v.errors[k]}`))] };
    return { ok: true, values: next, applied };
  }

  EQ.engine = {
    isNum, safeDiv, round, parseNumber, validateField, validateInputs, validateScenario,
    METRICS, metricDef, computeMetrics, change, changedInputs, metricDeltas,
    project, tornado, grid, SCENARIO_KEYS, assessRisks, RATIO, profitabilityTable,
    fmt, fmtChange, fmtPlain, toCSV, parseCSV, importInputs,
    PLATFORM_KEYS, PLATFORM_NAMES, PORTFOLIO_KEYS, PORTFOLIO_NAMES,
  };
})(typeof window !== "undefined" ? window : globalThis);
