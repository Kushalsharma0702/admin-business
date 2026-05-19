import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/settings/mileage")({ component: MileagePage });

function MileagePage() {
  const [rate, setRate] = useState("0.67");
  const [defaultVehicle, setDefaultVehicle] = useState("Car");
  const vehicles = ["Car", "Motorcycle", "Van"];

  return (
    <div className="max-w-2xl">
      <h2 className="text-lg font-semibold mb-6">Mileage</h2>
      <Card className="p-6 space-y-5">
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase mb-1 block">Rate per km ($)</label>
          <Input type="number" step="0.01" value={rate} onChange={e => setRate(e.target.value)} className="max-w-[200px]" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase mb-1 block">Vehicle types</label>
          <div className="space-y-1.5">{vehicles.map(v => <div key={v} className="px-3 py-2 border border-border rounded-md text-sm">{v}</div>)}</div>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase mb-1 block">Default vehicle</label>
          <select className="w-full border border-border rounded-md h-9 px-2 text-sm bg-background" value={defaultVehicle} onChange={e => setDefaultVehicle(e.target.value)}>
            {vehicles.map(v => <option key={v}>{v}</option>)}
          </select>
        </div>
        <Button onClick={() => toast.success("Mileage settings saved")}>Save</Button>
      </Card>
    </div>
  );
}
