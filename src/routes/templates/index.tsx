import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { templatesApi } from "@/lib/api";
import { TaskTemplate } from "@/lib/formTypes";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Search, FileText, Pencil, Archive, Layers } from "lucide-react";

export const Route = createFileRoute("/templates/")({ component: TemplatesPage });

function TemplatesPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newForm, setNewForm] = useState({ name: "", description: "", category: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["templates", search],
    queryFn: () => templatesApi.list({ search, per_page: 50 }),
  });

  const createMutation = useMutation({
    mutationFn: () => templatesApi.create({ name: newForm.name, description: newForm.description, category: newForm.category }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["templates"] });
      toast.success("Template created");
      setShowCreate(false);
      setNewForm({ name: "", description: "", category: "" });
      navigate({ to: `/templates/${res.data.id}` });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => templatesApi.archive(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["templates"] }); toast.success("Template archived"); },
    onError: (err: Error) => toast.error(err.message),
  });

  const templates: TaskTemplate[] = data?.data ?? [];

  return (
    <AppShell>
      <div className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Task Templates</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Build reusable form templates to assign to clients</p>
          </div>
          <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-2" />New Template</Button>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search templates…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {/* List */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="p-4 animate-pulse h-28 bg-muted/40" />
            ))}
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No templates yet</p>
            <p className="text-sm mt-1">Create your first template to start assigning forms to clients.</p>
            <Button className="mt-4" onClick={() => setShowCreate(true)}>Create Template</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((t) => (
              <Card key={t.id} className="p-4 flex flex-col gap-3 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Layers className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{t.name}</p>
                    {t.description && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{t.description}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {t.category && <Badge variant="secondary" className="text-[10px]">{t.category}</Badge>}
                  <Badge variant="outline" className="text-[10px]">v{t.latestVersion ?? 0}</Badge>
                  <Badge variant={t.isActive ? "default" : "secondary"} className="text-[10px]">{t.isActive ? "Active" : "Archived"}</Badge>
                </div>
                <div className="flex gap-2 mt-auto">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => navigate({ to: `/templates/${t.id}` })}>
                    <Pencil className="h-3.5 w-3.5 mr-1.5" />Edit
                  </Button>
                  {t.isActive && (
                    <Button size="sm" variant="ghost" onClick={() => archiveMutation.mutate(t.id)} disabled={archiveMutation.isPending}>
                      <Archive className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Template</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Template Name <span className="text-destructive">*</span></Label>
              <Input value={newForm.name} onChange={(e) => setNewForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. T2 Corporate Onboarding" autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={newForm.description} onChange={(e) => setNewForm((f) => ({ ...f, description: e.target.value }))} placeholder="What is this template for?" rows={3} />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Input value={newForm.category} onChange={(e) => setNewForm((f) => ({ ...f, category: e.target.value }))} placeholder="e.g. onboarding, tax, payroll" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} disabled={!newForm.name.trim() || createMutation.isPending}>
              {createMutation.isPending ? "Creating…" : "Create Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
