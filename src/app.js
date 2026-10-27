/* =====================================================================
 * app.js — React UI. Written with htm (tagged templates) so it runs in
 * the browser with no build step. All numbers come from EQ.engine.
 * ===================================================================== */
(function () {
  "use strict";
  const { useState, useMemo, useEffect, useRef, useCallback } = React;
  const html = htm.bind(React.createElement);
  const R = Recharts;
  const { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line, Cell, LabelList, ReferenceLine } = R;
  const D = EQ.data, E = EQ.engine, I = EQ.interpret;
  const f = E.fmt, isNum = E.isNum;
  const REDUCED = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ANIM = !REDUCED;

  // ------------------------------------------------------------------ icons (Lucide paths)
  const ICONS = {
    reset: html`<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" />`,
    download: html`<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />`,
    upload: html`<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />`,
    alert: html`<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />`,
    octagon: html`<polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />`,
    info: html`<circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />`,
    check: html`<polyline points="20 6 9 17 4 12" />`,
    file: html`<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />`,
    play: html`<polygon points="6 3 20 12 6 21 6 3" />`,
    search: html`<circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />`,
    undo: html`<path d="M3 7v6h6" /><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />`,
    copy: html`<rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />`,
  };
  const Icon = ({ name, size }) => html`<svg viewBox="0 0 24 24" width=${size || 15} height=${size || 15} fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;

  // ------------------------------------------------------------------ theme tokens for charts
  const TOKENS = ["efg", "quilter", "rival", "neutral", "ink", "ink-2", "ink-3", "rule", "surface", "paper", "band"];
  function readTokens() {
    const cs = getComputedStyle(document.documentElement), o = {};
    TOKENS.forEach((t) => (o[t] = cs.getPropertyValue("--" + t).trim()));
    o.dark = cs.getPropertyValue("color-scheme").includes("dark");
    return o;
  }
  function useTokens() {
    const [t, setT] = useState(readTokens);
    useEffect(() => {
      const upd = () => setT(readTokens());
      const mq = matchMedia("(prefers-color-scheme: dark)");
      mq.addEventListener ? mq.addEventListener("change", upd) : mq.addListener(upd);
      const mo = new MutationObserver(upd);
      mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class", "style"] });
      return () => { mo.disconnect(); mq.removeEventListener ? mq.removeEventListener("change", upd) : mq.removeListener(upd); };
    }, []);
    return t;
  }
  // Blue sequential ramp (palette reference), light → dark.
  const BLUE_RAMP = ["#cde2fb", "#b7d3f6", "#9ec5f4", "#86b6ef", "#6da7ec", "#5598e7", "#3987e5", "#2a78d6", "#256abf", "#1c5cab", "#184f95", "#104281", "#0d366b"];
  /** Percent axis with round ticks: 0 to the next multiple of 5 (10 above 50%). */
  function shareAxis(values) {
    const mx = Math.max(0, ...values.filter(isNum));
    const step = mx > 50 ? 10 : 5, top = Math.min(100, Math.max(35, Math.ceil((mx * 1.08) / step) * step));
    const ticks = []; for (let v = 0; v <= top; v += step) ticks.push(v);
    return { domain: [0, top], ticks };
  }
  /** Log axis spanning whole decades, one tick per decade. */
  function logAxis(values) {
    const v = values.filter((x) => isNum(x) && x > 0);
    if (!v.length) return { domain: [1, 10] };
    const lo = Math.pow(10, Math.floor(Math.log10(Math.min(...v)))), hi = Math.pow(10, Math.ceil(Math.log10(Math.max(...v)) + 0.15));
    const ticks = []; for (let x = lo; x <= hi; x *= 10) ticks.push(x);
    return { domain: [lo, hi], ticks };
  }
  const SCEN_COLORS = (t) => ({ base: t.ink, optimistic: t.efg, adverse: t.rival, custom: "#7a6be0" });

  // ------------------------------------------------------------------ small components
  const STATUS = {
    ok: { label: "Within threshold", icon: "check" },
    watch: { label: "Watch", icon: "alert" },
    elevated: { label: "Elevated", icon: "octagon" },
    qualitative: { label: "Qualitative only", icon: "info" },
    missing: { label: "Missing data", icon: "info" },
  };
  const Pill = ({ status }) => html`<span className=${"eq-pill " + status}><${Icon} name=${STATUS[status].icon} size=${12} />${STATUS[status].label}</span>`;
  const PROV_LABEL = { labelled: "Chart label", "chart-read": "Read off chart", stated: "Report text", assumption: "Assumption", calculated: "Calculated", user: "Your input", reported: "Annual report",
    research: "Research data", hypothetical: "Hypothetical" };
  /** Where an input comes from, in words: the research, a cited report, or neither. */
  const sourceOf = (d) => (d.slide ? `Research p.${d.slide}` : d.source ? D.finRef(d.source).cite : "Assumption (not in research)");
  const Prov = ({ kind, title }) => html`<span className=${"eq-prov " + (kind === "chart-read" ? "chart" : kind)} title=${title || ""}>${PROV_LABEL[kind]}</span>`;

  function Section({ id, eyebrow, title, lede, children }) {
    return html`<section className="eq-section" id=${id} aria-labelledby=${id + "-h"}>
      <div className="eq-sec-head">
        <span className="eq-eyebrow">${eyebrow}</span>
        <h2 id=${id + "-h"}>${title}</h2>
        ${lede && html`<p className="eq-lede">${lede}</p>`}
      </div>
      ${children}
    </section>`;
  }

  function Seg({ value, options, onChange, label }) {
    return html`<div className="eq-seg" role="group" aria-label=${label}>
      ${options.map((o) => html`<button key=${o.value} type="button" aria-pressed=${value === o.value} onClick=${() => onChange(o.value)}>${o.label}</button>`)}
    </div>`;
  }

  function Tip({ active, payload, label, unit, fmtOpts, title }) {
    if (!active || !payload || !payload.length) return null;
    return html`<div className="eq-tip">
      <b>${title || label}</b>
      ${payload.filter((p) => p.value !== undefined && p.value !== null).map((p, k) => html`<div className="eq-tip-row" key=${k}>
        <span><i className="eq-sw" style=${{ background: p.color || p.payload.fill || p.fill }}></i>${p.name}</span>
        <span>${f(Array.isArray(p.value) ? p.value[1] - p.value[0] : p.value, p.unit || unit, fmtOpts)}</span>
      </div>`)}
    </div>`;
  }

  /** Accessible data table behind every chart. */
  function DataTable({ caption, cols, rows }) {
    return html`<details className="eq-more eq-noprint">
      <summary>Show the data as a table</summary>
      <div className="eq-tablewrap" style=${{ marginTop: 8 }}>
        <table className="eq-table"><caption className="sr-only">${caption}</caption>
          <thead><tr>${cols.map((c, k) => html`<th key=${k} className=${k ? "r" : ""} scope="col">${c}</th>`)}</tr></thead>
          <tbody>${rows.map((r, k) => html`<tr key=${k}>${r.map((c, j) => html`<td key=${j} className=${j ? "r" : ""}>${c}</td>`)}</tr>`)}</tbody>
        </table>
      </div>
    </details>`;
  }

  function ChartPanel({ title, question, children, source, table, controls }) {
    return html`<div className="eq-panel">
      <div className="eq-panel-head">
        <div><h3>${title}</h3><p className="eq-q">${question}</p></div>
        ${controls}
      </div>
      ${children}
      ${table}
      <p className="eq-source">${source}</p>
    </div>`;
  }

  // ------------------------------------------------------------------ number input with validation
  /** Slider bounds that suit the input: 0–100 for shares, otherwise around the research value. */
  function sliderRange(def, base) {
    if (def.unit === "%") return [def.min, Math.min(def.max, 100)];
    const nice = (x) => { const p = Math.pow(10, Math.floor(Math.log10(Math.abs(x) || 1))); return Math.ceil(x / p) * p; };
    const hi = Math.min(def.max, nice(Math.abs(base) * 2));
    return [def.min < 0 ? -nice(Math.abs(base)) : Math.max(def.min, 0), hi];
  }
  const LIVE_IDS = ["brokerageRMS", "customerScale", "efgFinancePortfolio", "valueIntensity", "efgROE", "efgCostIncome"];
  const LIVE_LABEL = { brokerageRMS: "Brokerage lead", customerScale: "Customer scale", efgFinancePortfolio: "EFG credit book",
    valueIntensity: "Value per customer gap", efgROE: "EFG ROE", efgCostIncome: "EFG cost-to-income" };
  const AFFECTS = {};
  E.METRICS.forEach((m) => m.deps.forEach((k) => (AFFECTS[k] = AFFECTS[k] || []).push(m.label)));
  const REPORTED_FOR = {};
  D.RECONCILE.forEach((r) => (REPORTED_FOR[r.key] = r));

  function NumField({ def, raw, error, baseline, onChange, onReset, onSet, onSnapshot }) {
    const id = "in-" + def.key;
    const parsed = E.parseNumber(raw).value;
    const changed = !error && isNum(parsed) && parsed !== baseline;
    const [lo, hi] = sliderRange(def, baseline);
    const rep = REPORTED_FOR[def.key];
    const nudge = (dir) => {
      const cur = isNum(parsed) ? parsed : baseline;
      let v = def.unit === "%" ? cur + dir : cur * (1 + dir * 0.1);
      v = Math.min(def.max, Math.max(def.min, def.integer ? Math.round(v) : Math.round(v * 1000) / 1000));
      onSet(def.key, v);
    };
    const aff = AFFECTS[def.key] || [];
    return html`<div className=${"eq-field" + (changed ? " is-changed" : "") + (error ? " is-invalid" : "")}>
      <div>
        <label htmlFor=${id}>${def.label}</label>
        <div className="eq-field-meta">
          <${Prov} kind=${changed ? "user" : def.provenance} />
          <span>${sourceOf(def)} · ${def.asOf}</span>
          ${(changed || error) && html`<button type="button" className="eq-mini" onClick=${onReset}>Reset</button>`}
        </div>
      </div>
      <div className="eq-inbox">
        <input id=${id} type="text" inputMode="decimal" value=${raw ?? ""} aria-invalid=${!!error}
          aria-describedby=${error ? id + "-err" : def.note ? id + "-note" : undefined}
          onFocus=${onSnapshot} onChange=${(e) => onChange(def.key, e.target.value)} />
        <span className="eq-unit">${def.unit}</span>
      </div>
      <input className="eq-range" type="range" min=${lo} max=${hi} step=${def.step} aria-label=${def.label + " slider"}
        value=${isNum(parsed) ? Math.min(hi, Math.max(lo, parsed)) : baseline}
        onPointerDown=${onSnapshot} onKeyDown=${onSnapshot} onChange=${(e) => onChange(def.key, Number(e.target.value))} />
      <div className="eq-chips">
        ${changed && html`<button type="button" className="eq-chip-btn" onClick=${() => onSet(def.key, baseline)}>Research ${f(baseline, def.unit, { compact: true })}</button>`}
        ${rep && parsed !== rep.load && html`<button type="button" className="eq-chip-btn teal" title=${rep.note} onClick=${() => onSet(def.key, rep.load)}>FY2025 actual ${f(rep.load, def.unit, { compact: true, dp: def.unit === "EGP bn" ? 2 : undefined })}</button>`}
        <button type="button" className="eq-chip-btn" aria-label=${"Decrease " + def.short} onClick=${() => nudge(-1)}>${def.unit === "%" ? "−1 pp" : "−10%"}</button>
        <button type="button" className="eq-chip-btn" aria-label=${"Increase " + def.short} onClick=${() => nudge(1)}>${def.unit === "%" ? "+1 pp" : "+10%"}</button>
      </div>
      ${error && html`<p className="eq-err" id=${id + "-err"} role="alert">${error}</p>`}
      ${aff.length > 0 && html`<p className="eq-impact">Moves <b>${aff.slice(0, 3).join(" · ")}</b>${aff.length > 3 ? ` and ${aff.length - 3} more` : ""}</p>`}
      ${def.note && html`<p className="eq-note" id=${id + "-note"}>${def.note}</p>`}
    </div>`;
  }

  // ------------------------------------------------------------------ download helper
  function useDownloads(showModal, toast) {
    const ref = useRef(null);
    useEffect(() => {
      try {
        if (window.claude && typeof window.claude.use === "function") {
          window.claude.use("downloads").then((d) => (ref.current = d)).catch(() => {});
        }
      } catch (e) { /* not in a viewer */ }
    }, []);
    return useCallback(async (filename, text) => {
      const dl = ref.current;
      if (dl) {
        try { await dl.save({ filename, data: text }); toast(`Saved ${filename}`); return; }
        catch (e) {
          if (e && e.code === "declined") { toast("Download cancelled"); return; }
          if (e && e.code === "rate_limited") { toast("A download prompt is already open"); return; }
        }
      } else if (typeof Blob !== "undefined" && !window.claude) {
        // Hosted on an ordinary website (not inside Claude): a normal browser download works.
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
        a.download = filename; document.body.appendChild(a); a.click(); a.remove();
        toast(`Saved ${filename}`); return;
      }
      showModal({ filename, text });
    }, [showModal, toast]);
  }

  function ExportModal({ data, onClose }) {
    const ta = useRef(null);
    const [copied, setCopied] = useState(false);
    useEffect(() => {
      const k = (e) => e.key === "Escape" && onClose();
      addEventListener("keydown", k); return () => removeEventListener("keydown", k);
    }, [onClose]);
    const copy = () => {
      const done = () => setCopied(true);
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(data.text).then(done).catch(() => { ta.current.select(); });
      else ta.current.select();
    };
    return html`<div className="eq-modal-back" onClick=${(e) => e.target === e.currentTarget && onClose()}>
      <div className="eq-modal" role="dialog" aria-modal="true" aria-labelledby="exp-h">
        <h3 id="exp-h">${data.filename}</h3>
        <p className="eq-kpi-text">Downloads are not available in this view. Copy the contents below and save them as <b>${data.filename}</b>.</p>
        <textarea ref=${ta} readOnly value=${data.text} aria-label="File contents"></textarea>
        <div className="eq-actions">
          <button type="button" className="eq-btn primary" onClick=${copy}><${Icon} name=${copied ? "check" : "copy"} />${copied ? "Copied" : "Copy to clipboard"}</button>
          <button type="button" className="eq-btn" onClick=${onClose}>Close</button>
        </div>
      </div>
    </div>`;
  }

  // ================================================================== APP
  function App() {
    const baseline = useMemo(() => D.baselineInputs(), []);
    const [raw, setRaw] = useState(() => D.baselineInputs());
    const validation = useMemo(() => E.validateInputs(raw), [raw]);
    const inputs = validation.clean;
    const metrics = useMemo(() => E.computeMetrics(inputs), [inputs]);
    const baseMetrics = useMemo(() => E.computeMetrics(baseline), [baseline]);
    const changed = useMemo(() => E.changedInputs(inputs, baseline), [inputs, baseline]);
    const deltas = useMemo(() => E.metricDeltas(metrics, baseMetrics, changed), [metrics, baseMetrics, changed]);

    // scenarios
    const [selScen, setSelScen] = useState("base");
    const [customRaw, setCustomRaw] = useState(() => Object.assign({}, D.SCENARIO_PRESETS.base));
    const customV = useMemo(() => E.validateScenario(customRaw), [customRaw]);
    const scenarios = useMemo(() => ({
      base: D.SCENARIO_PRESETS.base, optimistic: D.SCENARIO_PRESETS.optimistic, adverse: D.SCENARIO_PRESETS.adverse,
      custom: Object.assign({ id: "custom", name: "Custom", blurb: "Your own assumptions." }, customV.clean),
    }), [customV]);
    const results = useMemo(() => {
      const o = {}; Object.keys(scenarios).forEach((k) => (o[k] = E.project(inputs, scenarios[k]))); return o;
    }, [inputs, scenarios]);
    const baseResults = useMemo(() => E.project(baseline, D.SCENARIO_PRESETS.base), [baseline]);

    // thresholds
    const defTh = useMemo(() => { const o = {}; Object.keys(D.THRESHOLDS).forEach((k) => (o[k] = D.THRESHOLDS[k].value)); return o; }, []);
    const [thRaw, setThRaw] = useState(defTh);
    const th = useMemo(() => { const o = {}; Object.keys(defTh).forEach((k) => { const p = E.parseNumber(thRaw[k]); o[k] = p.error ? defTh[k] : p.value; }); return o; }, [thRaw, defTh]);
    const risks = useMemo(() => E.assessRisks(metrics, results[selScen], th), [metrics, results, selScen, th]);
    const baseRisks = useMemo(() => E.assessRisks(baseMetrics, baseResults, defTh), [baseMetrics, baseResults, defTh]);

    // ui state
    const [modal, setModal] = useState(null);
    const [toastMsg, setToastMsg] = useState(null);
    const toastT = useRef(null);
    const toast = useCallback((m) => { setToastMsg(m); clearTimeout(toastT.current); toastT.current = setTimeout(() => setToastMsg(null), 2600); }, []);
    const save = useDownloads(setModal, toast);
    const tokens = useTokens();

    // Undo history: a snapshot is taken before each discrete action (focus, slider grab, chip, preset, reset).
    const history = useRef([]);
    const rawRef = useRef(raw); rawRef.current = raw;
    const [histLen, setHistLen] = useState(0);
    const snapshot = useCallback(() => {
      const h = history.current, cur = rawRef.current;
      if (h.length && JSON.stringify(h[h.length - 1]) === JSON.stringify(cur)) return;
      h.push(Object.assign({}, cur)); if (h.length > 60) h.shift();
      setHistLen(h.length);
    }, []);
    const undo = useCallback(() => {
      const h = history.current;
      while (h.length && JSON.stringify(h[h.length - 1]) === JSON.stringify(rawRef.current)) h.pop();
      if (!h.length) { setHistLen(0); return; }
      setRaw(h.pop()); setHistLen(h.length); toast("Undone");
    }, [toast]);
    useEffect(() => {
      const k = (e) => {
        const tag = (document.activeElement && document.activeElement.tagName) || "";
        if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === "z" && tag !== "INPUT" && tag !== "TEXTAREA") { e.preventDefault(); undo(); }
      };
      addEventListener("keydown", k); return () => removeEventListener("keydown", k);
    }, [undo]);

    const setInput = useCallback((k, v) => setRaw((r) => Object.assign({}, r, { [k]: v })), []);
    const setTracked = useCallback((k, v) => { snapshot(); setRaw((r) => Object.assign({}, r, { [k]: v })); }, [snapshot]);
    const resetInput = useCallback((k) => setTracked(k, baseline[k]), [baseline, setTracked]);
    const restoreAll = () => { snapshot(); setRaw(D.baselineInputs()); toast("Research values restored"); };
    const applyPreset = (pr) => {
      snapshot();
      setRaw(Object.assign(D.baselineInputs(), pr.values));
      toast(pr.id === "research" ? "Research values restored" : `${pr.name} applied: ${Object.keys(pr.values).length} values changed`);
    };

    const nErrors = Object.keys(validation.errors).length;
    const ctx = { baseline, raw, inputs, metrics, baseMetrics, changed, deltas, validation, scenarios, results, baseResults, selScen, setSelScen,
      customRaw, setCustomRaw, customV, risks, baseRisks, th, thRaw, setThRaw, defTh, tokens, setInput, resetInput, restoreAll, save, toast, setRaw, nErrors,
      snapshot, undo, canUndo: histLen > 0, setTracked, applyPreset };

    return html`
      <${Masthead} />
      <${Band} nChanged=${changed.length} nErrors=${nErrors} />
      <main className="eq-wrap">
        <${Overview} ...${ctx} />
        <${Analysis} ...${ctx} />
        <${Profitability} ...${ctx} />
        <${Lab} ...${ctx} />
        <${Scenarios} ...${ctx} />
        <${Risks} ...${ctx} />
        <${Conclusions} ...${ctx} />
        <${Method} ...${ctx} />
      </main>
      <footer className="eq-foot"><div className="eq-wrap">
        ${D.STUDY.title} · ${D.STUDY.authors.join(", ")} · ${D.STUDY.course}. Calculations run in your browser; nothing you enter is sent anywhere, and no AI service is called. Scenario outputs are illustrative, not forecasts.
      </div></footer>
      ${modal && html`<${ExportModal} data=${modal} onClose=${() => setModal(null)} />`}
      ${toastMsg && html`<div className="eq-toast" role="status">${toastMsg}</div>`}
    `;
  }

  // ------------------------------------------------------------------ masthead + band nav
  function Masthead() {
    return html`<header className="eq-mast eq-wrap">
      <div className="eq-strip"><span className="eq-badge"><i></i>Financial Services · Research dashboard · Oct 2026</span></div>
      <h1 className="eq-title">Comparative Analysis of <span>EFG Hermes & Quilter</span></h1>
      <p className="eq-subtitle">Two non-bank financial models, Egypt and the UK, side by side. Change any figure and watch the metrics, charts, risks and insights update live.</p>
      <p className="eq-authors">${D.STUDY.authors.map((a) => html`<span key=${a}>${a}</span>`)}</p>
    </header>`;
  }

  const NAV = [["overview", "Overview"], ["analysis", "Analysis"], ["profitability", "Profitability"], ["lab", "Input lab"], ["scenarios", "Scenarios"], ["risks", "Risks"], ["conclusions", "Conclusions"], ["method", "Method & sources"]];
  function Band({ nChanged, nErrors }) {
    const [cur, setCur] = useState("overview");
    useEffect(() => {
      // Current section = the last one whose top has passed just below the sticky band.
      let raf = 0;
      const onScroll = () => {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          let id = NAV[0][0];
          NAV.forEach(([s]) => { const el = document.getElementById(s); if (el && el.getBoundingClientRect().top <= 120) id = s; });
          if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) id = NAV[NAV.length - 1][0];
          setCur(id);
        });
      };
      addEventListener("scroll", onScroll, { passive: true });
      const h = (location.hash || "").slice(1);
      if (h && document.getElementById(h)) setTimeout(() => document.getElementById(h).scrollIntoView(), 50);
      onScroll();
      return () => { removeEventListener("scroll", onScroll); cancelAnimationFrame(raf); };
    }, []);
    useEffect(() => {
      // Keep the active link visible when the band scrolls sideways on phones.
      const a = document.querySelector(`.eq-nav a[href="#${cur}"]`), box = a && a.closest(".eq-wrap");
      if (box && box.scrollWidth > box.clientWidth) box.scrollLeft = Math.max(0, a.offsetLeft - 16);
    }, [cur]);
    return html`<nav className="eq-band" aria-label="Sections"><div className="eq-wrap">
      <div className="eq-nav">${NAV.map(([id, label]) => html`<a key=${id} href=${"#" + id} aria-current=${cur === id}>${label}</a>`)}</div>
      <span className="eq-band-status" aria-live="polite">
        ${nErrors ? html`<span style=${{ color: "#f08a80" }}>${nErrors} invalid input${nErrors > 1 ? "s" : ""}</span>`
          : nChanged ? html`<span className="eq-dot"></span>${nChanged} value${nChanged > 1 ? "s" : ""} changed`
          : "Research values"}
      </span>
    </div></nav>`;
  }

  // ------------------------------------------------------------------ OVERVIEW
  const KPI_IDS = ["brokerageRMS", "quilterRecShare", "customerScale", "efgFinancePortfolio", "valueIntensity", "inclusionGapMid", "efgROE", "efgCostIncome"];
  const KPI_META = {
    brokerageRMS: { label: "EFG brokerage relative share", unit: "x", def: "EFG Hermes share of EGX brokerage ÷ direct competitors' share.",
      sub: (m, i) => `${f(i.efgBrokerageShare, "%")} vs ${f(i.compBrokerageShare, "%")} · lead ${f(m.brokerageLead.value, "pp")}` },
    quilterRecShare: { label: "Quilter adviser recommendation share", unit: "%", def: "Share of top-10 UK adviser platform recommendations.", input: true,
      sub: (m) => `Rank ${f(m.quilterRank.value, "rank")} · ${isNum(m.quilterGap.value) ? (m.quilterGap.value >= 0 ? "+" : "−") + f(Math.abs(m.quilterGap.value), "pp") : "—"} vs ${m.quilterGap.note || "nearest rival"}` },
    customerScale: { label: "Digital customer scale, EFG vs Quilter", unit: "x", def: "valU + Tanmeyah + Bank NXT customers ÷ Quilter platform customers.",
      sub: (m, i) => `${f(m.efgDigitalCustomers.value, "customers", { compact: true })} vs ${f(i.quilterPlatformCustomers, "customers", { compact: true })} customers` },
    efgFinancePortfolio: { label: "EFG Finance credit portfolio", unit: "EGP bn", def: "Leasing + valU + factoring outstanding (a stock).",
      sub: (m) => `${m.largestLine.note || "—"} ${f(m.largestLine.value, "%")} of total · no savings line` },
    valueIntensity: { label: "Value per customer, Quilter vs valU", unit: "x", dp: 0, def: "Quilter assets per platform customer ÷ valU portfolio per customer (GBP).",
      sub: (m) => `${f(m.quilterPerCustomer.value, "GBP", { compact: true })} vs ${f(m.valuPerCustomerGBP.value, "GBP", { dp: 0 })} per customer` },
    efgROE: { label: "Return on equity, EFG vs Quilter", unit: "%", def: "FY2025 profit ÷ average shareholders' equity. From the annual results, not the research.",
      sub: (m) => `Quilter ${f(m.qROE.value, "%")} adjusted · gap ${isNum(m.roeGap.value) ? (m.roeGap.value >= 0 ? "+" : "−") + f(Math.abs(m.roeGap.value), "pp") : "—"}` },
    efgCostIncome: { label: "Cost-to-income, EFG vs Quilter", unit: "%", def: "FY2025 operating costs ÷ revenue. From the annual results, not the research.",
      sub: (m) => `Quilter ${f(m.qCostIncome.value, "%")} · EFG FY2024 ${f(E.RATIO.share(D.PRIOR.efgOpex, D.PRIOR.efgRevenue), "%")}` },
    inclusionGapMid: { label: "Financial inclusion gap, UK vs Egypt", unit: "pp", def: "UK inclusion minus mid-point of Egypt NBFS reach.",
      sub: (m) => `Range ${f(m.inclusionGapMid.low, "pp", { dp: 0 })} to ${f(m.inclusionGapMid.high, "pp", { dp: 0 })}` },
  };
  const kpiValue = (id, m, i) => (KPI_META[id].input ? i[id] : m[id].value);
  const kpiBase = (id, bm, b) => (KPI_META[id].input ? b[id] : bm[id].value);

  /** Animate a number from its previous value to the new one (instant with reduced motion). */
  function useCountUp(target, ms) {
    const [v, setV] = useState(target);
    const from = useRef(target);
    useEffect(() => {
      if (!isNum(target) || !isNum(from.current) || REDUCED) { from.current = target; setV(target); return; }
      const start = performance.now(), a = from.current, d = target - a;
      let raf;
      const tick = (now) => {
        const k = Math.min(1, (now - start) / (ms || 650)), e = 1 - Math.pow(1 - k, 3);
        setV(a + d * e);
        if (k < 1) raf = requestAnimationFrame(tick); else from.current = target;
      };
      raf = requestAnimationFrame(tick);
      return () => { cancelAnimationFrame(raf); from.current = target; };
    }, [target]);
    return v;
  }
  /** A formatted number that counts up and flashes when it changes. */
  function AnimNum({ value, unit, opts }) {
    const v = useCountUp(value);
    const [flash, setFlash] = useState(0);
    const first = useRef(true);
    useEffect(() => { if (first.current) { first.current = false; return; } setFlash((n) => n + 1); }, [value]);
    return html`<span key=${flash} className=${flash ? "eq-flash" : ""}>${f(isNum(value) ? v : null, unit, opts)}</span>`;
  }

  /** Scroll to an input in the lab, open its group and highlight it. */
  function focusInput(key) {
    const el = document.getElementById("in-" + key);
    if (!el) return;
    const fs = el.closest("details"); if (fs) fs.open = true;
    const row = el.closest(".eq-field");
    row.scrollIntoView({ behavior: REDUCED ? "auto" : "smooth", block: "center" });
    row.classList.add("is-flash"); setTimeout(() => row.classList.remove("is-flash"), 1400);
    setTimeout(() => el.focus({ preventScroll: true }), REDUCED ? 0 : 450);
  }

  function KpiCard({ id, metrics, baseMetrics, inputs, baseline }) {
    const meta = KPI_META[id];
    const v = kpiValue(id, metrics, inputs), b = kpiBase(id, baseMetrics, baseline);
    const it = I.interpretKPI(id, metrics, baseMetrics, inputs);
    const c = E.change(b, v, meta.unit);
    const cls = !isNum(v) ? "same" : Math.abs(v - b) < 1e-12 ? "same" : v > b ? "up" : "down";
    const missing = !KPI_META[id].input && metrics[id].missing && metrics[id].missing.length;
    return html`<article className="eq-panel eq-kpi" aria-label=${meta.label}>
      <div className="eq-kpi-label"><span>${meta.label}</span><${Prov} kind=${meta.input ? (cls === "same" ? "labelled" : "user") : "calculated"} /></div>
      <div className="eq-kpi-value"><${AnimNum} value=${v} unit=${meta.unit} opts=${{ dp: meta.dp }} /></div>
      <div className="eq-kpi-sub">${isNum(v) ? meta.sub(metrics, inputs) : missing ? `Missing input: ${metrics[id].missing.map((k) => D.inputDef(k).short).join(", ")}` : "Cannot be calculated"}</div>
      <p className="eq-kpi-text">${it.implication}</p>
      <div>
        <div style=${{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
          <p className=${"eq-cmp " + cls}>${cls === "same" ? "Matches research values" : `${E.fmtChange(c, meta.unit)} vs research (${f(b, meta.unit, { dp: meta.dp })})`}</p>
          <button type="button" className="eq-link" onClick=${() => focusInput(meta.input ? id : E.metricDef(id).deps[0])}>Adjust inputs →</button>
        </div>
        <details className="eq-more">
          <summary>How to read this</summary>
          <dl className="eq-interp">
            <div><dt>What it measures</dt><dd>${it.measures}</dd></div>
            <div><dt>Current result</dt><dd>${it.current}</dd></div>
            <div><dt>Comparison</dt><dd>${it.comparison}</dd></div>
            <div><dt>Why it matters</dt><dd>${it.why}</dd></div>
            <div><dt>Implication</dt><dd>${it.implication}</dd></div>
            <div><dt>Limitations</dt><dd>${it.limits}</dd></div>
            <div><dt>Formula</dt><dd><code className="eq-f">${meta.input ? "Reported value" : E.metricDef(id).formula}</code></dd></div>
          </dl>
        </details>
      </div>
    </article>`;
  }

  function Overview(p) {
    const counts = D.INPUTS.reduce((o, d) => ((o[d.provenance] = (o[d.provenance] || 0) + 1), o), {});
    const order = { elevated: 0, watch: 1, ok: 2, missing: 3, qualitative: 4 };
    const quant = p.risks.filter((r) => !r.qualitative).slice().sort((a, b) => order[a.status] - order[b.status]);
    const top = quant[0];
    const bm = p.baseMetrics;
    return html`<${Section} id="overview" eyebrow="Executive overview" title="Two markets, two calibres, one shift towards digital investment">
      <div className="eq-research">
        <div style=${{ display: "grid", gap: 14 }}>
          <p className="eq-eyebrow">Research question</p>
          <p className="eq-question">${D.STUDY.question}</p>
          <p className="eq-lede">EFG Hermes runs a capital-markets and mass-market finance model in Egypt. Quilter runs an advice-led wealth model in the UK. Every figure below is live: test it, stress it, and see how the two models differ and what that means for EFG's next steps.</p>
          <details className="eq-more">
            <summary>How to use this dashboard</summary>
            <ol className="eq-kpi-text" style=${{ margin: "8px 0 0 18px", padding: 0, display: "grid", gap: 4 }}>
              <li>Read the six indicators below. Open <i>How to read this</i> on any card for the full interpretation.</li>
              <li>Change a figure in the <a href="#lab">Input lab</a>. Every metric, chart, risk and interpretation updates at once, and changed values are marked.</li>
              <li>Compare illustrative strategies for EFG in <a href="#scenarios">Scenarios</a>, then check triggered warnings in <a href="#risks">Risks</a>.</li>
              <li>Trace any number to its source, formula or assumption in <a href="#method">Method & sources</a>. Restore the research values at any time.</li>
            </ol>
          </details>
        </div>
        <div className="eq-panel">
          <dl className="eq-meta">
            <dt>Institutions</dt><dd>EFG Hermes / EFG Holding (Egypt; EGX & LSE) · Quilter (UK; LSE)</dd>
            <dt>Regulators</dt><dd>FRA and CBE (Egypt) · FCA (UK)</dd>
            <dt>Reporting period</dt><dd>${D.STUDY.period}</dd>
            <dt>Data coverage</dt><dd>${D.INPUTS.length - (counts.assumption || 0)} research figures: ${counts.labelled} chart labels, ${counts["chart-read"]} read off charts, ${counts.stated} from report text. Plus ${counts.reported} FY2025 figures from the firms' annual results and ${counts.assumption} analyst assumptions.</dd>
            <dt>Not available</dt><dd>The research has no financial statements or chart sources, so profitability ratios use the firms' FY2025 results instead (see <a href="#profitability">Profitability</a>). Capital and liquidity ratios are not included.</dd>
          </dl>
        </div>
      </div>

      <div className="eq-kpis">${KPI_IDS.map((id) => html`<${KpiCard} key=${id} id=${id} ...${p} />`)}</div>

      <div className="eq-grid eq-g2" style=${{ marginTop: 24 }}>
        <div className="eq-panel">
          <h3>Key findings</h3>
          <p className="eq-q">From the research, using the original values</p>
          <ul className="eq-findings" style=${{ marginTop: 8 }}>
            <li><span>EFG leads its digital rivals in both segments shown: ${f(bm.brokerageRMS.value, "x")} their share in EGX brokerage, but only ${f(bm.bnplRMS.value, "x")} in consumer finance.</span></li>
            <li><span>Quilter is second for UK adviser platform recommendations at ${f(p.baseline.quilterRecShare, "%", { dp: 0 })},${f(-bm.quilterGap.value, "pp", { dp: 0 })} behind Aviva. The top two take ${f(bm.top2Share.value, "%", { dp: 0 })}.</span></li>
            <li><span>EFG reaches about ${f(bm.customerScale.value, "x", { dp: 1 })} as many digital customers as Quilter's platform, but through credit. Its ${f(bm.efgFinancePortfolio.value, "EGP bn")} portfolio has no savings line.</span></li>
            <li><span>Egypt's NBFS reach (60–70%) trails UK inclusion (97%) by ${f(bm.inclusionGapMid.low, "pp", { dp: 0 })}–${f(bm.inclusionGapMid.high, "pp", { dp: 0 })}. Egypt's constraint is access; the UK's is growth.</span></li>
            <li><span>Added from the FY2025 annual results, not the research: both firms earned a similar return on equity (EFG ${f(bm.efgROE.value, "%")}, Quilter ${f(bm.qROE.value, "%")}), but EFG's profit fell as costs outgrew revenue. <a href="#profitability">See Profitability</a>.</span></li>
          </ul>
        </div>
        <div className="eq-grid" style=${{ alignContent: "start" }}>
          <div className="eq-panel eq-callout">
            <h3>Overall position</h3>
            <p className="eq-kpi-text" style=${{ marginTop: 6 }}>The two firms run different models rather than better or worse versions of one model. EFG combines market leadership in Egyptian brokerage with a large, credit-led consumer base. Quilter holds far larger balances per customer in a mature, competitive market. The research concludes that EFG should adapt the parts of Quilter's model that suit Egypt: digital savings, a wider choice of investments and customer education. It should not import the UK model wholesale.</p>
          </div>
          <div className="eq-panel">
            <div className="eq-panel-head"><h3>Most significant quantified risk</h3>${top && html`<${Pill} status=${top.status} />`}</div>
            ${top && html`<p className="eq-kpi-text"><b>${top.name}.</b> ${top.metricLabel}: <b>${f(top.value, top.unit)}</b>. ${top.impact} <a href="#risks">See the risk register</a>.</p>`}
          </div>
          <div className="eq-panel">
            <h3>Why it matters</h3>
            <p className="eq-kpi-text" style=${{ marginTop: 6 }}>Non-bank financial services drive household wealth building and financial inclusion. If EFG moved even a small share of its credit customers into savings, Egyptian households would build wealth and EFG would gain fee income alongside interest income. The <a href="#scenarios">scenario model</a> lets you test how large that effect could be.</p>
          </div>
        </div>
      </div>
    <//>`;
  }

  // ------------------------------------------------------------------ ANALYSIS
  function Analysis(p) {
    const t = p.tokens, i = p.inputs, b = p.baseline, m = p.metrics, bm = p.baseMetrics;
    const [cmp, setCmp] = useState("current");
    const [logScale, setLogScale] = useState(true);
    const [show, setShow] = useState({ efg: true, quilterCust: true, adviser: true });
    const [vpcLog, setVpcLog] = useState(true);
    const both = cmp === "both", useBase = cmp === "baseline";
    const S = useBase ? b : i, SM = useBase ? bm : m;
    const grid = html`<${CartesianGrid} stroke=${t.rule} strokeDasharray="2 4" />`;
    const tipCursor = { fill: t.dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)" };

    // A. Egypt market position
    const mkt = [
      { name: "EGX securities brokerage", efg: S.efgBrokerageShare, rival: S.compBrokerageShare, efgB: b.efgBrokerageShare, rivalB: b.compBrokerageShare },
      { name: "Consumer finance / BNPL", efg: S.valuBnplShare, rival: S.compBnplShare, efgB: b.valuBnplShare, rivalB: b.compBnplShare },
    ];
    // B. UK platform
    const plat = E.PLATFORM_KEYS.map((k) => ({ key: k, name: E.PLATFORM_NAMES[k], v: S[k], base: b[k] }))
      .sort((x, y) => (y.v ?? -1) - (x.v ?? -1));
    plat.push({ key: "other", name: "Other / not listed", v: SM.otherPlatformShare.value, base: bm.otherPlatformShare.value });
    // C. customer scale
    const cust = [
      show.efg && { name: "valU", v: S.valuCustomers, ent: "efg", date: "May 2026" },
      show.efg && { name: "Tanmeyah", v: S.tanmeyahCustomers, ent: "efg", date: "Q2 2026" },
      show.efg && { name: "Bank NXT", v: S.bankNxtCustomers, ent: "efg", date: "Jun 2025" },
      show.quilterCust && { name: "Quilter platform", v: S.quilterPlatformCustomers, ent: "quilter", date: "2026" },
      show.adviser && { name: "Advice professionals", v: S.quilterAdviceProfessionals, ent: "quilter", date: "2026" },
      show.adviser && { name: "Adviser firms", v: S.quilterAdviserFirms, ent: "quilter", date: "2026" },
      show.adviser && { name: "Quilter advisers", v: S.quilterAdvisers, ent: "quilter", date: "2026" },
    ].filter(Boolean).map((d) => Object.assign(d, { vLog: isNum(d.v) && d.v > 0 ? d.v : null }));
    // D. portfolio mix
    const mixRow = (src, name) => {
      const tot = E.computeMetrics(src).efgFinancePortfolio.value;
      const r = { name, tot };
      E.PORTFOLIO_KEYS.forEach((k) => (r[k] = isNum(src[k]) && isNum(tot) && tot > 0 ? (src[k] / tot) * 100 : null));
      return r;
    };
    const mix = both ? [mixRow(b, "Research"), mixRow(i, "Current")] : [mixRow(S, useBase ? "Research" : "Current")];
    const mixColors = { leasingPortfolio: BLUE_RAMP[11], valuPortfolio: BLUE_RAMP[7], factoringPortfolio: BLUE_RAMP[3] };
    // E. value per customer
    const vpc = [
      { name: "valU portfolio per customer", v: SM.valuPerCustomerGBP.value, base: bm.valuPerCustomerGBP.value, ent: "efg" },
      { name: "Quilter assets per platform customer", v: SM.quilterPerCustomer.value, base: bm.quilterPerCustomer.value, ent: "quilter" },
    ];
    // F. inclusion
    const inc = [
      { name: "Egypt NBFS reach", solid: S.egyptReachLow, band: isNum(S.egyptReachHigh) && isNum(S.egyptReachLow) ? S.egyptReachHigh - S.egyptReachLow : null, ent: "efg" },
      { name: "UK inclusion", solid: S.ukInclusion, band: 0, ent: "quilter" },
    ];
    const cmpNote = both ? "Solid bars show current inputs; faded bars show the research values." : useBase ? "Showing the original research values." : "Showing current inputs.";

    return html`<${Section} id="analysis" eyebrow="Interactive financial analysis" title="Market position, scale and business model"
      lede="Each chart answers one question from the research. Hover for exact values, toggle series, and compare your current inputs with the original research values.">
      <div className="eq-actions" style=${{ marginBottom: 16, justifyContent: "space-between" }}>
        <div className="eq-actions"><span className="eq-kpi-text">Compare:</span>
          <${Seg} label="Data shown" value=${cmp} onChange=${setCmp} options=${[{ value: "current", label: "Current inputs" }, { value: "baseline", label: "Research values" }, { value: "both", label: "Both" }]} />
        </div>
        <span className="eq-kpi-text">${cmpNote} ${p.changed.length ? `${p.changed.length} input${p.changed.length > 1 ? "s" : ""} changed.` : "No inputs changed."}</span>
      </div>
      <div className="eq-grid eq-g2">
        <${ChartPanel} title="Egyptian market share, 2026" question="Does EFG lead its direct digital competitors?"
          source="Source: research study p.3 (chart labels). Competitor bars combine Thndr and Contact; how they were combined is not stated."
          table=${html`<${DataTable} caption="Egyptian market share" cols=${["Segment", "EFG", "Competitors", "Relative share", "Lead"]}
            rows=${mkt.map((r) => [r.name, f(r.efg, "%"), f(r.rival, "%"), f(E.safeDiv(r.efg, r.rival), "x"), isNum(r.efg) && isNum(r.rival) ? f(r.efg - r.rival, "pp") : "—"])} />`}>
          <div className="eq-chart" role="img" aria-label=${`EFG holds ${f(mkt[0].efg, "%")} of EGX brokerage against ${f(mkt[0].rival, "%")} for competitors, and ${f(mkt[1].efg, "%")} of consumer finance against ${f(mkt[1].rival, "%")}.`}>
            <${ResponsiveContainer}><${BarChart} data=${mkt} layout="vertical" margin=${{ top: 4, right: 48, left: 4, bottom: 18 }} barGap=${2} barCategoryGap="22%">
              ${grid}
              <${XAxis} type="number" ...${shareAxis(mkt.flatMap((r) => [r.efg, r.rival, both ? r.efgB : 0, both ? r.rivalB : 0]))} tickFormatter=${(v) => v + "%"} stroke=${t.rule} label=${{ value: "Market share (%)", position: "insideBottom", offset: -10 }} />
              <${YAxis} type="category" dataKey="name" width=${118} stroke=${t.rule} />
              <${Tooltip} cursor=${tipCursor} content=${(q) => html`<${Tip} ...${q} unit="%" />`} />
              <${Bar} dataKey="efg" name=${useBase ? "EFG Holding (research)" : "EFG Holding"} fill=${t.efg} radius=${[0, 4, 4, 0]} isAnimationActive=${ANIM}>
                <${LabelList} dataKey="efg" position="right" className="eq-barlabel" formatter=${(v) => f(v, "%")} /><//>
              ${both && html`<${Bar} dataKey="efgB" name="EFG Holding (research)" fill=${t.efg} fillOpacity=${0.3} radius=${[0, 4, 4, 0]} isAnimationActive=${ANIM} />`}
              <${Bar} dataKey="rival" name=${useBase ? "Competitors (research)" : "Competitors (Thndr / Contact)"} fill=${t.rival} radius=${[0, 4, 4, 0]} isAnimationActive=${ANIM}>
                <${LabelList} dataKey="rival" position="right" className="eq-barlabel" formatter=${(v) => f(v, "%")} /><//>
              ${both && html`<${Bar} dataKey="rivalB" name="Competitors (research)" fill=${t.rival} fillOpacity=${0.3} radius=${[0, 4, 4, 0]} isAnimationActive=${ANIM} />`}
            <//><//>
          </div>
          <div className="eq-key"><span><i className="eq-sw" style=${{ background: t.efg }}></i>EFG Holding (EFG Hermes / valU)</span><span><i className="eq-sw" style=${{ background: t.rival }}></i>Direct competitors (Thndr / Contact)</span>${both && html`<span><i className="eq-sw" style=${{ background: t.ink, opacity: 0.3 }}></i>Faded = research</span>`}</div>
        <//>

        <${ChartPanel} title="UK adviser platform recommendations, 2026" question="Where does Quilter rank with UK financial advisers?"
          source="Source: research study p.3 (chart labels). Share of top-10 recommendations; not share of assets. 'Other' is calculated as 100% minus the listed platforms."
          table=${html`<${DataTable} caption="UK platform recommendation share" cols=${["Platform", "Share", "Research"]} rows=${plat.map((r) => [r.name, f(r.v, "%", { dp: 0 }), f(r.base, "%", { dp: 0 })])} />`}>
          <div className="eq-chart" role="img" aria-label=${`Quilter has ${f(i.quilterRecShare, "%", { dp: 0 })} of recommendations, rank ${f(SM.quilterRank.value, "rank")}.`}>
            <${ResponsiveContainer}><${BarChart} data=${plat} layout="vertical" margin=${{ top: 4, right: 44, left: 4, bottom: 18 }} barCategoryGap="18%">
              ${grid}
              <${XAxis} type="number" ...${shareAxis(plat.flatMap((r) => [r.v, both ? r.base : 0]))} tickFormatter=${(v) => v + "%"} stroke=${t.rule} label=${{ value: "Share of top-10 recommendations (%)", position: "insideBottom", offset: -10 }} />
              <${YAxis} type="category" dataKey="name" width=${150} stroke=${t.rule} />
              <${Tooltip} cursor=${tipCursor} content=${(q) => html`<${Tip} ...${q} unit="%" />`} />
              <${Bar} dataKey="v" name=${useBase ? "Research share" : "Share"} radius=${[0, 4, 4, 0]} isAnimationActive=${ANIM}>
                ${plat.map((r) => html`<${Cell} key=${r.key} fill=${r.key === "quilterRecShare" ? t.quilter : t.neutral} fillOpacity=${r.key === "other" ? 0.45 : 1} />`)}
                <${LabelList} dataKey="v" position="right" className="eq-barlabel" formatter=${(v) => f(v, "%", { dp: 0 })} />
              <//>
              ${both && html`<${Bar} dataKey="base" name="Research share" fill=${t.ink} fillOpacity=${0.18} radius=${[0, 4, 4, 0]} isAnimationActive=${ANIM} />`}
            <//><//>
          </div>
          <div className="eq-key"><span><i className="eq-sw" style=${{ background: t.quilter }}></i>Quilter</span><span><i className="eq-sw" style=${{ background: t.neutral }}></i>Other listed platforms</span><span>Concentration (HHI, listed only): <b className="eq-num">${f(SM.platformHHI.value, "points")}</b></span></div>
        <//>

        <${ChartPanel} title="Customer and adviser scale" question="How large is each firm's digital reach?"
          controls=${html`<${Seg} label="Axis scale" value=${logScale ? "log" : "lin"} onChange=${(v) => setLogScale(v === "log")} options=${[{ value: "log", label: "Log" }, { value: "lin", label: "Linear" }]} />`}
          source="Source: research study p.4 and 8, values read off chart axes (approximate). Dates differ; Bank NXT is June 2025. Product totals may double-count customers."
          table=${html`<${DataTable} caption="Customer scale" cols=${["Measure", "Count", "As of"]} rows=${cust.map((r) => [r.name, f(r.v, "customers"), r.date])} />`}>
          <div className="eq-toggles" style=${{ marginBottom: 6 }}>
            ${[["efg", "EFG products", t.efg], ["quilterCust", "Quilter platform customers", t.quilter], ["adviser", "Quilter adviser network", t.quilter]].map(([k, l, c]) => html`<label key=${k}>
              <input type="checkbox" checked=${show[k]} onChange=${() => setShow((s) => Object.assign({}, s, { [k]: !s[k] }))} /><i className="eq-sw" style=${{ background: c, opacity: k === "adviser" ? 0.55 : 1 }}></i>${l}</label>`)}
          </div>
          ${cust.length ? html`<div className="eq-chart" role="img" aria-label=${"Customer counts: " + cust.map((r) => `${r.name} ${f(r.v, "customers", { compact: true })}`).join("; ")}>
            <${ResponsiveContainer}><${BarChart} data=${cust} margin=${{ top: 18, right: 8, left: 4, bottom: 4 }}>
              ${grid}
              <${XAxis} dataKey="name" stroke=${t.rule} interval=${0} tick=${{ fontSize: 10.5 }} angle=${-32} textAnchor="end" height=${70} />
              <${YAxis} dataKey=${logScale ? "vLog" : "v"} scale=${logScale ? "log" : "auto"} allowDataOverflow=${logScale}
                ...${logScale ? logAxis(cust.map((r) => r.vLog)) : { domain: [0, "auto"] }}
                tickFormatter=${(v) => f(v, "customers", { compact: true, dp: 0 })} stroke=${t.rule} width=${52} />
              <${Tooltip} cursor=${tipCursor} content=${(q) => html`<${Tip} ...${q} unit="customers" />`} />
              <${Bar} dataKey=${logScale ? "vLog" : "v"} name="Count" radius=${[4, 4, 0, 0]} isAnimationActive=${ANIM}>
                ${cust.map((r, k) => html`<${Cell} key=${k} fill=${r.ent === "efg" ? t.efg : t.quilter} fillOpacity=${/Advice|Adviser|advisers/.test(r.name) ? 0.55 : 1} />`)}
                <${LabelList} dataKey="v" position="top" className="eq-barlabel" formatter=${(v) => f(v, "customers", { compact: true, dp: 0 })} />
              <//>
            <//><//>
          </div>` : html`<p className="eq-empty">Select at least one series to show the chart.</p>`}
          <p className="eq-kpi-text">EFG digital total ${f(SM.efgDigitalCustomers.value, "customers", { compact: true })} = ${f(SM.customerScale.value, "x")} Quilter's platform customers. Quilter serves ${f(SM.customersPerFirm.value, "x", { dp: 0 })} platform customers per adviser firm.</p>
        <//>

        <${ChartPanel} title="EFG Finance portfolio mix" question="What is EFG Finance's balance sheet made of?"
          source="Source: research study p.8, values read off chart axis (EGP bn, date not stated). Shares are calculated."
          table=${html`<${DataTable} caption="Portfolio mix" cols=${["Product line", "EGP bn", "Share", "Research share"]}
            rows=${E.PORTFOLIO_KEYS.map((k) => [E.PORTFOLIO_NAMES[k], f(S[k], "EGP bn"), f(mixRow(S, "")[k], "%"), f(mixRow(b, "")[k], "%")])} />`}>
          <div className="eq-chart" style=${{ height: both ? 190 : 150 }} role="img" aria-label=${"Portfolio mix: " + E.PORTFOLIO_KEYS.map((k) => `${E.PORTFOLIO_NAMES[k]} ${f(mix[mix.length - 1][k], "%")}`).join(", ")}>
            <${ResponsiveContainer}><${BarChart} data=${mix} layout="vertical" stackOffset="expand" margin=${{ top: 4, right: 12, left: 4, bottom: 18 }} barCategoryGap="28%">
              <${XAxis} type="number" tickFormatter=${(v) => Math.round(v * 100) + "%"} stroke=${t.rule} />
              <${YAxis} type="category" dataKey="name" width=${70} stroke=${t.rule} />
              <${Tooltip} cursor=${tipCursor} content=${(q) => html`<${Tip} ...${q} unit="%" />`} />
              ${E.PORTFOLIO_KEYS.map((k, n) => html`<${Bar} key=${k} dataKey=${k} stackId="a" name=${E.PORTFOLIO_NAMES[k]} fill=${mixColors[k]} stroke=${t.surface} strokeWidth=${2} isAnimationActive=${ANIM}
                radius=${n === 2 ? [0, 4, 4, 0] : n === 0 ? [4, 0, 0, 4] : 0}>
                <${LabelList} dataKey=${k} position="center" style=${{ fill: n === 2 ? "#0d366b" : "#ffffff", fontSize: 11.5 }} formatter=${(v) => (v >= 8 ? f(v, "%", { dp: 0 }) : "")} /><//>`)}
            <//><//>
          </div>
          <div className="eq-key">${E.PORTFOLIO_KEYS.map((k) => html`<span key=${k}><i className="eq-sw" style=${{ background: mixColors[k] }}></i>${E.PORTFOLIO_NAMES[k]} ${f(S[k], "EGP bn")}</span>`)}</div>
          <p className="eq-kpi-text" style=${{ marginTop: 8 }}>Total ${f(SM.efgFinancePortfolio.value, "EGP bn")} (≈ ${f(SM.efgPortfolioGBP.value, "GBP bn")} at ${f(i.fxEgpPerGbp, "EGP/GBP")}). All three lines are credit products; there is no savings or investment line to set against Quilter's model.</p>
        <//>

        <${ChartPanel} title="Value per customer (GBP)" question="How different are the two business models per customer?"
          controls=${html`<${Seg} label="Axis scale" value=${vpcLog ? "log" : "lin"} onChange=${(v) => setVpcLog(v === "log")} options=${[{ value: "log", label: "Log" }, { value: "lin", label: "Linear" }]} />`}
          source=${`Calculated from the research figures, converted at ${f(i.fxEgpPerGbp, "EGP/GBP")} (an assumption, not in the original research). Not like-for-like: valU balances are loans, Quilter balances are client assets.`}
          table=${html`<${DataTable} caption="Value per customer" cols=${["Measure", "GBP", "Research"]} rows=${vpc.map((r) => [r.name, f(r.v, "GBP"), f(r.base, "GBP")])} />`}>
          <div className="eq-chart" role="img" aria-label=${`Quilter holds ${f(vpc[1].v, "GBP")} per platform customer; valU lends ${f(vpc[0].v, "GBP")} per customer, a ratio of ${f(SM.valueIntensity.value, "x", { dp: 0 })}.`}>
            <${ResponsiveContainer}><${BarChart} data=${vpc.map((r) => Object.assign({}, r, { vPos: isNum(r.v) && r.v > 0 ? r.v : null }))} margin=${{ top: 18, right: 8, left: 4, bottom: 4 }} barCategoryGap="35%">
              ${grid}
              <${XAxis} dataKey="name" stroke=${t.rule} tick=${{ fontSize: 11 }} interval=${0} />
              <${YAxis} scale=${vpcLog ? "log" : "auto"} allowDataOverflow=${vpcLog} ...${vpcLog ? logAxis(vpc.map((r) => r.v)) : { domain: [0, "auto"] }} tickFormatter=${(v) => f(v, "GBP", { compact: true, dp: 0 })} stroke=${t.rule} width=${56} />
              <${Tooltip} cursor=${tipCursor} content=${(q) => html`<${Tip} ...${q} unit="GBP" />`} />
              <${Bar} dataKey="vPos" name="Per customer" radius=${[4, 4, 0, 0]} isAnimationActive=${ANIM}>
                ${vpc.map((r, k) => html`<${Cell} key=${k} fill=${r.ent === "efg" ? t.efg : t.quilter} />`)}
                <${LabelList} dataKey="v" position="top" className="eq-barlabel" formatter=${(v) => f(v, "GBP", { compact: true, dp: 0 })} />
              <//>
            <//><//>
          </div>
          <p className="eq-kpi-text">Quilter holds about <b className="eq-num">${f(SM.valueIntensity.value, "x", { dp: 0 })}</b> as much per customer. Change the exchange rate in the Input lab to see how sensitive this is.</p>
        <//>

        <${ChartPanel} title="Financial inclusion" question="How much of each market is already served?"
          source="Source: research study p.4 (text). Egypt is stated as a 60–70% range; the faded segment shows the range. The two measures may use different definitions."
          table=${html`<${DataTable} caption="Inclusion" cols=${["Market", "Low", "High"]} rows=${[["Egypt NBFS reach", f(S.egyptReachLow, "%", { dp: 0 }), f(S.egyptReachHigh, "%", { dp: 0 })], ["UK inclusion", f(S.ukInclusion, "%", { dp: 0 }), f(S.ukInclusion, "%", { dp: 0 })]]} />`}>
          <div className="eq-chart" style=${{ height: 170 }} role="img" aria-label=${`Egypt reach ${f(S.egyptReachLow, "%", { dp: 0 })} to ${f(S.egyptReachHigh, "%", { dp: 0 })}; UK ${f(S.ukInclusion, "%", { dp: 0 })}.`}>
            <${ResponsiveContainer}><${BarChart} data=${inc} layout="vertical" margin=${{ top: 4, right: 40, left: 4, bottom: 18 }} barCategoryGap="30%">
              ${grid}
              <${XAxis} type="number" domain=${[0, 100]} tickFormatter=${(v) => v + "%"} stroke=${t.rule} />
              <${YAxis} type="category" dataKey="name" width=${110} stroke=${t.rule} />
              <${Tooltip} cursor=${tipCursor} content=${(q) => html`<${Tip} ...${q} unit="%" />`} />
              <${Bar} dataKey="solid" stackId="a" name="Reached (lower bound)" isAnimationActive=${ANIM}>${inc.map((r, k) => html`<${Cell} key=${k} fill=${r.ent === "efg" ? t.efg : t.quilter} />`)}<//>
              <${Bar} dataKey="band" stackId="a" name="Range to upper bound" radius=${[0, 4, 4, 0]} isAnimationActive=${ANIM}>${inc.map((r, k) => html`<${Cell} key=${k} fill=${r.ent === "efg" ? t.efg : t.quilter} fillOpacity=${0.35} />`)}<//>
            <//><//>
          </div>
          <p className="eq-kpi-text">Gap ${f(SM.inclusionGapMid.low, "pp", { dp: 0 })} to ${f(SM.inclusionGapMid.high, "pp", { dp: 0 })}; UK headroom ${f(SM.ukHeadroom.value, "pp", { dp: 0 })}.</p>
        <//>
      </div>
    <//>`;
  }

  // ------------------------------------------------------------------ PROFITABILITY (annual results)
  function Profitability(p) {
    const t = p.tokens, m = p.metrics, i = p.inputs;
    const [year, setYear] = useState("fy25");
    const table = useMemo(() => E.profitabilityTable(i), [i]);
    const fy = year === "fy25";
    const chart = table.map((r) => ({ name: r.label, efg: fy ? r.efg25 : r.efg24, q: fy ? r.q25 : r.q24 }));
    const vals = chart.flatMap((r) => [r.efg, r.q]).filter(isNum);
    const ax = shareAxis(vals);
    if (vals.length && Math.min(...vals) < 0) { ax.domain = [Math.floor(Math.min(...vals) / 10) * 10, ax.domain[1]]; delete ax.ticks; }
    const RR = D.REPORTED_RATIOS;
    const checks = [
      { label: RR.qOperatingMargin.label, ours: m.qPbtMargin.value, theirs: RR.qOperatingMargin.fy25, unit: "%", why: "Quilter rounds to whole percentages." },
      { label: RR.qROE.label, ours: m.qROE.value, theirs: RR.qROE.fy25, unit: "%", why: "Quilter averages equity over more points in the year; the dashboard uses opening and closing equity only." },
      { label: RR.qRevenueMargin.label, ours: m.qRevenueMargin.value, theirs: RR.qRevenueMargin.fy25, unit: "bps", why: "Quilter uses average monthly AuMA; the dashboard uses opening and closing AuMA." },
      { label: RR.efgNetOperatingMargin.label, ours: isNum(m.efgCostIncome.value) ? 100 - m.efgCostIncome.value : null, theirs: RR.efgNetOperatingMargin.fy25, unit: "%", why: "Net operating profit = revenue − operating expenses; EFG rounds to whole percentages." },
    ];
    const loadReported = () => {
      p.snapshot();
      p.setRaw((r) => { const n = Object.assign({}, r); D.RECONCILE.forEach((x) => { if (x.load !== null) n[x.key] = x.load; }); return n; });
      p.toast("Annual-results values loaded into the Input lab");
    };
    const loaded = D.RECONCILE.every((x) => x.load === null || i[x.key] === x.load);
    const pp = (a, b) => (isNum(a) && isNum(b) ? E.fmtChange(E.change(b, a, "pp"), "pp") : "—");
    const cite = (id) => D.finRef(id).cite;
    const efgFinChanged = p.changed.some((c) => c.def.provenance === "reported");

    return html`<${Section} id="profitability" eyebrow="Profitability · FY2025 annual results" title="Do the two models earn different returns?"
      lede="The research has no financial statements, so this section uses the companies' published FY2025 results (March and April 2026). Every figure is cited and can be edited in the Input lab; your edits never change the reported values.">
      <div className="eq-banner" role="note" style=${{ background: "var(--surface-2)" }}><${Icon} name="info" /><span><b>not in the original research.</b> Figures come from ${cite("efgRelease")}, ${cite("efgIfrs")}, ${cite("quilterResults")} and ${cite("quilterFS")}. Ratios are unitless, so no exchange rate is needed, but EFG's are in nominal Egyptian pounds during high inflation. ${efgFinChanged ? html`<b>You have edited some reported figures.</b>` : ""}</span></div>

      <div className="eq-grid eq-g2">
        <${ChartPanel} title="Profitability ratios, EFG vs Quilter" question="Which firm turns revenue and capital into profit more effectively?"
          controls=${html`<${Seg} label="Financial year" value=${year} onChange=${setYear} options=${[{ value: "fy25", label: "FY2025" }, { value: "fy24", label: "FY2024" }]} />`}
          source=${`Calculated from ${cite("efgRelease")} (management accounts), ${cite("efgIfrs")} (ROE) and ${cite("quilterResults")}/${cite("quilterFS")}. FY2024 ROE: Quilter's reported figure; EFG's needs December 2023 equity, which was not collected.`}
          table=${html`<${DataTable} caption="Profitability ratios" cols=${["Ratio", "EFG", "Quilter"]} rows=${chart.map((r) => [r.name, f(r.efg, "%"), f(r.q, "%")])} />`}>
          <div className="eq-chart tall" role="img" aria-label=${"Profitability ratios: " + chart.map((r) => `${r.name} EFG ${f(r.efg, "%")}, Quilter ${f(r.q, "%")}`).join("; ")}>
            <${ResponsiveContainer}><${BarChart} data=${chart} layout="vertical" margin=${{ top: 4, right: 48, left: 4, bottom: 18 }} barGap=${2} barCategoryGap="20%">
              <${CartesianGrid} stroke=${t.rule} strokeDasharray="2 4" />
              <${XAxis} type="number" ...${ax} tickFormatter=${(v) => v + "%"} stroke=${t.rule} />
              <${YAxis} type="category" dataKey="name" width=${112} stroke=${t.rule} />
              <${ReferenceLine} x=${0} stroke=${t.ink} />
              <${Tooltip} cursor=${{ fill: t.dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)" }} content=${(q) => html`<${Tip} ...${q} unit="%" />`} />
              <${Bar} dataKey="efg" name="EFG Holding" fill=${t.efg} radius=${[0, 4, 4, 0]} isAnimationActive=${ANIM}>
                <${LabelList} dataKey="efg" position="right" className="eq-barlabel" formatter=${(v) => (isNum(v) ? f(v, "%") : "n/a")} /><//>
              <${Bar} dataKey="q" name="Quilter" fill=${t.quilter} radius=${[0, 4, 4, 0]} isAnimationActive=${ANIM}>
                <${LabelList} dataKey="q" position="right" className="eq-barlabel" formatter=${(v) => (isNum(v) ? f(v, "%") : "n/a")} /><//>
            <//><//>
          </div>
          <div className="eq-key"><span><i className="eq-sw" style=${{ background: t.efg }}></i>EFG Holding</span><span><i className="eq-sw" style=${{ background: t.quilter }}></i>Quilter</span><span>Lower cost-to-income is better; higher margins and ROE are better.</span></div>
        <//>

        <div className="eq-grid" style=${{ alignContent: "start" }}>
          <div className="eq-panel">
            <h3>What the ratios show</h3>
            <ul className="eq-changes" style=${{ marginTop: 10 }}>${I.profitabilityNotes(m).map((s, k) => html`<li key=${k}>${s}</li>`)}</ul>
          </div>
          <div className="eq-panel">
            <h3>Why the comparison needs care</h3>
            <ul className="eq-kpi-text" style=${{ margin: "8px 0 0 18px", padding: 0, display: "grid", gap: 4 }}>
              <li><b>Different bases.</b> EFG's margins use management accounts; its ROE uses audited IFRS profit. Quilter's use adjusted figures, which exclude some costs; its IFRS ROE was ${f(m.qIfrsROE.value, "%")}.</li>
              <li><b>Inflation.</b> EFG reports in Egyptian pounds during a period of much higher inflation and interest rates than the UK. A similar nominal ROE means a lower real return for EFG.</li>
              <li><b>Business mix.</b> EFG's costs include credit-loss provisions on its lending; Quilter mainly earns fees on client assets and carries little credit risk.</li>
              <li><b>Balance sheets.</b> Quilter's total assets (£76.5bn) are mostly policyholder assets, so return on assets and leverage are not comparable and are left out.</li>
              <li><b>One year.</b> FY2025 vs FY2024 only. EFG's FY2024 included large FX and investment gains after the March 2024 devaluation (${cite("efgRelease")}).</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="eq-panel" style=${{ marginTop: 16 }}>
        <h3>Ratio table</h3>
        <p className="eq-q">FY2025 uses the current Input lab values; FY2024 uses the reported comparatives. Changes are in percentage points.</p>
        <div className="eq-tablewrap" style=${{ marginTop: 8 }}><table className="eq-table">
          <thead><tr><th scope="col">Ratio</th><th className="r" scope="col">EFG FY2025</th><th className="r" scope="col">EFG FY2024</th><th className="r" scope="col">Change</th>
            <th className="r" scope="col">Quilter FY2025</th><th className="r" scope="col">Quilter FY2024</th><th className="r" scope="col">Change</th><th scope="col">Note</th></tr></thead>
          <tbody>
            ${table.map((r) => html`<tr key=${r.id}><td>${r.label}</td>
              <td className="r"><b>${f(r.efg25, "%")}</b></td><td className="r">${f(r.efg24, "%")}</td><td className="r muted">${pp(r.efg25, r.efg24)}</td>
              <td className="r"><b>${f(r.q25, "%")}</b></td><td className="r">${f(r.q24, "%")}</td><td className="r muted">${pp(r.q25, r.q24)}</td>
              <td className="muted">${r.note}</td></tr>`)}
            <tr><td>Revenue growth (nominal)</td><td className="r"><b>${f(m.efgRevenueGrowth.value, "%")}</b></td><td className="r muted">—</td><td></td>
              <td className="r"><b>${f(m.qRevenueGrowth.value, "%")}</b></td><td className="r muted">—</td><td></td><td className="muted">FY2024 → FY2025. EFG in EGP, Quilter in GBP.</td></tr>
            <tr><td>Profit growth</td><td className="r"><b>${f(m.efgProfitGrowth.value, "%")}</b></td><td className="r muted">—</td><td></td>
              <td className="r"><b>${f(m.qProfitGrowth.value, "%")}</b></td><td className="r muted">—</td><td></td><td className="muted">EFG net profit after minorities; Quilter adjusted PBT.</td></tr>
            <tr><td>Revenue margin on client assets</td><td className="r muted">n/a</td><td className="r muted">n/a</td><td></td>
              <td className="r"><b>${f(m.qRevenueMargin.value, "bps", { dp: 1 })}</b></td><td className="r">${f(D.PRIOR.qReportedRevenueMargin, "bps")}</td><td></td><td className="muted">FY2024 as reported. EFG has no equivalent fee-on-assets measure.</td></tr>
          </tbody>
        </table></div>
      </div>

      <div className="eq-grid eq-g2" style=${{ marginTop: 16 }}>
        <div className="eq-panel">
          <h3>Checking the calculations</h3>
          <p className="eq-q">The dashboard's ratios against the figures the companies publish themselves</p>
          <div className="eq-tablewrap" style=${{ marginTop: 8 }}><table className="eq-table">
            <thead><tr><th scope="col">Measure</th><th className="r" scope="col">Dashboard</th><th className="r" scope="col">Reported</th><th scope="col">Why they differ</th></tr></thead>
            <tbody>${checks.map((c) => html`<tr key=${c.label}><td>${c.label}</td><td className="r"><b>${f(c.ours, c.unit, { dp: 1 })}</b></td><td className="r">${f(c.theirs, c.unit, { dp: Number.isInteger(c.theirs) ? 0 : 1 })}</td><td className="muted">${c.why}</td></tr>`)}</tbody>
          </table></div>
        </div>

        <div className="eq-panel">
          <div className="eq-panel-head"><div><h3>Research vs annual results</h3><p className="eq-q">Several research figures differ from the companies' year-end disclosures</p></div>
            <div className="eq-actions">
              <button type="button" className="eq-btn" onClick=${loadReported} disabled=${loaded}><${Icon} name="upload" />Load reported values</button>
              ${p.changed.length > 0 && html`<button type="button" className="eq-btn ghost" onClick=${p.restoreAll}><${Icon} name="reset" />Restore research values</button>`}
            </div></div>
          <div className="eq-tablewrap"><table className="eq-table">
            <thead><tr><th scope="col">Figure</th><th className="r" scope="col">Research</th><th className="r" scope="col">Annual results</th><th className="r" scope="col">Difference</th><th scope="col">Basis</th></tr></thead>
            <tbody>${D.RECONCILE.map((x) => {
              const d = D.inputDef(x.key), c = E.change(d.value, x.reported, d.unit);
              return html`<tr key=${x.key}><td>${d.short}<br /><span className="muted">${x.asOf} · ${cite(x.source)}</span></td>
                <td className="r">${f(d.value, d.unit, { compact: true })}</td><td className="r"><b>${f(x.reported, d.unit, { compact: true, dp: d.unit === "EGP bn" ? 2 : undefined })}</b></td>
                <td className="r">${E.fmtChange(c, d.unit)}</td><td className="muted">${x.note}</td></tr>`;
            })}</tbody>
          </table></div>
          <p className="eq-source">"Load reported values" copies these year-end figures into the Input lab as your inputs, so every chart, metric and risk updates. The research values stay as the baseline. Some differences are timing: research figures are dated May–Q2 2026 or undated, while the reports give December 2025 positions.</p>
        </div>
      </div>
    <//>`;
  }

  // ------------------------------------------------------------------ INPUT LAB
  function Lab(p) {
    const fileRef = useRef(null);
    const [importMsg, setImportMsg] = useState(null);
    const riskChanges = p.risks.map((r) => ({ r, before: p.baseRisks.find((x) => x.id === r.id).status })).filter((x) => x.r.status !== x.before && !x.r.qualitative);
    const narrative = I.narrateChanges(p.changed, p.deltas);

    const onFile = (e) => {
      const file = e.target.files && e.target.files[0];
      e.target.value = "";
      if (!file) return;
      if (file.size > 1e6) { setImportMsg({ ok: false, errors: ["The file is larger than 1 MB. Import a CSV with key,value rows."] }); return; }
      const rd = new FileReader();
      rd.onload = () => {
        const res = E.importInputs(String(rd.result), p.inputs);
        if (res.ok) { p.snapshot(); p.setRaw(Object.assign({}, p.raw, res.values)); setImportMsg({ ok: true, text: `Imported ${res.applied.length} value${res.applied.length > 1 ? "s" : ""} from ${file.name}.` }); }
        else setImportMsg(res);
      };
      rd.onerror = () => setImportMsg({ ok: false, errors: ["The file could not be read."] });
      rd.readAsText(file);
    };

    const presetActive = (pr) => D.INPUTS.every((d) => p.inputs[d.key] === (pr.values[d.key] ?? p.baseline[d.key]));
    return html`<${Section} id="lab" eyebrow="Input lab" title="Change a figure. Watch everything follow."
      lede="Start from a preset or edit any field. Use the slider, type a value, or tap a quick chip. Every metric, chart, risk and insight updates instantly, and the research values are always one click away.">
      <div className="eq-presets" role="group" aria-label="Input presets">
        ${D.INPUT_PRESETS.map((pr) => html`<button key=${pr.id} type="button" className="eq-preset" aria-pressed=${presetActive(pr)}
          onClick=${() => p.applyPreset(pr)}>
          <b>${pr.name}<${Prov} kind=${pr.kind} /></b>
          <small>${pr.blurb}</small>
        </button>`)}
      </div>
      <div className="eq-lab">
        <div>
          ${Object.keys(D.GROUPS).map((g, gi) => {
            const defs = D.INPUTS.filter((d) => d.group === g);
            const nCh = defs.filter((d) => p.inputs[d.key] !== p.baseline[d.key]).length;
            return html`<details className="eq-fs" key=${g} open=${gi < 2}>
              <summary>${D.GROUPS[g].title}${nCh > 0 && html`<span className="eq-fs-count">${nCh} edited</span>`}</summary>
              <p className="eq-fs-hint">${D.GROUPS[g].hint}</p>
              ${defs.map((d) => html`<${NumField} key=${d.key} def=${d} raw=${p.raw[d.key]} error=${p.validation.errors[d.key]}
                baseline=${p.baseline[d.key]} onChange=${p.setInput} onSet=${p.setTracked} onSnapshot=${p.snapshot} onReset=${() => p.setTracked(d.key, p.baseline[d.key])} />`)}
            </details>`;
          })}
        </div>
        <aside className="eq-lab-side" aria-label="Effect of your changes">
          <div className="eq-panel">
            <div className="eq-panel-head"><h3>Live results</h3><span className="eq-kpi-text">vs research values</span></div>
            <div className="eq-live">${LIVE_IDS.map((id) => {
              const m = E.metricDef(id), v = p.metrics[id].value, b = p.baseMetrics[id].value;
              const cls = !isNum(v) || !isNum(b) || Math.abs(v - b) < 1e-12 ? "same" : v > b ? "up" : "down";
              return html`<div className="eq-live-item" key=${id}><span>${LIVE_LABEL[id]}</span><b><${AnimNum} value=${v} unit=${m.unit} opts=${{ compact: true, dp: m.unit === "x" && v > 100 ? 0 : undefined }} /></b>
                <em className=${cls}>${cls === "same" ? "unchanged" : E.fmtChange(E.change(b, v, m.unit), m.unit)}</em></div>`;
            })}</div>
          </div>
          <div className="eq-panel">
            <div className="eq-panel-head"><h3>What changed</h3>
              <div className="eq-actions">
                <button type="button" className="eq-btn ghost" onClick=${p.undo} disabled=${!p.canUndo} title="Undo (⌘Z)"><${Icon} name="undo" />Undo</button>
                <button type="button" className="eq-btn ghost" onClick=${p.restoreAll} disabled=${!p.changed.length && !p.nErrors}><${Icon} name="reset" />Reset all</button>
              </div></div>
            ${p.nErrors > 0 && html`<p className="eq-alert" style=${{ marginBottom: 10 }}>${p.nErrors} input${p.nErrors > 1 ? "s are" : " is"} invalid. Metrics that depend on ${p.nErrors > 1 ? "them" : "it"} show "—" until fixed; they are never treated as zero.</p>`}
            ${!p.changed.length ? html`<p className="eq-empty">You're looking at the original research values. Pick a preset or move a slider to see what changes, and why.</p>` : html`
              <ul className="eq-changes" aria-live="polite">
                ${p.changed.map((c) => html`<li key=${c.key}><b>${c.def.short}</b>: ${f(c.from, c.def.unit)} → ${isNum(c.to) ? f(c.to, c.def.unit) : "invalid"} <span className="eq-num">(${E.fmtChange(c, c.def.unit)})</span></li>`)}
              </ul>
              <h4 style=${{ fontSize: "0.85rem", margin: "14px 0 6px" }}>Effect on the analysis</h4>
              ${narrative.length ? html`<ul className="eq-changes">${narrative.map((s, k) => html`<li key=${k}>${s}</li>`)}</ul>` : html`<p className="eq-empty">No calculated metric depends on the changed inputs.</p>`}
              ${p.deltas.length > 8 && html`<p className="eq-kpi-text" style=${{ marginTop: 6 }}>${p.deltas.length - 8} more metrics changed. See the formula table below.</p>`}
              <h4 style=${{ fontSize: "0.85rem", margin: "14px 0 6px" }}>Risk indicators</h4>
              ${riskChanges.length ? html`<ul className="eq-changes">${riskChanges.map((x) => html`<li key=${x.r.id}><b>${x.r.name}</b>: ${STATUS[x.before].label} → <${Pill} status=${x.r.status} /></li>`)}</ul>`
                : html`<p className="eq-empty">No risk status changed from the research baseline.</p>`}
            `}
            ${p.validation.warnings.map((w, k) => html`<p key=${k} className="eq-alert info" style=${{ marginTop: 10 }}>${w}</p>`)}
          </div>
          <div className="eq-panel">
            <h3>Data management</h3>
            <div className="eq-actions" style=${{ marginTop: 10 }}>
              <button type="button" className="eq-btn primary" onClick=${p.restoreAll} disabled=${!p.changed.length && !p.nErrors}><${Icon} name="reset" />Restore research values</button>
              <button type="button" className="eq-btn" onClick=${() => p.save("efg-quilter-dashboard.csv", buildCSV(p))}><${Icon} name="download" />Export CSV</button>
              <button type="button" className="eq-btn" onClick=${() => p.save("efg-quilter-summary.md", buildSummary(p))}><${Icon} name="file" />Download summary</button>
              <button type="button" className="eq-btn" onClick=${() => fileRef.current.click()}><${Icon} name="upload" />Import CSV</button>
              <input ref=${fileRef} type="file" accept=".csv,text/csv" hidden onChange=${onFile} aria-label="Import CSV file" />
            </div>
            ${importMsg && (importMsg.ok ? html`<p className="eq-alert info" style=${{ marginTop: 10 }} role="status">${importMsg.text}</p>`
              : html`<div className="eq-alert" style=${{ marginTop: 10 }} role="alert">Nothing was imported. Fix these problems and try again:<ul>${importMsg.errors.map((e, k) => html`<li key=${k}>${e}</li>`)}</ul></div>`)}
            <details className="eq-more" style=${{ marginTop: 10 }}>
              <summary>CSV import format</summary>
              <p className="eq-kpi-text" style=${{ marginTop: 6 }}>A header row containing <code className="eq-f">key</code> and <code className="eq-f">value</code>, then one row per input. An exported file can be re-imported directly; only its <code className="eq-f">input</code> rows are read. All rows are checked against the same rules as the form, and nothing is applied if any row fails.</p>
              <pre className="eq-f" style=${{ background: "var(--surface-2)", padding: 8, overflowX: "auto", marginTop: 6 }}>key,value${"\n"}valuCustomers,1000000${"\n"}fxEgpPerGbp,66.5</pre>
              <p className="eq-kpi-text">Valid keys: ${D.INPUTS.map((d) => d.key).join(", ")}.</p>
            </details>
          </div>
        </aside>
      </div>
      <${FormulaTable} ...${p} />
    <//>`;
  }

  /** Search + click-to-sort for any table. `sorters` maps a column key to a value getter. */
  function useTable(rows, sorters, searchText) {
    const [q, setQ] = useState("");
    const [sort, setSort] = useState(null);
    const view = useMemo(() => {
      let r = rows;
      if (q.trim()) { const s = q.trim().toLowerCase(); r = r.filter((x) => searchText(x).toLowerCase().includes(s)); }
      if (sort) {
        const g = sorters[sort.key];
        r = r.slice().sort((a, b) => {
          const x = g(a), y = g(b);
          if (x == null || y == null) return x == null && y == null ? 0 : x == null ? 1 : -1;   // blanks always last
          const n = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y));
          return sort.dir === "asc" ? n : -n;
        });
      }
      return r;
    }, [rows, q, sort]);
    const th = (key, label, cls) => html`<th key=${key} className=${cls || ""} scope="col" aria-sort=${sort && sort.key === key ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}>
      <button type="button" className="eq-sort" data-dir=${sort && sort.key === key ? sort.dir : undefined}
        onClick=${() => setSort((s) => (s && s.key === key ? (s.dir === "asc" ? { key, dir: "desc" } : null) : { key, dir: "asc" }))}>${label}</button></th>`;
    const search = (ph) => html`<label className="eq-search"><${Icon} name="search" /><input type="search" placeholder=${ph} aria-label=${ph} value=${q} onChange=${(e) => setQ(e.target.value)} /></label>`;
    return { view, th, search, q };
  }

  function FormulaTable(p) {
    const [onlyChanged, setOnlyChanged] = useState(false);
    const [open, setOpen] = useState(null);
    const rows = useMemo(() => E.METRICS.map((m) => {
      const c = p.metrics[m.id], b = p.baseMetrics[m.id];
      const ch = isNum(c.value) && isNum(b.value) ? Math.abs(c.value - b.value) > 1e-12 : c.value !== b.value;
      return { m, c, b, ch, rel: isNum(c.value) && isNum(b.value) && b.value !== 0 ? Math.abs((c.value - b.value) / b.value) : 0 };
    }).filter((r) => !onlyChanged || r.ch), [p.metrics, p.baseMetrics, onlyChanged]);
    const t = useTable(rows, { name: (r) => r.m.label, cur: (r) => r.c.value, base: (r) => r.b.value, move: (r) => r.rel },
      (r) => `${r.m.label} ${r.m.formula}`);
    return html`<details className="eq-more eq-panel" style=${{ marginTop: 4 }}>
      <summary>Every calculated metric: formula, numerator, denominator (${E.METRICS.length})</summary>
      <div className="eq-filter" style=${{ marginTop: 10 }}>
        ${t.search("Search metrics or formulas")}
        <${Seg} label="Rows shown" value=${onlyChanged ? "changed" : "all"} onChange=${(v) => setOnlyChanged(v === "changed")}
          options=${[{ value: "all", label: "All" }, { value: "changed", label: `Changed (${E.METRICS.filter((m) => p.metrics[m.id].value !== p.baseMetrics[m.id].value).length})` }]} />
        <span className="eq-kpi-text">Click a row for its inputs. Click a header to sort.</span>
      </div>
      <div className="eq-tablewrap">
        <table className="eq-table">
          <thead><tr>${t.th("name", "Metric")}<th scope="col">Formula</th><th className="r" scope="col">Numerator</th><th className="r" scope="col">Denominator</th>
            ${t.th("cur", "Current", "r")}${t.th("base", "Research", "r")}${t.th("move", "Moved", "r")}</tr></thead>
          <tbody>${t.view.length ? t.view.map(({ m, c, b, ch, rel }) => html`
            <tr key=${m.id} className=${"eq-row-btn" + (ch ? " is-changed" : "")} onClick=${() => setOpen(open === m.id ? null : m.id)} aria-expanded=${open === m.id}>
              <td>${m.label}</td><td><code>${m.formula}</code></td>
              <td className="r">${isNum(c.num) ? E.fmtPlain(E.round(c.num, 2)) : html`<span className="muted">—</span>`}</td>
              <td className="r">${isNum(c.den) ? E.fmtPlain(E.round(c.den, 2)) : html`<span className="muted">—</span>`}</td>
              <td className="r">${isNum(c.value) ? html`<b>${f(c.value, m.unit)}</b>` : html`<span className="muted">${c.missing && c.missing.length ? "missing input" : "n/a"}</span>`}</td>
              <td className="r muted">${f(b.value, m.unit)}</td>
              <td className="r">${ch && isNum(c.value) && isNum(b.value) ? E.fmtChange(E.change(b.value, c.value, m.unit), m.unit) : html`<span className="muted">—</span>`}</td>
            </tr>
            ${open === m.id && html`<tr key=${m.id + "-x"} className="eq-expand"><td colSpan="7">
              <b>Inputs:</b> ${m.deps.map((k, n) => html`<span key=${k}>${n ? " · " : " "}${D.inputDef(k).short} = ${f(p.inputs[k], D.inputDef(k).unit, { compact: true })} <button type="button" className="eq-mini" onClick=${(e) => { e.stopPropagation(); focusInput(k); }}>adjust</button></span>`)}
            </td></tr>`}`)
            : html`<tr><td colSpan="7" className="muted">${onlyChanged ? "No metric has changed yet. Edit an input or pick a preset." : "No metric matches your search."}</td></tr>`}</tbody>
        </table>
      </div>
    </details>`;
  }

  function ProvenanceTable() {
    const rows = D.INPUTS;
    const t = useTable(rows, { fig: (d) => d.label, asof: (d) => d.asOf, src: (d) => sourceOf(d), type: (d) => PROV_LABEL[d.provenance] },
      (d) => `${d.label} ${d.key} ${d.note} ${sourceOf(d)} ${PROV_LABEL[d.provenance]}`);
    return html`<div>
      <div className="eq-filter">${t.search("Search figures, sources or notes")}<span className="eq-kpi-text">${t.view.length} of ${rows.length} figures</span></div>
      <div className="eq-tablewrap"><table className="eq-table">
        <thead><tr>${t.th("fig", "Figure")}<th className="r" scope="col">Value</th>${t.th("asof", "As of")}${t.th("src", "Source")}${t.th("type", "Type")}<th scope="col">Note</th></tr></thead>
        <tbody>${t.view.map((d) => html`<tr key=${d.key}><td>${d.label}<br /><code>${d.key}</code></td><td className="r">${f(d.value, d.unit)}</td><td>${d.asOf}</td>
          <td>${sourceOf(d)}</td><td><${Prov} kind=${d.provenance} /></td><td className="muted">${d.note}</td></tr>`)}</tbody>
      </table></div>
    </div>`;
  }

  // ------------------------------------------------------------------ SCENARIOS
  const OUTPUTS = [
    { key: "assetsGBPbn", label: "Platform assets (GBP)", unit: "GBP bn", dp: 3 },
    { key: "assetsEGPbn", label: "Platform assets (EGP)", unit: "EGP bn", dp: 2 },
    { key: "feesEGPm", label: "Annual fee income (EGP)", unit: "EGP m", dp: 1 },
    { key: "pctOfQuilter", label: "Share of Quilter's assets", unit: "%", dp: 2 },
    { key: "adopters", label: "Customers with savings", unit: "customers", dp: 0 },
  ];

  function Scenarios(p) {
    const t = p.tokens, sc = p.scenarios, res = p.results, sel = p.selScen;
    const colors = SCEN_COLORS(t);
    const [lineKey, setLineKey] = useState("assetsGBPbn");
    const [visible, setVisible] = useState({ base: true, optimistic: true, adverse: true, custom: true });
    const [heatOut, setHeatOut] = useState("assetsGBPbn");
    const out = OUTPUTS.find((o) => o.key === lineKey);
    const ids = ["base", "optimistic", "adverse", "custom"];
    const H = Math.max(...ids.map((k) => (res[k].ok ? res[k].H : 0)));
    const lineData = Array.from({ length: H + 1 }, (_, y) => {
      const r = { year: y };
      ids.forEach((k) => { if (res[k].ok && res[k].rows[y]) r[k] = res[k].rows[y][lineKey]; });
      return r;
    });
    const cur = sc[sel], curRes = res[sel];
    const torn = useMemo(() => E.tornado(p.inputs, cur), [p.inputs, cur]);
    const adoptVals = [2.5, 5, 10, 15, 20, 30], balVals = [5000, 10000, 20000, 30000, 50000, 75000];
    const heat = useMemo(() => E.grid(p.inputs, cur, adoptVals, balVals, heatOut), [p.inputs, cur, heatOut]);
    const heatFlat = heat.flat().filter(isNum);
    const hMin = Math.min(...heatFlat), hMax = Math.max(...heatFlat);
    const heatColor = (v) => {
      if (!isNum(v) || hMax <= hMin) return { bg: "transparent", fg: t.ink };
      const z = Math.log(v - hMin + 1) / Math.log(hMax - hMin + 1);
      const k = Math.min(BLUE_RAMP.length - 1, Math.round(z * (BLUE_RAMP.length - 1)));
      return { bg: BLUE_RAMP[k], fg: k >= 6 ? "#ffffff" : "#0d366b" };
    };
    const heatUnit = OUTPUTS.find((o) => o.key === heatOut);
    const isCustom = sel === "custom";
    const fieldVal = (k) => (isCustom ? p.customRaw[k] : cur[k]);
    const setCustom = (k, v) => p.setCustomRaw((c) => Object.assign({}, c, { [k]: v }));
    const drivers = E.SCENARIO_KEYS.filter((k) => isNum(cur[k]) && cur[k] !== sc.base[k]);

    return html`<${Section} id="scenarios" eyebrow="Scenario and sensitivity analysis" title="What if EFG prioritised savings?"
      lede="The research recommends that EFG improve its digital platform, widen its investment options, prioritise savings and grow its customer base. This model sizes an EFG savings and investment platform built on its current digital customers. Change the assumptions to see how the outcome responds.">
      <div className="eq-banner" role="note"><${Icon} name="alert" /><span><b>Illustrative only.</b> None of the scenario assumptions come from the research, and the outputs are not forecasts or official results. The starting customer base (${f(p.metrics.efgDigitalCustomers.value, "customers", { compact: true })}), exchange rate and Quilter benchmark come from the Input lab.</span></div>

      <div className="eq-scen-tabs" role="group" aria-label="Scenario">
        ${ids.map((k) => html`<button key=${k} type="button" className="eq-scen-tab" aria-pressed=${sel === k} onClick=${() => p.setSelScen(k)}>
          <span style=${{ display: "inline-flex", gap: 6, alignItems: "center", fontWeight: 600 }}><i className="eq-sw" style=${{ background: colors[k] }}></i>${sc[k].name}</span>
          <small className="eq-num">${res[k].ok ? `${f(res[k].last.assetsGBPbn, "GBP bn", { dp: 3 })} in year ${res[k].H}` : "Invalid assumptions"}</small>
        </button>`)}
      </div>

      <div className="eq-grid eq-g2">
        <div className="eq-panel">
          <div className="eq-panel-head"><h3>${cur.name} assumptions</h3>
            <div className="eq-actions">
              ${!isCustom && html`<button type="button" className="eq-btn ghost" onClick=${() => { p.setCustomRaw(Object.assign({}, cur)); p.setSelScen("custom"); }}>Edit a copy as Custom</button>`}
              ${isCustom && html`<button type="button" className="eq-btn ghost" onClick=${() => p.setCustomRaw(Object.assign({}, D.SCENARIO_PRESETS.base))}><${Icon} name="reset" />Reset to Base</button>`}
            </div>
          </div>
          <p className="eq-kpi-text" style=${{ marginBottom: 8 }}>${cur.blurb}${!isCustom ? " Preset values are fixed; edit a copy to change them." : ""}</p>
          ${D.SCENARIO_FIELDS.map((fd) => {
            const id = "sc-" + fd.key, err = isCustom ? p.customV.errors[fd.key] : null;
            const v = fieldVal(fd.key), num = E.parseNumber(v).value;
            const sliderMax = fd.key === "balance" ? 200000 : fd.max;
            return html`<div className="eq-slider" key=${fd.key}>
              <label htmlFor=${id} style=${{ fontSize: "var(--step--1)", fontWeight: 600 }}>${fd.label}<span className="eq-field-meta" style=${{ fontWeight: 400 }}>${fd.help}</span></label>
              <div className="eq-inbox" style=${err ? { borderColor: "var(--bad)" } : null}>
                <input id=${id} type="text" inputMode="decimal" value=${v ?? ""} readOnly=${!isCustom} aria-invalid=${!!err}
                  onChange=${(e) => setCustom(fd.key, e.target.value)} />
                <span className="eq-unit">${fd.unit}</span>
              </div>
              <input type="range" min=${fd.min} max=${sliderMax} step=${fd.step} value=${isNum(num) ? Math.min(sliderMax, num) : fd.min} disabled=${!isCustom}
                aria-label=${fd.label + " slider"} onChange=${(e) => setCustom(fd.key, Number(e.target.value))} />
              ${err && html`<p className="eq-err" role="alert">${err}</p>`}
            </div>`;
          })}
        </div>

        <div className="eq-grid" style=${{ alignContent: "start" }}>
          <div className="eq-panel">
            <h3>Result: ${cur.name}</h3>
            <p className="eq-kpi-text" style=${{ marginTop: 6 }} aria-live="polite">${I.narrateScenario(cur.name, curRes, res.base, p.inputs.quilterAssets)}</p>
            ${curRes.ok && html`<div className="eq-tablewrap" style=${{ marginTop: 10 }}><table className="eq-table">
              <tbody>${OUTPUTS.map((o) => html`<tr key=${o.key}><td>${o.label}, year ${curRes.H}</td><td className="r"><b>${f(curRes.last[o.key], o.unit, { dp: o.dp, compact: o.unit === "customers" })}</b></td></tr>`)}
                <tr><td>Translation loss from depreciation</td><td className="r"><b>${f(curRes.fxLoss, "%")}</b></td></tr></tbody></table></div>`}
            <p className="eq-kpi-text" style=${{ marginTop: 10 }}><b>Key drivers vs Base:</b> ${sel === "base" ? "this is the reference case." : drivers.length ? drivers.map((k) => { const fd = D.SCENARIO_FIELDS.find((x) => x.key === k); return `${fd.label} ${f(sc.base[k], fd.unit)} → ${f(cur[k], fd.unit)}`; }).join("; ") + "." : "same assumptions as Base."}</p>
          </div>
          <div className="eq-panel">
            <h3>Most influential assumptions</h3>
            <p className="eq-q">Change in year-${isNum(cur.horizon) ? cur.horizon : "H"} GBP assets when each assumption moves on its own (${cur.name})</p>
            ${torn.ok ? html`<div className="eq-chart" style=${{ height: 250 }} role="img" aria-label=${"Sensitivity ranking: " + torn.rows.map((r) => r.label).join(", ")}>
              <${ResponsiveContainer}><${BarChart} data=${torn.rows} layout="vertical" stackOffset="sign" margin=${{ top: 4, right: 16, left: 4, bottom: 18 }} barCategoryGap="22%">
                <${CartesianGrid} stroke=${t.rule} strokeDasharray="2 4" />
                <${XAxis} type="number" tickFormatter=${(v) => f(v, "GBP bn", { dp: 2 })} stroke=${t.rule} />
                <${YAxis} type="category" dataKey="label" width=${112} stroke=${t.rule} tick=${{ fontSize: 10.5 }} />
                <${ReferenceLine} x=${0} stroke=${t.ink} />
                <${Tooltip} cursor=${{ fill: "transparent" }} content=${(q) => q.active && q.payload && q.payload.length ? html`<div className="eq-tip"><b>${q.label}</b>
                  <div className="eq-tip-row"><span>Lower: ${f(q.payload[0].payload.lo, q.payload[0].payload.unit)}</span><span>${E.fmtChange({ abs: q.payload[0].payload.dLo, rel: E.safeDiv(q.payload[0].payload.dLo, torn.base) * 100, isPP: false }, "GBP bn")}</span></div>
                  <div className="eq-tip-row"><span>Higher: ${f(q.payload[0].payload.hi, q.payload[0].payload.unit)}</span><span>${E.fmtChange({ abs: q.payload[0].payload.dHi, rel: E.safeDiv(q.payload[0].payload.dHi, torn.base) * 100, isPP: false }, "GBP bn")}</span></div></div>` : null} />
                <${Bar} dataKey="dLo" stackId="s" name="Assumption lowered" fill=${t.rival} isAnimationActive=${ANIM} />
                <${Bar} dataKey="dHi" stackId="s" name="Assumption raised" fill=${t.efg} isAnimationActive=${ANIM} />
              <//><//>
            </div>
            <div className="eq-key"><span><i className="eq-sw" style=${{ background: t.rival }}></i>Assumption lowered</span><span><i className="eq-sw" style=${{ background: t.efg }}></i>Assumption raised</span><span>Base value ${f(torn.base, "GBP bn", { dp: 3 })}</span></div>
            <p className="eq-source">Swings: growth, adoption and balance growth ±5/±5/±4 pp; launch balance ±25%; depreciation ±8 pp; fee ±25 bps.</p>`
            : html`<p className="eq-empty">Fix the invalid assumptions to see the sensitivity.</p>`}
          </div>
        </div>
      </div>

      <div className="eq-grid eq-g2" style=${{ marginTop: 16 }}>
        <${ChartPanel} title="Scenario paths" question="How do the scenarios diverge over time?"
          controls=${html`<select aria-label="Output shown" value=${lineKey} onChange=${(e) => setLineKey(e.target.value)} className="eq-btn ghost">${OUTPUTS.map((o) => html`<option key=${o.key} value=${o.key}>${o.label}</option>`)}</select>`}
          source="Illustrative model. Adoption ramps linearly from zero in year 0 to the target in the final year. GBP values use the projected exchange rate for each year."
          table=${html`<${DataTable} caption="Scenario paths" cols=${["Year", ...ids.map((k) => sc[k].name)]} rows=${lineData.map((r) => [r.year, ...ids.map((k) => f(r[k], out.unit, { dp: out.dp, compact: out.unit === "customers" }))])} />`}>
          <div className="eq-toggles" style=${{ marginBottom: 6 }}>${ids.map((k) => html`<label key=${k}><input type="checkbox" checked=${visible[k]} onChange=${() => setVisible((v) => Object.assign({}, v, { [k]: !v[k] }))} /><i className="eq-sw" style=${{ background: colors[k] }}></i>${sc[k].name}</label>`)}</div>
          <div className="eq-chart tall" role="img" aria-label=${`${out.label} by year for each scenario.`}>
            <${ResponsiveContainer}><${LineChart} data=${lineData} margin=${{ top: 10, right: 16, left: 4, bottom: 18 }}>
              <${CartesianGrid} stroke=${t.rule} strokeDasharray="2 4" />
              <${XAxis} dataKey="year" stroke=${t.rule} label=${{ value: "Year", position: "insideBottom", offset: -10 }} />
              <${YAxis} tickFormatter=${(v) => f(v, out.unit, { dp: out.unit === "GBP bn" ? 2 : 0, compact: true })} stroke=${t.rule} width=${64} />
              <${Tooltip} content=${(q) => html`<${Tip} ...${q} title=${"Year " + q.label} unit=${out.unit} fmtOpts=${{ dp: out.dp, compact: out.unit === "customers" }} />`} />
              ${ids.filter((k) => visible[k] && res[k].ok).map((k) => html`<${Line} key=${k} dataKey=${k} name=${sc[k].name} stroke=${colors[k]} strokeWidth=${k === sel ? 3 : 2}
                strokeDasharray=${k === "custom" ? "6 4" : undefined} dot=${{ r: 3 }} activeDot=${{ r: 5 }} isAnimationActive=${ANIM} />`)}
            <//><//>
          </div>
        <//>

        <${ChartPanel} title="Two-way sensitivity" question="Which combinations of adoption and balance would matter?"
          controls=${html`<select aria-label="Heatmap output" value=${heatOut} onChange=${(e) => setHeatOut(e.target.value)} className="eq-btn ghost">${OUTPUTS.slice(0, 4).map((o) => html`<option key=${o.key} value=${o.key}>${o.label}</option>`)}</select>`}
          source=${`Final-year ${heatUnit.label.toLowerCase()} for the ${cur.name} scenario, varying only adoption and launch balance. Darker cells are larger. The outlined cell is closest to the current assumptions.`}>
          <div className="eq-tablewrap"><table className="eq-table eq-heat">
            <caption className="sr-only">Final-year output by adoption and balance</caption>
            <thead><tr><th scope="col">Adoption ↓ / Balance →</th>${balVals.map((bv) => html`<th key=${bv} className="r" scope="col">${f(bv, "EGP", { compact: true })}</th>`)}</tr></thead>
            <tbody>${adoptVals.map((a, r) => {
              const nearA = adoptVals.reduce((x, y) => (Math.abs(y - cur.adoption) < Math.abs(x - cur.adoption) ? y : x));
              const nearB = balVals.reduce((x, y) => (Math.abs(y - cur.balance) < Math.abs(x - cur.balance) ? y : x));
              return html`<tr key=${a}><th scope="row">${f(a, "%")}</th>${balVals.map((bv, c) => {
                const v = heat[r][c], col = heatColor(v);
                return html`<td key=${bv} className=${"cell" + (a === nearA && bv === nearB ? " cur" : "")} style=${{ background: col.bg, color: col.fg }}
                  title=${`Adoption ${a}%, balance ${f(bv, "EGP")}: ${f(v, heatUnit.unit, { dp: heatUnit.dp })}`}>${f(v, heatUnit.unit, { dp: heatUnit.unit === "GBP bn" ? 3 : heatUnit.unit === "%" ? 2 : 1, compact: true })}</td>`;
              })}</tr>`;
            })}</tbody>
          </table></div>
        <//>
      </div>

      <div className="eq-panel" style=${{ marginTop: 16 }}>
        <h3>Side-by-side comparison</h3>
        <p className="eq-q">Final-year results; changes are measured against Base (pp for percentages)</p>
        <div className="eq-tablewrap" style=${{ marginTop: 8 }}><table className="eq-table">
          <thead><tr><th scope="col">Item</th>${ids.map((k) => html`<th key=${k} className="r" scope="col">${sc[k].name}</th>`)}</tr></thead>
          <tbody>
            ${D.SCENARIO_FIELDS.map((fd) => html`<tr key=${fd.key}><td className="muted">${fd.label} <span className="eq-prov assumption">Assumption</span></td>${ids.map((k) => html`<td key=${k} className="r">${f(sc[k][fd.key], fd.unit)}</td>`)}</tr>`)}
            ${[...OUTPUTS, { key: "fxLoss", label: "Translation loss", unit: "%", dp: 1 }].map((o) => html`<tr key=${o.key}><td><b>${o.label}</b></td>${ids.map((k) => {
              const r = res[k]; if (!r.ok) return html`<td key=${k} className="r muted">—</td>`;
              const v = o.key === "fxLoss" ? r.fxLoss : r.last[o.key], bv = o.key === "fxLoss" ? res.base.fxLoss : res.base.last[o.key];
              const c = E.change(bv, v, o.unit);
              return html`<td key=${k} className="r"><b>${f(v, o.unit, { dp: o.dp, compact: o.unit === "customers" })}</b>${k !== "base" && html`<br /><span className="muted">${E.fmtChange(c, o.unit)}</span>`}</td>`;
            })}</tr>`)}
          </tbody>
        </table></div>
      </div>
    <//>`;
  }

  // ------------------------------------------------------------------ RISKS
  /** The input that most directly moves each quantified risk. */
  const DRIVER = { currency: "scenario", concentration: "leasingPortfolio", competition: "compBnplShare", inclusion: "egyptReachLow", saturation: "ukInclusion", costs: "efgOpex" };
  const NEXT = {
    currency: "Compare the depreciation assumption with the CBE's published rate history, and test whether returns on EGP savings products beat inflation.",
    concentration: "Obtain segment disclosures from EFG Holding's annual report to see credit quality and income by product line.",
    competition: "Find the source of the Thndr / Contact figures and a time series of shares to see whether EFG's lead is narrowing.",
    inclusion: "Check whether the Egypt and UK figures use the same definition before relying on the size of the gap.",
    saturation: "Look at Quilter's net flows over several years to see whether growth is slowing.",
  };
  function Risks(p) {
    const [open, setOpen] = useState(false);
    return html`<${Section} id="risks" eyebrow="Risk analysis" title="Risks named in the research"
      lede="Each risk is tied to the research evidence behind it. Where the research supports a number, it is monitored against a threshold. All thresholds are analyst assumptions for discussion, not regulatory limits. Risks without data are shown as qualitative.">
      <div className="eq-actions" style=${{ marginBottom: 14, justifyContent: "space-between" }}>
        <div className="eq-key">${["ok", "watch", "elevated", "qualitative"].map((s) => html`<${Pill} key=${s} status=${s} />`)}</div>
        <span className="eq-kpi-text">Currency risk uses the <b>${p.scenarios[p.selScen].name}</b> scenario. Change it in Scenarios.</span>
      </div>
      <details className="eq-more eq-panel" open=${open} onToggle=${(e) => setOpen(e.target.open)} style=${{ marginBottom: 14 }}>
        <summary>Edit thresholds (illustrative)</summary>
        <div className="eq-grid eq-g3" style=${{ marginTop: 10 }}>
          ${Object.keys(D.THRESHOLDS).map((k) => {
            const d = D.THRESHOLDS[k], err = E.parseNumber(p.thRaw[k]).error;
            return html`<div key=${k} className="eq-slider" style=${{ gridTemplateColumns: "minmax(0,1fr) 110px" }}>
              <label htmlFor=${"th-" + k} style=${{ fontSize: "var(--step--1)" }}>${d.label}</label>
              <div className="eq-inbox"><input id=${"th-" + k} type="text" inputMode="decimal" value=${p.thRaw[k]} aria-invalid=${!!err}
                onChange=${(e) => p.setThRaw((o) => Object.assign({}, o, { [k]: e.target.value }))} /><span className="eq-unit">${d.unit}</span></div>
              ${err && html`<p className="eq-err">${err}; using default ${d.value}</p>`}
            </div>`;
          })}
        </div>
        <div className="eq-actions" style=${{ marginTop: 10 }}><button type="button" className="eq-btn ghost" onClick=${() => p.setThRaw(p.defTh)}><${Icon} name="reset" />Reset thresholds</button></div>
      <//>
      <div className="eq-risks">
        ${p.risks.map((r) => html`<article key=${r.id} className=${"eq-risk " + r.status} aria-labelledby=${"risk-" + r.id}>
          <div className="eq-risk-stripe"></div>
          <div className="eq-risk-body">
            <div className="eq-risk-top">
              <div><h3 id=${"risk-" + r.id} style=${{ fontSize: "var(--step-1)" }}>${r.name}</h3><p className="eq-q">${r.evidence}</p></div>
              <${Pill} status=${r.status} />
            </div>
            <dl className="eq-risk-grid">
              <div><dt>Indicator</dt><dd>${r.metricLabel}${!r.qualitative && html`<div className="eq-risk-metric">${f(r.value, r.unit)}</div>`}</dd></div>
              <div><dt>Threshold</dt><dd>${r.threshold}</dd></div>
              <div><dt>Potential impact</dt><dd>${r.impact}</dd></div>
              <div><dt>Mitigating action</dt><dd>${r.mitigation}</dd></div>
              <div><dt>Limitations</dt><dd>${r.limits}</dd></div>
              ${(r.status === "watch" || r.status === "elevated") && NEXT[r.id] && html`<div><dt>Why flagged · investigate next</dt><dd>The indicator ${r.status === "elevated" ? "breaches the elevated" : "has reached the watch"} threshold. ${NEXT[r.id]}</dd></div>`}
              ${DRIVER[r.id] && html`<div><dt>Test it</dt><dd>${DRIVER[r.id] === "scenario"
                ? html`<a href="#scenarios">Change the depreciation assumption in Scenarios →</a>`
                : html`<button type="button" className="eq-link" onClick=${() => focusInput(DRIVER[r.id])}>Adjust ${D.inputDef(DRIVER[r.id]).short} in the Input lab →</button>`}</dd></div>`}
            </dl>
          </div>
        </article>`)}
      </div>
    <//>`;
  }

  // ------------------------------------------------------------------ CONCLUSIONS
  function Conclusions(p) {
    const bm = p.baseMetrics, b = p.baseline, r = p.results[p.selScen], sc = p.scenarios[p.selScen];
    const chip = (label, text) => html`<span className="eq-chip" key=${label}>${label}: <b>${text}</b></span>`;
    const findings = [
      { title: "Business models and market differences", slide: 10,
        text: "EFG Hermes offers investment banking, brokerage, consumer finance, microfinance and leasing. Quilter specialises in wealth management, financial planning, pensions and long-term investment.",
        ev: [chip("EFG brokerage share", f(b.efgBrokerageShare, "%")), chip("Credit portfolio", f(bm.efgFinancePortfolio.value, "EGP bn")),
          chip("Quilter assets", f(b.quilterAssets, "GBP bn", { dp: 0 })), chip("Value per customer", f(bm.valueIntensity.value, "x", { dp: 0 }))] },
      { title: "Digital transformation and cybersecurity", slide: 10,
        text: "Egypt's market is still developing in inclusion and finance; the UK's is mature. Digital technology is central to both firms, and cybersecurity and data protection are critical to customer trust.",
        ev: [chip("Egypt reach", `${f(b.egyptReachLow, "%", { dp: 0 })}–${f(b.egyptReachHigh, "%", { dp: 0 })}`), chip("UK inclusion", f(b.ukInclusion, "%", { dp: 0 })),
          chip("EFG digital customers", f(bm.efgDigitalCustomers.value, "customers", { compact: true }))] },
      { title: "Different constraints", slide: 4,
        text: "Egypt's challenges are low financial literacy, currency risk and a narrow product range. The UK's challenge is growth rather than access.",
        ev: [chip("Inclusion gap", f(bm.inclusionGapMid.value, "pp", { dp: 0 })), chip("UK headroom", f(bm.ukHeadroom.value, "pp", { dp: 0 })),
          chip("Quilter vs leader", f(bm.quilterGap.value, "pp", { dp: 0 }))] },
    ];
    const recs = [
      { title: "Improve digital platform", text: "Invest in simpler, more connected digital services so customers can manage all their EFG products in one place.",
        ev: `EFG already reaches ${f(bm.efgDigitalCustomers.value, "customers", { compact: true })} customers through valU, Tanmeyah and Bank NXT.`, cond: null },
      { title: "Greater range of investment options", text: "Add user-friendly investment products alongside credit, following Quilter's platform and ISA-style offer.",
        ev: `All ${f(bm.efgFinancePortfolio.value, "EGP bn")} of the EFG Finance portfolio is credit; ${bm.largestLine.note} alone is ${f(bm.largestLine.value, "%")}.`,
        cond: r.ok ? `Conditional (${sc.name} scenario): ${f(sc.adoption, "%")} adoption builds ${f(r.last.assetsEGPbn, "EGP bn")} by year ${r.H}.` : null },
      { title: "Prioritise savings", text: "Educate customers on saving and investing, and lean the digital offer towards long-term savings.",
        ev: `Egypt's reach is ${f(bm.inclusionGapMid.low, "pp", { dp: 0 })}–${f(bm.inclusionGapMid.high, "pp", { dp: 0 })} below UK inclusion, with low financial literacy.`,
        cond: r.ok ? `Conditional (${sc.name} scenario): about ${f(r.last.feesEGPm, "EGP m")} of annual fee income in year ${r.H}, independent of credit.` : null },
      { title: "Grow consumer base", text: "Use the existing customer base and better engagement to grow, adapting the UK model to Egyptian regulation and customers.",
        ev: `valU's relative share in consumer finance is ${f(bm.bnplRMS.value, "x")}, narrower than ${f(bm.brokerageRMS.value, "x")} in brokerage.`,
        cond: r.ok ? `Conditional (${sc.name} scenario): ${f(r.last.customers, "customers", { compact: true })} digital customers by year ${r.H} at ${f(sc.growth, "% p.a.")} growth.` : null },
    ];
    return html`<${Section} id="conclusions" eyebrow="Recommendations and research conclusions" title="What the research concludes"
      lede="The findings and recommendations below come from the research. Their evidence uses the original research values and does not change when you edit inputs. Lines marked conditional depend on the scenario you select.">
      <div className="eq-grid eq-g3">
        ${findings.map((x) => html`<div key=${x.title} className="eq-panel" style=${{ display: "grid", gap: 8, alignContent: "start" }}>
          <span className="eq-eyebrow">Finding · slide ${x.slide}</span>
          <h3>${x.title}</h3>
          <p className="eq-kpi-text">${x.text}</p>
          <div className="eq-key">${x.ev}</div>
        </div>`)}
      </div>

      <h3 style=${{ fontFamily: "var(--font-display)", fontWeight: 400, textTransform: "uppercase", margin: "28px 0 10px", fontSize: "var(--step-1)" }}>Next steps for EFG Holding</h3>
      <div className="eq-recs">
        ${recs.map((x) => html`<div key=${x.title} className="eq-rec">
          <h4>${x.title}</h4>
          <p className="eq-kpi-text">${x.text}</p>
          <p className="eq-kpi-text"><b>Evidence:</b> ${x.ev}</p>
          ${x.cond && html`<p className="eq-kpi-text" style=${{ borderLeft: "2px dashed var(--watch)", paddingLeft: 8 }}><span className="eq-prov assumption">Conditional</span> ${x.cond}</p>`}
        </div>`)}
      </div>

      <div className="eq-grid eq-g2" style=${{ marginTop: 20 }}>
        <div className="eq-panel">
          <h3>Regulatory and policy considerations</h3>
          <ul className="eq-kpi-text" style=${{ margin: "8px 0 0 18px", padding: 0, display: "grid", gap: 4 }}>
            <li>EFG is supervised by the Financial Regulatory Authority (FRA) for non-bank activities and operates alongside the Central Bank of Egypt (CBE). Quilter is regulated by the FCA.</li>
            <li>Egypt's fintech laws only widened access to financial markets in 2022. New savings and investment products depend on that framework.</li>
            <li>Automated decisions in lending must not affect clients unfairly, and client data must be protected.</li>
            <li>The research warns that importing the UK model wholesale would not work. Adaptations must fit Egypt's economy, regulation and customers.</li>
          </ul>
        </div>
        <div className="eq-panel">
          <h3>Limitations of the analysis</h3>
          <ul className="eq-kpi-text" style=${{ margin: "8px 0 0 18px", padding: 0, display: "grid", gap: 4 }}>
            <li>No financial statements are in the research, so profitability, capital, liquidity and credit-quality conclusions are not possible.</li>
            <li>Most figures are read off charts and are approximate. The charts' original data sources are not cited.</li>
            <li>Every figure is a single point in time, and the dates differ (June 2025 to 2026), so no trends can be shown.</li>
            <li>Cross-currency comparisons depend on an exchange rate the research does not give.</li>
            <li>The scenario model is illustrative and leaves out costs, credit losses, regulation and competition.</li>
          </ul>
        </div>
      </div>
    <//>`;
  }

  // ------------------------------------------------------------------ METHOD
  function Method(p) {
    const [tests, setTests] = useState(null);
    const runTests = () => setTests(EQ.tests.run());
    const passed = tests ? tests.filter((x) => x.pass).length : 0;
    return html`<${Section} id="method" eyebrow="Methodology, definitions and sources" title="Where every number comes from"
      lede="Every figure traces to the research, a cited annual report, a disclosed formula or a labelled assumption.">
      <div className="eq-grid eq-g2">
        <div className="eq-panel">
          <h3>Conventions</h3>
          <ul className="eq-kpi-text" style=${{ margin: "8px 0 0 18px", padding: 0, display: "grid", gap: 4 }}>
            <li><b>Percent vs percentage points.</b> Shares are in %. A difference between two shares is in percentage points (pp). A relative change is in %.</li>
            <li><b>Stocks vs flows.</b> Portfolios, assets and customer counts are stocks at a point in time. Fee income in the scenario model is an annual flow.</li>
            <li><b>Currencies.</b> EGP and GBP are never mixed in one figure without conversion at the stated exchange rate. "bn" = 10⁹, "m" = 10⁶.</li>
            <li><b>Missing data.</b> An empty or invalid input is never treated as zero. Dependent metrics show "—" and name the missing input.</li>
            <li><b>Division by zero</b> returns "—" rather than infinity.</li>
            <li><b>Rounding.</b> Calculations use full precision; rounding happens only on display.</li>
          </ul>
          <h4 style=${{ fontSize: "0.85rem", margin: "14px 0 6px" }}>Value types</h4>
          <div className="eq-key">${["labelled", "chart-read", "stated", "reported", "assumption", "calculated", "user"].map((k) => html`<${Prov} key=${k} kind=${k} />`)}</div>
        </div>
        <div className="eq-panel">
          <h3>Scenario model</h3>
          <pre className="eq-f" style=${{ whiteSpace: "pre-wrap", background: "var(--surface-2)", padding: 10, marginTop: 8, fontSize: "0.75rem" }}>${`customers_t   = C₀ × (1 + growth)^t
adopters_t    = customers_t × adoption × t / H
balance_t     = B × (1 + balance growth)^(t − 1),  t ≥ 1
assets_t      = adopters_t × balance_t           (EGP)
fees_t        = assets_t × fee bps / 10,000      (EGP per year)
fx_t          = FX₀ × (1 + depreciation)^t       (EGP per £1)
assets£_t     = assets_t ÷ fx_t
% of Quilter  = assets£_t ÷ Quilter assets today
FX loss       = 1 − 1 / (1 + depreciation)^H`}</pre>
          <p className="eq-kpi-text" style=${{ marginTop: 8 }}>C₀ = EFG digital customers from the Input lab. The model leaves out costs, credit losses, tax and the effect of competition. Quilter's assets are held constant as a benchmark.</p>
        </div>
      </div>

      <div className="eq-panel" style=${{ marginTop: 16 }}>
        <h3>Research data and provenance</h3>
        <p className="eq-q">The original values. Changing an input in the Input lab never alters this table.</p>
        <div style=${{ marginTop: 8 }}><${ProvenanceTable} /></div>
      </div>

      <div className="eq-panel" style=${{ marginTop: 16 }}>
        <h3>Metric definitions</h3>
        <div className="eq-tablewrap" style=${{ marginTop: 8 }}><table className="eq-table">
          <thead><tr><th scope="col">Metric</th><th scope="col">Formula</th><th scope="col">Unit</th><th scope="col">Inputs</th></tr></thead>
          <tbody>${E.METRICS.map((m) => html`<tr key=${m.id}><td>${m.label}</td><td><code>${m.formula}</code></td><td>${m.unit}</td><td className="muted">${m.deps.map((k) => D.inputDef(k).short).join(", ")}</td></tr>`)}</tbody>
        </table></div>
      </div>

      <div className="eq-grid eq-g2" style=${{ marginTop: 16 }}>
        <div className="eq-panel">
          <h3>Missing data and open questions</h3>
          <ul className="eq-kpi-text" style=${{ margin: "8px 0 0 18px", padding: 0, display: "grid", gap: 4 }}>
            <li>No revenue, profit, cost, capital or liquidity figures for either firm.</li>
            <li>The definition of Quilter's "around £100bn" (AUM, AUA or platform only) is not given.</li>
            <li>The research charts give different readings of Quilter platform customers (≈450k on the log chart, ≈480k on the linear chart).</li>
            <li>The "Thndr / Contact" competitor series is not explained.</li>
            <li>Dates are missing for the portfolio and Quilter adviser figures.</li>
            <li>The exchange rate and product overlap are analyst assumptions.</li>
          </ul>
        </div>
        <div className="eq-panel">
          <h3>References (as cited in the research)</h3>
          <ul className="eq-kpi-text" style=${{ margin: "8px 0 0 0", padding: 0, listStyle: "none", display: "grid", gap: 6 }}>
            ${D.REFERENCES.map((r) => html`<li key=${r.id}>${r.text} <a href=${r.url} target="_blank" rel="noopener noreferrer">${r.url}</a></li>`)}
          </ul>
          <h4 style=${{ fontSize: "0.85rem", margin: "14px 0 6px" }}>Added for the profitability analysis (not in the original research)</h4>
          <ul className="eq-kpi-text" style=${{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 6 }}>
            ${D.FIN_REFERENCES.map((r) => html`<li key=${r.id}>${r.text} <a href=${r.url} target="_blank" rel="noopener noreferrer">${r.url}</a></li>`)}
          </ul>
          <p className="eq-source">The research charts carry no source line of their own. The only citations are the website references above.</p>
        </div>
      </div>

      <div className="eq-panel" style=${{ marginTop: 16 }}>
        <div className="eq-panel-head"><div><h3>Automated calculation tests</h3><p className="eq-q">Expected values worked out by hand from the research figures, plus edge cases (missing data, division by zero, invalid input, CSV handling).</p></div>
          <button type="button" className="eq-btn primary" onClick=${runTests}><${Icon} name="play" />Run tests</button></div>
        ${tests && html`<p className="eq-kpi-text" role="status" style=${{ marginBottom: 8 }}><b>${passed} of ${tests.length} passed.</b></p>
          <div className="eq-tablewrap"><table className="eq-table"><tbody>${tests.map((x, k) => html`<tr key=${k}><td style=${{ width: 120 }}><${Pill} status=${x.pass ? "ok" : "elevated"} /></td><td>${x.name}${x.message && html`<br /><span className="muted">${x.message}</span>`}</td></tr>`)}</tbody></table></div>`}
      </div>
    <//>`;
  }

  // ------------------------------------------------------------------ exports
  function buildCSV(p) {
    const rows = [["section", "key", "label", "value", "unit", "research_value", "changed", "type", "source_or_formula"]];
    D.INPUTS.forEach((d) => rows.push(["input", d.key, d.label, p.inputs[d.key], d.unit, d.value, p.inputs[d.key] !== d.value ? "yes" : "no",
      p.inputs[d.key] !== d.value ? "user input" : d.provenance, sourceOf(d)]));
    E.METRICS.forEach((m) => rows.push(["metric", m.id, m.label, E.round(p.metrics[m.id].value, 6), m.unit, E.round(p.baseMetrics[m.id].value, 6),
      p.metrics[m.id].value !== p.baseMetrics[m.id].value ? "yes" : "no", "calculated", m.formula]));
    Object.keys(p.scenarios).forEach((k) => {
      const s = p.scenarios[k], r = p.results[k];
      D.SCENARIO_FIELDS.forEach((fd) => rows.push([`scenario:${s.name}`, fd.key, fd.label, s[fd.key], fd.unit, "", "", "illustrative assumption", ""]));
      if (r.ok) r.rows.forEach((y) => OUTPUTS.forEach((o) => rows.push([`scenario:${s.name}`, `y${y.year}.${o.key}`, `${o.label}, year ${y.year}`, E.round(y[o.key], 6), o.unit, "", "", "illustrative output", "See scenario model"])));
    });
    p.risks.forEach((r) => rows.push(["risk", r.id, r.name, E.round(r.value, 6), r.unit, "", "", r.status, r.threshold]));
    return E.toCSV(rows);
  }

  function buildSummary(p) {
    const s = p.scenarios[p.selScen], r = p.results[p.selScen];
    const L = [];
    L.push(`# ${D.STUDY.title}: dashboard summary`, "", `Generated ${new Date().toISOString().slice(0, 10)}. Source: research study (${D.STUDY.course}).`, "");
    L.push("## Changed inputs", "");
    if (!p.changed.length) L.push("None. All values are the original research values.");
    p.changed.forEach((c) => L.push(`- ${c.def.label}: ${f(c.from, c.def.unit)} → ${isNum(c.to) ? f(c.to, c.def.unit) : "invalid"} (${E.fmtChange(c, c.def.unit)})`));
    L.push("", "## Key indicators", "", "| Indicator | Current | Research |", "|---|---:|---:|");
    KPI_IDS.forEach((id) => L.push(`| ${KPI_META[id].label} | ${f(kpiValue(id, p.metrics, p.inputs), KPI_META[id].unit, { dp: KPI_META[id].dp })} | ${f(kpiBase(id, p.baseMetrics, p.baseline), KPI_META[id].unit, { dp: KPI_META[id].dp })} |`));
    L.push("", `## Scenario: ${s.name} (illustrative, not a forecast)`, "");
    D.SCENARIO_FIELDS.forEach((fd) => L.push(`- ${fd.label}: ${f(s[fd.key], fd.unit)}`));
    L.push("", I.narrateScenario(s.name, r, p.results.base, p.inputs.quilterAssets), "");
    L.push("## Risk indicators (thresholds are illustrative)", "");
    p.risks.forEach((x) => L.push(`- ${x.name}: ${STATUS[x.status].label}${x.qualitative ? "" : ` (${f(x.value, x.unit)}; ${x.threshold})`}`));
    L.push("", "## Assumptions not in the original research", "", `- Exchange rate: ${f(p.inputs.fxEgpPerGbp, "EGP/GBP")}`, `- Product overlap: ${f(p.inputs.productOverlap, "%", { dp: 0 })}`, "- All scenario assumptions and risk thresholds", "");
    return L.join("\n");
  }

  // ------------------------------------------------------------------ mount
  const rootEl = document.getElementById("eq-root");
  ReactDOM.createRoot(rootEl).render(html`<${App} />`);
})();
