import { FormField as FormFieldType, SubmissionData, Attachment } from "@/lib/formTypes";
import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Save, Send } from "lucide-react";
import { TextField } from "./fields/TextField";
import { TextareaField } from "./fields/TextareaField";
import { NumberField } from "./fields/NumberField";
import { EmailField } from "./fields/EmailField";
import { PhoneField } from "./fields/PhoneField";
import { DateField } from "./fields/DateField";
import { SelectField } from "./fields/SelectField";
import { CheckboxField } from "./fields/CheckboxField";
import { RadioField } from "./fields/RadioField";
import { FileUploadField } from "./fields/FileUploadField";
import { SignatureField } from "./fields/SignatureField";

interface FormRendererProps {
  schema:         FormFieldType[];
  initialData?:   SubmissionData;
  initialAttachments?: Attachment[];
  mode:           "fill" | "view";
  taskId:         string;
  savingDraft?:   boolean;
  submitting?:    boolean;
  onSaveDraft?:   (data: SubmissionData, attachments: Attachment[]) => void;
  onSubmit?:      (data: SubmissionData, attachments: Attachment[]) => void;
}

type FieldErrors = Record<string, string>;

export function FormRenderer({
  schema, initialData = {}, initialAttachments = [],
  mode, taskId,
  savingDraft, submitting,
  onSaveDraft, onSubmit,
}: FormRendererProps) {
  const [formData, setFormData]   = useState<SubmissionData>(initialData);
  const [attachments, setAttachments] = useState<Attachment[]>(initialAttachments);
  const [errors, setErrors]       = useState<FieldErrors>({});

  const sortedFields = [...schema].sort((a, b) => a.order - b.order);

  const updateField = useCallback((fieldId: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value as string }));
    setErrors((prev) => { const e = { ...prev }; delete e[fieldId]; return e; });
  }, []);

  const updateAttachment = useCallback((fieldId: string, attachment: Attachment | null) => {
    setAttachments((prev) => {
      const filtered = prev.filter((a) => a.fieldId !== fieldId);
      return attachment ? [...filtered, attachment] : filtered;
    });
    if (attachment) setErrors((prev) => { const e = { ...prev }; delete e[fieldId]; return e; });
  }, []);

  const validate = (): boolean => {
    const newErrors: FieldErrors = {};
    for (const field of sortedFields) {
      if (!field.required) continue;
      if (field.type === "file_upload") {
        if (!attachments.find((a) => a.fieldId === field.id)) {
          newErrors[field.id] = `${field.label} is required`;
        }
      } else if (field.type === "signature") {
        const val = formData[field.id];
        if (!val || String(val).trim() === "") newErrors[field.id] = `${field.label} is required`;
      } else {
        const val = formData[field.id];
        if (val === undefined || val === null || String(val).trim() === "") {
          newErrors[field.id] = `${field.label} is required`;
        }
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onSubmit?.(formData, attachments);
  };

  if (sortedFields.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>This task has no form attached.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-5">
        {sortedFields.map((field) => {
          const val = formData[field.id];
          const err = errors[field.id];
          const isDisabled = mode === "view";

          switch (field.type) {
            case "text":
              return <TextField key={field.id} field={field} value={String(val ?? "")} onChange={(v) => updateField(field.id, v)} disabled={isDisabled} error={err} />;
            case "textarea":
              return <TextareaField key={field.id} field={field} value={String(val ?? "")} onChange={(v) => updateField(field.id, v)} disabled={isDisabled} error={err} />;
            case "number":
              return <NumberField key={field.id} field={field} value={String(val ?? "")} onChange={(v) => updateField(field.id, v)} disabled={isDisabled} error={err} />;
            case "email":
              return <EmailField key={field.id} field={field} value={String(val ?? "")} onChange={(v) => updateField(field.id, v)} disabled={isDisabled} error={err} />;
            case "phone":
              return <PhoneField key={field.id} field={field} value={String(val ?? "")} onChange={(v) => updateField(field.id, v)} disabled={isDisabled} error={err} />;
            case "date":
              return <DateField key={field.id} field={field} value={String(val ?? "")} onChange={(v) => updateField(field.id, v)} disabled={isDisabled} error={err} />;
            case "select":
              return <SelectField key={field.id} field={field} value={String(val ?? "")} onChange={(v) => updateField(field.id, v)} disabled={isDisabled} error={err} />;
            case "checkbox":
              return <CheckboxField key={field.id} field={field} value={!!val} onChange={(v) => updateField(field.id, v)} disabled={isDisabled} error={err} />;
            case "radio":
              return <RadioField key={field.id} field={field} value={String(val ?? "")} onChange={(v) => updateField(field.id, v)} disabled={isDisabled} error={err} />;
            case "file_upload":
              return (
                <FileUploadField
                  key={field.id}
                  field={field}
                  attachment={attachments.find((a) => a.fieldId === field.id)}
                  onAttachmentChange={(att) => updateAttachment(field.id, att)}
                  taskId={taskId}
                  disabled={isDisabled}
                  error={err}
                />
              );
            case "signature":
              return <SignatureField key={field.id} field={field} value={String(val ?? "")} onChange={(v) => updateField(field.id, v)} disabled={isDisabled} error={err} />;
            default:
              return (
                <div key={field.id} className="p-3 rounded border bg-muted/40 text-sm text-muted-foreground">
                  Unknown field type: <code>{field.type}</code>
                </div>
              );
          }
        })}
      </div>

      {mode === "fill" && (
        <div className="flex gap-3 pt-2 border-t">
          {onSaveDraft && (
            <Button type="button" variant="outline" onClick={() => onSaveDraft(formData, attachments)} disabled={savingDraft || submitting}>
              {savingDraft ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : <><Save className="h-4 w-4 mr-2" />Save Draft</>}
            </Button>
          )}
          {onSubmit && (
            <Button type="button" onClick={handleSubmit} disabled={submitting || savingDraft} className="flex-1 sm:flex-none">
              {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Submitting…</> : <><Send className="h-4 w-4 mr-2" />Submit Form</>}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
