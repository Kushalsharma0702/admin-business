# TaxEase Admin Business

TanStack Start app with backend OCR support and Vercel deployment via Nitro.

## Local development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Deploy to Vercel

1. Push this repo to GitHub.
2. Import the repo in Vercel.
3. Use the default build command:
   ```bash
   npm run build
   ```
4. Deploy.

The Vercel preset in `vite.config.ts` generates the required `.vercel/output` build artifacts.

## OCR

- Open `/ocr` in the app.
- Upload an invoice or receipt image/PDF.
- Edit extracted fields and save to the admin store.
