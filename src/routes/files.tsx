import { createFileRoute } from "@tanstack/react-router";
import { ListPage } from "@/components/app/ListPage";
import { useAppStore, uid } from "@/store/useAppStore";
import { EmptyState } from "@/components/app/EmptyState";
import { Upload, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { fmtDate } from "@/components/app/utils";

export const Route = createFileRoute("/files")({ component: FilesPage });

function FilesPage() {
  const { files, addFile, clients } = useAppStore();

  const onUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files; if (!list) return;
    Array.from(list).forEach(f => addFile({ id: uid(), clientId: clients[0]?.id ?? "", name: f.name, type: f.type || "file", size: f.size, uploadedAt: new Date().toLocaleString(), uploadedBy: "Angela Martin" }));
    toast.success(`${list.length} file(s) uploaded`);
  };

  return (
    <ListPage title="Files" subtitle={`${files.length} files`}
      actions={<label className="inline-flex"><input type="file" multiple className="hidden" onChange={onUpload} /><span className="cursor-pointer inline-flex items-center px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm"><Upload className="w-4 h-4 mr-1.5" />Upload</span></label>}>
      {files.length === 0 ? (
        <label className="block border-2 border-dashed border-border rounded-lg p-16 text-center cursor-pointer hover:bg-muted/30">
          <input type="file" multiple className="hidden" onChange={onUpload} />
          <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <div className="font-medium text-lg">Add files</div>
          <div className="text-sm text-muted-foreground mt-1">Drag and drop files here or click to upload</div>
        </label>
      ) : (
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2.5 font-semibold">Name</th>
                <th className="text-left px-4 py-2.5 font-semibold">Client</th>
                <th className="text-left px-4 py-2.5 font-semibold">Type</th>
                <th className="text-right px-4 py-2.5 font-semibold">Size</th>
                <th className="text-left px-4 py-2.5 font-semibold">Uploaded</th>
                <th className="text-left px-4 py-2.5 font-semibold">By</th>
              </tr>
            </thead>
            <tbody>
              {files.map(f => {
                const client = clients.find(c => c.id === f.clientId);
                return (
                  <tr key={f.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                    <td className="px-4 py-2.5"><FileText className="w-4 h-4 inline mr-2 text-muted-foreground" />{f.name}</td>
                    <td className="px-4 py-2.5">{client?.name ?? "—"}</td>
                    <td className="px-4 py-2.5">{f.type}</td>
                    <td className="px-4 py-2.5 text-right">{(f.size / 1024).toFixed(1)} KB</td>
                    <td className="px-4 py-2.5">{f.uploadedAt}</td>
                    <td className="px-4 py-2.5">{f.uploadedBy}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </ListPage>
  );
}
