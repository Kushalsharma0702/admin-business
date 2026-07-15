import { FormField, Attachment } from "@/lib/formTypes";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, X, Loader2, FileIcon } from "lucide-react";
import { API_BASE } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";

interface Props {
  field: FormField;
  attachment?: Attachment;
  onAttachmentChange: (attachment: Attachment | null) => void;
  taskId: string;
  disabled?: boolean;
  error?: string;
}

export function FileUploadField({ field, attachment, onAttachmentChange, taskId, disabled, error }: Props) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { token } = useAuthStore();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size
    const maxMb = field.maxSizeMb ?? 10;
    if (file.size > maxMb * 1024 * 1024) {
      setUploadError(`File must be under ${maxMb}MB`);
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      // 1. Get presigned URL
      const presignRes = await fetch(`${API_BASE}/v3/api/v1/s3/presign`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ fileName: file.name, fileType: file.type, taskId, fieldId: field.id }),
      });
      const presignData = await presignRes.json();
      if (!presignData.success) throw new Error(presignData.message || "Failed to get upload URL");

      const { uploadUrl, s3Key, s3Bucket } = presignData.data;

      // 2. Upload directly to S3
      await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      onAttachmentChange({ fieldId: field.id, s3Key, s3Bucket, fileName: file.name, fileSize: file.size });
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">
        {field.label}{field.required && <span className="text-destructive ml-1">*</span>}
      </label>

      {attachment ? (
        <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/40">
          <FileIcon className="h-4 w-4 text-primary shrink-0" />
          <span className="text-sm truncate flex-1">{attachment.fileName}</span>
          <Badge variant="secondary" className="text-[10px]">
            {(attachment.fileSize / 1024).toFixed(0)}KB
          </Badge>
          {!disabled && (
            <button type="button" onClick={() => { onAttachmentChange(null); }} className="text-muted-foreground hover:text-destructive">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ) : (
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/60 transition-colors ${error ? "border-destructive" : "border-muted-foreground/30"}`}
          onClick={() => !disabled && fileRef.current?.click()}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Uploading…</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="h-6 w-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Click to upload{field.maxSizeMb ? ` (max ${field.maxSizeMb}MB)` : ""}</p>
              {field.acceptedTypes && (
                <p className="text-[10px] text-muted-foreground">{field.acceptedTypes.join(", ")}</p>
              )}
            </div>
          )}
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        className="hidden"
        accept={field.acceptedTypes?.join(",")}
        onChange={handleFileChange}
        disabled={disabled || uploading}
      />

      {(error || uploadError) && (
        <p className="text-xs text-destructive">{uploadError || error}</p>
      )}
      {field.helpText && <p className="text-xs text-muted-foreground">{field.helpText}</p>}
    </div>
  );
}
