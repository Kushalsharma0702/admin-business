import React, { useMemo, useState } from "react";
import { useAppStore, uid } from "@/store/useAppStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Upload, Search, Archive, Save, MoveRight } from "lucide-react";
import { extractInvoiceText } from "@/features/ocr/ocr.functions";

type DocumentType =
  | "Receipt"
  | "Invoice"
  | "Credit note"
  | "Order confirmation"
  | "Statement";

interface OCRFields {
  type: DocumentType;
  date: string;
  supplier: string;
  documentReference: string;
  category: string;
  description: string;
  currency: string;
  totalAmount: string;
  taxCode: string;
  taxAmount: string;
  netAmount: string;
  paid: boolean;
  paymentMethod: string;
}

function parseNumber(input: string) {
  const cleaned = input.replace(/[^0-9.]/g, "");
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : 0;
}

function findDate(text: string) {
  const m = text.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})|(\d{4}[\-]\d{1,2}[\-]\d{1,2})/);
  return m ? m[0] : "";
}

function findDocumentReference(text: string) {
  const m = text.match(
    /(invoice|inv|bill|receipt|reference|ref)\s*[:#]?\s*([A-Z0-9\-\/]*)/i,
  );
  return m ? m[2] || m[0] : "";
}

function findAmountByLabel(text: string, labels: string[]) {
  for (const label of labels) {
    const lineMatch = text.match(
      new RegExp(`${label}[^0-9]{0,12}([0-9]+(?:\\.[0-9]{2})?)`, "i"),
    );
    if (lineMatch?.[1]) return Number(lineMatch[1]);
  }
  return null;
}

function detectCurrency(text: string) {
  const upper = text.toUpperCase();
  if (upper.includes("CAD") || upper.includes("C$") || upper.includes("CANADA")) {
    return "CAD";
  }
  if (upper.includes("USD") || upper.includes("US$") || upper.includes("$")) {
    return "USD";
  }
  if (upper.includes("EUR")) return "EUR";
  if (upper.includes("GBP") || upper.includes("POUND")) return "GBP";
  return "CAD";
}

function detectType(text: string): DocumentType {
  const t = text.toLowerCase();
  if (t.includes("credit note")) return "Credit note";
  if (t.includes("order confirmation")) return "Order confirmation";
  if (t.includes("statement")) return "Statement";
  if (t.includes("invoice")) return "Invoice";
  return "Receipt";
}

function detectPaymentMethod(text: string) {
  const t = text.toLowerCase();
  if (t.includes("visa")) return "Visa";
  if (t.includes("mastercard")) return "Mastercard";
  if (t.includes("amex")) return "Amex";
  if (t.includes("cash")) return "Cash";
  if (t.includes("bank") || t.includes("transfer")) return "Bank transfer";
  return "Card";
}

function detectCardLast4(text: string) {
  const m = text.match(/(?:\*{2,}|x{2,})\s*([0-9]{4})|([0-9]{4})\s*(?:\*{2,}|x{2,})/i);
  return m?.[1] || m?.[2] || "";
}

function findLargestAmount(text: string) {
  const matches = text.match(/[0-9]+(?:\.[0-9]{2})/g) || [];
  const nums = matches.map(Number).filter((n) => Number.isFinite(n));
  if (!nums.length) return 0;
  return Math.max(...nums);
}

export function OCRUploader() {
  const addReceipt = useAppStore((s) => s.addReceipt);
  const addCost = useAppStore((s) => s.addCost);
  const receipts = useAppStore((s) => s.receipts);
  const clients = useAppStore((s) => s.clients);

  const [file, setFile] = useState<File | null>(null);
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
  const [progress, setProgress] = useState("");
  const [rawText, setRawText] = useState("");
  const [fields, setFields] = useState<OCRFields>({
    type: "Receipt",
    date: "",
    supplier: "",
    documentReference: "",
    category: "Purchases",
    description: "",
    currency: "CAD",
    totalAmount: "",
    taxCode: "Extracted amount",
    taxAmount: "",
    netAmount: "",
    paid: true,
    paymentMethod: "Card",
  });
  const [savedReceiptId, setSavedReceiptId] = useState("");

  const paymentMethodLabel = useMemo(() => {
    if (!rawText) return fields.paymentMethod;
    const last4 = detectCardLast4(rawText);
    if (!last4) return fields.paymentMethod;
    return `${fields.paymentMethod} (${last4})`;
  }, [fields.paymentMethod, rawText]);

  const onFile = (f?: File) => {
    if (!f) return;
    setFile(f);
    setSavedReceiptId("");
    setRawText("");
    setImgSrc(URL.createObjectURL(f));
  };

  const runOCR = async () => {
    if (!file) return;

    setProgress("Initializing OCR...");

    try {
      const form = new FormData();
      form.append("file", file);

      setProgress("Sending to OCR API...");
      const result = await extractInvoiceText({ data: form });
      const text = result.text || "";
      setRawText(text);

      const type = detectType(text);
      const total =
        findAmountByLabel(text, ["total", "amount", "balance due"]) ||
        findLargestAmount(text);
      const tax = findAmountByLabel(text, ["tax", "vat", "gst", "hst"]) || 0;
      const net =
        findAmountByLabel(text, ["subtotal", "net"]) || Math.max(total - tax, 0);

      const lineParts = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 4);

      setFields({
        type,
        date: findDate(text) || new Date().toISOString().slice(0, 10),
        supplier: lineParts[0] || "",
        documentReference: findDocumentReference(text),
        category: "Purchases",
        description: lineParts.slice(1, 3).join(" ").trim().slice(0, 100),
        currency: detectCurrency(text),
        totalAmount: total ? total.toFixed(2) : "",
        taxCode: "Extracted amount",
        taxAmount: tax ? tax.toFixed(2) : "",
        netAmount: net ? net.toFixed(2) : "",
        paid: true,
        paymentMethod: detectPaymentMethod(text),
      });

      setProgress("OCR complete");
      toast.success(`Fields extracted via backend (${result.source}). Review and edit before saving.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown OCR error";
      setProgress("");
      toast.error(`OCR failed: ${message}`);
    }
  };

  const save = (status: "To review" | "Ready" | "Archived") => {
    const receiptId = uid();
    const total = parseNumber(fields.totalAmount);
    const tax = parseNumber(fields.taxAmount);
    const net = parseNumber(fields.netAmount) || Math.max(total - tax, 0);
    const paymentLast4 = detectCardLast4(rawText);

    const receipt = {
      id: receiptId,
      clientId: clients[0]?.id ?? "",
      type: fields.type,
      supplier: fields.supplier || "Unknown",
      date: fields.date || new Date().toISOString().slice(0, 10),
      documentReference: fields.documentReference,
      category: fields.category,
      description: fields.description,
      currency: fields.currency,
      paymentMethod: paymentMethodLabel,
      paymentCardLast4: paymentLast4 || undefined,
      total,
      tax,
      netAmount: net,
      status,
      rawText,
      uploadedAt: new Date().toLocaleString(),
      uploadedBy: "Angela Martin",
    };

    addReceipt(receipt);
    addCost({
      id: uid(),
      clientId: clients[0]?.id ?? "",
      date: receipt.date,
      supplier: receipt.supplier,
      description: receipt.description || `${receipt.type} ${receipt.documentReference}`,
      total: receipt.total,
      tax: receipt.tax,
      category: receipt.category,
      paymentMethod: receipt.paymentMethod,
      status:
        status === "To review"
          ? "To review"
          : status === "Ready"
            ? "Ready"
            : "Processing",
      owner: "Angela Martin",
    });

    setSavedReceiptId(receiptId);
    toast.success(`Saved and moved to ${status}.`);
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
      <Card className="border-border bg-[#2f3d4f]">
        <CardContent className="p-3">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-white/20 bg-white/10 px-3 py-1.5 text-sm text-white">
              <Upload className="h-4 w-4" />
              Upload bill
              <input
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => onFile(e.target.files?.[0])}
              />
            </label>
            <Button size="sm" variant="outline" onClick={runOCR} disabled={!file}>
              <Search className="mr-1 h-4 w-4" />
              Extract fields
            </Button>
            <div className="ml-auto flex items-center gap-2 text-xs text-white/80">
              <span>Zoom</span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setZoom((z) => Math.max(50, z - 10))}
              >
                -
              </Button>
              <span>{zoom}%</span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setZoom((z) => Math.min(180, z + 10))}
              >
                +
              </Button>
            </div>
          </div>

          <div className="flex min-h-[620px] items-center justify-center overflow-auto rounded-md border border-white/20 bg-[#445266] p-3">
            {imgSrc ? (
              <img
                src={imgSrc}
                alt="Uploaded bill preview"
                className="rounded-sm bg-white shadow"
                style={{ width: `${zoom}%`, maxWidth: "760px" }}
              />
            ) : (
              <div className="text-sm text-white/70">
                Upload a bill image or PDF to start OCR.
              </div>
            )}
          </div>

          {progress ? <p className="mt-2 text-xs text-white/80">{progress}</p> : null}
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardContent className="space-y-3 p-3">
          <Tabs defaultValue="details">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="messages">Messages</TabsTrigger>
              <TabsTrigger value="note">Note</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-3">
              <Section title="Item Details" />

              <Field label="Type">
                <Select
                  value={fields.type}
                  onValueChange={(v) =>
                    setFields((s) => ({ ...s, type: v as DocumentType }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Receipt">Receipt</SelectItem>
                    <SelectItem value="Invoice">Invoice</SelectItem>
                    <SelectItem value="Credit note">Credit note</SelectItem>
                    <SelectItem value="Order confirmation">
                      Order confirmation
                    </SelectItem>
                    <SelectItem value="Statement">Statement</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Date">
                <Input
                  value={fields.date}
                  onChange={(e) => setFields((s) => ({ ...s, date: e.target.value }))}
                />
              </Field>
              <Field label="Supplier">
                <Input
                  value={fields.supplier}
                  onChange={(e) =>
                    setFields((s) => ({ ...s, supplier: e.target.value }))
                  }
                />
              </Field>
              <Field label="Document reference">
                <Input
                  value={fields.documentReference}
                  onChange={(e) =>
                    setFields((s) => ({ ...s, documentReference: e.target.value }))
                  }
                />
              </Field>
              <Field label="Category">
                <Input
                  value={fields.category}
                  onChange={(e) =>
                    setFields((s) => ({ ...s, category: e.target.value }))
                  }
                />
              </Field>
              <Field label="Description">
                <Textarea
                  value={fields.description}
                  onChange={(e) =>
                    setFields((s) => ({ ...s, description: e.target.value }))
                  }
                />
              </Field>

              <Section title="Amount" />
              <Field label="Currency">
                <Select
                  value={fields.currency}
                  onValueChange={(v) => setFields((s) => ({ ...s, currency: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CAD">CAD - Canada, Dollars</SelectItem>
                    <SelectItem value="USD">USD - US Dollars</SelectItem>
                    <SelectItem value="EUR">EUR - Euro</SelectItem>
                    <SelectItem value="GBP">GBP - Pound</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Total amount">
                <Input
                  value={fields.totalAmount}
                  onChange={(e) =>
                    setFields((s) => ({ ...s, totalAmount: e.target.value }))
                  }
                />
              </Field>
              <Field label="Tax">
                <Input
                  value={fields.taxCode}
                  onChange={(e) =>
                    setFields((s) => ({ ...s, taxCode: e.target.value }))
                  }
                />
              </Field>
              <Field label="Tax amount">
                <Input
                  value={fields.taxAmount}
                  onChange={(e) =>
                    setFields((s) => ({ ...s, taxAmount: e.target.value }))
                  }
                />
              </Field>
              <Field label="Net amount">
                <Input
                  value={fields.netAmount}
                  onChange={(e) =>
                    setFields((s) => ({ ...s, netAmount: e.target.value }))
                  }
                />
              </Field>

              <Section title="Payment" />
              <div className="flex items-center justify-between rounded-md border border-border p-2">
                <Label htmlFor="paid-switch">Paid</Label>
                <div className="flex items-center gap-2">
                  <Switch
                    id="paid-switch"
                    checked={fields.paid}
                    onCheckedChange={(checked) =>
                      setFields((s) => ({ ...s, paid: checked }))
                    }
                  />
                  <span className="text-sm text-muted-foreground">
                    {fields.paid ? "Yes" : "No"}
                  </span>
                </div>
              </div>
              <Field label="Payment method">
                <Input
                  value={paymentMethodLabel}
                  onChange={(e) =>
                    setFields((s) => ({ ...s, paymentMethod: e.target.value }))
                  }
                />
              </Field>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button size="sm" variant="outline" onClick={() => save("To review")}>
                  <MoveRight className="mr-1 h-4 w-4" />
                  Move to review
                </Button>
                <Button size="sm" onClick={() => save("Ready")}>
                  <Save className="mr-1 h-4 w-4" />
                  Move to ready
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="col-span-2"
                  onClick={() => save("Archived")}
                >
                  <Archive className="mr-1 h-4 w-4" />
                  Archive
                </Button>
              </div>

              {savedReceiptId ? (
                <p className="text-xs text-green-600">Saved receipt ID: {savedReceiptId}</p>
              ) : null}
            </TabsContent>

            <TabsContent value="messages" className="text-sm text-muted-foreground">
              Internal messages can be added here.
            </TabsContent>
            <TabsContent value="note" className="text-sm text-muted-foreground">
              OCR note: validate tax code and payment card ending before final export.
            </TabsContent>
            <TabsContent value="history" className="space-y-1 text-xs text-muted-foreground">
              <div>{receipts.length} receipts saved in this workspace.</div>
              <div>Latest extraction date: {new Date().toLocaleDateString()}</div>
            </TabsContent>
          </Tabs>

          <details className="rounded border border-border p-2 text-xs">
            <summary className="cursor-pointer font-medium">Raw OCR text</summary>
            <pre className="mt-2 max-h-36 overflow-auto whitespace-pre-wrap">
              {rawText || "No text extracted yet."}
            </pre>
          </details>
        </CardContent>
      </Card>
    </div>
  );
}

function Section({ title }: { title: string }) {
  return (
    <p className="pt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {title}
    </p>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

export default OCRUploader;
