import { create } from "zustand";
import { persist } from "zustand/middleware";
import * as seed from "./seed";
import type {
  Client, Task, CostItem, SaleItem, BankTransaction, Customer, Category,
  PaymentMethod, SubmissionRecord, Workflow, BankAccount, BankStatement,
  Message, BillingEntry, TimeEntry, ActivityEvent, ResolutionCase, Organizer, Transcript, FileItem, Note, TaskStatus, Receipt,
} from "./types";

interface AppState {
  clients: Client[];
  tasks: Task[];
  costs: CostItem[];
  sales: SaleItem[];
  transactions: BankTransaction[];
  customers: Customer[];
  categories: Category[];
  paymentMethods: PaymentMethod[];
  submissions: SubmissionRecord[];
  workflows: Workflow[];
  bankAccounts: BankAccount[];
  bankStatements: BankStatement[];
  messages: Message[];
  billing: BillingEntry[];
  timeEntries: TimeEntry[];
  activity: ActivityEvent[];
  resolutionCases: ResolutionCase[];
  organizers: Organizer[];
  transcripts: Transcript[];
  files: FileItem[];
  notes: Note[];
  receipts: Receipt[];

  extractionSettings: { emailPrefix: string; showInboxTabs: boolean; duplicateMode: string; extractTax: boolean; defaultTaxRate: number };
  automationSettings: { autoCategorisation: string; defaultCategory: string; smartSuggestions: boolean; autoApply: boolean; groupUncategorised: boolean };
  exportSettings: { csvFormat: string; decimalSeparator: string; dateFormat: string; showItemHeader: boolean; columns: Record<string, boolean> };
  businessProfile: { name: string; crn: string; country: string; currency: string; language: string; industry: string; selfEmployed: boolean; yearEndMonth: string; yearEndDay: string; taxNumber: string; reportingCycle: string };

  // actions
  addTask: (t: Task) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  completeTask: (id: string) => void;
  addNote: (n: Note) => void;
  addFile: (f: FileItem) => void;
  addMessage: (m: Message) => void;
  addCost: (c: CostItem) => void;
  updateCost: (id: string, patch: Partial<CostItem>) => void;
  deleteCosts: (ids: string[]) => void;
  addSale: (s: SaleItem) => void;
  addCustomer: (c: Customer) => void;
  toggleTransactionMatch: (id: string) => void;
  toggleCategoryVisible: (id: string) => void;
  addCategory: (c: Category) => void;
  toggleWorkflow: (id: string) => void;
  addInvoice: (b: BillingEntry) => void;
  addTimeEntry: (t: TimeEntry) => void;
  addResolutionCase: (r: ResolutionCase) => void;
  addOrganizer: (o: Organizer) => void;
  addTranscript: (t: Transcript) => void;
  updateClient: (id: string, patch: Partial<Client>) => void;
  updateExtraction: (patch: Partial<AppState["extractionSettings"]>) => void;
  updateAutomation: (patch: Partial<AppState["automationSettings"]>) => void;
  updateExport: (patch: Partial<AppState["exportSettings"]>) => void;
  updateBusiness: (patch: Partial<AppState["businessProfile"]>) => void;
  addReceipt: (r: Receipt) => void;
  updateReceipt: (id: string, patch: Partial<Receipt>) => void;
}

export const useAppStore = create<AppState>()(persist((set) => ({
  clients: seed.seedClients,
  tasks: seed.seedTasks,
  costs: seed.seedCosts,
  sales: seed.seedSales,
  transactions: seed.seedTransactions,
  customers: seed.seedCustomers,
  categories: seed.seedCategories,
  paymentMethods: seed.seedPaymentMethods,
  submissions: seed.seedSubmissions,
  workflows: seed.seedWorkflows,
  bankAccounts: seed.seedBankAccounts,
  bankStatements: seed.seedBankStatements,
  messages: seed.seedMessages,
  billing: seed.seedBilling,
  timeEntries: seed.seedTimeEntries,
  activity: seed.seedActivity,
  resolutionCases: seed.seedResolutionCases,
  organizers: seed.seedOrganizers,
  transcripts: seed.seedTranscripts,
  files: seed.seedFiles,
  notes: seed.seedNotes,
  receipts: [],

  extractionSettings: { emailPrefix: "angela-martin", showInboxTabs: true, duplicateMode: "Automatic", extractTax: true, defaultTaxRate: 13 },
  automationSettings: { autoCategorisation: "Always", defaultCategory: "Office Expenses", smartSuggestions: true, autoApply: false, groupUncategorised: false },
  exportSettings: { csvFormat: "Standard", decimalSeparator: "Dot", dateFormat: "DD-Mon-YYYY", showItemHeader: true, columns: { "Receipt ID": true, "Description": true, "Net amount": true, "Tax amount": true, "Total amount": true, "Supplier": false, "Date": false, "Category": false, "Payment method": false } },
  businessProfile: { name: "Martin & Co. Tax Advisors", crn: "1234567", country: "Canada", currency: "CAD", language: "English", industry: "Accounting", selfEmployed: false, yearEndMonth: "December", yearEndDay: "31", taxNumber: "TX-998877", reportingCycle: "Quarterly" },

  addTask: (t) => set((s) => ({ tasks: [t, ...s.tasks] })),
  updateTask: (id, patch) => set((s) => ({ tasks: s.tasks.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
  completeTask: (id) => set((s) => ({ tasks: s.tasks.map((x) => (x.id === id ? { ...x, status: "Completed" as TaskStatus, completedDate: new Date().toISOString().slice(0, 10) } : x)) })),
  addNote: (n) => set((s) => ({ notes: [n, ...s.notes] })),
  addFile: (f) => set((s) => ({ files: [f, ...s.files] })),
  addMessage: (m) => set((s) => ({ messages: [...s.messages, m] })),
  addCost: (c) => set((s) => ({ costs: [c, ...s.costs] })),
  updateCost: (id, patch) => set((s) => ({ costs: s.costs.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
  deleteCosts: (ids) => set((s) => ({ costs: s.costs.filter((x) => !ids.includes(x.id)) })),
  addSale: (sa) => set((s) => ({ sales: [sa, ...s.sales] })),
  addCustomer: (c) => set((s) => ({ customers: [c, ...s.customers] })),
  toggleTransactionMatch: (id) => set((s) => ({ transactions: s.transactions.map((x) => (x.id === id ? { ...x, matched: !x.matched } : x)) })),
  toggleCategoryVisible: (id) => set((s) => ({ categories: s.categories.map((x) => (x.id === id ? { ...x, visible: !x.visible } : x)) })),
  addCategory: (c) => set((s) => ({ categories: [...s.categories, c] })),
  toggleWorkflow: (id) => set((s) => ({ workflows: s.workflows.map((x) => (x.id === id ? { ...x, enabled: !x.enabled } : x)) })),
  addInvoice: (b) => set((s) => ({ billing: [b, ...s.billing] })),
  addTimeEntry: (t) => set((s) => ({ timeEntries: [t, ...s.timeEntries] })),
  addResolutionCase: (r) => set((s) => ({ resolutionCases: [r, ...s.resolutionCases] })),
  addOrganizer: (o) => set((s) => ({ organizers: [o, ...s.organizers] })),
  addTranscript: (t) => set((s) => ({ transcripts: [t, ...s.transcripts] })),
  updateClient: (id, patch) => set((s) => ({ clients: s.clients.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
  updateExtraction: (patch) => set((s) => ({ extractionSettings: { ...s.extractionSettings, ...patch } })),
  updateAutomation: (patch) => set((s) => ({ automationSettings: { ...s.automationSettings, ...patch } })),
  updateExport: (patch) => set((s) => ({ exportSettings: { ...s.exportSettings, ...patch } })),
  updateBusiness: (patch) => set((s) => ({ businessProfile: { ...s.businessProfile, ...patch } })),
  addReceipt: (r) => set((s) => ({ receipts: [r, ...s.receipts] })),
  updateReceipt: (id, patch) => set((s) => ({ receipts: s.receipts.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
}), {
  name: "taxease-admin-store",
  partialize: (s) => ({
    costs: s.costs,
    files: s.files,
    receipts: s.receipts,
  }),
}));

export const uid = () => Math.random().toString(36).slice(2, 10);