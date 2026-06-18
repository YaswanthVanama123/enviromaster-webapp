import { useMemo } from 'react';
import { useServicesContext } from '../ServicesContext';
import { getFrequencyNumber, BACKEND_TO_FREQUENCY } from './useAccountTypeDetection';
import {
  calculateCommissionableRevenue,
  formatCurrency,
} from '../../../backendservice/utils/commissionCalculatorV2';
import {
  computeGlobalCommission,
  backendFrequencyToServiceFrequency,
  getVisitsPerYearExtended,
} from '../../../shared/commission-engine/computeGlobalCommission';
import type { AccountType } from '../../../backendservice/api/accountTypeApi';

export {
  ACCOUNT_TYPE_DEDUCTIONS,
  getAgreementMultiplier,
  backendFrequencyToServiceFrequency,
  getVisitsPerYearExtended,
  computeGlobalCommission,
  computeQuotaTierPortions,
  progressiveQuotaCommissionRate,
  computeCommissionTiers,
} from '../../../shared/commission-engine/computeGlobalCommission';
export type {
  ServiceCommissionDetail,
  GlobalCommissionResult,
  QuotaTierPortion,
  CommissionTier,
} from '../../../shared/commission-engine/computeGlobalCommission';

export interface ServiceCommissionResult {

  accountType: AccountType | null;
  accountTypeLabel: string;
  confidence: 'high' | 'low' | null;
  reason: string | null;
  drivingTimeMinutes: number | null;
  nearestDestination: string | null;
  usedFallback: boolean;

  perVisitRevenue: number;
  revenueDeduction: number;
  commissionableRevenue: number;
  anchorBonus: number;

  commissionRate: number;
  perVisitCommission: number;
  weeklyCommission: number;
  annualCommission: number;

  frequencyNumber: number | null;
  frequencyLabel: string;
  visitsPerYear: number;

  formatted: {
    perVisitRevenue: string;
    revenueDeduction: string;
    commissionableRevenue: string;
    perVisitCommission: string;
    weeklyCommission: string;
    annualCommission: string;
  };

  isDetected: boolean;
  isOneTime: boolean;
}

export interface UseServiceCommissionOptions {
  serviceData: any;
  commissionRate?: number;
}

export function useServiceCommission({
  serviceData,
  commissionRate = 6,
}: UseServiceCommissionOptions): ServiceCommissionResult {
  const { accountTypeCache } = useServicesContext();

  return useMemo(() => {

    const defaultResult: ServiceCommissionResult = {
      accountType: null,
      accountTypeLabel: 'Unknown',
      confidence: null,
      reason: null,
      drivingTimeMinutes: null,
      nearestDestination: null,
      usedFallback: false,

      perVisitRevenue: 0,
      revenueDeduction: 0,
      commissionableRevenue: 0,
      anchorBonus: 0,

      commissionRate,
      perVisitCommission: 0,
      weeklyCommission: 0,
      annualCommission: 0,

      frequencyNumber: null,
      frequencyLabel: 'Unknown',
      visitsPerYear: 0,

      formatted: {
        perVisitRevenue: '$0.00',
        revenueDeduction: '$0.00',
        commissionableRevenue: '$0.00',
        perVisitCommission: '$0.00',
        weeklyCommission: '$0.00',
        annualCommission: '$0.00',
      },

      isDetected: false,
      isOneTime: false,
    };

    if (!serviceData?.isActive) {
      return defaultResult;
    }

    const freqNum = getFrequencyNumber(serviceData);
    const isOneTime = freqNum === 0;

    const perVisitRevenue =
      serviceData.perVisit ??
      serviceData.totals?.perVisit?.amount ??
      serviceData.perVisitCharge ??
      serviceData.calc?.perVisit ??
      0;

    if (isOneTime || freqNum === null) {
      const oneTimePrice =
        serviceData.totalPrice ??
        serviceData.totals?.totalPrice?.amount ??
        perVisitRevenue;

      return {
        ...defaultResult,
        perVisitRevenue: oneTimePrice,
        frequencyNumber: 0,
        frequencyLabel: 'One-Time',
        isOneTime: true,
        formatted: {
          ...defaultResult.formatted,
          perVisitRevenue: formatCurrency(oneTimePrice),
        },
      };
    }

    const cacheEntry = accountTypeCache[freqNum];
    const accountType = cacheEntry?.accountType || null;
    const frequencyLabel = BACKEND_TO_FREQUENCY[freqNum] || 'Unknown';
    const serviceFrequency = backendFrequencyToServiceFrequency(freqNum);
    const visitsPerYear = getVisitsPerYearExtended(serviceFrequency);

    if (!accountType) {
      return {
        ...defaultResult,
        perVisitRevenue,
        frequencyNumber: freqNum,
        frequencyLabel,
        visitsPerYear,
        formatted: {
          ...defaultResult.formatted,
          perVisitRevenue: formatCurrency(perVisitRevenue),
        },
      };
    }

    const { commissionableRevenue, revenueDeduction, anchorBonus } =
      calculateCommissionableRevenue(perVisitRevenue, accountType);

    const perVisitCommission = commissionableRevenue * (commissionRate / 100);
    const annualCommission = perVisitCommission * visitsPerYear;
    const weeklyCommission = annualCommission / 52;

    return {
      accountType,
      accountTypeLabel: accountType,
      confidence: cacheEntry?.confidence || null,
      reason: cacheEntry?.reason || null,
      drivingTimeMinutes: cacheEntry?.drivingTimeMinutes || null,
      nearestDestination: cacheEntry?.nearestDestination || null,
      usedFallback: cacheEntry?.usedFallback || false,

      perVisitRevenue,
      revenueDeduction,
      commissionableRevenue,
      anchorBonus,

      commissionRate,
      perVisitCommission,
      weeklyCommission,
      annualCommission,

      frequencyNumber: freqNum,
      frequencyLabel,
      visitsPerYear,

      formatted: {
        perVisitRevenue: formatCurrency(perVisitRevenue),
        revenueDeduction: formatCurrency(revenueDeduction),
        commissionableRevenue: formatCurrency(commissionableRevenue),
        perVisitCommission: formatCurrency(perVisitCommission),
        weeklyCommission: formatCurrency(weeklyCommission),
        annualCommission: formatCurrency(annualCommission),
      },

      isDetected: true,
      isOneTime: false,
    };
  }, [serviceData, commissionRate, accountTypeCache]);
}

export function useGlobalCommission(commissionRate: number = 6) {
  const { servicesState, accountTypeCache, globalContractMonths, effectivePriorQuotaCredit, effectiveCommissionRules, isNewLocation, priorFarRedline, priorFarGreenline } = useServicesContext();

  return useMemo(
    () =>
      computeGlobalCommission(
        servicesState,
        accountTypeCache,
        globalContractMonths,
        commissionRate,
        effectiveCommissionRules,
        effectivePriorQuotaCredit,
        isNewLocation,
        priorFarRedline,
        priorFarGreenline,
      ),
    [servicesState, accountTypeCache, commissionRate, globalContractMonths, effectiveCommissionRules, effectivePriorQuotaCredit, isNewLocation, priorFarRedline, priorFarGreenline],
  );
}

export default useServiceCommission;
