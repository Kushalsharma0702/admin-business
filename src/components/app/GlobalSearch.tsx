import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useAppStore } from "@/store/useAppStore";
import { useNavigate } from "@tanstack/react-router";

export function GlobalSearch({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { clients, tasks, costs, transactions } = useAppStore();
  const navigate = useNavigate();

  const go = (to: string) => {
    onOpenChange(false);
    navigate({ to });
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search clients, tasks, documents, transactions…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Clients">
          {clients.slice(0, 6).map((c) => (
            <CommandItem key={c.id} onSelect={() => go(`/clients/${c.id}/home`)}>
              {c.name}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Tasks">
          {tasks.slice(0, 5).map((t) => (
            <CommandItem key={t.id} onSelect={() => go(`/clients/${t.clientId}/tasks`)}>
              {t.name}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Costs">
          {costs.slice(0, 5).map((c) => (
            <CommandItem key={c.id} onSelect={() => go("/costs")}>
              {c.supplier} — ${c.total.toFixed(2)}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Bank">
          {transactions.slice(0, 5).map((t) => (
            <CommandItem key={t.id} onSelect={() => go("/bank")}>
              {t.description}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}