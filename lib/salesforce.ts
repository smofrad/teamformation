import { type QuoteLineItem, type QuoteRecord, normalizeQuoteRecord } from "@/lib/quote";

export type SalesforceOpportunitySummary = {
  id: string;
  name: string;
  accountName: string;
  primaryContactName: string;
  primaryContactEmail: string;
  closeDate?: string;
  products: Array<{
    id: string;
    productName: string;
    unitPrice: number;
    estimatedRoi: number;
  }>;
};

export type QuoteDataProvider = {
  listOpportunities: () => Promise<SalesforceOpportunitySummary[]>;
  getOpportunity: (id: string) => Promise<SalesforceOpportunitySummary | null>;
};

export function mapOpportunityToQuote(opportunity: SalesforceOpportunitySummary): QuoteRecord {
  const lineItems: QuoteLineItem[] = opportunity.products.map((product) => ({
    id: product.id,
    productName: product.productName,
    price: product.unitPrice,
    roi: product.estimatedRoi,
  }));

  return normalizeQuoteRecord({
    title: `Offert för ${opportunity.accountName}`,
    customerName: opportunity.accountName,
    contactName: opportunity.primaryContactName,
    contactEmail: opportunity.primaryContactEmail,
    validUntil: opportunity.closeDate || "",
    source: "salesforce",
    salesforceOpportunityId: opportunity.id,
    lineItems,
  });
}

export const mockSalesforceProvider: QuoteDataProvider = {
  async listOpportunities() {
    return [];
  },
  async getOpportunity() {
    return null;
  },
};
