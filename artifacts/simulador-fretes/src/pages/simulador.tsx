import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  useSimularFrete,
  useListTransportadoras,
  useListOrigens,
} from "@workspace/api-client-react";
import type { CenarioResultado, SimulacaoResumo } from "@workspace/api-client-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  Calculator,
  Truck,
  Clock,
  ChevronDown,
  ChevronUp,
  MapPin,
  ArrowRight,
  Trophy,
  TrendingDown,
  Download,
  BarChart3,
} from "lucide-react";
import * as XLSX from "xlsx";

type Modo = "destino" | "transportadora" | "origem";

interface FormValues {
  destino: string;
  origemId: string;
  pesoKg: string;
  valorNf: string;
  canal: string;
}

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatPct(value: number) {
  return value.toFixed(2).replace(".", ",") + "%";
}

function Spinner() {
  return (
    <div className="inline-block h-4 w-4 border-2 border-current border-r-transparent rounded-full animate-spin" />
  );
}

function BreakdownRow({ label, value }: { label: string; value: number }) {
  if (!value || value === 0) return null;
  return (
    <div className="flex justify-between text-xs text-muted-foreground">
      <span>{label}</span>
      <span className="tabular-nums">{formatBRL(value)}</span>
    </div>
  );
}

function ResumoPanel({
  resumo,
  transportadoraNome,
}: {
  resumo: SimulacaoResumo;
  transportadoraNome: string;
}) {
  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3 pt-4">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          Análise de Competitividade — {transportadoraNome}
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold tabular-nums">{resumo.totalRotas}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Rotas Simuladas</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 tabular-nums">
              {resumo.rotasGanhas}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">Melhor Preço</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-500 tabular-nums">
              {resumo.rotasPerdidas}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">Preço Maior</div>
          </div>
          <div className="text-center">
            <div
              className={`text-2xl font-bold tabular-nums ${
                resumo.percentualGanhas >= 50 ? "text-green-600" : "text-orange-500"
              }`}
            >
              {resumo.percentualGanhas.toFixed(0)}%
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">Taxa de Ganho</div>
          </div>
        </div>

        {resumo.diferencaMedia > 0 && (
          <div className="mt-3 pt-3 border-t text-xs text-muted-foreground text-center">
            Nas rotas onde perde: diferença média de{" "}
            <span className="font-semibold text-orange-500">
              {formatBRL(resumo.diferencaMedia)}
            </span>{" "}
            acima do mercado
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CenarioCard({
  cenario,
  rank,
  showComparison,
}: {
  cenario: CenarioResultado;
  rank: number;
  showComparison: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const isFirst = rank === 1;
  const ganhei = cenario.ganhei;
  const destLabel = cenario.destinoMunicipio
    ? `${cenario.destinoMunicipio}/${cenario.destinoUf}`
    : cenario.nomeRota;

  return (
    <Card
      className={`transition-all ${
        isFirst && !showComparison
          ? "border-green-500/60 bg-green-50/30 dark:bg-green-950/10"
          : showComparison && ganhei
          ? "border-green-500/40 bg-green-50/20 dark:bg-green-950/5"
          : ""
      }`}
    >
      <CardContent className="pt-4 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                isFirst && !showComparison
                  ? "bg-green-500 text-white"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {rank}
            </div>

            <div className="min-w-0">
              <div className="font-semibold text-sm text-foreground">
                {cenario.transportadora}
              </div>

              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5 flex-wrap">
                <MapPin className="h-3 w-3 flex-shrink-0" />
                <span>
                  {cenario.origemCidade}/{cenario.origemUf}
                </span>
                <ArrowRight className="h-3 w-3 flex-shrink-0" />
                <span className="font-medium text-foreground/80">{destLabel}</span>
              </div>

              <div className="flex flex-wrap gap-1.5 mt-1.5">
                <Badge variant="outline" className="text-xs px-1.5 py-0">
                  {cenario.canal}
                </Badge>
                <Badge variant="outline" className="text-xs px-1.5 py-0">
                  {cenario.metodoEnvio}
                </Badge>
                <Badge variant="outline" className="text-xs px-1.5 py-0 flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {cenario.prazoEntregaDias}d
                </Badge>
                {cenario.valorMinimoAplicado && (
                  <Badge className="text-xs px-1.5 py-0 bg-amber-100 text-amber-800 border-amber-300">
                    Mínimo aplicado
                  </Badge>
                )}
              </div>

              {showComparison && cenario.melhorMercado !== undefined && (
                <div className="mt-1.5">
                  {ganhei ? (
                    <div className="flex items-center gap-1 text-xs text-green-700 font-medium">
                      <Trophy className="h-3 w-3" />
                      <span>Melhor preço do mercado</span>
                    </div>
                  ) : cenario.melhorMercado ? (
                    <div className="flex items-center gap-1 text-xs text-orange-600">
                      <TrendingDown className="h-3 w-3" />
                      <span>
                        {formatBRL(cenario.diferencaMercado ?? 0)} acima de{" "}
                        <span className="font-medium">
                          {cenario.melhorMercado.transportadora} (
                          {cenario.melhorMercado.origemCidade}/{cenario.melhorMercado.origemUf})
                        </span>{" "}
                        — {formatBRL(cenario.melhorMercado.valorTotal)}
                      </span>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>

          <div className="text-right flex-shrink-0">
            <div
              className={`text-xl font-bold tabular-nums ${
                isFirst && !showComparison
                  ? "text-green-600 dark:text-green-400"
                  : showComparison && ganhei
                  ? "text-green-600 dark:text-green-400"
                  : "text-foreground"
              }`}
            >
              {formatBRL(cenario.valorTotal)}
            </div>
            <div className="text-xs text-muted-foreground tabular-nums">
              {formatPct(cenario.percentualNf)} do valor NF
            </div>
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5 ml-auto mt-1"
            >
              Detalhes{" "}
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          </div>
        </div>

        {expanded && (
          <div className="mt-3 pt-3 border-t space-y-1">
            <BreakdownRow
              label={cenario.tipoFrete === "percentual" ? "Frete percentual" : "Frete peso"}
              value={cenario.valorFretePeso}
            />
            <BreakdownRow label="Ad Valorem" value={cenario.valorAdValorem} />
            <BreakdownRow label="GRIS" value={cenario.valorGris} />
            <BreakdownRow label="Pedágio" value={cenario.valorPedagio} />
            <BreakdownRow label="TAS" value={cenario.valorTas} />
            <BreakdownRow
              label={`ICMS (${cenario.icmsAliquota ?? 0}%)`}
              value={cenario.valorIcms ?? 0}
            />
            <div className="flex justify-between text-sm font-semibold border-t pt-1 mt-1">
              <span>Total</span>
              <span className="tabular-nums">{formatBRL(cenario.valorTotal)}</span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground pt-0.5">
              <span>% do valor da NF</span>
              <span className="tabular-nums font-medium">
                {formatPct(cenario.percentualNf)}
              </span>
            </div>
            {showComparison && cenario.melhorMercado && !ganhei && (
              <div className="flex justify-between text-xs text-orange-600 pt-0.5">
                <span>Melhor do mercado</span>
                <span className="tabular-nums font-medium">
                  {formatBRL(cenario.melhorMercado.valorTotal)}
                </span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function exportToExcel(
  cenarios: CenarioResultado[],
  descricao: string,
  pesoKg: number,
  valorNf: number
) {
  const rows = cenarios.map((c, i) => ({
    "#": i + 1,
    Transportadora: c.transportadora,
    Origem: `${c.origemCidade}/${c.origemUf}`,
    Destino: c.destinoMunicipio ? `${c.destinoMunicipio}/${c.destinoUf}` : c.nomeRota,
    "IBGE Destino": c.ibgeDestino,
    Canal: c.canal,
    Modal: c.metodoEnvio,
    "Prazo (d)": c.prazoEntregaDias,
    "Frete Base": c.valorFretePeso,
    "Ad Valorem": c.valorAdValorem,
    GRIS: c.valorGris,
    Pedágio: c.valorPedagio,
    TAS: c.valorTas,
    ICMS: c.valorIcms ?? 0,
    "Total (R$)": c.valorTotal,
    "% NF": c.percentualNf,
    "Melhor Mercado (R$)": c.melhorMercado?.valorTotal ?? "",
    "Melhor Mercado - Transportadora": c.melhorMercado?.transportadora ?? "",
    "Diferença (R$)": c.diferencaMercado ?? "",
    "Ganhou?": c.ganhei !== undefined ? (c.ganhei ? "Sim" : "Não") : "",
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Simulação");

  const info = XLSX.utils.aoa_to_sheet([
    ["Simulação de Fretes"],
    ["Descrição", descricao],
    ["Peso (kg)", pesoKg],
    ["Valor NF (R$)", valorNf],
    ["Data", new Date().toLocaleString("pt-BR")],
    ["Total de Resultados", cenarios.length],
  ]);
  XLSX.utils.book_append_sheet(wb, info, "Parâmetros");

  XLSX.writeFile(wb, `simulacao-fretes-${Date.now()}.xlsx`);
}

export default function Simulador() {
  const [modo, setModo] = useState<Modo>("destino");
  const [transportadoraSel, setTransportadoraSel] = useState<string>("TODAS");
  const [origemSel, setOrigemSel] = useState<string>("");
  const [origemFiltroSel, setOrigemFiltroSel] = useState<string>("TODAS");

  const { register, handleSubmit, setValue, watch, resetField } = useForm<FormValues>({
    defaultValues: {
      destino: "",
      origemId: "",
      pesoKg: "",
      valorNf: "",
      canal: "TODOS",
    },
  });

  const canal = watch("canal");

  const { data: transportadorasData } = useListTransportadoras({ pageSize: 200 });
  const transportadoras = transportadorasData?.data ?? [];

  function modoRequerTransportadora(m: Modo) {
    return m === "transportadora" || m === "origem";
  }

  const transportadoraIdNumerico =
    transportadoraSel !== "TODAS" ? Number(transportadoraSel) : 0;

  const { data: origensTranspData } = useListOrigens(
    transportadoraIdNumerico,
    { pageSize: 500 },
    {
      query: {
        enabled: modo === "destino" || (modoRequerTransportadora(modo) && transportadoraIdNumerico > 0),
      },
    }
  );

  const origensTransp = origensTranspData?.data ?? [];
  const origensPicker = origensTransp;

  const { mutate, data: resultado, isPending, error } = useSimularFrete();

  const transportadoraNome =
    transportadoras.find((t) => String(t.id) === transportadoraSel)?.nome ?? "";

  const onSubmit = (values: FormValues) => {
    const base = {
      pesoKg: parseFloat(values.pesoKg.replace(",", ".")),
      valorNf: parseFloat(values.valorNf.replace(",", ".")),
      canal: values.canal === "TODOS" ? undefined : values.canal,
    };

    if (modo === "destino") {
      mutate({
        data: {
          ...base,
          modo: "destino",
          destino: values.destino.trim(),
          origemId: Number(values.origemId),
        },
      });
      return;
    }

    if (modo === "transportadora") {
      mutate({
        data: {
          ...base,
          modo: "transportadora",
          transportadoraId: Number(transportadoraSel),
          origemFiltroId:
            origemFiltroSel !== "TODAS" ? Number(origemFiltroSel) : undefined,
        },
      });
      return;
    }

    mutate({
      data: {
        ...base,
        modo: "origem",
        origemId: Number(origemSel),
      },
    });
  };

  const isFormValid = () => {
    if (modo === "destino") {
      return !!watch("origemId") && watch("destino").trim().length > 0;
    }
    if (modo === "transportadora") {
      return transportadoraSel !== "TODAS";
    }
    return transportadoraSel !== "TODAS" && !!origemSel;
  };

  const showComparison = modo === "transportadora" && !!resultado?.resumo;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          Simulador de Fretes
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Simule fretes por origem e destino, transportadora ou origem — resultados ordenados do
          mais barato ao mais caro
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Calculator className="h-4 w-4 text-primary" />
            Parâmetros de Simulação
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label>Modo de Simulação</Label>
            <div className="flex gap-2 flex-wrap">
              {[
                { value: "destino", label: "Origem x Destino" },
                { value: "transportadora", label: "Por Transportadora" },
                { value: "origem", label: "Por Origem" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setModo(opt.value as Modo);
                    setTransportadoraSel("TODAS");
                    setOrigemSel("");
                    setOrigemFiltroSel("TODAS");
                    resetField("origemId");
                  }}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    modo === opt.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-foreground border-border hover:border-primary/60"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {modo === "destino" && (
                <>
                  <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
                    <Label>Transportadora (opcional)</Label>
                    <Select
                      value={transportadoraSel}
                      onValueChange={(v) => {
                        setTransportadoraSel(v);
                        setOrigemSel("");
                        resetField("origemId");
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TODAS">Todas</SelectItem>
                        {transportadoras.map((t) => (
                          <SelectItem key={t.id} value={String(t.id)}>
                            {t.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
                    <Label>Origem</Label>
                    <Select
                      value={watch("origemId")}
                      onValueChange={(v) => {
                        setValue("origemId", v);
                        setOrigemSel(v);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {origensPicker.map((o) => (
                          <SelectItem key={o.id} value={String(o.id)}>
                            {o.cidade}/{o.uf}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5 sm:col-span-2 lg:col-span-2">
                    <Label htmlFor="destino">Destino</Label>
                    <Input
                      id="destino"
                      placeholder="Cidade, CEP ou IBGE"
                      {...register("destino")}
                    />
                    <p className="text-xs text-muted-foreground">
                      Nome da cidade, CEP (8 dígitos) ou código IBGE
                    </p>
                  </div>
                </>
              )}

              {modoRequerTransportadora(modo) && modo !== "destino" && (
                <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
                  <Label>Transportadora</Label>
                  <Select
                    value={transportadoraSel}
                    onValueChange={(v) => {
                      setTransportadoraSel(v);
                      setOrigemSel("");
                      setOrigemFiltroSel("TODAS");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {transportadoras.map((t) => (
                        <SelectItem key={t.id} value={String(t.id)}>
                          {t.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {modo === "transportadora" && transportadoraSel !== "TODAS" && (
                <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
                  <Label>Origem</Label>
                  <Select value={origemFiltroSel} onValueChange={setOrigemFiltroSel}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TODAS">Todas as origens</SelectItem>
                      {origensTransp.map((o) => (
                        <SelectItem key={o.id} value={String(o.id)}>
                          {o.cidade}/{o.uf}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {modo === "origem" && transportadoraSel !== "TODAS" && (
                <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
                  <Label>Origem</Label>
                  <Select value={origemSel} onValueChange={setOrigemSel}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a origem..." />
                    </SelectTrigger>
                    <SelectContent>
                      {origensPicker.map((o) => (
                        <SelectItem key={o.id} value={String(o.id)}>
                          {o.cidade}/{o.uf}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="pesoKg">Peso (kg)</Label>
                <Input
                  id="pesoKg"
                  placeholder="Ex: 150"
                  {...register("pesoKg", { required: true })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="valorNf">Valor da NF (R$)</Label>
                <Input
                  id="valorNf"
                  placeholder="Ex: 5000"
                  {...register("valorNf", { required: true })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="canal">Canal</Label>
                <Select value={canal} onValueChange={(v) => setValue("canal", v)}>
                  <SelectTrigger id="canal">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODOS">Todos os canais</SelectItem>
                    <SelectItem value="B2C">B2C</SelectItem>
                    <SelectItem value="ATACADO">ATACADO</SelectItem>
                    <SelectItem value="LOTAÇÃO">LOTAÇÃO</SelectItem>
                    <SelectItem value="AMBOS">Ambos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <Button
                type="submit"
                disabled={isPending || !isFormValid()}
                className="min-w-[160px]"
              >
                {isPending ? (
                  <>
                    <Spinner />
                    <span className="ml-2">Calculando...</span>
                  </>
                ) : (
                  "Simular Fretes"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-4 flex items-center gap-2 text-destructive text-sm">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>Erro ao calcular: {(error as any)?.message ?? "Erro desconhecido"}</span>
          </CardContent>
        </Card>
      )}

      {resultado && (
        <div className="space-y-4">
          {resultado.resumo && (
            <ResumoPanel resumo={resultado.resumo} transportadoraNome={transportadoraNome} />
          )}

          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-lg font-semibold">Resultados</h2>
              <p className="text-sm text-muted-foreground">
                {resultado.totalEncontrados} rota(s) —{" "}
                <span className="font-medium text-foreground">{resultado.descricao}</span> —{" "}
                {resultado.pesoKg} kg / {formatBRL(resultado.valorNf)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {resultado.cenarios.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    exportToExcel(
                      resultado.cenarios,
                      resultado.descricao,
                      resultado.pesoKg,
                      resultado.valorNf
                    )
                  }
                >
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  Exportar Excel
                </Button>
              )}
              <Badge variant="secondary" className="text-sm">
                <Truck className="h-3.5 w-3.5 mr-1" />
                {resultado.totalEncontrados} resultado(s)
              </Badge>
            </div>
          </div>

          {resultado.cenarios.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center py-12">
                <Truck className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground font-medium">Nenhuma rota encontrada.</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Verifique os parâmetros e se há rotas e cotações cadastradas.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {resultado.cenarios.map((cenario, i) => (
                <CenarioCard
                  key={`${cenario.origemId}-${cenario.rotaId}-${i}`}
                  cenario={cenario}
                  rank={i + 1}
                  showComparison={showComparison}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}