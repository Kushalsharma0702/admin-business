import React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { submissionsApi } from "@/lib/api";
import { AppShell } from "@/components/app/AppShell";
import { FormRenderer } from "@/components/forms/FormRenderer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Loader2, FileIcon, CheckCircle2, XCircle } from "lucide-react";

export const Route = createFileRoute("/submissions/$submissionId")({ component: SubmissionDetailPage });

const STATUS_BADGES: Record<string, React.ReactElement> = {
  draft:     <Badge variant="secondary">Draft</Badge>,
  submitted: <Badge className="bg-blue-100 text-blue-800 border-blue-200">Submitted</Badge>,
  reviewed:  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Reviewed</Badge>,
  rejected:  <Badge className="bg-rose-100 text-rose-800 border-rose-200">Rejected</Badge>,
};

function SubmissionDetailPage() {
  const { submissionId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [reviewStatus, setReviewStatus] = useState<"reviewed" | "rejected">("reviewed");
  const [reviewNotes, setReviewNotes] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["submission", submissionId],
    queryFn: () => submissionsApi.get(submissionId),
  });

  const reviewMutation = useMutation({
    mutationFn: () => submissionsApi.review(submissionId, { status: reviewStatus, reviewNotes }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["submission", submissionId] }); toast.success("Review saved"); },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) {
    return <AppShell><div className="p-6 flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading…</div></AppShell>;
  }

  const sub = data?.data;
  if (!sub) return <AppShell><div className="p-6">Submission not found.</div></AppShell>;

  const schema = sub.templateVersion?.formSchema ?? [];
  const canReview = sub.status === "submitted";

  return (
    <AppShell>
      <div className="p-6 max-w-3xl mx-auto space-y-5">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate({ to: -1 as never })}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold">{sub.taskTitle ?? "Submission"}</h1>
              {STATUS_BADGES[sub.status]}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {sub.clientName && <>Client: {sub.clientName} · </>}
              {sub.submittedAt ? `Submitted ${new Date(sub.submittedAt).toLocaleString()}` : `Draft — ${new Date(sub.createdAt).toLocaleString()}`}
            </p>
          </div>
        </div>

        {/* Form data (read-only) */}
        <Card className="p-5">
          <h2 className="text-sm font-semibold mb-4">Form Responses</h2>
          {schema.length > 0 ? (
            <FormRenderer
              schema={schema}
              initialData={sub.formData as Record<string, string | number | boolean | string[]>}
              initialAttachments={sub.attachments}
              mode="view"
              taskId={sub.taskId}
            />
          ) : (
            <p className="text-sm text-muted-foreground">No form schema available for this submission.</p>
          )}
        </Card>

        {/* Attachments */}
        {sub.attachments.length > 0 && (
          <Card className="p-5">
            <h2 className="text-sm font-semibold mb-3">Attachments</h2>
            <div className="space-y-2">
              {sub.attachments.map((att, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                  <FileIcon className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-sm flex-1 truncate">{att.fileName}</span>
                  <Badge variant="secondary" className="text-[10px]">{(att.fileSize / 1024).toFixed(0)}KB</Badge>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Review panel */}
        {sub.status === "reviewed" && (
          <Card className="p-5 border-emerald-200 bg-emerald-50">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <h2 className="text-sm font-semibold text-emerald-800">Reviewed</h2>
            </div>
            {sub.reviewNotes && <p className="text-sm text-emerald-700">{sub.reviewNotes}</p>}
          </Card>
        )}

        {sub.status === "rejected" && (
          <Card className="p-5 border-rose-200 bg-rose-50">
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="h-4 w-4 text-rose-600" />
              <h2 className="text-sm font-semibold text-rose-800">Rejected</h2>
            </div>
            {sub.reviewNotes && <p className="text-sm text-rose-700">{sub.reviewNotes}</p>}
          </Card>
        )}

        {canReview && (
          <Card className="p-5">
            <h2 className="text-sm font-semibold mb-3">Review Submission</h2>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Decision</Label>
                <Select value={reviewStatus} onValueChange={(v) => setReviewStatus(v as "reviewed" | "rejected")}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reviewed">Mark as Reviewed</SelectItem>
                    <SelectItem value="rejected">Reject</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Notes (optional)</Label>
                <Textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Add review notes for the client or your team…"
                  rows={3}
                />
              </div>
              <Button onClick={() => reviewMutation.mutate()} disabled={reviewMutation.isPending}>
                {reviewMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : "Save Review"}
              </Button>
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
