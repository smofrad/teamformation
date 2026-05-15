export type QuoteLineItem = {
  id: string;
  productName: string;
  price: number;
  roi: number;
};

export type QuoteSource = "manual" | "salesforce" | "imported";

export type QuoteRecord = {
  id: string;
  quoteNumber: string;
  title: string;
  customerName: string;
  contactName: string;
  contactEmail: string;
  validUntil: string;
  notes: string;
  currency: string;
  source: QuoteSource;
  salesforceOpportunityId: string;
  createdAt: string;
  updatedAt: string;
  lineItems: QuoteLineItem[];
};

export const QUOTE_STORAGE_KEY = "quote-builder.saved-quotes";
export const QUOTE_DRAFT_KEY = "quote-builder.current-draft";

function createLineItem(id?: string): QuoteLineItem {
  return {
    id: id || crypto.randomUUID(),
    productName: "",
    price: 0,
    roi: 0,
  };
}

export function createEmptyQuote(seed?: {
  id?: string;
  quoteNumber?: string;
  createdAt?: string;
  updatedAt?: string;
  lineItemId?: string;
}): QuoteRecord {
  const now = seed?.createdAt || new Date().toISOString();
  const fallbackQuoteNumber = `OFF-${new Date(now).getFullYear()}-${String(new Date(now).getTime()).slice(-6)}`;

  return {
    id: seed?.id || crypto.randomUUID(),
    quoteNumber: seed?.quoteNumber || fallbackQuoteNumber,
    title: "Ny offert",
    customerName: "",
    contactName: "",
    contactEmail: "",
    validUntil: "",
    notes: "",
    currency: "SEK",
    source: "manual",
    salesforceOpportunityId: "",
    createdAt: now,
    updatedAt: seed?.updatedAt || now,
    lineItems: [createLineItem(seed?.lineItemId)],
  };
}

function normalizeLineItem(item: Partial<QuoteLineItem> | undefined): QuoteLineItem {
  return {
    id: item?.id || crypto.randomUUID(),
    productName: item?.productName || "",
    price: Number(item?.price) || 0,
    roi: Number(item?.roi) || 0,
  };
}

export function normalizeQuoteRecord(input: Partial<QuoteRecord> | undefined): QuoteRecord {
  const base = createEmptyQuote();

  return {
    ...base,
    ...input,
    id: input?.id || base.id,
    quoteNumber: input?.quoteNumber || base.quoteNumber,
    title: input?.title || base.title,
    customerName: input?.customerName || "",
    contactName: input?.contactName || "",
    contactEmail: input?.contactEmail || "",
    validUntil: input?.validUntil || "",
    notes: input?.notes || "",
    currency: input?.currency || "SEK",
    source: input?.source || "manual",
    salesforceOpportunityId: input?.salesforceOpportunityId || "",
    createdAt: input?.createdAt || base.createdAt,
    updatedAt: input?.updatedAt || base.updatedAt,
    lineItems:
      input?.lineItems && input.lineItems.length > 0
        ? input.lineItems.map((item) => normalizeLineItem(item))
        : [createLineItem()],
  };
}

export function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value: number) {
  return `${new Intl.NumberFormat("sv-SE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value)}%`;
}
