import { VISITS_PER_YEAR_MAP } from "../../../../lib/pricing";
import type {
  SanicleanFormState,
  SanicleanQuoteResult,
  SanicleanFrequency,
  SanicleanCalculationMode,
  SanicleanDualFrequencyResult,
} from "../../../../components/services/saniclean/sanicleanTypes";
import { getCalculationMode } from "../../../../components/services/saniclean/sanicleanTypes";
import { SANICLEAN_CONFIG } from "../../../../components/services/saniclean/sanicleanConfig";

export interface BackendSanicleanConfig {
  includedItems: {
    electrostaticSprayIncluded: boolean;
    includedWeeklyRefillsDefault: number;
  };
  warrantyFees: {
    airFreshenerDispenserWarrantyFeePerWeek: number;
    soapDispenserWarrantyFeePerWeek: number;
  };
  smallBathroomMinimums: {
    minimumFixturesThreshold: number;
    minimumPriceUnderThreshold: number;
  };
  allInclusivePricing: {
    pricePerFixture: number;
    includeAllAddOns: boolean;
    waiveTripCharge: boolean;
    waiveWarrantyFees: boolean;
    autoAllInclusiveMinFixtures: number;
  };
  soapUpgrades: {
    standardToLuxuryPerDispenserPerWeek: number;
    excessUsageCharges: {
      standardSoapPerGallon: number;
      luxurySoapPerGallon: number;
    };
  };
  paperCredit: { creditPerFixturePerWeek: number };
  standardALaCartePricing: {
    insideBeltway: {
      pricePerFixture: number;
      minimumPrice: number;
      tripCharge: number;
      parkingFeeAddOn: number;
    };
    outsideBeltway: { pricePerFixture: number; tripCharge: number };
  };
  monthlyAddOnSupplyPricing: {
    urinalMatMonthlyPrice: number;
    urinalScreenMonthlyPrice: string | number;
    toiletClipMonthlyPrice: number;
    toiletSeatCoverDispenserMonthlyPrice: string | number;
    sanipodMonthlyPricePerPod: number;
  };
  microfiberMoppingIncludedWithSaniClean: {
    pricePerBathroom: number;
    hugeBathroomSqFtUnit: number;
    hugeBathroomRate: number;
  };
  tripChargesNonAllInclusiveOnly: { standard: number; beltway: number };
  minimumChargePerVisit: number;
  frequencyMetadata: {
    weekly: { monthlyRecurringMultiplier: number; firstMonthExtraMultiplier: number };
    biweekly: { monthlyRecurringMultiplier: number; firstMonthExtraMultiplier: number };
    monthly: { cycleMonths: number };
    bimonthly: { cycleMonths: number };
    quarterly: { cycleMonths: number };
    biannual: { cycleMonths: number };
    annual: { cycleMonths: number };
  };
  minContractMonths: number;
  maxContractMonths: number;
}

const resolveLuxuryUpgradeQty = (form: SanicleanFormState): number => {
  const sinkCount = Number.isFinite(form.sinks) ? (form.sinks as number) : 0;
  const overrideQty = Number.isFinite(form.luxuryUpgradeQty)
    ? (form.luxuryUpgradeQty as number)
    : sinkCount;
  return Math.max(0, overrideQty);
};

const getFrequencyMultiplier = (frequency: string, backendConfig?: any): number => {
  if (backendConfig?.frequencyMetadata?.[frequency]) {
    const metadata = backendConfig.frequencyMetadata[frequency];
    if (typeof metadata.monthlyRecurringMultiplier === "number") {
      return metadata.monthlyRecurringMultiplier;
    }
    if (typeof metadata.cycleMonths === "number") {
      if (metadata.cycleMonths === 0) return 1.0;
      return 1 / metadata.cycleMonths;
    }
  }
  if (frequency === "oneTime") return 0;
  if (frequency === "twicePerMonth") return 2.0;
  const fallbackMultipliers: Record<string, number> = {
    weekly: 4.33,
    biweekly: 2.165,
    monthly: 1.0,
    everyFourWeeks: 1.0833,
    bimonthly: 0.5,
    quarterly: 0.33,
    biannual: 0.17,
    annual: 0.083,
  };
  return fallbackMultipliers[frequency] || 4.33;
};

const getDualFrequencyMultiplier = (
  frequency: SanicleanFrequency,
  mode: SanicleanCalculationMode,
  backendConfig?: any
): number => {
  if (mode === "monthly") return getFrequencyMultiplier(frequency, backendConfig);
  return 1.0;
};

const calculateVisitsInContract = (
  frequency: SanicleanFrequency,
  contractMonths: number,
  backendConfig?: any
): number => {
  if (frequency === "oneTime") return 1;
  let visitsPerYear = 12;
  if (backendConfig?.frequencyMetadata?.[frequency]?.visitsPerYear) {
    visitsPerYear = backendConfig.frequencyMetadata[frequency].visitsPerYear;
  } else if (backendConfig?.frequencyMetadata?.[frequency]?.cycleMonths) {
    const cycleMonths = backendConfig.frequencyMetadata[frequency].cycleMonths;
    visitsPerYear = cycleMonths > 0 ? 12 / cycleMonths : 12;
  } else {
    visitsPerYear = VISITS_PER_YEAR_MAP[frequency as keyof typeof VISITS_PER_YEAR_MAP] || 12;
  }
  return Math.round((visitsPerYear * contractMonths) / 12);
};

const calculateDualFrequency = (
  mainServiceFrequency: SanicleanFrequency,
  facilityComponentsFrequency: SanicleanFrequency,
  mainServiceBasePrice: number,
  facilityComponentsBasePrice: number,
  contractMonths: number,
  backendConfig?: any
): SanicleanDualFrequencyResult => {
  const calculationMode = getCalculationMode(mainServiceFrequency);
  const facilityMultiplier =
    mainServiceFrequency === "oneTime"
      ? 1
      : getFrequencyMultiplier(facilityComponentsFrequency, backendConfig);
  const facilityComponentsMonthly = facilityComponentsBasePrice * facilityMultiplier;
  const facilityContractTotal =
    mainServiceFrequency === "oneTime"
      ? facilityComponentsMonthly
      : facilityComponentsMonthly * contractMonths;

  if (calculationMode === "monthly") {
    const mainServiceMultiplier = getDualFrequencyMultiplier(
      mainServiceFrequency,
      "monthly",
      backendConfig
    );
    const mainServiceMonthly = mainServiceBasePrice * mainServiceMultiplier;
    const monthlyTotal = mainServiceMonthly + facilityComponentsMonthly;
    let contractTotal: number;
    if (mainServiceFrequency === "everyFourWeeks") {
      const totalVisits = Math.round(contractMonths * 1.0833);
      contractTotal =
        mainServiceBasePrice * totalVisits + facilityComponentsMonthly * totalVisits;
    } else {
      contractTotal = mainServiceMonthly * contractMonths + facilityContractTotal;
    }
    return {
      calculationMode,
      mainServiceTotal: mainServiceMonthly,
      facilityComponentsTotal: facilityComponentsMonthly,
      combinedTotal: monthlyTotal,
      monthlyTotal,
      contractTotal,
    };
  }

  const mainServicePerVisit = mainServiceBasePrice;
  const visitsInContract = calculateVisitsInContract(
    mainServiceFrequency,
    contractMonths,
    backendConfig
  );
  const mainServiceContractTotal = mainServicePerVisit * visitsInContract;
  const contractTotal = mainServiceContractTotal + facilityContractTotal;
  return {
    calculationMode,
    mainServiceTotal: mainServicePerVisit,
    facilityComponentsTotal: facilityComponentsMonthly,
    combinedTotal: mainServicePerVisit,
    perVisitTotal: mainServicePerVisit,
    monthlyTotal: facilityComponentsMonthly,
    contractTotal,
    visitsInContract,
  };
};

export function recomputeFixtureCount(state: SanicleanFormState): SanicleanFormState {
  const total =
    Math.max(0, state.sinks ?? 0) +
    Math.max(0, state.urinals ?? 0) +
    Math.max(0, state.maleToilets ?? 0) +
    Math.max(0, state.femaleToilets ?? 0);
  return { ...state, fixtureCount: total };
}

export function calculateAllInclusive(
  form: SanicleanFormState,
  config: any
): SanicleanQuoteResult {
  const fixtureCount = form.fixtureCount;
  if (fixtureCount === 0) {
    return {
      serviceId: "saniclean",
      displayName: "SaniClean",
      pricingMode: "all_inclusive",
      weeklyTotal: 0,
      monthlyTotal: 0,
      contractTotal: 0,
      baseServiceMonthly: 0,
      facilityComponentsMonthly: 0,
      breakdown: {
        baseService: 0,
        tripCharge: 0,
        facilityComponents: 0,
        soapUpgrade: 0,
        excessSoap: 0,
        microfiberMopping: 0,
        warrantyFees: 0,
        paperOverage: 0,
      },
      dispenserCounts: { soapDispensers: 0, airFresheners: 0, totalDispensers: 0 },
      componentCounts: {
        urinalScreens: 0,
        urinalMats: 0,
        toiletClips: 0,
        seatCoverDispensers: 0,
        sanipods: 0,
      },
      included: [],
      excluded: [],
      appliedRules: ["Service is inactive - no fixtures entered"],
      minimumChargePerWeek: 0,
    };
  }

  const rateTierMultiplier =
    form.rateTier === "greenRate" ? form.greenRateMultiplier : form.redRateMultiplier;
  const baseServiceCalc =
    fixtureCount * form.allInclusiveWeeklyRatePerFixture * rateTierMultiplier;
  const baseService = form.customBaseService ?? baseServiceCalc;
  const luxuryUpgradeQty = resolveLuxuryUpgradeQty(form);
  const soapUpgradeCalc =
    form.soapType === "luxury" ? luxuryUpgradeQty * form.luxuryUpgradePerDispenser : 0;
  const soapUpgrade = form.customSoapUpgrade ?? soapUpgradeCalc;
  const excessSoapCalc =
    form.excessSoapGallonsPerWeek > 0
      ? form.excessSoapGallonsPerWeek *
        (form.soapType === "luxury" ? form.excessLuxurySoapRate : form.excessStandardSoapRate)
      : 0;
  const excessSoap = form.customExcessSoap ?? excessSoapCalc;
  const microfiberMoppingCalc = 0;
  const microfiberMopping = form.customMicrofiberMopping ?? microfiberMoppingCalc;
  const paperCredit = fixtureCount * form.paperCreditPerFixture;
  const paperOverageCalc = Math.max(0, form.estimatedPaperSpendPerWeek - paperCredit);
  const paperOverage = form.customPaperOverage ?? paperOverageCalc;
  const tripChargeCalc = 0;
  const tripCharge = form.customTripCharge ?? tripChargeCalc;
  const warrantyFeesCalc = 0;
  const warrantyFees = form.customWarrantyFees ?? warrantyFeesCalc;
  const facilityComponentsCalc = 0;
  const facilityComponents = form.customFacilityComponents ?? facilityComponentsCalc;

  const mainServiceTotal =
    baseService +
    soapUpgrade +
    excessSoap +
    microfiberMopping +
    warrantyFees +
    paperOverage +
    tripCharge;
  const facilityComponentsTotal = facilityComponents;

  const dualFreqResult = calculateDualFrequency(
    form.mainServiceFrequency,
    form.facilityComponentsFrequency,
    mainServiceTotal,
    facilityComponentsTotal,
    form.contractMonths,
    config
  );

  const calculationMode = getCalculationMode(form.mainServiceFrequency);
  const weeklyTotal =
    calculationMode === "monthly" ? mainServiceTotal : dualFreqResult.combinedTotal;
  const monthlyTotal = dualFreqResult.monthlyTotal ?? dualFreqResult.combinedTotal;
  const contractTotal = dualFreqResult.contractTotal;

  const soapDispensers = form.sinks;
  const airFresheners = Math.ceil(form.sinks / 2);
  const totalDispensers = soapDispensers + airFresheners;
  const urinalScreens = form.urinals;
  const urinalMats = form.urinals;
  const toiletClips = form.maleToilets;
  const seatCoverDispensers = form.maleToilets;
  const sanipods = form.femaleToilets;

  const minimumChargePerWeek = 0;

  return {
    serviceId: "saniclean",
    displayName: "SaniClean - All Inclusive Package",
    pricingMode: "all_inclusive",
    weeklyTotal,
    monthlyTotal,
    contractTotal,
    baseServiceMonthly: dualFreqResult.mainServiceTotal,
    facilityComponentsMonthly: dualFreqResult.facilityComponentsTotal,
    breakdown: {
      baseService,
      tripCharge,
      facilityComponents,
      soapUpgrade,
      excessSoap,
      microfiberMopping,
      warrantyFees,
      paperOverage,
    },
    dispenserCounts: { soapDispensers, airFresheners, totalDispensers },
    componentCounts: { urinalScreens, urinalMats, toiletClips, seatCoverDispensers, sanipods },
    included: form.includedItems ?? [
      "SaniClean service",
      "SaniPod service",
      "Urinal mats",
      "Paper dispensers & reasonable usage",
      "Microfiber mopping",
      "Monthly SaniScrub",
      "Electrostatic spray (free)",
      "Air freshener service (no warranty fee)",
      "Soap service (no warranty fee)",
      "Fragrance Bar",
      `Paper credit: $${paperCredit.toFixed(2)}/week`,
    ],
    excluded: ["Trip charges (waived)", "Warranty fees (waived)"],
    appliedRules: [
      `All-Inclusive: ${fixtureCount} fixtures ?- $${form.allInclusiveWeeklyRatePerFixture}/fixture/week`,
      form.soapType === "luxury" && luxuryUpgradeQty > 0
        ? `Luxury soap upgrade: ${luxuryUpgradeQty} dispensers ?- $${form.luxuryUpgradePerDispenser}/week`
        : "",
      form.excessSoapGallonsPerWeek > 0
        ? `Excess soap: ${form.excessSoapGallonsPerWeek} gallons ?- $${form.soapType === "luxury" ? form.excessLuxurySoapRate : form.excessStandardSoapRate}/gallon`
        : "",
      paperOverage > 0
        ? `Paper overage: $${form.estimatedPaperSpendPerWeek} spend - $${paperCredit.toFixed(2)} credit = $${paperOverage.toFixed(2)}`
        : "",
      "All fees waived (trip, warranty)",
    ].filter(Boolean),
    minimumChargePerWeek,
  };
}

export function calculatePerItemCharge(
  form: SanicleanFormState,
  config: any
): SanicleanQuoteResult {
  const fixtureCount = form.fixtureCount;
  if (fixtureCount === 0) {
    return {
      serviceId: "saniclean",
      displayName: "SaniClean",
      pricingMode: "per_item_charge",
      weeklyTotal: 0,
      monthlyTotal: 0,
      contractTotal: 0,
      baseServiceMonthly: 0,
      facilityComponentsMonthly: 0,
      breakdown: {
        baseService: 0,
        tripCharge: 0,
        facilityComponents: 0,
        soapUpgrade: 0,
        excessSoap: 0,
        microfiberMopping: 0,
        warrantyFees: 0,
        paperOverage: 0,
      },
      dispenserCounts: { soapDispensers: 0, airFresheners: 0, totalDispensers: 0 },
      componentCounts: {
        urinalScreens: 0,
        urinalMats: 0,
        toiletClips: 0,
        seatCoverDispensers: 0,
        sanipods: 0,
      },
      included: [],
      excluded: [],
      appliedRules: ["Service is inactive - no fixtures entered"],
      minimumChargePerWeek: 0,
    };
  }

  const rateTierMultiplier =
    form.rateTier === "greenRate" ? form.greenRateMultiplier : form.redRateMultiplier;
  const isInsideBeltway = form.location === "insideBeltway";
  const fixtureRate = isInsideBeltway
    ? form.insideBeltwayRatePerFixture
    : form.outsideBeltwayRatePerFixture;
  const regionMinimum = isInsideBeltway ? form.insideBeltwayMinimum : 0;

  let baseServiceCalc = fixtureCount * fixtureRate * rateTierMultiplier;
  const isSmallFacility = fixtureCount <= form.smallFacilityThreshold;
  let tripChargeCalc = 0;

  if (isSmallFacility) {
    baseServiceCalc =
      form.applyMinimum !== false
        ? Math.max(baseServiceCalc, form.smallFacilityMinimum)
        : baseServiceCalc;
    tripChargeCalc = 0;
  } else {
    baseServiceCalc = Math.max(baseServiceCalc, regionMinimum);
    if (form.addTripCharge) {
      tripChargeCalc = isInsideBeltway ? form.insideBeltwayTripCharge : form.outsideBeltwayTripCharge;
      if (isInsideBeltway && form.needsParking) {
        tripChargeCalc += form.insideBeltwayParkingFee;
      }
    } else {
      tripChargeCalc = 0;
    }
  }

  const baseService = form.customBaseService ?? baseServiceCalc;
  const tripCharge = form.customTripCharge ?? tripChargeCalc;

  let facilityComponentsCalc = 0;
  if (form.addUrinalComponents) {
    const urinalComponentsBase =
      form.urinalScreensQty * form.urinalScreenMonthly +
      form.urinalMatsQty * form.urinalMatMonthly;
    facilityComponentsCalc += urinalComponentsBase;
  }
  if (form.addMaleToiletComponents) {
    const maleToiletComponentsBase =
      form.toiletClipsQty * form.toiletClipsMonthly +
      form.seatCoverDispensersQty * form.seatCoverDispenserMonthly;
    facilityComponentsCalc += maleToiletComponentsBase;
  }
  if (form.addFemaleToiletComponents) {
    const femaleToiletComponentsBase = form.sanipodsQty * form.sanipodServiceMonthly;
    facilityComponentsCalc += femaleToiletComponentsBase;
  }
  const facilityComponents = form.customFacilityComponents ?? facilityComponentsCalc;

  const luxuryUpgradeQty = resolveLuxuryUpgradeQty(form);
  const soapUpgradeCalc =
    form.soapType === "luxury" ? luxuryUpgradeQty * form.luxuryUpgradePerDispenser : 0;
  const soapUpgrade = form.customSoapUpgrade ?? soapUpgradeCalc;
  const excessSoapCalc = 0;
  const excessSoap = form.customExcessSoap ?? excessSoapCalc;
  const microfiberMoppingCalc = form.addMicrofiberMopping
    ? form.microfiberBathrooms * form.microfiberMoppingPerBathroom
    : 0;
  const microfiberMopping = form.customMicrofiberMopping ?? microfiberMoppingCalc;

  const soapDispensers = form.sinks;
  const airFresheners = Math.ceil(form.sinks / 2);
  const totalDispensers = soapDispensers + airFresheners;
  const warrantyFeesCalc =
    form.warrantyDispensers > 0
      ? form.warrantyDispensers * form.warrantyFeePerDispenserPerWeek
      : 0;
  const warrantyFees = form.customWarrantyFees ?? warrantyFeesCalc;
  const paperOverageCalc = 0;
  const paperOverage = form.customPaperOverage ?? paperOverageCalc;

  const mainServiceTotal =
    baseService +
    tripCharge +
    soapUpgrade +
    excessSoap +
    microfiberMopping +
    warrantyFees +
    paperOverage;
  const facilityComponentsTotal = facilityComponents;

  const dualFreqResult = calculateDualFrequency(
    form.mainServiceFrequency,
    form.facilityComponentsFrequency,
    mainServiceTotal,
    facilityComponentsTotal,
    form.contractMonths,
    config
  );

  const calculationMode = getCalculationMode(form.mainServiceFrequency);
  const weeklyTotal =
    calculationMode === "monthly" ? mainServiceTotal : dualFreqResult.combinedTotal;
  const monthlyTotal = dualFreqResult.monthlyTotal ?? dualFreqResult.combinedTotal;
  const contractTotal = dualFreqResult.contractTotal;

  const urinalScreens = form.urinals;
  const urinalMats = form.urinals;
  const toiletClips = form.maleToilets;
  const seatCoverDispensers = form.maleToilets;
  const sanipods = form.femaleToilets;

  const minimumChargePerWeek = isSmallFacility ? form.smallFacilityMinimum : regionMinimum;

  return {
    serviceId: "saniclean",
    displayName: "SaniClean - Per Item Charge",
    pricingMode: "per_item_charge",
    weeklyTotal,
    monthlyTotal,
    contractTotal,
    baseServiceMonthly: dualFreqResult.mainServiceTotal,
    facilityComponentsMonthly: dualFreqResult.facilityComponentsTotal,
    breakdown: {
      baseService,
      tripCharge,
      facilityComponents: dualFreqResult.facilityComponentsTotal,
      soapUpgrade,
      excessSoap,
      microfiberMopping,
      warrantyFees,
      paperOverage,
    },
    dispenserCounts: { soapDispensers, airFresheners, totalDispensers },
    componentCounts: { urinalScreens, urinalMats, toiletClips, seatCoverDispensers, sanipods },
    included: form.includedItems ?? [
      "SaniClean service",
      "Electrostatic spray (free)",
      "Air freshener service (free)",
      "Soap service (free)",
    ],
    excluded: [
      "SaniPod service ($4/month each)",
      "Urinal components ($8/month per urinal)",
      "Toilet components ($2/month per male toilet)",
      "Warranty fees ($1/dispenser/week)",
      "Microfiber mopping (optional add-on)",
    ],
    appliedRules: [
      `${isInsideBeltway ? "Inside" : "Outside"} Beltway: ${fixtureCount} fixtures × $${fixtureRate}/fixture`,
      isSmallFacility
        ? `Small facility (≤${form.smallFacilityThreshold} fixtures): $${form.smallFacilityMinimum} minimum includes trip`
        : "",
      !isSmallFacility && regionMinimum > 0 ? `Regional minimum: $${regionMinimum}` : "",
      !isSmallFacility
        ? `Trip charge: $${tripCharge - (form.needsParking && isInsideBeltway ? form.insideBeltwayParkingFee : 0)}`
        : "",
      form.needsParking && isInsideBeltway && !isSmallFacility
        ? `Parking fee: $${form.insideBeltwayParkingFee}`
        : "",
      dualFreqResult.facilityComponentsTotal > 0
        ? `Facility components: $${dualFreqResult.facilityComponentsTotal.toFixed(2)}/month (${form.facilityComponentsFrequency})`
        : "",
      warrantyFees > 0
        ? `Warranty: ${totalDispensers} dispensers × $${form.warrantyFeePerDispenserPerWeek}/week`
        : "",
      microfiberMopping > 0
        ? `Microfiber mopping: ${form.microfiberBathrooms} bathrooms × $${form.microfiberMoppingPerBathroom}/week`
        : "",
    ].filter(Boolean),
    minimumChargePerWeek,
  };
}

export function computeSanicleanQuote(
  form: SanicleanFormState,
  backendConfig: BackendSanicleanConfig | null,
  customFieldsTotal: number = 0
): SanicleanQuoteResult {
  const config: any = backendConfig || SANICLEAN_CONFIG;
  const legacyFreq = (form as any).frequency as SanicleanFrequency | undefined;

  const recomputedFixtureCount =
    Math.max(0, form.sinks ?? 0) +
    Math.max(0, form.urinals ?? 0) +
    Math.max(0, form.maleToilets ?? 0) +
    Math.max(0, form.femaleToilets ?? 0);

  const mappedForm: SanicleanFormState = {
    ...form,
    fixtureCount: recomputedFixtureCount,
    mainServiceFrequency:
      form.mainServiceFrequency || legacyFreq || "weekly",
    facilityComponentsFrequency:
      form.facilityComponentsFrequency ||
      form.mainServiceFrequency ||
      legacyFreq ||
      "weekly",
  };

  const baseQuote: SanicleanQuoteResult =
    mappedForm.pricingMode === "all_inclusive"
      ? calculateAllInclusive(mappedForm, config)
      : calculatePerItemCharge(mappedForm, config);

  const effectiveWeeklyTotal = mappedForm.customWeeklyTotal ?? baseQuote.weeklyTotal;
  const effectiveMonthlyTotal = mappedForm.customMonthlyTotal ?? baseQuote.monthlyTotal;
  const contractTotalBeforeCustomFields =
    mappedForm.customContractTotal ?? baseQuote.contractTotal;
  const effectiveContractTotal = contractTotalBeforeCustomFields + customFieldsTotal;

  const baselineFixtureRateInside =
    config.standardALaCartePricing?.insideBeltway?.pricePerFixture ??
    SANICLEAN_CONFIG.perItemCharge.insideBeltway.ratePerFixture;
  const baselineFixtureRateOutside =
    config.standardALaCartePricing?.outsideBeltway?.pricePerFixture ??
    SANICLEAN_CONFIG.perItemCharge.outsideBeltway.ratePerFixture;
  const baselineAllInclusiveRate =
    config.allInclusivePricing?.pricePerFixture ??
    SANICLEAN_CONFIG.allInclusivePackage.weeklyRatePerFixture;
  const baselineForm: SanicleanFormState = {
    ...mappedForm,
    insideBeltwayRatePerFixture: baselineFixtureRateInside,
    outsideBeltwayRatePerFixture: baselineFixtureRateOutside,
    allInclusiveWeeklyRatePerFixture: baselineAllInclusiveRate,
    insideBeltwayMinimum:
      config.standardALaCartePricing?.insideBeltway?.minimumPrice ??
      SANICLEAN_CONFIG.perItemCharge.insideBeltway.weeklyMinimum,
    insideBeltwayTripCharge:
      config.standardALaCartePricing?.insideBeltway?.tripCharge ??
      SANICLEAN_CONFIG.perItemCharge.insideBeltway.tripCharge,
    insideBeltwayParkingFee:
      config.standardALaCartePricing?.insideBeltway?.parkingFeeAddOn ??
      SANICLEAN_CONFIG.perItemCharge.insideBeltway.parkingFee,
    outsideBeltwayTripCharge:
      config.standardALaCartePricing?.outsideBeltway?.tripCharge ??
      SANICLEAN_CONFIG.perItemCharge.outsideBeltway.tripCharge,
    smallFacilityThreshold:
      config.smallBathroomMinimums?.minimumFixturesThreshold ??
      SANICLEAN_CONFIG.perItemCharge.smallFacility.fixtureThreshold,
    smallFacilityMinimum:
      config.smallBathroomMinimums?.minimumPriceUnderThreshold ??
      SANICLEAN_CONFIG.perItemCharge.smallFacility.minimumWeekly,
    luxuryUpgradePerDispenser:
      config.soapUpgrades?.standardToLuxuryPerDispenserPerWeek ??
      SANICLEAN_CONFIG.allInclusivePackage.soapUpgrade.luxuryUpgradePerDispenser,
    excessStandardSoapRate:
      config.soapUpgrades?.excessUsageCharges?.standardSoapPerGallon ??
      SANICLEAN_CONFIG.allInclusivePackage.soapUpgrade.excessUsageCharges.standardSoap,
    excessLuxurySoapRate:
      config.soapUpgrades?.excessUsageCharges?.luxurySoapPerGallon ??
      SANICLEAN_CONFIG.allInclusivePackage.soapUpgrade.excessUsageCharges.luxurySoap,
    paperCreditPerFixture:
      config.paperCredit?.creditPerFixturePerWeek ??
      SANICLEAN_CONFIG.allInclusivePackage.paperCredit.creditPerFixturePerWeek,
    microfiberMoppingPerBathroom:
      config.microfiberMoppingIncludedWithSaniClean?.pricePerBathroom ??
      SANICLEAN_CONFIG.allInclusivePackage.microfiberMopping.pricePerBathroom,
    warrantyFeePerDispenserPerWeek:
      config.warrantyFees?.soapDispenserWarrantyFeePerWeek ??
      SANICLEAN_CONFIG.perItemCharge.warrantyFees.perDispenserPerWeek,
    urinalScreenMonthly:
      typeof config.monthlyAddOnSupplyPricing?.urinalScreenMonthlyPrice === "number"
        ? config.monthlyAddOnSupplyPricing.urinalScreenMonthlyPrice
        : config.monthlyAddOnSupplyPricing?.urinalScreenMonthlyPrice === "included"
        ? config.monthlyAddOnSupplyPricing?.urinalMatMonthlyPrice ??
          SANICLEAN_CONFIG.perItemCharge.facilityComponents.urinals.components.urinalMat
        : SANICLEAN_CONFIG.perItemCharge.facilityComponents.urinals.components.urinalScreen,
    urinalMatMonthly:
      config.monthlyAddOnSupplyPricing?.urinalMatMonthlyPrice ??
      SANICLEAN_CONFIG.perItemCharge.facilityComponents.urinals.components.urinalMat,
    toiletClipsMonthly:
      config.monthlyAddOnSupplyPricing?.toiletClipMonthlyPrice ??
      SANICLEAN_CONFIG.perItemCharge.facilityComponents.maleToilets.components.toiletClips,
    seatCoverDispenserMonthly:
      typeof config.monthlyAddOnSupplyPricing?.toiletSeatCoverDispenserMonthlyPrice === "number"
        ? config.monthlyAddOnSupplyPricing.toiletSeatCoverDispenserMonthlyPrice
        : config.monthlyAddOnSupplyPricing?.toiletSeatCoverDispenserMonthlyPrice === "included"
        ? config.monthlyAddOnSupplyPricing?.toiletClipMonthlyPrice ??
          SANICLEAN_CONFIG.perItemCharge.facilityComponents.maleToilets.components.toiletClips
        : SANICLEAN_CONFIG.perItemCharge.facilityComponents.maleToilets.components.seatCoverDispenser,
    sanipodServiceMonthly:
      config.monthlyAddOnSupplyPricing?.sanipodMonthlyPricePerPod ??
      SANICLEAN_CONFIG.perItemCharge.facilityComponents.femaleToilets.components.sanipodService,
    redRateMultiplier: SANICLEAN_CONFIG.rateTiers.redRate.multiplier,
    greenRateMultiplier: SANICLEAN_CONFIG.rateTiers.greenRate.multiplier,
    customBaseService: undefined,
    customTripCharge: undefined,
    customWeeklyTotal: undefined,
    customMonthlyTotal: undefined,
    customContractTotal: undefined,
  } as SanicleanFormState;

  const baselineQuote: SanicleanQuoteResult =
    baselineForm.pricingMode === "all_inclusive"
      ? calculateAllInclusive(baselineForm, config)
      : calculatePerItemCharge(baselineForm, config);

  const originalContractTotal = baselineQuote.contractTotal + customFieldsTotal;

  return {
    ...baseQuote,
    weeklyTotal: effectiveWeeklyTotal,
    monthlyTotal: effectiveMonthlyTotal,
    contractTotal: effectiveContractTotal,
    originalContractTotal,
  };
}
