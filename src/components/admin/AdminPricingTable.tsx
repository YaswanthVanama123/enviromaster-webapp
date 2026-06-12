import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FaPlus, FaArrowUp, FaDownload, FaTrashAlt } from "react-icons/fa";
import { usePricing } from "../../pricing/pricingStore";
import type { PriceRow, Frequency, UnitType, Category } from "../../pricing/pricingTypes";
import { toCsv, fromCsv } from "../../pricing/pricingCsv";

const FREQS: Frequency[] = [
  "Weekly",
  "Biweekly",
  "Monthly",
  "Bimonthly",
  "Quarterly",
  "One-Time",
  "Hourly",
];

const CATS: Category[] = ["Small Product", "Dispenser", "Big Product", "Service"];

const UNITS: UnitType[] = [
  "per_fixture",
  "per_drain",
  "per_window_small",
  "per_window_medium",
  "per_window_large",
  "per_sqft",
  "per_room",
  "per_1000_sqft",
  "per_bathroom",
  "per_case",
  "per_gallon",
  "per_item",
  "per_hour",
];

export default function AdminPricingTable() {
  const { t } = useTranslation();
  const { rows, upsertRow, removeRow, exportRows, importRows } = usePricing();
  const [filter, setFilter] = useState("");

  const filtered = useMemo(
    () =>
      rows.filter((r) =>
        r.displayName.toLowerCase().includes(filter.toLowerCase())
      ),
    [rows, filter]
  );

  const addRow = () => {
    const id = `svc_${Date.now()}`;
    const row: PriceRow = {
      id,
      serviceKey: id,
      displayName: t("adminPricing.table.newService"),
      category: "Service",
      unitType: "per_item",
      base: { Weekly: 0 },
    };
    upsertRow(row);
  };

  const onExport = () => {
    const csv = toCsv(exportRows());
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pricing.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const onImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result);
      const nextRows = fromCsv(text);
      importRows(nextRows);
    };
    reader.readAsText(file);
  };

  const update = (patch: Partial<PriceRow>, id: string) => {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    upsertRow({ ...row, ...patch });
  };

  const updateBase = (id: string, freq: Frequency, value: string) => {
    const v = Number(value) || 0;
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    upsertRow({ ...row, base: { ...row.base, [freq]: v } });
  };

  return (
    <section className="pc">
      <div className="pc__hero">{t("adminPricing.table.hero")}</div>
      <div className="pc__breadcrumb">{t("adminPricing.table.breadcrumb")}</div>

      <div className="pc__toolbar">
        <input
          className="pc__search"
          placeholder={t("adminPricing.table.searchPlaceholder")}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <div className="pc__spacer" />
        <button className="pc__btn pc__btn--light" onClick={addRow}>
          <FaPlus /> {t("adminPricing.table.addService")}
        </button>
        <label className="pc__btn pc__btn--light" style={{ cursor: "pointer" }}>
          <FaArrowUp /> {t("adminPricing.table.importCsv")}
          <input
            type="file"
            accept=".csv"
            hidden
            onChange={(e) => e.target.files && onImport(e.target.files[0])}
          />
        </label>
        <button className="pc__btn pc__btn--primary" onClick={onExport}>
          <FaDownload /> {t("adminPricing.table.exportCsv")}
        </button>
      </div>

      <div className="pc__tablewrap">
        <table className="pc__table">
          <thead>
            <tr>
              <th>{t("adminPricing.table.thServiceName")}</th>
              <th>{t("adminPricing.table.thKey")}</th>
              <th>{t("adminPricing.table.thCategory")}</th>
              <th>{t("adminPricing.table.thUnit")}</th>
              {FREQS.map((f) => (
                <th key={f}>{f}</th>
              ))}
              <th>{t("adminPricing.table.thMin")}</th>
              <th>{t("adminPricing.table.thInstall")}</th>
              <th>{t("adminPricing.table.thActions")}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id}>
                <td>
                  <input
                    className="service-input"
                    value={r.displayName}
                    onChange={(e) =>
                      update({ displayName: e.target.value }, r.id)
                    }
                  />
                </td>
                <td>
                  <input
                    className="service-input"
                    value={r.serviceKey}
                    onChange={(e) =>
                      update({ serviceKey: e.target.value }, r.id)
                    }
                  />
                </td>
                <td>
                  <select
                    className="service-type"
                    value={r.category}
                    onChange={(e) =>
                      update({ category: e.target.value as Category }, r.id)
                    }
                  >
                    {CATS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <select
                    className="service-type"
                    value={r.unitType}
                    onChange={(e) =>
                      update({ unitType: e.target.value as UnitType }, r.id)
                    }
                  >
                    {UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </td>

                {FREQS.map((f) => (
                  <td key={`${r.id}-${f}`}>
                    <input
                      type="number"
                      className="price-input"
                      value={r.base[f] ?? 0}
                      onChange={(e) => updateBase(r.id, f, e.target.value)}
                    />
                  </td>
                ))}

                <td>
                  <input
                    type="number"
                    className="price-input"
                    value={r.minimum ?? ""}
                    onChange={(e) =>
                      update(
                        {
                          minimum: e.target.value
                            ? Number(e.target.value)
                            : undefined,
                        },
                        r.id
                      )
                    }
                  />
                </td>
                <td>
                  <input
                    type="number"
                    className="price-input"
                    value={r.installMultiplier ?? ""}
                    onChange={(e) =>
                      update(
                        {
                          installMultiplier: e.target.value
                            ? Number(e.target.value)
                            : undefined,
                        },
                        r.id
                      )
                    }
                  />
                </td>
                <td>
                  <button
                    className="pc__btn pc__btn--light"
                    onClick={() => removeRow(r.id)}
                  >
                    <FaTrashAlt />
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5 + FREQS.length + 3} style={{ textAlign: "center", color: "#888" }}>
                  {t("adminPricing.table.noResults")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
