export type ClientType = "Client" | "Business";
export type PortalStatus = "active" | "pending" | "none";

export interface Note {
  id: string;
  clientId: string;
  text: string;
  author: string;
  createdAt: string;
}

export interface FileItem {
  id: string;
  clientId: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
  uploadedBy: string;
}

export type TaskStatus = "With Client" | "In Progress" | "Review" | "Completed";
export type TaskPriority = "No priority" | "Low" | "Medium" | "High";

export interface Task {
  id: string;
  clientId: string;
  name: string;
  type: string;
  assignee: string;
  startDate?: string;
  dueDate?: string;
  completedDate?: string;
  status: TaskStatus;
  priority: TaskPriority;
  subtasks?: { id: string; name: string; done: boolean }[];
}

export interface BillingEntry {
  id: string;
  clientId: string;
  invoiceNumber: string;
  date: string;
  description: string;
  amount: number;
  status: "Paid" | "Unpaid" | "Draft";
}

export interface TimeEntry {
  id: string;
  clientId: string;
  date: string;
  description: string;
  hours: number;
  rate: number;
  loggedBy: string;
}

export interface Message {
  id: string;
  clientId: string;
  from: string;
  to: string;
  channel: "Email" | "SMS" | "Portal";
  body: string;
  sentAt: string;
}

export interface ResolutionCase {
  id: string;
  clientId: string;
  name: string;
  type: string;
  status: string;
  createdAt: string;
  assignedTo: string;
}

export interface Organizer {
  id: string;
  clientId: string;
  name: string;
  taxYear: string;
  status: string;
  sentAt: string;
  completedAt?: string;
}

export interface Transcript {
  id: string;
  clientId: string;
  type: string;
  taxYear: string;
  status: string;
  requestedAt: string;
  receivedAt?: string;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  type: ClientType;
  ssn: string;
  dob: string;
  occupation: string;
  clientSince: string;
  createdOn: string;
  portalStatus: PortalStatus;
  portalEmail: string;
  portalInviteSent: string;
}

export type CostStatus = "Processing" | "To review" | "Ready";
export interface CostItem {
  id: string;
  clientId: string;
  date: string;
  supplier: string;
  description: string;
  total: number;
  tax: number;
  category: string;
  paymentMethod: string;
  status: CostStatus;
  owner: string;
}

export interface SaleItem {
  id: string;
  clientId: string;
  date: string;
  customer: string;
  description: string;
  total: number;
  tax: number;
  category: string;
  status: CostStatus;
}

export interface BankTransaction {
  id: string;
  clientId: string;
  date: string;
  description: string;
  paidOut: number;
  paidIn: number;
  currency: string;
  account: string;
  matched: boolean;
}

export interface Customer {
  id: string;
  name: string;
  category: string;
}

export interface Category {
  id: string;
  name: string;
  code: string;
  visible: boolean;
}

export interface PaymentMethod {
  id: string;
  name: string;
  reference: string;
}

export interface SubmissionRecord {
  id: string;
  status: string;
  itemId: string;
  submittedAt: string;
  submittedBy: string;
  method: string;
  ownedBy: string;
  date: string;
}

export interface Workflow {
  id: string;
  name: string;
  trigger: string;
  actions: string[];
  enabled: boolean;
  lastRun: string;
}

export interface BankAccount {
  id: string;
  name: string;
  number: string;
  bank: string;
  balance: number;
  status: string;
}

export interface BankStatement {
  id: string;
  date: string;
  description: string;
  openingBalance: number;
  closingBalance: number;
  status: string;
}

export interface ActivityEvent {
  id: string;
  type: "client_added" | "task_completed" | "doc_captured" | "txn_matched";
  title: string;
  subtitle: string;
  clientId?: string;
  timestamp: string;
}

export interface Receipt {
  id: string;
  clientId: string;
  type: "Receipt" | "Invoice" | "Credit note" | "Order confirmation" | "Statement";
  supplier: string;
  date: string;
  documentReference: string;
  category: string;
  description: string;
  currency: string;
  paymentMethod: string;
  paymentCardLast4?: string;
  total: number;
  tax: number;
  netAmount: number;
  status: "Processing" | "To review" | "Ready" | "Archived";
  rawText?: string;
  uploadedAt: string;
  uploadedBy: string;
}