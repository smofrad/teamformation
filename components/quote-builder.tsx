"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import { CheckCircle2, Download, FileUp, Plus, RefreshCcw, Save, Trash2, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  QUOTE_DRAFT_KEY,
  QUOTE_STORAGE_KEY,
  createEmptyQuote,
  formatCurrency,
  formatPercent,
  normalizeQuoteRecord,
  type QuoteRecord,
} from "@/lib/quote";

const INITIAL_QUOTE = createEmptyQuote({
  id: "initial-quote",
  lineItemId: "initial-line-item",
  quoteNumber: "OFF-2026-000000",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
});

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function createPdfDocument(quote: QuoteRecord, totalPrice: number, averageRoi: number) {
  const rows = quote.lineItems
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.productName || "Ej angivet")}</td>
          <td class="numeric">${escapeHtml(formatCurrency(item.price, quote.currency))}</td>
          <td class="numeric">${escapeHtml(formatPercent(item.roi))}</td>
        </tr>
      `
    )
    .join("");

  return `
    <!doctype html>
    <html lang="sv">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(quote.quoteNumber)}</title>
        <style>
          body {
            font-family: "Avenir Next", "Segoe UI", sans-serif;
            margin: 40px;
            color: #172033;
          }
          .header {
            display: flex;
            justify-content: space-between;
            gap: 24px;
            margin-bottom: 32px;
          }
          .badge {
            display: inline-block;
            padding: 6px 10px;
            border-radius: 999px;
            background: #e8f7f1;
            color: #0f6a4e;
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 0.04em;
            text-transform: uppercase;
          }
          h1, h2, p {
            margin: 0;
          }
          h1 {
            font-size: 28px;
            margin-top: 10px;
          }
          h2 {
            font-size: 16px;
            margin-bottom: 10px;
          }
          .meta, .summary {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px 24px;
            margin-bottom: 28px;
          }
          .panel {
            border: 1px solid #d9d2c2;
            border-radius: 18px;
            padding: 18px;
            background: #fffdfa;
          }
          .label {
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #6b7280;
            margin-bottom: 4px;
          }
          .value {
            font-size: 16px;
            font-weight: 600;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 28px;
          }
          th, td {
            padding: 14px 12px;
            border-bottom: 1px solid #e7e1d4;
            text-align: left;
          }
          th {
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #6b7280;
          }
          .numeric {
            text-align: right;
          }
          .notes {
            white-space: pre-wrap;
            line-height: 1.6;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="badge">Offert</div>
            <h1>${escapeHtml(quote.title || quote.quoteNumber)}</h1>
            <p>${escapeHtml(quote.quoteNumber)}</p>
          </div>
          <div class="panel">
            <div class="label">Kund</div>
            <div class="value">${escapeHtml(quote.customerName || "Ej angivet")}</div>
            <div class="label" style="margin-top: 12px;">Kontakt</div>
            <div>${escapeHtml(quote.contactName || "Ej angivet")}</div>
            <div>${escapeHtml(quote.contactEmail || "")}</div>
          </div>
        </div>

        <div class="meta">
          <div class="panel">
            <div class="label">Giltig till</div>
            <div class="value">${escapeHtml(quote.validUntil || "Ej satt")}</div>
          </div>
          <div class="panel">
            <div class="label">Datakälla</div>
            <div class="value">${escapeHtml(quote.source)}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Produkt</th>
              <th class="numeric">Pris</th>
              <th class="numeric">ROI</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>

        <div class="summary">
          <div class="panel">
            <div class="label">Totalt pris</div>
            <div class="value">${escapeHtml(formatCurrency(totalPrice, quote.currency))}</div>
          </div>
          <div class="panel">
            <div class="label">Snitt-ROI</div>
            <div class="value">${escapeHtml(formatPercent(averageRoi))}</div>
          </div>
        </div>

        <div class="panel">
          <h2>Noteringar</h2>
          <div class="notes">${escapeHtml(quote.notes || "Inga noteringar.")}</div>
        </div>
      </body>
    </html>
  `;
}

export function QuoteBuilder() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const printFrameRef = useRef<HTMLIFrameElement>(null);
  const [quote, setQuote] = useState<QuoteRecord>(INITIAL_QUOTE);
  const [savedQuotes, setSavedQuotes] = useState<QuoteRecord[]>([]);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string>("");
  const [isReady, setIsReady] = useState(false);
  const [status, setStatus] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  function readStorage(key: string) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      setStatus({
        tone: "error",
        message: "Webbläsaren blockerar lokal lagring. Offerten kan fortfarande exporteras som fil.",
      });
      return null;
    }
  }

  function writeStorage(key: string, value: string) {
    try {
      window.localStorage.setItem(key, value);
      return true;
    } catch {
      setStatus({
        tone: "error",
        message: "Kunde inte skriva till lokal lagring. Exportera offerten som fil tills vidare.",
      });
      return false;
    }
  }

  useEffect(() => {
    const storedQuotes = readStorage(QUOTE_STORAGE_KEY);
    const storedDraft = readStorage(QUOTE_DRAFT_KEY);
    let nextQuote = createEmptyQuote();

    if (storedQuotes) {
      try {
        const parsed = JSON.parse(storedQuotes) as QuoteRecord[];
        setSavedQuotes(parsed.map((item) => normalizeQuoteRecord(item)));
      } catch {
        setStatus({ tone: "error", message: "Tidigare sparade offerter kunde inte läsas in." });
      }
    }

    if (storedDraft) {
      try {
        nextQuote = normalizeQuoteRecord(JSON.parse(storedDraft) as QuoteRecord);
      } catch {
        setStatus({ tone: "error", message: "Tidigare utkast kunde inte läsas in." });
      }
    }

    setQuote(nextQuote);
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady) return;
    writeStorage(QUOTE_DRAFT_KEY, JSON.stringify(quote));
  }, [isReady, quote]);

  useEffect(() => {
    if (!isReady) return;
    writeStorage(QUOTE_STORAGE_KEY, JSON.stringify(savedQuotes));
  }, [isReady, savedQuotes]);

  const totalPrice = quote.lineItems.reduce((sum, item) => sum + item.price, 0);
  const averageRoi =
    quote.lineItems.length > 0 ? quote.lineItems.reduce((sum, item) => sum + item.roi, 0) / quote.lineItems.length : 0;

  function updateQuote<K extends keyof QuoteRecord>(field: K, value: QuoteRecord[K]) {
    setQuote((current) => ({
      ...current,
      [field]: value,
      updatedAt: new Date().toISOString(),
    }));
  }

  function updateLineItem(id: string, field: "productName" | "price" | "roi", value: string) {
    setQuote((current) => ({
      ...current,
      updatedAt: new Date().toISOString(),
      lineItems: current.lineItems.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]: field === "productName" ? value : Number(value) || 0,
            }
          : item
      ),
    }));
  }

  function addLineItem() {
    setQuote((current) => ({
      ...current,
      updatedAt: new Date().toISOString(),
      lineItems: [
        ...current.lineItems,
        {
          id: crypto.randomUUID(),
          productName: "",
          price: 0,
          roi: 0,
        },
      ],
    }));
  }

  function removeLineItem(id: string) {
    setQuote((current) => ({
      ...current,
      updatedAt: new Date().toISOString(),
      lineItems:
        current.lineItems.length === 1
          ? current.lineItems
          : current.lineItems.filter((item) => item.id !== id),
    }));
  }

  function saveQuote() {
    const normalized = normalizeQuoteRecord({
      ...quote,
      updatedAt: new Date().toISOString(),
    });

    setQuote(normalized);
    setSavedQuotes((current) => {
      const exists = current.some((item) => item.id === normalized.id);
      if (exists) {
        return current.map((item) => (item.id === normalized.id ? normalized : item));
      }

      return [normalized, ...current];
    });
    setSelectedQuoteId(normalized.id);
    setStatus({ tone: "success", message: `Offerten ${normalized.quoteNumber} sparades lokalt.` });
  }

  function createNewQuote() {
    const nextQuote = createEmptyQuote();
    setQuote(nextQuote);
    setSelectedQuoteId("");
  }

  function loadQuote(id: string) {
    const selected = savedQuotes.find((item) => item.id === id);
    if (!selected) return;

    setQuote(normalizeQuoteRecord(selected));
    setSelectedQuoteId(id);
  }

  function triggerImport() {
    fileInputRef.current?.click();
  }

  async function importQuote(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const raw = await file.text();
      const imported = normalizeQuoteRecord(JSON.parse(raw) as QuoteRecord);
      imported.source = "imported";
      imported.updatedAt = new Date().toISOString();

      setQuote(imported);
      setSavedQuotes((current) => [imported, ...current.filter((item) => item.id !== imported.id)]);
      setSelectedQuoteId(imported.id);
      setStatus({ tone: "success", message: `Offerten ${imported.quoteNumber} importerades.` });
    } catch {
      setStatus({ tone: "error", message: "Filen kunde inte importeras. Kontrollera att det är en giltig offertfil." });
    }
    event.target.value = "";
  }

  function exportPdf() {
    const frame = printFrameRef.current;
    if (!frame) {
      setStatus({ tone: "error", message: "PDF-exporten kunde inte startas." });
      return;
    }

    const frameWindow = frame.contentWindow;
    const frameDocument = frameWindow?.document;
    if (!frameWindow || !frameDocument) {
      setStatus({ tone: "error", message: "PDF-exporten kunde inte startas i den här webbläsaren." });
      return;
    }

    frameDocument.open();
    frameDocument.write(createPdfDocument(quote, totalPrice, averageRoi));
    frameDocument.close();

    window.setTimeout(() => {
      frameWindow.focus();
      frameWindow.print();
      setStatus({ tone: "success", message: "PDF-dialogen öppnades. Välj Spara som PDF i utskriftsrutan." });
    }, 250);
  }

  function exportQuoteFile() {
    const blob = new Blob([JSON.stringify(quote, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${quote.quoteNumber || "offert"}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setStatus({ tone: "success", message: "Offerten exporterades som JSON-fil för senare redigering." });
  }

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-8 md:px-8">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-8rem] top-16 h-72 w-72 rounded-full bg-emerald-300/20 blur-3xl" />
        <div className="absolute right-[-6rem] top-8 h-80 w-80 rounded-full bg-amber-300/25 blur-3xl" />
        <div className="absolute bottom-[-8rem] left-1/3 h-80 w-80 rounded-full bg-slate-300/30 blur-3xl" />
      </div>

      <div className="relative mx-auto flex max-w-7xl flex-col gap-6">
        <iframe ref={printFrameRef} title="quote-print-frame" className="hidden" />
        <section className="surface relative overflow-hidden border-white/80 bg-white/75 p-6 md:p-8">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.58),rgba(255,255,255,0.16))]" />
          <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-grid opacity-30 lg:block" />
          <div className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr]">
            <div className="relative space-y-5">
              <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                Offerthantering
              </span>
              <div className="space-y-3">
                <h1 className="max-w-3xl text-4xl font-semibold tracking-tight md:text-5xl">
                  Skapa, uppdatera och exportera offerter i ett redigerbart arbetsflöde.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-muted-foreground">
                  Fyll i kund- och produktdata, lägg till dynamiska rader för pris och ROI, spara utkast lokalt och
                  öppna tidigare offerter för fortsatt redigering.
                </p>
              </div>
              <div className="grid max-w-2xl gap-3 sm:grid-cols-3">
                <div className="rounded-[22px] border border-white/70 bg-white/75 p-4 shadow-soft">
                  <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Edit-läge</div>
                  <div className="mt-2 text-lg font-semibold">Live uppdatering</div>
                </div>
                <div className="rounded-[22px] border border-white/70 bg-white/75 p-4 shadow-soft">
                  <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Export</div>
                  <div className="mt-2 text-lg font-semibold">PDF + JSON</div>
                </div>
                <div className="rounded-[22px] border border-white/70 bg-white/75 p-4 shadow-soft">
                  <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">CRM redo</div>
                  <div className="mt-2 text-lg font-semibold">Salesforce-klar</div>
                </div>
              </div>
            </div>

            <Card className="relative overflow-hidden border-white/80 bg-slate-950 text-white">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(52,211,153,0.34),transparent_34%),linear-gradient(180deg,rgba(15,23,42,1),rgba(2,6,23,0.92))]" />
              <CardHeader>
                <CardTitle className="relative text-white">Förberedd för Salesforce</CardTitle>
                <CardDescription>
                  <span className="relative text-slate-300">
                    Datamodellen innehåller redan fält för opportunity-id och källa, så vi kan ansluta konton,
                    kontakter och produktposter utan att ändra offertformatet.
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent className="relative grid gap-4 text-sm text-slate-300">
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                  Klar för mapping av:
                  <div className="mt-2 font-medium text-white">
                    account, primary contact, opportunity, products, estimated ROI
                  </div>
                </div>
                <div className="rounded-2xl border border-dashed border-white/20 p-4">
                  Nästa steg blir att byta mock-provider mot Salesforce API eller middleware.
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
          <Card className="surface border-white/80 bg-white/80">
            <CardHeader className="gap-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <CardTitle>Redigera offert</CardTitle>
                  <CardDescription>Arbeta i edit-läge och bygg upp offerten rad för rad.</CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={createNewQuote}>
                    <RefreshCcw className="h-4 w-4" />
                    Ny offert
                  </Button>
                  <Button type="button" variant="secondary" onClick={saveQuote}>
                    <Save className="h-4 w-4" />
                    Spara offert
                  </Button>
                  <Button type="button" variant="outline" onClick={exportQuoteFile}>
                    <FileUp className="h-4 w-4" />
                    Exportera offertfil
                  </Button>
                  <Button type="button" onClick={exportPdf}>
                    <Download className="h-4 w-4" />
                    Generera PDF
                  </Button>
                </div>
              </div>
              {status ? (
                <div
                  className={`flex items-center gap-2 rounded-2xl px-4 py-3 text-sm ${
                    status.tone === "success"
                      ? "border border-emerald-200 bg-emerald-50 text-emerald-900"
                      : "border border-rose-200 bg-rose-50 text-rose-900"
                  }`}
                >
                  {status.tone === "success" ? <CheckCircle2 className="h-4 w-4" /> : <TriangleAlert className="h-4 w-4" />}
                  <span>{status.message}</span>
                </div>
              ) : null}
            </CardHeader>
            <CardContent className="grid gap-8">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="quote-title">Offerttitel</Label>
                  <Input
                    id="quote-title"
                    value={quote.title}
                    onChange={(event) => updateQuote("title", event.target.value)}
                    placeholder="Ex. Q2 Expansion"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="quote-number">Offertnummer</Label>
                  <Input
                    id="quote-number"
                    value={quote.quoteNumber}
                    onChange={(event) => updateQuote("quoteNumber", event.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="customer-name">Kundnamn</Label>
                  <Input
                    id="customer-name"
                    value={quote.customerName}
                    onChange={(event) => updateQuote("customerName", event.target.value)}
                    placeholder="Företagsnamn"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="valid-until">Giltig till</Label>
                  <Input
                    id="valid-until"
                    type="date"
                    value={quote.validUntil}
                    onChange={(event) => updateQuote("validUntil", event.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="contact-name">Kontaktperson</Label>
                  <Input
                    id="contact-name"
                    value={quote.contactName}
                    onChange={(event) => updateQuote("contactName", event.target.value)}
                    placeholder="Namn"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="contact-email">Kontaktmail</Label>
                  <Input
                    id="contact-email"
                    type="email"
                    value={quote.contactEmail}
                    onChange={(event) => updateQuote("contactEmail", event.target.value)}
                    placeholder="namn@bolag.se"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="currency">Valuta</Label>
                  <Input
                    id="currency"
                    value={quote.currency}
                    onChange={(event) => updateQuote("currency", event.target.value.toUpperCase())}
                    placeholder="SEK"
                    maxLength={3}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="opportunity-id">Salesforce opportunity-id</Label>
                  <Input
                    id="opportunity-id"
                    value={quote.salesforceOpportunityId}
                    onChange={(event) => updateQuote("salesforceOpportunityId", event.target.value)}
                    placeholder="Fylls senare via integration"
                  />
                </div>
              </div>

              <div className="grid gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">Produkter</h2>
                    <p className="text-sm text-muted-foreground">Dynamiska fält för produktnamn, pris och ROI.</p>
                  </div>
                  <Button type="button" variant="outline" onClick={addLineItem}>
                    <Plus className="h-4 w-4" />
                    Lägg till rad
                  </Button>
                </div>

                <div className="grid gap-3">
                  {quote.lineItems.map((item, index) => (
                    <div key={item.id} className="grid gap-3 rounded-2xl border border-border/80 bg-secondary/30 p-4 md:grid-cols-[1.4fr_0.7fr_0.7fr_auto]">
                      <div className="grid gap-2">
                        <Label htmlFor={`product-${item.id}`}>Produktnamn #{index + 1}</Label>
                        <Input
                          id={`product-${item.id}`}
                          value={item.productName}
                          onChange={(event) => updateLineItem(item.id, "productName", event.target.value)}
                          placeholder="Produkt eller tjänst"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor={`price-${item.id}`}>Pris</Label>
                        <Input
                          id={`price-${item.id}`}
                          type="number"
                          min="0"
                          value={item.price}
                          onChange={(event) => updateLineItem(item.id, "price", event.target.value)}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor={`roi-${item.id}`}>ROI %</Label>
                        <Input
                          id={`roi-${item.id}`}
                          type="number"
                          min="0"
                          step="0.1"
                          value={item.roi}
                          onChange={(event) => updateLineItem(item.id, "roi", event.target.value)}
                        />
                      </div>
                      <div className="flex items-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeLineItem(item.id)}
                          disabled={quote.lineItems.length === 1}
                          aria-label={`Ta bort produkt ${index + 1}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="notes">Noteringar</Label>
                <Textarea
                  id="notes"
                  value={quote.notes}
                  onChange={(event) => updateQuote("notes", event.target.value)}
                  placeholder="Villkor, implementation, antaganden eller nästa steg."
                />
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6">
            <Card className="surface border-white/80 bg-white/80">
              <CardHeader>
                <CardTitle>Förhandsvisning</CardTitle>
                <CardDescription>Live-sammanfattning av offerten som PDF-exporten bygger på.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="relative overflow-hidden rounded-[24px] bg-slate-950 p-5 text-slate-50">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.25),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(52,211,153,0.2),transparent_28%)]" />
                  <div className="text-xs uppercase tracking-[0.24em] text-emerald-300">Offert</div>
                  <div className="mt-3 text-2xl font-semibold">{quote.title || "Ny offert"}</div>
                  <div className="mt-1 text-sm text-slate-300">{quote.quoteNumber}</div>
                  <div className="relative mt-6 grid gap-4 rounded-2xl bg-white/10 p-4 text-sm backdrop-blur">
                    <div>
                      <div className="text-slate-400">Kund</div>
                      <div className="font-medium text-white">{quote.customerName || "Ej angivet"}</div>
                    </div>
                    <div>
                      <div className="text-slate-400">Kontakt</div>
                      <div className="font-medium text-white">{quote.contactName || "Ej angivet"}</div>
                      <div className="text-slate-300">{quote.contactEmail || "Ingen e-post angiven"}</div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3">
                  {quote.lineItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between rounded-2xl border border-border/70 px-4 py-3">
                      <div>
                        <div className="font-medium">{item.productName || "Namnlös produkt"}</div>
                        <div className="text-sm text-muted-foreground">ROI: {formatPercent(item.roi)}</div>
                      </div>
                      <div className="text-right font-semibold">{formatCurrency(item.price, quote.currency)}</div>
                    </div>
                  ))}
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl bg-secondary/60 p-4">
                    <div className="text-sm text-muted-foreground">Totalt pris</div>
                    <div className="mt-2 text-2xl font-semibold">{formatCurrency(totalPrice, quote.currency)}</div>
                  </div>
                  <div className="rounded-2xl bg-secondary/60 p-4">
                    <div className="text-sm text-muted-foreground">Snitt-ROI</div>
                    <div className="mt-2 text-2xl font-semibold">{formatPercent(averageRoi)}</div>
                  </div>
                </div>

                <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                  <div className="font-medium text-foreground">Noteringar</div>
                  <p className="mt-2 whitespace-pre-wrap">{quote.notes || "Inga noteringar ännu."}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="surface border-white/80 bg-white/80">
              <CardHeader>
                <CardTitle>Tidigare offerter</CardTitle>
                <CardDescription>Ladda en sparad offert eller importera en JSON-export för redigering.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="saved-quotes">Välj sparad offert</Label>
                  <select
                    id="saved-quotes"
                    className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                    value={selectedQuoteId}
                    onChange={(event) => {
                      setSelectedQuoteId(event.target.value);
                      loadQuote(event.target.value);
                    }}
                  >
                    <option value="">Välj offert</option>
                    {savedQuotes.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.quoteNumber} · {item.customerName || "Okänd kund"}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={triggerImport}>
                    <FileUp className="h-4 w-4" />
                    Importera offert
                  </Button>
                </div>

                <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={importQuote} />

                <div className="rounded-2xl bg-secondary/40 p-4 text-sm text-muted-foreground">
                  Nuvarande utkast autosparas lokalt i webbläsaren. Sparade offerter kan öppnas igen och fortsätta i
                  samma edit-läge.
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
