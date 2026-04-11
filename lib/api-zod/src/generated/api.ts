import * as zod from "zod";

export const HealthCheckResponse = zod.object({ status: zod.string() });

// ── Transportadoras ──────────────────────────────────────────────────────────

export const ListTransportadorasQueryParams = zod.object({
  search: zod.coerce.string().optional(),
  page: zod.coerce.number().optional(),
  pageSize: zod.coerce.number().optional(),
});

const TransportadoraItem = zod.object({
  id: zod.number(),
  nome: zod.string(),
  ativo: zod.boolean(),
  totalOrigens: zod.number(),
  criadoEm: zod.string(),
  atualizadoEm: zod.string(),
});

export const ListTransportadorasResponse = zod.object({
  data: zod.array(TransportadoraItem),
  total: zod.number(),
  page: zod.number(),
  pageSize: zod.number(),
});

export const CreateTransportadoraBody = zod.object({
  nome: zod.string(),
  ativo: zod.boolean().optional(),
});

export const GetTransportadoraParams = zod.object({ id: zod.coerce.number() });
export const GetTransportadoraResponse = TransportadoraItem;

export const UpdateTransportadoraParams = zod.object({ id: zod.coerce.number() });
export const UpdateTransportadoraBody = zod.object({
  nome: zod.string(),
  ativo: zod.boolean().optional(),
});
export const UpdateTransportadoraResponse = TransportadoraItem;
export const DeleteTransportadoraParams = zod.object({ id: zod.coerce.number() });

// ── Origens ───────────────────────────────────────────────────────────────────

export const ListOrigensParams = zod.object({ transportadoraId: zod.coerce.number() });
export const ListOrigensQueryParams = zod.object({
  search: zod.coerce.string().optional(),
  page: zod.coerce.number().optional(),
  pageSize: zod.coerce.number().optional(),
});

const OrigemItem = zod.object({
  id: zod.number(),
  transportadoraId: zod.number(),
  transportadoraNome: zod.string().nullish(),
  canal: zod.string(),
  cidade: zod.string(),
  uf: zod.string(),
  icms: zod.boolean(),
  icmsAliquota: zod.number(),
  adValorem: zod.number(),
  adValoremMinimo: zod.number(),
  pedagio: zod.number(),
  grisPercentual: zod.number(),
  grisMinimo: zod.number(),
  tas: zod.number(),
  ctrcEmitido: zod.number(),
  cubagem: zod.number(),
  faixaDePeso: zod.boolean(),
  observacoes: zod.string().nullish(),
  ativo: zod.boolean(),
  totalRotas: zod.number(),
  criadoEm: zod.string(),
  atualizadoEm: zod.string(),
});

export const ListOrigensResponse = zod.object({
  data: zod.array(OrigemItem),
  total: zod.number(),
  page: zod.number(),
  pageSize: zod.number(),
});

export const CreateOrigemParams = zod.object({ transportadoraId: zod.coerce.number() });
export const CreateOrigemBody = zod.object({
  canal: zod.string().optional(),
  cidade: zod.string(),
  uf: zod.string().optional(),
  icms: zod.boolean().optional(),
  icmsAliquota: zod.number().optional(),
  adValorem: zod.number().optional(),
  adValoremMinimo: zod.number().optional(),
  pedagio: zod.number().optional(),
  grisPercentual: zod.number().optional(),
  grisMinimo: zod.number().optional(),
  tas: zod.number().optional(),
  ctrcEmitido: zod.number().optional(),
  cubagem: zod.number().optional(),
  faixaDePeso: zod.boolean().optional(),
  observacoes: zod.string().nullish(),
  ativo: zod.boolean().optional(),
});

export const GetOrigemParams = zod.object({
  transportadoraId: zod.coerce.number(),
  id: zod.coerce.number(),
});
export const GetOrigemResponse = OrigemItem;

export const UpdateOrigemParams = zod.object({
  transportadoraId: zod.coerce.number(),
  id: zod.coerce.number(),
});
export const UpdateOrigemBody = CreateOrigemBody;
export const UpdateOrigemResponse = OrigemItem;

export const DeleteOrigemParams = zod.object({
  transportadoraId: zod.coerce.number(),
  id: zod.coerce.number(),
});

// ── Rotas ─────────────────────────────────────────────────────────────────────

export const ListRotasParams = zod.object({ origemId: zod.coerce.number() });
export const ListRotasQueryParams = zod.object({
  search: zod.coerce.string().optional(),
  canal: zod.coerce.string().optional(),
  page: zod.coerce.number().optional(),
  pageSize: zod.coerce.number().optional(),
});

const RotaItem = zod.object({
  id: zod.number(),
  origemId: zod.number(),
  nomeRota: zod.string(),
  ibgeOrigem: zod.string(),
  ibgeDestino: zod.string(),
  cepInicioFaixa: zod.string().nullish(),
  cepFimFaixa: zod.string().nullish(),
  canal: zod.string(),
  metodoEnvio: zod.string(),
  prazoEntregaDias: zod.number(),
  valorMinimoFrete: zod.number(),
  ativo: zod.boolean(),
  criadoEm: zod.string(),
  atualizadoEm: zod.string(),
});

export const ListRotasResponse = zod.object({
  data: zod.array(RotaItem),
  total: zod.number(),
  page: zod.number(),
  pageSize: zod.number(),
});

export const CreateRotaParams = zod.object({ origemId: zod.coerce.number() });
export const CreateRotaBody = zod.object({
  nomeRota: zod.string(),
  ibgeOrigem: zod.string(),
  ibgeDestino: zod.string(),
  cepInicioFaixa: zod.string().nullish(),
  cepFimFaixa: zod.string().nullish(),
  canal: zod.string().optional(),
  metodoEnvio: zod.string().optional(),
  prazoEntregaDias: zod.number(),
  valorMinimoFrete: zod.number(),
  ativo: zod.boolean().optional(),
});
export const CreateRotaResponse = RotaItem;

export const UpdateRotaParams = zod.object({
  origemId: zod.coerce.number(),
  id: zod.coerce.number(),
});
export const UpdateRotaBody = CreateRotaBody;
export const UpdateRotaResponse = RotaItem;

export const DeleteRotaParams = zod.object({
  origemId: zod.coerce.number(),
  id: zod.coerce.number(),
});

// ── Cotações ──────────────────────────────────────────────────────────────────

export const ListCotacoesParams = zod.object({ origemId: zod.coerce.number() });
export const ListCotacoesQueryParams = zod.object({
  search: zod.coerce.string().optional(),
  rotaId: zod.coerce.number().optional(),
  page: zod.coerce.number().optional(),
  pageSize: zod.coerce.number().optional(),
});

const CotacaoItem = zod.object({
  id: zod.number(),
  origemId: zod.number(),
  rotaId: zod.number(),
  nomeRota: zod.string().nullish(),
  pesoMinimoKg: zod.number(),
  pesoMaximoKg: zod.number(),
  valorKg: zod.number(),
  valorFixo: zod.number(),
  excessoKg: zod.number(),
  percentualFrete: zod.number(),
  ativo: zod.boolean(),
  criadoEm: zod.string(),
  atualizadoEm: zod.string(),
});

export const ListCotacoesResponse = zod.object({
  data: zod.array(CotacaoItem),
  total: zod.number(),
  page: zod.number(),
  pageSize: zod.number(),
});

export const CreateCotacaoParams = zod.object({ origemId: zod.coerce.number() });
export const CreateCotacaoBody = zod.object({
  rotaId: zod.number(),
  pesoMinimoKg: zod.number(),
  pesoMaximoKg: zod.number(),
  valorKg: zod.number(),
  valorFixo: zod.number(),
  excessoKg: zod.number().optional(),
  percentualFrete: zod.number(),
  ativo: zod.boolean().optional(),
});
export const CreateCotacaoResponse = CotacaoItem;

export const UpdateCotacaoParams = zod.object({
  origemId: zod.coerce.number(),
  id: zod.coerce.number(),
});
export const UpdateCotacaoBody = CreateCotacaoBody;
export const UpdateCotacaoResponse = CotacaoItem;

export const DeleteCotacaoParams = zod.object({
  origemId: zod.coerce.number(),
  id: zod.coerce.number(),
});

// ── Taxas Especiais ───────────────────────────────────────────────────────────

export const ListTaxasParams = zod.object({ origemId: zod.coerce.number() });
export const ListTaxasQueryParams = zod.object({
  page: zod.coerce.number().optional(),
  pageSize: zod.coerce.number().optional(),
});

const TaxaEspecialItem = zod.object({
  id: zod.number(),
  origemId: zod.number(),
  ibgeDestino: zod.string(),
  trt: zod.number(),
  tda: zod.number(),
  suframa: zod.number(),
  outras: zod.number(),
  grisPercentual: zod.number().nullable().optional(),
  grisMinimo: zod.number().nullable().optional(),
  adValorem: zod.number().nullable().optional(),
  adValoremMinimo: zod.number().nullable().optional(),
  ativo: zod.boolean(),
  criadoEm: zod.string(),
  atualizadoEm: zod.string(),
});

export const ListTaxasResponse = zod.object({
  data: zod.array(TaxaEspecialItem),
  total: zod.number(),
  page: zod.number(),
  pageSize: zod.number(),
});

export const CreateTaxaParams = zod.object({ origemId: zod.coerce.number() });
export const CreateTaxaBody = zod.object({
  ibgeDestino: zod.string(),
  trt: zod.number().optional(),
  tda: zod.number().optional(),
  suframa: zod.number().optional(),
  outras: zod.number().optional(),
  grisPercentual: zod.number().nullable().optional(),
  grisMinimo: zod.number().nullable().optional(),
  adValorem: zod.number().nullable().optional(),
  adValoremMinimo: zod.number().nullable().optional(),
  ativo: zod.boolean().optional(),
});
export const CreateTaxaResponse = TaxaEspecialItem;

export const UpdateTaxaParams = zod.object({
  origemId: zod.coerce.number(),
  id: zod.coerce.number(),
});
export const UpdateTaxaBody = CreateTaxaBody;
export const UpdateTaxaResponse = TaxaEspecialItem;
export const DeleteTaxaParams = zod.object({
  origemId: zod.coerce.number(),
  id: zod.coerce.number(),
});

// ── IBGE Municípios ───────────────────────────────────────────────────────────

export const SearchIbgeQueryParams = zod.object({
  q: zod.coerce.string().optional(),
  uf: zod.coerce.string().optional(),
  page: zod.coerce.number().optional(),
  pageSize: zod.coerce.number().optional(),
});

export const SearchIbgeResponse = zod.object({
  data: zod.array(zod.object({
    id: zod.number(),
    codigo: zod.string(),
    nome: zod.string(),
    uf: zod.string(),
    cepInicio: zod.string().nullish(),
    cepFim: zod.string().nullish(),
  })),
  total: zod.number(),
  page: zod.number(),
  pageSize: zod.number(),
});

// ── Simulação em Massa ────────────────────────────────────────────────────────

export const SimulacaoMassaBody = zod.object({
  modo: zod.enum(["destino", "transportadora", "origem"]).optional(),
  destino: zod.string().optional(),
  transportadoraId: zod.number().optional(),
  origemId: zod.number().optional(),
  origemFiltroId: zod.number().optional(),
  pesoKg: zod.number(),
  valorNf: zod.number(),
  canal: zod.string().optional(),
});

const CenarioResultado = zod.object({
  transportadora: zod.string(),
  origemCidade: zod.string(),
  origemUf: zod.string(),
  origemId: zod.number(),
  rotaId: zod.number(),
  nomeRota: zod.string(),
  canal: zod.string(),
  metodoEnvio: zod.string(),
  prazoEntregaDias: zod.number(),
  tipoFrete: zod.enum(["peso", "percentual"]).optional(),
  valorFretePeso: zod.number(),
  valorAdValorem: zod.number(),
  valorGris: zod.number(),
  valorPedagio: zod.number(),
  valorTas: zod.number(),
  valorIcms: zod.number().optional(),
  icmsAliquota: zod.number().optional(),
  valorTotal: zod.number(),
  valorMinimoAplicado: zod.boolean(),
  ibgeDestino: zod.string(),
  destinoMunicipio: zod.string().optional(),
  destinoUf: zod.string().optional(),
  percentualNf: zod.number(),
});

export const SimulacaoMassaResponse = zod.object({
  descricao: zod.string(),
  pesoKg: zod.number(),
  valorNf: zod.number(),
  canal: zod.string().nullish(),
  cenarios: zod.array(CenarioResultado),
  totalEncontrados: zod.number(),
});

// ── Dashboard ─────────────────────────────────────────────────────────────────

export const GetDashboardResumoResponse = zod.object({
  totalTransportadoras: zod.number(),
  totalOrigens: zod.number(),
  totalRotas: zod.number(),
  totalCotacoes: zod.number(),
});
