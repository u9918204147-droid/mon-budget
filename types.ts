export const CATEGORIES = [
  "Alimentation",
  "Essence",
  "Restaurants",
  "Loisirs",
  "Santé",
  "Shopping",
  "Transport",
  "Factures",
  "Divers"
] as const;

export type CategoryName = (typeof CATEGORIES)[number];

export interface FixedExpense {
  id: string;
  name: string;
  amount: number;
}

export interface Expense {
  id: string;
  date: string; // format YYYY-MM-DD
  category: string;
  amount: number;
  note: string;
}

export interface MonthData {
  key: string; // format YYYY-MM
  revenu: number;
  fixedExpenses: FixedExpense[];
  savings: number;
  expenses: Expense[];
}

export type AllData = Record<string, MonthData>;
