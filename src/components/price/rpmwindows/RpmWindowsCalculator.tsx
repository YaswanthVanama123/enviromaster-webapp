import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { money, unmoney } from "../shared/money";
import InlineMoneyEditor from "../shared/InlineMoneyEditor";
import TripChargeSelector from "../shared/TripChargeSelector";
import TotalsBar from "../shared/TotalsBar";
import { RW_DEFAULTS, RW_UI as UI } from "./constants";

const visitsPerMonth = (f) => ({ weekly: 4.33, biweekly: 2.165, monthly: 1.0, quarterly: 0.25 }[f] ?? 4.33);

export default function RpmWindowsCalculator() {
  const { t } = useTranslation();
  const [master, setMaster] = useState(RW_DEFAULTS);

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

  const labelForFreq = (f) => ({
    weekly: t("pricingCalc.rpm.frequency.weeklyShort"),
    biweekly: t("pricingCalc.rpm.frequency.biweeklyShort"),
    monthly: t("pricingCalc.rpm.frequency.monthlyShort"),
    quarterly: t("pricingCalc.rpm.frequency.quarterlyShort"),
  }[f] || t("pricingCalc.rpm.frequency.weeklyShort"));

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

    const ruleMult = (firstTime === "yes" ? master.multInstall : mult).toFixed(2);
    const rule = t("pricingCalc.rpm.rule", {
      freq: labelForFreq(freq),
      mult: ruleMult,
      trip: money(tripCharge(tripType, parkingAmt)),
    });

    return { perVisit: perVisitCalc, perMonth: perMonthCalc, agreement: agreementCalc, ruleText: rule };
  }, [
    master, freq, firstTime, tripType, parkingAmt, agreementMonths,
    small, medium, large, includeMirrors, sm, mm, lm
  ]);

  const updateMaster = (k, raw) => {
    const val = unmoney(raw);
    setMaster((m) => ({ ...m, [k]: val === null || Number.isNaN(val) ? m[k] : val }));
  };

  return (
    <div>
      <div style={UI.card}>
        <div style={UI.grid}>
          <div style={UI.field}>
            <label>{t("pricingCalc.rpm.frequency.label")}</label>
            <select style={UI.input} value={freq} onChange={(e) => setFreq(e.target.value)}>
              <option value="weekly">{t("pricingCalc.rpm.frequency.weekly")}</option>
              <option value="biweekly">{t("pricingCalc.rpm.frequency.biweekly")}</option>
              <option value="monthly">{t("pricingCalc.rpm.frequency.monthly")}</option>
              <option value="quarterly">{t("pricingCalc.rpm.frequency.quarterly")}</option>
            </select>
          </div>

          <div style={UI.field}>
            <label>{t("pricingCalc.rpm.firstTime.label")}</label>
            <select style={UI.input} value={firstTime} onChange={(e) => setFirstTime(e.target.value)}>
              <option value="no">{t("pricingCalc.rpm.firstTime.no")}</option>
              <option value="yes">{t("pricingCalc.rpm.firstTime.yes")}</option>
            </select>
          </div>

          <TripChargeSelector
            tripType={tripType}
            setTripType={setTripType}
            parkingAmt={parkingAmt}
            setParkingAmt={setParkingAmt}
          />

          <div style={UI.field}>
            <label>{t("pricingCalc.common.agreementMonths")}</label>
            <input style={UI.input} type="number" min={1} value={agreementMonths} onChange={(e) => setAgreementMonths(e.target.value)} />
          </div>
        </div>
      </div>

      <div style={UI.card}>
        <h3 style={{ margin: "0 0 10px" }}>{t("pricingCalc.rpm.countsHeading")}</h3>
        <div style={UI.grid}>
          <div style={UI.field}>
            <label>{t("pricingCalc.rpm.smallWindows")}</label>
            <input style={UI.input} type="number" min={0} value={small} onChange={(e) => setSmall(e.target.value)} />
          </div>
          <div style={UI.field}>
            <label>{t("pricingCalc.rpm.mediumWindows")}</label>
            <input style={UI.input} type="number" min={0} value={medium} onChange={(e) => setMedium(e.target.value)} />
          </div>
          <div style={UI.field}>
            <label>{t("pricingCalc.rpm.largeWindows")}</label>
            <input style={UI.input} type="number" min={0} value={large} onChange={(e) => setLarge(e.target.value)} />
          </div>
          <div style={UI.field}>
            <label>{t("pricingCalc.rpm.includeMirrors.label")}</label>
            <select style={UI.input} value={includeMirrors} onChange={(e) => setIncludeMirrors(e.target.value)}>
              <option value="no">{t("pricingCalc.rpm.includeMirrors.no")}</option>
              <option value="yes">{t("pricingCalc.rpm.includeMirrors.yes")}</option>
            </select>
          </div>
          <div style={UI.field}>
            <label>{t("pricingCalc.rpm.smallMirrors")}</label>
            <input style={UI.input} type="number" min={0} value={sm} onChange={(e) => setSm(e.target.value)} />
          </div>
          <div style={UI.field}>
            <label>{t("pricingCalc.rpm.mediumMirrors")}</label>
            <input style={UI.input} type="number" min={0} value={mm} onChange={(e) => setMm(e.target.value)} />
          </div>
          <div style={UI.field}>
            <label>{t("pricingCalc.rpm.largeMirrors")}</label>
            <input style={UI.input} type="number" min={0} value={lm} onChange={(e) => setLm(e.target.value)} />
          </div>
        </div>
        <div style={{ fontSize: 12, color: "#4a4a4a", marginTop: 6 }}>
          {t("pricingCalc.rpm.mirrorNote")}
        </div>
      </div>

      <div style={UI.card}>
        <h3 style={{ margin: "0 0 10px" }}>{t("pricingCalc.rpm.masterRatesHeading")}</h3>
        <table style={UI.table}>
          <thead>
            <tr><th style={UI.thtd}>{t("pricingCalc.common.masterRatesTable.item")}</th><th style={UI.thtd}>{t("pricingCalc.common.masterRatesTable.key")}</th><th style={UI.thtd}>{t("pricingCalc.common.masterRatesTable.value")}</th><th style={UI.thtd}>{t("pricingCalc.common.masterRatesTable.notes")}</th></tr>
          </thead>
          <tbody>
            {[
              "rateSmall",
              "rateMedium",
              "rateLarge",
              "multInstall",
              "mult125",
              "multQuarterly",
              "tripBeltway",
              "tripStandard",
              "tripPaidBase",
            ].map((key) => (
              <tr key={key}>
                <td style={UI.thtd}>{t(`pricingCalc.rpm.rates.${key}`)}</td>
                <td style={UI.thtd}>{key}</td>
                <td style={UI.thtd}>
                  <InlineMoneyEditor
                    value={master[key]}
                    display={money(master[key])}
                    onCommit={(v) => updateMaster(key, v)}
                  />
                </td>
                <td style={UI.thtd}>{t(`pricingCalc.rpm.notes.${key}`)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <TotalsBar
        perVisit={perVisit}
        perMonth={perMonth}
        agreement={agreement}
        months={agreementMonths}
        ruleText={ruleText}
      />
    </div>
  );
}
