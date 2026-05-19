import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/app/EmptyState";
import { Lock } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/settings/vault")({ component: VaultPage });

function VaultPage() {
  return (
    <div className="max-w-2xl">
      <h2 className="text-lg font-semibold mb-6">Vault</h2>
      <Card className="p-6">
        <EmptyState icon={Lock} title="Vault is empty" description="Securely store sensitive documents. Files stored here are encrypted at rest." actionLabel="Upload to vault" onAction={() => toast.success("Upload started")} />
      </Card>
    </div>
  );
}
