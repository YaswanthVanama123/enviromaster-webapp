import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  useServiceCalc,
  useCustomFieldsTotal,
  type CustomFieldLike,
} from "../../../features/services/engine";
import {
  sanicleanModule,
  computeSanicleanQuote,
  type BackendSanicleanConfig,
} from "../../../features/services/kinds/saniclean";
import { useServicesContextOptional } from "../ServicesContext";
import { addPriceChange, getFieldDisplayName } from "../../../utils/fileLogger";
import type {
  SanicleanFormState,
  SanicleanPricingMode,
  SanicleanRateTier,
  SanicleanFrequency,
  SanicleanQuoteResult,
} from "./sanicleanTypes";

const PRICING_FIELDS = new Set([
  "allInclusiveWeeklyRatePerFixture",
  "luxuryUpgradePerDispenser",
  "excessStandardSoapRate",
  "excessLuxurySoapRate",
  "paperCreditPerFixture",
  "microfiberMoppingPerBathroom",
  "insideBeltwayRatePerFixture",
  "insideBeltwayMinimum",
  "insideBeltwayTripCharge",
  "insideBeltwayParkingFee",
  "outsideBeltwayRatePerFixture",
  "outsideBeltwayTripCharge",
  "smallFacilityThreshold",
  "smallFacilityMinimum",
  "urinalScreenMonthly",
  "urinalMatMonthly",
  "toiletClipsMonthly",
  "seatCoverDispenserMonthly",
  "sanipodServiceMonthly",
  "warrantyFeePerDispenserPerWeek",
  "weeklyToMonthlyMultiplier",
  "weeklyToAnnualMultiplier",
  "redRateMultiplier",
  "greenRateMultiplier",
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
]);

export function useSanicleanCalc(
  initial?: Partial<SanicleanFormState>,
  customFields?: CustomFieldLike[]
) {
  const {
    form,
    setForm,
    config: backendConfig,
    isLoadingConfig,
    refreshConfig,
    setContractMonths,
  } = useServiceCalc(sanicleanModule, initial);

  const ctx = useServicesContextOptional();
  const baselineValues = useRef<Record<string, number>>({});
  const baselineInitialized = useRef(false);

  const { total: customFieldsTotal } = useCustomFieldsTotal(customFields);

  useEffect(() => {
    if (baselineInitialized.current) return;
    if (!backendConfig) return;
    baselineInitialized.current = true;

    const urinalScreenMonthlyDefault =
      typeof backendConfig.monthlyAddOnSupplyPricing?.urinalScreenMonthlyPrice === "number"
        ? Number(backendConfig.monthlyAddOnSupplyPricing.urinalScreenMonthlyPrice)
        : backendConfig.monthlyAddOnSupplyPricing?.urinalScreenMonthlyPrice === "included"
        ? Number(backendConfig.monthlyAddOnSupplyPricing?.urinalMatMonthlyPrice)
        : undefined;
    const seatCoverDispenserMonthlyDefault =
      typeof backendConfig.monthlyAddOnSupplyPricing?.toiletSeatCoverDispenserMonthlyPrice === "number"
        ? Number(backendConfig.monthlyAddOnSupplyPricing.toiletSeatCoverDispenserMonthlyPrice)
        : backendConfig.monthlyAddOnSupplyPricing?.toiletSeatCoverDispenserMonthlyPrice === "included"
        ? Number(backendConfig.monthlyAddOnSupplyPricing?.toiletClipMonthlyPrice)
        : undefined;

    const setBaseline = (field: string, value: unknown) => {
      if (typeof value === "number" && Number.isFinite(value)) {
        baselineValues.current[field] = value;
      }
    };

    setBaseline("allInclusiveWeeklyRatePerFixture", initial?.allInclusiveWeeklyRatePerFixture ?? backendConfig.allInclusivePricing?.pricePerFixture);
    setBaseline("luxuryUpgradePerDispenser", initial?.luxuryUpgradePerDispenser ?? backendConfig.soapUpgrades?.standardToLuxuryPerDispenserPerWeek);
    setBaseline("excessStandardSoapRate", initial?.excessStandardSoapRate ?? backendConfig.soapUpgrades?.excessUsageCharges?.standardSoapPerGallon);
    setBaseline("excessLuxurySoapRate", initial?.excessLuxurySoapRate ?? backendConfig.soapUpgrades?.excessUsageCharges?.luxurySoapPerGallon);
    setBaseline("paperCreditPerFixture", initial?.paperCreditPerFixture ?? backendConfig.paperCredit?.creditPerFixturePerWeek);
    setBaseline("microfiberMoppingPerBathroom", initial?.microfiberMoppingPerBathroom ?? backendConfig.microfiberMoppingIncludedWithSaniClean?.pricePerBathroom);
    setBaseline("insideBeltwayRatePerFixture", initial?.insideBeltwayRatePerFixture ?? backendConfig.standardALaCartePricing?.insideBeltway?.pricePerFixture);
    setBaseline("insideBeltwayMinimum", initial?.insideBeltwayMinimum ?? backendConfig.standardALaCartePricing?.insideBeltway?.minimumPrice);
    setBaseline("insideBeltwayTripCharge", initial?.insideBeltwayTripCharge ?? backendConfig.standardALaCartePricing?.insideBeltway?.tripCharge);
    setBaseline("insideBeltwayParkingFee", initial?.insideBeltwayParkingFee ?? backendConfig.standardALaCartePricing?.insideBeltway?.parkingFeeAddOn);
    setBaseline("outsideBeltwayRatePerFixture", initial?.outsideBeltwayRatePerFixture ?? backendConfig.standardALaCartePricing?.outsideBeltway?.pricePerFixture);
    setBaseline("outsideBeltwayTripCharge", initial?.outsideBeltwayTripCharge ?? backendConfig.standardALaCartePricing?.outsideBeltway?.tripCharge);
    setBaseline("smallFacilityThreshold", initial?.smallFacilityThreshold ?? backendConfig.smallBathroomMinimums?.minimumFixturesThreshold);
    setBaseline("smallFacilityMinimum", initial?.smallFacilityMinimum ?? backendConfig.smallBathroomMinimums?.minimumPriceUnderThreshold);
    setBaseline("urinalMatMonthly", initial?.urinalMatMonthly ?? backendConfig.monthlyAddOnSupplyPricing?.urinalMatMonthlyPrice);
    setBaseline("urinalScreenMonthly", initial?.urinalScreenMonthly ?? urinalScreenMonthlyDefault);
    setBaseline("toiletClipsMonthly", initial?.toiletClipsMonthly ?? backendConfig.monthlyAddOnSupplyPricing?.toiletClipMonthlyPrice);
    setBaseline("seatCoverDispenserMonthly", initial?.seatCoverDispenserMonthly ?? seatCoverDispenserMonthlyDefault);
    setBaseline("sanipodServiceMonthly", initial?.sanipodServiceMonthly ?? backendConfig.monthlyAddOnSupplyPricing?.sanipodMonthlyPricePerPod);
    setBaseline("warrantyFeePerDispenserPerWeek", initial?.warrantyFeePerDispenserPerWeek ?? backendConfig.warrantyFees?.soapDispenserWarrantyFeePerWeek ?? backendConfig.warrantyFees?.airFreshenerDispenserWarrantyFeePerWeek);
    setBaseline("weeklyToMonthlyMultiplier", initial?.weeklyToMonthlyMultiplier ?? backendConfig.frequencyMetadata?.weekly?.monthlyRecurringMultiplier);
  }, [backendConfig, initial]);

  const pricingOverrides = useMemo(() => {
    if (!backendConfig) return {};
    const cfg = backendConfig as BackendSanicleanConfig;

    const urinalScreenMonthlyDefault =
      typeof cfg.monthlyAddOnSupplyPricing?.urinalScreenMonthlyPrice === "number"
        ? Number(cfg.monthlyAddOnSupplyPricing.urinalScreenMonthlyPrice)
        : cfg.monthlyAddOnSupplyPricing?.urinalScreenMonthlyPrice === "included"
        ? Number(cfg.monthlyAddOnSupplyPricing?.urinalMatMonthlyPrice)
        : undefined;
    const seatCoverDispenserMonthlyDefault =
      typeof cfg.monthlyAddOnSupplyPricing?.toiletSeatCoverDispenserMonthlyPrice === "number"
        ? Number(cfg.monthlyAddOnSupplyPricing.toiletSeatCoverDispenserMonthlyPrice)
        : cfg.monthlyAddOnSupplyPricing?.toiletSeatCoverDispenserMonthlyPrice === "included"
        ? Number(cfg.monthlyAddOnSupplyPricing?.toiletClipMonthlyPrice)
        : undefined;

    const isOverride = (current: number, backendDefault: unknown) =>
      typeof backendDefault === "number" &&
      Number.isFinite(backendDefault) &&
      current !== backendDefault;

    return {
      allInclusiveWeeklyRatePerFixture: isOverride(form.allInclusiveWeeklyRatePerFixture, cfg.allInclusivePricing?.pricePerFixture),
      luxuryUpgradePerDispenser: isOverride(form.luxuryUpgradePerDispenser, cfg.soapUpgrades?.standardToLuxuryPerDispenserPerWeek),
      excessStandardSoapRate: isOverride(form.excessStandardSoapRate, cfg.soapUpgrades?.excessUsageCharges?.standardSoapPerGallon),
      excessLuxurySoapRate: isOverride(form.excessLuxurySoapRate, cfg.soapUpgrades?.excessUsageCharges?.luxurySoapPerGallon),
      paperCreditPerFixture: isOverride(form.paperCreditPerFixture, cfg.paperCredit?.creditPerFixturePerWeek),
      microfiberMoppingPerBathroom: isOverride(form.microfiberMoppingPerBathroom, cfg.microfiberMoppingIncludedWithSaniClean?.pricePerBathroom),
      insideBeltwayRatePerFixture: isOverride(form.insideBeltwayRatePerFixture, cfg.standardALaCartePricing?.insideBeltway?.pricePerFixture),
      insideBeltwayMinimum: isOverride(form.insideBeltwayMinimum, cfg.standardALaCartePricing?.insideBeltway?.minimumPrice),
      insideBeltwayTripCharge: isOverride(form.insideBeltwayTripCharge, cfg.standardALaCartePricing?.insideBeltway?.tripCharge),
      insideBeltwayParkingFee: isOverride(form.insideBeltwayParkingFee, cfg.standardALaCartePricing?.insideBeltway?.parkingFeeAddOn),
      outsideBeltwayRatePerFixture: isOverride(form.outsideBeltwayRatePerFixture, cfg.standardALaCartePricing?.outsideBeltway?.pricePerFixture),
      outsideBeltwayTripCharge: isOverride(form.outsideBeltwayTripCharge, cfg.standardALaCartePricing?.outsideBeltway?.tripCharge),
      smallFacilityThreshold: isOverride(form.smallFacilityThreshold, cfg.smallBathroomMinimums?.minimumFixturesThreshold),
      smallFacilityMinimum: isOverride(form.smallFacilityMinimum, cfg.smallBathroomMinimums?.minimumPriceUnderThreshold),
      urinalMatMonthly: isOverride(form.urinalMatMonthly, cfg.monthlyAddOnSupplyPricing?.urinalMatMonthlyPrice),
      urinalScreenMonthly: isOverride(form.urinalScreenMonthly, urinalScreenMonthlyDefault),
      toiletClipsMonthly: isOverride(form.toiletClipsMonthly, cfg.monthlyAddOnSupplyPricing?.toiletClipMonthlyPrice),
      seatCoverDispenserMonthly: isOverride(form.seatCoverDispenserMonthly, seatCoverDispenserMonthlyDefault),
      sanipodServiceMonthly: isOverride(form.sanipodServiceMonthly, cfg.monthlyAddOnSupplyPricing?.sanipodMonthlyPricePerPod),
      warrantyFeePerDispenserPerWeek: isOverride(form.warrantyFeePerDispenserPerWeek, cfg.warrantyFees?.soapDispenserWarrantyFeePerWeek ?? cfg.warrantyFees?.airFreshenerDispenserWarrantyFeePerWeek),
      weeklyToMonthlyMultiplier: isOverride(form.weeklyToMonthlyMultiplier, cfg.frequencyMetadata?.weekly?.monthlyRecurringMultiplier),
    };
  }, [
    backendConfig,
    form.allInclusiveWeeklyRatePerFixture,
    form.luxuryUpgradePerDispenser,
    form.excessStandardSoapRate,
    form.excessLuxurySoapRate,
    form.paperCreditPerFixture,
    form.microfiberMoppingPerBathroom,
    form.insideBeltwayRatePerFixture,
    form.insideBeltwayMinimum,
    form.insideBeltwayTripCharge,
    form.insideBeltwayParkingFee,
    form.outsideBeltwayRatePerFixture,
    form.outsideBeltwayTripCharge,
    form.smallFacilityThreshold,
    form.smallFacilityMinimum,
    form.urinalMatMonthly,
    form.urinalScreenMonthly,
    form.toiletClipsMonthly,
    form.seatCoverDispenserMonthly,
    form.sanipodServiceMonthly,
    form.warrantyFeePerDispenserPerWeek,
    form.weeklyToMonthlyMultiplier,
  ]);

  const addServiceFieldChange = useCallback(
    (
      fieldName: string,
      originalValue: number,
      newValue: number,
      quantityOverride?: number,
      frequencyOverride?: string
    ) => {
      addPriceChange({
        productKey: `saniclean_${fieldName}`,
        productName: `SaniClean - ${getFieldDisplayName(fieldName)}`,
        productType: "service",
        fieldType: fieldName,
        fieldDisplayName: getFieldDisplayName(fieldName),
        originalValue,
        newValue,
        quantity: quantityOverride ?? (form.fixtureCount || 1),
        frequency: frequencyOverride ?? form.mainServiceFrequency ?? "weekly",
      });
    },
    [form.fixtureCount, form.mainServiceFrequency]
  );

  const updateForm = useCallback(
    (updates: Partial<SanicleanFormState>) => {
      setForm((prev) => {
        const originalValues: Record<string, unknown> = {};
        Object.keys(updates).forEach((key) => {
          originalValues[key] = prev[key as keyof SanicleanFormState];
        });

        const next = { ...prev, ...updates } as SanicleanFormState;

        const baseInputFields = [
          "sinks", "urinals", "maleToilets", "femaleToilets",
          "location", "needsParking", "soapType", "excessSoapGallonsPerWeek",
          "addMicrofiberMopping", "microfiberBathrooms", "estimatedPaperSpendPerWeek",
          "warrantyDispensers", "addTripCharge", "pricingMode",
          "addUrinalComponents", "urinalScreensQty", "urinalMatsQty",
          "addMaleToiletComponents", "toiletClipsQty", "seatCoverDispensersQty",
          "addFemaleToiletComponents", "sanipodsQty",
          "contractMonths", "rateTier",
        ];
        const isBaseInputChange = Object.keys(updates).some((k) =>
          baseInputFields.includes(k)
        );
        if (isBaseInputChange) {
          next.customBaseService = undefined;
          next.customTripCharge = undefined;
          next.customFacilityComponents = undefined;
          next.customSoapUpgrade = undefined;
          next.customExcessSoap = undefined;
          next.customMicrofiberMopping = undefined;
          next.customWarrantyFees = undefined;
          next.customPaperOverage = undefined;
          next.customWeeklyTotal = undefined;
          next.customMonthlyTotal = undefined;
          next.customContractTotal = undefined;
        }

        const totalFixtures =
          Math.max(0, next.sinks ?? 0) +
          Math.max(0, next.urinals ?? 0) +
          Math.max(0, next.maleToilets ?? 0) +
          Math.max(0, next.femaleToilets ?? 0);
        next.fixtureCount = totalFixtures;

        const logQuantity = next.fixtureCount || 1;
        const logFrequency = next.mainServiceFrequency || "weekly";

        Object.keys(updates).forEach((fieldName) => {
          if (PRICING_FIELDS.has(fieldName)) {
            const newValue = updates[fieldName as keyof SanicleanFormState] as
              | number
              | undefined;
            const oldValue = originalValues[fieldName] as number | undefined;
            const baselineValue =
              (baselineValues.current[fieldName] as number | undefined) ?? oldValue;
            if (
              newValue !== undefined &&
              baselineValue !== undefined &&
              typeof newValue === "number" &&
              typeof baselineValue === "number" &&
              newValue !== baselineValue &&
              newValue > 0
            ) {
              addServiceFieldChange(
                fieldName,
                baselineValue,
                newValue,
                logQuantity,
                logFrequency
              );
            }
          }
        });

        return next;
      });
    },
    [setForm, addServiceFieldChange]
  );

  const hasInitialized = useRef(false);
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;
    const updates: Partial<SanicleanFormState> = {};
    const recomputedFixtureCount =
      Math.max(0, form.sinks ?? 0) +
      Math.max(0, form.urinals ?? 0) +
      Math.max(0, form.maleToilets ?? 0) +
      Math.max(0, form.femaleToilets ?? 0);
    if (recomputedFixtureCount !== form.fixtureCount) {
      updates.fixtureCount = recomputedFixtureCount;
    }
    if (!form.addUrinalComponents && (form.urinalScreensQty > 0 || form.urinalMatsQty > 0)) {
      updates.urinalScreensQty = 0;
      updates.urinalMatsQty = 0;
    }
    if (!form.addMaleToiletComponents && (form.toiletClipsQty > 0 || form.seatCoverDispensersQty > 0)) {
      updates.toiletClipsQty = 0;
      updates.seatCoverDispensersQty = 0;
    }
    if (!form.addFemaleToiletComponents && form.sanipodsQty > 0) {
      updates.sanipodsQty = 0;
    }
    if (!form.addMicrofiberMopping && form.microfiberBathrooms > 0) {
      updates.microfiberBathrooms = 0;
    }
    if (Object.keys(updates).length > 0) {
      setForm((prev) => ({ ...prev, ...updates }));
    }
  }, []);

  useEffect(() => {
    if (!hasInitialized.current) return;
    if (!form.addUrinalComponents && (form.urinalScreensQty > 0 || form.urinalMatsQty > 0)) {
      setForm((prev) => ({ ...prev, urinalScreensQty: 0, urinalMatsQty: 0 }));
    }
  }, [form.addUrinalComponents]);

  useEffect(() => {
    if (!hasInitialized.current) return;
    if (!form.addMaleToiletComponents && (form.toiletClipsQty > 0 || form.seatCoverDispensersQty > 0)) {
      setForm((prev) => ({ ...prev, toiletClipsQty: 0, seatCoverDispensersQty: 0 }));
    }
  }, [form.addMaleToiletComponents]);

  useEffect(() => {
    if (!hasInitialized.current) return;
    if (!form.addFemaleToiletComponents && form.sanipodsQty > 0) {
      setForm((prev) => ({ ...prev, sanipodsQty: 0 }));
    }
  }, [form.addFemaleToiletComponents]);

  useEffect(() => {
    if (!hasInitialized.current) return;
    if (!form.addMicrofiberMopping && form.microfiberBathrooms > 0) {
      setForm((prev) => ({ ...prev, microfiberBathrooms: 0 }));
    }
  }, [form.addMicrofiberMopping]);

  const quote: SanicleanQuoteResult = useMemo(
    () => computeSanicleanQuote(form, backendConfig, customFieldsTotal),
    [form, backendConfig, customFieldsTotal]
  );

  const setField = useCallback(
    (field: keyof SanicleanFormState, value: any) => {
      updateForm({ [field]: value } as Partial<SanicleanFormState>);
    },
    [updateForm]
  );

  const setPricingMode = useCallback(
    (mode: SanicleanPricingMode) => updateForm({ pricingMode: mode }),
    [updateForm]
  );
  const setLocation = useCallback(
    (location: "insideBeltway" | "outsideBeltway") => updateForm({ location }),
    [updateForm]
  );
  const setSoapType = useCallback(
    (soapType: "standard" | "luxury") => updateForm({ soapType }),
    [updateForm]
  );
  const setRateTier = useCallback(
    (rateTier: SanicleanRateTier) => updateForm({ rateTier }),
    [updateForm]
  );
  const setNotes = useCallback(
    (notes: string) => updateForm({ notes }),
    [updateForm]
  );
  const setMainServiceFrequency = useCallback(
    (frequency: SanicleanFrequency) =>
      updateForm({ mainServiceFrequency: frequency, frequency } as Partial<SanicleanFormState>),
    [updateForm]
  );
  const setFacilityComponentsFrequency = useCallback(
    (frequency: SanicleanFrequency) =>
      updateForm({ facilityComponentsFrequency: frequency, facilityComponentFrequency: frequency } as Partial<SanicleanFormState>),
    [updateForm]
  );

  const fetchPricing = useCallback(
    (forceRefresh: boolean = false) => {
      refreshConfig(forceRefresh);
    },
    [refreshConfig]
  );

  return {
    form,
    quote,
    backendConfig,
    isLoadingConfig,
    pricingOverrides,
    fetchPricing,
    refreshConfig,
    updateForm,
    setField,
    setPricingMode,
    setLocation,
    setSoapType,
    setRateTier,
    setNotes,
    setMainServiceFrequency,
    setFacilityComponentsFrequency,
    setContractMonths,
  };
}
