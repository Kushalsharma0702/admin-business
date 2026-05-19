import type {
  Client, Task, CostItem, SaleItem, BankTransaction, Customer, Category,
  PaymentMethod, SubmissionRecord, Workflow, BankAccount, BankStatement,
  Message, BillingEntry, TimeEntry, ActivityEvent, ResolutionCase, Organizer, Transcript, FileItem, Note,
} from "./types";

export const seedClients: Client[] = [
  { id: "rory-williams", name: "Rory Williams", email: "dannielle.stout+Rwilliams@canopytax.com", phone: "(555) 201-3344", type: "Client", ssn: "111-22-2333", dob: "1989-01-05", occupation: "Nurse", clientSince: "2023-12-06", createdOn: "2023-12-06", portalStatus: "active", portalEmail: "dannielle.stout+Rwilliams@canopytax.com", portalInviteSent: "2023-12-06" },
  { id: "maara-c", name: "Maara C.", email: "irie.earnest+maara@canopytax.com", phone: "", type: "Client", ssn: "222-33-4455", dob: "1985-04-12", occupation: "Designer", clientSince: "2023-10-25", createdOn: "2023-10-25", portalStatus: "active", portalEmail: "irie.earnest+maara@canopytax.com", portalInviteSent: "2023-10-25" },
  { id: "loretta-c", name: "Loretta C.", email: "kyle.whittle+5@getcanopy.com", phone: "", type: "Client", ssn: "333-44-5566", dob: "1978-09-22", occupation: "Teacher", clientSince: "2023-10-25", createdOn: "2023-10-25", portalStatus: "active", portalEmail: "kyle.whittle+5@getcanopy.com", portalInviteSent: "2023-10-25" },
  { id: "ricky-cruz", name: "Ricky Cruz", email: "", phone: "", type: "Client", ssn: "444-55-6677", dob: "1990-02-14", occupation: "Driver", clientSince: "2023-10-25", createdOn: "2023-10-25", portalStatus: "none", portalEmail: "", portalInviteSent: "" },
  { id: "alex-sims", name: "Alex Sims", email: "", phone: "", type: "Client", ssn: "555-66-7788", dob: "1992-06-30", occupation: "Engineer", clientSince: "2023-10-25", createdOn: "2023-10-25", portalStatus: "none", portalEmail: "", portalInviteSent: "" },
  { id: "edna-marshall", name: "Edna Marshall", email: "Edna.marshalltest@test.com", phone: "(555) 444-1212", type: "Client", ssn: "666-77-8899", dob: "1965-11-03", occupation: "Retired", clientSince: "2023-08-17", createdOn: "2023-08-17", portalStatus: "active", portalEmail: "Edna.marshalltest@test.com", portalInviteSent: "2023-08-17" },
  { id: "joel-gill", name: "Joel Gill", email: "joelgilltest@test.com", phone: "(555) 333-2211", type: "Client", ssn: "777-88-9900", dob: "1983-07-19", occupation: "Consultant", clientSince: "2023-08-17", createdOn: "2023-08-17", portalStatus: "active", portalEmail: "joelgilltest@test.com", portalInviteSent: "2023-08-17" },
  { id: "patrick-saunders", name: "Patrick Saunders", email: "", phone: "", type: "Client", ssn: "888-99-0011", dob: "1975-03-08", occupation: "Plumber", clientSince: "2023-10-25", createdOn: "2023-10-25", portalStatus: "none", portalEmail: "", portalInviteSent: "" },
  { id: "celia-douglas", name: "Celia Douglas", email: "celiadouglastest@test.com", phone: "(555) 222-9988", type: "Client", ssn: "999-00-1122", dob: "1988-12-25", occupation: "Photographer", clientSince: "2023-08-17", createdOn: "2023-08-17", portalStatus: "active", portalEmail: "celiadouglastest@test.com", portalInviteSent: "2023-08-17" },
  { id: "gary-underwood", name: "Gary Underwood", email: "garyunderwoodtest@test.com", phone: "(555) 111-7766", type: "Client", ssn: "121-21-1212", dob: "1970-05-15", occupation: "Contractor", clientSince: "2023-08-17", createdOn: "2023-08-17", portalStatus: "active", portalEmail: "garyunderwoodtest@test.com", portalInviteSent: "2023-08-17" },
];

export const seedTasks: Task[] = [
  { id: "t1", clientId: "rory-williams", name: "eSign request: f1040.pdf", type: "eSign Request", assignee: "Angela Martin (me)", dueDate: "2024-01-05", status: "With Client", priority: "No priority" },
  { id: "t2", clientId: "rory-williams", name: "Review tax return", type: "Review", assignee: "Angela Martin (me)", dueDate: "2024-01-05", completedDate: "2023-12-06", status: "Completed", priority: "No priority" },
  { id: "t3", clientId: "maara-c", name: "Quarterly bookkeeping review", type: "Review", assignee: "Angela Martin (me)", dueDate: "2026-05-15", status: "In Progress", priority: "Medium" },
  { id: "t4", clientId: "loretta-c", name: "Send 2025 tax organizer", type: "Organizer", assignee: "Angela Martin (me)", dueDate: "2026-05-08", status: "With Client", priority: "High" },
  { id: "t5", clientId: "edna-marshall", name: "Schedule planning call", type: "Other", assignee: "Angela Martin (me)", dueDate: "2026-04-28", status: "In Progress", priority: "Low" },
  { id: "t6", clientId: "joel-gill", name: "1099 review", type: "Review", assignee: "Angela Martin (me)", dueDate: "2026-04-22", status: "Review", priority: "Medium" },
  { id: "t7", clientId: "celia-douglas", name: "Collect prior year W-2", type: "Other", assignee: "Angela Martin (me)", dueDate: "2026-05-01", status: "With Client", priority: "Medium" },
  { id: "t8", clientId: "gary-underwood", name: "Sign engagement letter", type: "eSign Request", assignee: "Angela Martin (me)", dueDate: "2026-05-03", status: "With Client", priority: "High" },
  { id: "t9", clientId: "rory-williams", name: "Prepare Q1 estimates", type: "Other", assignee: "Angela Martin (me)", dueDate: "2026-04-25", completedDate: "2026-04-20", status: "Completed", priority: "Medium" },
  { id: "t10", clientId: "maara-c", name: "File extension", type: "Other", assignee: "Angela Martin (me)", dueDate: "2026-04-15", completedDate: "2026-04-12", status: "Completed", priority: "High" },
];

const supplierList = ["Pete's Dresden", "Dylan's No Frills", "Shell Canada", "Costco Wholesale", "Bell Canada", "Hydro One", "Staples", "Uber", "Amazon", "Tim Hortons", "Loblaws", "Home Depot", "Apple Store", "Air Canada", "Esso"];
const costTotals = [84.20, 142.18, 65.40, 312.75, 198.50, 87.33, 45.99, 22.50, 156.80, 8.95, 234.60, 189.00, 1299.00, 485.50, 72.15];
const costTaxes = [10.95, 18.48, 8.50, 40.66, 25.81, 11.35, 5.98, 2.93, 20.38, 1.16, 30.50, 24.57, 168.87, 63.12, 9.38];

export const seedCosts: CostItem[] = supplierList.map((s, i) => ({
  id: `c${i + 1}`,
  clientId: seedClients[i % seedClients.length].id,
  date: `2026-04-${String((i % 28) + 1).padStart(2, "0")}`,
  supplier: s,
  description: `${s} purchase`,
  total: costTotals[i],
  tax: costTaxes[i],
  category: ["Office", "Travel", "Utilities", "Meals", "Supplies"][i % 5],
  paymentMethod: ["Visa", "AMEX", "Cash", "Bank Transfer"][i % 4],
  status: (["Processing", "To review", "Ready"] as const)[i % 3],
  owner: "Angela Martin",
}));

const customerList = ["Acme Corp", "Globex", "Initech", "Umbrella", "Wayne Ent.", "Stark Ind.", "Hooli", "Pied Piper", "Wonka Co", "Soylent"];
const saleTotals = [2500.00, 1800.00, 3200.00, 950.00, 4100.00, 1200.00, 2750.00, 1650.00, 3800.00, 2100.00];
const saleTaxes = [325.00, 234.00, 416.00, 123.50, 533.00, 156.00, 357.50, 214.50, 494.00, 273.00];
export const seedSales: SaleItem[] = customerList.map((c, i) => ({
  id: `s${i + 1}`,
  clientId: seedClients[i % seedClients.length].id,
  date: `2026-04-${String((i % 28) + 1).padStart(2, "0")}`,
  customer: c,
  description: `Invoice to ${c}`,
  total: saleTotals[i],
  tax: saleTaxes[i],
  category: ["Consulting", "Tax Prep", "Bookkeeping", "Advisory"][i % 4],
  status: (["Processing", "To review", "Ready"] as const)[i % 3],
}));

const txnDescs = ["Pete's Dresden", "Dylan's No Frills", "Shell Canada", "Costco Wholesale", "Bell Canada Bill Pay", "Hydro One Bill Pay", "Staples Office", "Uber Trip", "Amazon Purchase", "Tim Hortons", "Loblaws Groceries", "Home Depot", "Apple Store", "Air Canada Booking", "Esso Fuel", "Client Payment - Acme", "Client Payment - Globex", "Bank Fee", "Interest Earned", "Etransfer Received", "Payroll Deposit", "Rent Payment", "Insurance Premium", "Software Subscription", "Phone Bill", "Internet Bill", "Coffee Shop", "Restaurant", "Parking", "Toll Charge"];
const txnPaidOut = [0, 245.50, 65.40, 312.75, 198.50, 0, 45.99, 22.50, 156.80, 8.95, 0, 189.00, 299.99, 485.50, 72.15, 0, 320.00, 15.00, 0, 125.00, 0, 1800.00, 450.00, 89.99, 75.00, 0, 4.50, 38.50, 12.00, 3.50];
const txnPaidIn = [2150.00, 0, 0, 0, 0, 1800.00, 0, 0, 0, 0, 2500.00, 0, 0, 0, 0, 3200.00, 0, 0, 42.18, 0, 4500.00, 0, 0, 0, 0, 95.00, 0, 0, 0, 0];
export const seedTransactions: BankTransaction[] = txnDescs.map((d, i) => ({
  id: `tx${i + 1}`,
  clientId: seedClients[i % seedClients.length].id,
  date: `2026-04-${String((i % 28) + 1).padStart(2, "0")}`,
  description: d,
  paidOut: txnPaidOut[i],
  paidIn: txnPaidIn[i],
  currency: "CAD",
  account: "0657 TD Bank",
  matched: i % 3 === 0,
}));

export const seedCustomers: Customer[] = [
  ...customerList.map((n, i) => ({ id: `cu${i + 1}`, name: n, category: "Sales" })),
  { id: "cu11", name: "Bob's Construction", category: "Contracting" },
  { id: "cu12", name: "Sara's Salon", category: "Beauty" },
  { id: "cu13", name: "QuickPrint Ltd", category: "Printing" },
  { id: "cu14", name: "Maple Cafe", category: "Food" },
  { id: "cu15", name: "Toronto Realty", category: "Real Estate" },
];

const catNames = ["Advertising","Bank Charges","Cost of Goods Sold","Computer & Internet","Continuing Education","Contractors","Depreciation","Dues & Subscriptions","Equipment","Insurance","Interest Expense","Legal & Professional","Meals","Office Expenses","Office Supplies","Postage & Delivery","Printing","Rent","Repairs & Maintenance","Salaries & Wages","Software","Subcontractors","Supplies","Taxes & Licenses","Telephone","Tools","Training","Travel","Uniforms","Utilities","Vehicle Expenses","Website","Other Expenses","Office Furniture","Marketing","Hosting","Office Cleaning","Charitable Donations","Bank Fees","Misc"];
export const seedCategories: Category[] = catNames.map((n, i) => ({ id: `cat${i + 1}`, name: n, code: `${5000 + i * 10}`, visible: true }));

export const seedPaymentMethods: PaymentMethod[] = Array.from({ length: 175 }, (_, i) => ({
  id: `pm${i + 1}`,
  name: `Payment Method ${i + 1}`,
  reference: `REF-${String(1000 + i)}`,
}));
// Override first few to be realistic
["Visa **** 4242", "AMEX **** 1001", "Mastercard **** 8821", "Cash", "Bank Transfer", "PayPal", "Stripe Payout", "Cheque", "Wire Transfer", "Etransfer"].forEach((n, i) => { seedPaymentMethods[i].name = n; seedPaymentMethods[i].reference = n.replace(/\W+/g, "-"); });

export const seedSubmissions: SubmissionRecord[] = Array.from({ length: 20 }, (_, i) => ({
  id: `sub${i + 1}`,
  status: "Archived",
  itemId: `ITEM-${1000 + i}`,
  submittedAt: `2026-04-${String((i % 28) + 1).padStart(2, "0")} 10:${String(i % 60).padStart(2, "0")}`,
  submittedBy: "Angela Martin",
  method: ["Email", "Mobile", "Web Upload", "Auto-extract"][i % 4],
  ownedBy: "Angela Martin",
  date: `2026-04-${String((i % 28) + 1).padStart(2, "0")}`,
}));

export const seedWorkflows: Workflow[] = [
  { id: "w1", name: "Auto-categorise meals", trigger: "New cost item", actions: ["Set category=Meals if supplier matches"], enabled: true, lastRun: "2026-04-30" },
  { id: "w2", name: "Notify on large expense", trigger: "Cost > $1000", actions: ["Send email to Angela"], enabled: true, lastRun: "2026-04-29" },
  { id: "w3", name: "Auto-match bank txns", trigger: "Daily 6am", actions: ["Match to costs"], enabled: false, lastRun: "2026-04-28" },
  { id: "w4", name: "Approve vendor payments", trigger: "New supplier", actions: ["Require approval"], enabled: true, lastRun: "2026-04-27" },
  { id: "w5", name: "Weekly summary", trigger: "Monday 9am", actions: ["Send digest email"], enabled: true, lastRun: "2026-04-29" },
];

export const seedBankAccounts: BankAccount[] = [
  { id: "ba1", name: "Operating Account", number: "0657", bank: "TD Bank (Toronto-Dominion B...)", balance: 24532.18, status: "Active" },
  { id: "ba2", name: "Tax Reserve", number: "1199", bank: "RBC", balance: 18250.00, status: "Active" },
];

export const seedBankStatements: BankStatement[] = [
  { id: "bs1", date: "2026-04-30", description: "April 2026 Statement", openingBalance: 21000, closingBalance: 24532.18, status: "Reconciled" },
  { id: "bs2", date: "2026-03-31", description: "March 2026 Statement", openingBalance: 19500, closingBalance: 21000, status: "Reconciled" },
  { id: "bs3", date: "2026-02-28", description: "February 2026 Statement", openingBalance: 17800, closingBalance: 19500, status: "Pending" },
];

export const seedMessages: Message[] = [
  { id: "m1", clientId: "rory-williams", from: "Angela Martin", to: "Rory Williams", channel: "Email", body: "Hi Rory, your tax return is ready for review. Please check the portal.", sentAt: "2023-12-04 10:30" },
  { id: "m2", clientId: "rory-williams", from: "Rory Williams", to: "Angela Martin", channel: "Email", body: "Thanks Angela! I'll review it tonight and send it back.", sentAt: "2023-12-04 18:12" },
  { id: "m3", clientId: "rory-williams", from: "Angela Martin", to: "Rory Williams", channel: "Portal", body: "Reminder: please eSign the f1040.pdf when you have a moment.", sentAt: "2023-12-08 09:00" },
];

export const seedBilling: BillingEntry[] = seedClients.flatMap((c, i) => [
  { id: `b${i}a`, clientId: c.id, invoiceNumber: `INV-${1000 + i * 2}`, date: "2026-03-15", description: "Tax preparation services", amount: 450 + i * 25, status: "Paid" as const },
  { id: `b${i}b`, clientId: c.id, invoiceNumber: `INV-${1001 + i * 2}`, date: "2026-04-15", description: "Quarterly bookkeeping", amount: 300 + i * 15, status: i % 3 === 0 ? "Unpaid" as const : "Paid" as const },
]);

export const seedTimeEntries: TimeEntry[] = seedClients.flatMap((c, i) => [
  { id: `te${i}a`, clientId: c.id, date: "2026-04-10", description: "Tax return prep", hours: 2.5, rate: 150, loggedBy: "Angela Martin" },
  { id: `te${i}b`, clientId: c.id, date: "2026-04-18", description: "Client call & follow-up", hours: 1.0, rate: 150, loggedBy: "Angela Martin" },
]);

export const seedFiles: FileItem[] = [];
export const seedNotes: Note[] = [];
export const seedResolutionCases: ResolutionCase[] = [];
export const seedOrganizers: Organizer[] = [];
export const seedTranscripts: Transcript[] = [];

export const seedActivity: ActivityEvent[] = [
  { id: "a1", type: "task_completed", title: "Review tax return", subtitle: "Rory Williams", clientId: "rory-williams", timestamp: "2 hours ago" },
  { id: "a2", type: "doc_captured", title: "Pete's Dresden — $84.20", subtitle: "Cost item added", clientId: "rory-williams", timestamp: "3 hours ago" },
  { id: "a3", type: "client_added", title: "Gary Underwood added as client", subtitle: "by Angela Martin", clientId: "gary-underwood", timestamp: "5 hours ago" },
  { id: "a4", type: "txn_matched", title: "Costco Wholesale matched", subtitle: "Bank transaction linked", clientId: "maara-c", timestamp: "Yesterday" },
  { id: "a5", type: "task_completed", title: "File extension", subtitle: "Maara C.", clientId: "maara-c", timestamp: "Yesterday" },
  { id: "a6", type: "doc_captured", title: "Bell Canada — $142.18", subtitle: "Cost item added", clientId: "loretta-c", timestamp: "Yesterday" },
  { id: "a7", type: "client_added", title: "Celia Douglas added as client", subtitle: "by Angela Martin", clientId: "celia-douglas", timestamp: "2 days ago" },
  { id: "a8", type: "txn_matched", title: "Acme Corp payment matched", subtitle: "Sale linked", clientId: "edna-marshall", timestamp: "2 days ago" },
  { id: "a9", type: "task_completed", title: "Prepare Q1 estimates", subtitle: "Rory Williams", clientId: "rory-williams", timestamp: "3 days ago" },
  { id: "a10", type: "doc_captured", title: "Hydro One — $98.40", subtitle: "Cost item added", clientId: "joel-gill", timestamp: "3 days ago" },
];