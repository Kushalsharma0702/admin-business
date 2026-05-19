import { createFileRoute } from "@tanstack/react-router";
import { ListPage } from "@/components/app/ListPage";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Layout, FileText, Mail, ClipboardCheck, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/templates")({ component: TemplatesPage });

const templates = [
  { id: "1", name: "Tax Return Engagement Letter", type: "Document", icon: FileText, description: "Standard engagement letter for individual tax return preparation." },
  { id: "2", name: "Client Welcome Email", type: "Email", icon: Mail, description: "Onboarding email template for new clients." },
  { id: "3", name: "Monthly Bookkeeping Checklist", type: "Checklist", icon: ClipboardCheck, description: "Standard monthly bookkeeping review checklist." },
  { id: "4", name: "Quarterly Tax Planning Letter", type: "Document", icon: FileText, description: "Quarterly letter outlining estimated tax payments." },
  { id: "5", name: "W-2 Collection Request", type: "Email", icon: Mail, description: "Email template requesting W-2 forms from clients." },
  { id: "6", name: "Extension Filing Notice", type: "Document", icon: FileText, description: "Notification to clients about filing extension." },
];

function TemplatesPage() {
  return (
    <ListPage title="Templates" subtitle={`${templates.length} templates`}
      actions={<Button size="sm" onClick={() => toast.success("Template created")}><Plus className="w-4 h-4 mr-1" />Create template</Button>}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map(t => (
          <Card key={t.id} className="p-5 hover:shadow-md transition-shadow cursor-pointer group" onClick={() => toast.success(`Opening "${t.name}"`)}>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <t.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="font-medium text-sm group-hover:text-primary transition-colors">{t.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{t.type}</div>
                <div className="text-xs text-muted-foreground mt-2">{t.description}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </ListPage>
  );
}
