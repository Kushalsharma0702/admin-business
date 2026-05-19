import { createFileRoute } from "@tanstack/react-router";
import { ListPage } from "@/components/app/ListPage";
import OCRUploader from "@/components/app/OCRUploader";

export const Route = createFileRoute("/ocr")({ component: OCRPage });

function OCRPage() {
  return (
    <ListPage title="Costs Inbox OCR" subtitle="Upload bill, extract fields, review, and save">
      <OCRUploader />
    </ListPage>
  );
}
