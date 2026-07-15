import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { templatesApi } from "@/lib/api";
import { FormField, TemplateVersion } from "@/lib/formTypes";
import { AppShell } from "@/components/app/AppShell";
import { FormBuilder } from "@/components/forms/FormBuilder";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { ArrowLeft, Plus, Send, CheckCircle2, Loader2 } from "lucide-react";

export const Route = createFileRoute("/templates/$templateId")({ component: TemplateBuilderPage });

function TemplateBuilderPage() {
  const { templateId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [draftSchema, setDraftSchema] = useState<FormField[]>([]);
  const [activeVersionId, setActiveVersionId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["template", templateId],
    queryFn: () => templatesApi.get(templateId),
  });

  // When data first loads, activate the latest unpublished draft if present
  useEffect(() => {
    if (data?.data?.versions && activeVersionId === null) {
      const draft = data.data.versions.find((v: TemplateVersion) => !v.isPublished);
      if (draft) setActiveVersionId(draft.id);
    }
  }, [data, activeVersionId]);

  const template = data?.data;

  // Fetch active version's schema when selected
  const { data: versionData } = useQuery({
    queryKey: ["template-version", activeVersionId],
    queryFn: () => templatesApi.getVersion(templateId, activeVersionId!),
    enabled: !!activeVersionId,
  });

  // When version loads, populate draftSchema
  useEffect(() => {
    if (versionData?.data?.formSchema) {
      setDraftSchema(versionData.data.formSchema);
    }
  }, [versionData]);

  const createVersionMutation = useMutation({
    mutationFn: () => templatesApi.createVersion(templateId, draftSchema),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["template", templateId] });
      setActiveVersionId(res.data.id);
      toast.success(`Version ${res.data.version} created`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const saveVersionMutation = useMutation({
    mutationFn: () => templatesApi.updateVersion(templateId, activeVersionId!, draftSchema),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["template-version", activeVersionId] }); toast.success("Draft saved"); },
    onError: (err: Error) => toast.error(err.message),
  });

  const publishMutation = useMutation({
    mutationFn: () => templatesApi.publishVersion(templateId, activeVersionId!),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["template", templateId] }); toast.success("Version published!"); },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) {
    return <AppShell><div className="p-6 flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading template…</div></AppShell>;
  }
  if (!template) {
    return <AppShell><div className="p-6">Template not found.</div></AppShell>;
  }

  const publishedVersions = (template.versions ?? []).filter((v: TemplateVersion) => v.isPublished);
  const draftVersion = (template.versions ?? []).find((v: TemplateVersion) => !v.isPublished);
  const activeVersion = (template.versions ?? []).find((v: TemplateVersion) => v.id === activeVersionId);
  const isDraft = !!draftVersion && activeVersionId === draftVersion?.id;

  return (
    <AppShell>
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate({ to: "/templates" })} className="shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold truncate">{template.name}</h1>
              <Badge variant={template.isActive ? "default" : "secondary"}>{template.isActive ? "Active" : "Archived"}</Badge>
            </div>
            {template.description && <p className="text-muted-foreground text-sm mt-0.5">{template.description}</p>}
          </div>

          <div className="flex items-center gap-2">
            {isDraft && (
              <>
                <Button variant="outline" onClick={() => saveVersionMutation.mutate()} disabled={saveVersionMutation.isPending}>
                  {saveVersionMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Draft"}
                </Button>
                <Button onClick={() => publishMutation.mutate()} disabled={publishMutation.isPending || draftSchema.length === 0}>
                  <Send className="h-4 w-4 mr-2" />
                  {publishMutation.isPending ? "Publishing…" : "Publish"}
                </Button>
              </>
            )}
            {!draftVersion && (
              <Button variant="outline" onClick={() => { setDraftSchema(activeVersion?.formSchema ?? []); createVersionMutation.mutate(); }} disabled={createVersionMutation.isPending}>
                <Plus className="h-4 w-4 mr-2" />New Version
              </Button>
            )}
          </div>
        </div>

        <div className="flex gap-6">
          {/* Version sidebar */}
          <div className="w-48 shrink-0 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase">Versions</p>

            {draftVersion && (
              <button
                onClick={() => setActiveVersionId(draftVersion.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-colors ${activeVersionId === draftVersion.id ? "border-primary bg-primary/5 font-medium" : "hover:bg-muted/60"}`}
              >
                <div className="flex items-center justify-between">
                  <span>v{draftVersion.version}</span>
                  <Badge variant="secondary" className="text-[10px]">Draft</Badge>
                </div>
              </button>
            )}

            {publishedVersions.map((v) => (
              <button
                key={v.id}
                onClick={() => { setActiveVersionId(v.id); }}
                className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-colors ${activeVersionId === v.id ? "border-primary bg-primary/5 font-medium" : "hover:bg-muted/60"}`}
              >
                <div className="flex items-center justify-between">
                  <span>v{v.version}</span>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {v.publishedAt ? new Date(v.publishedAt).toLocaleDateString() : ""}
                </p>
              </button>
            ))}

            {!draftVersion && publishedVersions.length === 0 && (
              <div className="text-xs text-muted-foreground text-center py-4">
                No versions yet.
                <button className="block text-primary mt-1 hover:underline" onClick={() => createVersionMutation.mutate()}>
                  Create first version
                </button>
              </div>
            )}
          </div>

          <Separator orientation="vertical" className="h-auto" />

          {/* Builder canvas */}
          <div className="flex-1 min-w-0">
            {activeVersionId ? (
              <div className="space-y-3">
                {activeVersion && !activeVersion.isPublished && (
                  <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                    Editing draft v{activeVersion.version}. Published versions are read-only.
                  </p>
                )}
                {activeVersion?.isPublished && (
                  <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-3 py-2">
                    v{activeVersion.version} is published and locked. Create a new version to make changes.
                  </p>
                )}
                <FormBuilder
                  key={activeVersionId}
                  initialSchema={activeVersion?.formSchema ?? draftSchema}
                  onSchemaChange={setDraftSchema}
                />
              </div>
            ) : (
              <div className="text-center py-16 text-muted-foreground">
                <p className="text-sm">Select a version from the left to start editing</p>
                <Button className="mt-4" variant="outline" onClick={() => createVersionMutation.mutate()}>
                  <Plus className="h-4 w-4 mr-2" />Create First Version
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
