# Pure Janitorial Service Implementation
## Technical Proposal & Quotation

**Project:** Enviromaster Web & Mobile Applications
**Module:** Pure Janitorial Service - Admin Configuration & Dynamic Pricing Calculator
**Estimated Investment:** $2,000 USD
**Document Version:** 1.0
**Date:** May 2025

---

## Executive Summary

This document outlines the comprehensive implementation of the Pure Janitorial Service module for both the Enviromaster web application and EnviroApp mobile application. The system provides a sophisticated pricing calculator with admin-configurable defaults, dynamic labor calculations based on square footage and production rates, supply cost tracking, and gross profit margin calculations.

The implementation spans **both platforms** (React web + React Native mobile) with shared business logic, requiring careful coordination to ensure consistent pricing calculations across all touchpoints.

---

## Table of Contents

1. [Business Requirements](#1-business-requirements)
2. [Calculation Logic & Formulas](#2-calculation-logic--formulas)
3. [Admin Panel Configuration](#3-admin-panel-configuration)
4. [Form Filling Workflow](#4-form-filling-workflow)
5. [Web Application Implementation](#5-web-application-implementation)
6. [Mobile Application Implementation](#6-mobile-application-implementation)
7. [Backend Implementation](#7-backend-implementation)
8. [Files Created & Modified](#8-files-created--modified)
9. [Testing & Validation](#9-testing--validation)
10. [Cost Breakdown](#10-cost-breakdown)

---

## 1. Business Requirements

### 1.1 Core Business Rules

| Requirement | Description | Implementation |
|-------------|-------------|----------------|
| Admin-Controlled Defaults | All pricing parameters configurable without code changes | Admin panel with real-time sync |
| Dynamic Pricing | Calculate pricing based on square footage and production rates | Real-time calculator |
| Gross Profit Logic | 33% margin = Cost / 0.67 (NOT Cost + 33%) | Correct margin formula |
| Multi-Frequency Support | 1-7 visits per week with proper annualization | Weekly × 52 for annual |
| Supply Cost Tracking | 8 supply categories with editable defaults | Line-item editing |
| Place Type Rates | Different production rates per location type | Configurable per type |

### 1.2 Admin Configuration Requirements

| Setting | Example Value | Purpose |
|---------|---------------|---------|
| Frequency Options | 1-7 visits/week | Control visit scheduling |
| Place Types | Office, Home, Restaurant, Business Place | Production rate lookup |
| Production Rates | Office: 1,000 sqft/hour | Hours calculation |
| Cost Per Hour | $20/hour | Labor cost basis |
| Labor Tax % | 15% | Tax on labor |
| Gross Profit % | 33% | Margin calculation |
| Supply Defaults | 8 categories | Annual supply costs |

### 1.3 Form Input Requirements

| Field | Type | Source | Notes |
|-------|------|--------|-------|
| Frequency | Dropdown | Required | 1-7 visits/week |
| Type of Place | Dropdown | Required | Controls production rate |
| Square Feet | Number | Required | Customer cleanable area |
| Contract Term | Number | Required | Months (2-36) |
| Cost Per Hour | Admin Default | Editable | Override allowed |
| Labor Tax % | Admin Default | Editable | Override allowed |
| Supplies | Line Items | Admin Default | All 8 editable |
| Gross Profit % | Admin Default | Editable | Override allowed |

---

## 2. Calculation Logic & Formulas

### 2.1 Core Formulas

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CALCULATION FLOW                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Square Feet ÷ Production Rate = Hours Per Visit                    │
│         │                                                            │
│         ▼                                                            │
│  Hours Per Visit × Cost Per Hour = Labor Cost Per Visit             │
│         │                                                            │
│         ▼                                                            │
│  Labor Cost Per Visit × Visits Per Week = Weekly Labor              │
│         │                                                            │
│         ├──► × 4.3333 = Monthly Labor (display only)                │
│         │                                                            │
│         └──► × 52 = Annual Base Labor                               │
│                │                                                     │
│                ▼                                                     │
│  Annual Base Labor × Labor Tax % = Annual Labor Tax                 │
│                │                                                     │
│                ▼                                                     │
│  Annual Base Labor + Annual Labor Tax = Total Labor Cost            │
│                │                                                     │
│                ▼                                                     │
│  Total Labor Cost + Annual Supplies = Total Annual Cost             │
│                │                                                     │
│                ▼                                                     │
│  Total Annual Cost ÷ (1 - Gross Profit %) = Annual Contract Value   │
│                │                                                     │
│                ▼                                                     │
│  Annual Contract Value - Total Annual Cost = Gross Profit $         │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Formula Reference Table

| Output | Formula |
|--------|---------|
| Hours Per Visit | `squareFeet / productionRate` |
| Labor Cost Per Visit | `hoursPerVisit × costPerHour` |
| Weekly Labor | `laborCostPerVisit × visitsPerWeek` |
| Monthly Labor | `weeklyLabor × 4.3333` |
| Annual Base Labor | `weeklyLabor × 52` |
| Annual Labor Tax | `annualBaseLabor × laborTaxPercent` |
| Total Labor Cost | `annualBaseLabor + annualLaborTax` |
| Total Annual Cost | `totalLaborCost + annualSupplies` |
| Annual Contract Value | `totalAnnualCost / (1 - grossProfitPercent)` |
| Gross Profit $ | `annualContractValue - totalAnnualCost` |

### 2.3 Worked Example

**Input:**
- Square Feet: 4,000
- Place Type: Office (1,000 sqft/hour)
- Visits Per Week: 7
- Cost Per Hour: $20
- Labor Tax: 15%
- Annual Supplies: $1,100
- Gross Profit Margin: 33%

**Calculation:**

| Step | Calculation | Result |
|------|-------------|--------|
| Hours Per Visit | 4,000 ÷ 1,000 | 4 hours |
| Labor Per Visit | 4 × $20 | $80 |
| Weekly Labor | $80 × 7 | $560 |
| Monthly Labor | $560 × 4.3333 | $2,426.67 |
| Annual Base Labor | $560 × 52 | $29,120 |
| Annual Labor Tax | $29,120 × 15% | $4,368 |
| Total Labor Cost | $29,120 + $4,368 | $33,488 |
| Total Annual Cost | $33,488 + $1,100 | $34,588 |
| Annual Contract Value | $34,588 ÷ 0.67 | **$51,624** |
| Gross Profit $ | $51,624 - $34,588 | $17,036 |

### 2.4 Final Price Breakdown

| Category | Amount | % of Final Price |
|----------|--------|------------------|
| Total Labor Cost | $33,488 | 64.9% |
| Supplies | $1,100 | 2.1% |
| Gross Profit | $17,036 | 33.0% |
| **Total Price** | **$51,624** | **100.0%** |

---

## 3. Admin Panel Configuration

### 3.1 Production Rates Tab

```
┌─────────────────────────────────────────────────────────────────────┐
│  PRODUCTION RATES BY PLACE TYPE                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Place Type          │  Sqft Per Hour  │  Description               │
│  ────────────────────┼─────────────────┼────────────────────────── │
│  Office              │  1,000          │  Standard office space     │
│  Home                │  500            │  Residential cleaning      │
│  Restaurant          │  800            │  Food service location     │
│  Business Place      │  2,000          │  Large commercial space    │
│                                                                      │
│  [+ Add Place Type]                    [Save Changes]               │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 Labor Defaults Tab

```
┌─────────────────────────────────────────────────────────────────────┐
│  LABOR COST DEFAULTS                                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Cost Per Hour:       [ $20.00    ]                                 │
│                                                                      │
│  Labor Tax %:         [ 15        ] %                               │
│                                                                      │
│  Gross Profit %:      [ 33        ] %                               │
│                                                                      │
│  ───────────────────────────────────────────────────────────────── │
│                                                                      │
│  CONTRACT SETTINGS                                                   │
│                                                                      │
│  Min Contract Months: [ 2         ]                                 │
│  Max Contract Months: [ 36        ]                                 │
│  Default Frequency:   [ Weekly ▼  ]                                 │
│                                                                      │
│                                           [Save Changes]            │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.3 Supply Defaults Tab

```
┌─────────────────────────────────────────────────────────────────────┐
│  DEFAULT ANNUAL SUPPLY COSTS                                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Supply Item          │  Annual Amount  │  Notes                    │
│  ─────────────────────┼─────────────────┼────────────────────────── │
│  Vacuums              │  [ $100.00  ]   │  Equipment replacement    │
│  Mops                 │  [ $500.00  ]   │  Mop heads & handles      │
│  Mop Buckets          │  [ $200.00  ]   │  Buckets & wringers       │
│  Dust Mops            │  [ $300.00  ]   │  Dust mop supplies        │
│  Microfiber           │  [ $0.00    ]   │  Cloths & pads            │
│  Cleaning Products    │  [ $0.00    ]   │  Chemicals & solutions    │
│  Consumables          │  [ $0.00    ]   │  Paper products, bags     │
│  Miscellaneous        │  [ $0.00    ]   │  Other supplies           │
│  ─────────────────────┼─────────────────┼────────────────────────── │
│  TOTAL                │  $1,100.00      │                           │
│                                                                      │
│                                           [Save Changes]            │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. Form Filling Workflow

### 4.1 Step-by-Step Process

| Step | User Action | System Behavior |
|------|-------------|-----------------|
| 1 | Select Frequency | Dropdown: 1-7 visits per week |
| 2 | Select Place Type | Loads production rate from admin config |
| 3 | Enter Square Feet | Validates positive number |
| 4 | View Hours Calculation | Auto-calculates: sqft ÷ production rate |
| 5 | Review Labor Costs | Shows per-visit, weekly, monthly, annual |
| 6 | Edit Supplies (optional) | Admin defaults shown, all editable |
| 7 | View Final Pricing | Shows breakdown with gross profit |
| 8 | Save to Agreement | Stores all values with agreement |

### 4.2 Form Layout (Web)

```
┌─────────────────────────────────────────────────────────────────────┐
│  PURE JANITORIAL SERVICE                                    [?]     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────────┐  ┌─────────────────────────┐          │
│  │ Visits Per Week     ▼  │  │ Type of Place       ▼  │          │
│  │ [ 7                   ] │  │ [ Office              ] │          │
│  └─────────────────────────┘  └─────────────────────────┘          │
│                                                                      │
│  ┌─────────────────────────┐  ┌─────────────────────────┐          │
│  │ Square Feet            │  │ Contract Months         │          │
│  │ [ 4,000              ] │  │ [ 12                  ] │          │
│  └─────────────────────────┘  └─────────────────────────┘          │
│                                                                      │
│  ═══════════════════════════════════════════════════════════════   │
│  CALCULATED VALUES                                                   │
│  ───────────────────────────────────────────────────────────────   │
│  Hours Per Visit:        4.00 hours                                 │
│  Labor Cost Per Visit:   $80.00                                     │
│  Weekly Labor:           $560.00                                    │
│  Monthly Labor:          $2,426.67                                  │
│  Annual Base Labor:      $29,120.00                                 │
│                                                                      │
│  ═══════════════════════════════════════════════════════════════   │
│  LABOR SETTINGS                           [Override defaults]       │
│  ───────────────────────────────────────────────────────────────   │
│  Cost Per Hour:    [ $20.00 ]     Labor Tax %:    [ 15 ]           │
│  Gross Profit %:   [ 33    ]                                        │
│                                                                      │
│  ═══════════════════════════════════════════════════════════════   │
│  ANNUAL SUPPLIES                                                     │
│  ───────────────────────────────────────────────────────────────   │
│  Vacuums:          [ $100  ]     Mops:            [ $500  ]        │
│  Mop Buckets:      [ $200  ]     Dust Mops:       [ $300  ]        │
│  Microfiber:       [ $0    ]     Cleaning Prod:   [ $0    ]        │
│  Consumables:      [ $0    ]     Miscellaneous:   [ $0    ]        │
│  ───────────────────────────────────────────────────────────────   │
│  Total Supplies:   $1,100.00                                        │
│                                                                      │
│  ═══════════════════════════════════════════════════════════════   │
│  PRICING SUMMARY                                   🟢 Greenline     │
│  ───────────────────────────────────────────────────────────────   │
│  │ Total Labor Cost:        │  $33,488.00  │  64.9%  │             │
│  │ Annual Supplies:         │   $1,100.00  │   2.1%  │             │
│  │ Gross Profit:            │  $17,036.00  │  33.0%  │             │
│  ├───────────────────────────────────────────────────┤             │
│  │ ANNUAL CONTRACT VALUE:   │  $51,624.00  │ 100.0%  │             │
│  │ Monthly:                 │   $4,302.00  │         │             │
│  │ Per Visit:               │     $141.27  │         │             │
│  └───────────────────────────────────────────────────┘             │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Notes:                                                       │   │
│  │ [                                                          ] │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 5. Web Application Implementation

### 5.1 Component Structure

```
/enviromaster/src/components/services/purejanitorial/
├── JanitorialForm.tsx          # Main form component (400+ lines)
├── janitorialTypes.ts          # TypeScript type definitions (100+ lines)
├── janitorialConfig.ts         # Configuration constants (80+ lines)
└── useJanitorialCalc.ts        # Calculation hook (200+ lines)
```

### 5.2 JanitorialForm.tsx - Main Component

```typescript
// Key Features Implemented:

interface JanitorialFormProps {
  value: JanitorialServiceData;
  onChange: (data: JanitorialServiceData) => void;
  onRemove?: () => void;
  pricingIndicator?: 'red' | 'green';
  globalContractMonths?: number;
}

// Form State Management:
- Visits per week (1-7 dropdown)
- Place type selector with production rates
- Square footage input with validation
- Contract months (2-36)
- Cost per hour (admin default, editable)
- Labor tax percentage (admin default, editable)
- Gross profit percentage (admin default, editable)
- 8 supply line items (admin defaults, all editable)

// Real-time Calculations:
- Hours per visit (auto-calculated)
- Labor costs (per-visit, weekly, monthly, annual)
- Labor tax amount
- Total cost
- Contract value with gross profit
- Greenline/Redline indicator (30% threshold)

// Admin Config Integration:
- Fetches production rates from backend
- Loads labor defaults from backend
- Loads supply defaults from backend
- Refresh button to sync latest config
```

**Complexity:** Very High - Complex state management, real-time calculations, admin config integration.

### 5.3 useJanitorialCalc.ts - Calculation Hook

```typescript
// Core Calculation Logic:

export function useJanitorialCalc(input: JanitorialInput): JanitorialCalculation {
  return useMemo(() => {
    // Step 1: Hours per visit
    const hoursPerVisit = input.squareFeet / input.productionRate;

    // Step 2: Labor costs
    const laborPerVisit = hoursPerVisit * input.costPerHour;
    const weeklyLabor = laborPerVisit * input.visitsPerWeek;
    const monthlyLabor = weeklyLabor * 4.3333;
    const annualBaseLabor = weeklyLabor * 52;

    // Step 3: Labor tax
    const annualLaborTax = annualBaseLabor * (input.laborTaxPercent / 100);
    const totalLaborCost = annualBaseLabor + annualLaborTax;

    // Step 4: Total cost
    const totalAnnualCost = totalLaborCost + input.totalSupplies;

    // Step 5: Contract value with gross profit
    const grossProfitDivisor = 1 - (input.grossProfitPercent / 100);
    const annualContractValue = totalAnnualCost / grossProfitDivisor;
    const grossProfitDollars = annualContractValue - totalAnnualCost;

    // Step 6: Per-period values
    const monthlyContractValue = annualContractValue / 12;
    const perVisitValue = annualContractValue / (input.visitsPerWeek * 52);

    return {
      hoursPerVisit,
      laborPerVisit,
      weeklyLabor,
      monthlyLabor,
      annualBaseLabor,
      annualLaborTax,
      totalLaborCost,
      totalAnnualCost,
      annualContractValue,
      grossProfitDollars,
      monthlyContractValue,
      perVisitValue,
    };
  }, [input]);
}
```

**Complexity:** Medium - Pure calculation logic with memoization.

### 5.4 janitorialTypes.ts - Type Definitions

```typescript
// Place Types
export type PlaceType = 'office' | 'home' | 'restaurant' | 'businessPlace';

// Production Rates (sqft per hour)
export interface ProductionRates {
  office: number;      // default: 1000
  home: number;        // default: 500
  restaurant: number;  // default: 800
  businessPlace: number; // default: 2000
}

// Labor Defaults
export interface LaborDefaults {
  costPerHour: number;      // default: 20
  laborTaxPercent: number;  // default: 15
  grossProfitPercent: number; // default: 33
}

// Supply Item
export interface SupplyItem {
  id: string;
  name: string;
  annualAmount: number;
}

// Supply Defaults (8 items)
export interface SupplyDefaults {
  vacuums: number;         // default: 100
  mops: number;            // default: 500
  mopBuckets: number;      // default: 200
  dustMops: number;        // default: 300
  microfiber: number;      // default: 0
  cleaningProducts: number; // default: 0
  consumables: number;     // default: 0
  miscellaneous: number;   // default: 0
}

// Form Data Structure
export interface JanitorialServiceData {
  visitsPerWeek: number;
  placeType: PlaceType;
  squareFeet: number;
  contractMonths: number;
  costPerHour: number;
  laborTaxPercent: number;
  grossProfitPercent: number;
  supplies: SupplyItem[];
  notes: string;
  // Calculated values (stored for reference)
  calculated: JanitorialCalculation;
}

// Calculation Results
export interface JanitorialCalculation {
  hoursPerVisit: number;
  laborPerVisit: number;
  weeklyLabor: number;
  monthlyLabor: number;
  annualBaseLabor: number;
  annualLaborTax: number;
  totalLaborCost: number;
  totalSupplies: number;
  totalAnnualCost: number;
  annualContractValue: number;
  grossProfitDollars: number;
  grossProfitPercent: number;
  monthlyContractValue: number;
  perVisitValue: number;
}

// Admin Configuration
export interface JanitorialConfig {
  productionRates: ProductionRates;
  laborDefaults: LaborDefaults;
  supplyDefaults: SupplyDefaults;
  contractSettings: {
    minMonths: number;
    maxMonths: number;
    defaultFrequency: number;
  };
}
```

**Complexity:** Medium - Comprehensive type safety for entire module.

### 5.5 Admin Configuration Component

```typescript
// Located in: /enviromaster/src/components/admin/

// Features:
- Tabbed interface (Production Rates, Labor Defaults, Supply Defaults)
- Edit production rates per place type
- Configure cost per hour, labor tax %, gross profit %
- Manage 8 supply item defaults
- Save to backend API
- Real-time validation
- Loading states
- Error handling
```

---

## 6. Mobile Application Implementation

### 6.1 Component Structure

```
/EnviroApp/src/features/
├── agreements/components/form/services/
│   └── JanitorialForm.tsx              # Main form (350+ lines)
│
└── admin/components/service-configs/
    └── EditJanitorialConfigModal.tsx   # Admin config (300+ lines)
```

### 6.2 JanitorialForm.tsx (React Native)

```typescript
// Key Features - Mirror of Web Implementation:

- Native dropdown pickers for visits/place type
- TextInput for square footage
- Slider or picker for contract months
- Editable labor settings section
- Supply line items with editable amounts
- Real-time calculation display
- Greenline/Redline indicator badge
- Notes input
- Responsive layout for different screen sizes

// Platform-Specific Adaptations:
- React Native Picker components
- Touch-friendly input sizes
- Keyboard avoiding view
- Native number formatting
- ScrollView for long form
```

**Complexity:** High - React Native adaptation with same business logic.

### 6.3 EditJanitorialConfigModal.tsx (Mobile Admin)

```typescript
// Features:
- Modal presentation
- Tabbed interface (Production, Labor, Supplies)
- Native pickers and inputs
- Save to backend API
- Loading overlay
- Validation feedback
- Dismiss on save
```

**Complexity:** Medium - Admin configuration in modal format.

### 6.4 Shared Calculation Logic

```typescript
// The calculation hook is shared between platforms:
// Both web and mobile use identical formulas

// Key consistency points:
- Same formula: Annual = Weekly × 52
- Same monthly display: Weekly × 4.3333
- Same gross profit: Cost / (1 - margin%)
- Same production rates lookup
- Same supply total calculation
```

---

## 7. Backend Implementation

### 7.1 Service Configuration Model

```javascript
// /enviro-bckend/scripts/serviceConfigs.json

{
  "serviceId": "pureJanitorial",
  "version": "v1.0",
  "label": "Pure Janitorial Services",
  "description": "General janitorial services with configurable pricing",
  "config": {
    "productionRates": {
      "office": 1000,
      "home": 500,
      "restaurant": 800,
      "businessPlace": 2000
    },
    "laborDefaults": {
      "costPerHour": 20,
      "laborTaxPercent": 15,
      "grossProfitPercent": 33
    },
    "supplyDefaults": {
      "vacuums": 100,
      "mops": 500,
      "mopBuckets": 200,
      "dustMops": 300,
      "microfiber": 0,
      "cleaningProducts": 0,
      "consumables": 0,
      "miscellaneous": 0
    },
    "contractSettings": {
      "minMonths": 2,
      "maxMonths": 36,
      "defaultVisitsPerWeek": 1,
      "weeksPerMonth": 4.3333
    },
    "frequencyOptions": [1, 2, 3, 4, 5, 6, 7],
    "placeTypes": ["office", "home", "restaurant", "businessPlace"]
  }
}
```

### 7.2 API Endpoints

```javascript
// Service Configuration Endpoints:

GET  /api/services/pureJanitorial/config
// Returns current admin configuration

PUT  /api/services/pureJanitorial/config
// Updates admin configuration
// Body: { productionRates, laborDefaults, supplyDefaults }

POST /api/services/pureJanitorial/calculate
// Server-side calculation validation
// Body: { visitsPerWeek, placeType, squareFeet, ... }
// Returns: calculated values for verification
```

### 7.3 Agreement Integration

```javascript
// Janitorial data stored within agreement:

{
  "payload": {
    "services": {
      "pureJanitorial": {
        "enabled": true,
        "data": {
          "visitsPerWeek": 7,
          "placeType": "office",
          "squareFeet": 4000,
          "contractMonths": 12,
          "costPerHour": 20,
          "laborTaxPercent": 15,
          "grossProfitPercent": 33,
          "supplies": [...],
          "calculated": {
            "annualContractValue": 51624,
            "monthlyContractValue": 4302,
            // ... all calculated fields
          }
        }
      }
    }
  }
}
```

---

## 8. Files Created & Modified

### 8.1 Web Application Files (12 Files)

| File | Lines | Purpose |
|------|-------|---------|
| `src/components/services/purejanitorial/JanitorialForm.tsx` | ~400 | Main form component |
| `src/components/services/purejanitorial/JanitorialForm.css` | ~200 | Form styling |
| `src/components/services/purejanitorial/janitorialTypes.ts` | ~100 | Type definitions |
| `src/components/services/purejanitorial/janitorialConfig.ts` | ~80 | Default configuration |
| `src/components/services/purejanitorial/useJanitorialCalc.ts` | ~200 | Calculation hook |
| `src/components/services/purejanitorial/index.ts` | ~10 | Exports |
| `src/components/admin/JanitorialConfigEditor.tsx` | ~300 | Admin config UI |
| `src/components/admin/JanitorialConfigEditor.css` | ~150 | Admin styling |
| `src/backendservice/api/janitorialApi.ts` | ~80 | API service |
| `src/backendservice/types/janitorial.types.ts` | ~60 | API types |

**Web Total: ~1,580 lines**

### 8.2 Mobile Application Files (8 Files)

| File | Lines | Purpose |
|------|-------|---------|
| `src/features/agreements/components/form/services/JanitorialForm.tsx` | ~350 | Mobile form |
| `src/features/agreements/components/form/services/JanitorialForm.styles.ts` | ~150 | RN styles |
| `src/features/admin/components/service-configs/EditJanitorialConfigModal.tsx` | ~300 | Admin modal |
| `src/features/admin/components/service-configs/EditJanitorialConfigModal.styles.ts` | ~100 | Modal styles |
| `src/services/api/endpoints/janitorial.api.ts` | ~60 | API service |
| `src/types/janitorial.types.ts` | ~80 | Type definitions |
| `src/utils/janitorialCalculations.ts` | ~150 | Shared calculations |

**Mobile Total: ~1,190 lines**

### 8.3 Backend Files (4 Files)

| File | Lines | Purpose |
|------|-------|---------|
| `scripts/serviceConfigs.json` | ~50 | Configuration data |
| `src/controllers/serviceConfigController.js` | ~100 | Config CRUD |
| `src/routes/serviceConfigRoutes.js` | ~30 | Route definitions |
| `src/models/ServiceConfig.js` | ~60 | MongoDB schema |

**Backend Total: ~240 lines**

### 8.4 Modified Files (6 Files)

| File | Changes | Lines |
|------|---------|-------|
| `src/components/FormFilling/FormFilling.tsx` | Add janitorial service option | ~30 |
| `src/components/FormFilling/Step3Services.tsx` | Import and render JanitorialForm | ~40 |
| `EnviroApp/src/features/agreements/components/form/Step3Services.tsx` | Mobile service integration | ~40 |
| `enviro-bckend/src/app.js` | Mount service config routes | ~5 |
| `src/components/admin/AdminDashboard.tsx` | Add janitorial config tab | ~20 |
| `EnviroApp/src/features/admin/screens/PricingDetailsScreen.tsx` | Add janitorial config | ~20 |

**Modified Total: ~155 lines**

### 8.5 Summary

| Category | Files | Lines |
|----------|-------|-------|
| Web Application | 12 | ~1,580 |
| Mobile Application | 8 | ~1,190 |
| Backend | 4 | ~240 |
| Modified Files | 6 | ~155 |
| **Total** | **30** | **~3,165** |

---

## 9. Testing & Validation

### 9.1 Calculation Accuracy Tests

| Test Case | Input | Expected Output |
|-----------|-------|-----------------|
| Basic Office | 4000 sqft, 7 visits, Office | $51,624 annual |
| Home Cleaning | 2000 sqft, 3 visits, Home | Hours: 4, Calculate proportionally |
| Restaurant | 3000 sqft, 5 visits, Restaurant | Hours: 3.75 |
| Business Place | 10000 sqft, 2 visits, Business | Hours: 5 |

### 9.2 Edge Cases

| Test | Scenario | Expected Behavior |
|------|----------|-------------------|
| Zero sqft | User enters 0 | Show validation error |
| Large sqft | 100,000 sqft | Calculate without overflow |
| Custom supplies | All supplies $0 | Calculate with $0 supplies |
| Max visits | 7 visits/week | Calculate correctly |
| Min contract | 2 months | Prorate supplies |

### 9.3 Admin Config Tests

| Test | Action | Expected |
|------|--------|----------|
| Update production rate | Change Office to 1200 | Form reflects new rate |
| Update labor cost | Change to $25/hour | Calculations update |
| Update gross profit | Change to 40% | Final price increases |
| Update supplies | Change mops to $600 | Total supplies updates |

### 9.4 Cross-Platform Consistency

| Test | Web Result | Mobile Result | Status |
|------|------------|---------------|--------|
| Same input | $51,624 | $51,624 | Must match |
| Rounding | 2 decimals | 2 decimals | Must match |
| Formulas | Weekly × 52 | Weekly × 52 | Must match |

---

## 10. Cost Breakdown

### 10.1 Development Hours

| Phase | Hours | Description |
|-------|-------|-------------|
| **Web Form Component** | 12 | JanitorialForm with all inputs and validation |
| **Web Calculation Hook** | 6 | useJanitorialCalc with memoization |
| **Web Types & Config** | 4 | Type definitions and constants |
| **Web Admin Config** | 8 | Admin panel for janitorial settings |
| **Web Styling** | 6 | CSS for form and admin |
| **Mobile Form Component** | 10 | React Native JanitorialForm |
| **Mobile Admin Modal** | 6 | EditJanitorialConfigModal |
| **Mobile Styling** | 4 | React Native styles |
| **Backend Config API** | 6 | Service config endpoints |
| **Integration** | 8 | Connect to agreements, admin dashboard |
| **Testing & QA** | 6 | Cross-platform testing, calculation validation |
| **Bug Fixes** | 4 | Edge cases and refinements |
| **Total** | **80 hours** | |

### 10.2 Cost Calculation

| Item | Calculation | Amount |
|------|-------------|--------|
| Development Hours | 80 hours × $23/hour | $1,840 |
| Code Review | 5% overhead | $92 |
| Contingency | ~3.5% buffer | $68 |
| **Total** | | **$2,000** |

### 10.3 Value Delivered

| Feature | Business Value |
|---------|----------------|
| Dynamic Pricing Calculator | Instant accurate quotes |
| Admin-Controlled Defaults | No code changes for rate updates |
| Gross Profit Accuracy | Correct 33% margin calculation |
| Cross-Platform Consistency | Same pricing web and mobile |
| Supply Tracking | Accurate cost accounting |
| Place Type Rates | Customized per location type |
| Real-Time Calculations | Immediate feedback for sales |

---

## Appendix A: Frequency Billing Conversions

| Frequency | Annual Occurrences | Monthly Factor |
|-----------|-------------------|----------------|
| Weekly | 52 | 4.333 |
| Bi-Weekly | 26 | 2.165 |
| Twice/Month | 24 | 2.0 |
| Monthly | 12 | 1.0 |
| Every 4 Weeks | 13 | 1.083 |
| Bi-Monthly | 6 | 0.5 |
| Quarterly | 4 | 0.333 |
| Bi-Annual | 2 | 0.167 |
| Annual | 1 | 0.083 |

---

## Appendix B: Default Supply Amounts

| Supply Item | Default Annual | Category |
|-------------|----------------|----------|
| Vacuums | $100 | Equipment |
| Mops | $500 | Cleaning Tools |
| Mop Buckets | $200 | Equipment |
| Dust Mops | $300 | Cleaning Tools |
| Microfiber | $0 | Consumables |
| Cleaning Products | $0 | Chemicals |
| Consumables | $0 | Miscellaneous |
| Miscellaneous | $0 | Other |
| **Total** | **$1,100** | |

---

## Appendix C: Gross Profit Formula Explanation

### Why Cost / 0.67 (Not Cost + 33%)

**Incorrect Method (Adding 33%):**
```
Cost: $34,588
Price: $34,588 × 1.33 = $46,002
Gross Profit: $46,002 - $34,588 = $11,414
Actual Margin: $11,414 / $46,002 = 24.8% ❌
```

**Correct Method (Dividing by 0.67):**
```
Cost: $34,588
Price: $34,588 / 0.67 = $51,624
Gross Profit: $51,624 - $34,588 = $17,036
Actual Margin: $17,036 / $51,624 = 33.0% ✓
```

The formula `Price = Cost / (1 - Margin%)` ensures the cost represents the correct percentage of the final price.

---

## Appendix D: Contract Term Supply Proration

### Recommended: Prorate by Months

For contracts not exactly 12 months:

```
Supplies = Annual Supplies × (Contract Months / 12)

Example (15-month contract):
$1,100 × (15 / 12) = $1,375
```

### Alternative: Round Up to Full Years

```
Supplies = Annual Supplies × CEILING(Contract Months / 12)

Example (15-month contract):
$1,100 × 2 = $2,200
```

**Recommendation:** Use proration by default with admin setting to switch if needed.

---

**Document Prepared By:** Development Team
**Review Status:** Ready for Client Approval
**Implementation Status:** Completed / Deployed

---

*This document serves as both a technical specification and a project deliverable summary for the Pure Janitorial Service implementation.*
