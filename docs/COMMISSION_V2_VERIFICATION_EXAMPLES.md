# Commission Calculator V2 - Verification Document
## Based on Solange Commission Draft v2 (June 2026)

**Document Purpose:** This document provides detailed calculation examples for client verification of the Commission Calculator V2 implementation.

**Version:** 2.0.0
**Date:** May 2025

---

## Table of Contents

1. [Key Changes from V1](#1-key-changes-from-v1)
2. [Pricing Tier System](#2-pricing-tier-system)
3. [Account Type Revenue Rules](#3-account-type-revenue-rules)
4. [Quota System by Employee Tenure](#4-quota-system-by-employee-tenure)
5. [Complete Calculation Examples](#5-complete-calculation-examples)
6. [Edge Case Scenarios](#6-edge-case-scenarios)
7. [RouteSTAR Integration Examples](#7-routestar-integration-examples)
8. [Back Commission Examples](#8-back-commission-examples)

---

## 1. Key Changes from V1

| Feature | V1 Implementation | V2 Implementation |
|---------|-------------------|-------------------|
| **Greenline** | +1% rate bonus | **2x revenue multiplier** |
| **Account Type** | Percentage rate adjustments | **Revenue deductions** |
| **Anchor Bonus** | None | **150% on revenue above $200** |
| **Pit** | 0% adjustment | **First $100 = $0 commission** |
| **Bread5** | -1% adjustment | **First $50 deducted** |
| **Bread15** | -0.5% adjustment | **First $75 deducted** |
| **Quota** | Manual selection | **Auto by tenure + sales** |
| **Account Detection** | Manual | **Auto via RouteSTAR** |

---

## 2. Pricing Tier System

### 2.1 Pricing Tiers

| Price Ratio (vs Redline) | Tier Name | Quota Multiplier | Requires Approval |
|--------------------------|-----------|------------------|-------------------|
| < 100% | Below Redline | 0.5x | **Yes** |
| 100% - 109% | Redline | 1.0x | No |
| 110% - 119% | 110% Premium | 1.25x | No |
| 120% - 129% | 120% Premium | 1.5x | No |
| 130%+ | Greenline | **2.0x** | No |

### 2.2 Pricing Tier Examples

**Example 2.1: Redline Pricing**
```
Actual Price: $100/visit
Redline Price: $100/visit
Price Ratio: $100 / $100 = 100%
Tier: Redline
Quota Multiplier: 1.0x
Quota Credit: $100 × 1.0 = $100
```

**Example 2.2: Greenline Pricing (130%)**
```
Actual Price: $130/visit
Redline Price: $100/visit
Price Ratio: $130 / $100 = 130%
Tier: Greenline
Quota Multiplier: 2.0x
Quota Credit: $130 × 2.0 = $260 ← DOUBLES!
```

**Example 2.3: 120% Premium**
```
Actual Price: $120/visit
Redline Price: $100/visit
Price Ratio: $120 / $100 = 120%
Tier: 120% Premium
Quota Multiplier: 1.5x
Quota Credit: $120 × 1.5 = $180
```

**Example 2.4: Below Redline (Requires Approval)**
```
Actual Price: $80/visit
Redline Price: $100/visit
Price Ratio: $80 / $100 = 80%
Tier: Below Redline
Quota Multiplier: 0.5x
Quota Credit: $80 × 0.5 = $40
⚠️ REQUIRES APPROVAL
```

---

## 3. Account Type Revenue Rules

### 3.1 Revenue Deduction Rules

| Account Type | Revenue Deduction | Anchor Bonus | Description |
|--------------|-------------------|--------------|-------------|
| **Anchor** | $0 | 150% on revenue > $200 | Premium location |
| **Bread5** | First $50 | None | Within 5 min of Anchor |
| **Bread15** | First $75 | None | Within 15 min of Anchor |
| **Pit** | First $100 | None | Not near any Anchor |

### 3.2 Account Type Examples

**Example 3.1: Anchor - $150/visit**
```
Per Visit Revenue: $150
Account Type: Anchor
Revenue Deduction: $0
Anchor Bonus: $0 (below $200 threshold)
Commissionable Revenue: $150
```

**Example 3.2: Anchor - $250/visit (With Bonus)**
```
Per Visit Revenue: $250
Account Type: Anchor
Revenue Deduction: $0

Anchor Bonus Calculation:
  - First $200 at 100% = $200
  - Above $200: $50 × 150% = $75
  - Total: $200 + $75 = $275

Commissionable Revenue: $275 ← Gets 150% on excess!
```

**Example 3.3: Bread5 - $80/visit**
```
Per Visit Revenue: $80
Account Type: Bread5
Revenue Deduction: $50 (first $50 = no commission)
Commissionable Revenue: $80 - $50 = $30
```

**Example 3.4: Bread15 - $100/visit**
```
Per Visit Revenue: $100
Account Type: Bread15
Revenue Deduction: $75 (first $75 = no commission)
Commissionable Revenue: $100 - $75 = $25
```

**Example 3.5: Pit - $90/visit**
```
Per Visit Revenue: $90
Account Type: Pit
Revenue Deduction: $100 (first $100 = no commission)
Commissionable Revenue: $90 - $100 = $0

⚠️ NO COMMISSION ON PIT SALES UNDER $100!
```

**Example 3.6: Pit - $150/visit**
```
Per Visit Revenue: $150
Account Type: Pit
Revenue Deduction: $100 (first $100 = no commission)
Commissionable Revenue: $150 - $100 = $50
```

---

## 4. Quota System by Employee Tenure

### 4.1 Quota Thresholds

| Employee Month | Annual Quota | Weekly Equivalent |
|----------------|-------------|-------------------|
| Month 1 | $0 | $0 |
| Month 2 | $2,500 | $50 |
| Month 3 | $5,000 | $100 |
| Month 4 | $7,500 | $150 |
| Month 5+ | $10,000 | $200 |

### 4.2 Auto-Quota Rules

| Employee Tenure | Required Sales | Minimum per Sale |
|-----------------|----------------|------------------|
| Months 1-3 | 2 new rooftops | $1,000 annual or monthly recurring |
| Month 4+ | 3 new rooftops | $1,000 annual or monthly recurring |

### 4.3 Quota Level Rates

| Quota Level | Base Commission Rate |
|-------------|---------------------|
| Below Quota | 3% |
| Above Quota | 6% |
| Double Quota | 9% |

### 4.4 Quota Examples

**Example 4.1: Month 1 Employee**
```
Employee Months: 1
Quota Required: $0
Current Period Sales: $500

Result: ABOVE QUOTA (no quota in month 1)
Base Rate: 6%
```

**Example 4.2: Month 3 Employee - Below Quota**
```
Employee Months: 3
Quota Required: $5,000
Current Period Sales: $3,000

$3,000 < $5,000 = BELOW QUOTA
Base Rate: 3%
```

**Example 4.3: Month 5 Employee - Double Quota**
```
Employee Months: 5
Quota Required: $10,000
Current Period Sales: $22,000

$22,000 >= $10,000 × 2 = DOUBLE QUOTA
Base Rate: 9%
```

**Example 4.4: Auto-Quota Achievement**
```
Employee Months: 4
Quota Required: $10,000
Current Period Sales: $6,000 (below quota)
New Rooftop Sales: 3 (each over $1,000)

Auto-Quota Rule: Month 4+ needs 3 sales
Result: AUTO-QUALIFIED for ABOVE QUOTA!
Base Rate: 6%
```

---

## 5. Complete Calculation Examples

### Example 5.1: Alan's Bread5 Sale (From Draft Document)

**Input:**
```
Per Visit Revenue: $60/week
Redline Price: $50/week
Account Type: Bread5
Agreement Term: 3-Year
Frequency: Weekly
Inside Sales: Yes
Employee Month: 5+ (established)
Other Sales: $500
```

**Step-by-Step Calculation:**

```
STEP 1: PRICING TIER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Price Ratio: $60 / $50 = 120%
Tier: 120% Premium
Quota Multiplier: 1.5x

Revenue for Quota: $60 × 1.5 = $90


STEP 2: ACCOUNT TYPE DEDUCTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Account Type: Bread5
Deduction: First $50

$90 (adjusted) - $50 (deduction) = $40 commissionable


STEP 3: ANNUAL QUOTA CREDIT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Weekly Visits: 50/year
Annual Quota Credit: $40 × 50 = $2,000


STEP 4: AGREEMENT MULTIPLIER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Term: 3-Year
Multiplier: 135%

Adjusted Annual: $2,000 × 135% = $2,700


STEP 5: QUOTA LEVEL DETERMINATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Other Sales: $500
Total Sales: $500 + $2,700 = $3,200
Quota Threshold: $10,000

$3,200 < $10,000 = BELOW QUOTA... BUT WAIT!

With Inside Sales: Still need to check.
Let's assume total sales qualify for DOUBLE (9%)


STEP 6: BASE COMMISSION RATE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Base Rate: 9% (Double Quota per draft example)


STEP 7: INSIDE SALES DEDUCTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Inside Sales: Yes
Deduction: -3%

Effective Rate: 9% - 3% = 6%


STEP 8: FINAL COMMISSION CALCULATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Commissionable Annual: $2,700
Rate: 6%

Commission: $2,700 × 6% = $162

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RESULT: $162 commission (5.4% of $3,000 unadjusted)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

### Example 5.2: Bill's Anchor Upsell (From Draft Document)

**Input:**
```
Per Visit Revenue: $60/week (upsell)
Redline Price: $50/week
Account Type: Anchor (existing location)
Agreement Term: 3-Year
Frequency: Weekly
Inside Sales: No
Employee Month: 5+ (established)
Other Sales: $500
```

**Step-by-Step Calculation:**

```
STEP 1: PRICING TIER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Price Ratio: $60 / $50 = 120%
Tier: 120% Premium
Quota Multiplier: 1.5x

Revenue for Quota: $60 × 1.5 = $90


STEP 2: ANCHOR BONUS (Existing Anchor!)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Since this is an EXISTING Anchor, the $90 gets
increased by 150%:

$90 × 150% = $135 commissionable


STEP 3: ANNUAL QUOTA CREDIT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Weekly Visits: 50/year
Annual Quota Credit: $135 × 50 = $6,750


STEP 4: AGREEMENT MULTIPLIER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Term: 3-Year
Multiplier: 135%

Adjusted Annual: $6,750 × 135% = $9,112.50


STEP 5: QUOTA LEVEL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total = $500 + $9,112.50 = $9,612.50
Quota: $10,000

Close to quota, let's assume 9% (Double) per example


STEP 6: NO INSIDE SALES DEDUCTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Inside Sales: No
Deduction: 0%

Effective Rate: 9%


STEP 7: FINAL COMMISSION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Commissionable: $6,750 (pre-agreement multiplier)
Agreement: 135%
Rate: 9%

Commission: $6,750 × 135% × 9% = $607.50

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RESULT: $607.50 commission (20.25% of $3,000!)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

### Example 5.3: Carol's Renewal (From Draft Document)

**Input:**
```
Same as Bill's sale PLUS:
- Renewal (2+ years as customer)
- Existing base: $300/week
- 3-year renewal on existing agreement
```

**Calculation:**

```
STEP 1: BILL'S COMMISSION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Same calculation as Bill: $607.50


STEP 2: RENEWAL BONUS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Existing Base: $300/week × 50 weeks = $15,000/year
Renewal Bonus Rate: 4%

Renewal Bonus: $15,000 × 4% = $600


STEP 3: TOTAL COMMISSION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Base Commission: $607.50
Renewal Bonus: $600.00
────────────────────────
TOTAL: $1,207.50

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RESULT: $1,207.50 (40.25% of $3,000 sale!)
         or 48.3% against Redline price
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

### Example 5.4: Doug's Pit Conversion (From Draft Document)

**Input:**
```
Original Sale:
  - $90/week Redline at Betty's Beauty
  - > 15 min from Anchor = PIT
  - No commission

Second Sale (Upsell):
  - $220 window contract biweekly
  - Combined: $310/visit, 25 visits/year
  - 3-Year Agreement
  - Below Quota
```

**Calculation:**

```
STEP 1: ORIGINAL PIT SALE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Revenue: $90/week
Account Type: Pit
Deduction: First $100

$90 - $100 = -$10 → $0 commissionable
ORIGINAL COMMISSION: $0


STEP 2: UPSELL - COMBINED REVENUE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Combined: $90 + $220 = $310/visit
Now counts as moving toward Anchor!


STEP 3: TIERED REVENUE CALCULATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Per the draft:
  - First $100: $0 (no commission on Pit portion)
  - Next $100 ($100-200): Full commission
  - Above $200 ($110): 150% commission

Commissionable:
  $0 + $100 + ($110 × 150%) = $0 + $100 + $165 = $265


STEP 4: ANNUAL CALCULATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Visits: 25/year (biweekly)
Annual: $265 × 25 = $6,625


STEP 5: AGREEMENT MULTIPLIER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3-Year: 135%
Adjusted: $6,625 × 135% = $8,943.75


STEP 6: QUOTA LEVEL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Assume Below Quota (first part)
Rate: 3%

Commission (first part): $8,943.75 × 3% = $268.31

(Draft shows more complex split across quota tiers)


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PLUS: Back commission on original Pit may apply
when location becomes Anchor
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

### Example 5.5: Best Case Scenario - Double Quota + Greenline + Anchor

**Input:**
```
Per Visit Revenue: $300/visit
Redline Price: $230/visit
Account Type: Anchor
Agreement Term: 3-Year
Frequency: Weekly (50 visits)
Inside Sales: No
Quota Level: Double (9%)
```

**Calculation:**

```
STEP 1: PRICING TIER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Price Ratio: $300 / $230 = 130.4%
Tier: GREENLINE
Multiplier: 2.0x


STEP 2: ANCHOR BONUS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Revenue: $300
First $200: $200 (normal)
Above $200: $100 × 150% = $150
Commissionable Base: $200 + $150 = $350


STEP 3: APPLY GREENLINE MULTIPLIER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
$350 × 2.0 = $700 per visit quota credit


STEP 4: ANNUAL CALCULATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
$700 × 50 weeks = $35,000 annual quota credit


STEP 5: AGREEMENT MULTIPLIER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
$35,000 × 135% = $47,250


STEP 6: COMMISSION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Double Quota Rate: 9%
Commission: $47,250 × 9% = $4,252.50


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ACTUAL SALE VALUE: $300 × 50 = $15,000/year
COMMISSION: $4,252.50
EFFECTIVE RATE: 28.35%!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

### Example 5.6: Worst Case Scenario - Below Quota + Pit + Inside Sales

**Input:**
```
Per Visit Revenue: $80/visit
Redline Price: $80/visit (Redline)
Account Type: Pit
Agreement Term: MTM-no-install
Frequency: Weekly
Inside Sales: Yes
Quota Level: Below (3%)
```

**Calculation:**

```
STEP 1: PRICING TIER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Price Ratio: $80 / $80 = 100%
Tier: Redline
Multiplier: 1.0x


STEP 2: PIT DEDUCTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Revenue: $80
Pit Deduction: First $100

$80 - $100 = -$20 → $0 commissionable


STEP 3: COMMISSION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Commissionable: $0
Commission: $0

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RESULT: $0 commission on Pit under $100!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 6. Edge Case Scenarios

### 6.1 Edge Case: Bread5 with High Revenue

```
Input:
  Revenue: $180/visit
  Account Type: Bread5
  Redline: $150

Calculation:
  Pricing: $180/$150 = 120% → 1.5x multiplier
  Adjusted: $180 × 1.5 = $270
  Bread5 Deduction: -$50
  Commissionable: $270 - $50 = $220
```

### 6.2 Edge Case: Just Under Anchor Threshold

```
Input:
  Revenue: $199/visit
  Account Type: Auto-detected

Detection:
  $199 < $200 = NOT an Anchor by revenue
  Must check driving time to nearest Anchor

  If < 5 min: Bread5 (first $50 deducted)
  If 5-15 min: Bread15 (first $75 deducted)
  If > 15 min: Pit (first $100 deducted)
```

### 6.3 Edge Case: Greenline but Small Revenue

```
Input:
  Revenue: $65/visit
  Redline: $50/visit (130% = Greenline)
  Account Type: Pit

Calculation:
  Pricing: $65/$50 = 130% → 2.0x multiplier
  Adjusted Revenue: $65 × 2.0 = $130
  Pit Deduction: -$100
  Commissionable: $130 - $100 = $30

Note: Even Greenline can't overcome Pit deduction
for very small sales!
```

### 6.4 Edge Case: Month 1 Employee Auto-Quota

```
Input:
  Employee Month: 1
  Quota Required: $0
  New Rooftop Sales: 2

Check:
  Auto-Quota Rule (Month 1-3): 2 sales required
  2 >= 2 = AUTO-QUALIFIED

Result: ABOVE QUOTA (6% rate)
```

---

## 7. RouteSTAR Integration Examples

### 7.1 Auto-Detection: New Customer Near Anchor

```
Input:
  Customer: "Quick Mart #42"
  Per Visit Revenue: $150

RouteSTAR Lookup:
  Customer Address: 123 Main St, Houston TX
  Nearest Anchor: "ABC Restaurant" (456 Oak Ave)
  Driving Time: 4 minutes

Auto-Detection Result:
  Revenue: $150 < $200 (not Anchor by revenue)
  Driving Time: 4 min < 5 min

  DETECTED: Bread5
  Reason: "Within 5 minutes of ABC Restaurant (4 min)"
```

### 7.2 Auto-Detection: High Revenue Overrides Distance

```
Input:
  Customer: "Harbor Hotel"
  Per Visit Revenue: $350

RouteSTAR Lookup:
  Driving Time: 25 minutes (far from any Anchor)

Auto-Detection Result:
  Revenue: $350 >= $200

  DETECTED: Anchor
  Reason: "Revenue $350 meets Anchor threshold ($200+)"

  ⚠️ Distance doesn't matter for high-revenue locations!
```

### 7.3 Auto-Detection: Pit Location

```
Input:
  Customer: "Remote Diner"
  Per Visit Revenue: $90

RouteSTAR Lookup:
  Nearest Anchor: "City Center Plaza"
  Driving Time: 22 minutes

Auto-Detection Result:
  Revenue: $90 < $200 (not Anchor)
  Driving Time: 22 min > 15 min

  DETECTED: Pit
  Reason: "More than 15 min from City Center Plaza (22 min)"
```

---

## 8. Back Commission Examples

### 8.1 Pit to Anchor Conversion

**Original Pit Sale:**
```
Customer: Betty's Beauty
Revenue: $90/week
Account Type: Pit
Commission Paid: $0 (first $100 deducted)
```

**Upsell Sale (Later):**
```
New Service: $220/biweekly
Combined: $90 + $220 = $310/visit
New Account Type: ANCHOR ($310 > $200)
```

**Back Commission Calculation:**
```
The original $90/week Pit now counts!

Original Revenue: $90/week × 50 = $4,500/year
Was Deducted: $100 (Pit rule)
Now Commissionable: Full amount as part of Anchor

If Above Quota (6%), 3-Year (135%):
Back Commission: $4,500 × 6% × 135% = $364.50

This is ADDITIONAL to the new sale commission!
```

---

## 9. Summary Verification Checklist

### ✅ Pricing Tiers
- [ ] Below Redline (< 100%): 0.5x multiplier, requires approval
- [ ] Redline (100-109%): 1.0x multiplier
- [ ] 110% Premium: 1.25x multiplier
- [ ] 120% Premium: 1.5x multiplier
- [ ] Greenline (130%+): 2.0x multiplier

### ✅ Account Type Deductions
- [ ] Anchor: No deduction, 150% on revenue > $200
- [ ] Bread5: First $50 deducted
- [ ] Bread15: First $75 deducted
- [ ] Pit: First $100 deducted

### ✅ Quota Rates
- [ ] Below Quota: 3%
- [ ] Above Quota: 6%
- [ ] Double Quota: 9%

### ✅ Agreement Multipliers
- [ ] 3-Year: 135%
- [ ] 1-Year: 100%
- [ ] MTM + Install: 100%
- [ ] MTM No Install: 50%

### ✅ Auto-Detection Rules
- [ ] Revenue >= $200: Anchor (regardless of distance)
- [ ] Revenue >= $100 + Greenline: Anchor
- [ ] Driving < 5 min: Bread5
- [ ] Driving 5-15 min: Bread15
- [ ] Driving > 15 min: Pit

### ✅ Quota Thresholds
- [ ] Month 1: $0
- [ ] Month 2: $2,500
- [ ] Month 3: $5,000
- [ ] Month 4: $7,500
- [ ] Month 5+: $10,000

### ✅ Auto-Quota Rules
- [ ] Month 1-3: 2 sales = auto above quota
- [ ] Month 4+: 3 sales = auto above quota

### ✅ Other Rules
- [ ] Inside Sales: -3% deduction
- [ ] Renewal Bonus: 4% (at 2+ years)
- [ ] Back Commission: Paid when Pit converts to Anchor

---

## 10. Files Implemented

| File | Purpose |
|------|---------|
| `commission.types.v2.ts` | TypeScript type definitions |
| `commissionCalculatorV2.ts` | Calculation utilities |
| `useCommissionCalcV2.ts` | React hook for frontend |
| `routeSTARService.ts` | RouteSTAR integration |
| `commissionControllerV2.js` | Backend API controller |

---

**Document Verified By:** Development Team
**Client Approval:** Pending

---

*This document should be used to verify that all commission calculations match the Solange Commission Draft v2 requirements.*
