export interface Transportadora {
  id: number;
  nome: string;
  ativo: boolean;
  totalOrigens: number;
  criadoEm: string;
  atualizadoEm: string;
}

export interface CreateTransportadora {
  nome: string;
  ativo?: boolean;
}

export interface TransportadorasListResponse {
  data: Transportadora[];
  total: number;
  page: number;
  pageSize: number;
}

export interface Origem {
  id: number;
  transportadoraId: number;
  transportadoraNome?: string | null;
  canal: string;
  cidade: string;
  uf: string;
  icms: boolean;
  icmsAliquota: number;
  adValorem: number;
  adValoremMinimo: number;
  pedagio: number;
  grisPercentual: number;
  grisMinimo: number;
  tas: number;
  ctrcEmitido: number;
  cubagem: number;
  faixaDePeso: boolean;
  observacoes?: string | null;
  ativo: boolean;
  totalRotas: number;
  criadoEm: string;
  atualizadoEm: string;
}

export interface CreateOrigem {
  canal?: string;
  cidade: string;
  uf?: string;
  icms?: boolean;
  icmsAliquota?: number;
  adValorem?: number;
  adValoremMinimo?: number;
  pedagio?: number;
  grisPercentual?: number;
  grisMinimo?: number;
  tas?: number;
  ctrcEmitido?: number;
  cubagem?: number;
  faixaDePeso?: boolean;
  observacoes?: string | null;
  ativo?: boolean;
}

export interface OrigensListResponse {
  data: Origem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface Rota {
  id: number;
  origemId: number;
  nomeRota: string;
  ibgeOrigem: string;
  ibgeDestino: string;
  cepInicioFaixa?: string | null;
  cepFimFaixa?: string | null;
  canal: string;
  metodoEnvio: string;
  prazoEntregaDias: number;
  valorMinimoFrete: number;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
}

export interface CreateRota {
  nomeRota: string;
  ibgeOrigem: string;
  ibgeDestino: string;
  cepInicioFaixa?: string | null;
  cepFimFaixa?: string | null;
  canal?: string;
  metodoEnvio?: string;
  prazoEntregaDias: number;
  valorMinimoFrete: number;
  ativo?: boolean;
}

export interface RotasListResponse {
  data: Rota[];
  total: number;
  page: number;
  pageSize: number;
}

export interface Cotacao {
  id: number;
  origemId: number;
  rotaId: number;
  nomeRota?: string | null;
  pesoMinimoKg: number;
  pesoMaximoKg: number;
  valorKg: number;
  valorFixo: number;
  excessoKg: number;
  percentualFrete: number;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
}

export interface CreateCotacao {
  rotaId: number;
  pesoMinimoKg: number;
  pesoMaximoKg: number;
  valorKg: number;
  valorFixo: number;
  excessoKg?: number;
  percentualFrete: number;
  ativo?: boolean;
}

export interface CotacoesListResponse {
  data: Cotacao[];
  total: number;
  page: number;
  pageSize: number;
}

export interface TaxaEspecial {
  id: number;
  origemId: number;
  ibgeDestino: string;
  trt: number;
  tda: number;
  suframa: number;
  outras: number;
  grisPercentual?: number | null;
  grisMinimo?: number | null;
  adValorem?: number | null;
  adValoremMinimo?: number | null;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
}

export interface CreateTaxaEspecial {
  ibgeDestino: string;
  trt?: number;
  tda?: number;
  suframa?: number;
  outras?: number;
  grisPercentual?: number | null;
  grisMinimo?: number | null;
  adValorem?: number | null;
  adValoremMinimo?: number | null;
  ativo?: boolean;
}

export interface TaxasListResponse {
  data: TaxaEspecial[];
  total: number;
  page: number;
  pageSize: number;
}

export interface IbgeMunicipio {
  id: number;
  codigo: string;
  nome: string;
  uf: string;
  cepInicio?: string | null;
  cepFim?: string | null;
}

export interface IbgeSearchResponse {
  data: IbgeMunicipio[];
  total: number;
  page: number;
  pageSize: number;
}

export interface MelhorMercado {
  valorTotal: number;
  transportadora: string;
  origemCidade: string;
  origemUf: string;
}

export interface CenarioResultado {
  transportadora: string;
  origemCidade: string;
  origemUf: string;
  origemId: number;
  rotaId: number;
  nomeRota: string;
  canal: string;
  metodoEnvio: string;
  prazoEntregaDias: number;
  tipoFrete?: "peso" | "percentual";
  valorFretePeso: number;
  valorAdValorem: number;
  valorGris: number;
  valorPedagio: number;
  valorTas: number;
  valorIcms?: number;
  icmsAliquota?: number;
  valorTotal: number;
  valorMinimoAplicado: boolean;
  ibgeDestino: string;
  destinoMunicipio?: string;
  destinoUf?: string;
  percentualNf: number;
  melhorMercado?: MelhorMercado | null;
  ganhei?: boolean;
  diferencaMercado?: number;
}

export interface SimulacaoResumo {
  totalRotas: number;
  rotasGanhas: number;
  rotasPerdidas: number;
  percentualGanhas: number;
  economiaMedia: number;
  diferencaMedia: number;
}

export interface SimulacaoMassaInput {
  modo?: "destino" | "transportadora" | "origem";
  destino?: string;
  transportadoraId?: number;
  origemId?: number;
  origemFiltroId?: number;
  pesoKg: number;
  valorNf: number;
  canal?: string;
}

export interface SimulacaoMassaResponse {
  descricao: string;
  pesoKg: number;
  valorNf: number;
  canal?: string | null;
  cenarios: CenarioResultado[];
  totalEncontrados: number;
  resumo?: SimulacaoResumo;
}

export interface DashboardResumo {
  totalTransportadoras: number;
  totalOrigens: number;
  totalRotas: number;
  totalCotacoes: number;
}

export type ListTransportadorasParams = {
  search?: string;
  page?: number;
  pageSize?: number;
};

export type ListOrigensParams = {
  search?: string;
  page?: number;
  pageSize?: number;
};

export type ListRotasParams = {
  search?: string;
  canal?: string;
  page?: number;
  pageSize?: number;
};

export type ListCotacoesParams = {
  search?: string;
  rotaId?: number;
  page?: number;
  pageSize?: number;
};

export type ListTaxasParams = {
  page?: number;
  pageSize?: number;
};

export type SearchIbgeParams = {
  q?: string;
  uf?: string;
  page?: number;
  pageSize?: number;
};
