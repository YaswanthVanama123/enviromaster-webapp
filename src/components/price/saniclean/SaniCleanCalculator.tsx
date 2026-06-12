import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { money, unmoney } from "../shared/money";
import InlineMoneyEditor from "../shared/InlineMoneyEditor";
import TripChargeSelector from "../shared/TripChargeSelector";
import TotalsBar from "../shared/TotalsBar";
import { SC_DEFAULTS, SC_UI as UI } from "./constants";

export default function SaniCleanCalculator() {
  const { t } = useTranslation();
  const [master, setMaster] = useState(SC_DEFAULTS);

  const [region, setRegion] = useState("inside");        
  const [fixtures, setFixtures] = useState(10);
  const [agreementMonths, setAgreementMonths] = useState(12);
  const [tripType, setTripType] = useState("beltway8");  
  const [parkingAmt, setParkingAmt] = useState(0);
  const [allInclusive, setAllInclusive] = useState("no");
  const [smallThreshold, setSmallThreshold] = useState(5);

  const updateMaster = (k, raw) => {
    const val = unmoney(raw);
    setMaster((m) => ({ ...m, [k]: val === null || Number.isNaN(val) ? m[k] : val }));
  };

  const computeTrip = () => {
    if (allInclusive === "yes") return 0;
    if (tripType === "beltway8")  return master.beltwayTrip;
    if (tripType === "standard6") return 6;
    if (tripType === "paid7")     return (master.paidBase || 7) + Math.max(0, Number(parkingAmt) || 0);
    return 0;
  };

  const { perVisit, perMonth, agreement, ruleText } = useMemo(() => {
    let unit  = region === "inside" ? master.insidePrice : master.outsidePrice;
    let regMin= region === "inside" ? (master.insideMin ?? 0) : (master.outsideMin ?? 0);

    const isAllInc = allInclusive === "yes";
    if (isAllInc) { unit = master.allIncPrice; regMin = 0; }

    const fx = Math.max(0, Number(fixtures) || 0);
    const trip = computeTrip();

    let perVisitCalc = Math.max(unit * fx + trip, regMin || 0);
    let rule = isAllInc
      ? t("pricingCalc.saniClean.rules.allInclusive")
      : t("pricingCalc.saniClean.rules.standard", { trip: money(trip), min: regMin ? money(regMin) : "—" });

    if (!isAllInc && fx > 0 && fx <= Math.max(0, Number(smallThreshold) || 0)) {
      perVisitCalc = Math.max(perVisitCalc, master.smallMin);
      rule = t("pricingCalc.saniClean.rules.smallAccount", { threshold: smallThreshold, min: money(master.smallMin) });
    }

    const perMonthCalc = perVisitCalc * 4.33;
    const months = Math.max(1, Number(agreementMonths) || 1);
    const agreementCalc = perMonthCalc * months;

    return { perVisit: perVisitCalc, perMonth: perMonthCalc, agreement: agreementCalc, ruleText: rule };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [master, region, fixtures, agreementMonths, tripType, parkingAmt, allInclusive, smallThreshold]);

  return (
    <div>
      <div style={UI.card}>
        <div style={UI.grid}>
          <div style={UI.field}>
            <label>{t("pricingCalc.saniClean.region.label")}</label>
            <select style={UI.input} value={region} onChange={(e) => setRegion(e.target.value)}>
              <option value="inside">{t("pricingCalc.saniClean.region.inside")}</option>
              <option value="outside">{t("pricingCalc.saniClean.region.outside")}</option>
            </select>
          </div>

          <div style={UI.field}>
            <label>{t("pricingCalc.saniClean.fixtures")}</label>
            <input style={UI.input} type="number" min={0} value={fixtures} onChange={(e) => setFixtures(e.target.value)} />
          </div>

          <div style={UI.field}>
            <label>{t("pricingCalc.common.agreementMonths")}</label>
            <input style={UI.input} type="number" min={1} value={agreementMonths} onChange={(e) => setAgreementMonths(e.target.value)} />
          </div>

          <TripChargeSelector
            tripType={tripType}
            setTripType={setTripType}
            parkingAmt={parkingAmt}
            setParkingAmt={setParkingAmt}
          />

          <div style={UI.field}>
            <label>{t("pricingCalc.saniClean.allInclusive.label")}</label>
            <select style={UI.input} value={allInclusive} onChange={(e) => setAllInclusive(e.target.value)}>
              <option value="no">{t("pricingCalc.saniClean.allInclusive.no")}</option>
              <option value="yes">{t("pricingCalc.saniClean.allInclusive.yes")}</option>
            </select>
          </div>

          <div style={UI.field}>
            <label>{t("pricingCalc.saniClean.smallThreshold.label")}</label>
            <input style={UI.input} type="number" min={0} value={smallThreshold} onChange={(e) => setSmallThreshold(e.target.value)} />
            <small style={{ color: "#4a4a4a" }}>{t("pricingCalc.saniClean.smallThreshold.hint")}</small>
          </div>
        </div>
      </div>

      <div style={UI.card}>
        <h3 style={{ margin: "0 0 10px" }}>{t("pricingCalc.saniClean.masterRatesHeading")}</h3>
        <table style={UI.table}>
          <thead>
            <tr><th style={UI.thtd}>{t("pricingCalc.common.masterRatesTable.item")}</th><th style={UI.thtd}>{t("pricingCalc.common.masterRatesTable.key")}</th><th style={UI.thtd}>{t("pricingCalc.common.masterRatesTable.value")}</th><th style={UI.thtd}>{t("pricingCalc.common.masterRatesTable.notes")}</th></tr>
          </thead>
          <tbody>
            {[
              "insidePrice",
              "insideMin",
              "beltwayTrip",
              "outsidePrice",
              "outsideMin",
              "outsideTripPDF",
              "paidBase",
              "smallMin",
              "allIncPrice",
            ].map((key) => (
              <tr key={key}>
                <td style={UI.thtd}>{t(`pricingCalc.saniClean.rates.${key}`)}</td>
                <td style={UI.thtd}>{key}</td>
                <td style={UI.thtd}>
                  <InlineMoneyEditor
                    value={master[key]}
                    display={master[key] == null ? "—" : money(master[key])}
                    onCommit={(v) => updateMaster(key, v)}
                  />
                </td>
                <td style={UI.thtd}>{t(`pricingCalc.saniClean.notes.${key}`)}</td>
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
        monthlyLabel={t("pricingCalc.saniClean.monthlyLabel")}
      />
    </div>
  );
}
