import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Upload, Download, CheckCircle2, AlertCircle } from "lucide-react";

interface ImportarProps {
  url: string;
  label: string;
  onSuccess?: () => void;
}

export function BotaoImportar({ url, label, onSuccess }: ImportarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; mensagem: string; detalhes?: string[] } | null>(null);

  const handleFile = async (file: File) => {
    setLoading(true);
    setResult(null);
    try {
      const form = new FormData();
      form.append("arquivo", file);
      const res = await fetch(url, { method: "POST", body: form });
      const json = await res.json();
      if (res.ok) {
        setResult({ ok: true, mensagem: json.mensagem ?? "Importação concluída.", detalhes: json.detalhes });
        onSuccess?.();
      } else {
        setResult({ ok: false, mensagem: json.error ?? "Erro na importação.", detalhes: json.detalhes });
      }
    } catch (e: any) {
      setResult({ ok: false, mensagem: e.message ?? "Erro de rede." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) { setOpen(true); handleFile(file); }
          e.target.value = "";
        }}
      />
      <Button
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={loading}
      >
        <Upload className="h-3.5 w-3.5 mr-1.5" />
        {label}
      </Button>

      <Dialog open={open} onOpenChange={(v) => { if (!loading) setOpen(v); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importação de Planilha</DialogTitle>
            <DialogDescription>Processando o arquivo Excel enviado.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {loading && (
              <div className="flex items-center gap-3 text-muted-foreground">
                <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">Processando arquivo...</span>
              </div>
            )}
            {result && (
              <div className="space-y-3">
                <div className={`flex items-start gap-3 p-3 rounded-lg ${result.ok ? "bg-green-50 text-green-800 dark:bg-green-950/30 dark:text-green-300" : "bg-destructive/10 text-destructive"}`}>
                  {result.ok ? <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" /> : <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />}
                  <span className="text-sm font-medium">{result.mensagem}</span>
                </div>
                {result.detalhes && result.detalhes.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Avisos ({result.detalhes.length}):</p>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {result.detalhes.map((d, i) => (
                        <p key={i} className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">{d}</p>
                      ))}
                    </div>
                  </div>
                )}
                <Button className="w-full" onClick={() => setOpen(false)}>Fechar</Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface ExportarProps {
  url: string;
  label: string;
}

export function BotaoExportar({ url, label }: ExportarProps) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Erro ao exportar");
      const blob = await res.blob();
      const contentDisposition = res.headers.get("Content-Disposition") ?? "";
      const match = contentDisposition.match(/filename="([^"]+)"/);
      const filename = match?.[1] ?? "exportacao.xlsx";
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={loading}>
      {loading ? (
        <div className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin mr-1.5" />
      ) : (
        <Download className="h-3.5 w-3.5 mr-1.5" />
      )}
      {label}
    </Button>
  );
}
