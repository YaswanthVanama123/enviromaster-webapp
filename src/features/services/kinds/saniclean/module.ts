import type { ServiceModule } from "../../engine/types";
import type {
  SanicleanFormState,
  SanicleanFrequency,
  SanicleanQuoteResult,
} from "../../../../components/services/saniclean/sanicleanTypes";
import { SANICLEAN_CONFIG } from "../../../../components/services/saniclean/sanicleanConfig";
import { registerService } from "../registry";
import {
  type BackendSanicleanConfig,
  computeSanicleanQuote,
  recomputeFixtureCount,
} from "./compute";

const DEFAULT_FORM: SanicleanFormState = recomputeFixtureCount({
  serviceId: "saniclean",
  pricingMode: "per_item_charge",
  sinks: 0,
  urinals: 0,
  maleToilets: 0,
  femaleToilets: 0,
  fixtureCount: 0,
  location: "insideBeltway",
  needsParking: false,
  soapType: "standard",
  excessSoapGallonsPerWeek: 0,
  addMicrofiberMopping: false,
  microfiberBathrooms: 0,
  estimatedPaperSpendPerWeek: 0,
  warrantyDispensers: 0,
  addTripCharge: false,
  addUrinalComponents: false,
  urinalScreensQty: 0,
  urinalMatsQty: 0,
  addMaleToiletComponents: false,
  toiletClipsQty: 0,
  seatCoverDispensersQty: 0,
  addFemaleToiletComponents: false,
  sanipodsQty: 0,
  contractMonths: 12,
  rateTier: "redRate",
  mainServiceFrequency: "weekly" as SanicleanFrequency,
  facilityComponentsFrequency: "weekly" as SanicleanFrequency,
  frequency: "weekly",
  facilityComponentFrequency: "weekly",
  notes: "",
  allInclusiveWeeklyRatePerFixture: SANICLEAN_CONFIG.allInclusivePackage.weeklyRatePerFixture,
  luxuryUpgradePerDispenser:
    SANICLEAN_CONFIG.allInclusivePackage.soapUpgrade.luxuryUpgradePerDispenser,
  excessStandardSoapRate:
    SANICLEAN_CONFIG.allInclusivePackage.soapUpgrade.excessUsageCharges.standardSoap,
  excessLuxurySoapRate:
    SANICLEAN_CONFIG.allInclusivePackage.soapUpgrade.excessUsageCharges.luxurySoap,
  paperCreditPerFixture: SANICLEAN_CONFIG.allInclusivePackage.paperCredit.creditPerFixturePerWeek,
  microfiberMoppingPerBathroom:
    SANICLEAN_CONFIG.allInclusivePackage.microfiberMopping.pricePerBathroom,
  insideBeltwayRatePerFixture: SANICLEAN_CONFIG.perItemCharge.insideBeltway.ratePerFixture,
  insideBeltwayMinimum: SANICLEAN_CONFIG.perItemCharge.insideBeltway.weeklyMinimum,
  insideBeltwayTripCharge: SANICLEAN_CONFIG.perItemCharge.insideBeltway.tripCharge,
  insideBeltwayParkingFee: SANICLEAN_CONFIG.perItemCharge.insideBeltway.parkingFee,
  outsideBeltwayRatePerFixture: SANICLEAN_CONFIG.perItemCharge.outsideBeltway.ratePerFixture,
  outsideBeltwayTripCharge: SANICLEAN_CONFIG.perItemCharge.outsideBeltway.tripCharge,
  smallFacilityThreshold: SANICLEAN_CONFIG.perItemCharge.smallFacility.fixtureThreshold,
  smallFacilityMinimum: SANICLEAN_CONFIG.perItemCharge.smallFacility.minimumWeekly,
  urinalScreenMonthly:
    SANICLEAN_CONFIG.perItemCharge.facilityComponents.urinals.components.urinalScreen,
  urinalMatMonthly:
    SANICLEAN_CONFIG.perItemCharge.facilityComponents.urinals.components.urinalMat,
  toiletClipsMonthly:
    SANICLEAN_CONFIG.perItemCharge.facilityComponents.maleToilets.components.toiletClips,
  seatCoverDispenserMonthly:
    SANICLEAN_CONFIG.perItemCharge.facilityComponents.maleToilets.components.seatCoverDispenser,
  sanipodServiceMonthly:
    SANICLEAN_CONFIG.perItemCharge.facilityComponents.femaleToilets.components.sanipodService,
  warrantyFeePerDispenserPerWeek: SANICLEAN_CONFIG.perItemCharge.warrantyFees.perDispenserPerWeek,
  weeklyToMonthlyMultiplier: SANICLEAN_CONFIG.billingConversions.weekly.monthlyMultiplier,
  weeklyToAnnualMultiplier: SANICLEAN_CONFIG.billingConversions.weekly.annualMultiplier,
  redRateMultiplier: SANICLEAN_CONFIG.rateTiers.redRate.multiplier,
  greenRateMultiplier: SANICLEAN_CONFIG.rateTiers.greenRate.multiplier,
  applyMinimum: true,
} as SanicleanFormState);

const BASE_INPUT_FIELDS = [
  "sinks",
  "urinals",
  "maleToilets",
  "femaleToilets",
  "location",
  "needsParking",
  "soapType",
  "excessSoapGallonsPerWeek",
  "addMicrofiberMopping",
  "microfiberBathrooms",
  "estimatedPaperSpendPerWeek",
  "warrantyDispensers",
  "addTripCharge",
  "pricingMode",
  "addUrinalComponents",
  "urinalScreensQty",
  "urinalMatsQty",
  "addMaleToiletComponents",
  "toiletClipsQty",
  "seatCoverDispensersQty",
  "addFemaleToiletComponents",
  "sanipodsQty",
  "contractMonths",
  "rateTier",
] as const;

const CUSTOM_OVERRIDE_FIELDS = [
  "customBaseService",
  "customTripCharge",
  "customFacilityComponents",
  "customSoapUpgrade",
  "customExcessSoap",
  "customMicrofiberMopping",
  "customWarrantyFees",
  "customPaperOverage",
  "customWeeklyTotal",
  "customMonthlyTotal",
  "customContractTotal",
] as const;

export const sanicleanModule: ServiceModule<
  SanicleanFormState,
  BackendSanicleanConfig | null,
  SanicleanQuoteResult
> = registerService({
  id: "saniclean",
  displayName: "SaniClean",

  defaults: DEFAULT_FORM,
  staticConfig: null as BackendSanicleanConfig | null,

  mapBackendConfig: (raw) => (raw as BackendSanicleanConfig | null) ?? null,

  applyConfigToForm: (config) => {
    if (!config) return {};
    const c = config as BackendSanicleanConfig;
    const urinalScreenMonthly =
      typeof c.monthlyAddOnSupplyPricing?.urinalScreenMonthlyPrice === "number"
        ? c.monthlyAddOnSupplyPricing.urinalScreenMonthlyPrice
        : c.monthlyAddOnSupplyPricing?.urinalScreenMonthlyPrice === "included"
        ? c.monthlyAddOnSupplyPricing?.urinalMatMonthlyPrice
        : undefined;
    const seatCoverDispenserMonthly =
      typeof c.monthlyAddOnSupplyPricing?.toiletSeatCoverDispenserMonthlyPrice === "number"
        ? c.monthlyAddOnSupplyPricing.toiletSeatCoverDispenserMonthlyPrice
        : c.monthlyAddOnSupplyPricing?.toiletSeatCoverDispenserMonthlyPrice === "included"
        ? c.monthlyAddOnSupplyPricing?.toiletClipMonthlyPrice
        : undefined;
    const warrantyFee =
      c.warrantyFees?.soapDispenserWarrantyFeePerWeek ??
      c.warrantyFees?.airFreshenerDispenserWarrantyFeePerWeek;

    const patch: Partial<SanicleanFormState> = {};
    if (c.allInclusivePricing?.pricePerFixture !== undefined)
      patch.allInclusiveWeeklyRatePerFixture = c.allInclusivePricing.pricePerFixture;
    if (c.soapUpgrades?.standardToLuxuryPerDispenserPerWeek !== undefined)
      patch.luxuryUpgradePerDispenser = c.soapUpgrades.standardToLuxuryPerDispenserPerWeek;
    if (c.soapUpgrades?.excessUsageCharges?.standardSoapPerGallon !== undefined)
      patch.excessStandardSoapRate = c.soapUpgrades.excessUsageCharges.standardSoapPerGallon;
    if (c.soapUpgrades?.excessUsageCharges?.luxurySoapPerGallon !== undefined)
      patch.excessLuxurySoapRate = c.soapUpgrades.excessUsageCharges.luxurySoapPerGallon;
    if (c.paperCredit?.creditPerFixturePerWeek !== undefined)
      patch.paperCreditPerFixture = c.paperCredit.creditPerFixturePerWeek;
    if (c.microfiberMoppingIncludedWithSaniClean?.pricePerBathroom !== undefined)
      patch.microfiberMoppingPerBathroom =
        c.microfiberMoppingIncludedWithSaniClean.pricePerBathroom;
    if (c.standardALaCartePricing?.insideBeltway?.pricePerFixture !== undefined)
      patch.insideBeltwayRatePerFixture =
        c.standardALaCartePricing.insideBeltway.pricePerFixture;
    if (c.standardALaCartePricing?.insideBeltway?.minimumPrice !== undefined)
      patch.insideBeltwayMinimum = c.standardALaCartePricing.insideBeltway.minimumPrice;
    if (c.standardALaCartePricing?.insideBeltway?.tripCharge !== undefined)
      patch.insideBeltwayTripCharge = c.standardALaCartePricing.insideBeltway.tripCharge;
    if (c.standardALaCartePricing?.insideBeltway?.parkingFeeAddOn !== undefined)
      patch.insideBeltwayParkingFee = c.standardALaCartePricing.insideBeltway.parkingFeeAddOn;
    if (c.standardALaCartePricing?.outsideBeltway?.pricePerFixture !== undefined)
      patch.outsideBeltwayRatePerFixture =
        c.standardALaCartePricing.outsideBeltway.pricePerFixture;
    if (c.standardALaCartePricing?.outsideBeltway?.tripCharge !== undefined)
      patch.outsideBeltwayTripCharge = c.standardALaCartePricing.outsideBeltway.tripCharge;
    if (c.smallBathroomMinimums?.minimumFixturesThreshold !== undefined)
      patch.smallFacilityThreshold = c.smallBathroomMinimums.minimumFixturesThreshold;
    if (c.smallBathroomMinimums?.minimumPriceUnderThreshold !== undefined)
      patch.smallFacilityMinimum = c.smallBathroomMinimums.minimumPriceUnderThreshold;
    if (urinalScreenMonthly !== undefined) patch.urinalScreenMonthly = urinalScreenMonthly;
    if (c.monthlyAddOnSupplyPricing?.urinalMatMonthlyPrice !== undefined)
      patch.urinalMatMonthly = c.monthlyAddOnSupplyPricing.urinalMatMonthlyPrice;
    if (c.monthlyAddOnSupplyPricing?.toiletClipMonthlyPrice !== undefined)
      patch.toiletClipsMonthly = c.monthlyAddOnSupplyPricing.toiletClipMonthlyPrice;
    if (seatCoverDispenserMonthly !== undefined)
      patch.seatCoverDispenserMonthly = seatCoverDispenserMonthly;
    if (c.monthlyAddOnSupplyPricing?.sanipodMonthlyPricePerPod !== undefined)
      patch.sanipodServiceMonthly = c.monthlyAddOnSupplyPricing.sanipodMonthlyPricePerPod;
    if (warrantyFee !== undefined) patch.warrantyFeePerDispenserPerWeek = warrantyFee;
    if (c.frequencyMetadata?.weekly?.monthlyRecurringMultiplier !== undefined)
      patch.weeklyToMonthlyMultiplier = c.frequencyMetadata.weekly.monthlyRecurringMultiplier;
    return patch;
  },

  computeQuote: (form, config) => computeSanicleanQuote(form, config, 0),

  isActive: (form) => (form.fixtureCount || 0) > 0,

  baseInputFields: BASE_INPUT_FIELDS as ReadonlyArray<keyof SanicleanFormState>,
  customOverrideFields: CUSTOM_OVERRIDE_FIELDS as ReadonlyArray<keyof SanicleanFormState>,
});

export {
  computeSanicleanQuote,
  calculateAllInclusive,
  calculatePerItemCharge,
  recomputeFixtureCount,
} from "./compute";
export type { BackendSanicleanConfig } from "./compute";
