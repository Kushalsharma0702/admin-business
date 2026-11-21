import type {
  Client, Task, CostItem, SaleItem, BankTransaction, Customer, Category,
  PaymentMethod, SubmissionRecord, Workflow, BankAccount, BankStatement,
  Message, BillingEntry, TimeEntry, ActivityEvent, ResolutionCase, Organizer, Transcript, FileItem, Note,
} from "./types";

// No demo data: every list starts empty. Real clients, tasks and submissions come
// from the API; the sections that still use this local store show empty states.
export const seedClients: Client[] = [];
export const seedTasks: Task[] = [];
export const seedCosts: CostItem[] = [];
export const seedSales: SaleItem[] = [];
export const seedTransactions: BankTransaction[] = [];
export const seedCustomers: Customer[] = [];
export const seedCategories: Category[] = [];
export const seedPaymentMethods: PaymentMethod[] = [];
export const seedSubmissions: SubmissionRecord[] = [];
export const seedWorkflows: Workflow[] = [];
export const seedBankAccounts: BankAccount[] = [];
export const seedBankStatements: BankStatement[] = [];
export const seedMessages: Message[] = [];
export const seedBilling: BillingEntry[] = [];
export const seedTimeEntries: TimeEntry[] = [];
export const seedFiles: FileItem[] = [];
export const seedNotes: Note[] = [];
export const seedResolutionCases: ResolutionCase[] = [];
export const seedOrganizers: Organizer[] = [];
export const seedTranscripts: Transcript[] = [];
export const seedActivity: ActivityEvent[] = [];
