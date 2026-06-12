import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

const card = {
  border: "1px solid #e6e6e6",
  borderRadius: 14,
  boxShadow: "0 1px 2px rgba(0,0,0,.05)",
  background: "#fff",
  padding: 18,
  marginBottom: 14,
};
const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(12, 1fr)",
  gap: 12,
};
const field = { gridColumn: "span 3", display: "flex", flexDirection: "column", gap: 6 };
const inputStyle = {
  border: "1px solid #e6e6e6",
  borderRadius: 10,
  padding: "10px 12px",
  outline: "none",
};
const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  border: "1px solid #e6e6e6",
  borderRadius: 12,
  overflow: "hidden",
};
const thtd = { borderBottom: "1px solid #e6e6e6", padding: "10px 12px", textAlign: "left", verticalAlign: "middle" };
const pill = { border: "1px solid #e6e6e6", borderRadius: 999, padding: "8px 12px", display: "inline-block" };

const money = (n) => (isNaN(n) ? "$0.00" : `$${Number(n).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`);
const unmoney = (s) =>
  s && `${s}`.trim() !== "—" ? Number(String(s).replace(/[^0-9.\-]/g, "")) || 0 : null;

function SaniCleanCalculator() {
  const { t } = useTranslation();
  const [master, setMaster] = useState({
    insidePrice: 7,
    insideMin: 40,
    beltwayTrip: 8,

    outsidePrice: 6,
    outsideMin: null,
    outsideTripPDF: 8,

    paidBase: 7,
    smallMin: 50,
    allIncPrice: 20,
  });

  const [region, setRegion] = useState("inside");
  const [fixtures, setFixtures] = useState(10);
  const [agreementMonths, setAgreementMonths] = useState(12);
  const [tripType, setTripType] = useState("beltway8");
  const [parkingAmt, setParkingAmt] = useState(0);
  const [allInclusive, setAllInclusive] = useState("no");
  const [smallThreshold, setSmallThreshold] = useState(5);

  const { perVisit, perMonth, agreement, ruleText } = useMemo(() => {
    let unit = region === "inside" ? master.insidePrice : master.outsidePrice;
    let regMin = region === "inside" ? master.insideMin ?? 0 : master.outsideMin ?? 0;

    const isAllInc = allInclusive === "yes";
    if (isAllInc) {
      unit = master.allIncPrice;
      regMin = 0;
    }

    let trip = 0;
    if (!isAllInc) {
      if (tripType === "beltway8") trip = master.beltwayTrip;
      else if (tripType === "standard6") trip = 6;
      else if (tripType === "paid7") trip = (master.paidBase || 7) + Math.max(0, Number(parkingAmt) || 0);
      else trip = 0;
    }

    const fx = Math.max(0, Number(fixtures) || 0);
    let perVisitCalc = Math.max(unit * fx + trip, regMin || 0);

    let rule = isAllInc
      ? t("misc.rpmRuleAllInclusive")
      : t("misc.rpmRuleTrip", { trip: money(trip), min: regMin ? money(regMin) : "—" });

    if (!isAllInc && fx > 0 && fx <= Math.max(0, Number(smallThreshold) || 0)) {
      perVisitCalc = Math.max(perVisitCalc, master.smallMin);
      rule = t("misc.rpmRuleSmallAccount", { threshold: smallThreshold, min: money(master.smallMin) });
    }

    const perMonthCalc = perVisitCalc * 4.33;
    const months = Math.max(1, Number(agreementMonths) || 1);
    const agreementCalc = perMonthCalc * months;

    return {
      perVisit: perVisitCalc,
      perMonth: perMonthCalc,
      agreement: agreementCalc,
      ruleText: rule,
    };
  }, [master, region, fixtures, agreementMonths, tripType, parkingAmt, allInclusive, smallThreshold, t]);

  const updateMaster = (k, raw) => {
    const val = unmoney(raw);
    setMaster((m) => ({ ...m, [k]: val === null || Number.isNaN(val) ? m[k] : val }));
  };

  const reset = () =>
    setMaster({
      insidePrice: 7,
      insideMin: 40,
      beltwayTrip: 8,
      outsidePrice: 6,
      outsideMin: null,
      outsideTripPDF: 8,
      paidBase: 7,
      smallMin: 50,
      allIncPrice: 20,
    });

  return (
    <div>
      <div style={card}>
        <div style={grid}>
          <div style={field}>
            <label>{t("misc.rpmRegion")}</label>
            <select style={inputStyle} value={region} onChange={(e) => setRegion(e.target.value)}>
              <option value="inside">{t("misc.rpmInsideBeltway")}</option>
              <option value="outside">{t("misc.rpmOutsideBeltway")}</option>
            </select>
          </div>

          <div style={field}>
            <label>{t("misc.rpmFixturesCount")}</label>
            <input
              style={inputStyle}
              type="number"
              min={0}
              value={fixtures}
              onChange={(e) => setFixtures(Number(e.target.value) || 0)}
            />
          </div>

          <div style={field}>
            <label>{t("misc.rpmAgreementMonths")}</label>
            <input
              style={inputStyle}
              type="number"
              min={1}
              value={agreementMonths}
              onChange={(e) => setAgreementMonths(Number(e.target.value) || 0)}
            />
          </div>

          <div style={field}>
            <label>{t("misc.rpmTripCharge")}</label>
            <select style={inputStyle} value={tripType} onChange={(e) => setTripType(e.target.value)}>
              <option value="beltway8">{t("misc.rpmTripBeltway8")}</option>
              <option value="standard6">{t("misc.rpmTripStandard6")}</option>
              <option value="paid7">{t("misc.rpmTripPaid7")}</option>
              <option value="waived">{t("misc.rpmTripWaived")}</option>
            </select>
          </div>

          <div style={field}>
            <label>{t("misc.rpmParking")}</label>
            <input
              style={inputStyle}
              type="number"
              min={0}
              step="0.01"
              value={parkingAmt}
              onChange={(e) => setParkingAmt(Number(e.target.value) || 0)}
            />
          </div>

          <div style={field}>
            <label>{t("misc.rpmAllInclusive")}</label>
            <select style={inputStyle} value={allInclusive} onChange={(e) => setAllInclusive(e.target.value)}>
              <option value="no">{t("misc.rpmNo")}</option>
              <option value="yes">{t("misc.rpmAllInclusiveYes")}</option>
            </select>
          </div>

          <div style={field}>
            <label>{t("misc.rpmSmallAccountThreshold")}</label>
            <input
              style={inputStyle}
              type="number"
              min={0}
              value={smallThreshold}
              onChange={(e) => setSmallThreshold(Number(e.target.value) || 0)}
            />
            <small style={{ color: "#4a4a4a" }}>{t("misc.rpmSmallAccountHint")}</small>
          </div>
        </div>
      </div>

      <div style={card}>
        <h3 style={{ margin: "0 0 10px" }}>{t("misc.rpmMasterRates")}</h3>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thtd}>{t("misc.rpmThItem")}</th>
              <th style={thtd}>{t("misc.rpmThKey")}</th>
              <th style={thtd}>{t("misc.rpmThValue")}</th>
              <th style={thtd}>{t("misc.rpmThNotes")}</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["rpmRowInsidePrice", "insidePrice", "price", "rpmRowInsidePriceNote"],
              ["rpmRowInsideMin", "insideMin", "money", "rpmRowInsideMinNote"],
              ["rpmRowBeltwayTrip", "beltwayTrip", "money", "rpmRowBeltwayTripNote"],

              ["rpmRowOutsidePrice", "outsidePrice", "price", "rpmRowOutsidePriceNote"],
              ["rpmRowOutsideMin", "outsideMin", "moneyOrDash", "rpmRowOutsideMinNote"],
              ["rpmRowOutsideTripPDF", "outsideTripPDF", "money", "rpmRowOutsideTripPDFNote"],

              ["rpmRowPaidBase", "paidBase", "money", "rpmRowPaidBaseNote"],
              ["rpmRowSmallMin", "smallMin", "money", "rpmRowSmallMinNote"],
              ["rpmRowAllIncPrice", "allIncPrice", "price", "rpmRowAllIncPriceNote"],
            ].map(([labelKey, key, mode, noteKey]) => (
              <tr key={key}>
                <td style={thtd}>{t(`misc.${labelKey}`)}</td>
                <td style={thtd}>{key}</td>
                <td style={thtd}>
                  <InlineMoneyEditor
                    value={master[key]}
                    display={mode === "moneyOrDash" && master[key] == null ? "—" : money(master[key] ?? 0)}
                    onCommit={(v) => updateMaster(key, v)}
                  />
                </td>
                <td style={thtd}>{t(`misc.${noteKey}`)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={card}>
        <h3 style={{ margin: "0 0 10px" }}>{t("misc.rpmTotals")}</h3>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <div style={pill}>{t("misc.rpmPerVisit")} <strong>{money(perVisit)}</strong></div>
          <div style={pill}>{t("misc.rpmPerMonth433")} <strong>{money(perMonth)}</strong></div>
          <div style={pill}>{t("misc.rpmAgreementMo", { months: agreementMonths })} <strong>{money(agreement)}</strong></div>
        </div>
        <div style={{ marginTop: 8, fontSize: 12, color: "#4a4a4a" }}>{ruleText}</div>
      </div>

      <div style={{ ...card, display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <button
          onClick={reset}
          style={{ border: "1px solid #ff4500", color: "#ff4500", background: "#fff", borderRadius: 10, padding: "10px 14px", fontWeight: 600 }}
        >
          {t("misc.rpmReset")}
        </button>
      </div>
    </div>
  );
}

function RpmWindowsCalculator() {
  const { t } = useTranslation();
  const [master, setMaster] = useState({
    rateSmall: 1.5,
    rateMedium: 3,
    rateLarge: 7,
    multInstall: 3.0,
    mult125: 1.25,
    multQuarterly: 2.0,
    tripBeltway: 8,
    tripStandard: 6,
    tripPaidBase: 7,
  });

  const [freq, setFreq] = useState("weekly");
  const [firstTime, setFirstTime] = useState("no");
  const [tripType, setTripType] = useState("beltway8");
  const [parkingAmt, setParkingAmt] = useState(0);
  const [agreementMonths, setAgreementMonths] = useState(12);

  const [small, setSmall] = useState(10);
  const [medium, setMedium] = useState(5);
  const [large, setLarge] = useState(2);

  const [includeMirrors, setIncludeMirrors] = useState("no");
  const [sm, setSm] = useState(0);
  const [mm, setMm] = useState(0);
  const [lm, setLm] = useState(0);

  const visitsPerMonth = (f) =>
    ({ weekly: 4.33, biweekly: 2.165, monthly: 1, quarterly: 0.25 }[f] ?? 4.33);

  const freqMult = (f, first) => {
    if (first === "yes") return master.multInstall;
    if (f === "biweekly" || f === "monthly") return master.mult125;
    if (f === "quarterly") return master.multQuarterly;
    return 1.0;
  };

  const tripCharge = (type, parking) => {
    if (type === "beltway8") return master.tripBeltway;
    if (type === "standard6") return master.tripStandard;
    if (type === "paid7") return master.tripPaidBase + Math.max(0, Number(parking) || 0);
    return 0;
  };

  const { perVisit, perMonth, agreement, ruleText } = useMemo(() => {
    const totalSmall = Number(small) + (includeMirrors === "yes" ? Number(sm) : 0);
    const totalMedium = Number(medium) + (includeMirrors === "yes" ? Number(mm) : 0);
    const totalLarge = Number(large) + (includeMirrors === "yes" ? Number(lm) : 0);

    const mult = freqMult(freq, firstTime);
    const labor =
      totalSmall * master.rateSmall +
      totalMedium * master.rateMedium +
      totalLarge * master.rateLarge;

    const perVisitCalc = labor * mult + tripCharge(tripType, parkingAmt);
    const perMonthCalc = perVisitCalc * visitsPerMonth(freq);
    const months = Math.max(1, Number(agreementMonths) || 1);
    const agreementCalc = perMonthCalc * months;

    const freqTxt =
      firstTime === "yes"
        ? t("misc.rpmRuleFreqInstall", { freq: labelForFreq(freq, t) })
        : t("misc.rpmRuleFreq", { freq: labelForFreq(freq, t), mult: mult.toFixed(2) });

    const rule = t("misc.rpmRuleWindows", { freqText: freqTxt, trip: money(tripCharge(tripType, parkingAmt)) });

    return { perVisit: perVisitCalc, perMonth: perMonthCalc, agreement: agreementCalc, ruleText: rule };
  }, [
    master,
    freq,
    firstTime,
    tripType,
    parkingAmt,
    agreementMonths,
    small,
    medium,
    large,
    includeMirrors,
    sm,
    mm,
    lm,
    t,
  ]);

  const updateMaster = (k, raw) => {
    const val = unmoney(raw);
    setMaster((m) => ({ ...m, [k]: val === null || Number.isNaN(val) ? m[k] : val }));
  };

  const reset = () => {
    setMaster({
      rateSmall: 1.5,
      rateMedium: 3,
      rateLarge: 7,
      multInstall: 3.0,
      mult125: 1.25,
      multQuarterly: 2.0,
      tripBeltway: 8,
      tripStandard: 6,
      tripPaidBase: 7,
    });
    setFreq("weekly");
    setFirstTime("no");
    setTripType("beltway8");
    setParkingAmt(0);
    setAgreementMonths(12);
    setSmall(10);
    setMedium(5);
    setLarge(2);
    setIncludeMirrors("no");
    setSm(0);
    setMm(0);
    setLm(0);
  };

  return (
    <div>
      <div style={card}>
        <div style={grid}>
          <div style={field}>
            <label>{t("misc.rpmFrequency")}</label>
            <select style={inputStyle} value={freq} onChange={(e) => setFreq(e.target.value)}>
              <option value="weekly">{t("misc.rpmWeekly")}</option>
              <option value="biweekly">{t("misc.rpmBiweekly")}</option>
              <option value="monthly">{t("misc.rpmMonthly")}</option>
              <option value="quarterly">{t("misc.rpmQuarterly")}</option>
            </select>
          </div>

          <div style={field}>
            <label>{t("misc.rpmFirstTimeInstall")}</label>
            <select style={inputStyle} value={firstTime} onChange={(e) => setFirstTime(e.target.value)}>
              <option value="no">{t("misc.rpmNo")}</option>
              <option value="yes">{t("misc.rpmFirstTimeYes")}</option>
            </select>
          </div>

          <div style={field}>
            <label>{t("misc.rpmTripCharge")}</label>
            <select style={inputStyle} value={tripType} onChange={(e) => setTripType(e.target.value)}>
              <option value="beltway8">{t("misc.rpmTripBeltway8")}</option>
              <option value="standard6">{t("misc.rpmTripStandard6")}</option>
              <option value="paid7">{t("misc.rpmTripPaid7")}</option>
              <option value="waived">{t("misc.rpmTripWaived")}</option>
            </select>
          </div>

          <div style={field}>
            <label>{t("misc.rpmParking")}</label>
            <input
              style={inputStyle}
              type="number"
              min={0}
              step="0.01"
              value={parkingAmt}
              onChange={(e) => setParkingAmt(Number(e.target.value) || 0)}
            />
          </div>

          <div style={field}>
            <label>{t("misc.rpmAgreementMonths")}</label>
            <input
              style={inputStyle}
              type="number"
              min={1}
              value={agreementMonths}
              onChange={(e) => setAgreementMonths(Number(e.target.value) || 0)}
            />
          </div>
        </div>
      </div>

      <div style={card}>
        <h3 style={{ margin: "0 0 10px" }}>{t("misc.rpmCountsBothSides")}</h3>
        <div style={grid}>
          <div style={field}>
            <label>{t("misc.rpmSmallWindows")}</label>
            <input style={inputStyle} type="number" min={0} value={small} onChange={(e) => setSmall(Number(e.target.value) || 0)} />
          </div>
          <div style={field}>
            <label>{t("misc.rpmMediumWindows")}</label>
            <input style={inputStyle} type="number" min={0} value={medium} onChange={(e) => setMedium(Number(e.target.value) || 0)} />
          </div>
          <div style={field}>
            <label>{t("misc.rpmLargeWindows")}</label>
            <input style={inputStyle} type="number" min={0} value={large} onChange={(e) => setLarge(Number(e.target.value) || 0)} />
          </div>
          <div style={field}>
            <label>{t("misc.rpmIncludeMirrors")}</label>
            <select style={inputStyle} value={includeMirrors} onChange={(e) => setIncludeMirrors(e.target.value)}>
              <option value="no">{t("misc.rpmNo")}</option>
              <option value="yes">{t("misc.rpmIncludeMirrorsYes")}</option>
            </select>
          </div>
          <div style={field}>
            <label>{t("misc.rpmSmallMirrors")}</label>
            <input style={inputStyle} type="number" min={0} value={sm} onChange={(e) => setSm(Number(e.target.value) || 0)} />
          </div>
          <div style={field}>
            <label>{t("misc.rpmMediumMirrors")}</label>
            <input style={inputStyle} type="number" min={0} value={mm} onChange={(e) => setMm(Number(e.target.value) || 0)} />
          </div>
          <div style={field}>
            <label>{t("misc.rpmLargeMirrors")}</label>
            <input style={inputStyle} type="number" min={0} value={lm} onChange={(e) => setLm(Number(e.target.value) || 0)} />
          </div>
        </div>
        <div style={{ fontSize: 12, color: "#4a4a4a", marginTop: 6 }}>
          {t("misc.rpmMirrorNote")}
        </div>
      </div>

      <div style={card}>
        <h3 style={{ margin: "0 0 10px" }}>{t("misc.rpmMasterRatesMultipliers")}</h3>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thtd}>{t("misc.rpmThItem")}</th>
              <th style={thtd}>{t("misc.rpmThKey")}</th>
              <th style={thtd}>{t("misc.rpmThValue")}</th>
              <th style={thtd}>{t("misc.rpmThNotes")}</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["rpmRowRateSmall", "rateSmall", "rpmRowRateSmallNote"],
              ["rpmRowRateMedium", "rateMedium", "rpmRowRateMediumNote"],
              ["rpmRowRateLarge", "rateLarge", "rpmRowRateLargeNote"],
              ["rpmRowMultInstall", "multInstall", "rpmRowMultInstallNote"],
              ["rpmRowMult125", "mult125", "rpmRowMult125Note"],
              ["rpmRowMultQuarterly", "multQuarterly", "rpmRowMultQuarterlyNote"],
              ["rpmRowTripBeltway", "tripBeltway", "rpmRowTripBeltwayNote"],
              ["rpmRowTripStandard", "tripStandard", "rpmRowTripStandardNote"],
              ["rpmRowTripPaidBase", "tripPaidBase", "rpmRowTripPaidBaseNote"],
            ].map(([labelKey, key, noteKey]) => (
              <tr key={key}>
                <td style={thtd}>{t(`misc.${labelKey}`)}</td>
                <td style={thtd}>{key}</td>
                <td style={thtd}>
                  <InlineMoneyEditor
                    value={master[key]}
                    display={money(master[key])}
                    onCommit={(v) => updateMaster(key, v, setMaster)}
                  />
                </td>
                <td style={thtd}>{t(`misc.${noteKey}`)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={card}>
        <h3 style={{ margin: "0 0 10px" }}>{t("misc.rpmTotals")}</h3>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <div style={pill}>{t("misc.rpmPerVisit")} <strong>{money(perVisit)}</strong></div>
          <div style={pill}>{t("misc.rpmPerMonth")} <strong>{money(perMonth)}</strong></div>
          <div style={pill}>{t("misc.rpmAgreementMo", { months: agreementMonths })} <strong>{money(agreement)}</strong></div>
        </div>
        <div style={{ marginTop: 8, fontSize: 12, color: "#4a4a4a" }}>{ruleText}</div>
      </div>

      <div style={{ ...card, display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <button
          onClick={reset}
          style={{ border: "1px solid #ff4500", color: "#ff4500", background: "#fff", borderRadius: 10, padding: "10px 14px", fontWeight: 600 }}
        >
          {t("misc.rpmReset")}
        </button>
      </div>

      <div style={{ ...card }}>
        <h3 style={{ margin: "0 0 10px" }}>{t("misc.rpmValueProposition")}</h3>
        <ul style={{ margin: "6px 0 0 18px" }}>
          <li>
            <strong>{t("misc.rpmValueProtectsGlassTitle")}</strong> {t("misc.rpmValueProtectsGlass")}
          </li>
          <li>
            <strong>{t("misc.rpmValueLowerCostsTitle")}</strong> {t("misc.rpmValueLowerCosts")}
          </li>
        </ul>
      </div>
    </div>
  );
}

function labelForFreq(freq: string, t: (key: string) => string) {
  const keys: Record<string, string> = { weekly: "rpmFreqWeekly", biweekly: "rpmFreqBiweekly", monthly: "rpmFreqMonthly", quarterly: "rpmFreqQuarterly" };
  return t(`misc.${keys[freq] || "rpmFreqWeekly"}`);
}

function InlineMoneyEditor({ value, display, onCommit }) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(display ?? money(value ?? 0));

  return editing ? (
    <input
      style={{ ...inputStyle, width: 140 }}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        onCommit(text);
        setEditing(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          onCommit(text);
          setEditing(false);
        }
      }}
      autoFocus
    />
  ) : (
    <button
      type="button"
      onClick={() => {
        setText(display ?? money(value ?? 0));
        setEditing(true);
      }}
      style={{
        border: "1px dashed transparent",
        borderRadius: 8,
        padding: "6px 10px",
        cursor: "pointer",
        background: "#fff",
      }}
      title={t("misc.rpmClickToEdit")}
    >
      {display ?? money(value ?? 0)}
    </button>
  );
}

export default function PricingTables() {
  const { t } = useTranslation();
  const [tab, setTab] = useState("SaniClean");

  const tabs = [
    { key: "SaniClean", label: t("misc.rpmTabSaniClean"), component: <SaniCleanCalculator /> },
    { key: "RPM Windows", label: t("misc.rpmTabRpmWindows"), component: <RpmWindowsCalculator /> },
  ];

  return (
    <div style={{ maxWidth: 1100, margin: "28px auto", padding: "0 16px 48px" }}>
      <h1 style={{ fontSize: 24, margin: 0 }}>{t("misc.rpmPricingTables")}</h1>
      <p style={{ color: "#4a4a4a", marginTop: 8, marginBottom: 16 }}>
        {t("misc.rpmPricingIntro")}
      </p>

      <div style={{ ...card, display: "flex", gap: 8, flexWrap: "wrap" }}>
        {tabs.map((tabItem) => (
          <button
            key={tabItem.key}
            onClick={() => setTab(tabItem.key)}
            style={{
              padding: "8px 12px",
              borderRadius: 999,
              border: "1px solid #e6e6e6",
              background: tab === tabItem.key ? "#fff1eb" : "#fff",
              color: tab === tabItem.key ? "#ff4500" : "#212121",
              fontWeight: 600,
            }}
          >
            {tabItem.label}
          </button>
        ))}
      </div>

      {tabs.find((tabItem) => tabItem.key === tab)?.component}
    </div>
  );
}
