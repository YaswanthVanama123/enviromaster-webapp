import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FaStopwatch, FaPlus } from "react-icons/fa";
import "./PriceChanges.css";

type Category = "Small Product" | "Dispenser" | "Big Product";

type PriceItem = {
  id: number;
  service: string;
  category: Category;
  currentPrice: number;
  newPrice: number;
  effectiveFrom: string;
  frequency: string;
  lastUpdated: string;
};

const CATEGORIES: Category[] = ["Small Product", "Dispenser", "Big Product"];

const CATEGORY_LABEL_KEYS: Record<Category, string> = {
  "Small Product": "misc.pcCatSmallProduct",
  "Dispenser": "misc.pcCatDispenser",
  "Big Product": "misc.pcCatBigProduct",
};

export default function PriceChanges() {
  const { t } = useTranslation();
  const [data, setData] = useState<PriceItem[]>([
    { id: 1, service: "Restroom",       category: "Small Product", currentPrice: 20, newPrice: 22, effectiveFrom: "2024-05-01", frequency: "Weekly",  lastUpdated: "2024-05-01" },
    { id: 2, service: "Kitchen",        category: "Small Product", currentPrice: 15, newPrice: 15, effectiveFrom: "2024-05-01", frequency: "Weekly",  lastUpdated: "2024-05-01" },
    { id: 3, service: "Drain",          category: "Dispenser",     currentPrice: 30, newPrice: 12, effectiveFrom: "2024-05-01", frequency: "Weekly",  lastUpdated: "2024-05-01" },
    { id: 4, service: "Hand Sanitizer", category: "Dispenser",     currentPrice: 10, newPrice: 12, effectiveFrom: "2024-05-01", frequency: "Monthly", lastUpdated: "2024-05-01" },
    { id: 5, service: "MicroMax Floor", category: "Big Product",   currentPrice: 25, newPrice: 22, effectiveFrom: "2024-05-01", frequency: "Monthly", lastUpdated: "2024-05-01" },
  ]);

  const [alertMessage, setAlertMessage] = useState(
    t("misc.pcDefaultAlert")
  );

  const handleServiceChange = (id: number, value: string) =>
    setData(prev => prev.map(it => (it.id === id ? { ...it, service: value } : it)));

  const handleCategoryChange = (id: number, value: Category) =>
    setData(prev => prev.map(it => (it.id === id ? { ...it, category: value } : it)));

  const handlePriceChange = (id: number, value: string) =>
    setData(prev => prev.map(it => (it.id === id ? { ...it, newPrice: Number(value) || 0 } : it)));

  const addNewService = () => {
    const today = new Date().toISOString().split("T")[0];
    const newItem: PriceItem = {
      id: Date.now(),
      service: "",
      category: "Small Product",
      currentPrice: 0,
      newPrice: 0,
      effectiveFrom: today,
      frequency: "Weekly",
      lastUpdated: today,
    };
    setData(prev => [...prev, newItem]);
  };

  const saveChanges = () => {
    setAlertMessage(t("misc.pcSavedAlert"));
  };

  return (
    <section className="pc">
      <div className="pc__hero">{t("misc.pcTitle")}</div>
      <div className="pc__breadcrumb">{t("misc.pcBreadcrumb")}</div>
      <div className="pc__alert">{alertMessage}</div>

      <div className="pc__tablewrap">
        <table className="pc__table">
          <thead>
            <tr>
              <th>{t("misc.pcThService")}</th>
              <th>{t("misc.pcThType")}</th>
              <th>{t("misc.pcThCurrentPrice")}</th>
              <th>{t("misc.pcThNewPrice")}</th>
              <th>{t("misc.pcThEffectiveFrom")}</th>
              <th>{t("misc.pcThFrequency")}</th>
              <th>{t("misc.pcThLastUpdated")}</th>
            </tr>
          </thead>
          <tbody>
            {data.map(item => (
              <tr key={item.id}>
                <td>
                  <input
                    type="text"
                    className="service-input"
                    value={item.service}
                    placeholder={t("misc.pcServicePlaceholder")}
                    onChange={e => handleServiceChange(item.id, e.target.value)}
                  />
                </td>
                <td>
                  <select
                    className="service-type"
                    value={item.category}
                    onChange={e => handleCategoryChange(item.id, e.target.value as Category)}
                  >
                    {CATEGORIES.map(c => (
                      <option key={c} value={c}>{t(CATEGORY_LABEL_KEYS[c])}</option>
                    ))}
                  </select>
                </td>
                <td>${item.currentPrice}</td>
                <td>
                  <input
                    type="number"
                    className="price-input"
                    value={item.newPrice}
                    onChange={e => handlePriceChange(item.id, e.target.value)}
                  />
                </td>
                <td>{new Date(item.effectiveFrom).toLocaleDateString()}</td>
                <td>{item.frequency}</td>
                <td className="clock"><FaStopwatch /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pc__footer">
        <button className="pc__btn pc__btn--light" onClick={addNewService}>
          <FaPlus /> {t("misc.pcAddService")}
        </button>
        <button className="pc__btn pc__btn--primary" onClick={saveChanges}>
          {t("misc.pcSaveChanges")}
        </button>
      </div>
    </section>
  );
}
