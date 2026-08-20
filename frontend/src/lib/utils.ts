import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, currency = "GTQ"): string {
  if (currency === "GTQ") {
    return `Q${new Intl.NumberFormat("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}`;
  }
  return new Intl.NumberFormat("es-GT", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(value);
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("es-ES", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
