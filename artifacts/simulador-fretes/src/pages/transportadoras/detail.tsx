import { useState } from "react";
import { Link, useParams } from "wouter";
import {
  useGetTransportadora,
  useListOrigens,
  useCreateOrigem,
  useUpdateOrigem,
  useDeleteOrigem,
  getListOrigensQueryKey,
  getGetTransportadoraQueryKey,
} from "@workspace/api-client-react";
import type { Origem } from "@workspace/api-client-react";
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
import { ChevronRight, Plus, Pencil, Trash2, ArrowLeft, MapPin, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function Spinner() {
  return <div className="inline-block h-4 w-4 border-2 border-current border-r-transparent rounded-full animate-spin" />;
}

const UF_LIST = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"
];

const CANAIS = ["B2C", "ATACADO", "LOTAÇÃO"];

const CANAL_COLORS: Record<string, string> = {
  "B2C":    "bg-blue-100 text-blue-800 border-blue-200",
  "ATACADO":"bg-amber-100 text-amber-800 border-amber-200",
  "LOTAÇÃO":"bg-emerald-100 text-emerald-800 border-emerald-200",
};

function CanalBadge({ canal }: { canal: string }) {
  const cls = CANAL_COLORS[canal] ?? "bg-slate-100 text-slate-700 border-slate-200";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${cls}`}>
      {canal}
    </span>
  );
}

interface FormState {
  canal: string;
  cidade: string;
  uf: string;
  ativo: boolean;
}

const defaultForm: FormState = { canal: "B2C", cidade: "", uf: "SP", ativo: true };

export default function TransportadorasDetail() {
  const { id } = useParams();
  const transportadoraId = parseInt(id!, 10);

  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Origem | null>(null);
  const [deleting, setDeleting] = useState<Origem | null>(null);
  const [form, setForm] = useState<FormState>(defaultForm);

  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: transportadora, isLoading: loadingT } = useGetTransportadora(transportadoraId);
  const { data: origensData, isLoading: loadingO } = useListOrigens(transportadoraId, { pageSize: 500 });
  const allOrigens = origensData?.data ?? [];

  const filtered = search.trim()
    ? allOrigens.filter((o) => o.cidade.toLowerCase().includes(search.toLowerCase()) || o.uf.toLowerCase().includes(search.toLowerCase()))
    : allOrigens;

  // Group by canal
  const byCanal: Record<string, Origem[]> = {};
  for (const o of filtered) {
    const c = o.canal || "B2C";
    if (!byCanal[c]) byCanal[c] = [];
    byCanal[c].push(o);
  }
  const canalOrder = ["B2C", "ATACADO", "LOTAÇÃO"];
  const canaisPresentes = [
    ...canalOrder.filter((c) => byCanal[c]),
    ...Object.keys(byCanal).filter((c) => !canalOrder.includes(c)),
  ];

  const inv = () => {
    qc.invalidateQueries({ queryKey: getListOrigensQueryKey(transportadoraId) });
    qc.invalidateQueries({ queryKey: getGetTransportadoraQueryKey(transportadoraId) });
  };

  const createMut = useCreateOrigem({
    mutation: {
      onSuccess: () => { inv(); toast({ title: "Origem criada." }); setShowForm(false); setForm(defaultForm); },
      onError: (e: any) => toast({ title: "Erro ao criar", description: e.message, variant: "destructive" }),
    },
  });

  const updateMut = useUpdateOrigem({
    mutation: {
      onSuccess: () => { inv(); toast({ title: "Origem atualizada." }); setEditing(null); setForm(defaultForm); setShowForm(false); },
      onError: (e: any) => toast({ title: "Erro ao atualizar", description: e.message, variant: "destructive" }),
    },
  });

  const deleteMut = useDeleteOrigem({
    mutation: {
      onSuccess: () => { inv(); toast({ title: "Origem excluída." }); setDeleting(null); },
      onError: (e: any) => toast({ title: "Erro ao excluir", description: e.message, variant: "destructive" }),
    },
  });

  const openCreate = (canal?: string) => {
    setForm({ ...defaultForm, canal: canal ?? "B2C" });
    setEditing(null);
    setShowForm(true);
  };
  const openEdit = (o: Origem) => {
    setForm({ canal: o.canal || "B2C", cidade: o.cidade, uf: o.uf, ativo: o.ativo });
    setEditing(o);
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!form.cidade.trim()) return;
    const data = { canal: form.canal, cidade: form.cidade.trim(), uf: form.uf, ativo: form.ativo };
    if (editing) {
      updateMut.mutate({ transportadoraId, id: editing.id, data });
    } else {
      createMut.mutate({ transportadoraId, data });
    }
  };

  const isSaving = createMut.isPending || updateMut.isPending;

  if (loadingT) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
        <Spinner /> Carregando...
      </div>
    );
  }

  if (!transportadora) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Transportadora não encontrada.</p>
        <Button asChild variant="link" className="mt-2"><Link href="/transportadoras">Voltar</Link></Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="gap-1 -ml-2 mb-3 text-muted-foreground">
          <Link href="/transportadoras"><ArrowLeft className="h-4 w-4" /> Transportadoras</Link>
        </Button>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">{transportadora.nome}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={transportadora.ativo ? "default" : "secondary"} className="text-xs">
                {transportadora.ativo ? "Ativa" : "Inativa"}
              </Badge>
              <span className="text-xs text-muted-foreground">{transportadora.totalOrigens} origem(ns)</span>
            </div>
          </div>
          <Button onClick={() => openCreate()} className="gap-2">
            <Plus className="h-4 w-4" /> Nova Origem
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Buscar cidade de origem..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loadingO ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
          <Spinner /> Carregando origens...
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <MapPin className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground font-medium">Nenhuma origem cadastrada.</p>
            <p className="text-sm text-muted-foreground mt-1">Clique em "Nova Origem" para adicionar uma cidade de origem.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {canaisPresentes.map((canal) => (
            <div key={canal}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <CanalBadge canal={canal} />
                  <span className="text-xs text-muted-foreground">{byCanal[canal].length} origem(ns)</span>
                </div>
                <Button variant="ghost" size="sm" className="gap-1 h-7 text-xs" onClick={() => openCreate(canal)}>
                  <Plus className="h-3 w-3" /> Adicionar em {canal}
                </Button>
              </div>
              <div className="space-y-2">
                {byCanal[canal].map((o) => (
                  <Card key={o.id} className="hover:border-primary/30 transition-colors group">
                    <CardContent className="py-3 px-4">
                      <div className="flex items-center justify-between gap-4">
                        <Link
                          href={`/transportadoras/${transportadoraId}/origens/${o.id}`}
                          className="flex items-center gap-3 flex-1 min-w-0"
                        >
                          <div className="flex-shrink-0 h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                            <MapPin className="h-5 w-5 text-primary" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                              {o.cidade} — {o.uf}
                            </div>
                            <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 mt-0.5">
                              <span>{o.totalRotas} rota(s)</span>
                              {o.icms && <span>ICMS</span>}
                              {o.adValorem > 0 && <span>Ad Val: {o.adValorem}%</span>}
                              {o.grisPercentual > 0 && <span>GRIS: {o.grisPercentual}%</span>}
                              {o.tas > 0 && <span>TAS: R$ {o.tas.toFixed(2)}</span>}
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                        </Link>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge variant={o.ativo ? "outline" : "secondary"} className="text-xs">
                            {o.ativo ? "Ativa" : "Inativa"}
                          </Badge>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(o)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleting(o)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {origensData && (
        <p className="text-xs text-muted-foreground text-right">{origensData.total} origem(ns) no total</p>
      )}

      <Dialog open={showForm} onOpenChange={(open) => { if (!open) { setShowForm(false); setEditing(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Origem" : "Nova Origem"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="canal">Canal</Label>
              <select
                id="canal"
                value={form.canal}
                onChange={(e) => setForm((f) => ({ ...f, canal: e.target.value }))}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              >
                {CANAIS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="cidade">Cidade</Label>
                <Input
                  id="cidade"
                  value={form.cidade}
                  onChange={(e) => setForm((f) => ({ ...f, cidade: e.target.value }))}
                  placeholder="Ex: São Paulo"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="uf">UF</Label>
                <select
                  id="uf"
                  value={form.uf}
                  onChange={(e) => setForm((f) => ({ ...f, uf: e.target.value }))}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                >
                  {UF_LIST.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="origemAtivo"
                checked={form.ativo}
                onChange={(e) => setForm((f) => ({ ...f, ativo: e.target.checked }))}
                className="rounded"
              />
              <Label htmlFor="origemAtivo">Ativa</Label>
            </div>
            <p className="text-xs text-muted-foreground">
              Após criar a origem, configure as Generalidades (ICMS, Ad Valorem, GRIS etc.) na tela de detalhe.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForm(false); setEditing(null); }}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={isSaving || !form.cidade.trim()}>
              {isSaving ? <><Spinner /><span className="ml-2">Salvando...</span></> : editing ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(open) => { if (!open) setDeleting(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Origem</AlertDialogTitle>
            <AlertDialogDescription>
              Excluir <strong>{deleting?.cidade}/{deleting?.uf}</strong>? Todas as rotas, cotações e taxas serão excluídas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleting && deleteMut.mutate({ transportadoraId, id: deleting.id })}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
