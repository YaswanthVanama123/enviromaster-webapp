# Commission Calculator & Tracking System
## Comprehensive Technical Proposal

**Project:** Enviromaster Web & Mobile Applications
**Module:** Sales Commission Calculator, Employee Commission Dashboard, Admin Commission Management
**Estimated Investment:** $5,000 USD
**Document Version:** 1.0
**Date:** May 2025

---

## Executive Summary

This document outlines the comprehensive implementation of a **Sales Commission Calculator and Tracking System** for the Enviromaster platform. The system provides sophisticated commission calculations based on quota performance, agreement terms, account types, and various bonuses/deductions. It includes:

1. **Real-time Commission Calculator** integrated into agreement creation
2. **"My Commissions" Dashboard** for employees to track their earnings
3. **Admin Commission Management** to view all employees' commission performance
4. **Historical Commission Tracking** with full audit trails
5. **Cross-platform Implementation** (Web + Mobile)

This is a **major feature implementation** requiring modifications across **60+ files**, integration with existing agreement workflows, new database schemas, and complex business rule implementation.

---

## Table of Contents

1. [Business Requirements](#1-business-requirements)
2. [Commission Calculation Rules](#2-commission-calculation-rules)
3. [Commission Calculator Integration](#3-commission-calculator-integration)
4. [My Commissions Dashboard (Employee)](#4-my-commissions-dashboard-employee)
5. [Admin Commission Management](#5-admin-commission-management)
6. [Web Application Implementation](#6-web-application-implementation)
7. [Mobile Application Implementation](#7-mobile-application-implementation)
8. [Backend Implementation](#8-backend-implementation)
9. [Database Schema Design](#9-database-schema-design)
10. [Files Created & Modified](#10-files-created--modified)
11. [Testing Requirements](#11-testing-requirements)
12. [Cost Breakdown](#12-cost-breakdown)

---

## 1. Business Requirements

### 1.1 Core Business Objectives

| Objective | Description | Priority |
|-----------|-------------|----------|
| Automated Commission Calculation | Calculate commissions in real-time during agreement creation | Critical |
| Quota-Based Rates | Different commission rates based on quota performance | Critical |
| Agreement Term Multipliers | Higher commissions for longer commitments | Critical |
| Account Type Adjustments | Adjust rates based on account proximity/type | High |
| Greenline Premium Bonus | Extra commission for premium pricing | High |
| Renewal Tracking | Bonus for long-term customer renewals | Medium |
| Inside Sales Split | Deduction when inside sales assists | High |
| Employee Dashboard | Personal commission tracking for each employee | Critical |
| Admin Overview | Complete visibility into all commission data | Critical |
| Historical Tracking | Full audit trail of all commissions | High |

### 1.2 User Stories

**As a Sales Employee:**
- I want to see my estimated commission while creating an agreement
- I want to view all my commissions in one dashboard
- I want to see my monthly/quarterly/annual earnings
- I want to understand how my commission was calculated
- I want to filter my commissions by date range

**As an Admin:**
- I want to see all employees' commissions in one place
- I want to compare employee performance
- I want to export commission reports
- I want to configure commission rules without code changes
- I want to see commission trends over time

### 1.3 Account Type Definitions

| Type | Description | Impact on Commission |
|------|-------------|---------------------|
| **Anchor** | High-value location ($200+/visit) | Base commission (no adjustment) |
| **Bread5** | Within 5 minutes of Anchor | Reduced commission (-1%) - easier to sell |
| **Bread15** | Within 15 minutes of Anchor | Slightly reduced (-0.5%) |
| **Pit** | New territory, not near Anchor | Base commission (no adjustment) |

---

## 2. Commission Calculation Rules

### 2.1 Quota-Based Commission Rates

| Performance Level | Commission Rate | Description |
|-------------------|-----------------|-------------|
| **Below Quota** | 3% | Under monthly quota target |
| **Above Quota** | 6% | Meeting or exceeding quota |
| **Double Quota** | 9% | Achieved 200%+ of quota |

### 2.2 Agreement Term Multipliers

| Agreement Term | Multiplier | Example |
|----------------|------------|---------|
| **3-Year** | 135% | 6% base → 8.1% effective |
| **1-Year** | 100% | 6% base → 6% effective |
| **MTM with Install** | 100% | 6% base → 6% effective |
| **MTM no Install** | 50% | 6% base → 3% effective |

### 2.3 Account Type Adjustments

| Account Type | Adjustment | Reasoning |
|--------------|------------|-----------|
| **Anchor** | 0% | Premium accounts, standard commission |
| **Bread5** | -1% | Easy proximity sell, reduced effort |
| **Bread15** | -0.5% | Moderate proximity benefit |
| **Pit** | 0% | New territory, standard commission |

### 2.4 Bonuses and Deductions

| Factor | Rate | Condition |
|--------|------|-----------|
| **Greenline Bonus** | +1% | Customer accepts 130%+ premium pricing |
| **Renewal Bonus** | +4% | Renewal with 2+ years as customer |
| **Inside Sales Deduction** | -3% | Inside sales team assisted the sale |

### 2.5 Complete Calculation Formula

```
┌─────────────────────────────────────────────────────────────────────┐
│                    COMMISSION CALCULATION FLOW                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  STEP 1: Base Rate (from Quota Level)                               │
│  ────────────────────────────────────                               │
│  Below Quota  → 3%                                                  │
│  Above Quota  → 6%                                                  │
│  Double Quota → 9%                                                  │
│         │                                                            │
│         ▼                                                            │
│  STEP 2: Apply Adjustments                                          │
│  ─────────────────────────                                          │
│  + Account Type Adjustment (0%, -0.5%, or -1%)                      │
│  + Greenline Bonus (+1% if premium pricing)                         │
│  + Renewal Bonus (+4% if 2+ year customer)                          │
│  + Inside Sales Deduction (-3% if assisted)                         │
│         │                                                            │
│         ▼                                                            │
│  STEP 3: Effective Base Rate                                        │
│  ──────────────────────────                                         │
│  Effective Rate = Base + All Adjustments                            │
│         │                                                            │
│         ▼                                                            │
│  STEP 4: Apply Agreement Multiplier                                 │
│  ────────────────────────────────                                   │
│  Final Rate = Effective Rate × (Multiplier / 100)                   │
│         │                                                            │
│         ▼                                                            │
│  STEP 5: Calculate Dollar Amounts                                   │
│  ─────────────────────────────                                      │
│  Monthly Commission = Monthly Value × (Final Rate / 100)            │
│  Annual Commission = Monthly Commission × 12                        │
│  Contract Commission = Monthly Commission × Contract Months         │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.6 Worked Examples

#### Example 1: Best Case Scenario
**Input:**
- Monthly Value: $1,000
- Quota Level: Double (9%)
- Agreement: 3-Year (135%)
- Account Type: Anchor (0%)
- Pricing: Greenline (+1%)
- Inside Sales: No (0%)

**Calculation:**
```
Effective Rate = 9% + 0% + 1% + 0% = 10%
Final Rate = 10% × 135% = 13.5%
Monthly Commission = $1,000 × 13.5% = $135
Annual Commission = $135 × 12 = $1,620
Contract Commission = $135 × 36 = $4,860
```

#### Example 2: Standard Scenario
**Input:**
- Monthly Value: $500
- Quota Level: Above (6%)
- Agreement: 1-Year (100%)
- Account Type: Anchor (0%)
- Pricing: Redline (0%)
- Inside Sales: No (0%)

**Calculation:**
```
Effective Rate = 6% + 0% + 0% + 0% = 6%
Final Rate = 6% × 100% = 6%
Monthly Commission = $500 × 6% = $30
Annual Commission = $30 × 12 = $360
Contract Commission = $30 × 12 = $360
```

#### Example 3: Challenging Scenario
**Input:**
- Monthly Value: $300
- Quota Level: Below (3%)
- Agreement: MTM no Install (50%)
- Account Type: Bread5 (-1%)
- Pricing: Redline (0%)
- Inside Sales: Yes (-3%)

**Calculation:**
```
Effective Rate = 3% - 1% + 0% - 3% = -1%
Final Rate = -1% × 50% = -0.5%
Monthly Commission = $300 × -0.5% = -$1.50
```
*Negative commission indicates deal parameters need adjustment*

---

## 3. Commission Calculator Integration

### 3.1 FormFilling Integration

The commission calculator is integrated directly into the agreement creation workflow, providing **real-time commission estimates** as sales staff enter deal details.

```
┌─────────────────────────────────────────────────────────────────────┐
│  AGREEMENT FORM - CONTRACT SUMMARY SECTION                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ╔═══════════════════════════════════════════════════════════════╗ │
│  ║  💰 COMMISSION CALCULATOR                                      ║ │
│  ╠═══════════════════════════════════════════════════════════════╣ │
│  ║                                                                 ║ │
│  ║  YOUR SELECTIONS                                                ║ │
│  ║  ─────────────────────────────────────────────────────────────  ║ │
│  ║  Quota Level:    [ Above Quota ▼ ]     Base Rate: 6%           ║ │
│  ║  Account Type:   [ Anchor      ▼ ]     Adjustment: 0%          ║ │
│  ║  Inside Sales:   [ ] Assisted by inside sales team             ║ │
│  ║                                                                 ║ │
│  ║  AUTO-DETECTED FROM AGREEMENT                                   ║ │
│  ║  ─────────────────────────────────────────────────────────────  ║ │
│  ║  Monthly Value:      $500.00    (from contract total)          ║ │
│  ║  Agreement Term:     1-Year     (from contract months)         ║ │
│  ║  Pricing Line:       Greenline  (from pricing indicator)       ║ │
│  ║                                                                 ║ │
│  ║  ═════════════════════════════════════════════════════════════  ║ │
│  ║  COMMISSION BREAKDOWN                                           ║ │
│  ║  ─────────────────────────────────────────────────────────────  ║ │
│  ║  Base Rate (Above Quota):           6.00%                      ║ │
│  ║  Account Type Adjustment:          +0.00%                      ║ │
│  ║  Greenline Bonus:                  +1.00%                      ║ │
│  ║  Renewal Bonus:                    +0.00%                      ║ │
│  ║  Inside Sales Deduction:           -0.00%                      ║ │
│  ║  ─────────────────────────────────────────────────────────────  ║ │
│  ║  Effective Base Rate:               7.00%                      ║ │
│  ║  Agreement Multiplier (1-Year):    ×100%                       ║ │
│  ║  ─────────────────────────────────────────────────────────────  ║ │
│  ║  FINAL COMMISSION RATE:             7.00%                      ║ │
│  ║                                                                 ║ │
│  ║  ═════════════════════════════════════════════════════════════  ║ │
│  ║  YOUR ESTIMATED EARNINGS                                        ║ │
│  ║  ─────────────────────────────────────────────────────────────  ║ │
│  ║  │  Monthly Commission:    │    $35.00   │                     ║ │
│  ║  │  Annual Commission:     │   $420.00   │                     ║ │
│  ║  │  Contract Commission:   │   $420.00   │  ← You'll earn      ║ │
│  ║  └─────────────────────────┴─────────────┘                     ║ │
│  ║                                                                 ║ │
│  ╚═══════════════════════════════════════════════════════════════╝ │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 State Management

```typescript
// Commission state lifted to FormFillingContent for save access
interface CommissionState {
  quotaLevel: 'below' | 'above' | 'double';
  accountType: 'Anchor' | 'Bread5' | 'Bread15' | 'Pit';
  isInsideSales: boolean;
}

// Commission result calculated in ContractSummary
interface CommissionResult {
  monthlyValue: number;
  agreementTerm: AgreementTerm;
  pricingLine: PricingLine;
  baseRate: number;
  agreementMultiplier: number;
  accountTypeAdjustment: number;
  greenlineBonus: number;
  renewalBonus: number;
  insideSalesDeduction: number;
  effectiveBaseRate: number;
  finalCommissionRate: number;
  monthlyCommission: number;
  annualCommission: number;
  contractCommission: number;
}
```

### 3.3 Saving Commission with Agreement

When an agreement is saved, the complete commission data is stored:

```javascript
// In collectFormData():
{
  commission: commissionResult ? {
    input: {
      monthlyValue: commissionResult.monthlyValue,
      agreementTerm: commissionResult.agreementTerm,
      accountType: commissionState.accountType,
      pricingLine: commissionResult.pricingLine,
      quotaLevel: commissionState.quotaLevel,
      businessType: 'new',
      yearsAsCustomer: 0,
      isInsideSales: commissionState.isInsideSales,
    },
    breakdown: {
      baseRate: commissionResult.baseRate,
      agreementMultiplier: commissionResult.agreementMultiplier,
      accountTypeAdjustment: commissionResult.accountTypeAdjustment,
      greenlineBonus: commissionResult.greenlineBonus,
      renewalBonus: commissionResult.renewalBonus,
      insideSalesDeduction: commissionResult.insideSalesDeduction,
    },
    finalCommissionRate: commissionResult.finalCommissionRate,
    monthlyCommission: commissionResult.monthlyCommission,
    annualCommission: commissionResult.annualCommission,
    contractCommission: commissionResult.contractCommission,
  } : null,
}
```

---

## 4. My Commissions Dashboard (Employee)

### 4.1 Overview

The **"My Commissions"** dashboard provides employees with a comprehensive view of their commission earnings, trends, and detailed breakdowns.

### 4.2 Dashboard Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│  MY COMMISSIONS                                          [Export ▼] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │  THIS MONTH │  │ THIS QUARTER│  │  THIS YEAR  │  │   PENDING   │ │
│  │   $2,450    │  │   $7,890    │  │  $28,450    │  │   $1,200    │ │
│  │   ▲ 12%     │  │   ▲ 8%      │  │   ▲ 15%     │  │  3 deals    │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │
│                                                                      │
│  ═══════════════════════════════════════════════════════════════   │
│  COMMISSION TREND                          [ Month ▼ ] [ 2025 ▼ ]   │
│  ───────────────────────────────────────────────────────────────   │
│  $4k │                                           ╭─╮               │
│      │                               ╭─╮    ╭─╮  │ │               │
│  $3k │          ╭─╮    ╭─╮    ╭─╮   │ │    │ │  │ │               │
│      │     ╭─╮  │ │    │ │    │ │   │ │    │ │  │ │               │
│  $2k │╭─╮  │ │  │ │    │ │    │ │   │ │    │ │  │ │               │
│      │ │   │ │  │ │    │ │    │ │   │ │    │ │  │ │               │
│  $1k ├─┴───┴─┴──┴─┴────┴─┴────┴─┴───┴─┴────┴─┴──┴─┴───────────   │
│       Jan  Feb  Mar  Apr  May  Jun  Jul  Aug  Sep  Oct  Nov  Dec   │
│                                                                      │
│  ═══════════════════════════════════════════════════════════════   │
│  RECENT COMMISSIONS                    [ Filter: All Time ▼ ]       │
│  ───────────────────────────────────────────────────────────────   │
│  │ Date       │ Customer          │ Monthly   │ Contract   │ Status│
│  ├────────────┼───────────────────┼───────────┼────────────┼───────│
│  │ May 15     │ ABC Restaurant    │ $135.00   │ $4,860.00  │ ✓ Paid│
│  │ May 12     │ XYZ Office Park   │ $47.25    │ $1,701.00  │ ⏳ Pend│
│  │ May 10     │ Quick Mart #42    │ $30.00    │   $360.00  │ ✓ Paid│
│  │ May 08     │ Downtown Deli     │ $81.00    │ $2,916.00  │ ✓ Paid│
│  │ May 05     │ Harbor Hotel      │ $270.00   │ $9,720.00  │ ⏳ Pend│
│  │ May 01     │ Metro Clinic      │ $22.50    │   $270.00  │ ✓ Paid│
│  └────────────┴───────────────────┴───────────┴────────────┴───────┘
│                                                                      │
│  ═══════════════════════════════════════════════════════════════   │
│  COMMISSION BREAKDOWN BY TYPE                                        │
│  ───────────────────────────────────────────────────────────────   │
│  │ Account Type    │ # Deals │ Total Commission │ Avg per Deal │   │
│  ├─────────────────┼─────────┼──────────────────┼──────────────│   │
│  │ Anchor          │ 15      │ $12,450.00       │ $830.00      │   │
│  │ Bread5          │ 8       │  $3,200.00       │ $400.00      │   │
│  │ Bread15         │ 5       │  $2,100.00       │ $420.00      │   │
│  │ Pit             │ 3       │  $1,800.00       │ $600.00      │   │
│  └─────────────────┴─────────┴──────────────────┴──────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.3 Key Features

| Feature | Description |
|---------|-------------|
| **Summary Cards** | Quick view of earnings by period |
| **Trend Chart** | Visual representation of earnings over time |
| **Commission List** | Detailed list of all commissions with status |
| **Filters** | Filter by date range, status, account type |
| **Breakdown Analysis** | Performance by account type, agreement term |
| **Export** | Download commission report as CSV/PDF |
| **Calculation Details** | Click to see full calculation breakdown |

### 4.4 Commission Detail Modal

```
┌─────────────────────────────────────────────────────────────────────┐
│  COMMISSION DETAILS                                           [×]   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Agreement: ABC Restaurant - Service Agreement                      │
│  Date: May 15, 2025                                                 │
│  Status: ✓ Paid                                                     │
│                                                                      │
│  ═══════════════════════════════════════════════════════════════   │
│  INPUT VALUES                                                        │
│  ───────────────────────────────────────────────────────────────   │
│  Monthly Value:        $1,000.00                                    │
│  Contract Months:      36 (3-Year Agreement)                        │
│  Account Type:         Anchor                                       │
│  Pricing Line:         Greenline                                    │
│  Quota Level:          Double Quota                                 │
│  Business Type:        New Business                                 │
│  Inside Sales:         No                                           │
│                                                                      │
│  ═══════════════════════════════════════════════════════════════   │
│  CALCULATION BREAKDOWN                                               │
│  ───────────────────────────────────────────────────────────────   │
│  Base Rate (Double Quota):              9.00%                       │
│  + Account Type (Anchor):              +0.00%                       │
│  + Greenline Bonus:                    +1.00%                       │
│  + Renewal Bonus:                      +0.00%                       │
│  - Inside Sales:                       -0.00%                       │
│  ───────────────────────────────────────────────────────────────   │
│  Effective Base Rate:                  10.00%                       │
│  × Agreement Multiplier (3-Year):      ×135%                        │
│  ───────────────────────────────────────────────────────────────   │
│  FINAL RATE:                           13.50%                       │
│                                                                      │
│  ═══════════════════════════════════════════════════════════════   │
│  EARNINGS                                                            │
│  ───────────────────────────────────────────────────────────────   │
│  Monthly Commission:     $1,000 × 13.5% =        $135.00            │
│  Annual Commission:      $135 × 12 =           $1,620.00            │
│  Contract Commission:    $135 × 36 =           $4,860.00            │
│                                                                      │
│                                                 [Close]              │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 5. Admin Commission Management

### 5.1 Overview

The **Admin Commission Management** screen provides complete visibility into all employees' commission performance, enabling management oversight and reporting.

### 5.2 Admin Dashboard Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│  ADMIN: COMMISSION MANAGEMENT                    [Export ▼] [⚙️]    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  COMPANY OVERVIEW                                    May 2025        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │TOTAL COMMIS.│  │  # OF DEALS │  │  AVG/DEAL   │  │ TOP PERFORM │ │
│  │  $45,670    │  │     156     │  │   $292.76   │  │ John Smith  │ │
│  │   ▲ 18%     │  │   ▲ 24      │  │   ▲ $12     │  │  $8,450     │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │
│                                                                      │
│  ═══════════════════════════════════════════════════════════════   │
│  EMPLOYEE PERFORMANCE                   [ This Month ▼ ] [ All ▼ ]  │
│  ───────────────────────────────────────────────────────────────   │
│  │ Employee        │ Deals │ Commission   │ Avg Rate │ Trend    │  │
│  ├─────────────────┼───────┼──────────────┼──────────┼──────────│  │
│  │ 🥇 John Smith   │  23   │  $8,450.00   │   8.2%   │ ▲ +15%   │  │
│  │ 🥈 Sarah Jones  │  19   │  $6,890.00   │   7.8%   │ ▲ +8%    │  │
│  │ 🥉 Mike Wilson  │  18   │  $5,670.00   │   7.1%   │ ▲ +12%   │  │
│  │    Lisa Brown   │  15   │  $4,320.00   │   6.5%   │ ▼ -3%    │  │
│  │    Tom Davis    │  12   │  $3,890.00   │   7.2%   │ ▲ +5%    │  │
│  │    Amy Chen     │  10   │  $2,450.00   │   5.8%   │ ▲ +2%    │  │
│  └─────────────────┴───────┴──────────────┴──────────┴──────────┘  │
│                                                [View All Employees]  │
│                                                                      │
│  ═══════════════════════════════════════════════════════════════   │
│  COMMISSION BY ACCOUNT TYPE                                          │
│  ───────────────────────────────────────────────────────────────   │
│  Anchor     ████████████████████████████████████░░░░  65% │ $29,686 │
│  Bread5     ██████████████░░░░░░░░░░░░░░░░░░░░░░░░░░  20% │  $9,134 │
│  Bread15    ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  10% │  $4,567 │
│  Pit        ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   5% │  $2,283 │
│                                                                      │
│  ═══════════════════════════════════════════════════════════════   │
│  COMMISSION BY AGREEMENT TERM                                        │
│  ───────────────────────────────────────────────────────────────   │
│  3-Year     ████████████████████████████████████████  55% │ $25,119 │
│  1-Year     ██████████████████████░░░░░░░░░░░░░░░░░░  30% │ $13,701 │
│  MTM+Inst   ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  10% │  $4,567 │
│  MTM-NoInst ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   5% │  $2,283 │
│                                                                      │
│  ═══════════════════════════════════════════════════════════════   │
│  RECENT COMMISSION ACTIVITY                   [View Full History]   │
│  ───────────────────────────────────────────────────────────────   │
│  │ Date     │ Employee     │ Customer        │ Commission │ Status │
│  ├──────────┼──────────────┼─────────────────┼────────────┼────────│
│  │ May 15   │ John Smith   │ ABC Restaurant  │ $4,860.00  │ ✓ Paid │
│  │ May 15   │ Sarah Jones  │ Metro Office    │ $1,701.00  │ ⏳ Pend │
│  │ May 14   │ Mike Wilson  │ Harbor Hotel    │ $9,720.00  │ ⏳ Pend │
│  │ May 14   │ John Smith   │ Quick Mart      │   $360.00  │ ✓ Paid │
│  │ May 13   │ Lisa Brown   │ Downtown Deli   │ $2,916.00  │ ✓ Paid │
│  └──────────┴──────────────┴─────────────────┴────────────┴────────┘
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.3 Employee Detail View

```
┌─────────────────────────────────────────────────────────────────────┐
│  ← Back to Overview          JOHN SMITH - COMMISSION DETAILS        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │  👤 John Smith                                                 │ │
│  │  Sales Representative                                          │ │
│  │  Employee since: January 2023                                  │ │
│  │  Total Career Commissions: $85,670.00                         │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  PERFORMANCE METRICS                                [ 2025 ▼ ]      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │  YTD TOTAL  │  │ AVG MONTHLY │  │ TOTAL DEALS │  │  AVG RATE   │ │
│  │  $28,450    │  │   $5,690    │  │     89      │  │    7.8%     │ │
│  │   ▲ 22%     │  │   ▲ 18%     │  │   ▲ 15      │  │   ▲ 0.3%    │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │
│                                                                      │
│  ═══════════════════════════════════════════════════════════════   │
│  MONTHLY EARNINGS                                                    │
│  ───────────────────────────────────────────────────────────────   │
│       │                                        ╭─╮                  │
│  $8k  │                          ╭─╮    ╭─╮   │ │                  │
│       │     ╭─╮    ╭─╮    ╭─╮   │ │    │ │   │ │                  │
│  $6k  │╭─╮  │ │    │ │    │ │   │ │    │ │   │ │                  │
│       │ │   │ │    │ │    │ │   │ │    │ │   │ │                  │
│  $4k  ├─┴───┴─┴────┴─┴────┴─┴───┴─┴────┴─┴───┴─┴──────────────   │
│        Jan  Feb  Mar  Apr  May  Jun  Jul  Aug  Sep                  │
│                                                                      │
│  ═══════════════════════════════════════════════════════════════   │
│  ALL COMMISSIONS                           [ Filter: 2025 ▼ ]       │
│  ───────────────────────────────────────────────────────────────   │
│  │ Date     │ Customer        │ Term    │ Rate   │ Commission│    │
│  ├──────────┼─────────────────┼─────────┼────────┼───────────│    │
│  │ May 15   │ ABC Restaurant  │ 3-Year  │ 13.5%  │ $4,860.00 │    │
│  │ May 12   │ XYZ Office      │ 1-Year  │  7.0%  │ $1,701.00 │    │
│  │ May 08   │ Downtown Deli   │ 3-Year  │  8.1%  │ $2,916.00 │    │
│  │ May 01   │ Metro Clinic    │ MTM     │  6.0%  │   $270.00 │    │
│  │ Apr 28   │ Harbor Hotel    │ 3-Year  │ 13.5%  │ $9,720.00 │    │
│  └──────────┴─────────────────┴─────────┴────────┴───────────┘    │
│                                               [1] 2  3  4  Next →   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.4 Admin Features

| Feature | Description |
|---------|-------------|
| **Company Overview** | Total commissions, deal count, averages |
| **Employee Ranking** | Leaderboard with performance trends |
| **Account Type Analysis** | Commission distribution by type |
| **Agreement Term Analysis** | Performance by contract length |
| **Employee Drill-Down** | Detailed view per employee |
| **Date Range Filtering** | View by month, quarter, year, custom |
| **Export Reports** | CSV/PDF for payroll integration |
| **Commission Rules Config** | Adjust rates without code changes |

### 5.5 Commission Rules Configuration

```
┌─────────────────────────────────────────────────────────────────────┐
│  COMMISSION RULES CONFIGURATION                              [Save] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  QUOTA-BASED RATES                                                   │
│  ───────────────────────────────────────────────────────────────   │
│  Below Quota:     [ 3   ] %                                         │
│  Above Quota:     [ 6   ] %                                         │
│  Double Quota:    [ 9   ] %                                         │
│                                                                      │
│  AGREEMENT MULTIPLIERS                                               │
│  ───────────────────────────────────────────────────────────────   │
│  3-Year:          [ 135 ] %                                         │
│  1-Year:          [ 100 ] %                                         │
│  MTM with Install:[ 100 ] %                                         │
│  MTM no Install:  [ 50  ] %                                         │
│                                                                      │
│  ACCOUNT TYPE ADJUSTMENTS                                            │
│  ───────────────────────────────────────────────────────────────   │
│  Anchor:          [ 0    ] %                                        │
│  Bread5:          [ -1   ] %                                        │
│  Bread15:         [ -0.5 ] %                                        │
│  Pit:             [ 0    ] %                                        │
│                                                                      │
│  BONUSES & DEDUCTIONS                                                │
│  ───────────────────────────────────────────────────────────────   │
│  Greenline Bonus:       [ 1  ] %                                    │
│  Renewal Bonus:         [ 4  ] %                                    │
│  Renewal Min Years:     [ 2  ] years                                │
│  Inside Sales Deduction:[ -3 ] %                                    │
│  Anchor Min Monthly:    [ 200] $                                    │
│                                                                      │
│                                    [Reset to Defaults]    [Save]    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 6. Web Application Implementation

### 6.1 Component Structure

```
/enviromaster/src/
├── components/
│   ├── admin/
│   │   └── commissions/
│   │       ├── CommissionsTab.tsx              # Main admin tab
│   │       ├── CommissionsTab.css              # Styling
│   │       ├── CommissionOverview.tsx          # Company summary cards
│   │       ├── EmployeeCommissionList.tsx      # Employee leaderboard
│   │       ├── EmployeeCommissionDetail.tsx    # Individual employee view
│   │       ├── CommissionActivityFeed.tsx      # Recent activity
│   │       ├── CommissionCharts.tsx            # Charts and graphs
│   │       ├── CommissionRulesManager.tsx      # Rules configuration
│   │       └── CommissionExport.tsx            # Export functionality
│   │
│   ├── employee/
│   │   └── commissions/
│   │       ├── MyCommissionsPage.tsx           # Employee dashboard
│   │       ├── MyCommissionsPage.css           # Styling
│   │       ├── CommissionSummaryCards.tsx      # Summary stats
│   │       ├── CommissionTrendChart.tsx        # Earnings trend
│   │       ├── CommissionList.tsx              # Commission history
│   │       ├── CommissionDetailModal.tsx       # Calculation detail
│   │       └── CommissionFilters.tsx           # Filter controls
│   │
│   └── FormFilling/
│       └── ContractSummary/
│           └── CommissionCalculator.tsx        # In-form calculator
│
├── backendservice/
│   ├── api/
│   │   └── commissionApi.ts                    # API service
│   ├── hooks/
│   │   ├── useCommissionCalc.ts                # Calculation hook
│   │   └── useMyCommissions.ts                 # Employee data hook
│   └── types/
│       └── commission.types.ts                 # Type definitions
```

### 6.2 Key Components

#### CommissionsTab.tsx (Admin - 500+ lines)

```typescript
// Features:
- Overview cards with company totals
- Employee performance table with sorting
- Commission by account type chart
- Commission by agreement term chart
- Recent activity feed
- Date range filtering
- Export functionality
- Click to drill down into employee details
```

#### MyCommissionsPage.tsx (Employee - 400+ lines)

```typescript
// Features:
- Personal summary cards
- Earnings trend chart
- Commission history with search/filter
- Click for calculation details
- Export personal report
- Pending vs paid status
```

#### CommissionCalculator.tsx (FormFilling - 300+ lines)

```typescript
// Features:
- Quota level selector
- Account type selector
- Inside sales checkbox
- Auto-derived values from agreement
- Real-time calculation display
- Full breakdown visualization
- Earnings projection
```

### 6.3 API Services

```typescript
// commissionApi.ts

export const commissionApi = {
  // Employee endpoints
  getMyCommissions(filters: CommissionFilters): Promise<CommissionListResponse>;
  getMyCommissionStats(period: string): Promise<CommissionStats>;
  getCommissionDetail(id: string): Promise<CommissionDetail>;

  // Admin endpoints
  getAllCommissions(filters: CommissionFilters): Promise<CommissionListResponse>;
  getCompanyStats(period: string): Promise<CompanyCommissionStats>;
  getEmployeeCommissions(employeeId: string, filters: CommissionFilters): Promise<CommissionListResponse>;
  getEmployeeStats(employeeId: string, period: string): Promise<EmployeeCommissionStats>;

  // Configuration
  getCommissionRules(): Promise<CommissionRules>;
  updateCommissionRules(rules: CommissionRules): Promise<CommissionRules>;

  // Export
  exportCommissions(format: 'csv' | 'pdf', filters: CommissionFilters): Promise<Blob>;
};
```

---

## 7. Mobile Application Implementation

### 7.1 Component Structure

```
/EnviroApp/src/features/
├── commissions/
│   ├── screens/
│   │   ├── MyCommissionsScreen.tsx             # Employee dashboard
│   │   └── CommissionDetailScreen.tsx          # Detail view
│   │
│   ├── components/
│   │   ├── CommissionSummaryCards.tsx          # Summary stats
│   │   ├── CommissionTrendChart.tsx            # Trend visualization
│   │   ├── CommissionListItem.tsx              # List item
│   │   ├── CommissionBreakdown.tsx             # Calculation detail
│   │   └── CommissionFilters.tsx               # Filter sheet
│   │
│   └── hooks/
│       ├── useMyCommissions.ts                 # Data fetching
│       └── useCommissionStats.ts               # Stats calculation
│
├── admin/
│   └── components/
│       └── commissions/
│           ├── AdminCommissionsSection.tsx     # Admin overview
│           ├── EmployeeCommissionCard.tsx      # Employee summary
│           └── CommissionRulesForm.tsx         # Rules config
│
└── agreements/
    └── components/
        └── form/
            └── CommissionCalculatorSection.tsx # In-form calculator
```

### 7.2 Mobile-Specific Features

| Feature | Implementation |
|---------|----------------|
| Pull-to-Refresh | Refresh commission data |
| Infinite Scroll | Load more commissions on scroll |
| Bottom Sheet Filters | Filter options in modal sheet |
| Swipe Actions | Quick actions on list items |
| Charts | react-native-chart-kit |
| Haptic Feedback | Confirmation on actions |

---

## 8. Backend Implementation

### 8.1 Models

#### CommissionRules.js

```javascript
const CommissionRulesSchema = new mongoose.Schema({
  version: { type: String, required: true },
  isActive: { type: Boolean, default: true },

  quotaRates: {
    below: { type: Number, default: 3 },
    above: { type: Number, default: 6 },
    double: { type: Number, default: 9 },
  },

  agreementMultipliers: {
    '3-year': { type: Number, default: 135 },
    '1-year': { type: Number, default: 100 },
    'MTM-with-install': { type: Number, default: 100 },
    'MTM-no-install': { type: Number, default: 50 },
  },

  accountTypeAdjustments: {
    Anchor: { type: Number, default: 0 },
    Bread5: { type: Number, default: -1 },
    Bread15: { type: Number, default: -0.5 },
    Pit: { type: Number, default: 0 },
  },

  greenlineBonus: { type: Number, default: 1 },
  renewalBonusRate: { type: Number, default: 4 },
  renewalMinYears: { type: Number, default: 2 },
  insideSalesDeduction: { type: Number, default: -3 },
  anchorMinMonthlyValue: { type: Number, default: 200 },

}, { timestamps: true });
```

#### CommissionRecord.js

```javascript
const CommissionRecordSchema = new mongoose.Schema({
  agreementId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CustomerHeaderDoc',
    required: true,
  },
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
  },
  employeeUsername: { type: String, required: true },

  customerName: { type: String, required: true },

  input: {
    monthlyValue: { type: Number, required: true },
    agreementTerm: { type: String, enum: ['3-year', '1-year', 'MTM-with-install', 'MTM-no-install'] },
    accountType: { type: String, enum: ['Anchor', 'Bread5', 'Bread15', 'Pit'] },
    pricingLine: { type: String, enum: ['Redline', 'Greenline'] },
    quotaLevel: { type: String, enum: ['below', 'above', 'double'] },
    businessType: { type: String, enum: ['new', 'renewal'] },
    yearsAsCustomer: { type: Number, default: 0 },
    isInsideSales: { type: Boolean, default: false },
  },

  breakdown: {
    baseRate: { type: Number },
    agreementMultiplier: { type: Number },
    accountTypeAdjustment: { type: Number },
    greenlineBonus: { type: Number },
    renewalBonus: { type: Number },
    insideSalesDeduction: { type: Number },
  },

  finalCommissionRate: { type: Number, required: true },
  monthlyCommission: { type: Number, required: true },
  annualCommission: { type: Number, required: true },
  contractCommission: { type: Number, required: true },

  status: {
    type: String,
    enum: ['pending', 'approved', 'paid', 'cancelled'],
    default: 'pending',
  },

  paidAt: { type: Date },

}, { timestamps: true });

// Indexes for efficient queries
CommissionRecordSchema.index({ employeeId: 1, createdAt: -1 });
CommissionRecordSchema.index({ status: 1 });
CommissionRecordSchema.index({ createdAt: -1 });
```

### 8.2 Controllers

#### commissionController.js

```javascript
// Employee endpoints
export const getMyCommissions = async (req, res) => {
  // List employee's own commissions with filters
};

export const getMyStats = async (req, res) => {
  // Get employee's commission statistics
};

// Admin endpoints
export const getAllCommissions = async (req, res) => {
  // List all commissions with pagination and filters
};

export const getCompanyStats = async (req, res) => {
  // Aggregate company-wide commission statistics
};

export const getEmployeeCommissions = async (req, res) => {
  // Get specific employee's commissions
};

export const getEmployeeStats = async (req, res) => {
  // Get specific employee's statistics
};

// Configuration
export const getActiveRules = async (req, res) => {
  // Get current commission rules
};

export const updateRules = async (req, res) => {
  // Update commission rules (admin only)
};

// Calculation
export const calculateCommission = async (req, res) => {
  // Server-side commission calculation for validation
};

// Status management
export const updateCommissionStatus = async (req, res) => {
  // Update commission status (pending → approved → paid)
};

// Export
export const exportCommissions = async (req, res) => {
  // Generate CSV/PDF export
};
```

### 8.3 Routes

```javascript
// commissionRoutes.js

// Employee routes (require auth)
router.get('/my', requireAuth, getMyCommissions);
router.get('/my/stats', requireAuth, getMyStats);

// Admin routes (require admin)
router.get('/all', requireAdmin, getAllCommissions);
router.get('/company/stats', requireAdmin, getCompanyStats);
router.get('/employee/:employeeId', requireAdmin, getEmployeeCommissions);
router.get('/employee/:employeeId/stats', requireAdmin, getEmployeeStats);

// Configuration (admin only)
router.get('/rules/active', requireAdmin, getActiveRules);
router.put('/rules/:id', requireAdmin, updateRules);

// Calculation (any authenticated user)
router.post('/calculate', requireAuth, calculateCommission);

// Status management (admin only)
router.patch('/:id/status', requireAdmin, updateCommissionStatus);

// Export
router.get('/export', requireAdmin, exportCommissions);
```

---

## 9. Database Schema Design

### 9.1 Collections

| Collection | Purpose | Indexes |
|------------|---------|---------|
| `commissionrules` | Store commission configuration | isActive |
| `commissionrecords` | Individual commission records | employeeId, status, createdAt |
| `customerheaderdocs` | Agreements with embedded commission | createdBy, updatedBy |

### 9.2 Commission Data in Agreements

```javascript
// CustomerHeaderDoc.payload.commission schema
{
  input: {
    monthlyValue: Number,
    agreementTerm: String,
    accountType: String,
    pricingLine: String,
    quotaLevel: String,
    businessType: String,
    yearsAsCustomer: Number,
    isInsideSales: Boolean,
  },
  breakdown: {
    baseRate: Number,
    agreementMultiplier: Number,
    accountTypeAdjustment: Number,
    greenlineBonus: Number,
    renewalBonus: Number,
    insideSalesDeduction: Number,
  },
  finalCommissionRate: Number,
  monthlyCommission: Number,
  annualCommission: Number,
  contractCommission: Number,
}
```

### 9.3 Data Migration

```javascript
// Migration for existing agreements without commission data
db.customerheaderdocs.updateMany(
  { 'payload.commission': { $exists: false } },
  { $set: { 'payload.commission': null } }
);
```

---

## 10. Files Created & Modified

### 10.1 Web Application - New Files (25 Files)

| File | Lines | Purpose |
|------|-------|---------|
| **Admin Components** | | |
| `src/components/admin/commissions/CommissionsTab.tsx` | ~500 | Main admin tab |
| `src/components/admin/commissions/CommissionsTab.css` | ~300 | Styling |
| `src/components/admin/commissions/CommissionOverview.tsx` | ~150 | Summary cards |
| `src/components/admin/commissions/EmployeeCommissionList.tsx` | ~250 | Employee table |
| `src/components/admin/commissions/EmployeeCommissionDetail.tsx` | ~300 | Employee detail |
| `src/components/admin/commissions/CommissionActivityFeed.tsx` | ~150 | Activity list |
| `src/components/admin/commissions/CommissionCharts.tsx` | ~200 | Charts |
| `src/components/admin/commissions/CommissionRulesManager.tsx` | ~250 | Rules config |
| `src/components/admin/commissions/CommissionExport.tsx` | ~100 | Export modal |
| `src/components/admin/commissions/index.ts` | ~10 | Exports |
| **Employee Components** | | |
| `src/components/employee/commissions/MyCommissionsPage.tsx` | ~400 | Employee dashboard |
| `src/components/employee/commissions/MyCommissionsPage.css` | ~250 | Styling |
| `src/components/employee/commissions/CommissionSummaryCards.tsx` | ~100 | Summary stats |
| `src/components/employee/commissions/CommissionTrendChart.tsx` | ~150 | Trend chart |
| `src/components/employee/commissions/CommissionList.tsx` | ~200 | History list |
| `src/components/employee/commissions/CommissionDetailModal.tsx` | ~200 | Detail modal |
| `src/components/employee/commissions/CommissionFilters.tsx` | ~100 | Filters |
| `src/components/employee/commissions/index.ts` | ~10 | Exports |
| **FormFilling Integration** | | |
| `src/components/FormFilling/ContractSummary/CommissionCalculator.tsx` | ~300 | Calculator |
| `src/components/FormFilling/ContractSummary/CommissionCalculator.css` | ~150 | Styling |
| **API & Types** | | |
| `src/backendservice/api/commissionApi.ts` | ~200 | API service |
| `src/backendservice/hooks/useCommissionCalc.ts` | ~150 | Calc hook |
| `src/backendservice/hooks/useMyCommissions.ts` | ~100 | Data hook |
| `src/backendservice/types/commission.types.ts` | ~150 | Types |

**Web New Files Total: ~4,570 lines**

### 10.2 Web Application - Modified Files (8 Files)

| File | Changes | Lines |
|------|---------|-------|
| `src/App.tsx` | Add commission routes | ~30 |
| `src/components/admin/AdminDashboard.tsx` | Add Commissions tab | ~40 |
| `src/components/FormFilling/FormFilling.tsx` | Lift commission state | ~80 |
| `src/components/FormFilling/ContractSummary.tsx` | Add calculator | ~100 |
| `src/components/Navigation.tsx` | Add My Commissions link | ~20 |
| `src/backendservice/api/index.ts` | Export commission API | ~5 |
| `src/backendservice/hooks/index.ts` | Export hooks | ~5 |
| `src/backendservice/types/api.types.ts` | Add commission types | ~30 |

**Web Modified Total: ~310 lines**

### 10.3 Mobile Application - New Files (18 Files)

| File | Lines | Purpose |
|------|-------|---------|
| **Screens** | | |
| `src/features/commissions/screens/MyCommissionsScreen.tsx` | ~350 | Dashboard |
| `src/features/commissions/screens/CommissionDetailScreen.tsx` | ~250 | Detail view |
| `src/features/commissions/screens/styles.ts` | ~200 | Styling |
| **Components** | | |
| `src/features/commissions/components/CommissionSummaryCards.tsx` | ~100 | Summary |
| `src/features/commissions/components/CommissionTrendChart.tsx` | ~150 | Chart |
| `src/features/commissions/components/CommissionListItem.tsx` | ~100 | List item |
| `src/features/commissions/components/CommissionBreakdown.tsx` | ~150 | Breakdown |
| `src/features/commissions/components/CommissionFilters.tsx` | ~100 | Filters |
| `src/features/commissions/components/index.ts` | ~10 | Exports |
| **Admin Components** | | |
| `src/features/admin/components/commissions/AdminCommissionsSection.tsx` | ~300 | Admin view |
| `src/features/admin/components/commissions/EmployeeCommissionCard.tsx` | ~150 | Employee card |
| `src/features/admin/components/commissions/CommissionRulesForm.tsx` | ~200 | Rules form |
| `src/features/admin/components/commissions/styles.ts` | ~150 | Styling |
| **Hooks & API** | | |
| `src/features/commissions/hooks/useMyCommissions.ts` | ~100 | Data hook |
| `src/features/commissions/hooks/useCommissionStats.ts` | ~80 | Stats hook |
| `src/services/api/endpoints/commission.api.ts` | ~150 | API service |
| `src/types/commission.types.ts` | ~120 | Types |
| **Agreement Integration** | | |
| `src/features/agreements/components/form/CommissionCalculatorSection.tsx` | ~250 | Calculator |

**Mobile New Files Total: ~2,910 lines**

### 10.4 Mobile Application - Modified Files (5 Files)

| File | Changes | Lines |
|------|---------|-------|
| `src/navigation/MainNavigator.tsx` | Add commission screens | ~30 |
| `src/features/admin/screens/PricingDetailsScreen.tsx` | Add commission tab | ~30 |
| `src/features/agreements/components/form/Step4Summary.tsx` | Add calculator | ~50 |
| `src/services/api/index.ts` | Export commission API | ~5 |
| `src/types/index.ts` | Export types | ~5 |

**Mobile Modified Total: ~120 lines**

### 10.5 Backend - New Files (8 Files)

| File | Lines | Purpose |
|------|-------|---------|
| `src/models/CommissionRules.js` | ~100 | Rules schema |
| `src/models/CommissionRecord.js` | ~120 | Record schema |
| `src/controllers/commissionController.js` | ~400 | All logic |
| `src/routes/commissionRoutes.js` | ~50 | Route defs |
| `src/utils/commissionCalculator.js` | ~100 | Calc utility |
| `src/migrations/addCommissionToAgreements.js` | ~30 | Migration |
| `scripts/seedCommissionRules.js` | ~50 | Seed data |

**Backend New Files Total: ~850 lines**

### 10.6 Backend - Modified Files (3 Files)

| File | Changes | Lines |
|------|---------|-------|
| `src/app.js` | Mount commission routes | ~10 |
| `src/models/CustomerHeaderDoc.js` | Add commission schema | ~50 |
| `src/controllers/pdfController.js` | Save commission data | ~30 |

**Backend Modified Total: ~90 lines**

### 10.7 Test Files (6 Files)

| File | Lines | Purpose |
|------|-------|---------|
| `enviromaster/src/__tests__/commission.types.test.ts` | ~250 | Type tests |
| `enviromaster/src/__tests__/commission.calculation.test.ts` | ~550 | Calc tests |
| `enviromaster/src/__tests__/commission.formfilling.test.ts` | ~550 | Integration |
| `enviro-bckend/src/tests/commission.model.test.js` | ~475 | Model tests |
| `enviro-bckend/src/tests/commission.save.test.js` | ~200 | Save tests |
| `enviro-bckend/src/tests/commission.api.test.js` | ~300 | API tests |

**Test Files Total: ~2,325 lines**

### 10.8 Summary

| Category | Files | Lines |
|----------|-------|-------|
| Web - New Files | 25 | ~4,570 |
| Web - Modified | 8 | ~310 |
| Mobile - New Files | 18 | ~2,910 |
| Mobile - Modified | 5 | ~120 |
| Backend - New Files | 8 | ~850 |
| Backend - Modified | 3 | ~90 |
| Test Files | 6 | ~2,325 |
| **Total** | **73** | **~11,175** |

---

## 11. Testing Requirements

### 11.1 Calculation Accuracy Tests

| Test Case | Expected |
|-----------|----------|
| Below + 1-Year + Anchor | 3% final rate |
| Above + 3-Year + Anchor | 8.1% final rate |
| Double + 3-Year + Greenline | 13.5% final rate |
| Below + MTM-no-install + Bread5 + Inside Sales | Negative rate |

### 11.2 Integration Tests

| Test | Description |
|------|-------------|
| Save with Agreement | Commission saved correctly |
| Employee Dashboard Load | Shows employee's commissions |
| Admin Dashboard Load | Shows all employees |
| Filter by Date | Correct filtering |
| Export CSV | Correct data format |

### 11.3 Cross-Platform Tests

| Test | Web | Mobile |
|------|-----|--------|
| Same calculation result | Must match | Must match |
| Same display format | Currency formatting | Currency formatting |
| API response handling | Consistent | Consistent |

---

## 12. Cost Breakdown

### 12.1 Development Hours

| Phase | Hours | Description |
|-------|-------|-------------|
| **Commission Calculator (FormFilling)** | | |
| Calculator component | 12 | UI with all inputs |
| Calculation hook | 8 | Business logic |
| State lifting | 6 | Integration with save |
| Styling | 4 | Visual design |
| **My Commissions Dashboard (Employee)** | | |
| Dashboard layout | 10 | Summary + charts + list |
| Data fetching | 6 | API integration |
| Filters & search | 4 | User controls |
| Detail modal | 4 | Calculation breakdown |
| Styling | 4 | Visual polish |
| **Admin Commission Management** | | |
| Overview dashboard | 12 | Stats + charts + tables |
| Employee list | 6 | Sortable, filterable |
| Employee detail view | 8 | Drill-down |
| Rules configuration | 8 | Admin settings |
| Export functionality | 4 | CSV/PDF generation |
| Styling | 6 | Admin UI |
| **Mobile Implementation** | | |
| My Commissions screen | 10 | RN dashboard |
| Detail screen | 6 | Calculation view |
| Admin section | 8 | Admin features |
| Calculator in form | 6 | Agreement integration |
| Navigation | 4 | Screen routing |
| **Backend Implementation** | | |
| Models | 6 | Rules + Records |
| Controllers | 12 | All endpoints |
| Routes | 2 | Route definitions |
| Migration | 2 | Schema updates |
| **Testing** | | |
| Unit tests | 8 | Calculation tests |
| Integration tests | 6 | API tests |
| Cross-platform tests | 4 | Consistency |
| **Bug Fixes & Polish** | | |
| Edge cases | 8 | Error handling |
| Performance | 4 | Optimization |
| Documentation | 4 | Code comments |
| **Total** | **192 hours** | |

### 12.2 Cost Calculation

| Item | Calculation | Amount |
|------|-------------|--------|
| Development Hours | 192 hours × $24/hour | $4,608 |
| Code Review & QA | 5% overhead | $230 |
| Contingency | ~3.5% buffer | $162 |
| **Total** | | **$5,000** |

### 12.3 Value Delivered

| Feature | Business Value |
|---------|----------------|
| **Real-time Calculator** | Sales knows earnings before closing |
| **Accurate Formulas** | Correct quota/multiplier/bonus logic |
| **Employee Dashboard** | Self-service commission tracking |
| **Admin Overview** | Complete visibility into payroll |
| **Rules Configuration** | Change rates without code |
| **Historical Tracking** | Audit trail for disputes |
| **Export Reports** | Easy payroll integration |
| **Cross-Platform** | Same experience web + mobile |
| **Automated Calculation** | No manual spreadsheets |
| **Performance Tracking** | Employee motivation via visibility |

---

## Appendix A: Commission Rules Reference

### Default Values

| Setting | Default Value |
|---------|---------------|
| Below Quota Rate | 3% |
| Above Quota Rate | 6% |
| Double Quota Rate | 9% |
| 3-Year Multiplier | 135% |
| 1-Year Multiplier | 100% |
| MTM+Install Multiplier | 100% |
| MTM-NoInstall Multiplier | 50% |
| Anchor Adjustment | 0% |
| Bread5 Adjustment | -1% |
| Bread15 Adjustment | -0.5% |
| Pit Adjustment | 0% |
| Greenline Bonus | +1% |
| Renewal Bonus | +4% |
| Renewal Min Years | 2 |
| Inside Sales Deduction | -3% |
| Anchor Min Monthly | $200 |

---

## Appendix B: API Endpoint Reference

### Employee Endpoints

```
GET  /api/commission/my                     # List my commissions
GET  /api/commission/my/stats               # My statistics
GET  /api/commission/my/:id                 # Commission detail
```

### Admin Endpoints

```
GET  /api/commission/all                    # All commissions
GET  /api/commission/company/stats          # Company statistics
GET  /api/commission/employee/:id           # Employee commissions
GET  /api/commission/employee/:id/stats     # Employee statistics
GET  /api/commission/rules/active           # Active rules
PUT  /api/commission/rules/:id              # Update rules
PATCH /api/commission/:id/status            # Update status
GET  /api/commission/export                 # Export report
```

### Calculation Endpoint

```
POST /api/commission/calculate              # Calculate commission
```

---

## Appendix C: Commission Status Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│ PENDING  │ ──► │ APPROVED │ ──► │   PAID   │
└──────────┘     └──────────┘     └──────────┘
     │                                  │
     │           ┌───────────┐          │
     └─────────► │ CANCELLED │ ◄────────┘
                 └───────────┘
```

| Status | Description |
|--------|-------------|
| Pending | Commission calculated, awaiting review |
| Approved | Approved for payment |
| Paid | Commission paid to employee |
| Cancelled | Commission voided (deal fell through) |

---

**Document Prepared By:** Development Team
**Review Status:** Ready for Client Approval
**Implementation Status:** Completed / Ready for Deployment

---

*This document serves as both a technical specification and a project deliverable summary for the Commission Calculator & Tracking System implementation.*
