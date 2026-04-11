import { useState } from "react";
import { Link, useParams } from "wouter";
import {
  useGetOrigem,
  useUpdateOrigem,
  useListRotas,
  useCreateRota,
  useUpdateRota,
  useDeleteRota,
  useListCotacoes,
  useCreateCotacao,
  useUpdateCotacao,
  useDeleteCotacao,
  useListTaxas,
  useUpdateTaxa,
  useDeleteTaxa,
  getGetOrigemQueryKey,
  getListRotasQueryKey,
  getListCotacoesQueryKey,
  getListTaxasQueryKey,
} from "@workspace/api-client-react";
import type { Origem, Rota, Cotacao, TaxaEspecial } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Plus, Pencil, Trash2, Upload, Download, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function Spinner() {
  return <div className="inline-block h-4 w-4 border-2 border-current border-r-transparent rounded-full animate-spin" />;
}

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ── Generalidades Tab ─────────────────────────────────────────────────────────

function GeneralidadesTab({ origem, transportadoraId }: { origem: Origem; transportadoraId: number }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState({
    icms: origem.icms,
    icmsAliquota: String(origem.icmsAliquota ?? 0),
    adValorem: String(origem.adValorem),
    adValoremMinimo: String(origem.adValoremMinimo),
    pedagio: String(origem.pedagio),
    grisPercentual: String(origem.grisPercentual),
    grisMinimo: String(origem.grisMinimo),
    tas: String(origem.tas),
    ctrcEmitido: String(origem.ctrcEmitido),
    cubagem: String(origem.cubagem),
    faixaDePeso: origem.faixaDePeso,
    observacoes: origem.observacoes ?? "",
    ativo: origem.ativo,
  });

  const updateMut = useUpdateOrigem({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetOrigemQueryKey(transportadoraId, origem.id) });
        toast({ title: "Generalidades salvas." });
      },
      onError: (e: any) => toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" }),
    },
  });

  const n = (s: string) => parseFloat(s.replace(",", ".")) || 0;

  const handleSave = () => {
    updateMut.mutate({
      transportadoraId,
      id: origem.id,
      data: {
        cidade: origem.cidade,
        uf: origem.uf,
        icms: form.icms,
        icmsAliquota: n(form.icmsAliquota),
        adValorem: n(form.adValorem),
        adValoremMinimo: n(form.adValoremMinimo),
        pedagio: n(form.pedagio),
        grisPercentual: n(form.grisPercentual),
        grisMinimo: n(form.grisMinimo),
        tas: n(form.tas),
        ctrcEmitido: n(form.ctrcEmitido),
        cubagem: n(form.cubagem),
        faixaDePeso: form.faixaDePeso,
        observacoes: form.observacoes || null,
        ativo: form.ativo,
      },
    });
  };

  const f = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("arquivo", file);
    try {
      const resp = await fetch(`/api/origens/${origem.id}/importar-generalidades`, { method: "POST", body: formData });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.error ?? "Erro");
      toast({ title: json.mensagem });
      qc.invalidateQueries({ queryKey: getGetOrigemQueryKey(transportadoraId, origem.id) });
    } catch (err: any) {
      toast({ title: "Erro ao importar", description: err.message, variant: "destructive" });
    }
    e.target.value = "";
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">Taxas e generalidades aplicadas a todas as rotas desta origem</p>
        <div className="flex items-center gap-2">
          <label className="cursor-pointer">
            <Button asChild variant="outline" size="sm" className="gap-2">
              <span><Upload className="h-3.5 w-3.5" /> Importar Excel</span>
            </Button>
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label>ICMS</Label>
          <div className="flex items-center gap-2 h-10">
            <input
              type="checkbox"
              id="icms"
              checked={form.icms}
              onChange={(e) => setForm((f) => ({ ...f, icms: e.target.checked }))}
              className="rounded"
            />
            <Label htmlFor="icms" className="font-normal cursor-pointer">Incide ICMS</Label>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Alíquota ICMS % <span className="text-muted-foreground font-normal text-xs">(override)</span></Label>
          <Input
            value={form.icmsAliquota}
            onChange={f("icmsAliquota")}
            placeholder="Automático pela tabela 2026"
            disabled={!form.icms}
            className={!form.icms ? "opacity-40" : ""}
          />
          {form.icms && (
            <p className="text-xs text-muted-foreground">Deixe 0 para usar a Tabela ICMS 2026 (origem UF → destino UF automaticamente).</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label>Ad Valorem (%)</Label>
          <Input value={form.adValorem} onChange={f("adValorem")} placeholder="Ex: 0.3" />
        </div>

        <div className="space-y-1.5">
          <Label>Ad Valorem Mínimo (R$)</Label>
          <Input value={form.adValoremMinimo} onChange={f("adValoremMinimo")} placeholder="Ex: 2.50" />
        </div>

        <div className="space-y-1.5">
          <Label>Pedágio (R$/100kg)</Label>
          <Input value={form.pedagio} onChange={f("pedagio")} placeholder="Ex: 5.00" />
        </div>

        <div className="space-y-1.5">
          <Label>GRIS (%)</Label>
          <Input value={form.grisPercentual} onChange={f("grisPercentual")} placeholder="Ex: 0.2" />
        </div>

        <div className="space-y-1.5">
          <Label>GRIS Mínimo (R$)</Label>
          <Input value={form.grisMinimo} onChange={f("grisMinimo")} placeholder="Ex: 3.00" />
        </div>

        <div className="space-y-1.5">
          <Label>TAS (R$)</Label>
          <Input value={form.tas} onChange={f("tas")} placeholder="Ex: 1.50" />
        </div>

        <div className="space-y-1.5">
          <Label>CTRC Emitido (R$)</Label>
          <Input value={form.ctrcEmitido} onChange={f("ctrcEmitido")} placeholder="Ex: 0" />
        </div>

        <div className="space-y-1.5">
          <Label>Cubagem (kg/m³)</Label>
          <Input value={form.cubagem} onChange={f("cubagem")} placeholder="Ex: 300" />
        </div>

        <div className="space-y-1.5">
          <Label>Faixa de Peso</Label>
          <div className="flex items-center gap-2 h-10">
            <input
              type="checkbox"
              id="faixaDePeso"
              checked={form.faixaDePeso}
              onChange={(e) => setForm((f) => ({ ...f, faixaDePeso: e.target.checked }))}
              className="rounded"
            />
            <Label htmlFor="faixaDePeso" className="font-normal cursor-pointer">Usa faixa de peso</Label>
          </div>
        </div>

        <div className="sm:col-span-2 space-y-1.5">
          <Label>Observações</Label>
          <Input value={form.observacoes} onChange={f("observacoes")} placeholder="Observações gerais..." />
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={updateMut.isPending} className="gap-2">
          {updateMut.isPending ? <Spinner /> : <Save className="h-4 w-4" />}
          Salvar Generalidades
        </Button>
      </div>
    </div>
  );
}

// ── Rotas Tab ─────────────────────────────────────────────────────────────────

const defaultRotaForm = {
  nomeRota: "", ibgeOrigem: "", ibgeDestino: "", cepInicioFaixa: "", cepFimFaixa: "",
  canal: "AMBOS", metodoEnvio: "RODOVIARIO", prazoEntregaDias: "1", valorMinimoFrete: "0",
};

function RotasTab({ origemId }: { origemId: number }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Rota | null>(null);
  const [deleting, setDeleting] = useState<Rota | null>(null);
  const [form, setForm] = useState(defaultRotaForm);

  const { data, isLoading } = useListRotas(origemId);
  const rotas = data?.data ?? [];

  const inv = () => qc.invalidateQueries({ queryKey: getListRotasQueryKey(origemId) });

  const createMut = useCreateRota({
    mutation: {
      onSuccess: () => { inv(); toast({ title: "Rota criada." }); setShowForm(false); setForm(defaultRotaForm); },
      onError: (e: any) => toast({ title: "Erro ao criar", description: e.message, variant: "destructive" }),
    },
  });

  const updateMut = useUpdateRota({
    mutation: {
      onSuccess: () => { inv(); toast({ title: "Rota atualizada." }); setEditing(null); setShowForm(false); },
      onError: (e: any) => toast({ title: "Erro ao atualizar", description: e.message, variant: "destructive" }),
    },
  });

  const deleteMut = useDeleteRota({
    mutation: {
      onSuccess: () => { inv(); toast({ title: "Rota excluída." }); setDeleting(null); },
      onError: (e: any) => toast({ title: "Erro ao excluir", description: e.message, variant: "destructive" }),
    },
  });

  const openEdit = (r: Rota) => {
    setForm({
      nomeRota: r.nomeRota, ibgeOrigem: r.ibgeOrigem, ibgeDestino: r.ibgeDestino,
      cepInicioFaixa: r.cepInicioFaixa ?? "", cepFimFaixa: r.cepFimFaixa ?? "",
      canal: r.canal, metodoEnvio: r.metodoEnvio,
      prazoEntregaDias: String(r.prazoEntregaDias), valorMinimoFrete: String(r.valorMinimoFrete),
    });
    setEditing(r);
    setShowForm(true);
  };

  const n = (s: string) => parseFloat(s.replace(",", ".")) || 0;

  const handleSubmit = () => {
    const data = {
      nomeRota: form.nomeRota.trim(),
      ibgeOrigem: form.ibgeOrigem.trim(),
      ibgeDestino: form.ibgeDestino.trim(),
      cepInicioFaixa: form.cepInicioFaixa.trim() || null,
      cepFimFaixa: form.cepFimFaixa.trim() || null,
      canal: form.canal,
      metodoEnvio: form.metodoEnvio,
      prazoEntregaDias: parseInt(form.prazoEntregaDias) || 1,
      valorMinimoFrete: n(form.valorMinimoFrete),
    };
    if (editing) {
      updateMut.mutate({ origemId, id: editing.id, data });
    } else {
      createMut.mutate({ origemId, data });
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("arquivo", file);
    try {
      const resp = await fetch(`/api/origens/${origemId}/importar-rotas`, { method: "POST", body: formData });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.error ?? "Erro");
      const detalhes = json.detalhes?.join("; ") ?? "";
      toast({
        title: json.mensagem,
        description: detalhes || undefined,
        variant: (json.importados ?? 0) > 0 ? "default" : "destructive",
      });
      if ((json.importados ?? 0) > 0) inv();
    } catch (err: any) {
      toast({ title: "Erro ao importar", description: err.message, variant: "destructive" });
    }
    e.target.value = "";
  };

  const isSaving = createMut.isPending || updateMut.isPending;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{data?.total ?? 0} rota(s) cadastrada(s)</p>
        <div className="flex gap-2">
          <a href={`/api/origens/${origemId}/exportar-rotas`} download>
            <Button variant="outline" size="sm" className="gap-2"><Download className="h-3.5 w-3.5" /> Exportar</Button>
          </a>
          <a href={`/api/origens/${origemId}/modelo-rotas`} download title="Baixar planilha modelo para preencher e importar">
            <Button variant="outline" size="sm" className="gap-2"><Download className="h-3.5 w-3.5" /> Modelo</Button>
          </a>
          <label className="cursor-pointer">
            <Button asChild variant="outline" size="sm" className="gap-2">
              <span><Upload className="h-3.5 w-3.5" /> Importar</span>
            </Button>
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
          </label>
          <Button size="sm" className="gap-2" onClick={() => { setForm(defaultRotaForm); setEditing(null); setShowForm(true); }}>
            <Plus className="h-3.5 w-3.5" /> Nova Rota
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground gap-2"><Spinner /> Carregando...</div>
      ) : rotas.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground text-sm">Nenhuma rota cadastrada. Importe ou crie manualmente.</div>
      ) : (
        <div className="overflow-auto rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-xs text-muted-foreground">
                <th className="px-3 py-2 text-left font-semibold">Nome da Rota</th>
                <th className="px-3 py-2 text-left font-semibold">IBGE Origem</th>
                <th className="px-3 py-2 text-left font-semibold">IBGE Destino</th>
                <th className="px-3 py-2 text-left font-semibold">Canal</th>
                <th className="px-3 py-2 text-right font-semibold">Prazo</th>
                <th className="px-3 py-2 text-right font-semibold">Mínimo</th>
                <th className="px-3 py-2 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {rotas.map((r) => (
                <tr key={r.id} className="border-b hover:bg-muted/30 transition-colors">
                  <td className="px-3 py-2 font-medium">{r.nomeRota}</td>
                  <td className="px-3 py-2 text-muted-foreground">{r.ibgeOrigem}</td>
                  <td className="px-3 py-2 text-muted-foreground">{r.ibgeDestino}</td>
                  <td className="px-3 py-2"><Badge variant="outline" className="text-xs">{r.canal}</Badge></td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.prazoEntregaDias}d</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.valorMinimoFrete > 0 ? formatBRL(r.valorMinimoFrete) : "—"}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(r)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleting(r)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={showForm} onOpenChange={(open) => { if (!open) { setShowForm(false); setEditing(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Editar Rota" : "Nova Rota"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="col-span-2 space-y-1.5">
              <Label>Nome da Rota</Label>
              <Input value={form.nomeRota} onChange={(e) => setForm((f) => ({ ...f, nomeRota: e.target.value }))} placeholder="Ex: SP - RJ" autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label>IBGE Origem</Label>
              <Input value={form.ibgeOrigem} onChange={(e) => setForm((f) => ({ ...f, ibgeOrigem: e.target.value }))} placeholder="3550308" />
            </div>
            <div className="space-y-1.5">
              <Label>IBGE Destino</Label>
              <Input value={form.ibgeDestino} onChange={(e) => setForm((f) => ({ ...f, ibgeDestino: e.target.value }))} placeholder="3304557" />
            </div>
            <div className="space-y-1.5">
              <Label>CEP Início</Label>
              <Input value={form.cepInicioFaixa} onChange={(e) => setForm((f) => ({ ...f, cepInicioFaixa: e.target.value }))} placeholder="01000000" />
            </div>
            <div className="space-y-1.5">
              <Label>CEP Fim</Label>
              <Input value={form.cepFimFaixa} onChange={(e) => setForm((f) => ({ ...f, cepFimFaixa: e.target.value }))} placeholder="01999999" />
            </div>
            <div className="space-y-1.5">
              <Label>Canal</Label>
              <select
                value={form.canal}
                onChange={(e) => setForm((f) => ({ ...f, canal: e.target.value }))}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="AMBOS">Ambos</option>
                <option value="B2B">B2B</option>
                <option value="B2C">B2C</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Método de Envio</Label>
              <select
                value={form.metodoEnvio}
                onChange={(e) => setForm((f) => ({ ...f, metodoEnvio: e.target.value }))}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="RODOVIARIO">Rodoviário</option>
                <option value="AEREO">Aéreo</option>
                <option value="MARITIMO">Marítimo</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Prazo (dias)</Label>
              <Input value={form.prazoEntregaDias} onChange={(e) => setForm((f) => ({ ...f, prazoEntregaDias: e.target.value }))} placeholder="1" />
            </div>
            <div className="space-y-1.5">
              <Label>Frete Mínimo (R$)</Label>
              <Input value={form.valorMinimoFrete} onChange={(e) => setForm((f) => ({ ...f, valorMinimoFrete: e.target.value }))} placeholder="0" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForm(false); setEditing(null); }}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={isSaving || !form.nomeRota.trim()}>
              {isSaving ? <><Spinner /><span className="ml-2">Salvando...</span></> : editing ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(open) => { if (!open) setDeleting(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Rota</AlertDialogTitle>
            <AlertDialogDescription>Excluir a rota <strong>{deleting?.nomeRota}</strong>? As cotações associadas também serão excluídas.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => deleting && deleteMut.mutate({ origemId, id: deleting.id })}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Cotações Tab ──────────────────────────────────────────────────────────────

const defaultCotacaoForm = {
  rotaId: "", pesoMinimoKg: "0", pesoMaximoKg: "999999", valorKg: "0", valorFixo: "0", excessoKg: "0", percentualFrete: "0",
};

function CotacoesTab({ origemId }: { origemId: number }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Cotacao | null>(null);
  const [deleting, setDeleting] = useState<Cotacao | null>(null);
  const [form, setForm] = useState(defaultCotacaoForm);

  const { data, isLoading } = useListCotacoes(origemId);
  const cotacoes = data?.data ?? [];
  const { data: rotasData } = useListRotas(origemId);
  const rotas = rotasData?.data ?? [];

  const inv = () => qc.invalidateQueries({ queryKey: getListCotacoesQueryKey(origemId) });

  const createMut = useCreateCotacao({
    mutation: {
      onSuccess: () => { inv(); toast({ title: "Cotação criada." }); setShowForm(false); setForm(defaultCotacaoForm); },
      onError: (e: any) => toast({ title: "Erro ao criar", description: e.message, variant: "destructive" }),
    },
  });

  const updateMut = useUpdateCotacao({
    mutation: {
      onSuccess: () => { inv(); toast({ title: "Cotação atualizada." }); setEditing(null); setShowForm(false); },
      onError: (e: any) => toast({ title: "Erro ao atualizar", description: e.message, variant: "destructive" }),
    },
  });

  const deleteMut = useDeleteCotacao({
    mutation: {
      onSuccess: () => { inv(); toast({ title: "Cotação excluída." }); setDeleting(null); },
      onError: (e: any) => toast({ title: "Erro ao excluir", description: e.message, variant: "destructive" }),
    },
  });

  const openEdit = (c: Cotacao) => {
    setForm({
      rotaId: String(c.rotaId), pesoMinimoKg: String(c.pesoMinimoKg), pesoMaximoKg: String(c.pesoMaximoKg),
      valorKg: String(c.valorKg), valorFixo: String(c.valorFixo), excessoKg: String(c.excessoKg),
      percentualFrete: String(c.percentualFrete),
    });
    setEditing(c);
    setShowForm(true);
  };

  const n = (s: string) => parseFloat(s.replace(",", ".")) || 0;

  const handleSubmit = () => {
    const data = {
      rotaId: parseInt(form.rotaId) || 0,
      pesoMinimoKg: n(form.pesoMinimoKg),
      pesoMaximoKg: n(form.pesoMaximoKg),
      valorKg: n(form.valorKg),
      valorFixo: n(form.valorFixo),
      excessoKg: n(form.excessoKg),
      percentualFrete: n(form.percentualFrete),
    };
    if (editing) {
      updateMut.mutate({ origemId, id: editing.id, data });
    } else {
      createMut.mutate({ origemId, data });
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("arquivo", file);
    try {
      const resp = await fetch(`/api/origens/${origemId}/importar-fretes`, { method: "POST", body: formData });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.error ?? "Erro");
      const detalhes = json.detalhes?.slice(0, 3).join(" | ") ?? "";
      toast({
        title: json.mensagem,
        description: detalhes || undefined,
        variant: (json.importados ?? 0) > 0 ? "default" : "destructive",
      });
      if ((json.importados ?? 0) > 0) inv();
    } catch (err: any) {
      toast({ title: "Erro ao importar", description: err.message, variant: "destructive" });
    }
    e.target.value = "";
  };

  const isSaving = createMut.isPending || updateMut.isPending;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{data?.total ?? 0} cotação(ões) cadastrada(s)</p>
        <div className="flex gap-2">
          <a href={`/api/origens/${origemId}/exportar-fretes`} download>
            <Button variant="outline" size="sm" className="gap-2"><Download className="h-3.5 w-3.5" /> Exportar</Button>
          </a>
          <a href={`/api/origens/${origemId}/modelo-fretes`} download title="Baixar planilha modelo com as rotas desta origem para preencher e importar">
            <Button variant="outline" size="sm" className="gap-2"><Download className="h-3.5 w-3.5" /> Modelo</Button>
          </a>
          <label className="cursor-pointer">
            <Button asChild variant="outline" size="sm" className="gap-2">
              <span><Upload className="h-3.5 w-3.5" /> Importar</span>
            </Button>
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
          </label>
          <Button size="sm" className="gap-2" onClick={() => { setForm(defaultCotacaoForm); setEditing(null); setShowForm(true); }}>
            <Plus className="h-3.5 w-3.5" /> Nova Cotação
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground gap-2"><Spinner /> Carregando...</div>
      ) : cotacoes.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground text-sm">Nenhuma cotação cadastrada. Importe ou crie manualmente.</div>
      ) : (
        <div className="overflow-auto rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-xs text-muted-foreground">
                <th className="px-3 py-2 text-left font-semibold">Rota</th>
                <th className="px-3 py-2 text-right font-semibold">Peso Mín (kg)</th>
                <th className="px-3 py-2 text-right font-semibold">Peso Máx (kg)</th>
                <th className="px-3 py-2 text-right font-semibold">R$/kg</th>
                <th className="px-3 py-2 text-right font-semibold">Excesso</th>
                <th className="px-3 py-2 text-right font-semibold">% Frete</th>
                <th className="px-3 py-2 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {cotacoes.map((c) => (
                <tr key={c.id} className="border-b hover:bg-muted/30 transition-colors">
                  <td className="px-3 py-2 font-medium">{c.nomeRota ?? `Rota #${c.rotaId}`}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{c.pesoMinimoKg.toLocaleString("pt-BR")}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{c.pesoMaximoKg.toLocaleString("pt-BR")}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{c.valorKg > 0 ? formatBRL(c.valorKg) : "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{c.excessoKg > 0 ? formatBRL(c.excessoKg) : "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{c.percentualFrete > 0 ? `${c.percentualFrete}%` : "—"}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleting(c)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={showForm} onOpenChange={(open) => { if (!open) { setShowForm(false); setEditing(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Editar Cotação" : "Nova Cotação"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="col-span-2 space-y-1.5">
              <Label>Rota</Label>
              <select
                value={form.rotaId}
                onChange={(e) => setForm((f) => ({ ...f, rotaId: e.target.value }))}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Selecione uma rota...</option>
                {rotas.map((r) => <option key={r.id} value={r.id}>{r.nomeRota}</option>)}
              </select>
            </div>
            {([
              ["pesoMinimoKg", "Peso Mínimo (kg)"],
              ["pesoMaximoKg", "Peso Máximo (kg)"],
              ["valorKg", "Valor por kg (R$)"],
              ["valorFixo", "Valor Fixo (R$)"],
              ["excessoKg", "Excesso por kg (R$)"],
              ["percentualFrete", "% Frete sobre NF"],
            ] as const).map(([key, label]) => (
              <div key={key} className="space-y-1.5">
                <Label>{label}</Label>
                <Input
                  value={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  placeholder="0"
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForm(false); setEditing(null); }}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={isSaving || !form.rotaId}>
              {isSaving ? <><Spinner /><span className="ml-2">Salvando...</span></> : editing ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(open) => { if (!open) setDeleting(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Cotação</AlertDialogTitle>
            <AlertDialogDescription>Excluir esta faixa de cotação para a rota <strong>{deleting?.nomeRota}</strong>?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => deleting && deleteMut.mutate({ origemId, id: deleting.id })}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Taxas Especiais Tab ───────────────────────────────────────────────────────

const defaultTaxaForm = { ibgesTexto: "", tda: "0", trt: "0", suframa: "0", outras: "0", grisPercentual: "", adValorem: "" };
const defaultTaxaEditForm = { ibgeDestino: "", tda: "0", trt: "0", suframa: "0", outras: "0", grisPercentual: "", adValorem: "" };

function TaxasTab({ origemId }: { origemId: number }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<TaxaEspecial | null>(null);
  const [deleting, setDeleting] = useState<TaxaEspecial | null>(null);
  const [deletingAll, setDeletingAll] = useState(false);
  const [form, setForm] = useState(defaultTaxaForm);
  const [editForm, setEditForm] = useState(defaultTaxaEditForm);
  const [importando, setImportando] = useState(false);
  const importRef = useState(() => { if (typeof document !== "undefined") { const i = document.createElement("input"); i.type = "file"; i.accept = ".xlsx,.xls"; return i; } return null; })[0];

  const { data, isLoading } = useListTaxas(origemId);
  const taxas = data?.data ?? [];

  const inv = () => qc.invalidateQueries({ queryKey: getListTaxasQueryKey(origemId) });

  const updateMut = useUpdateTaxa({
    mutation: {
      onSuccess: () => { inv(); toast({ title: "Taxa atualizada." }); setEditing(null); },
      onError: (e: any) => toast({ title: "Erro ao atualizar", description: e.message, variant: "destructive" }),
    },
  });

  const deleteMut = useDeleteTaxa({
    mutation: {
      onSuccess: () => { inv(); toast({ title: "Taxa excluída." }); setDeleting(null); },
      onError: (e: any) => toast({ title: "Erro ao excluir", description: e.message, variant: "destructive" }),
    },
  });

  const handleDeleteAll = async () => {
    try {
      const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, "");
      const resp = await fetch(`${baseUrl}/api/origens/${origemId}/taxas`, { method: "DELETE" });
      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error ?? "Erro");
      inv();
      setDeletingAll(false);
      toast({ title: "Taxas excluídas", description: `${result.excluidos} registro(s) removido(s).` });
    } catch (e: any) {
      toast({ title: "Erro ao excluir", description: e.message, variant: "destructive" });
    }
  };

  const openEdit = (t: TaxaEspecial) => {
    setEditForm({
      ibgeDestino: t.ibgeDestino,
      tda: String(t.tda), trt: String(t.trt),
      suframa: String(t.suframa), outras: String(t.outras),
      grisPercentual: t.grisPercentual != null ? String(t.grisPercentual) : "",
      adValorem: t.adValorem != null ? String(t.adValorem) : "",
    });
    setEditing(t);
  };

  const n = (s: string) => parseFloat(s.replace(",", ".")) || 0;

  const handleBulkSubmit = async () => {
    const ibges = form.ibgesTexto
      .split(/[\n,;]+/)
      .map(s => s.trim())
      .filter(Boolean);
    if (ibges.length === 0) return;
    try {
      const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, "");
      const resp = await fetch(`${baseUrl}/api/origens/${origemId}/taxas/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
        ibges,
        tda: n(form.tda), trt: n(form.trt), suframa: n(form.suframa), outras: n(form.outras),
        grisPercentual: form.grisPercentual.trim() !== "" ? n(form.grisPercentual) : null,
        adValorem: form.adValorem.trim() !== "" ? n(form.adValorem) : null,
      }),
      });
      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error ?? "Erro");
      inv();
      setShowForm(false);
      setForm(defaultTaxaForm);
      const msg = [`${result.inseridos} IBGE(s) adicionado(s).`];
      if (result.duplicados?.length > 0) msg.push(`${result.duplicados.length} já existiam e foram ignorados.`);
      if (result.ibgesInvalidos > 0) msg.push(`${result.ibgesInvalidos} inválido(s) ignorado(s).`);
      toast({ title: "Taxas cadastradas", description: msg.join(" ") });
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    }
  };

  const handleEditSubmit = () => {
    if (!editing) return;
    updateMut.mutate({
      origemId, id: editing.id,
      data: {
        ibgeDestino: editForm.ibgeDestino,
        tda: n(editForm.tda), trt: n(editForm.trt),
        suframa: n(editForm.suframa), outras: n(editForm.outras),
        grisPercentual: editForm.grisPercentual.trim() !== "" ? n(editForm.grisPercentual) : null,
        adValorem: editForm.adValorem.trim() !== "" ? n(editForm.adValorem) : null,
      },
    });
  };

  const handleImportar = () => {
    if (!importRef) return;
    importRef.onchange = async () => {
      const file = importRef.files?.[0];
      if (!file) return;
      setImportando(true);
      try {
        const fd = new FormData();
        fd.append("arquivo", file);
        const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, "");
        const resp = await fetch(`${baseUrl}/api/origens/${origemId}/taxas/importar`, { method: "POST", body: fd });
        const result = await resp.json();
        if (!resp.ok) throw new Error(result.error ?? "Erro");
        inv();
        const msg = [`${result.inseridos} inserido(s), ${result.atualizados} atualizado(s).`];
        if (result.erros?.length > 0) msg.push(`${result.erros.length} linha(s) com erro.`);
        toast({ title: "Importação concluída", description: msg.join(" ") });
      } catch (e: any) {
        toast({ title: "Erro na importação", description: e.message, variant: "destructive" });
      } finally {
        setImportando(false);
        importRef.value = "";
      }
    };
    importRef.click();
  };

  const handleExportar = () => {
    const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, "");
    window.open(`${baseUrl}/api/origens/${origemId}/taxas/exportar`, "_blank");
  };

  const ibgesCount = form.ibgesTexto.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{data?.total ?? 0} IBGE(s) cadastrado(s)</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExportar} disabled={taxas.length === 0}>
            <Download className="h-3.5 w-3.5" /> Exportar
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" asChild>
            <a href={`${import.meta.env.BASE_URL}modelo-taxas-especiais.xlsx`} download>
              <Download className="h-3.5 w-3.5" /> Baixar Modelo
            </a>
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleImportar} disabled={importando}>
            {importando ? <><Spinner /><span className="ml-1">Importando...</span></> : <><Upload className="h-3.5 w-3.5" /> Importar Excel</>}
          </Button>
          <Button
            variant="outline" size="sm"
            className="gap-1.5 border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground"
            onClick={() => setDeletingAll(true)}
            disabled={taxas.length === 0}
          >
            <Trash2 className="h-3.5 w-3.5" /> Excluir Todas
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => { setForm(defaultTaxaForm); setShowForm(true); }}>
            <Plus className="h-3.5 w-3.5" /> Adicionar IBGEs
          </Button>
        </div>
      </div>

      <div className="rounded-md border border-dashed border-muted-foreground/30 bg-muted/20 p-3">
        <p className="text-xs text-muted-foreground">
          <strong>Importar Excel:</strong> A = IBGE | B = TDA | C = TRT | D = SUFRAMA | E = Outras | F = GRIS (%) | G = Ad Valorem (%).
          Deixe vazio para usar o valor das Generalidades. IBGEs existentes são atualizados.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground gap-2"><Spinner /> Carregando...</div>
      ) : taxas.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground text-sm">Nenhuma taxa especial cadastrada. Use "Adicionar IBGEs" para inserir manualmente ou "Importar Excel" para enviar em massa.</div>
      ) : (
        <div className="overflow-auto rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-xs text-muted-foreground">
                <th className="px-3 py-2 text-left font-semibold">IBGE Destino</th>
                <th className="px-3 py-2 text-right font-semibold">TDA (R$)</th>
                <th className="px-3 py-2 text-right font-semibold">TRT (R$)</th>
                <th className="px-3 py-2 text-right font-semibold">SUFRAMA (R$)</th>
                <th className="px-3 py-2 text-right font-semibold">Outras (R$)</th>
                <th className="px-3 py-2 text-right font-semibold">GRIS (%)</th>
                <th className="px-3 py-2 text-right font-semibold">Ad Val (%)</th>
                <th className="px-3 py-2 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {taxas.map((t) => (
                <tr key={t.id} className="border-b hover:bg-muted/30 transition-colors">
                  <td className="px-3 py-2 font-medium">{t.ibgeDestino}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{t.tda > 0 ? formatBRL(t.tda) : "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{t.trt > 0 ? formatBRL(t.trt) : "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{t.suframa > 0 ? formatBRL(t.suframa) : "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{t.outras > 0 ? formatBRL(t.outras) : "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {t.grisPercentual != null ? <span className="text-amber-600 font-medium">{t.grisPercentual}%</span> : <span className="text-muted-foreground text-xs">geral</span>}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {t.adValorem != null ? <span className="text-amber-600 font-medium">{t.adValorem}%</span> : <span className="text-muted-foreground text-xs">geral</span>}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(t)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleting(t)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modal: Adicionar IBGEs em lote ── */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) setShowForm(false); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Adicionar IBGEs</DialogTitle>
            <p className="text-sm text-muted-foreground pt-1">Cole ou digite os IBGEs (um por linha ou separados por vírgula). Os valores de taxa serão aplicados a todos.</p>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>IBGEs dos Destinos</Label>
              <textarea
                className="w-full min-h-[140px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
                placeholder={"1302603\n3550308\n2927408\n..."}
                value={form.ibgesTexto}
                onChange={(e) => setForm((f) => ({ ...f, ibgesTexto: e.target.value }))}
                autoFocus
              />
              {ibgesCount > 0 && (
                <p className="text-xs text-muted-foreground">{ibgesCount} IBGE(s) detectado(s)</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {([["tda", "TDA (R$)"], ["trt", "TRT (R$)"], ["suframa", "SUFRAMA (R$)"], ["outras", "Outras Taxas (R$)"]] as const).map(([key, label]) => (
                <div key={key} className="space-y-1.5">
                  <Label>{label}</Label>
                  <Input value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} placeholder="0" />
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground pt-1">Overrides por IBGE (deixe vazio para usar as Generalidades da origem):</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>GRIS Override (%)</Label>
                <Input value={form.grisPercentual} onChange={(e) => setForm((f) => ({ ...f, grisPercentual: e.target.value }))} placeholder="vazio = Generalidades" />
              </div>
              <div className="space-y-1.5">
                <Label>Ad Valorem Override (%)</Label>
                <Input value={form.adValorem} onChange={(e) => setForm((f) => ({ ...f, adValorem: e.target.value }))} placeholder="vazio = Generalidades" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={handleBulkSubmit} disabled={ibgesCount === 0}>
              Adicionar {ibgesCount > 0 ? `${ibgesCount} IBGE(s)` : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Modal: Editar taxa individual ── */}
      <Dialog open={!!editing} onOpenChange={(open) => { if (!open) setEditing(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Taxa — IBGE {editing?.ibgeDestino}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              {([["tda", "TDA (R$)"], ["trt", "TRT (R$)"], ["suframa", "SUFRAMA (R$)"], ["outras", "Outras Taxas (R$)"]] as const).map(([key, label]) => (
                <div key={key} className="space-y-1.5">
                  <Label>{label}</Label>
                  <Input value={editForm[key]} onChange={(e) => setEditForm((f) => ({ ...f, [key]: e.target.value }))} placeholder="0" />
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Overrides (deixe vazio para usar as Generalidades da origem):</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>GRIS Override (%)</Label>
                <Input value={editForm.grisPercentual} onChange={(e) => setEditForm((f) => ({ ...f, grisPercentual: e.target.value }))} placeholder="vazio = Generalidades" />
              </div>
              <div className="space-y-1.5">
                <Label>Ad Valorem Override (%)</Label>
                <Input value={editForm.adValorem} onChange={(e) => setEditForm((f) => ({ ...f, adValorem: e.target.value }))} placeholder="vazio = Generalidades" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={handleEditSubmit} disabled={updateMut.isPending}>
              {updateMut.isPending ? <><Spinner /><span className="ml-2">Salvando...</span></> : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(open) => { if (!open) setDeleting(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Taxa</AlertDialogTitle>
            <AlertDialogDescription>Excluir a taxa especial para o IBGE <strong>{deleting?.ibgeDestino}</strong>?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => deleting && deleteMut.mutate({ origemId, id: deleting.id })}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deletingAll} onOpenChange={(open) => { if (!open) setDeletingAll(false); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Todas as Taxas</AlertDialogTitle>
            <AlertDialogDescription>
              Isso vai remover <strong>todos os {data?.total ?? taxas.length} IBGE(s)</strong> cadastrados nesta origem. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={handleDeleteAll}>
              Excluir Todas
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function OrigemDetail() {
  const { transportadoraId, origemId } = useParams();
  const tId = parseInt(transportadoraId!, 10);
  const oId = parseInt(origemId!, 10);

  const { data: origem, isLoading } = useGetOrigem(tId, oId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
        <Spinner /> Carregando...
      </div>
    );
  }

  if (!origem) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Origem não encontrada.</p>
        <Button asChild variant="link" className="mt-2">
          <Link href={`/transportadoras/${tId}`}>Voltar</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="gap-1 -ml-2 mb-3 text-muted-foreground">
          <Link href={`/transportadoras/${tId}`}><ArrowLeft className="h-4 w-4" /> {origem.transportadoraNome}</Link>
        </Button>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              {origem.cidade} — {origem.uf}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {origem.transportadoraNome} &middot; {origem.canal && <strong className="text-foreground">{origem.canal}</strong>}{origem.canal && " · "}{origem.totalRotas} rota(s)
              {origem.icms && " · ICMS"}
              {origem.adValorem > 0 && ` · Ad Val ${origem.adValorem}%`}
              {origem.grisPercentual > 0 && ` · GRIS ${origem.grisPercentual}%`}
            </p>
          </div>
          <Badge variant={origem.ativo ? "default" : "secondary"}>{origem.ativo ? "Ativa" : "Inativa"}</Badge>
        </div>
      </div>

      <Tabs defaultValue="generalidades">
        <TabsList className="mb-4">
          <TabsTrigger value="generalidades">Generalidades</TabsTrigger>
          <TabsTrigger value="rotas">Rotas</TabsTrigger>
          <TabsTrigger value="cotacoes">Cotações</TabsTrigger>
          <TabsTrigger value="taxas">Taxas Especiais</TabsTrigger>
        </TabsList>

        <TabsContent value="generalidades">
          <Card>
            <CardContent className="pt-6">
              <GeneralidadesTab origem={origem} transportadoraId={tId} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rotas">
          <Card>
            <CardContent className="pt-6">
              <RotasTab origemId={oId} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cotacoes">
          <Card>
            <CardContent className="pt-6">
              <CotacoesTab origemId={oId} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="taxas">
          <Card>
            <CardContent className="pt-6">
              <TaxasTab origemId={oId} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
