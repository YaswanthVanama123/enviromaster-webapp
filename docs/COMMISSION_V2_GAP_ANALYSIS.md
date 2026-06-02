# Commission System v2 - Gap Analysis & Enhancement Proposal
## Solange Commission Draft v2 Implementation

**Project:** Enviromaster Commission Calculator Enhancement
**Module:** Automated Account Type Detection & Quota Calculation
**Additional Investment:** $3,500 USD (on top of existing $5,000)
**Document Version:** 1.0
**Date:** May 2025

---

## Executive Summary

This document analyzes the differences between the **current commission implementation** and the **Solange Commission Draft v2** requirements. The new commission structure introduces significant changes including:

1. **Greenline Revenue Multiplier** (2x instead of bonus)
2. **Revenue-Based Deductions** (not percentage adjustments)
3. **Progressive Quota by Employee Tenure**
4. **Automatic Quota Achievement Rules**
5. **RouteSTAR Integration** for automatic account type detection
6. **Back Commission** on Pit-to-Anchor conversions

These changes require substantial modifications to the calculation engine and new integrations.

---

## Table of Contents

1. [Current vs New Implementation Comparison](#1-current-vs-new-implementation-comparison)
2. [Greenline Pricing Changes](#2-greenline-pricing-changes)
3. [Account Type Revenue Logic](#3-account-type-revenue-logic)
4. [Quota System Changes](#4-quota-system-changes)
5. [RouteSTAR Integration](#5-routestar-integration)
6. [Back Commission Logic](#6-back-commission-logic)
7. [Implementation Plan](#7-implementation-plan)
8. [Updated Calculation Formula](#8-updated-calculation-formula)
9. [Files to Modify](#9-files-to-modify)
10. [Cost Estimate](#10-cost-estimate)

---

## 1. Current vs New Implementation Comparison

### 1.1 Greenline Handling

| Aspect | Current Implementation | New Requirement (v2) |
|--------|------------------------|---------------------|
| Greenline Bonus | +1% added to rate | **Revenue counts 2x toward quota** |
| At 110% Redline | Not implemented | 1.25x quota credit |
| At 120% Redline | Not implemented | 1.5x quota credit |
| At 130% (Greenline) | +1% bonus | **2x quota credit (double)** |
| Below Redline | Not implemented | **Half value + requires approval** |

### 1.2 Account Type Logic

| Account Type | Current Implementation | New Requirement (v2) |
|--------------|------------------------|---------------------|
| **Anchor** | 0% adjustment | First $200 normal, **above $200 = 150% credit** |
| **Bread5** | -1% rate adjustment | **Subtract first $50 from revenue** |
| **Bread15** | -0.5% rate adjustment | **Subtract first $75 from revenue** |
| **Pit** | 0% adjustment | **First $100 = $0 commission** |

### 1.3 Quota Rates

| Quota Level | Current | New (v2) |
|-------------|---------|----------|
| Below Quota | 3% | 3% ✓ Same |
| Above Quota | 6% | 6% ✓ Same |
| Double Quota | 9% | 9% ✓ Same |

### 1.4 Agreement Multipliers

| Term | Current | New (v2) |
|------|---------|----------|
| 3-Year | 135% | 135% ✓ Same |
| 1-Year | 100% | 100% ✓ Same |
| MTM + Install | 100% | 100% ✓ Same |
| MTM No Install | 50% | 50% ✓ Same |

### 1.5 Quota Thresholds (NEW)

| Employee Month | Current | New Requirement |
|----------------|---------|-----------------|
| Month 1 | Not implemented | $0 quota |
| Month 2 | Not implemented | $2,500 annual / $50 weekly |
| Month 3 | Not implemented | $5,000 annual / $100 weekly |
| Month 4 | Not implemented | $7,500 annual / $150 weekly |
| Month 5+ | Not implemented | $10,000 annual / $200 weekly |

### 1.6 Auto-Quota Rules (NEW)

| Rule | Current | New Requirement |
|------|---------|-----------------|
| Month 4+ | Not implemented | 3 new rooftop sales = auto quota |
| Month 1-3 | Not implemented | 2 new rooftop sales = auto quota |
| Minimum | Not implemented | At least monthly recurring or $1k one-time |

---

## 2. Greenline Pricing Changes

### 2.1 Current Implementation

```typescript
// Current: Simple bonus percentage
const greenlineBonus = pricingLine === 'Greenline' ? rules.greenlineBonus : 0; // +1%
effectiveRate = baseRate + greenlineBonus; // Added to rate
```

### 2.2 New Requirement (v2)

The new system treats Greenline as a **revenue multiplier for quota credit**, not a rate bonus:

```typescript
// NEW: Greenline multiplies revenue for quota credit calculation
interface PricingMultiplier {
  priceRatio: number;      // Price as % of Redline
  quotaCredit: number;     // Multiplier for quota calculation
}

const PRICING_MULTIPLIERS: PricingMultiplier[] = [
  { priceRatio: 0.99, quotaCredit: 0.5 },    // Below Redline = half credit
  { priceRatio: 1.00, quotaCredit: 1.0 },    // Redline = normal credit
  { priceRatio: 1.10, quotaCredit: 1.25 },   // 110% = 1.25x credit
  { priceRatio: 1.20, quotaCredit: 1.5 },    // 120% = 1.5x credit
  { priceRatio: 1.30, quotaCredit: 2.0 },    // 130% (Greenline) = 2x credit
];

function getQuotaCredit(actualPrice: number, redlinePrice: number): number {
  const ratio = actualPrice / redlinePrice;

  if (ratio < 1.00) return 0.5;       // Below Redline
  if (ratio < 1.10) return 1.0;       // At Redline
  if (ratio < 1.20) return 1.25;      // 110%+
  if (ratio < 1.30) return 1.5;       // 120%+
  return 2.0;                          // 130%+ (Greenline)
}
```

### 2.3 Impact

| Scenario | Current Commission | New Commission |
|----------|-------------------|----------------|
| $100 at Redline, Above Quota | $100 × 6% = $6 | $100 × 6% = $6 |
| $100 at Greenline, Above Quota | $100 × 7% = $7 | $200 quota credit × 6% = $12 |

**Greenline now DOUBLES the commission, not adds 1%!**

---

## 3. Account Type Revenue Logic

### 3.1 Current Implementation (Percentage Adjustments)

```typescript
// Current: Simple percentage deduction from rate
accountTypeAdjustments: {
  Anchor: 0,      // No adjustment
  Bread5: -1,     // -1% from rate
  Bread15: -0.5,  // -0.5% from rate
  Pit: 0,         // No adjustment
}
```

### 3.2 New Requirement (Revenue Deductions)

```typescript
// NEW: Revenue-based deductions, not rate adjustments
interface AccountTypeRevenue {
  type: AccountType;
  deduction: number;           // First $X gives $0 commission
  anchorBonus: number;         // Revenue above threshold gets multiplier
  anchorThreshold: number;     // Threshold for bonus (Anchor only)
}

const ACCOUNT_TYPE_REVENUE: AccountTypeRevenue[] = [
  { type: 'Anchor', deduction: 0, anchorBonus: 1.5, anchorThreshold: 200 },
  { type: 'Bread5', deduction: 50, anchorBonus: 1.0, anchorThreshold: 0 },
  { type: 'Bread15', deduction: 75, anchorBonus: 1.0, anchorThreshold: 0 },
  { type: 'Pit', deduction: 100, anchorBonus: 1.0, anchorThreshold: 0 },
];

function calculateCommissionableRevenue(
  perVisitRevenue: number,
  accountType: AccountType
): number {
  const config = ACCOUNT_TYPE_REVENUE.find(c => c.type === accountType)!;

  // Subtract the deduction (first $X = no commission)
  let commissionable = Math.max(0, perVisitRevenue - config.deduction);

  // For Anchor: revenue above threshold gets 150% credit
  if (accountType === 'Anchor' && perVisitRevenue > config.anchorThreshold) {
    const normalPortion = config.anchorThreshold;
    const bonusPortion = perVisitRevenue - config.anchorThreshold;
    commissionable = normalPortion + (bonusPortion * config.anchorBonus);
  }

  return commissionable;
}
```

### 3.3 Examples

**Example 1: $250/visit Anchor**
```
Current:  $250 × 6% × 100% = $15 commission
New:      $200 (normal) + $50 × 1.5 (bonus) = $275 commissionable
          $275 × 6% = $16.50 commission
```

**Example 2: $80/visit Bread5**
```
Current:  $80 × (6% - 1%) = $80 × 5% = $4 commission
New:      $80 - $50 (deduction) = $30 commissionable
          $30 × 6% = $1.80 commission
```

**Example 3: $90/visit Pit**
```
Current:  $90 × 6% = $5.40 commission
New:      $90 - $100 (deduction) = $0 commissionable
          $0 × 6% = $0 commission (until upgraded)
```

---

## 4. Quota System Changes

### 4.1 Progressive Quota by Tenure

```typescript
interface QuotaThreshold {
  monthsEmployed: number;
  annualQuota: number;
  weeklyEquivalent: number;
}

const QUOTA_THRESHOLDS: QuotaThreshold[] = [
  { monthsEmployed: 1, annualQuota: 0, weeklyEquivalent: 0 },
  { monthsEmployed: 2, annualQuota: 2500, weeklyEquivalent: 50 },
  { monthsEmployed: 3, annualQuota: 5000, weeklyEquivalent: 100 },
  { monthsEmployed: 4, annualQuota: 7500, weeklyEquivalent: 150 },
  { monthsEmployed: 5, annualQuota: 10000, weeklyEquivalent: 200 },
];

function getQuotaForEmployee(hireDate: Date): QuotaThreshold {
  const monthsEmployed = getMonthsEmployed(hireDate);

  if (monthsEmployed >= 5) return QUOTA_THRESHOLDS[4];
  return QUOTA_THRESHOLDS[monthsEmployed - 1] || QUOTA_THRESHOLDS[0];
}
```

### 4.2 Automatic Quota Achievement

```typescript
interface AutoQuotaRule {
  minMonths: number;
  maxMonths: number;
  requiredSales: number;
  minimumValue: number;        // Per sale minimum
  minimumFrequency: string;    // 'monthly' | 'one-time'
}

const AUTO_QUOTA_RULES: AutoQuotaRule[] = [
  { minMonths: 1, maxMonths: 3, requiredSales: 2, minimumValue: 1000, minimumFrequency: 'monthly' },
  { minMonths: 4, maxMonths: Infinity, requiredSales: 3, minimumValue: 1000, minimumFrequency: 'monthly' },
];

function checkAutoQuota(
  monthsEmployed: number,
  newRooftopSales: number,
  salesMeetMinimum: boolean
): boolean {
  const rule = AUTO_QUOTA_RULES.find(
    r => monthsEmployed >= r.minMonths && monthsEmployed <= r.maxMonths
  );

  if (!rule) return false;

  return newRooftopSales >= rule.requiredSales && salesMeetMinimum;
}
```

### 4.3 Quota Level Determination

```typescript
function determineQuotaLevel(
  employee: Employee,
  periodSales: number,
  newRooftopCount: number
): QuotaLevel {
  const quota = getQuotaForEmployee(employee.hireDate);
  const monthsEmployed = getMonthsEmployed(employee.hireDate);

  // Check auto-quota first
  if (checkAutoQuota(monthsEmployed, newRooftopCount, true)) {
    return 'above'; // Auto-qualify for above quota
  }

  // Standard quota comparison
  if (periodSales >= quota.annualQuota * 2) return 'double';
  if (periodSales >= quota.annualQuota) return 'above';
  return 'below';
}
```

---

## 5. RouteSTAR Integration

### 5.1 Purpose

Automatically determine **Account Type** based on driving distance from nearest existing **Anchor** location.

### 5.2 Integration Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ROUTESTAR INTEGRATION FLOW                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. User enters new customer name in agreement form                 │
│         │                                                            │
│         ▼                                                            │
│  2. System looks up customer in RouteSTAR database                  │
│         │                                                            │
│         ▼                                                            │
│  3. Get customer's address/location                                 │
│         │                                                            │
│         ▼                                                            │
│  4. Query all existing Anchor locations in territory               │
│         │                                                            │
│         ▼                                                            │
│  5. Calculate driving time to nearest Anchor                        │
│     (via RouteSTAR Map Distance API)                                │
│         │                                                            │
│         ▼                                                            │
│  6. Auto-set Account Type based on driving time:                    │
│     ┌─────────────────────────────────────────────────────────────┐ │
│     │  Driving Time       │  Account Type (if < $200/visit)       │ │
│     ├─────────────────────┼───────────────────────────────────────│ │
│     │  < 5 minutes        │  Bread5                               │ │
│     │  5-15 minutes       │  Bread15                              │ │
│     │  > 15 minutes       │  Pit                                  │ │
│     │  Any (if $200+)     │  Anchor (overrides distance)          │ │
│     └─────────────────────┴───────────────────────────────────────┘ │
│         │                                                            │
│         ▼                                                            │
│  7. Pre-fill Account Type in commission calculator                  │
│     (User can still override if needed)                             │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.3 Technical Implementation

```typescript
// Backend Service: RouteSTAR Integration
interface RouteSTARConfig {
  baseUrl: string;           // https://emnrv.routestar.online
  loginEndpoint: string;     // /web/login/
  distanceEndpoint: string;  // /web/mapdistance/
  credentials: {
    username: string;        // From environment variable
    password: string;        // From environment variable (encrypted)
  };
}

interface CustomerLocation {
  customerId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

interface DrivingTimeResult {
  fromLocation: CustomerLocation;
  toLocation: CustomerLocation;
  drivingTimeMinutes: number;
  distanceMiles: number;
}

class RouteSTARService {
  private sessionToken: string | null = null;

  async authenticate(): Promise<void> {
    // POST to login endpoint
    // Store session token
  }

  async getCustomerLocation(customerName: string): Promise<CustomerLocation> {
    // Search customer in RouteSTAR
    // Return location data
  }

  async getAnchorLocations(): Promise<CustomerLocation[]> {
    // Query all locations marked as Anchor
    // Return list
  }

  async calculateDrivingTime(
    from: CustomerLocation,
    to: CustomerLocation
  ): Promise<DrivingTimeResult> {
    // Use map distance API
    // Return driving time
  }

  async determineAccountType(
    customerName: string,
    perVisitRevenue: number
  ): Promise<{ accountType: AccountType; nearestAnchor: CustomerLocation | null; drivingTime: number }> {
    // If revenue >= $200, it's an Anchor regardless of distance
    if (perVisitRevenue >= 200) {
      return { accountType: 'Anchor', nearestAnchor: null, drivingTime: 0 };
    }

    const customerLocation = await this.getCustomerLocation(customerName);
    const anchors = await this.getAnchorLocations();

    // Find nearest Anchor
    let nearestAnchor: CustomerLocation | null = null;
    let minDrivingTime = Infinity;

    for (const anchor of anchors) {
      const result = await this.calculateDrivingTime(anchor, customerLocation);
      if (result.drivingTimeMinutes < minDrivingTime) {
        minDrivingTime = result.drivingTimeMinutes;
        nearestAnchor = anchor;
      }
    }

    // Determine account type based on driving time
    let accountType: AccountType;
    if (minDrivingTime < 5) {
      accountType = 'Bread5';
    } else if (minDrivingTime <= 15) {
      accountType = 'Bread15';
    } else {
      accountType = 'Pit';
    }

    return { accountType, nearestAnchor, drivingTime: minDrivingTime };
  }
}
```

### 5.4 API Endpoints

```
POST /api/routestar/authenticate
  - Authenticate with RouteSTAR

GET /api/routestar/customer/:name
  - Get customer location from RouteSTAR

GET /api/routestar/anchors
  - Get all Anchor locations

POST /api/routestar/driving-time
  - Calculate driving time between two locations

POST /api/routestar/determine-account-type
  - Auto-determine account type for new customer
  Body: { customerName: string, perVisitRevenue: number }
  Response: { accountType, nearestAnchor, drivingTimeMinutes }
```

### 5.5 Security Considerations

```
⚠️ IMPORTANT: RouteSTAR credentials must be:
  - Stored in environment variables (never in code)
  - Encrypted at rest
  - Accessed only via backend service
  - Never exposed to frontend

Environment Variables:
  ROUTESTAR_BASE_URL=https://emnrv.routestar.online
  ROUTESTAR_USERNAME=<encrypted>
  ROUTESTAR_PASSWORD=<encrypted>
```

---

## 6. Back Commission Logic

### 6.1 Pit to Anchor Conversion

When a Pit location is converted to an Anchor (through upsell or new nearby business), the salesperson receives **back commission** on the previously sold Pit revenue.

```typescript
interface PitConversion {
  pitAgreementId: string;
  pitRevenue: number;          // Original Pit revenue (no commission paid)
  newAgreementId: string;
  newRevenue: number;
  conversionDate: Date;
  backCommissionPaid: boolean;
}

function calculateBackCommission(
  conversion: PitConversion,
  quotaLevel: QuotaLevel,
  agreementMultiplier: number
): number {
  // The first $100 was deducted as Pit
  // Now that it's an Anchor, calculate commission on full amount
  const baseRate = QUOTA_RATES[quotaLevel];
  const backCommission = conversion.pitRevenue * (baseRate / 100) * (agreementMultiplier / 100);

  return backCommission;
}
```

### 6.2 Example

```
Original Pit Sale: $90/visit weekly (no commission - under $100 threshold)
Upsell: $220 window contract bi-weekly

After upsell, location becomes Anchor:
- Combined revenue: $90 + $220 = $310/visit
- Back commission on original $90 is now earned
- Full commission on new structure
```

---

## 7. Implementation Plan

### 7.1 Phase 1: Core Calculation Updates (Week 1-2)

| Task | Hours | Description |
|------|-------|-------------|
| Update commission.types.ts | 8 | New interfaces for v2 logic |
| Update calculation hook | 16 | Implement new revenue-based logic |
| Update backend calculator | 12 | Server-side validation |
| Unit tests | 8 | Test all scenarios |

### 7.2 Phase 2: Quota System (Week 2-3)

| Task | Hours | Description |
|------|-------|-------------|
| Employee tenure tracking | 8 | Add hire date to employee model |
| Quota threshold logic | 8 | Progressive quota by month |
| Auto-quota rules | 6 | Rooftop sales tracking |
| Sales history tracking | 8 | Track sales per period |

### 7.3 Phase 3: RouteSTAR Integration (Week 3-4)

| Task | Hours | Description |
|------|-------|-------------|
| RouteSTAR service | 16 | Authentication, API calls |
| Anchor location sync | 8 | Maintain Anchor list |
| Driving time calculation | 8 | Map distance integration |
| Auto account type UI | 8 | Form integration |

### 7.4 Phase 4: Back Commission (Week 4)

| Task | Hours | Description |
|------|-------|-------------|
| Pit tracking | 6 | Track Pit locations |
| Conversion detection | 8 | Detect Pit → Anchor |
| Back commission calc | 6 | Calculate owed commission |
| UI for back commission | 4 | Display in dashboards |

---

## 8. Updated Calculation Formula

### 8.1 New Complete Formula

```typescript
function calculateCommissionV2(input: CommissionInputV2): CommissionResultV2 {
  // Step 1: Get pricing multiplier (Greenline scaling)
  const pricingMultiplier = getPricingMultiplier(input.actualPrice, input.redlinePrice);

  // Step 2: Calculate commissionable revenue (account type deductions)
  const commissionableRevenue = calculateCommissionableRevenue(
    input.perVisitRevenue,
    input.accountType
  );

  // Step 3: Apply pricing multiplier to get quota credit
  const quotaCredit = commissionableRevenue * pricingMultiplier;

  // Step 4: Calculate annual quota credit
  const annualQuotaCredit = quotaCredit * input.visitsPerYear;

  // Step 5: Determine quota level (including auto-quota check)
  const quotaLevel = determineQuotaLevel(
    input.employee,
    input.periodSales + annualQuotaCredit,
    input.newRooftopCount
  );

  // Step 6: Get base commission rate
  const baseRate = QUOTA_RATES[quotaLevel];

  // Step 7: Apply agreement multiplier
  const agreementMultiplier = AGREEMENT_MULTIPLIERS[input.agreementTerm];

  // Step 8: Apply inside sales deduction
  const insideSalesDeduction = input.isInsideSales ? -3 : 0;

  // Step 9: Calculate final rate
  const finalRate = (baseRate + insideSalesDeduction) * (agreementMultiplier / 100);

  // Step 10: Calculate commission amounts
  const perVisitCommission = commissionableRevenue * (finalRate / 100);
  const annualCommission = perVisitCommission * input.visitsPerYear;
  const contractCommission = annualCommission * (input.contractMonths / 12);

  // Step 11: Add renewal bonus if applicable
  let renewalBonus = 0;
  if (input.businessType === 'renewal' && input.yearsAsCustomer >= 2) {
    renewalBonus = input.totalRenewalValue * 0.04; // 4% of total renewed
  }

  return {
    quotaCredit: annualQuotaCredit,
    commissionableRevenue,
    quotaLevel,
    baseRate,
    finalRate,
    perVisitCommission,
    annualCommission,
    contractCommission,
    renewalBonus,
    totalCommission: contractCommission + renewalBonus,
  };
}
```

---

## 9. Files to Modify

### 9.1 New Files

| File | Lines | Purpose |
|------|-------|---------|
| `src/services/routestar/RouteSTARService.ts` | ~300 | RouteSTAR integration |
| `src/services/routestar/types.ts` | ~100 | RouteSTAR types |
| `src/utils/quotaCalculator.ts` | ~150 | Quota logic |
| `src/utils/backCommission.ts` | ~100 | Back commission logic |
| `src/models/PitConversion.js` | ~80 | Track conversions |

### 9.2 Modified Files

| File | Changes |
|------|---------|
| `commission.types.ts` | Add v2 interfaces, pricing multipliers |
| `useCommissionCalc.ts` | Implement v2 calculation logic |
| `CommissionCalculator.tsx` | Add RouteSTAR auto-detect |
| `Employee.js` | Add hireDate field |
| `commissionController.js` | Update calculation endpoint |
| `AdminDashboard.tsx` | Add quota tracking display |

---

## 10. Cost Estimate

### 10.1 Additional Development Hours

| Phase | Hours |
|-------|-------|
| Core Calculation Updates | 44 |
| Quota System | 30 |
| RouteSTAR Integration | 40 |
| Back Commission | 24 |
| Testing & QA | 16 |
| **Total** | **154 hours** |

### 10.2 Cost

| Item | Amount |
|------|--------|
| Development (154 hrs × $21/hr) | $3,234 |
| RouteSTAR API research | $150 |
| Contingency | $116 |
| **Total Additional** | **$3,500** |

### 10.3 Combined Total

| Module | Cost |
|--------|------|
| Original Commission System | $5,000 |
| V2 Enhancements + RouteSTAR | $3,500 |
| **Grand Total** | **$8,500** |

---

## Summary of Key Changes

### What Stays the Same:
- Base quota rates (3%, 6%, 9%)
- Agreement multipliers (135%, 100%, 50%)
- Inside sales deduction (-3%)
- Renewal bonus (4% at 2+ years)

### What Changes:

| Feature | Current | New (v2) |
|---------|---------|----------|
| Greenline | +1% rate bonus | **2x revenue credit** |
| Account Type | % rate adjustment | **Revenue deductions** |
| Quota | Manual selection | **Auto by tenure + sales** |
| Account Detection | Manual selection | **Auto via RouteSTAR** |
| Pit Handling | No commission logic | **Back commission on conversion** |

---

**Document Prepared By:** Development Team
**Status:** Pending Client Decision
**Next Step:** Approve enhancement scope and RouteSTAR integration requirements

---

*Note: RouteSTAR integration requires API access credentials to be securely stored in environment variables. The system will never store credentials in code or expose them to the frontend.*
