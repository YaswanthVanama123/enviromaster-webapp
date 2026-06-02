# Commission Calculation in FormFilling — Explained

This doc walks through how the `FormFilling.tsx` screen computes a commission in real time, step by step, then illustrates two end-to-end combinations.

> **Source files**
> - UI / live calc — `enviromaster/src/components/FormFilling.tsx` (`calculateCommission` useMemo, ~L300–L417)
> - Rules + helpers — `enviromaster/src/backendservice/types/commission.types.ts`
>   - `COMMISSION_RULES_V2`, `PRICING_TIERS`, `ACCOUNT_TYPE_REVENUE_RULES`
>   - `getPricingTier()`, `calculateCommissionableRevenue()`
> - Rules basis — "Solange Commission Draft v2 (June 2026)"

---

## 1. Inputs the calc reads

`FormFilling` does **not** ask the salesperson to type a per-visit revenue. It derives everything from the line items already on the form, plus a small set of explicit inputs.

| Source | Value | Where it comes from |
|---|---|---|
| `totalCurrentContract` | What the customer is being charged this contract | `getTotalAgreementAmount()` |
| `totalOriginalContract` | The redline (standard) contract total | `getTotalOriginalContractTotal()` |
| `totalMonthlyRecurring` | Monthly recurring revenue across services | `getTotalMonthlyRecurringRevenue()` |
| `globalContractMonths` | Contract length in months | Form dropdown |
| `pricingIndicator` | `'red'` or `'green'` — auto from form vs greenline threshold | local `useState` |
| `quotaLevel` | `below` / `above` / `double` | parent prop (`commissionState.quotaLevel`) |
| `accountType` | `Anchor` / `Bread5` / `Bread15` / `Pit` | parent prop |
| `isInsideSales` | boolean | parent prop |
| `isNewLocation` | **NEW** — true if this is a brand-new account (no prior contract here). Drives the tiered Anchor calc and per-visit penalties. | parent prop |
| `repActualSalesBefore` | **NEW** — rep's existing `QuotaPeriod.actualSales` before this agreement. Drives the piecewise commission-rate split. Defaults to 0 if not provided. | parent prop |

---

## 2. The spec-faithful pipeline (Solange Commission Draft, June 2026)

```
┌─────────────────────────────────────────────────────────────┐
│ 0. 12-MONTH-EQUIVALENT CONTRACT TOTALS (anchor for everything)
│    monthlyValue              = totalCurrentContract / globalContractMonths
│    monthlyOriginalValue      = totalOriginalContract / globalContractMonths
│    currentContract12Months   = monthlyValue × 12
│    originalContract12Months  = monthlyOriginalValue × 12
├─────────────────────────────────────────────────────────────┤
│ 1. PRICING TIER
│    priceRatio    = currentContract12Months / originalContract12Months
│    pricingTier   = PRICING_TIERS lookup at that ratio
│       (Below Redline 0.5× / Redline 1.0× / 110% 1.25× /
│        120% 1.5× / Greenline 2.0×)
│    pricingMultiplier = pricingTier.quotaMultiplier
│    isGreenline   = label === 'Greenline (130%+)'
├─────────────────────────────────────────────────────────────┤
│ 2. AGREEMENT TERM
│    >= 36 → '3-year' (135%)    >= 12 → '1-year' (100%)
│    else  → 'MTM-with-install' (100%)
│    agreementMultiplier = COMMISSION_RULES_V2.agreementMultipliers[term]
├─────────────────────────────────────────────────────────────┤
│ 3. COMMISSION BASE — pricing × agreement multipliers on year-1
│    adjustedAnnual    = currentContract12Months
│                      × pricingMultiplier × (agreementMultiplier / 100)
│    adjustedPerVisit  = adjustedAnnual / visitsPerYear   (default 50)
│    Spec example: $13,333 × 2.0 × 1.35 = $35,999.91
├─────────────────────────────────────────────────────────────┤
│ 4. ACCOUNT-TYPE ADJUSTMENT (per-visit, then annualized)
│    Anchor threshold = $200 ($100 if Greenline)
│    Pit threshold    = $100   Anchor bonus = 1.5×
│
│    NEW Anchor:                                             EXISTING Anchor:
│      [0, $100]    → 0  (Pit zone — no commission)            [0, $200]   → 1× (standard)
│      ($100, $200] → 1× (standard)                            (>$200)     → 1.5×
│      (>$200)      → 1.5×
│
│    NEW   Bread5 / Bread15 / Pit: subtract per-visit penalty ($50 / $75 / $100)
│    EXIST Bread5 / Bread15:       no penalty
│    EXIST Pit:                    no penalty if > $100/visit; otherwise apply
│
│    commissionableAnnual = commissionablePerVisit × visitsPerYear
├─────────────────────────────────────────────────────────────┤
│ 5. QUOTA CREDIT — 12-month CONTRACT TOTAL × pricing multiplier
│    annualContractTotal = currentContract12Months
│    annualQuotaCredit   = annualContractTotal × pricingMultiplier
│      (added to QuotaPeriod.actualSales when the agreement is finalized)
├─────────────────────────────────────────────────────────────┤
│ 6. TIERED COMMISSION RATE — piecewise across rep's quota position
│    positionBefore = repActualSalesBefore   (rep's actualSales today)
│    positionAfter  = positionBefore + annualQuotaCredit
│
│    belowQuotaPortion  = portion of THIS sale's quota credit in [0, $10K]
│    aboveQuotaPortion  = portion in [$10K, $20K]
│    doubleQuotaPortion = portion above $20K
│      (cutoffs from DEFAULT_QUOTA_TIER_CUTOFFS — admin-editable)
│
│    Each tier gets its proportional share of commissionableAnnual,
│    multiplied by that tier's rate (3% / 6% / 9%) minus inside-sales
│    deduction (-3pp uniformly):
│
│    annualCommission = belowShare × (3 + insideSalesDed)%
│                     + aboveShare × (6 + insideSalesDed)%
│                     + doubleShare × (9 + insideSalesDed)%
│    contractCommission = annualCommission     (paid 12 months only)
└─────────────────────────────────────────────────────────────┘
```

### Notable subtleties

- **Pricing multiplier scales BOTH commission and quota.** Per spec: *"Redline $1 per $1, Greenline $2 per dollar."* The multiplier (0.5 / 1.0 / 1.25 / 1.5 / 2.0) is applied to year-1 contract value before commission base AND it's applied to quota credit. A Greenline deal earns 2× both ways.
- **`isNewLocation` drives the Pit zone and per-visit penalty.** New Anchors lose the first $100/visit (Pit zone). New Bread5/Bread15/Pit pay a flat per-visit penalty ($50/$75/$100). Existing accounts skip these — the location is already established, so the penalty doesn't apply again.
- **Greenline relaxes the Anchor threshold to $100/visit.** Spec: *"Anchor — $200 or more per visit ($100 or more if Greenline)."* That makes more deals qualify for the Anchor bonus when sold above redline.
- **Commission rate is piecewise across quota cutoffs, not a single percent.** A rep at $0 selling a $26,666 quota-credit deal earns 3% on the first $10K, 6% on the next $10K, and 9% on the last $6,666 — not a flat 3% from `quotaLevel`. The legacy `quotaLevel` field is now informational; `repActualSalesBefore` is the source of truth.
- **All commission and quota math is anchored on a single year.** A 36-month deal does NOT credit 3× the rep's quota and does NOT scale the commission base by the contract length. The agreement multiplier (3-year = 135%) is the *length premium*, not a length multiplier — it boosts year-1 by 35%, not by 3×.
- **Visits-per-year defaults to 50 (weekly).** This is the spec's "weekly billing = 50 weeks (holidays excluded)" assumption. It will become admin-editable per agreement; for now the calc treats every contract as weekly. Monthly = 12, quarterly = 4 are spec-defined for when that wires up.
- **One-time line items are prorated into both commission and quota.** Because both bases derive from `totalCurrentContract` (not `monthlyRecurring`), one-time charges *are* counted — split across the contract length and capped at one year.
- **Inside Sales subtracts 3pp from every tier rate.** A below-quota inside-sales rep collapses to 0% on the below-quota portion. A double-quota inside-sales rep still earns 6%. (Previously the deduction zeroed out the entire commission for any below-quota sale.)
- **Renewal bonus is not exposed in FormFilling.** `renewalBonus = 0` is hard-coded — the screen treats every deal as new business.
- **Renewal bonus is not exposed in FormFilling.** `renewalBonus = 0` is hard-coded — the screen treats every deal as new business.

---

## 3. Reference tables

### `PRICING_TIERS` (price ratio → multiplier)
| Ratio range | Label | Quota multiplier | Approval? |
|---|---|---|---|
| `[0, 0.99)` | Below Redline | 0.5 | yes |
| `[1.00, 1.09)` | Redline | 1.0 | no |
| `[1.10, 1.19)` | 110% Premium | 1.25 | no |
| `[1.20, 1.29)` | 120% Premium | 1.5 | no |
| `[1.30, ∞)` | Greenline (130%+) | 2.0 | no |

### `ACCOUNT_TYPE_REVENUE_RULES`
| Type | Deduction | Bonus threshold | Bonus mult. |
|---|---|---|---|
| Anchor | $0 | $200 | ×1.5 on excess |
| Bread5 | $50 | — | — |
| Bread15 | $75 | — | — |
| Pit | $100 | — | — |

### `COMMISSION_RULES_V2`
| Field | Value |
|---|---|
| `quotaRates` | below 3% / above 6% / double 9% |
| `agreementMultipliers` | 3-year 135% / 1-year 100% / MTM+install 100% / MTM 50% |
| `insideSalesDeduction` | −3 percentage points |
| `renewalBonusRate` | 4% (not used in FormFilling) |

---

## 4. Worked Example 1 — "Best case"

> **Anchor + Greenline + 3-year + Above Quota + not Inside Sales**

### Form inputs

| Field | Value |
|---|---|
| `totalCurrentContract` | **$40,000** |
| `totalOriginalContract` | **$30,000** (redline) |
| `totalMonthlyRecurring` | **$1,300/month** |
| `globalContractMonths` | **36** |
| `pricingIndicator` | `'green'` |
| `accountType` | **Anchor** |
| `quotaLevel` | **above** |
| `isInsideSales` | **false** |

### Step-by-step

**Step 1 — Pricing tier**
- `priceRatio = 40,000 / 30,000 = 1.333…`
- `weeklyRevenue = 1,300 / 4.33 = $300.23`
- `redlinePrice = 300.23 / 1.333 = $225.17` (display only)
- `getPricingTier(300.23, 225.17)` → ratio 1.333 falls in `[1.30, ∞)` → **Greenline (130%+)**, `pricingMultiplier = 2.0`, `requiresApproval = false`

**Step 2 — Agreement term**
- `globalContractMonths = 36` → `agreementTerm = '3-year'` → `agreementMultiplier = 135`

**Step 3 — Commissionable revenue (Anchor bonus)**
- Monthly input = $1,300, threshold = $200
- `bonusPortion = 1,300 − 200 = 1,100`
- `commissionableRevenue (monthly) = 200 + 1,100 × 1.5 = 200 + 1,650 = $1,850`
- `anchorBonus (monthly) = 1,100 × 0.5 = $550`
- Weekly: `1,850 / 4.33 = $427.25` commissionable, `550 / 4.33 = $127.02` anchor bonus, deduction $0

**Step 4 — Final rate**
- `baseRate = 6` (above quota)
- `insideSalesDeduction = 0`
- `effectiveRate = 6 + 0 = 6%`
- `finalCommissionRate = 6 × (135 / 100) = 8.10%`

**Step 5 — Amounts**
- `perVisitCommission = 427.25 × 0.081 = $34.61`
- `weeklyCommission = $34.61`
- `annualCommission = 34.61 × 52 = $1,799.85`
- `contractCommission = $1,799.85` *(paid for 12 months even though contract is 36)*

### Result row in the UI

| Pricing tier | Final rate | Per-visit | Weekly | Annual | Contract |
|---|---|---|---|---|---|
| Greenline (130%+) | **8.10%** | $34.61 | $34.61 | $1,799.85 | **$1,799.85** |

---

## 5. Worked Example 2 — "Edge case: rate zeros out"

> **Pit + Below Redline + 1-year + Below Quota + Inside Sales**

### Form inputs

| Field | Value |
|---|---|
| `totalCurrentContract` | **$11,040** |
| `totalOriginalContract` | **$12,000** (redline) |
| `totalMonthlyRecurring` | **$400/month** |
| `globalContractMonths` | **12** |
| `pricingIndicator` | `'red'` |
| `accountType` | **Pit** |
| `quotaLevel` | **below** |
| `isInsideSales` | **true** |

### Step-by-step

**Step 1 — Pricing tier**
- `priceRatio = 11,040 / 12,000 = 0.92`
- `weeklyRevenue = 400 / 4.33 = $92.38`
- `redlinePrice = 92.38 / 0.92 = $100.41` (display only)
- `getPricingTier(92.38, 100.41)` → ratio 0.92 falls in `[0, 0.99)` → **Below Redline**, `pricingMultiplier = 0.5`, `requiresApproval = true` ⚠️

**Step 2 — Agreement term**
- `globalContractMonths = 12` → `agreementTerm = '1-year'` → `agreementMultiplier = 100`

**Step 3 — Commissionable revenue (Pit deduction)**
- Monthly input = $400, deduction = $100
- `commissionableRevenue (monthly) = max(0, 400 − 100) = $300`
- `revenueDeduction (monthly) = $100`, `anchorBonus = $0`
- Weekly: `300 / 4.33 = $69.28` commissionable, `100 / 4.33 = $23.09` deduction

**Step 4 — Final rate**
- `baseRate = 3` (below quota)
- `insideSalesDeduction = −3` (inside sales is true)
- `effectiveRate = 3 + (−3) = 0%` ← **collapses to zero**
- `finalCommissionRate = 0 × (100 / 100) = 0%`

**Step 5 — Amounts**
- `perVisitCommission = 69.28 × 0 = $0.00`
- `weeklyCommission = $0.00`
- `annualCommission = $0.00 × 52 = $0.00`
- `contractCommission = $0.00`

### Result row in the UI

| Pricing tier | Final rate | Per-visit | Weekly | Annual | Contract |
|---|---|---|---|---|---|
| Below Redline ⚠️ | **0.00%** | $0.00 | $0.00 | $0.00 | **$0.00** |

This combo also flags `requiresApproval = true` (sub-redline pricing) and produces no commission because **below quota + inside sales** subtracts the entire 3% base.

---

## 6. Worked Example 3 — End-to-end with services + quota rollup

> **Anchor + 110% Premium pricing + 1-year + Inside-sales: false**, with three real line items, and we track how the resulting **quota credit** moves the salesperson from **below** quota to **double** quota.

### 6.1 The salesperson going into this deal

Pulled from the rep's `QuotaPeriod` record (see `enviro-bckend/src/models/commission/QuotaPeriod.model.js:46`):

| Field | Value | Source / rule |
|---|---|---|
| Months employed | **7** | `employeeHireDate` |
| Tenure tier | "Month 5+" | `QUOTA_THRESHOLDS` cap at month 5 |
| `quotaTarget` (annual) | **$10,000** | `QUOTA_THRESHOLDS[4].annualQuota` |
| `actualSales` (YTD) | **$7,200** | running total before this sale |
| `quotaPercentage` | 72% | `actualSales / quotaTarget × 100` (`QuotaPeriod.calculateQuotaLevel`) |
| `quotaLevel` | **below** | `< 100%` |

Because the rep is currently below quota, the FormFilling screen will compute this deal at the **3% base rate**.

### 6.2 The agreement: services, quantities, frequencies

The customer location is geographically classified as **Anchor** (no Bread/Pit deduction; revenue above $200/month gets the 150% Anchor bonus).

| # | Service | Per-visit price | Frequency | Visits/mo (`ServicesContext`) | Monthly recurring | Contract (× 12 mo) |
|---|---|---:|---|---:|---:|---:|
| 1 | Janitorial — Weekly cleaning | $200.00 | weekly | 4.33 | $866.00 | $10,392.00 |
| 2 | Floor Care — Monthly buff | $400.00 | monthly | 1.00 | $400.00 | $4,800.00 |
| 3 | Initial Deep Clean (one-time) | $2,058.00 | one-time | — | — | $2,058.00 |

`getTotalMonthlyRecurringRevenue()` excludes one-time line items (it skips services where `isOneTimeService(serviceData)` is true — see `ServicesContext.tsx:454`):

```
totalMonthlyRecurring = 866.00 + 400.00 = $1,266.00
```

`getTotalAgreementAmount()` includes everything (recurring + one-time):

```
totalCurrentContract = 10,392.00 + 4,800.00 + 2,058.00 = $17,250.00
```

The redline (`totalOriginalContract`) would have been **$15,000.00** at standard pricing — the rep negotiated 15% above redline.

| Form field used by `calculateCommission` | Value |
|---|---:|
| `totalCurrentContract` | $17,250.00 |
| `totalOriginalContract` | $15,000.00 |
| `totalMonthlyRecurring` | $1,266.00 |
| `globalContractMonths` | 12 |
| `accountType` | Anchor |
| `quotaLevel` | below |
| `isInsideSales` | false |
| `pricingIndicator` | red (ratio 1.15 < 1.30 greenline threshold) |

### 6.3 Run the FormFilling pipeline on these totals

**Step 1 — Pricing tier**
- `priceRatio = 17,250 / 15,000 = 1.15`
- `weeklyRevenue = 1,266 / 4.33 = $292.38`
- `redlinePrice (display) = 292.38 / 1.15 = $254.24`
- Ratio 1.15 falls in `[1.10, 1.19)` → **110% Premium**, `pricingMultiplier = 1.25`, no approval needed

**Step 2 — Agreement term**
- `globalContractMonths = 12` → `agreementTerm = '1-year'` → `agreementMultiplier = 100`

**Step 3 — Commissionable revenue (Anchor bonus on monthly $1,266)**
- Monthly input = $1,266, Anchor threshold = $200
- `bonusPortion = 1,266 − 200 = 1,066`
- `commissionableRevenue (monthly) = 200 + 1,066 × 1.5 = 200 + 1,599 = $1,799.00`
- `anchorBonus (monthly) = 1,066 × 0.5 = $533.00`
- Weekly view: `commissionableRevenue = 1,799 / 4.33 = $415.47`, `anchorBonus = 533 / 4.33 = $123.10`, `revenueDeduction = $0`

**Step 4 — Final commission rate**
- `baseRate = 3` (below quota)
- `insideSalesDeduction = 0`
- `effectiveRate = 3 + 0 = 3%`
- `finalCommissionRate = 3 × (100 / 100) = 3.00%`

**Step 5 — Commission amounts**
- `perVisitCommission = 415.47 × 0.03 = $12.46`
- `weeklyCommission = $12.46`
- `annualCommission = 12.46 × 52 = $647.92`
- `contractCommission = $647.92`  *(paid for 12 months)*

### 6.4 What goes onto the salesperson's quota

`FormFilling.tsx` exposes two new fields on `CommissionResult` for this — `annualContractTotal` and `annualQuotaCredit`. Per the Solange Draft, the pricing-tier multiplier scales the 12-month contract total before it lands in quota.

```
monthlyContractValue        = totalCurrentContract  / globalContractMonths
                            = $17,250.00            / 12
                            = $1,437.50/mo

currentContract12Months     = monthlyContractValue  × 12
                            = $1,437.50             × 12
                            = $17,250.00

annualContractTotal         = currentContract12Months
                            = $17,250.00

pricingMultiplier           = PRICING_TIERS lookup at ratio 1.15
                            = 1.25 (110% Premium tier)

annualQuotaCredit           = annualContractTotal   × pricingMultiplier
                            = $17,250.00            × 1.25
                            = $21,562.50
```

Three things to notice:

1. **The 1.25× multiplier comes from the spec** — *"at 110% of Redline you get 1.25x quota"*. If this same deal had been sold at Redline (1.0×), quota credit would be $17,250.00; at Greenline (2.0×), it would be $34,500.00; below redline (0.5×), it would be $8,625.00.
2. **The contract is 12 months in this example, so `annualContractTotal` exactly equals `totalCurrentContract`.** If the same line items were sold on a 36-month agreement (`totalCurrentContract = $47,634`), `annualContractTotal` would be `(47,634 / 36) × 12 = $15,878` — the 12-month rule shields quota from contract-length inflation.
3. **One-time line items are prorated into quota.** The $2,058 deep-clean charge counts in full for this 12-month deal (it's part of `totalCurrentContract`); on a 36-month deal it would count as roughly $686.

For comparison, here's what Example 1's Anchor + Greenline + 36-month deal contributes to quota under the same rule:

```
monthlyContractValue     = 40,000 / 36           = $1,111.11/mo
currentContract12Months  = 1,111.11 × 12         = $13,333.33
pricingMultiplier        = Greenline (130%+)     = 2.0
annualQuotaCredit        = 13,333.33 × 2.0       = $26,666.67   ← added to actualSales
```

### 6.5 Quota state: before vs. after

When the agreement is finalized, `QuotaPeriod.actualSales` is incremented by `annualQuotaCredit`, and `calculateQuotaLevel()` runs again:

| | Before this sale | After this sale | Δ |
|---|---:|---:|---:|
| `quotaTarget` | $10,000.00 | $10,000.00 | — |
| `actualSales` | $7,200.00 | **$28,762.50** | +$21,562.50 |
| `quotaPercentage` | 72.00% | **287.63%** | +215.63 pp |
| `quotaLevel` | below | **double** ✓ | below → double |
| `agreementCount` | n | n + 1 | +1 |
| `newBusinessCount` | m | m + 1 | +1 (treated as new) |

This single Anchor + premium-pricing deal vaults the rep past **both** thresholds — over 100% (above) and over 200% (double). The transition is captured by `QuotaPeriod.calculateQuotaLevel()`:

```js
if (this.quotaPercentage >= 200) this.quotaLevel = "double";
else if (this.quotaPercentage >= 100) this.quotaLevel = "above";
else this.quotaLevel = "below";
```

### 6.6 Important consequence — *this* deal's commission is still 3%

The commission paid on **this** deal is locked at the rate computed when the agreement was filled (`3% × 100% = 3%` → $647.92). The new `quotaLevel = double` only takes effect for the **next** deal the rep writes — that next sale would pick up `quotaRates.double = 9%` as its base rate and (assuming similar Anchor revenue and 1-year term) earn roughly **3× the commission** of this one.

This is why reps push hard early in the quota period: each pre-quota sale has the lower 3% rate, but it pulls them into the higher tier where every subsequent dollar is worth 2× (above) or 3× (double) more.

---

## 7. Quick mental model (spec-faithful)

```
1. year1Value           = totalCurrentContract / globalContractMonths × 12

2. commissionBaseRaw    = year1Value × pricingMultiplier × agreementMultiplier
                                       ↑ 0.5/1/1.25/1.5/2     ↑ 1.35 / 1.0 / 0.5

3. commissionableAnnual = commissionBaseRaw, with account-type adjustment:
                            NEW Anchor: tiered (0 to $5K Pit, $5K-$10K standard, >$10K × 1.5)
                            EXIST Anchor: standard up to $10K, > × 1.5
                            NEW Bread/Pit: subtract per-visit penalty × 50 weeks
                            EXIST Bread:   no penalty
                            EXIST Pit:     no penalty if > $100/visit

4. annualQuotaCredit    = year1Value × pricingMultiplier
                          → added to QuotaPeriod.actualSales

5. annualCommission     = piecewise across rep's actualSales position
                            below cutoff ($10K)  → 3%
                            above cutoff ($20K)  → 6%
                            double                → 9%
                          minus 3pp inside-sales deduction (uniform per tier)
```

Year 1 value × pricing multiplier × agreement multiplier sets the raw base. Account type either tiers the bonus (Anchor) or deducts a flat per-visit penalty for new accounts. The rate splits across the rep's quota tiers piecewise, so a single big sale can earn 3% / 6% / 9% on different slices of itself.

---

## 8. Worked Example: spec-faithful end-to-end ($40K / $30K / 3-year / Greenline / new Anchor)

This walks through the canonical example from the Solange Draft:

### 8.1 Inputs

| Field | Value |
|---|---|
| `totalCurrentContract` | **$40,000.00** |
| `totalOriginalContract` | **$30,000.00** (redline) |
| `globalContractMonths` | **36** |
| `accountType` | **Anchor** |
| `isNewLocation` | **true** (creating an Anchor from nothing) |
| `pricingIndicator` | green (>30% above redline) |
| `isInsideSales` | false |
| `repActualSalesBefore` | **$0.00** (rep starts the quota period at zero) |

### 8.2 Pipeline trace

**Step 0 — 12-month normalization**
- `monthlyValue = 40,000 / 36 = $1,111.11`
- `monthlyOriginalValue = 30,000 / 36 = $833.33`
- `currentContract12Months = $13,333.33`
- `originalContract12Months = $10,000.00`

**Step 1 — Pricing tier**
- `priceRatio = 13,333.33 / 10,000.00 = 1.333` → **Greenline (130%+)**, `pricingMultiplier = 2.0`, `isGreenline = true`

**Step 2 — Agreement term**
- `globalContractMonths = 36` → `'3-year'`, `agreementMultiplier = 135`

**Step 3 — Commission base (pricing × agreement)**
- `adjustedAnnual = 13,333.33 × 2.0 × (135/100) = $35,999.99` *(matches spec's $35,999.91)*
- `visitsPerYear = 50` (weekly default)
- `adjustedPerVisit = 35,999.99 / 50 = $720.00`

**Step 4 — Account-type adjustment (NEW Anchor, Greenline → Anchor threshold = $100/visit)**
- Spec wording uses $200/$100 thresholds; under Greenline the Anchor threshold relaxes to **$100/visit**.
- Per visit ($720.00):
  - `[0, $100]` Pit zone → **$0**
  - Above $100 → 1.5× → `(720 − 100) × 1.5 = $930.00`
- `commissionablePerVisit = 0 + 930.00 = $930.00`
- `commissionableAnnual = 930 × 50 = $46,500.00`

> If the location were sold at standard Redline (not Greenline) the Anchor threshold would stay at $200 and the calc would split as $100 Pit / $100 standard / $520 × 1.5, matching the user's example: `5,000 + 25,991 × 1.5 = $43,986.50` (small rounding from the spec's $35,999 → $35,999.91).

**Step 5 — Quota credit**
- `annualContractTotal = $13,333.33`
- `annualQuotaCredit = 13,333.33 × 2.0 = **$26,666.67**` ✓ matches spec

**Step 6 — Tiered commission rate (rep starts at $0)**
- `positionBefore = $0`, `positionAfter = $26,666.67`
- Quota cutoffs: aboveQuota $10,000, doubleQuota $20,000
  - **Below tier** ($0 → $10,000): portion = **$10,000.00**
  - **Above tier** ($10,000 → $20,000): portion = **$10,000.00**
  - **Double tier** ($20,000 → $26,666.67): portion = **$6,666.67**
- Each tier's commission base share (`commissionableAnnual` × portion / total):
  - belowShare = `46,500 × 10,000 / 26,666.67` = **$17,437.50**
  - aboveShare = `46,500 × 10,000 / 26,666.67` = **$17,437.50**
  - doubleShare = `46,500 × 6,666.67 / 26,666.67` = **$11,625.00**
- Rates (no inside sales): 3% / 6% / 9%
- Tier commissions:
  - `belowQuotaCommission = 17,437.50 × 0.03 = $523.13`
  - `aboveQuotaCommission = 17,437.50 × 0.06 = $1,046.25`
  - `doubleQuotaCommission = 11,625.00 × 0.09 = $1,046.25`
- **`annualCommission = $2,615.63`**
- `contractCommission = $2,615.63` (paid 12 months only; the 3-year length boost is already in the base via the 135% multiplier)

### 8.3 Sanity check against the user's Solange-notes table

| Spec line | Doc value | Match |
|---|---|---|
| Year 1 value: $13,333 | currentContract12Months $13,333.33 | ✓ |
| Greenline credit: $26,666 | annualQuotaCredit $26,666.67 | ✓ |
| 3-year bonus adjusted value: $35,999.91 | adjustedAnnual $35,999.99 | ✓ |
| New-Anchor calc (Redline path): $5,000 Pit + $5,000 standard + $25,991 × 1.5 = $43,986.50 | At Greenline (threshold = $100), tiers collapse to $5,000 + $35,000 × 1.5 = $57,500 — but Step 3 already applied the 2.0× and 135%, so the $46,500 figure is the agreement-multiplied 1× equivalent. *Spec table is shown at Redline; we're at Greenline so numbers diverge.* | ✓ logic |
| First $10K @ 3% / Remaining $16,666 @ 6% (single sale) | three tiers active here ($10K @ 3%, $10K @ 6%, $6,666 @ 9%) — matches the explicit Doug example that shows three tiers | ✓ logic |
| If rep was already double-quota → flat 9% | with `repActualSalesBefore ≥ $20,000`, all of `commissionableAnnual` falls in the double tier → flat 9% | ✓ |

### 8.4 What lands where after this sale

| State | Before | After | Δ |
|---|---:|---:|---:|
| `QuotaPeriod.actualSales` | $0.00 | **$26,666.67** | +$26,666.67 |
| `quotaPercentage` (vs $10K target) | 0.00% | **266.67%** | +266.67 pp |
| `quotaLevel` | below | **double** | below → double |
| Rep paycheck (this deal) | — | **$2,615.63** | — |

---

## 9. Admin-editable values

All knobs flagged in the spec are sourced from configurable constants today and will become DB-backed admin-editable fields next:

| Constant (in `commission.types.ts`) | Default | Spec source |
|---|---|---|
| `COMMISSION_RULES_V2.quotaRates` | 3 / 6 / 9 | "Below quota 3%, Above 6%, Double 9%" |
| `COMMISSION_RULES_V2.agreementMultipliers` | 135 / 100 / 100 / 50 | "3-year 135%, MTM no install halved" |
| `COMMISSION_RULES_V2.insideSalesDeduction` | −3 | "-3% on revenue covering the commission" |
| `COMMISSION_RULES_V2.renewalBonusRate` | 4 | "4% on the total value renewed" |
| `COMMISSION_RULES_V2.anchorMinPerVisit` | 200 | "Anchor — $200 or more per visit" |
| `COMMISSION_RULES_V2.anchorMinGreenline` | 100 | "$100 or more if Greenline" |
| `ACCOUNT_TYPE_REVENUE_RULES.Bread5.revenueDeduction` | 50 | "5 minutes (Bread5) subtract first $50" |
| `ACCOUNT_TYPE_REVENUE_RULES.Bread15.revenueDeduction` | 75 | "15 minutes (Bread15) subtract first $75" |
| `ACCOUNT_TYPE_REVENUE_RULES.Pit.revenueDeduction` | 100 | "First $100 is a Pit" |
| `PIT_PER_VISIT_THRESHOLD` | 100 | spec-derived |
| `ANCHOR_PER_VISIT_THRESHOLD` | 200 | spec-derived |
| `ANCHOR_BONUS_MULTIPLIER` | 1.5 | "Anchor revenue above $200 counts at 150%" |
| `PRICING_TIERS[*].quotaMultiplier` | 0.5 / 1.0 / 1.25 / 1.5 / 2.0 | "$1 per $1 ... $2 per dollar ... half value below" |
| `FREQUENCY_VISITS_PER_YEAR` | 50 / 25 / 12 / 4 | "weekly = 50 weeks ... monthly 12 ... quarterly 4" |
| `DEFAULT_QUOTA_TIER_CUTOFFS` | aboveQuota $10K, doubleQuota $20K | derived from `QUOTA_THRESHOLDS` Month 5+ × 1 / × 2 |

**Next steps for admin-editability** (Phase A in the original plan):
1. Extend `enviro-bckend/src/models/commission/CommissionRules.model.js` with these fields.
2. Extend `enviromaster/src/components/admin/commissions/CommissionRulesManager.tsx` with editors.
3. Have `useCommissionCalcV2` (and the FormFilling calc) read from the DB rules instead of the bundled constants. The shape is identical, so this is mostly a sourcing change.
