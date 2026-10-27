/* =====================================================================
 * data.js — original research data, input schema, scenario presets,
 * references. Everything here is FROZEN: the UI copies it into state and
 * never writes back, so the research baseline cannot be overwritten.
 *
 * Provenance codes
 *   labelled   – value printed on a chart label in the slides
 *   chart-read – value read off a chart axis in the slides (approximate)
 *   stated     – value stated in slide text
 *   assumption – NOT from the coursework; illustrative, user-editable
 * ===================================================================== */
(function (root) {
  "use strict";
  const EQ = (root.EQ = root.EQ || {});

  /** @typedef {"labelled"|"chart-read"|"stated"|"assumption"} Provenance */
  /** @typedef {{key:string,label:string,short:string,group:string,unit:string,
   *   min:number,max:number,step:number,integer?:boolean,value:number,
   *   provenance:Provenance,slide:(number|null),asOf:string,entity:string,
   *   kind:"stock"|"share"|"count"|"rate"|"assumption",note:string}} InputDef */

  /** @type {InputDef[]} */
  const INPUTS = [
    // --- Egyptian market position (slide 3, chart "EFG Holding vs. Top Competitors Market Share (2026)")
    { key: "efgBrokerageShare", label: "EFG Hermes share of EGX securities brokerage", short: "EFG brokerage share", group: "market",
      unit: "%", min: 0, max: 100, step: 0.1, value: 29.6, provenance: "labelled", slide: 3, asOf: "2026", entity: "EFG", kind: "share",
      note: "Bar label on research p.3." },
    { key: "compBrokerageShare", label: "Direct competitors' share of EGX brokerage (Thndr / Contact)", short: "Competitor brokerage share", group: "market",
      unit: "%", min: 0, max: 100, step: 0.1, value: 11.9, provenance: "labelled", slide: 3, asOf: "2026", entity: "Competitors", kind: "share",
      note: "Research p.3 labels the series 'Thndr / Contact' as one bar. It is not stated whether this is one firm, the larger of the two, or their sum." },
    { key: "valuBnplShare", label: "EFG Holding (valU) share of consumer finance / BNPL", short: "valU BNPL share", group: "market",
      unit: "%", min: 0, max: 100, step: 0.1, value: 21.0, provenance: "labelled", slide: 3, asOf: "2026", entity: "EFG", kind: "share",
      note: "Bar label on research p.3." },
    { key: "compBnplShare", label: "Direct competitors' share of consumer finance / BNPL", short: "Competitor BNPL share", group: "market",
      unit: "%", min: 0, max: 100, step: 0.1, value: 14.5, provenance: "labelled", slide: 3, asOf: "2026", entity: "Competitors", kind: "share",
      note: "Same series-definition caveat as the brokerage competitor bar." },

    // --- UK platform position (slide 3, chart "UK Financial Adviser Platform Recommendation Share (2026)")
    { key: "quilterRecShare", label: "Quilter share of top-10 adviser platform recommendations", short: "Quilter recommendation share", group: "platform",
      unit: "%", min: 0, max: 100, step: 1, value: 27, provenance: "labelled", slide: 3, asOf: "2026", entity: "Quilter", kind: "share",
      note: "Share of top-10 recommendations, not share of assets or revenue." },
    { key: "avivaRecShare", label: "Aviva share of top-10 adviser platform recommendations", short: "Aviva", group: "platform",
      unit: "%", min: 0, max: 100, step: 1, value: 30, provenance: "labelled", slide: 3, asOf: "2026", entity: "Aviva", kind: "share", note: "" },
    { key: "fidelityRecShare", label: "Fidelity Adviser Solutions share of recommendations", short: "Fidelity Adviser Solutions", group: "platform",
      unit: "%", min: 0, max: 100, step: 1, value: 8, provenance: "labelled", slide: 3, asOf: "2026", entity: "Fidelity", kind: "share", note: "" },
    { key: "ajbellRecShare", label: "AJ Bell Investcentre share of recommendations", short: "AJ Bell Investcentre", group: "platform",
      unit: "%", min: 0, max: 100, step: 1, value: 6, provenance: "labelled", slide: 3, asOf: "2026", entity: "AJ Bell", kind: "share", note: "" },
    { key: "swRecShare", label: "Scottish Widows Platform share of recommendations", short: "Scottish Widows Platform", group: "platform",
      unit: "%", min: 0, max: 100, step: 1, value: 6, provenance: "labelled", slide: 3, asOf: "2026", entity: "Scottish Widows", kind: "share", note: "" },

    // --- Customer scale (slides 4 and 8)
    { key: "valuCustomers", label: "valU active customers", short: "valU customers", group: "customers",
      unit: "customers", min: 0, max: 50000000, step: 1000, integer: true, value: 950000, provenance: "chart-read", slide: 4, asOf: "May 2026", entity: "EFG", kind: "count",
      note: "Read off the research p.4 bar chart (axis 0–1M). Research p.8 reads ≈955,000. Treat as ±25,000." },
    { key: "tanmeyahCustomers", label: "Tanmeyah active customers", short: "Tanmeyah customers", group: "customers",
      unit: "customers", min: 0, max: 50000000, step: 1000, integer: true, value: 230000, provenance: "chart-read", slide: 4, asOf: "Q2 2026", entity: "EFG", kind: "count",
      note: "Read off the research p.4 bar chart. Research p.8 reads ≈234,000." },
    { key: "bankNxtCustomers", label: "Bank NXT active customers", short: "Bank NXT customers", group: "customers",
      unit: "customers", min: 0, max: 50000000, step: 1000, integer: true, value: 105000, provenance: "chart-read", slide: 4, asOf: "Jun 2025", entity: "EFG", kind: "count",
      note: "Read off the research p.4 bar chart. Dated a year earlier than the other EFG figures." },
    { key: "quilterPlatformCustomers", label: "Quilter platform customers", short: "Quilter platform customers", group: "customers",
      unit: "customers", min: 1, max: 50000000, step: 1000, integer: true, value: 480000, provenance: "chart-read", slide: 8, asOf: "2026 (not stated)", entity: "Quilter", kind: "count",
      note: "Research p.8 linear chart reads ≈480,000; research p.4 log-scale chart reads ≈450,000. The linear reading is used as the baseline." },
    { key: "quilterAdviceProfessionals", label: "Advice professionals using Quilter", short: "Advice professionals", group: "customers",
      unit: "people", min: 1, max: 1000000, step: 100, integer: true, value: 22000, provenance: "chart-read", slide: 4, asOf: "2026 (not stated)", entity: "Quilter", kind: "count",
      note: "Read off a log-scale axis on research p.4; precision is low (roughly ±15%)." },
    { key: "quilterAdviserFirms", label: "Adviser firms using Quilter", short: "Adviser firms", group: "customers",
      unit: "firms", min: 1, max: 1000000, step: 100, integer: true, value: 6000, provenance: "chart-read", slide: 4, asOf: "2026 (not stated)", entity: "Quilter", kind: "count",
      note: "Read off a log-scale axis on research p.4; precision is low (roughly ±15%)." },
    { key: "quilterAdvisers", label: "Quilter's own advisers", short: "Quilter advisers", group: "customers",
      unit: "people", min: 1, max: 100000, step: 10, integer: true, value: 1400, provenance: "chart-read", slide: 4, asOf: "2026 (not stated)", entity: "Quilter", kind: "count",
      note: "Read off a log-scale axis on research p.4; precision is low (roughly ±15%)." },

    // --- Balance-sheet stocks (slides 3 and 8)
    { key: "leasingPortfolio", label: "EFG Finance leasing portfolio", short: "Leasing", group: "portfolio",
      unit: "EGP bn", min: 0, max: 1000, step: 0.1, value: 19.7, provenance: "chart-read", slide: 8, asOf: "not stated", entity: "EFG", kind: "stock",
      note: "Read off the research p.8 chart 'EFG Finance portfolio by product line' (axis 0–20)." },
    { key: "valuPortfolio", label: "valU (buy now, pay later) portfolio", short: "valU BNPL", group: "portfolio",
      unit: "EGP bn", min: 0, max: 1000, step: 0.1, value: 16.7, provenance: "chart-read", slide: 8, asOf: "not stated", entity: "EFG", kind: "stock",
      note: "Read off the research p.8 chart." },
    { key: "factoringPortfolio", label: "EFG Finance factoring portfolio", short: "Factoring", group: "portfolio",
      unit: "EGP bn", min: 0, max: 1000, step: 0.1, value: 4.0, provenance: "chart-read", slide: 8, asOf: "not stated", entity: "EFG", kind: "stock",
      note: "Read off the research p.8 chart." },
    { key: "quilterAssets", label: "Quilter assets (\"around £100bn\")", short: "Quilter assets", group: "portfolio",
      unit: "GBP bn", min: 0.1, max: 10000, step: 1, value: 100, provenance: "stated", slide: 3, asOf: "2026", entity: "Quilter", kind: "stock",
      note: "Research p.3 says 'assets valued at around £100bn'. It does not say whether this is assets under management or under administration, or platform-only." },

    // --- Inclusion (slide 4)
    { key: "egyptReachLow", label: "Egypt NBFS reach, lower bound", short: "Egypt reach (low)", group: "inclusion",
      unit: "%", min: 0, max: 100, step: 1, value: 60, provenance: "stated", slide: 4, asOf: "2026", entity: "Egypt", kind: "share",
      note: "Research p.4: services 'have reached 60–70% of the audience'." },
    { key: "egyptReachHigh", label: "Egypt NBFS reach, upper bound", short: "Egypt reach (high)", group: "inclusion",
      unit: "%", min: 0, max: 100, step: 1, value: 70, provenance: "stated", slide: 4, asOf: "2026", entity: "Egypt", kind: "share", note: "" },
    { key: "ukInclusion", label: "UK financial inclusion (target audience met)", short: "UK inclusion", group: "inclusion",
      unit: "%", min: 0, max: 100, step: 1, value: 97, provenance: "stated", slide: 4, asOf: "2026", entity: "UK", kind: "share",
      note: "Research p.4: '97% of the target audience met'. The Egypt and UK measures may not share a definition." },

    // --- EFG Holding FY2025 reported financials (annual results, not in the coursework)
    { key: "efgRevenue", label: "EFG Holding net operating revenue, FY2025", short: "EFG revenue", group: "efgFin",
      unit: "EGP m", min: 0, max: 10000000, step: 1, value: 26029, provenance: "reported", source: "efgRelease", slide: null, asOf: "FY2025", entity: "EFG", kind: "flow",
      note: "Group Performance Summary, FY25 Earnings Release p.5 (management accounts). FY2024: EGP 24,422m." },
    { key: "efgOpex", label: "EFG Holding operating expenses incl. provisions & ECL, FY2025", short: "EFG operating expenses", group: "efgFin",
      unit: "EGP m", min: 0, max: 10000000, step: 1, value: 17536, provenance: "reported", source: "efgRelease", slide: null, asOf: "FY2025", entity: "EFG", kind: "flow",
      note: "'Group Operating Expenses', p.5. Includes provisions and expected credit losses. FY2024: EGP 15,480m." },
    { key: "efgPBT", label: "EFG Holding net profit before tax, FY2025", short: "EFG profit before tax", group: "efgFin",
      unit: "EGP m", min: -10000000, max: 10000000, step: 1, value: 7494, provenance: "reported", source: "efgRelease", slide: null, asOf: "FY2025", entity: "EFG", kind: "flow",
      note: "p.5. FY2024: EGP 7,702m." },
    { key: "efgNetProfit", label: "EFG Holding net profit after tax & minority interest, FY2025", short: "EFG net profit", group: "efgFin",
      unit: "EGP m", min: -10000000, max: 10000000, step: 1, value: 4058, provenance: "reported", source: "efgRelease", slide: null, asOf: "FY2025", entity: "EFG", kind: "flow",
      note: "Management accounts, p.5. The audited IFRS figure is used for ROE below. FY2024: EGP 4,254m." },
    { key: "efgIfrsProfit", label: "EFG profit attributable to shareholders (IFRS), FY2025", short: "EFG IFRS profit to owners", group: "efgFin",
      unit: "EGP m", min: -10000000, max: 10000000, step: 0.1, value: 3753.3, provenance: "reported", source: "efgIfrs", slide: null, asOf: "FY2025", entity: "EFG", kind: "flow",
      note: "'Shareholders of the Holding Company', audited IFRS statements: EGP 3,753,339 thousand. FY2024: EGP 4,098.9m." },
    { key: "efgEquity", label: "EFG equity attributable to owners, 31 Dec 2025", short: "EFG equity (Dec 2025)", group: "efgFin",
      unit: "EGP m", min: 1, max: 10000000, step: 0.1, value: 35422.6, provenance: "reported", source: "efgIfrs", slide: null, asOf: "31 Dec 2025", entity: "EFG", kind: "stock",
      note: "'Equity attributable to owners of the Group': EGP 35,422,599 thousand. Total equity incl. minorities: EGP 44,958.0m." },
    { key: "efgEquityPrior", label: "EFG equity attributable to owners, 31 Dec 2024", short: "EFG equity (Dec 2024)", group: "efgFin",
      unit: "EGP m", min: 1, max: 10000000, step: 0.1, value: 34058.8, provenance: "reported", source: "efgIfrs", slide: null, asOf: "31 Dec 2024", entity: "EFG", kind: "stock",
      note: "Comparative column of the same statement: EGP 34,058,826 thousand." },

    // --- Quilter FY2025 reported financials
    { key: "qRevenue", label: "Quilter total net revenue, FY2025", short: "Quilter revenue", group: "quilterFin",
      unit: "GBP m", min: 0, max: 1000000, step: 1, value: 701, provenance: "reported", source: "quilterResults", slide: null, asOf: "FY2025", entity: "Quilter", kind: "flow",
      note: "2025 Full Year Results. FY2024: £670m." },
    { key: "qOpex", label: "Quilter adjusted operating expenses, FY2025", short: "Quilter operating expenses", group: "quilterFin",
      unit: "GBP m", min: 0, max: 1000000, step: 1, value: 494, provenance: "reported", source: "quilterResults", slide: null, asOf: "FY2025", entity: "Quilter", kind: "flow",
      note: "Adjusted basis (excludes items such as amortisation and business transformation costs). FY2024: £474m." },
    { key: "qAdjPBT", label: "Quilter adjusted profit before tax, FY2025", short: "Quilter adjusted PBT", group: "quilterFin",
      unit: "GBP m", min: -1000000, max: 1000000, step: 1, value: 207, provenance: "reported", source: "quilterResults", slide: null, asOf: "FY2025", entity: "Quilter", kind: "flow",
      note: "Alternative performance measure. FY2024: £196m." },
    { key: "qAdjPAT", label: "Quilter adjusted profit after tax, FY2025", short: "Quilter adjusted profit after tax", group: "quilterFin",
      unit: "GBP m", min: -1000000, max: 1000000, step: 1, value: 154, provenance: "reported", source: "quilterResults", slide: null, asOf: "FY2025", entity: "Quilter", kind: "flow",
      note: "Numerator of Quilter's reported ROE. FY2024: £148m." },
    { key: "qIfrsPAT", label: "Quilter IFRS profit after tax, FY2025", short: "Quilter IFRS profit", group: "quilterFin",
      unit: "GBP m", min: -1000000, max: 1000000, step: 1, value: 120, provenance: "reported", source: "quilterResults", slide: null, asOf: "FY2025", entity: "Quilter", kind: "flow",
      note: "Statutory result. FY2024: loss of £34m." },
    { key: "qEquity", label: "Quilter total equity, 31 Dec 2025", short: "Quilter equity (Dec 2025)", group: "quilterFin",
      unit: "GBP m", min: 1, max: 1000000, step: 1, value: 1466, provenance: "reported", source: "quilterFS", slide: null, asOf: "31 Dec 2025", entity: "Quilter", kind: "stock",
      note: "Consolidated statement of financial position, 'Total equity'." },
    { key: "qEquityPrior", label: "Quilter total equity, 31 Dec 2024", short: "Quilter equity (Dec 2024)", group: "quilterFin",
      unit: "GBP m", min: 1, max: 1000000, step: 1, value: 1423, provenance: "reported", source: "quilterFS", slide: null, asOf: "31 Dec 2024", entity: "Quilter", kind: "stock",
      note: "Comparative column of the same statement." },
    { key: "qMgmtFees", label: "Quilter net management fees, FY2025", short: "Quilter management fees", group: "quilterFin",
      unit: "GBP m", min: 0, max: 1000000, step: 1, value: 538, provenance: "reported", source: "quilterResults", slide: null, asOf: "FY2025", entity: "Quilter", kind: "flow",
      note: "Part of total net revenue. FY2024: £502m." },
    { key: "qAuma", label: "Quilter assets under management and administration, 31 Dec 2025", short: "Quilter AuMA (Dec 2025)", group: "quilterFin",
      unit: "GBP bn", min: 0.1, max: 10000, step: 0.1, value: 141.2, provenance: "reported", source: "quilterResults", slide: null, asOf: "31 Dec 2025", entity: "Quilter", kind: "stock",
      note: "Total AuMA. Platform assets under administration alone were £104.6bn." },
    { key: "qAumaPrior", label: "Quilter AuMA, 31 Dec 2024", short: "Quilter AuMA (Dec 2024)", group: "quilterFin",
      unit: "GBP bn", min: 0.1, max: 10000, step: 0.1, value: 119.4, provenance: "reported", source: "quilterResults", slide: null, asOf: "31 Dec 2024", entity: "Quilter", kind: "stock", note: "" },

    // --- Analyst assumptions (not in the coursework)
    { key: "fxEgpPerGbp", label: "Exchange rate (EGP per £1)", short: "EGP per GBP", group: "assumptions",
      unit: "EGP/GBP", min: 1, max: 1000, step: 0.5, value: 65, provenance: "assumption", slide: null, asOf: "user-set", entity: "FX", kind: "assumption",
      note: "not in the original research. Illustrative placeholder only: replace it with the Central Bank of Egypt rate for your reporting date." },
    { key: "productOverlap", label: "Customers counted in more than one EFG product", short: "Product overlap", group: "assumptions",
      unit: "%", min: 0, max: 90, step: 1, value: 0, provenance: "assumption", slide: null, asOf: "user-set", entity: "EFG", kind: "assumption",
      note: "not in the original research. At 0% the valU + Tanmeyah + Bank NXT total is an upper bound on unique customers." },
  ];

  const GROUPS = {
    market: { title: "Egyptian market position", hint: "2026 market shares" },
    platform: { title: "UK adviser platform recommendations", hint: "Share of top-10 recommendations, 2026" },
    customers: { title: "Customer and adviser scale", hint: "Most values read off the research charts" },
    portfolio: { title: "Portfolios and assets", hint: "Point-in-time stocks" },
    inclusion: { title: "Financial inclusion", hint: "Reach and inclusion rates" },
    efgFin: { title: "EFG Holding reported financials, FY2025", hint: "From EFG Holding's FY2025 results, not the research. Income figures in EGP million" },
    quilterFin: { title: "Quilter reported financials, FY2025", hint: "From Quilter's 2025 full-year results, not the research. Figures in GBP million unless shown" },
    assumptions: { title: "Analyst assumptions", hint: "not in the original research. Edit to suit your reporting date" },
  };

  /* Scenario assumptions for the illustrative EFG savings & investment
   * platform model (recommendations on slide 9). None of these values come
   * from the coursework. */
  const SCENARIO_FIELDS = [
    { key: "horizon", label: "Horizon", short: "Horizon", unit: "years", min: 1, max: 15, step: 1, integer: true,
      help: "Number of years projected." },
    { key: "growth", label: "Digital customer growth", short: "Customer growth", unit: "% p.a.", min: -20, max: 60, step: 0.5,
      help: "Annual growth in the combined EFG digital customer base." },
    { key: "adoption", label: "Customers with a savings product by final year", short: "Adoption", unit: "%", min: 0, max: 100, step: 0.5,
      help: "Share of customers holding a savings or investment product by the final year. Adoption ramps up in a straight line from zero." },
    { key: "balance", label: "Average invested balance at launch", short: "Launch balance", unit: "EGP", min: 0, max: 10000000, step: 500,
      help: "Average balance per adopting customer in year 1, in Egyptian pounds." },
    { key: "balanceGrowth", label: "Balance growth (contributions + returns)", short: "Balance growth", unit: "% p.a.", min: -50, max: 100, step: 0.5,
      help: "Nominal annual growth of the average balance in EGP." },
    { key: "feeBps", label: "Platform fee", short: "Platform fee", unit: "bps", min: 0, max: 500, step: 5,
      help: "Annual fee charged on assets, in basis points (100 bps = 1%)." },
    { key: "fxDep", label: "EGP depreciation against GBP", short: "EGP depreciation", unit: "% p.a.", min: -30, max: 100, step: 0.5,
      help: "Annual rise in EGP per £1. Reflects the currency risk named in the research." },
  ];

  const SCENARIO_PRESETS = {
    base:        { id: "base", name: "Base", horizon: 5, growth: 8, adoption: 10, balance: 20000, balanceGrowth: 12, feeBps: 75, fxDep: 8,
      blurb: "Moderate growth with a gradual move into savings, continuing the strategy described in the research." },
    optimistic:  { id: "optimistic", name: "Optimistic", horizon: 5, growth: 15, adoption: 20, balance: 30000, balanceGrowth: 15, feeBps: 75, fxDep: 4,
      blurb: "Faster digital adoption and a stable currency." },
    adverse:     { id: "adverse", name: "Adverse", horizon: 5, growth: 3, adoption: 5, balance: 12000, balanceGrowth: 8, feeBps: 60, fxDep: 20,
      blurb: "Low financial literacy slows adoption and the currency weakens sharply." },
  };

  /* Ranges used for one-at-a-time sensitivity (tornado). */
  const SENSITIVITY_SWINGS = {
    growth: { delta: 5, mode: "abs" },
    adoption: { delta: 5, mode: "abs" },
    balance: { delta: 0.25, mode: "rel" },
    balanceGrowth: { delta: 4, mode: "abs" },
    fxDep: { delta: 8, mode: "abs" },
    feeBps: { delta: 25, mode: "abs" },
  };

  /* Thresholds for the risk monitor. All are analyst assumptions; none is a
   * regulatory limit. Users can edit them in the Risks section. */
  const THRESHOLDS = {
    fxLossWatch: { value: 25, unit: "%", label: "Currency translation loss: watch at", help: "Share of GBP value lost to EGP depreciation over the horizon." },
    fxLossElevated: { value: 40, unit: "%", label: "Currency translation loss: elevated at" },
    concWatch: { value: 40, unit: "%", label: "Largest product line: watch at", help: "Share of the EFG Finance portfolio in one product line." },
    concElevated: { value: 60, unit: "%", label: "Largest product line: elevated at" },
    rmsWatch: { value: 1.5, unit: "×", label: "Relative market share: watch below", help: "EFG share divided by its direct competitors' share." },
    rmsElevated: { value: 1.0, unit: "×", label: "Relative market share: elevated below" },
    gapWatch: { value: 20, unit: "pp", label: "Inclusion gap: watch at", help: "UK inclusion minus Egypt reach (mid-point)." },
    gapElevated: { value: 35, unit: "pp", label: "Inclusion gap: elevated at" },
    headroomWatch: { value: 5, unit: "pp", label: "UK inclusion headroom: watch at or below", help: "100% minus UK inclusion." },
    ciWatch: { value: 65, unit: "%", label: "EFG cost-to-income: watch at", help: "Operating expenses incl. provisions ÷ revenue." },
    ciElevated: { value: 75, unit: "%", label: "EFG cost-to-income: elevated at" },
  };

  /* FY2024 comparatives, as reported in the same FY2025 documents. Fixed:
   * they are history, so the Input lab does not edit them. */
  const PRIOR = {
    efgRevenue: 24422, efgOpex: 15480, efgPBT: 7702, efgNetProfit: 4254, efgIfrsProfit: 4098.9,
    qRevenue: 670, qOpex: 474, qAdjPBT: 196, qAdjPAT: 148, qIfrsPAT: -34, qMgmtFees: 502,
    qReportedROE: 10.0, qReportedRevenueMargin: 44,
  };
  /* Ratios the companies publish themselves, to check the dashboard's own calculations. */
  const REPORTED_RATIOS = {
    qOperatingMargin: { fy25: 30, fy24: 29, unit: "%", label: "Quilter operating margin (adjusted PBT ÷ total net revenue)", source: "quilterResults" },
    qROE: { fy25: 10.8, fy24: 10.0, unit: "%", label: "Quilter return on equity (adjusted PAT ÷ average equity)", source: "quilterResults" },
    qRevenueMargin: { fy25: 42, fy24: 44, unit: "bps", label: "Quilter revenue margin (net management fees ÷ average AuMA)", source: "quilterResults" },
    efgNetOperatingMargin: { fy25: 33, fy24: 37, unit: "%", label: "EFG net operating margin (net operating profit ÷ revenue)", source: "efgRelease" },
  };

  /* Slide figures checked against the annual results. `load` is the value the
   * "Load reported values" action writes into the Input lab (same definition
   * as the slide input); null means the definitions differ too much to swap. */
  const RECONCILE = [
    { key: "efgBrokerageShare", reported: 27.8, unit: "%", load: 27.8, asOf: "FY2025", source: "efgRelease",
      note: "EGX brokerage market share by executions, FY25 (4Q25: 26.2%). EFG ranked #1." },
    { key: "valuCustomers", reported: 902000, unit: "customers", load: 902000, asOf: "Dec 2025", source: "efgRelease",
      note: "'Valu Active Customers' 902 thousand (4Q25)." },
    { key: "tanmeyahCustomers", reported: 274231, unit: "customers", load: 274231, asOf: "Dec 2025", source: "efgRelease",
      note: "'Number of Active Borrowers' (4Q25)." },
    { key: "valuPortfolio", reported: 14.555, unit: "EGP bn", load: 14.555, asOf: "Dec 2025", source: "efgRelease",
      note: "Outstanding portfolio incl. EGP 4.96bn securitised (principal only)." },
    { key: "leasingPortfolio", reported: 18.976, unit: "EGP bn", load: 18.976, asOf: "Dec 2025", source: "efgRelease",
      note: "EGP 14.26bn on balance sheet + EGP 4.71bn securitised, to match the valU basis." },
    { key: "factoringPortfolio", reported: 5.696, unit: "EGP bn", load: 5.696, asOf: "Dec 2025", source: "efgRelease",
      note: "'Total Outstanding Portfolio' for factoring (4Q25)." },
    { key: "quilterAssets", reported: 104.6, unit: "GBP bn", load: 104.6, asOf: "Dec 2025", source: "quilterResults",
      note: "Platform assets under administration. Total AuMA was £141.2bn; the research's '~£100bn' matches the platform figure more closely." },
    { key: "quilterAdvisers", reported: 1453, unit: "people", load: 1453, asOf: "Dec 2025", source: "quilterResults",
      note: "Restricted financial planners (RFPs)." },
  ];

  const REFERENCES = [
    { id: "quilter", cite: "Quilter (2026)", text: "Quilter. (2026). Quilter Invest. Retrieved from", url: "https://www.quilter.com/about-us/money-needs-a-plan/quilter-invest/?Role=adv" },
    { id: "efg", cite: "EFG Holding (2026)", text: "EFG Holding. (2026). Tanmeyah. Retrieved from", url: "https://tanmeyah.com/ar" },
    { id: "fra", cite: "FRA (2026)", text: "FRA. (2026). Financial Regulatory Authority. Retrieved from", url: "https://fra.gov.eg/" },
    { id: "cbe", cite: "Central Bank of Egypt (2026)", text: "Central Bank Of Egypt. (2026). CBE. Retrieved from", url: "https://www.cbe.org.eg/en/" },
    { id: "fca", cite: "FCA (2026)", text: "FCA. (2026). Financial Conduct Authority. Retrieved from", url: "https://www.fca.org.uk/" },
  ];

  /* Input Lab presets. Values override the research data; anything not listed
   * keeps its research value. The two "hypothetical" sets are illustrative
   * what-ifs, not forecasts. */
  const reportedValues = {};
  RECONCILE.forEach((r) => { if (r.load !== null) reportedValues[r.key] = r.load; });
  const INPUT_PRESETS = [
    { id: "research", name: "Research data", kind: "research", values: {},
      blurb: "The original study figures. Your starting point." },
    { id: "reported", name: "FY2025 actuals", kind: "reported", values: reportedValues,
      blurb: "Swap in year-end figures from the companies' annual results." },
    { id: "growth", name: "Digital growth", kind: "hypothetical",
      values: { efgBrokerageShare: 32, valuBnplShare: 25, compBnplShare: 13, valuCustomers: 1200000, tanmeyahCustomers: 280000,
        bankNxtCustomers: 150000, valuPortfolio: 21, fxEgpPerGbp: 60, efgRevenue: 28500, efgNetProfit: 4700, efgIfrsProfit: 4350 },
      blurb: "EFG's digital push lands: more users, a bigger share and a steadier pound." },
    { id: "stress", name: "Stress test", kind: "hypothetical",
      values: { compBrokerageShare: 16, compBnplShare: 22, valuCustomers: 820000, valuPortfolio: 14, fxEgpPerGbp: 85,
        efgOpex: 19600, efgPBT: 5400, efgNetProfit: 3050, efgIfrsProfit: 2800 },
      blurb: "Rivals overtake valU, costs jump 12% and the pound weakens." },
  ];

  /* Sources added for the reported financials (not cited in the coursework). */
  const FIN_REFERENCES = [
    { id: "efgRelease", cite: "EFG Holding (2026a)", text: "EFG Holding. (2026a, March 18). Earnings release FY2025 (management accounts). Retrieved from",
      url: "https://efgholding.com/uploads/EFG_Holding_FY_2025_Earnings_Release_86c37e7408.pdf" },
    { id: "efgIfrs", cite: "EFG Holding (2026b)", text: "EFG Holding S.A.E. (2026b, April 30). Final results IFRS 2025 [Regulatory announcement]. Retrieved from",
      url: "https://www.investegate.co.uk/announcement/rns/efg-hermes-holding-s-a-e---efgd/final-results-ifrs-2025-/9547742" },
    { id: "quilterResults", cite: "Quilter (2026a)", text: "Quilter plc. (2026a, March 4). 2025 full year results [Part 1] [Regulatory announcement]. Retrieved from",
      url: "https://www.investegate.co.uk/announcement/rns/quilter--qlt/quilter-plc-2025-full-year-results-part-1-/9456957" },
    { id: "quilterFS", cite: "Quilter (2026b)", text: "Quilter plc. (2026b, March 4). Preliminary announcement: financial statements for the year ended 31 December 2025. FCA National Storage Mechanism. Retrieved from",
      url: "https://data.fca.org.uk/artefacts/NSM/RNS/daa41f32-5422-49dc-8b56-6041bb3b3e91.html" },
  ];

  const STUDY = {
    title: "Comparative Analysis of EFG Hermes & Quilter",
    subtitle: "Non-bank financial services: key products and services",
    question: "How do EFG Hermes (Egypt) and Quilter (UK) differ in business model, market position and digital strategy, and which parts of Quilter's model could EFG adopt?",
    period: "Figures dated June 2025 to 2026; several undated",
    course: "Financial Services · October 2026",
    authors: ["Ali Azzam", "Zead El Yamany", "Youssef Ragab", "Samuel John"],
    closing: "Two markets, two calibres, one shared shift towards digital investment",
  };

  /* Qualitative facts used in the overview and conclusions (slide text). */
  const FACTS = [
    { entity: "EFG", text: "Founded 1984; listed on the EGX and LSE. Investment banking, brokerage and private equity; EFG Finance adds fintech, mortgage, microfinance and SME lending.", slide: 3 },
    { entity: "Quilter", text: "Heritage dating to 1771; listed on the LSE. Advised investment platform, multi-asset funds and financial planning.", slide: 3 },
    { entity: "Egypt", text: "Concentrated market with two regulators (CBE and FRA). Fintech laws widening market access arrived only in 2022.", slide: 4 },
    { entity: "UK", text: "Highly competitive market regulated by the FCA. ISAs are the core product. The challenge is growth, not access.", slide: 4 },
    { entity: "EFG", text: "ISO 27001 certified for information security, with group-level data protection policies.", slide: 6 },
    { entity: "Quilter", text: "Layered technical, organisational and procedural controls, with certified cloud data centres.", slide: 6 },
  ];

  const freeze = (o) => { Object.values(o).forEach((v) => v && typeof v === "object" && freeze(v)); return Object.freeze(o); };
  /** Fresh, mutable copy of the research values, keyed by input key. */
  function baselineInputs() {
    const o = {};
    INPUTS.forEach((d) => (o[d.key] = d.value));
    return o;
  }
  function inputDef(key) { return INPUTS.find((d) => d.key === key); }

  const finRef = (id) => FIN_REFERENCES.find((r) => r.id === id);

  EQ.data = freeze({ INPUTS, GROUPS, SCENARIO_FIELDS, SCENARIO_PRESETS, SENSITIVITY_SWINGS, THRESHOLDS, REFERENCES, STUDY, FACTS,
    PRIOR, REPORTED_RATIOS, RECONCILE, FIN_REFERENCES, INPUT_PRESETS, baselineInputs, inputDef, finRef });
})(typeof window !== "undefined" ? window : globalThis);
