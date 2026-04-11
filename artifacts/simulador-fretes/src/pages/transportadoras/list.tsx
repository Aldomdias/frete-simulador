import { useRef, useState } from "react";
import { Link } from "wouter";
import {
  useListTransportadoras,
  useCreateTransportadora,
  useUpdateTransportadora,
  useDeleteTransportadora,
} from "@workspace/api-client-react";
import type { Transportadora } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Building2, Plus, Pencil, Trash2, ChevronRight, Search, Upload, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getListTransportadorasQueryKey } from "@workspace/api-client-react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function Spinner() {
  return <div className="inline-block h-4 w-4 border-2 border-current border-r-transparent rounded-full animate-spin" />;
}

interface FormState {
  nome: string;
  ativo: boolean;
}

export default function TransportadorasList() {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Transportadora | null>(null);
  const [deleting, setDeleting] = useState<Transportadora | null>(null);
  const [form, setForm] = useState<FormState>({ nome: "", ativo: true });
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const qc = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useListTransportadoras({ search: search || undefined });
  const transportadoras = data?.data ?? [];

  const createMut = useCreateTransportadora({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListTransportadorasQueryKey() });
        toast({ title: "Transportadora criada com sucesso." });
        setShowForm(false);
        setForm({ nome: "", ativo: true });
      },
      onError: (e: any) => toast({ title: "Erro ao criar", description: e.message, variant: "destructive" }),
    },
  });

  const updateMut = useUpdateTransportadora({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListTransportadorasQueryKey() });
        toast({ title: "Transportadora atualizada." });
        setEditing(null);
        setForm({ nome: "", ativo: true });
      },
      onError: (e: any) => toast({ title: "Erro ao atualizar", description: e.message, variant: "destructive" }),
    },
  });

  const deleteMut = useDeleteTransportadora({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListTransportadorasQueryKey() });
        toast({ title: "Transportadora excluída." });
        setDeleting(null);
      },
      onError: (e: any) => toast({ title: "Erro ao excluir", description: e.message, variant: "destructive" }),
    },
  });

  const openCreate = () => {
    setForm({ nome: "", ativo: true });
    setEditing(null);
    setShowForm(true);
  };

  const openEdit = (t: Transportadora) => {
    setForm({ nome: t.nome, ativo: t.ativo });
    setEditing(t);
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!form.nome.trim()) return;
    if (editing) {
      updateMut.mutate({ id: editing.id, data: { nome: form.nome.trim(), ativo: form.ativo } });
    } else {
      createMut.mutate({ data: { nome: form.nome.trim(), ativo: form.ativo } });
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append("arquivo", file);
      const resp = await fetch(`${API_BASE}/api/transportadoras/importar`, { method: "POST", body: fd });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.error ?? "Erro desconhecido");
      qc.invalidateQueries({ queryKey: getListTransportadorasQueryKey() });
      const parts: string[] = [];
      if (json.transportadorasInseridas > 0) parts.push(`${json.transportadorasInseridas} transportadora(s) criada(s)`);
      if (json.origensInseridas > 0) parts.push(`${json.origensInseridas} origem(ns) criada(s)`);
      toast({
        title: parts.length > 0 ? parts.join(" · ") : "Importação concluída",
        description: json.linhasIgnoradas > 0 ? `${json.linhasIgnoradas} linha(s) ignorada(s).` : undefined,
      });
    } catch (err: any) {
      toast({ title: "Falha na importação", description: err.message, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const isSaving = createMut.isPending || updateMut.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Transportadoras</h1>
          <p className="text-muted-foreground mt-1 text-sm">Gerencie as transportadoras e suas configurações de origem</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={handleImport}
          />
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-muted-foreground"
            asChild
          >
            <a href={`${import.meta.env.BASE_URL}modelo-transportadoras.xlsx`} download>
              <Download className="h-4 w-4" /> Baixar Modelo
            </a>
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            disabled={importing}
            onClick={() => fileRef.current?.click()}
          >
            {importing ? <Spinner /> : <Upload className="h-4 w-4" />}
            Importar Excel
          </Button>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> Nova Transportadora
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Buscar transportadora..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
          <Spinner /> Carregando...
        </div>
      ) : transportadoras.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Building2 className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground font-medium">Nenhuma transportadora encontrada.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Clique em "Nova Transportadora" para adicionar uma por uma, ou em "Importar Excel" para importar uma lista.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {transportadoras.map((t) => (
            <Card key={t.id} className="hover:border-primary/30 transition-colors group">
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between gap-4">
                  <Link href={`/transportadoras/${t.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex-shrink-0 h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                        {t.nome}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {t.totalOrigens} origem(ns) cadastrada(s)
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                  </Link>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant={t.ativo ? "default" : "secondary"} className="text-xs">
                      {t.ativo ? "Ativa" : "Inativa"}
                    </Badge>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(t)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleting(t)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {data && (
        <p className="text-xs text-muted-foreground text-right">
          {data.total} transportadora(s) no total
        </p>
      )}

      <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 p-4">
        <p className="text-xs text-muted-foreground">
          <strong>Formato do Excel:</strong> A = Transportadora&nbsp;&nbsp;|&nbsp;&nbsp;B = Ativo (Sim/Não)&nbsp;&nbsp;|&nbsp;&nbsp;C = Canal (B2C / ATACADO / LOTAÇÃO)&nbsp;&nbsp;|&nbsp;&nbsp;D = Cidade&nbsp;&nbsp;|&nbsp;&nbsp;E = UF.
          As colunas C–E são opcionais; quando preenchidas, as origens já são criadas junto com a transportadora. Baixe o modelo para começar.
        </p>
      </div>

      <Dialog open={showForm} onOpenChange={(open) => { if (!open) setShowForm(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Transportadora" : "Nova Transportadora"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="nome">Nome da Transportadora</Label>
              <Input
                id="nome"
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                placeholder="Ex: Correios, Jadlog, Total Express..."
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                autoFocus
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="ativo"
                checked={form.ativo}
                onChange={(e) => setForm((f) => ({ ...f, ativo: e.target.checked }))}
                className="rounded"
              />
              <Label htmlFor="ativo">Ativa</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={isSaving || !form.nome.trim()}>
              {isSaving ? <><Spinner /><span className="ml-2">Salvando...</span></> : editing ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(open) => { if (!open) setDeleting(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Transportadora</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a transportadora <strong>{deleting?.nome}</strong>?
              Todas as origens, rotas e cotações associadas também serão excluídas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleting && deleteMut.mutate({ id: deleting.id })}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
