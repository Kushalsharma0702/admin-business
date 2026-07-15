// lib/formTypes.ts — shared TypeScript types for the dynamic form engine

export const FIELD_TYPES = [
  "text", "textarea", "number", "email", "phone", "date",
  "select", "checkbox", "radio", "file_upload", "signature",
] as const;

export type FieldType = (typeof FIELD_TYPES)[number];

export interface FieldOption {
  label: string;
  value: string;
}

export interface FormField {
  id:           string;
  type:         FieldType;
  label:        string;
  placeholder?: string;
  required:     boolean;
  order:        number;
  // select / radio
  options?:     FieldOption[];
  // number
  min?:         number;
  max?:         number;
  step?:        number;
  // file_upload
  acceptedTypes?: string[];   // e.g. ["application/pdf", "image/png"]
  maxSizeMb?:    number;
  // textarea
  rows?:        number;
  // help text
  helpText?:    string;
}

export interface FormSchema {
  fields: FormField[];
}

// Submission data — keys are field ids
// (Named SubmissionData to avoid collision with browser's FormData global)
export type SubmissionData = Record<string, string | number | boolean | string[]>;

export interface Attachment {
  fieldId:    string;
  s3Key:      string;
  s3Bucket?:  string;
  fileName:   string;
  fileSize:   number;
  uploadedAt?: string;
}

export type SubmissionStatus = "draft" | "submitted" | "reviewed" | "rejected";

export interface TaskSubmission {
  id:                 string;
  taskId:             string;
  clientId:           string;
  templateVersionId:  string | null;
  status:             SubmissionStatus;
  formData:           SubmissionData;
  attachments:        Attachment[];
  submittedAt:        string | null;
  reviewedAt:         string | null;
  reviewedBy:         string | null;
  reviewNotes:        string | null;
  createdAt:          string;
  updatedAt:          string;
}

export interface TemplateVersion {
  id:          string;
  templateId:  string;
  version:     number;
  formSchema:  FormField[];
  isPublished: boolean;
  publishedAt: string | null;
  createdBy:   string | null;
  createdAt:   string;
}

export interface TaskTemplate {
  id:            string;
  name:          string;
  description:   string | null;
  taskType:      string;
  category:      string | null;
  isActive:      boolean;
  latestVersion: number | null;
  createdBy:     string | null;
  versions?:     TemplateVersion[];
  createdAt:     string;
  updatedAt:     string;
}
