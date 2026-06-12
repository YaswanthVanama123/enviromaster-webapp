
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { ServiceConfig } from "../../backendservice/types/serviceConfig.types";
import { Toast } from "./Toast";
import "./ServicePricingDetailedView.css";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faWindowMaximize, faBolt, faDollarSign, faTimes, faSync,
  faRuler, faCalendar, faWind, faCar, faDroplet, faChartBar,
  faOilCan, faLeaf, faPlus, faBroom, faBuilding, faLandmark,
  faStar, faClock, faCity, faTree, faBox, faStore, faSoap,
  faTicket, faCheck, faClipboard, faTrash, faShoppingBag,
  faShower, faWandMagicSparkles, faUtensils
} from '@fortawesome/free-solid-svg-icons';

interface ServicePricingDetailedViewProps {
  service: ServiceConfig;
  onUpdateField: (path: string[], value: number) => Promise<void>;
  onClose: () => void;
}

type TabKey =
  | "windowRates" | "installMultipliers" | "minimumAndTripCharges" | "frequencyPriceMultipliers" | "frequencyConversions" | "contractTerms"
  | "unitPricing" | "minimums" | "carpetInstallMultipliers" | "frequencyMeta"
  | "sprayRates" | "sprayTripCharges" | "sprayFrequencyConversions"
  | "standardRates" | "volumePricing" | "greaseTrap" | "greenDrain" | "addonsMultipliers" | "tripCharges" | "billingConversions" | "contractTerms"
  | "basicRates" | "hugeBathrooms" | "extraAreas" | "standalonePricing" | "moppingMetadata" | "contractTerms"
  | "baseRates" | "shortJobPricing" | "serviceMultipliers" | "monthlyConversions" | "contractSettings" | "dustingVacuuming" | "rateTiers" | "smoothBreakdown"
  | "janProductionRates" | "janLaborDefaults" | "janSupplyDefaults"
  | "insideBeltway" | "outsideBeltway" | "allInclusive" | "smallFacility" | "soapUpgrades" | "warrantyCredits" | "sanicleanBillingConversions" | "sanicleanRateTiers" | "includedItems" | "monthlyAddOns" | "microfiberMoppingAddon" | "contractTerms"
  | "podRates" | "extraBags" | "installation" | "standaloneService" | "frequencySettings" | "sanipodBillingConversions" | "sanipodContractTerms" | "sanipodRateTiers"
  | "fixtureRates" | "saniscrubMinimums" | "nonBathroomPricing" | "saniscrubInstallMultipliers" | "serviceFrequencies" | "discountsAndFees" | "contractTerms"
  | "standardFull" | "noSealant" | "wellMaintained" | "stripWaxContractTerms" | "stripWaxBillingConversions" | "stripWaxRateTiers"
  | "defaultRates" | "kitchenPricing" | "fohPricing" | "patioPricing" | "sqftPricing" | "scrubFrequencyConversions" | "contractTerms";

interface PricingField {
  label: string;
  value: number;
  path: string[];
  unit?: string;
  description?: string;
}

export const ServicePricingDetailedView: React.FC<ServicePricingDetailedViewProps> = ({
  service,
  onUpdateField,
  onClose,
}) => {
  const { t } = useTranslation();
  const getInitialTab = (): TabKey => {
    if (service.serviceId === "rpmWindows") return "windowRates";
    if (service.serviceId === "carpetCleaning") return "unitPricing";
    if (service.serviceId === "electrostaticSpray") return "sprayRates";
    if (service.serviceId === "foamingDrain") return "standardRates";
    if (service.serviceId === "microfiberMopping") return "basicRates";
    if (service.serviceId === "pureJanitorial") return "janProductionRates";
    if (service.serviceId === "saniclean") return "insideBeltway";
    if (service.serviceId === "sanipod") return "podRates";
    if (service.serviceId === "saniscrub") return "fixtureRates";
    if (service.serviceId === "stripWax") return "standardFull";
    if (service.serviceId === "refreshPowerScrub") return "defaultRates";
    return "windowRates";
  };

  const [activeTab, setActiveTab] = useState<TabKey>(getInitialTab());
  const [editingField, setEditingField] = useState<{ path: string[]; value: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showNewPT, setShowNewPT] = useState(false);
  const [newPTLabel, setNewPTLabel] = useState("");
  const [newPTRate, setNewPTRate] = useState("1000");
  const [savingNewPT, setSavingNewPT] = useState(false);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  const config = service.config;

  const ensureNestedDefaults = (config: any) => {
    if (!config.frequencyMetadata) {
      config.frequencyMetadata = {};
    }
    if (!config.frequencyMetadata.weekly) {
      config.frequencyMetadata.weekly = { monthlyRecurringMultiplier: 0, firstMonthExtraMultiplier: 0 };
    }
    if (!config.frequencyMetadata.biweekly) {
      config.frequencyMetadata.biweekly = { monthlyRecurringMultiplier: 0, firstMonthExtraMultiplier: 0 };
    }
    if (!config.frequencyMetadata.monthly) {
      config.frequencyMetadata.monthly = { cycleMonths: 0 };
    }
    if (!config.frequencyMetadata.bimonthly) {
      config.frequencyMetadata.bimonthly = { cycleMonths: 0 };
    }
    if (!config.frequencyMetadata.quarterly) {
      config.frequencyMetadata.quarterly = { cycleMonths: 0 };
    }
    if (!config.frequencyMetadata.biannual) {
      config.frequencyMetadata.biannual = { cycleMonths: 0 };
    }
    if (!config.frequencyMetadata.annual) {
      config.frequencyMetadata.annual = { cycleMonths: 0 };
    }
    return config;
  };

  const configWithDefaults = ensureNestedDefaults({...config});

  const getValue = (path: string[], configSource?: any): any => {
    let current: any = configSource || configWithDefaults; 
    for (const key of path) {
      if (current === undefined || current === null) return undefined;
      current = current[key];
    }
    return current;
  };

  const getFieldsByCategory = () => {

    const categories: Record<TabKey, PricingField[]> = {
      windowRates: [],
      installMultipliers: [],
      minimumAndTripCharges: [],
      frequencyPriceMultipliers: [],
      frequencyConversions: [],
      contractTerms: [],
      unitPricing: [],
      minimums: [],
      carpetInstallMultipliers: [],
      frequencyMeta: [],
      standardRates: [],
      volumePricing: [],
      greaseTrap: [],
      greenDrain: [],
      addonsMultipliers: [],
      tripCharges: [],
      billingConversions: [],
      contractTerms: [],
      basicRates: [],
      hugeBathrooms: [],
      extraAreas: [],
      standalonePricing: [],
      moppingMetadata: [],
      baseRates: [],
      shortJobPricing: [],
      serviceMultipliers: [],
      monthlyConversions: [],
      contractSettings: [],
      dustingVacuuming: [],
      rateTiers: [],
      smoothBreakdown: [],
      insideBeltway: [],
      outsideBeltway: [],
      allInclusive: [],
      smallFacility: [],
      soapUpgrades: [],
      warrantyCredits: [],
      sanicleanBillingConversions: [],
      sanicleanRateTiers: [],
      includedItems: [],
      monthlyAddOns: [],
      microfiberMoppingAddon: [],
      podRates: [],
      extraBags: [],
      installation: [],
      standaloneService: [],
      frequencySettings: [],
      sanipodBillingConversions: [],
      sanipodContractTerms: [],
      sanipodRateTiers: [],
      fixtureRates: [],
      saniscrubMinimums: [],
      nonBathroomPricing: [],
      saniscrubInstallMultipliers: [],
      serviceFrequencies: [],
      discountsAndFees: [],
      standardFull: [],
      noSealant: [],
      wellMaintained: [],
      stripWaxContractTerms: [],
      stripWaxBillingConversions: [],
      stripWaxRateTiers: [],
      defaultRates: [],
      kitchenPricing: [],
      fohPricing: [],
      patioPricing: [],
      sqftPricing: [],
      scrubFrequencyConversions: [],
    };

    if (service.serviceId === "rpmWindows") {
      const windowPricing = getValue(["windowPricingBothSidesIncluded"]) || {};
      categories.windowRates = [
        {
          label: t("servicePricing.detailedFields.smallWindowPrice"),
          value: windowPricing.smallWindowPrice ?? 0,
          path: ["windowPricingBothSidesIncluded", "smallWindowPrice"],
          unit: "$ per window",
          description: t("servicePricing.detailedFields.smallWindowPriceDesc"),
        },
        {
          label: t("servicePricing.detailedFields.mediumWindowPrice"),
          value: windowPricing.mediumWindowPrice ?? 0,
          path: ["windowPricingBothSidesIncluded", "mediumWindowPrice"],
          unit: "$ per window",
          description: t("servicePricing.detailedFields.mediumWindowPriceDesc"),
        },
        {
          label: t("servicePricing.detailedFields.largeWindowPrice"),
          value: windowPricing.largeWindowPrice ?? 0,
          path: ["windowPricingBothSidesIncluded", "largeWindowPrice"],
          unit: "$ per window",
          description: t("servicePricing.detailedFields.largeWindowPriceDesc"),
        },
      ];

      const installPricing = getValue(["installPricing"]) || {};
      categories.installMultipliers = [
        {
          label: t("servicePricing.detailedFields.installationMultiplier"),
          value: installPricing.installationMultiplier ?? 0,
          path: ["installPricing", "installationMultiplier"],
          unit: "×",
          description: t("servicePricing.detailedFields.installationMultiplierDesc"),
        },
      ];

      const tripChargesData = getValue(["tripCharges"]) || {};
      categories.minimumAndTripCharges = [
        {
          label: t("servicePricing.detailedFields.minimumChargePerVisit"),
          value: getValue(["minimumChargePerVisit"]) ?? 0,
          path: ["minimumChargePerVisit"],
          unit: "$",
          description: t("servicePricing.detailedFields.rpmMinimumChargePerVisitDesc"),
        },
        {
          label: t("servicePricing.detailedFields.standardTripCharge"),
          value: tripChargesData.standard ?? 0,
          path: ["tripCharges", "standard"],
          unit: "$",
          description: t("servicePricing.detailedFields.standardTripChargeDesc"),
        },
        {
          label: t("servicePricing.detailedFields.beltwayTripCharge"),
          value: tripChargesData.beltway ?? 0,
          path: ["tripCharges", "beltway"],
          unit: "$",
          description: t("servicePricing.detailedFields.beltwayTripChargeDesc"),
        },
      ];

      const freqPriceMultipliers = getValue(["frequencyPriceMultipliers"]) || {};
      categories.frequencyPriceMultipliers = [
        {
          label: t("servicePricing.detailedFields.biweeklyPriceMultiplier"),
          value: freqPriceMultipliers.biweeklyPriceMultiplier ?? 0,
          path: ["frequencyPriceMultipliers", "biweeklyPriceMultiplier"],
          unit: "×",
          description: t("servicePricing.detailedFields.biweeklyPriceMultiplierDesc"),
        },
        {
          label: t("servicePricing.detailedFields.monthlyPriceMultiplier"),
          value: freqPriceMultipliers.monthlyPriceMultiplier ?? 0,
          path: ["frequencyPriceMultipliers", "monthlyPriceMultiplier"],
          unit: "×",
          description: t("servicePricing.detailedFields.monthlyPriceMultiplierDesc"),
        },
        {
          label: t("servicePricing.detailedFields.quarterlyPriceMultiplierAfterFirstTime"),
          value: freqPriceMultipliers.quarterlyPriceMultiplierAfterFirstTime ?? 0,
          path: ["frequencyPriceMultipliers", "quarterlyPriceMultiplierAfterFirstTime"],
          unit: "×",
          description: t("servicePricing.detailedFields.quarterlyPriceMultiplierAfterFirstTimeDesc"),
        },
        {
          label: t("servicePricing.detailedFields.quarterlyFirstTimeMultiplier"),
          value: freqPriceMultipliers.quarterlyFirstTimeMultiplier ?? 0,
          path: ["frequencyPriceMultipliers", "quarterlyFirstTimeMultiplier"],
          unit: "×",
          description: t("servicePricing.detailedFields.quarterlyFirstTimeMultiplierDesc"),
        },
      ];

      const freqMeta = getValue(["frequencyMetadata"]) || {};
      categories.frequencyConversions = [
        {
          label: t("servicePricing.detailedFields.weeklyMonthlyRecurring"),
          value: freqMeta.weekly?.monthlyRecurringMultiplier ?? 0,
          path: ["frequencyMetadata", "weekly", "monthlyRecurringMultiplier"],
          unit: "×",
          description: t("servicePricing.detailedFields.weeklyMonthlyRecurringDesc"),
        },
        {
          label: t("servicePricing.detailedFields.weeklyFirstMonthExtra"),
          value: freqMeta.weekly?.firstMonthExtraMultiplier ?? 0,
          path: ["frequencyMetadata", "weekly", "firstMonthExtraMultiplier"],
          unit: "×",
          description: t("servicePricing.detailedFields.weeklyFirstMonthExtraDesc"),
        },
        {
          label: t("servicePricing.detailedFields.biweeklyMonthlyRecurring"),
          value: freqMeta.biweekly?.monthlyRecurringMultiplier ?? 0,
          path: ["frequencyMetadata", "biweekly", "monthlyRecurringMultiplier"],
          unit: "×",
          description: t("servicePricing.detailedFields.biweeklyMonthlyRecurringDesc"),
        },
        {
          label: t("servicePricing.detailedFields.biweeklyFirstMonthExtra"),
          value: freqMeta.biweekly?.firstMonthExtraMultiplier ?? 0,
          path: ["frequencyMetadata", "biweekly", "firstMonthExtraMultiplier"],
          unit: "×",
          description: t("servicePricing.detailedFields.biweeklyFirstMonthExtraDesc"),
        },
        {
          label: t("servicePricing.detailedFields.bimonthlyCycleMonths"),
          value: freqMeta.bimonthly?.cycleMonths ?? 0,
          path: ["frequencyMetadata", "bimonthly", "cycleMonths"],
          unit: "months",
          description: t("servicePricing.detailedFields.bimonthlyCycleMonthsDesc"),
        },
        {
          label: t("servicePricing.detailedFields.quarterlyCycleMonths"),
          value: freqMeta.quarterly?.cycleMonths ?? 0,
          path: ["frequencyMetadata", "quarterly", "cycleMonths"],
          unit: "months",
          description: t("servicePricing.detailedFields.quarterlyCycleMonthsDesc"),
        },
        {
          label: t("servicePricing.detailedFields.biannualCycleMonths"),
          value: freqMeta.biannual?.cycleMonths ?? 0,
          path: ["frequencyMetadata", "biannual", "cycleMonths"],
          unit: "months",
          description: t("servicePricing.detailedFields.biannualCycleMonthsDesc"),
        },
        {
          label: t("servicePricing.detailedFields.annualCycleMonths"),
          value: freqMeta.annual?.cycleMonths ?? 0,
          path: ["frequencyMetadata", "annual", "cycleMonths"],
          unit: "months",
          description: t("servicePricing.detailedFields.annualCycleMonthsDesc"),
        },
      ];

      categories.contractTerms = [
        {
          label: t("servicePricing.detailedFields.minContractMonths"),
          value: getValue(["minContractMonths"]) ?? 0,
          path: ["minContractMonths"],
          unit: "months",
          description: t("servicePricing.detailedFields.minContractMonthsDesc"),
        },
        {
          label: t("servicePricing.detailedFields.maxContractMonths"),
          value: getValue(["maxContractMonths"]) ?? 0,
          path: ["maxContractMonths"],
          unit: "months",
          description: t("servicePricing.detailedFields.maxContractMonthsDesc"),
        },
      ];
    }

    if (service.serviceId === "carpetCleaning") {
      categories.unitPricing = [
        {
          label: t("servicePricing.detailedFields.baseSqFtUnit"),
          value: getValue(["baseSqFtUnit"]) ?? 0,
          path: ["baseSqFtUnit"],
          unit: "sq ft",
          description: t("servicePricing.detailedFields.baseSqFtUnitDesc"),
        },
        {
          label: t("servicePricing.detailedFields.basePrice"),
          value: getValue(["basePrice"]) ?? 0,
          path: ["basePrice"],
          unit: "$",
          description: t("servicePricing.detailedFields.basePriceDesc"),
        },
        {
          label: t("servicePricing.detailedFields.additionalSqFtUnit"),
          value: getValue(["additionalSqFtUnit"]) ?? 0,
          path: ["additionalSqFtUnit"],
          unit: "sq ft",
          description: t("servicePricing.detailedFields.additionalSqFtUnitDesc"),
        },
        {
          label: t("servicePricing.detailedFields.additionalUnitPrice"),
          value: getValue(["additionalUnitPrice"]) ?? 0,
          path: ["additionalUnitPrice"],
          unit: "$",
          description: t("servicePricing.detailedFields.additionalUnitPriceDesc"),
        },
      ];

      categories.minimums = [
        {
          label: t("servicePricing.detailedFields.minimumChargePerVisit"),
          value: getValue(["minimumChargePerVisit"]) ?? 0,
          path: ["minimumChargePerVisit"],
          unit: "$",
          description: t("servicePricing.detailedFields.carpetMinimumChargePerVisitDesc"),
        },
      ];

      const installMults = getValue(["installationMultipliers"]) || {};
      categories.carpetInstallMultipliers = [
        {
          label: t("servicePricing.detailedFields.dirtyInstallMultiplier"),
          value: installMults.dirtyInstallMultiplier ?? 0,
          path: ["installationMultipliers", "dirtyInstallMultiplier"],
          unit: "×",
          description: t("servicePricing.detailedFields.dirtyInstallMultiplierDesc"),
        },
        {
          label: t("servicePricing.detailedFields.cleanInstallMultiplier"),
          value: installMults.cleanInstallMultiplier ?? 0,
          path: ["installationMultipliers", "cleanInstallMultiplier"],
          unit: "×",
          description: t("servicePricing.detailedFields.cleanInstallMultiplierDesc"),
        },
      ];

      const freqMeta = getValue(["frequencyMetadata"]) || {};
      categories.frequencyMeta = [
        {
          label: t("servicePricing.detailedFields.weeklyMonthlyRecurring"),
          value: freqMeta.weekly?.monthlyRecurringMultiplier ?? 0,
          path: ["frequencyMetadata", "weekly", "monthlyRecurringMultiplier"],
          unit: "×",
          description: t("servicePricing.detailedFields.weeklyMonthlyRecurringDesc"),
        },
        {
          label: t("servicePricing.detailedFields.weeklyFirstMonthExtra"),
          value: freqMeta.weekly?.firstMonthExtraMultiplier ?? 0,
          path: ["frequencyMetadata", "weekly", "firstMonthExtraMultiplier"],
          unit: "×",
          description: t("servicePricing.detailedFields.weeklyFirstMonthExtraDesc"),
        },
        {
          label: t("servicePricing.detailedFields.biweeklyMonthlyRecurring"),
          value: freqMeta.biweekly?.monthlyRecurringMultiplier ?? 0,
          path: ["frequencyMetadata", "biweekly", "monthlyRecurringMultiplier"],
          unit: "×",
          description: t("servicePricing.detailedFields.biweeklyMonthlyRecurringDesc"),
        },
        {
          label: t("servicePricing.detailedFields.biweeklyFirstMonthExtra"),
          value: freqMeta.biweekly?.firstMonthExtraMultiplier ?? 0,
          path: ["frequencyMetadata", "biweekly", "firstMonthExtraMultiplier"],
          unit: "×",
          description: t("servicePricing.detailedFields.biweeklyFirstMonthExtraDesc"),
        },
      ];

      categories.contractTerms = [

      ];
    }

    if (service.serviceId === "electrostaticSpray") {
      const standardSprayPricing = getValue(["standardSprayPricing"]) || {};
      const tripChargesData = getValue(["tripCharges"]) || {};
      const freqMeta = getValue(["frequencyMetadata"]) || {};

      categories.sprayRates = [
        {
          label: t("servicePricing.detailedFields.sprayRatePerRoom"),
          value: standardSprayPricing.sprayRatePerRoom ?? 0,
          path: ["standardSprayPricing", "sprayRatePerRoom"],
          unit: "$ per room",
          description: t("servicePricing.detailedFields.sprayRatePerRoomDesc"),
        },
        {
          label: t("servicePricing.detailedFields.sqFtUnit"),
          value: standardSprayPricing.sqFtUnit ?? 0,
          path: ["standardSprayPricing", "sqFtUnit"],
          unit: "sq ft",
          description: t("servicePricing.detailedFields.spraySqFtUnitDesc"),
        },
        {
          label: t("servicePricing.detailedFields.sprayRatePerSqFtUnit"),
          value: standardSprayPricing.sprayRatePerSqFtUnit ?? 0,
          path: ["standardSprayPricing", "sprayRatePerSqFtUnit"],
          unit: "$ per unit",
          description: t("servicePricing.detailedFields.sprayRatePerSqFtUnitDesc"),
        },
        {
          label: t("servicePricing.detailedFields.minimumPriceOptional"),
          value: standardSprayPricing.minimumPriceOptional ?? 0,
          path: ["standardSprayPricing", "minimumPriceOptional"],
          unit: "$",
          description: t("servicePricing.detailedFields.minimumPriceOptionalDesc"),
        },
        {
          label: t("servicePricing.detailedFields.minimumChargePerVisit"),
          value: getValue(["minimumChargePerVisit"]) ?? 0,
          path: ["minimumChargePerVisit"],
          unit: "$",
          description: t("servicePricing.detailedFields.rpmMinimumChargePerVisitDesc"),
        },
      ];

      categories.sprayTripCharges = [

      ];

      categories.sprayFrequencyConversions = [
        {
          label: t("servicePricing.detailedFields.weeklyMonthlyRecurring"),
          value: freqMeta.weekly?.monthlyRecurringMultiplier ?? 0,
          path: ["frequencyMetadata", "weekly", "monthlyRecurringMultiplier"],
          unit: "×",
          description: t("servicePricing.detailedFields.weeklyMonthlyConversionDesc"),
        },
        {
          label: t("servicePricing.detailedFields.weeklyFirstMonthExtra"),
          value: freqMeta.weekly?.firstMonthExtraMultiplier ?? 0,
          path: ["frequencyMetadata", "weekly", "firstMonthExtraMultiplier"],
          unit: "×",
          description: t("servicePricing.detailedFields.weeklyFirstMonthExtraDesc"),
        },
        {
          label: t("servicePricing.detailedFields.biweeklyMonthlyRecurring"),
          value: freqMeta.biweekly?.monthlyRecurringMultiplier ?? 0,
          path: ["frequencyMetadata", "biweekly", "monthlyRecurringMultiplier"],
          unit: "×",
          description: t("servicePricing.detailedFields.biweeklyMonthlyConversionDesc"),
        },
        {
          label: t("servicePricing.detailedFields.biweeklyFirstMonthExtra"),
          value: freqMeta.biweekly?.firstMonthExtraMultiplier ?? 0,
          path: ["frequencyMetadata", "biweekly", "firstMonthExtraMultiplier"],
          unit: "×",
          description: t("servicePricing.detailedFields.biweeklyFirstMonthExtraDesc"),
        },
      ];

      categories.contractTerms = [

      ];
    }

    if (service.serviceId === "foamingDrain") {

      const standardPricing = getValue(["standardPricing"]) || {};
      categories.standardRates = [
        {
          label: t("servicePricing.detailedFields.standardDrainRate"),
          value: standardPricing.standardDrainRate ?? 0,
          path: ["standardPricing", "standardDrainRate"],
          unit: "$ per drain",
          description: t("servicePricing.detailedFields.standardDrainRateDesc"),
        },
        {
          label: t("servicePricing.detailedFields.alternateBaseCharge"),
          value: standardPricing.alternateBaseCharge ?? 0,
          path: ["standardPricing", "alternateBaseCharge"],
          unit: "$",
          description: t("servicePricing.detailedFields.alternateBaseChargeDesc"),
        },
        {
          label: t("servicePricing.detailedFields.alternateExtraPerDrain"),
          value: standardPricing.alternateExtraPerDrain ?? 0,
          path: ["standardPricing", "alternateExtraPerDrain"],
          unit: "$ per drain",
          description: t("servicePricing.detailedFields.alternateExtraPerDrainDesc"),
        },
        {
          label: t("servicePricing.detailedFields.minimumChargePerVisit"),
          value: getValue(["minimumChargePerVisit"]) ?? 0,
          path: ["minimumChargePerVisit"],
          unit: "$",
          description: t("servicePricing.detailedFields.drainMinimumChargePerVisitDesc"),
        },
      ];

      const volPricing = getValue(["volumePricing"]) || {};
      categories.volumePricing = [
        {
          label: t("servicePricing.detailedFields.minimumDrains"),
          value: volPricing.minimumDrains ?? 0,
          path: ["volumePricing", "minimumDrains"],
          unit: "drains",
          description: t("servicePricing.detailedFields.minimumDrainsDesc"),
        },
        {
          label: t("servicePricing.detailedFields.weeklyRatePerDrain"),
          value: volPricing.weeklyRatePerDrain ?? 0,
          path: ["volumePricing", "weeklyRatePerDrain"],
          unit: "$ per drain",
          description: t("servicePricing.detailedFields.weeklyRatePerDrainVolumeDesc"),
        },
        {
          label: t("servicePricing.detailedFields.bimonthlyRatePerDrain"),
          value: volPricing.bimonthlyRatePerDrain ?? 0,
          path: ["volumePricing", "bimonthlyRatePerDrain"],
          unit: "$ per drain",
          description: t("servicePricing.detailedFields.bimonthlyRatePerDrainDesc"),
        },
      ];

      const grease = getValue(["greaseTrapPricing"]) || {};
      categories.greaseTrap = [
        {
          label: t("servicePricing.detailedFields.weeklyRatePerTrap"),
          value: grease.weeklyRatePerTrap ?? 0,
          path: ["greaseTrapPricing", "weeklyRatePerTrap"],
          unit: "$ per trap",
          description: t("servicePricing.detailedFields.weeklyRatePerTrapDesc"),
        },
        {
          label: t("servicePricing.detailedFields.installPerTrap"),
          value: grease.installPerTrap ?? 0,
          path: ["greaseTrapPricing", "installPerTrap"],
          unit: "$",
          description: t("servicePricing.detailedFields.installPerTrapDesc"),
        },
      ];

      const green = getValue(["greenDrainPricing"]) || {};
      categories.greenDrain = [
        {
          label: t("servicePricing.detailedFields.installPerDrain"),
          value: green.installPerDrain ?? 0,
          path: ["greenDrainPricing", "installPerDrain"],
          unit: "$",
          description: t("servicePricing.detailedFields.installPerDrainDesc"),
        },
        {
          label: t("servicePricing.detailedFields.weeklyRatePerDrain"),
          value: green.weeklyRatePerDrain ?? 0,
          path: ["greenDrainPricing", "weeklyRatePerDrain"],
          unit: "$ per drain",
          description: t("servicePricing.detailedFields.greenWeeklyRatePerDrainDesc"),
        },
      ];

      const addOns = getValue(["addOns"]) || {};
      const installMults = getValue(["installationMultipliers"]) || {};
      categories.addonsMultipliers = [
        {
          label: t("servicePricing.detailedFields.plumbingWeeklyAddonPerDrain"),
          value: addOns.plumbingWeeklyAddonPerDrain ?? 0,
          path: ["addOns", "plumbingWeeklyAddonPerDrain"],
          unit: "$ per drain",
          description: t("servicePricing.detailedFields.plumbingWeeklyAddonPerDrainDesc"),
        },
        {
          label: t("servicePricing.detailedFields.filthyMultiplier"),
          value: installMults.filthyMultiplier ?? 0,
          path: ["installationMultipliers", "filthyMultiplier"],
          unit: "×",
          description: t("servicePricing.detailedFields.filthyMultiplierDesc"),
        },
      ];

      const tripChargesData = getValue(["tripCharges"]) || {};
      categories.tripCharges = [

      ];

      const freqMeta = getValue(["frequencyMetadata"]) || {};
      categories.billingConversions = [
        {
          label: t("servicePricing.detailedFields.weeklyMonthlyRecurring"),
          value: freqMeta.weekly?.monthlyRecurringMultiplier ?? 0,
          path: ["frequencyMetadata", "weekly", "monthlyRecurringMultiplier"],
          unit: "×",
          description: t("servicePricing.detailedFields.weeklyMonthlyRecurringDesc"),
        },
        {
          label: t("servicePricing.detailedFields.weeklyFirstMonthExtra"),
          value: freqMeta.weekly?.firstMonthExtraMultiplier ?? 0,
          path: ["frequencyMetadata", "weekly", "firstMonthExtraMultiplier"],
          unit: "×",
          description: t("servicePricing.detailedFields.weeklyFirstMonthExtraDesc"),
        },
        {
          label: t("servicePricing.detailedFields.biweeklyMonthlyRecurring"),
          value: freqMeta.biweekly?.monthlyRecurringMultiplier ?? 0,
          path: ["frequencyMetadata", "biweekly", "monthlyRecurringMultiplier"],
          unit: "×",
          description: t("servicePricing.detailedFields.biweeklyMonthlyRecurringDesc"),
        },
        {
          label: t("servicePricing.detailedFields.biweeklyFirstMonthExtra"),
          value: freqMeta.biweekly?.firstMonthExtraMultiplier ?? 0,
          path: ["frequencyMetadata", "biweekly", "firstMonthExtraMultiplier"],
          unit: "×",
          description: t("servicePricing.detailedFields.biweeklyFirstMonthExtraDesc"),
        },

      ];

      const contract = getValue(["contract"]) || {};
      categories.contractTerms = [

      ];
    }

    if (service.serviceId === "microfiberMopping") {

      const bathroomPricing = getValue(["bathroomMoppingPricing"]) || {};
      categories.basicRates = [
        {
          label: t("servicePricing.detailedFields.flatPricePerBathroom"),
          value: bathroomPricing.flatPricePerBathroom ?? 0,
          path: ["bathroomMoppingPricing", "flatPricePerBathroom"],
          unit: "$ per bathroom",
          description: t("servicePricing.detailedFields.flatPricePerBathroomDesc"),
        },
        {
          label: t("servicePricing.detailedFields.minimumChargePerVisit"),
          value: getValue(["minimumChargePerVisit"]) ?? 0,
          path: ["minimumChargePerVisit"],
          unit: "$",
          description: t("servicePricing.detailedFields.moppingMinimumChargePerVisitDesc"),
        },
      ];

      categories.hugeBathrooms = [
        {
          label: t("servicePricing.detailedFields.hugeBathroomSqFtUnit"),
          value: bathroomPricing.hugeBathroomSqFtUnit ?? 0,
          path: ["bathroomMoppingPricing", "hugeBathroomSqFtUnit"],
          unit: "sq ft",
          description: t("servicePricing.detailedFields.hugeBathroomSqFtUnitDesc"),
        },
        {
          label: t("servicePricing.detailedFields.hugeBathroomRate"),
          value: bathroomPricing.hugeBathroomRate ?? 0,
          path: ["bathroomMoppingPricing", "hugeBathroomRate"],
          unit: "$ per unit",
          description: t("servicePricing.detailedFields.hugeBathroomRateDesc"),
        },
      ];

      const extraArea = getValue(["nonBathroomAddonAreas"]) || {};
      categories.extraAreas = [
        {
          label: t("servicePricing.detailedFields.flatPriceSingleLargeArea"),
          value: extraArea.flatPriceSingleLargeArea ?? 0,
          path: ["nonBathroomAddonAreas", "flatPriceSingleLargeArea"],
          unit: "$",
          description: t("servicePricing.detailedFields.flatPriceSingleLargeAreaDesc"),
        },
        {
          label: t("servicePricing.detailedFields.sqFtUnit"),
          value: extraArea.sqFtUnit ?? 0,
          path: ["nonBathroomAddonAreas", "sqFtUnit"],
          unit: "sq ft",
          description: t("servicePricing.detailedFields.extraAreaSqFtUnitDesc"),
        },
        {
          label: t("servicePricing.detailedFields.ratePerSqFtUnit"),
          value: extraArea.ratePerSqFtUnit ?? 0,
          path: ["nonBathroomAddonAreas", "ratePerSqFtUnit"],
          unit: "$ per unit",
          description: t("servicePricing.detailedFields.ratePerSqFtUnitDesc"),
        },
        {
          label: t("servicePricing.detailedFields.useHigherRate"),
          value: extraArea.useHigherRate ? 1 : 0,
          path: ["nonBathroomAddonAreas", "useHigherRate"],
          unit: "boolean",
          description: t("servicePricing.detailedFields.useHigherRateDesc"),
        },
      ];

      const standalone = getValue(["standaloneMoppingPricing"]) || {};
      const tripCharges = getValue(["tripCharges"]) || {};
      categories.standalonePricing = [
        {
          label: t("servicePricing.detailedFields.sqFtUnit"),
          value: standalone.sqFtUnit ?? 0,
          path: ["standaloneMoppingPricing", "sqFtUnit"],
          unit: "sq ft",
          description: t("servicePricing.detailedFields.standaloneSqFtUnitDesc"),
        },
        {
          label: t("servicePricing.detailedFields.ratePerSqFtUnit"),
          value: standalone.ratePerSqFtUnit ?? 0,
          path: ["standaloneMoppingPricing", "ratePerSqFtUnit"],
          unit: "$ per unit",
          description: t("servicePricing.detailedFields.standaloneRatePerSqFtUnitDesc"),
        },
        {
          label: t("servicePricing.detailedFields.minimumPrice"),
          value: standalone.minimumPrice ?? 0,
          path: ["standaloneMoppingPricing", "minimumPrice"],
          unit: "$",
          description: t("servicePricing.detailedFields.standaloneMinimumPriceDesc"),
        },
        {
          label: t("servicePricing.detailedFields.includeTripCharge"),
          value: standalone.includeTripCharge ? 1 : 0,
          path: ["standaloneMoppingPricing", "includeTripCharge"],
          unit: "boolean",
          description: t("servicePricing.detailedFields.includeTripChargeDesc"),
        },
        {
          label: t("servicePricing.detailedFields.standardTripCharge"),
          value: tripCharges.standard ?? 0,
          path: ["tripCharges", "standard"],
          unit: "$",
          description: t("servicePricing.detailedFields.standardTripChargeAmountDesc"),
        },
        {
          label: t("servicePricing.detailedFields.beltwayTripCharge"),
          value: tripCharges.beltway ?? 0,
          path: ["tripCharges", "beltway"],
          unit: "$",
          description: t("servicePricing.detailedFields.beltwayTripChargeAmountDesc"),
        },
      ];

      const freqMeta = getValue(["frequencyMetadata"]) || {};
      categories.moppingMetadata = [
        {
          label: t("servicePricing.detailedFields.weeklyMonthlyRecurring"),
          value: freqMeta.weekly?.monthlyRecurringMultiplier ?? 0,
          path: ["frequencyMetadata", "weekly", "monthlyRecurringMultiplier"],
          unit: "×",
          description: t("servicePricing.detailedFields.weeklyMonthlyRecurringDesc"),
        },
        {
          label: t("servicePricing.detailedFields.weeklyFirstMonthExtra"),
          value: freqMeta.weekly?.firstMonthExtraMultiplier ?? 0,
          path: ["frequencyMetadata", "weekly", "firstMonthExtraMultiplier"],
          unit: "×",
          description: t("servicePricing.detailedFields.weeklyFirstMonthExtraDesc"),
        },
        {
          label: t("servicePricing.detailedFields.biweeklyMonthlyRecurring"),
          value: freqMeta.biweekly?.monthlyRecurringMultiplier ?? 0,
          path: ["frequencyMetadata", "biweekly", "monthlyRecurringMultiplier"],
          unit: "×",
          description: t("servicePricing.detailedFields.biweeklyMonthlyRecurringDesc"),
        },
        {
          label: t("servicePricing.detailedFields.biweeklyFirstMonthExtra"),
          value: freqMeta.biweekly?.firstMonthExtraMultiplier ?? 0,
          path: ["frequencyMetadata", "biweekly", "firstMonthExtraMultiplier"],
          unit: "×",
          description: t("servicePricing.detailedFields.biweeklyFirstMonthExtraDesc"),
        },
      ];

      categories.contractTerms = [

      ];
    }

    if (service.serviceId === "pureJanitorial") {

      const pr = getValue(["productionRates"]) || {};
      categories.janProductionRates = Object.entries(pr).map(([k, v]) => ({
        label: k.charAt(0).toUpperCase() + k.slice(1).replace(/([A-Z])/g, ' $1'),
        value: Number(v),
        path: ["productionRates", k],
        unit: "sq ft/hr",
        description: t("servicePricing.detailedFields.janProductionRateDesc", { name: k.replace(/([A-Z])/g, ' $1').toLowerCase() }),
      }));

      categories.janLaborDefaults = [
        {
          label: t("servicePricing.detailedFields.costPerLaborHour"),
          value: getValue(["costPerHour"]) ?? 20,
          path: ["costPerHour"],
          unit: "$/hr",
          description: t("servicePricing.detailedFields.costPerLaborHourDesc"),
        },
        {
          label: t("servicePricing.detailedFields.laborTaxPct"),
          value: getValue(["laborTaxPct"]) ?? 15,
          path: ["laborTaxPct"],
          unit: "%",
          description: t("servicePricing.detailedFields.laborTaxPctDesc"),
        },
        {
          label: t("servicePricing.detailedFields.grossProfitPct"),
          value: getValue(["grossProfitPct"]) ?? 33,
          path: ["grossProfitPct"],
          unit: "%",
          description: t("servicePricing.detailedFields.grossProfitPctDesc"),
        },
      ];

      const ds = getValue(["defaultSupplies"]) || {};
      categories.janSupplyDefaults = [
        { label: t("servicePricing.detailedFields.supplyVacuums"),          value: ds.vacuums          ?? 100, path: ["defaultSupplies", "vacuums"],          unit: "$/yr", description: t("servicePricing.detailedFields.supplyVacuumsDesc") },
        { label: t("servicePricing.detailedFields.supplyMops"),             value: ds.mops             ?? 500, path: ["defaultSupplies", "mops"],             unit: "$/yr", description: t("servicePricing.detailedFields.supplyMopsDesc") },
        { label: t("servicePricing.detailedFields.supplyMopBuckets"),       value: ds.mopBuckets       ?? 200, path: ["defaultSupplies", "mopBuckets"],       unit: "$/yr", description: t("servicePricing.detailedFields.supplyMopBucketsDesc") },
        { label: t("servicePricing.detailedFields.supplyDustMops"),         value: ds.dustMops         ?? 300, path: ["defaultSupplies", "dustMops"],         unit: "$/yr", description: t("servicePricing.detailedFields.supplyDustMopsDesc") },
        { label: t("servicePricing.detailedFields.supplyMicrofiber"),       value: ds.microfiber       ?? 0,   path: ["defaultSupplies", "microfiber"],       unit: "$/yr", description: t("servicePricing.detailedFields.supplyMicrofiberDesc") },
        { label: t("servicePricing.detailedFields.supplyCleaningProducts"), value: ds.cleaningProducts ?? 0,   path: ["defaultSupplies", "cleaningProducts"], unit: "$/yr", description: t("servicePricing.detailedFields.supplyCleaningProductsDesc") },
        { label: t("servicePricing.detailedFields.supplyConsumables"),      value: ds.consumables      ?? 0,   path: ["defaultSupplies", "consumables"],      unit: "$/yr", description: t("servicePricing.detailedFields.supplyConsumablesDesc") },
        { label: t("servicePricing.detailedFields.supplyMiscellaneous"),    value: ds.miscellaneous    ?? 0,   path: ["defaultSupplies", "miscellaneous"],    unit: "$/yr", description: t("servicePricing.detailedFields.supplyMiscellaneousDesc") },
      ];
    }

    if (service.serviceId === "saniclean") {

      const insideBeltway = getValue(["standardALaCartePricing", "insideBeltway"]) || {};
      categories.insideBeltway = [
        {
          label: t("servicePricing.detailedFields.pricePerFixture"),
          value: insideBeltway.pricePerFixture ?? 0,
          path: ["standardALaCartePricing", "insideBeltway", "pricePerFixture"],
          unit: "$ per fixture",
          description: t("servicePricing.detailedFields.insidePricePerFixtureDesc"),
        },
        {
          label: t("servicePricing.detailedFields.minimumPrice"),
          value: insideBeltway.minimumPrice ?? 0,
          path: ["standardALaCartePricing", "insideBeltway", "minimumPrice"],
          unit: "$",
          description: t("servicePricing.detailedFields.insideMinimumPriceDesc"),
        },
        {
          label: t("servicePricing.detailedFields.tripCharge"),
          value: insideBeltway.tripCharge ?? 0,
          path: ["standardALaCartePricing", "insideBeltway", "tripCharge"],
          unit: "$",
          description: t("servicePricing.detailedFields.insideTripChargeDesc"),
        },
        {
          label: t("servicePricing.detailedFields.parkingFeeAddOn"),
          value: insideBeltway.parkingFeeAddOn ?? 0,
          path: ["standardALaCartePricing", "insideBeltway", "parkingFeeAddOn"],
          unit: "$",
          description: t("servicePricing.detailedFields.parkingFeeAddOnDesc"),
        },
      ];

      const outsideBeltway = getValue(["standardALaCartePricing", "outsideBeltway"]) || {};
      categories.outsideBeltway = [
        {
          label: t("servicePricing.detailedFields.pricePerFixture"),
          value: outsideBeltway.pricePerFixture ?? 0,
          path: ["standardALaCartePricing", "outsideBeltway", "pricePerFixture"],
          unit: "$ per fixture",
          description: t("servicePricing.detailedFields.outsidePricePerFixtureDesc"),
        },
        {
          label: t("servicePricing.detailedFields.tripCharge"),
          value: outsideBeltway.tripCharge ?? 0,
          path: ["standardALaCartePricing", "outsideBeltway", "tripCharge"],
          unit: "$",
          description: t("servicePricing.detailedFields.outsideTripChargeDesc"),
        },
      ];

      const allInclusive = getValue(["allInclusivePricing"]) || {};
      categories.allInclusive = [
        {
          label: t("servicePricing.detailedFields.pricePerFixture"),
          value: allInclusive.pricePerFixture ?? 0,
          path: ["allInclusivePricing", "pricePerFixture"],
          unit: "$ per fixture",
          description: t("servicePricing.detailedFields.allInclusivePricePerFixtureDesc"),
        },
        {
          label: t("servicePricing.detailedFields.autoAllInclusiveMinFixtures"),
          value: allInclusive.autoAllInclusiveMinFixtures ?? 0,
          path: ["allInclusivePricing", "autoAllInclusiveMinFixtures"],
          unit: "fixtures",
          description: t("servicePricing.detailedFields.autoAllInclusiveMinFixturesDesc"),
        },
      ];

      const smallBathroom = getValue(["smallBathroomMinimums"]) || {};
      categories.smallFacility = [
        {
          label: t("servicePricing.detailedFields.minimumFixturesThreshold"),
          value: smallBathroom.minimumFixturesThreshold ?? 0,
          path: ["smallBathroomMinimums", "minimumFixturesThreshold"],
          unit: "fixtures",
          description: t("servicePricing.detailedFields.minimumFixturesThresholdDesc"),
        },
        {
          label: t("servicePricing.detailedFields.minimumPriceUnderThreshold"),
          value: smallBathroom.minimumPriceUnderThreshold ?? 0,
          path: ["smallBathroomMinimums", "minimumPriceUnderThreshold"],
          unit: "$",
          description: t("servicePricing.detailedFields.minimumPriceUnderThresholdDesc"),
        },
      ];

      const soapUpgrades = getValue(["soapUpgrades"]) || {};
      const excessCharges = soapUpgrades.excessUsageCharges || {};
      categories.soapUpgrades = [
        {
          label: t("servicePricing.detailedFields.standardToLuxuryPerDispenserPerWeek"),
          value: soapUpgrades.standardToLuxuryPerDispenserPerWeek ?? 0,
          path: ["soapUpgrades", "standardToLuxuryPerDispenserPerWeek"],
          unit: "$ per dispenser per week",
          description: t("servicePricing.detailedFields.standardToLuxuryPerDispenserPerWeekDesc"),
        },
        {
          label: t("servicePricing.detailedFields.excessStandardSoapPerGallon"),
          value: excessCharges.standardSoapPerGallon ?? 0,
          path: ["soapUpgrades", "excessUsageCharges", "standardSoapPerGallon"],
          unit: "$ per gallon",
          description: t("servicePricing.detailedFields.excessStandardSoapPerGallonDesc"),
        },
        {
          label: t("servicePricing.detailedFields.excessLuxurySoapPerGallon"),
          value: excessCharges.luxurySoapPerGallon ?? 0,
          path: ["soapUpgrades", "excessUsageCharges", "luxurySoapPerGallon"],
          unit: "$ per gallon",
          description: t("servicePricing.detailedFields.excessLuxurySoapPerGallonDesc"),
        },
      ];

      const warrantyFees = getValue(["warrantyFees"]) || {};
      const paperCredit = getValue(["paperCredit"]) || {};
      categories.warrantyCredits = [
        {
          label: t("servicePricing.detailedFields.airFreshenerDispenserWarrantyFeePerWeek"),
          value: warrantyFees.airFreshenerDispenserWarrantyFeePerWeek ?? 0,
          path: ["warrantyFees", "airFreshenerDispenserWarrantyFeePerWeek"],
          unit: "$ per week",
          description: t("servicePricing.detailedFields.airFreshenerDispenserWarrantyFeePerWeekDesc"),
        },
        {
          label: t("servicePricing.detailedFields.soapDispenserWarrantyFeePerWeek"),
          value: warrantyFees.soapDispenserWarrantyFeePerWeek ?? 0,
          path: ["warrantyFees", "soapDispenserWarrantyFeePerWeek"],
          unit: "$ per week",
          description: t("servicePricing.detailedFields.soapDispenserWarrantyFeePerWeekDesc"),
        },
        {
          label: t("servicePricing.detailedFields.paperCreditPerFixturePerWeek"),
          value: paperCredit.creditPerFixturePerWeek ?? 0,
          path: ["paperCredit", "creditPerFixturePerWeek"],
          unit: "$",
          description: t("servicePricing.detailedFields.paperCreditPerFixturePerWeekDesc"),
        },
      ];

      const freqMetadata = getValue(["frequencyMetadata"]) || {};
      categories.sanicleanBillingConversions = [
        {
          label: t("servicePricing.detailedFields.weeklyMonthlyRecurring"),
          value: freqMetadata.weekly?.monthlyRecurringMultiplier ?? 0,
          path: ["frequencyMetadata", "weekly", "monthlyRecurringMultiplier"],
          unit: "×",
          description: t("servicePricing.detailedFields.weeklyMonthlyRecurringByThisDesc"),
        },
        {
          label: t("servicePricing.detailedFields.weeklyFirstMonthExtra"),
          value: freqMetadata.weekly?.firstMonthExtraMultiplier ?? 0,
          path: ["frequencyMetadata", "weekly", "firstMonthExtraMultiplier"],
          unit: "×",
          description: t("servicePricing.detailedFields.weeklyFirstMonthExtraDesc"),
        },
        {
          label: t("servicePricing.detailedFields.biweeklyMonthlyRecurring"),
          value: freqMetadata.biweekly?.monthlyRecurringMultiplier ?? 0,
          path: ["frequencyMetadata", "biweekly", "monthlyRecurringMultiplier"],
          unit: "×",
          description: t("servicePricing.detailedFields.biweeklyMonthlyRecurringDesc"),
        },
        {
          label: t("servicePricing.detailedFields.biweeklyFirstMonthExtra"),
          value: freqMetadata.biweekly?.firstMonthExtraMultiplier ?? 0,
          path: ["frequencyMetadata", "biweekly", "firstMonthExtraMultiplier"],
          unit: "×",
          description: t("servicePricing.detailedFields.biweeklyFirstMonthExtraDesc"),
        },

      ];

      const rateCategories = getValue(["rateCategories"]) || {};
      categories.sanicleanRateTiers = [
        {
          label: t("servicePricing.detailedFields.redRateMultiplier"),
          value: rateCategories.redRate?.multiplier ?? 0,
          path: ["rateCategories", "redRate", "multiplier"],
          unit: "×",
          description: t("servicePricing.detailedFields.redRateMultiplierDesc"),
        },
        {
          label: t("servicePricing.detailedFields.redRateCommission"),
          value: parseFloat(rateCategories.redRate?.commissionRate?.replace('%', '') || '0'),
          path: ["rateCategories", "redRate", "commissionRate"],
          unit: "%",
          description: t("servicePricing.detailedFields.redRateCommissionDesc"),
        },
        {
          label: t("servicePricing.detailedFields.greenRateMultiplier"),
          value: rateCategories.greenRate?.multiplier ?? 0,
          path: ["rateCategories", "greenRate", "multiplier"],
          unit: "×",
          description: t("servicePricing.detailedFields.greenRateMultiplierDesc"),
        },
        {
          label: t("servicePricing.detailedFields.greenRateCommission"),
          value: parseFloat(rateCategories.greenRate?.commissionRate?.replace('%', '') || '0'),
          path: ["rateCategories", "greenRate", "commissionRate"],
          unit: "%",
          description: t("servicePricing.detailedFields.greenRateCommissionDesc"),
        },
      ];

      const includedItemsData = getValue(["includedItems"]) || {};
      categories.includedItems = [
        {
          label: t("servicePricing.detailedFields.electrostaticSprayIncluded"),
          value: includedItemsData.electrostaticSprayIncluded ? 1 : 0,
          path: ["includedItems", "electrostaticSprayIncluded"],
          unit: "boolean",
          description: t("servicePricing.detailedFields.electrostaticSprayIncludedDesc"),
        },
        {
          label: t("servicePricing.detailedFields.includedWeeklyRefillsDefault"),
          value: includedItemsData.includedWeeklyRefillsDefault ?? 0,
          path: ["includedItems", "includedWeeklyRefillsDefault"],
          unit: "refills",
          description: t("servicePricing.detailedFields.includedWeeklyRefillsDefaultDesc"),
        },
      ];

      const monthlyAddOns = getValue(["monthlyAddOnSupplyPricing"]) || {};
      categories.monthlyAddOns = [
        {
          label: t("servicePricing.detailedFields.urinalMatMonthlyPrice"),
          value: monthlyAddOns.urinalMatMonthlyPrice ?? 0,
          path: ["monthlyAddOnSupplyPricing", "urinalMatMonthlyPrice"],
          unit: "$ per month",
          description: t("servicePricing.detailedFields.urinalMatMonthlyPriceDesc"),
        },
        {
          label: t("servicePricing.detailedFields.urinalScreenMonthlyPrice"),
          value: monthlyAddOns.urinalScreenMonthlyPrice === "included" ? 0 : (monthlyAddOns.urinalScreenMonthlyPrice ?? 0),
          path: ["monthlyAddOnSupplyPricing", "urinalScreenMonthlyPrice"],
          unit: monthlyAddOns.urinalScreenMonthlyPrice === "included" ? "included" : "$ per month",
          description: t("servicePricing.detailedFields.urinalScreenMonthlyPriceDesc"),
        },
        {
          label: t("servicePricing.detailedFields.toiletClipMonthlyPrice"),
          value: monthlyAddOns.toiletClipMonthlyPrice ?? 0,
          path: ["monthlyAddOnSupplyPricing", "toiletClipMonthlyPrice"],
          unit: "$ per month",
          description: t("servicePricing.detailedFields.toiletClipMonthlyPriceDesc"),
        },
        {
          label: t("servicePricing.detailedFields.toiletSeatCoverDispenserMonthlyPrice"),
          value: monthlyAddOns.toiletSeatCoverDispenserMonthlyPrice === "included" ? 0 : (monthlyAddOns.toiletSeatCoverDispenserMonthlyPrice ?? 0),
          path: ["monthlyAddOnSupplyPricing", "toiletSeatCoverDispenserMonthlyPrice"],
          unit: monthlyAddOns.toiletSeatCoverDispenserMonthlyPrice === "included" ? "included" : "$ per month",
          description: t("servicePricing.detailedFields.toiletSeatCoverDispenserMonthlyPriceDesc"),
        },
        {
          label: t("servicePricing.detailedFields.sanipodMonthlyPricePerPod"),
          value: monthlyAddOns.sanipodMonthlyPricePerPod ?? 0,
          path: ["monthlyAddOnSupplyPricing", "sanipodMonthlyPricePerPod"],
          unit: "$ per month",
          description: t("servicePricing.detailedFields.sanipodMonthlyPricePerPodDesc"),
        },
      ];

      const microfiberMopping = getValue(["microfiberMoppingIncludedWithSaniClean"]) || {};
      categories.microfiberMoppingAddon = [
        {
          label: t("servicePricing.detailedFields.pricePerBathroom"),
          value: microfiberMopping.pricePerBathroom ?? 0,
          path: ["microfiberMoppingIncludedWithSaniClean", "pricePerBathroom"],
          unit: "$ per bathroom",
          description: t("servicePricing.detailedFields.microfiberPricePerBathroomDesc"),
        },
        {
          label: t("servicePricing.detailedFields.hugeBathroomSqFtUnit"),
          value: microfiberMopping.hugeBathroomSqFtUnit ?? 0,
          path: ["microfiberMoppingIncludedWithSaniClean", "hugeBathroomSqFtUnit"],
          unit: "sq ft",
          description: t("servicePricing.detailedFields.hugeBathroomSqFtUnitDesc"),
        },
        {
          label: t("servicePricing.detailedFields.hugeBathroomRate"),
          value: microfiberMopping.hugeBathroomRate ?? 0,
          path: ["microfiberMoppingIncludedWithSaniClean", "hugeBathroomRate"],
          unit: "$ per unit",
          description: t("servicePricing.detailedFields.microfiberHugeBathroomRateDesc"),
        },
      ];

      categories.contractTerms = [

      ];
    }

    if (service.serviceId === "sanipod") {

      const corePricing = getValue(["corePricingIncludedWithSaniClean"]) || {};
      categories.podRates = [
        {
          label: t("servicePricing.detailedFields.coreWeeklyPricePerUnit"),
          value: corePricing.weeklyPricePerUnit ?? 0,
          path: ["corePricingIncludedWithSaniClean", "weeklyPricePerUnit"],
          unit: "$ per pod",
          description: t("servicePricing.detailedFields.coreWeeklyPricePerUnitDesc"),
        },
        {
          label: t("servicePricing.detailedFields.coreInstallPricePerUnit"),
          value: corePricing.installPricePerUnit ?? 0,
          path: ["corePricingIncludedWithSaniClean", "installPricePerUnit"],
          unit: "$ per pod",
          description: t("servicePricing.detailedFields.coreInstallPricePerUnitDesc"),
        },
        {
          label: t("servicePricing.detailedFields.coreIncludedWeeklyRefills"),
          value: corePricing.includedWeeklyRefills ?? 0,
          path: ["corePricingIncludedWithSaniClean", "includedWeeklyRefills"],
          unit: "refills",
          description: t("servicePricing.detailedFields.coreIncludedWeeklyRefillsDesc"),
        },
      ];

      const extraBagPricing = getValue(["extraBagPricing"]) || {};
      categories.extraBags = [
        {
          label: t("servicePricing.detailedFields.pricePerBag"),
          value: extraBagPricing.pricePerBag ?? 0,
          path: ["extraBagPricing", "pricePerBag"],
          unit: "$ per bag",
          description: t("servicePricing.detailedFields.pricePerBagDesc"),
        },
      ];

      const standalonePricing = getValue(["standalonePricingWithoutSaniClean"]) || {};
      categories.standaloneService = [
        {
          label: t("servicePricing.detailedFields.standalonePricePerUnitPerWeekA"),
          value: standalonePricing.pricePerUnitPerWeek ?? 0,
          path: ["standalonePricingWithoutSaniClean", "pricePerUnitPerWeek"],
          unit: "$ per pod",
          description: t("servicePricing.detailedFields.standalonePricePerUnitPerWeekADesc"),
        },
        {
          label: t("servicePricing.detailedFields.standaloneAlternatePricePerUnitPerWeekB"),
          value: standalonePricing.alternatePricePerUnitPerWeek ?? 0,
          path: ["standalonePricingWithoutSaniClean", "alternatePricePerUnitPerWeek"],
          unit: "$ per pod",
          description: t("servicePricing.detailedFields.standaloneAlternatePricePerUnitPerWeekBDesc"),
        },
        {
          label: t("servicePricing.detailedFields.standaloneWeeklyMinimumPrice"),
          value: standalonePricing.weeklyMinimumPrice ?? 0,
          path: ["standalonePricingWithoutSaniClean", "weeklyMinimumPrice"],
          unit: "$",
          description: t("servicePricing.detailedFields.standaloneWeeklyMinimumPriceDesc"),
        },
      ];

      categories.installation = [];

      const freqMeta = getValue(["frequencyMetadata"]) || {};
      categories.sanipodBillingConversions = [
        {
          label: t("servicePricing.detailedFields.weeklyMonthlyRecurring"),
          value: freqMeta.weekly?.monthlyRecurringMultiplier ?? 0,
          path: ["frequencyMetadata", "weekly", "monthlyRecurringMultiplier"],
          unit: "×",
          description: t("servicePricing.detailedFields.sanipodWeeklyMonthlyRecurringDesc"),
        },
        {
          label: t("servicePricing.detailedFields.weeklyFirstMonthExtra"),
          value: freqMeta.weekly?.firstMonthExtraMultiplier ?? 0,
          path: ["frequencyMetadata", "weekly", "firstMonthExtraMultiplier"],
          unit: "×",
          description: t("servicePricing.detailedFields.weeklyFirstMonthExtraDesc"),
        },
        {
          label: t("servicePricing.detailedFields.biweeklyMonthlyRecurring"),
          value: freqMeta.biweekly?.monthlyRecurringMultiplier ?? 0,
          path: ["frequencyMetadata", "biweekly", "monthlyRecurringMultiplier"],
          unit: "×",
          description: t("servicePricing.detailedFields.sanipodBiweeklyMonthlyRecurringDesc"),
        },
        {
          label: t("servicePricing.detailedFields.biweeklyFirstMonthExtra"),
          value: freqMeta.biweekly?.firstMonthExtraMultiplier ?? 0,
          path: ["frequencyMetadata", "biweekly", "firstMonthExtraMultiplier"],
          unit: "×",
          description: t("servicePricing.detailedFields.biweeklyFirstMonthExtraDesc"),
        },
      ];

      categories.sanipodContractTerms = [

      ];

      const rateCategories = getValue(["rateCategories"]) || {};
      categories.sanipodRateTiers = [

      ];
    }

    if (service.serviceId === "saniscrub") {

      const monthlyPricing = getValue(["monthlyPricing"]) || {};
      categories.fixtureRates = [
        {
          label: t("servicePricing.detailedFields.monthlyPricePerFixture"),
          value: monthlyPricing.pricePerFixture ?? 0,
          path: ["monthlyPricing", "pricePerFixture"],
          unit: "$ per fixture",
          description: t("servicePricing.detailedFields.monthlyPricePerFixtureDesc"),
        },
        {
          label: t("servicePricing.detailedFields.monthlyMinimumPrice"),
          value: monthlyPricing.minimumPrice ?? 0,
          path: ["monthlyPricing", "minimumPrice"],
          unit: "$",
          description: t("servicePricing.detailedFields.monthlyMinimumPriceDesc"),
        },
      ];

      const bimonthlyPricing = getValue(["bimonthlyPricing"]) || {};
      const quarterlyPricing = getValue(["quarterlyPricing"]) || {};
      const twicePerMonthPricing = getValue(["twicePerMonthPricing"]) || {};
      categories.saniscrubMinimums = [
        {
          label: t("servicePricing.detailedFields.bimonthlyPricePerFixture"),
          value: bimonthlyPricing.pricePerFixture ?? 0,
          path: ["bimonthlyPricing", "pricePerFixture"],
          unit: "$ per fixture",
          description: t("servicePricing.detailedFields.bimonthlyPricePerFixtureDesc"),
        },
        {
          label: t("servicePricing.detailedFields.bimonthlyMinimumPrice"),
          value: bimonthlyPricing.minimumPrice ?? 0,
          path: ["bimonthlyPricing", "minimumPrice"],
          unit: "$",
          description: t("servicePricing.detailedFields.bimonthlyMinimumPriceDesc"),
        },
        {
          label: t("servicePricing.detailedFields.quarterlyPricePerFixture"),
          value: quarterlyPricing.pricePerFixture ?? 0,
          path: ["quarterlyPricing", "pricePerFixture"],
          unit: "$ per fixture",
          description: t("servicePricing.detailedFields.quarterlyPricePerFixtureDesc"),
        },
        {
          label: t("servicePricing.detailedFields.quarterlyMinimumPrice"),
          value: quarterlyPricing.minimumPrice ?? 0,
          path: ["quarterlyPricing", "minimumPrice"],
          unit: "$",
          description: t("servicePricing.detailedFields.quarterlyMinimumPriceDesc"),
        },
        {
          label: t("servicePricing.detailedFields.twicePerMonthDiscount"),
          value: twicePerMonthPricing.discountFromMonthlyRate ?? 0,
          path: ["twicePerMonthPricing", "discountFromMonthlyRate"],
          unit: "$",
          description: t("servicePricing.detailedFields.twicePerMonthDiscountDesc"),
        },
      ];

      const nonBathroomRule = getValue(["nonBathroomSqFtPricingRule"]) || {};
      categories.nonBathroomPricing = [
        {
          label: t("servicePricing.detailedFields.sqFtBlockUnit"),
          value: nonBathroomRule.sqFtBlockUnit ?? 0,
          path: ["nonBathroomSqFtPricingRule", "sqFtBlockUnit"],
          unit: "sq ft",
          description: t("servicePricing.detailedFields.sqFtBlockUnitDesc"),
        },
        {
          label: t("servicePricing.detailedFields.priceFirstBlock"),
          value: nonBathroomRule.priceFirstBlock ?? 0,
          path: ["nonBathroomSqFtPricingRule", "priceFirstBlock"],
          unit: "$",
          description: t("servicePricing.detailedFields.priceFirstBlockDesc"),
        },
        {
          label: t("servicePricing.detailedFields.priceAdditionalBlock"),
          value: nonBathroomRule.priceAdditionalBlock ?? 0,
          path: ["nonBathroomSqFtPricingRule", "priceAdditionalBlock"],
          unit: "$",
          description: t("servicePricing.detailedFields.priceAdditionalBlockDesc"),
        },
      ];

      const installPricing = getValue(["installationPricing"]) || {};
      categories.saniscrubInstallMultipliers = [
        {
          label: t("servicePricing.detailedFields.dirtyFirstTimeMultiplier"),
          value: installPricing.installMultiplierDirtyOrFirstTime ?? 0,
          path: ["installationPricing", "installMultiplierDirtyOrFirstTime"],
          unit: "×",
          description: t("servicePricing.detailedFields.dirtyFirstTimeMultiplierDesc"),
        },
      ];

      const freqMeta = getValue(["frequencyMetadata"]) || {};
      categories.serviceFrequencies = [
        {
          label: t("servicePricing.detailedFields.weeklyMonthlyRecurring"),
          value: freqMeta.weekly?.monthlyRecurringMultiplier ?? 0,
          path: ["frequencyMetadata", "weekly", "monthlyRecurringMultiplier"],
          unit: "×",
          description: t("servicePricing.detailedFields.weeklyMonthlyConversionDesc"),
        },
        {
          label: t("servicePricing.detailedFields.weeklyFirstMonthExtra"),
          value: freqMeta.weekly?.firstMonthExtraMultiplier ?? 0,
          path: ["frequencyMetadata", "weekly", "firstMonthExtraMultiplier"],
          unit: "×",
          description: t("servicePricing.detailedFields.weeklyFirstMonthExtraDesc"),
        },
        {
          label: t("servicePricing.detailedFields.biweeklyMonthlyRecurring"),
          value: freqMeta.biweekly?.monthlyRecurringMultiplier ?? 0,
          path: ["frequencyMetadata", "biweekly", "monthlyRecurringMultiplier"],
          unit: "×",
          description: t("servicePricing.detailedFields.biweeklyMonthlyConversionDesc"),
        },
        {
          label: t("servicePricing.detailedFields.biweeklyFirstMonthExtra"),
          value: freqMeta.biweekly?.firstMonthExtraMultiplier ?? 0,
          path: ["frequencyMetadata", "biweekly", "firstMonthExtraMultiplier"],
          unit: "×",
          description: t("servicePricing.detailedFields.biweeklyFirstMonthExtraDesc"),
        },

      ];

      const tripChargesData = getValue(["tripCharges"]) || {};
      categories.discountsAndFees = [

      ];

      categories.contractTerms = [

      ];
    }

    if (service.serviceId === "stripWax") {

      const standardFull = getValue(["variants", "standardFull"]) || {};
      categories.standardFull = [
        {
          label: t("servicePricing.detailedFields.ratePerSquareFoot"),
          value: standardFull.ratePerSqFt ?? 0,
          path: ["variants", "standardFull", "ratePerSqFt"],
          unit: "$ per sq ft",
          description: t("servicePricing.detailedFields.standardFullRatePerSqFtDesc"),
        },
        {
          label: t("servicePricing.detailedFields.minimumCharge"),
          value: standardFull.minCharge ?? 0,
          path: ["variants", "standardFull", "minCharge"],
          unit: "$",
          description: t("servicePricing.detailedFields.standardFullMinChargeDesc"),
        },
      ];

      const noSealant = getValue(["variants", "noSealant"]) || {};
      categories.noSealant = [
        {
          label: t("servicePricing.detailedFields.ratePerSquareFoot"),
          value: noSealant.ratePerSqFt ?? 0,
          path: ["variants", "noSealant", "ratePerSqFt"],
          unit: "$ per sq ft",
          description: t("servicePricing.detailedFields.noSealantRatePerSqFtDesc"),
        },
        {
          label: t("servicePricing.detailedFields.minimumCharge"),
          value: noSealant.minCharge ?? 0,
          path: ["variants", "noSealant", "minCharge"],
          unit: "$",
          description: t("servicePricing.detailedFields.noSealantMinChargeDesc"),
        },
      ];

      const wellMaintained = getValue(["variants", "wellMaintained"]) || {};
      categories.wellMaintained = [
        {
          label: t("servicePricing.detailedFields.ratePerSquareFoot"),
          value: wellMaintained.ratePerSqFt ?? 0,
          path: ["variants", "wellMaintained", "ratePerSqFt"],
          unit: "$ per sq ft",
          description: t("servicePricing.detailedFields.wellMaintainedRatePerSqFtDesc"),
        },
        {
          label: t("servicePricing.detailedFields.minimumCharge"),
          value: wellMaintained.minCharge ?? 0,
          path: ["variants", "wellMaintained", "minCharge"],
          unit: "$",
          description: t("servicePricing.detailedFields.wellMaintainedMinChargeDesc"),
        },
      ];

      categories.stripWaxContractTerms = [
        {
          label: t("servicePricing.detailedFields.minContractMonths"),
          value: getValue(["minContractMonths"]) ?? 0,
          path: ["minContractMonths"],
          unit: "months",
          description: t("servicePricing.detailedFields.minContractMonthsDesc"),
        },
        {
          label: t("servicePricing.detailedFields.maxContractMonths"),
          value: getValue(["maxContractMonths"]) ?? 0,
          path: ["maxContractMonths"],
          unit: "months",
          description: t("servicePricing.detailedFields.maxContractMonthsDesc"),
        },
      ];

      const freqMeta = getValue(["frequencyMetadata"]) || {};
      categories.stripWaxBillingConversions = [
        {
          label: t("servicePricing.detailedFields.weeklyMonthlyRecurring"),
          value: freqMeta.weekly?.monthlyRecurringMultiplier ?? 0,
          path: ["frequencyMetadata", "weekly", "monthlyRecurringMultiplier"],
          unit: "×",
          description: t("servicePricing.detailedFields.weeklyMonthlyRecurring433Desc"),
        },
        {
          label: t("servicePricing.detailedFields.weeklyFirstMonthExtra"),
          value: freqMeta.weekly?.firstMonthExtraMultiplier ?? 0,
          path: ["frequencyMetadata", "weekly", "firstMonthExtraMultiplier"],
          unit: "×",
          description: t("servicePricing.detailedFields.weeklyFirstMonthExtraDesc"),
        },
        {
          label: t("servicePricing.detailedFields.biweeklyMonthlyRecurring"),
          value: freqMeta.biweekly?.monthlyRecurringMultiplier ?? 0,
          path: ["frequencyMetadata", "biweekly", "monthlyRecurringMultiplier"],
          unit: "×",
          description: t("servicePricing.detailedFields.biweeklyMonthlyRecurring2165Desc"),
        },
        {
          label: t("servicePricing.detailedFields.biweeklyFirstMonthExtra"),
          value: freqMeta.biweekly?.firstMonthExtraMultiplier ?? 0,
          path: ["frequencyMetadata", "biweekly", "firstMonthExtraMultiplier"],
          unit: "×",
          description: t("servicePricing.detailedFields.biweeklyFirstMonthExtraDesc"),
        },
      ];

      const rateCategories = getValue(["rateCategories"]) || {};
      categories.stripWaxRateTiers = [

      ];
    }

    if (service.serviceId === "refreshPowerScrub") {

      categories.defaultRates = [
        {
          label: t("servicePricing.detailedFields.defaultHourlyRate"),
          value: getValue(["coreRates", "defaultHourlyRate"]) ?? 0,
          path: ["coreRates", "defaultHourlyRate"],
          unit: "$ per hour per worker",
          description: t("servicePricing.detailedFields.defaultHourlyRateDesc"),
        },
        {
          label: t("servicePricing.detailedFields.perWorkerRate"),
          value: getValue(["coreRates", "perWorkerRate"]) ?? 0,
          path: ["coreRates", "perWorkerRate"],
          unit: "$ per worker",
          description: t("servicePricing.detailedFields.perWorkerRateDesc"),
        },
        {
          label: t("servicePricing.detailedFields.perHourRate"),
          value: getValue(["coreRates", "perHourRate"]) ?? 0,
          path: ["coreRates", "perHourRate"],
          unit: "$ per hour",
          description: t("servicePricing.detailedFields.perHourRateDesc"),
        },
        {
          label: t("servicePricing.detailedFields.defaultTripCharge"),
          value: getValue(["coreRates", "tripCharge"]) ?? 0,
          path: ["coreRates", "tripCharge"],
          unit: "$",
          description: t("servicePricing.detailedFields.defaultTripChargeDesc"),
        },
        {
          label: t("servicePricing.detailedFields.defaultMinimum"),
          value: getValue(["coreRates", "minimumVisit"]) ?? 0,
          path: ["coreRates", "minimumVisit"],
          unit: "$",
          description: t("servicePricing.detailedFields.defaultMinimumDesc"),
        },
      ];

      categories.kitchenPricing = [
        {
          label: t("servicePricing.detailedFields.smallMediumKitchen"),
          value: getValue(["areaSpecificPricing", "kitchen", "smallMedium"]) ?? 0,
          path: ["areaSpecificPricing", "kitchen", "smallMedium"],
          unit: "$",
          description: t("servicePricing.detailedFields.smallMediumKitchenDesc"),
        },
        {
          label: t("servicePricing.detailedFields.largeKitchen"),
          value: getValue(["areaSpecificPricing", "kitchen", "large"]) ?? 0,
          path: ["areaSpecificPricing", "kitchen", "large"],
          unit: "$",
          description: t("servicePricing.detailedFields.largeKitchenDesc"),
        },
      ];

      categories.fohPricing = [
        {
          label: t("servicePricing.detailedFields.frontOfHouseRate"),
          value: getValue(["areaSpecificPricing", "frontOfHouse"]) ?? 0,
          path: ["areaSpecificPricing", "frontOfHouse"],
          unit: "$",
          description: t("servicePricing.detailedFields.frontOfHouseRateDesc"),
        },
      ];

      categories.patioPricing = [
        {
          label: t("servicePricing.detailedFields.patioStandalone"),
          value: getValue(["areaSpecificPricing", "patio", "standalone"]) ?? 0,
          path: ["areaSpecificPricing", "patio", "standalone"],
          unit: "$",
          description: t("servicePricing.detailedFields.patioStandaloneDesc"),
        },
        {
          label: t("servicePricing.detailedFields.patioUpsell"),
          value: getValue(["areaSpecificPricing", "patio", "upsell"]) ?? 0,
          path: ["areaSpecificPricing", "patio", "upsell"],
          unit: "$",
          description: t("servicePricing.detailedFields.patioUpsellDesc"),
        },
      ];

      categories.sqftPricing = [
        {
          label: t("servicePricing.detailedFields.fixedFee"),
          value: getValue(["squareFootagePricing", "fixedFee"]) ?? 0,
          path: ["squareFootagePricing", "fixedFee"],
          unit: "$",
          description: t("servicePricing.detailedFields.fixedFeeDesc"),
        },
        {
          label: t("servicePricing.detailedFields.insideRate"),
          value: getValue(["squareFootagePricing", "insideRate"]) ?? 0,
          path: ["squareFootagePricing", "insideRate"],
          unit: "$ per sq ft",
          description: t("servicePricing.detailedFields.insideRateDesc"),
        },
        {
          label: t("servicePricing.detailedFields.outsideRate"),
          value: getValue(["squareFootagePricing", "outsideRate"]) ?? 0,
          path: ["squareFootagePricing", "outsideRate"],
          unit: "$ per sq ft",
          description: t("servicePricing.detailedFields.outsideRateDesc"),
        },
      ];

      const freqMeta = getValue(["frequencyMetadata"]) || {};
      categories.scrubFrequencyConversions = [
        {
          label: t("servicePricing.detailedFields.weeklyMonthlyRecurring"),
          value: freqMeta.weekly?.monthlyRecurringMultiplier ?? 0,
          path: ["frequencyMetadata", "weekly", "monthlyRecurringMultiplier"],
          unit: "×",
          description: t("servicePricing.detailedFields.weeklyMonthlyRecurringDesc"),
        },
        {
          label: t("servicePricing.detailedFields.weeklyFirstMonthExtra"),
          value: freqMeta.weekly?.firstMonthExtraMultiplier ?? 0,
          path: ["frequencyMetadata", "weekly", "firstMonthExtraMultiplier"],
          unit: "×",
          description: t("servicePricing.detailedFields.weeklyFirstMonthExtraDesc"),
        },
        {
          label: t("servicePricing.detailedFields.biweeklyMonthlyRecurring"),
          value: freqMeta.biweekly?.monthlyRecurringMultiplier ?? 0,
          path: ["frequencyMetadata", "biweekly", "monthlyRecurringMultiplier"],
          unit: "×",
          description: t("servicePricing.detailedFields.biweeklyMonthlyRecurringDesc"),
        },
        {
          label: t("servicePricing.detailedFields.biweeklyFirstMonthExtra"),
          value: freqMeta.biweekly?.firstMonthExtraMultiplier ?? 0,
          path: ["frequencyMetadata", "biweekly", "firstMonthExtraMultiplier"],
          unit: "×",
          description: t("servicePricing.detailedFields.biweeklyFirstMonthExtraDesc"),
        },
      ];

      categories.contractTerms = [

      ];
    }

    return categories;
  };

  const handleEdit = (field: PricingField) => {
    setEditingField({ path: field.path, value: field.value.toString() });
  };

  const handleSave = async () => {
    if (!editingField) return;

    setSaving(true);
    try {
      await onUpdateField(editingField.path, parseFloat(editingField.value) || 0);
      setSuccessMessage(t("servicePricing.detailedView.priceUpdated"));
      setEditingField(null);
    } catch (error) {
      console.error("Error saving field:", error);
      setErrorMessage(t("servicePricing.detailedView.priceUpdateFailed"));
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditingField(null);
  };

  const handleAddPlaceType = async () => {
    const label = newPTLabel.trim();
    if (!label) return;
    
    const key = label
      .split(/\s+/)
      .map((w, i) => i === 0 ? w.charAt(0).toLowerCase() + w.slice(1) : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join('');
    setSavingNewPT(true);
    try {
      await onUpdateField(["productionRates", key], parseFloat(newPTRate) || 1000);
      setSuccessMessage(t("servicePricing.detailedView.placeTypeAdded", { label }));
      setShowNewPT(false);
      setNewPTLabel("");
      setNewPTRate("1000");
    } catch {
      setErrorMessage(t("servicePricing.detailedView.placeTypeAddFailed"));
    } finally {
      setSavingNewPT(false);
    }
  };
  const categories = getFieldsByCategory();

  const getTabs = (): { key: TabKey; label: string; icon: any }[] => {
    if (service.serviceId === "rpmWindows") {
      return [
        { key: "windowRates", label: t("servicePricing.detailedTabs.windowRates"), icon: faWindowMaximize },
        { key: "installMultipliers", label: t("servicePricing.detailedTabs.installMultiplier"), icon: faBolt },
        { key: "minimumAndTripCharges", label: t("servicePricing.detailedTabs.minimumAndTripCharges"), icon: faDollarSign },
        { key: "frequencyPriceMultipliers", label: t("servicePricing.detailedTabs.frequencyMultipliers"), icon: faTimes },
        { key: "frequencyConversions", label: t("servicePricing.detailedTabs.billingConversions"), icon: faSync },

      ];
    }

    if (service.serviceId === "carpetCleaning") {
      return [
        { key: "unitPricing", label: t("servicePricing.detailedTabs.unitPricing"), icon: faRuler },
        { key: "minimums", label: t("servicePricing.detailedTabs.minimums"), icon: faDollarSign },
        { key: "carpetInstallMultipliers", label: t("servicePricing.detailedTabs.installMultipliers"), icon: faBolt },
        { key: "frequencyMeta", label: t("servicePricing.detailedTabs.serviceFrequencies"), icon: faCalendar },

      ];
    }

    if (service.serviceId === "electrostaticSpray") {
      return [
        { key: "sprayRates", label: t("servicePricing.detailedTabs.sprayRates"), icon: faWind },
        { key: "sprayTripCharges", label: t("servicePricing.detailedTabs.tripCharges"), icon: faCar },
        { key: "sprayFrequencyConversions", label: t("servicePricing.detailedTabs.frequencyConversions"), icon: faSync },

      ];
    }

    if (service.serviceId === "foamingDrain") {
      return [
        { key: "standardRates", label: t("servicePricing.detailedTabs.standardRates"), icon: faDroplet },
        { key: "volumePricing", label: t("servicePricing.detailedTabs.volumePricing"), icon: faChartBar },
        { key: "greaseTrap", label: t("servicePricing.detailedTabs.greaseTrap"), icon: faOilCan },
        { key: "greenDrain", label: t("servicePricing.detailedTabs.greenDrain"), icon: faLeaf },
        { key: "addonsMultipliers", label: t("servicePricing.detailedTabs.addonsMultipliers"), icon: faPlus },

        { key: "billingConversions", label: t("servicePricing.detailedTabs.billingConversions"), icon: faSync },

      ];
    }

    if (service.serviceId === "microfiberMopping") {
      return [
        { key: "basicRates", label: t("servicePricing.detailedTabs.basicRates"), icon: faBroom },
        { key: "hugeBathrooms", label: t("servicePricing.detailedTabs.hugeBathrooms"), icon: faBuilding },
        { key: "extraAreas", label: t("servicePricing.detailedTabs.extraAreas"), icon: faLandmark },
        { key: "standalonePricing", label: t("servicePricing.detailedTabs.standaloneService"), icon: faStar },
        { key: "moppingMetadata", label: t("servicePricing.detailedTabs.billingConversions"), icon: faSync },

      ];
    }

    if (service.serviceId === "pureJanitorial") {
      return [
        { key: "janProductionRates", label: t("servicePricing.detailedTabs.productionRates"), icon: faRuler },
        { key: "janLaborDefaults",   label: t("servicePricing.detailedTabs.laborDefaults"),   icon: faDollarSign },
        { key: "janSupplyDefaults",  label: t("servicePricing.detailedTabs.supplyDefaults"),  icon: faBox },
      ];
    }

    if (service.serviceId === "saniclean") {
      return [
        { key: "insideBeltway", label: t("servicePricing.detailedTabs.insideBeltway"), icon: faCity },
        { key: "outsideBeltway", label: t("servicePricing.detailedTabs.outsideBeltway"), icon: faTree },
        { key: "allInclusive", label: t("servicePricing.detailedTabs.allInclusivePackage"), icon: faBox },
        { key: "smallFacility", label: t("servicePricing.detailedTabs.smallFacility"), icon: faStore },
        { key: "soapUpgrades", label: t("servicePricing.detailedTabs.soapUpgrades"), icon: faSoap },
        { key: "warrantyCredits", label: t("servicePricing.detailedTabs.warrantyCredits"), icon: faTicket },
        { key: "includedItems", label: t("servicePricing.detailedTabs.includedItems"), icon: faCheck },
        { key: "monthlyAddOns", label: t("servicePricing.detailedTabs.monthlyAddOns"), icon: faClipboard },
        { key: "microfiberMoppingAddon", label: t("servicePricing.detailedTabs.microfiberMopping"), icon: faBroom },
        { key: "sanicleanBillingConversions", label: t("servicePricing.detailedTabs.billingConversions"), icon: faSync },

      ];
    }

    if (service.serviceId === "sanipod") {
      return [
        { key: "podRates", label: t("servicePricing.detailedTabs.podRates"), icon: faTrash },
        { key: "extraBags", label: t("servicePricing.detailedTabs.extraBags"), icon: faShoppingBag },
        { key: "standaloneService", label: t("servicePricing.detailedTabs.standaloneService"), icon: faStar },

        { key: "sanipodBillingConversions", label: t("servicePricing.detailedTabs.billingConversions"), icon: faSync },

      ];
    }

    if (service.serviceId === "saniscrub") {
      return [
        { key: "fixtureRates", label: t("servicePricing.detailedTabs.fixtureRates"), icon: faShower },
        { key: "saniscrubMinimums", label: t("servicePricing.detailedTabs.minimums"), icon: faDollarSign },
        { key: "nonBathroomPricing", label: t("servicePricing.detailedTabs.nonBathroomAreas"), icon: faLandmark },
        { key: "saniscrubInstallMultipliers", label: t("servicePricing.detailedTabs.installMultipliers"), icon: faBolt },
        { key: "serviceFrequencies", label: t("servicePricing.detailedTabs.serviceFrequencies"), icon: faCalendar },
        { key: "discountsAndFees", label: t("servicePricing.detailedTabs.discountsAndFees"), icon: faTicket },

      ];
    }

    if (service.serviceId === "stripWax") {
      return [
        { key: "standardFull", label: t("servicePricing.detailedTabs.standardFull"), icon: faStar },
        { key: "noSealant", label: t("servicePricing.detailedTabs.noSealant"), icon: faDroplet },
        { key: "wellMaintained", label: t("servicePricing.detailedTabs.wellMaintained"), icon: faWandMagicSparkles },
        { key: "stripWaxContractTerms", label: t("servicePricing.detailedTabs.contractTerms"), icon: faClipboard },
        { key: "stripWaxBillingConversions", label: t("servicePricing.detailedTabs.billingConversions"), icon: faSync },

      ];
    }

    if (service.serviceId === "refreshPowerScrub") {
      return [
        { key: "defaultRates", label: t("servicePricing.detailedTabs.defaultRates"), icon: faDollarSign },
        { key: "kitchenPricing", label: t("servicePricing.detailedTabs.kitchenPricing"), icon: faUtensils },
        { key: "fohPricing", label: t("servicePricing.detailedTabs.frontOfHouse"), icon: faLandmark },
        { key: "patioPricing", label: t("servicePricing.detailedTabs.patioPricing"), icon: faLeaf },
        { key: "sqftPricing", label: t("servicePricing.detailedTabs.squareFootage"), icon: faRuler },
        { key: "scrubFrequencyConversions", label: t("servicePricing.detailedTabs.billingConversions"), icon: faSync },

      ];
    }

    return [];
  };

  const tabs = getTabs();

  return (
    <div className="spd">
      <div className="spd__header">
        <div>
          <h2 className="spd__title">{t("servicePricing.detailedView.title", { label: service.label })}</h2>
          <p className="spd__subtitle">{service.description}</p>
        </div>
        <button className="spd__close" onClick={onClose}>
          ✕ {t("servicePricing.detailedView.close")}
        </button>
      </div>

      <div className="spd__tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`spd__tab ${activeTab === tab.key ? "spd__tab--active" : ""}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <span className="spd__tab-icon"><FontAwesomeIcon icon={tab.icon} /></span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="spd__content">
        <div className="spd__fields">
          {categories[activeTab].map((field, index) => {
            const isEditing =
              editingField?.path.join(".") === field.path.join(".");

            return (
              <div key={index} className="spd__field">
                <div className="spd__field-info">
                  <div className="spd__field-label">{field.label}</div>
                  {field.description && (
                    <div className="spd__field-description">{field.description}</div>
                  )}
                </div>

                <div className="spd__field-value">
                  {isEditing ? (
                    <div className="spd__field-edit">
                      <input
                        type="number"
                        className="spd__input"
                        value={editingField.value}
                        onChange={(e) =>
                          setEditingField({ ...editingField, value: e.target.value })
                        }
                        step="0.01"
                        autoFocus
                      />
                      <span className="spd__unit">{field.unit}</span>
                      <div className="spd__actions">
                        <button
                          className="spd__btn spd__btn--save"
                          onClick={handleSave}
                          disabled={saving}
                        >
                          {saving ? t("servicePricing.detailedView.saving") : t("servicePricing.detailedView.save")}
                        </button>
                        <button
                          className="spd__btn spd__btn--cancel"
                          onClick={handleCancel}
                        >
                          {t("servicePricing.detailedView.cancel")}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="spd__field-display">
                      <span className="spd__value">
                        {field.value} {field.unit}
                      </span>
                      <button
                        className="spd__btn spd__btn--edit"
                        onClick={() => handleEdit(field)}
                      >
                        {t("servicePricing.detailedView.edit")}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {activeTab === "janProductionRates" && (
          <div style={{ padding: "12px 0 4px" }}>
            {!showNewPT ? (
              <button
                className="spd__btn spd__btn--edit"
                style={{ marginLeft: "0", display: "flex", alignItems: "center", gap: "6px", fontWeight: 700 }}
                onClick={() => setShowNewPT(true)}
              >
                + {t("servicePricing.detailedView.newPlaceType")}
              </button>
            ) : (
              <div className="spd__field" style={{ flexWrap: "wrap", gap: "8px", alignItems: "flex-start" }}>
                <div className="spd__field-info" style={{ minWidth: "160px" }}>
                  <div className="spd__field-label">{t("servicePricing.detailedView.newPlaceType")}</div>
                  <div className="spd__field-description">{t("servicePricing.detailedView.newPlaceTypeDescription")}</div>
                </div>
                <div className="spd__field-edit" style={{ flex: 1, display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
                  <input
                    type="text"
                    className="spd__input"
                    placeholder={t("servicePricing.detailedView.newPlaceTypePlaceholder")}
                    value={newPTLabel}
                    onChange={e => setNewPTLabel(e.target.value)}
                    style={{ minWidth: "140px" }}
                    autoFocus
                  />
                  <input
                    type="number"
                    className="spd__input"
                    placeholder="1000"
                    value={newPTRate}
                    onChange={e => setNewPTRate(e.target.value)}
                    min="1"
                    step="50"
                    style={{ width: "90px" }}
                  />
                  <span className="spd__unit">{t("servicePricing.detailedView.sqFtPerHr")}</span>
                  <div className="spd__actions">
                    <button
                      className="spd__btn spd__btn--save"
                      onClick={handleAddPlaceType}
                      disabled={savingNewPT || !newPTLabel.trim()}
                    >
                      {savingNewPT ? t("servicePricing.detailedView.saving") : t("servicePricing.detailedView.add")}
                    </button>
                    <button
                      className="spd__btn spd__btn--cancel"
                      onClick={() => { setShowNewPT(false); setNewPTLabel(""); setNewPTRate("1000"); }}
                    >
                      {t("servicePricing.detailedView.cancel")}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {categories[activeTab].length === 0 && !showNewPT && (
          <div className="spd__empty">
            {t("servicePricing.detailedView.emptyCategory")}
          </div>
        )}
      </div>

      {}
      {successMessage && (
        <Toast
          message={successMessage}
          type="success"
          onClose={() => setSuccessMessage(null)}
        />
      )}
      {errorMessage && (
        <Toast
          message={errorMessage}
          type="error"
          onClose={() => setErrorMessage(null)}
        />
      )}
    </div>
  );
};
