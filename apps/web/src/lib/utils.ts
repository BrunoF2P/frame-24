import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

export const DEFAULT_APP_TIMEZONE = "America/Bahia";

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  }).format(value);

export const formatRuntime = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;

  if (!hours) {
    return `${remaining} min`;
  }

  return `${hours}h${remaining.toString().padStart(2, "0")}`;
};

export const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export const unique = <T,>(items: T[]) => Array.from(new Set(items));

const safeDate = (value: string | Date) => (value instanceof Date ? value : new Date(value));

export const formatDateInTimeZone = (
  value: string | Date,
  timeZone = DEFAULT_APP_TIMEZONE,
  locale = "pt-BR",
) =>
  new Intl.DateTimeFormat(locale, {
    timeZone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(safeDate(value));

export const formatDateLabelInTimeZone = (
  value: string | Date,
  timeZone = DEFAULT_APP_TIMEZONE,
  locale = "pt-BR",
) =>
  new Intl.DateTimeFormat(locale, {
    timeZone,
    day: "2-digit",
    month: "long",
  }).format(safeDate(value));

export const formatTimeInTimeZone = (
  value: string | Date,
  timeZone = DEFAULT_APP_TIMEZONE,
  locale = "pt-BR",
) =>
  new Intl.DateTimeFormat(locale, {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(safeDate(value));

export const formatDateTimeInTimeZone = (
  value: string | Date,
  timeZone = DEFAULT_APP_TIMEZONE,
  locale = "pt-BR",
) =>
  new Intl.DateTimeFormat(locale, {
    timeZone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(safeDate(value));
