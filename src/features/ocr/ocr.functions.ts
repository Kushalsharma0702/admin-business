import { createServerFn } from "@tanstack/react-start";
import { createWorker } from "tesseract.js";
import { PDFParse } from "pdf-parse";

type OCRResult = {
  text: string;
  source: "pdf-text" | "image-ocr";
};

async function extractFromImage(buffer: Uint8Array) {
  const worker = await createWorker({});
  try {
    await worker.loadLanguage("eng");
    await worker.initialize("eng");
    const { data } = await worker.recognize(buffer);
    return data.text || "";
  } finally {
    await worker.terminate();
  }
}

export const extractInvoiceText = createServerFn({ method: "POST" }).handler(
  async ({ data }): Promise<OCRResult> => {
    const form = data as FormData;
    const file = form.get("file");

    if (!(file instanceof File)) {
      throw new Error("No file was uploaded.");
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const mime = file.type || "";

    if (mime === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      const parser = new PDFParse({ data: bytes });
      const parsed = await parser.getText();
      await parser.destroy();
      const text = (parsed.text || "").trim();

      if (!text) {
        throw new Error("PDF has no extractable text. Use image invoices or add PDF-to-image OCR backend.");
      }

      return { text, source: "pdf-text" };
    }

    const text = (await extractFromImage(bytes)).trim();
    if (!text) {
      throw new Error("OCR could not extract text from this image.");
    }

    return { text, source: "image-ocr" };
  },
);
