import { FixedExpense, MonthData } from "./types";

export const CATEGORY_COLORS: Record<string, string> = {
  Alimentation: "#2F6F4E",
  Essence: "#C9A24B",
  Restaurants: "#B3432B",
  Loisirs: "#4C7EA8",
  Santé: "#7A5C9E",
  Shopping: "#C97A2B",
  Transport: "#3E8E8C",
  Factures: "#6B7280",
  Divers: "#9C8B6E"
};

export const DEFAULT_FIXED: FixedExpense[] = [
  { id: "virement", name: "Virement", amount: 470 },
  { id: "apple", name: "Apple", amount: 20 },
  { id: "assurance", name: "Assurance auto", amount: 115 },
  { id: "mutuelle", name: "Mutuelle", amount: 55 },
  { id: "essence_fixe", name: "Plein d'essence", amount: 80 },
  { id: "coiffeur", name: "Coiffeur", amount: 25 },
  { id: "telephone", name: "Forfait téléphone", amount: 10 },
  { id: "credit", name: "Crédit auto", amount: 0 },
  { id: "frais", name: "Frais bancaires", amount: 12 },
  { id: "netflix", name: "Netflix", amount: 8 }
];

export const DEFAULT_REVENU = 1770;
export const STORAGE_KEY = "mon-budget-data-v1";

export const pad = (n: number) => n.toString().padStart(2, "0");

export const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};

export const shiftMonth = (key: string, delta: number) => {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};

export const monthLabel = (key: string) => {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  const label = d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
};

export const daysInMonth = (key: string) => {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m, 0).getDate();
};

export const formatEuro = (n: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
    minimumFractionDigits: 0
  }).format(Number.isFinite(n) ? n : 0);

export const defaultMonth = (key: string): MonthData => ({
  key,
  revenu: DEFAULT_REVENU,
  fixedExpenses: DEFAULT_FIXED.map((f) => ({ ...f })),
  savings: 0,
  expenses: []
});
