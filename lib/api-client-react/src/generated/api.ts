import { useMutation, useQuery } from "@tanstack/react-query";
import type {
  MutationFunction,
  QueryFunction,
  QueryKey,
  UseMutationOptions,
  UseMutationResult,
  UseQueryOptions,
  UseQueryResult,
} from "@tanstack/react-query";

import type {
  Transportadora,
  TransportadorasListResponse,
  CreateTransportadora,
  Origem,
  OrigensListResponse,
  CreateOrigem,
  Rota,
  RotasListResponse,
  CreateRota,
  Cotacao,
  CotacoesListResponse,
  CreateCotacao,
  TaxaEspecial,
  TaxasListResponse,
  CreateTaxaEspecial,
  IbgeMunicipio,
  IbgeSearchResponse,
  SimulacaoMassaInput,
  SimulacaoMassaResponse,
  DashboardResumo,
  ListTransportadorasParams,
  ListOrigensParams,
  ListRotasParams,
  ListCotacoesParams,
  ListTaxasParams,
  SearchIbgeParams,
} from "./api.schemas";

import { customFetch } from "../custom-fetch";
import type { ErrorType, BodyType } from "../custom-fetch";

type AwaitedInput<T> = PromiseLike<T> | T;
type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;
type SecondParameter<T extends (...args: never) => unknown> = Parameters<T>[1];

function qs(params?: Record<string, unknown>): string {
  if (!params) return "";
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) p.set(k, String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : "";
}

// ── Health ────────────────────────────────────────────────────────────────────

export const healthCheck = async (options?: RequestInit) =>
  customFetch<{ status: string }>("/api/healthz", { ...options, method: "GET" });

export const getHealthCheckQueryKey = () => ["/api/healthz"] as const;

export const useHealthCheck = <TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(
  options?: { query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData> }
): UseQueryResult<TData, TError> => {
  const queryKey = options?.query?.queryKey ?? getHealthCheckQueryKey();
  return useQuery({ queryKey, queryFn: ({ signal }) => healthCheck({ signal }), ...options?.query });
};

// ── Dashboard ─────────────────────────────────────────────────────────────────

export const getDashboardResumo = async (options?: RequestInit) =>
  customFetch<DashboardResumo>("/api/dashboard/resumo", { ...options, method: "GET" });

export const getGetDashboardResumoQueryKey = () => ["/api/dashboard/resumo"] as const;

export const useGetDashboardResumo = <TData = Awaited<ReturnType<typeof getDashboardResumo>>, TError = ErrorType<unknown>>(
  options?: { query?: UseQueryOptions<Awaited<ReturnType<typeof getDashboardResumo>>, TError, TData> }
): UseQueryResult<TData, TError> => {
  const queryKey = options?.query?.queryKey ?? getGetDashboardResumoQueryKey();
  return useQuery({ queryKey, queryFn: ({ signal }) => getDashboardResumo({ signal }), ...options?.query });
};

// ── Transportadoras ───────────────────────────────────────────────────────────

export const listTransportadoras = async (params?: ListTransportadorasParams, options?: RequestInit) =>
  customFetch<TransportadorasListResponse>(`/api/transportadoras${qs(params as any)}`, { ...options, method: "GET" });

export const getListTransportadorasQueryKey = (params?: ListTransportadorasParams) =>
  ["/api/transportadoras", params] as const;

export const useListTransportadoras = <TData = Awaited<ReturnType<typeof listTransportadoras>>, TError = ErrorType<unknown>>(
  params?: ListTransportadorasParams,
  options?: { query?: UseQueryOptions<Awaited<ReturnType<typeof listTransportadoras>>, TError, TData> }
): UseQueryResult<TData, TError> => {
  const queryKey = options?.query?.queryKey ?? getListTransportadorasQueryKey(params);
  return useQuery({ queryKey, queryFn: ({ signal }) => listTransportadoras(params, { signal }), ...options?.query });
};

export const getTransportadora = async (id: number, options?: RequestInit) =>
  customFetch<Transportadora>(`/api/transportadoras/${id}`, { ...options, method: "GET" });

export const getGetTransportadoraQueryKey = (id: number) => ["/api/transportadoras", id] as const;

export const useGetTransportadora = <TData = Awaited<ReturnType<typeof getTransportadora>>, TError = ErrorType<unknown>>(
  id: number,
  options?: { query?: UseQueryOptions<Awaited<ReturnType<typeof getTransportadora>>, TError, TData> }
): UseQueryResult<TData, TError> => {
  const queryKey = options?.query?.queryKey ?? getGetTransportadoraQueryKey(id);
  return useQuery({ queryKey, queryFn: ({ signal }) => getTransportadora(id, { signal }), enabled: !!id, ...options?.query });
};

export const createTransportadora = async (body: CreateTransportadora, options?: RequestInit) =>
  customFetch<Transportadora>("/api/transportadoras", { ...options, method: "POST", body: JSON.stringify(body) });

export const useCreateTransportadora = <TError = ErrorType<unknown>, TContext = unknown>(
  options?: { mutation?: UseMutationOptions<Awaited<ReturnType<typeof createTransportadora>>, TError, { data: CreateTransportadora }, TContext> }
): UseMutationResult<Awaited<ReturnType<typeof createTransportadora>>, TError, { data: CreateTransportadora }, TContext> => {
  const mutationFn: MutationFunction<Awaited<ReturnType<typeof createTransportadora>>, { data: CreateTransportadora }> = ({ data }) =>
    createTransportadora(data);
  return useMutation({ mutationFn, ...options?.mutation });
};

export const updateTransportadora = async (id: number, body: CreateTransportadora, options?: RequestInit) =>
  customFetch<Transportadora>(`/api/transportadoras/${id}`, { ...options, method: "PUT", body: JSON.stringify(body) });

export const useUpdateTransportadora = <TError = ErrorType<unknown>, TContext = unknown>(
  options?: { mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateTransportadora>>, TError, { id: number; data: CreateTransportadora }, TContext> }
): UseMutationResult<Awaited<ReturnType<typeof updateTransportadora>>, TError, { id: number; data: CreateTransportadora }, TContext> => {
  const mutationFn: MutationFunction<Awaited<ReturnType<typeof updateTransportadora>>, { id: number; data: CreateTransportadora }> = ({ id, data }) =>
    updateTransportadora(id, data);
  return useMutation({ mutationFn, ...options?.mutation });
};

export const deleteTransportadora = async (id: number, options?: RequestInit) =>
  customFetch<void>(`/api/transportadoras/${id}`, { ...options, method: "DELETE" });

export const useDeleteTransportadora = <TError = ErrorType<unknown>, TContext = unknown>(
  options?: { mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteTransportadora>>, TError, { id: number }, TContext> }
): UseMutationResult<Awaited<ReturnType<typeof deleteTransportadora>>, TError, { id: number }, TContext> => {
  const mutationFn: MutationFunction<Awaited<ReturnType<typeof deleteTransportadora>>, { id: number }> = ({ id }) =>
    deleteTransportadora(id);
  return useMutation({ mutationFn, ...options?.mutation });
};

// ── Origens ───────────────────────────────────────────────────────────────────

export const listOrigens = async (transportadoraId: number, params?: ListOrigensParams, options?: RequestInit) =>
  customFetch<OrigensListResponse>(`/api/transportadoras/${transportadoraId}/origens${qs(params as any)}`, { ...options, method: "GET" });

export const getListOrigensQueryKey = (transportadoraId: number, params?: ListOrigensParams) =>
  ["/api/transportadoras", transportadoraId, "origens", params] as const;

export const useListOrigens = <TData = Awaited<ReturnType<typeof listOrigens>>, TError = ErrorType<unknown>>(
  transportadoraId: number,
  params?: ListOrigensParams,
  options?: { query?: UseQueryOptions<Awaited<ReturnType<typeof listOrigens>>, TError, TData> }
): UseQueryResult<TData, TError> => {
  const queryKey = options?.query?.queryKey ?? getListOrigensQueryKey(transportadoraId, params);
  return useQuery({ queryKey, queryFn: ({ signal }) => listOrigens(transportadoraId, params, { signal }), enabled: !!transportadoraId, ...options?.query });
};

export const getOrigem = async (transportadoraId: number, id: number, options?: RequestInit) =>
  customFetch<Origem>(`/api/transportadoras/${transportadoraId}/origens/${id}`, { ...options, method: "GET" });

export const getGetOrigemQueryKey = (transportadoraId: number, id: number) =>
  ["/api/transportadoras", transportadoraId, "origens", id] as const;

export const useGetOrigem = <TData = Awaited<ReturnType<typeof getOrigem>>, TError = ErrorType<unknown>>(
  transportadoraId: number,
  id: number,
  options?: { query?: UseQueryOptions<Awaited<ReturnType<typeof getOrigem>>, TError, TData> }
): UseQueryResult<TData, TError> => {
  const queryKey = options?.query?.queryKey ?? getGetOrigemQueryKey(transportadoraId, id);
  return useQuery({ queryKey, queryFn: ({ signal }) => getOrigem(transportadoraId, id, { signal }), enabled: !!transportadoraId && !!id, ...options?.query });
};

export const createOrigem = async (transportadoraId: number, body: CreateOrigem, options?: RequestInit) =>
  customFetch<Origem>(`/api/transportadoras/${transportadoraId}/origens`, { ...options, method: "POST", body: JSON.stringify(body) });

export const useCreateOrigem = <TError = ErrorType<unknown>, TContext = unknown>(
  options?: { mutation?: UseMutationOptions<Awaited<ReturnType<typeof createOrigem>>, TError, { transportadoraId: number; data: CreateOrigem }, TContext> }
): UseMutationResult<Awaited<ReturnType<typeof createOrigem>>, TError, { transportadoraId: number; data: CreateOrigem }, TContext> => {
  const mutationFn: MutationFunction<Awaited<ReturnType<typeof createOrigem>>, { transportadoraId: number; data: CreateOrigem }> = ({ transportadoraId, data }) =>
    createOrigem(transportadoraId, data);
  return useMutation({ mutationFn, ...options?.mutation });
};

export const updateOrigem = async (transportadoraId: number, id: number, body: CreateOrigem, options?: RequestInit) =>
  customFetch<Origem>(`/api/transportadoras/${transportadoraId}/origens/${id}`, { ...options, method: "PUT", body: JSON.stringify(body) });

export const useUpdateOrigem = <TError = ErrorType<unknown>, TContext = unknown>(
  options?: { mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateOrigem>>, TError, { transportadoraId: number; id: number; data: CreateOrigem }, TContext> }
): UseMutationResult<Awaited<ReturnType<typeof updateOrigem>>, TError, { transportadoraId: number; id: number; data: CreateOrigem }, TContext> => {
  const mutationFn: MutationFunction<Awaited<ReturnType<typeof updateOrigem>>, { transportadoraId: number; id: number; data: CreateOrigem }> = ({ transportadoraId, id, data }) =>
    updateOrigem(transportadoraId, id, data);
  return useMutation({ mutationFn, ...options?.mutation });
};

export const deleteOrigem = async (transportadoraId: number, id: number, options?: RequestInit) =>
  customFetch<void>(`/api/transportadoras/${transportadoraId}/origens/${id}`, { ...options, method: "DELETE" });

export const useDeleteOrigem = <TError = ErrorType<unknown>, TContext = unknown>(
  options?: { mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteOrigem>>, TError, { transportadoraId: number; id: number }, TContext> }
): UseMutationResult<Awaited<ReturnType<typeof deleteOrigem>>, TError, { transportadoraId: number; id: number }, TContext> => {
  const mutationFn: MutationFunction<Awaited<ReturnType<typeof deleteOrigem>>, { transportadoraId: number; id: number }> = ({ transportadoraId, id }) =>
    deleteOrigem(transportadoraId, id);
  return useMutation({ mutationFn, ...options?.mutation });
};

// ── Rotas ─────────────────────────────────────────────────────────────────────

export const listRotas = async (origemId: number, params?: ListRotasParams, options?: RequestInit) =>
  customFetch<RotasListResponse>(`/api/origens/${origemId}/rotas${qs(params as any)}`, { ...options, method: "GET" });

export const getListRotasQueryKey = (origemId: number, params?: ListRotasParams) =>
  ["/api/origens", origemId, "rotas", params] as const;

export const useListRotas = <TData = Awaited<ReturnType<typeof listRotas>>, TError = ErrorType<unknown>>(
  origemId: number,
  params?: ListRotasParams,
  options?: { query?: UseQueryOptions<Awaited<ReturnType<typeof listRotas>>, TError, TData> }
): UseQueryResult<TData, TError> => {
  const queryKey = options?.query?.queryKey ?? getListRotasQueryKey(origemId, params);
  return useQuery({ queryKey, queryFn: ({ signal }) => listRotas(origemId, params, { signal }), enabled: !!origemId, ...options?.query });
};

export const createRota = async (origemId: number, body: CreateRota, options?: RequestInit) =>
  customFetch<Rota>(`/api/origens/${origemId}/rotas`, { ...options, method: "POST", body: JSON.stringify(body) });

export const useCreateRota = <TError = ErrorType<unknown>, TContext = unknown>(
  options?: { mutation?: UseMutationOptions<Awaited<ReturnType<typeof createRota>>, TError, { origemId: number; data: CreateRota }, TContext> }
): UseMutationResult<Awaited<ReturnType<typeof createRota>>, TError, { origemId: number; data: CreateRota }, TContext> => {
  const mutationFn: MutationFunction<Awaited<ReturnType<typeof createRota>>, { origemId: number; data: CreateRota }> = ({ origemId, data }) =>
    createRota(origemId, data);
  return useMutation({ mutationFn, ...options?.mutation });
};

export const updateRota = async (origemId: number, id: number, body: CreateRota, options?: RequestInit) =>
  customFetch<Rota>(`/api/origens/${origemId}/rotas/${id}`, { ...options, method: "PUT", body: JSON.stringify(body) });

export const useUpdateRota = <TError = ErrorType<unknown>, TContext = unknown>(
  options?: { mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateRota>>, TError, { origemId: number; id: number; data: CreateRota }, TContext> }
): UseMutationResult<Awaited<ReturnType<typeof updateRota>>, TError, { origemId: number; id: number; data: CreateRota }, TContext> => {
  const mutationFn: MutationFunction<Awaited<ReturnType<typeof updateRota>>, { origemId: number; id: number; data: CreateRota }> = ({ origemId, id, data }) =>
    updateRota(origemId, id, data);
  return useMutation({ mutationFn, ...options?.mutation });
};

export const deleteRota = async (origemId: number, id: number, options?: RequestInit) =>
  customFetch<void>(`/api/origens/${origemId}/rotas/${id}`, { ...options, method: "DELETE" });

export const useDeleteRota = <TError = ErrorType<unknown>, TContext = unknown>(
  options?: { mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteRota>>, TError, { origemId: number; id: number }, TContext> }
): UseMutationResult<Awaited<ReturnType<typeof deleteRota>>, TError, { origemId: number; id: number }, TContext> => {
  const mutationFn: MutationFunction<Awaited<ReturnType<typeof deleteRota>>, { origemId: number; id: number }> = ({ origemId, id }) =>
    deleteRota(origemId, id);
  return useMutation({ mutationFn, ...options?.mutation });
};

// ── Cotações ──────────────────────────────────────────────────────────────────

export const listCotacoes = async (origemId: number, params?: ListCotacoesParams, options?: RequestInit) =>
  customFetch<CotacoesListResponse>(`/api/origens/${origemId}/cotacoes${qs(params as any)}`, { ...options, method: "GET" });

export const getListCotacoesQueryKey = (origemId: number, params?: ListCotacoesParams) =>
  ["/api/origens", origemId, "cotacoes", params] as const;

export const useListCotacoes = <TData = Awaited<ReturnType<typeof listCotacoes>>, TError = ErrorType<unknown>>(
  origemId: number,
  params?: ListCotacoesParams,
  options?: { query?: UseQueryOptions<Awaited<ReturnType<typeof listCotacoes>>, TError, TData> }
): UseQueryResult<TData, TError> => {
  const queryKey = options?.query?.queryKey ?? getListCotacoesQueryKey(origemId, params);
  return useQuery({ queryKey, queryFn: ({ signal }) => listCotacoes(origemId, params, { signal }), enabled: !!origemId, ...options?.query });
};

export const createCotacao = async (origemId: number, body: CreateCotacao, options?: RequestInit) =>
  customFetch<Cotacao>(`/api/origens/${origemId}/cotacoes`, { ...options, method: "POST", body: JSON.stringify(body) });

export const useCreateCotacao = <TError = ErrorType<unknown>, TContext = unknown>(
  options?: { mutation?: UseMutationOptions<Awaited<ReturnType<typeof createCotacao>>, TError, { origemId: number; data: CreateCotacao }, TContext> }
): UseMutationResult<Awaited<ReturnType<typeof createCotacao>>, TError, { origemId: number; data: CreateCotacao }, TContext> => {
  const mutationFn: MutationFunction<Awaited<ReturnType<typeof createCotacao>>, { origemId: number; data: CreateCotacao }> = ({ origemId, data }) =>
    createCotacao(origemId, data);
  return useMutation({ mutationFn, ...options?.mutation });
};

export const updateCotacao = async (origemId: number, id: number, body: CreateCotacao, options?: RequestInit) =>
  customFetch<Cotacao>(`/api/origens/${origemId}/cotacoes/${id}`, { ...options, method: "PUT", body: JSON.stringify(body) });

export const useUpdateCotacao = <TError = ErrorType<unknown>, TContext = unknown>(
  options?: { mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateCotacao>>, TError, { origemId: number; id: number; data: CreateCotacao }, TContext> }
): UseMutationResult<Awaited<ReturnType<typeof updateCotacao>>, TError, { origemId: number; id: number; data: CreateCotacao }, TContext> => {
  const mutationFn: MutationFunction<Awaited<ReturnType<typeof updateCotacao>>, { origemId: number; id: number; data: CreateCotacao }> = ({ origemId, id, data }) =>
    updateCotacao(origemId, id, data);
  return useMutation({ mutationFn, ...options?.mutation });
};

export const deleteCotacao = async (origemId: number, id: number, options?: RequestInit) =>
  customFetch<void>(`/api/origens/${origemId}/cotacoes/${id}`, { ...options, method: "DELETE" });

export const useDeleteCotacao = <TError = ErrorType<unknown>, TContext = unknown>(
  options?: { mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteCotacao>>, TError, { origemId: number; id: number }, TContext> }
): UseMutationResult<Awaited<ReturnType<typeof deleteCotacao>>, TError, { origemId: number; id: number }, TContext> => {
  const mutationFn: MutationFunction<Awaited<ReturnType<typeof deleteCotacao>>, { origemId: number; id: number }> = ({ origemId, id }) =>
    deleteCotacao(origemId, id);
  return useMutation({ mutationFn, ...options?.mutation });
};

// ── Taxas Especiais ───────────────────────────────────────────────────────────

export const listTaxas = async (origemId: number, params?: ListTaxasParams, options?: RequestInit) =>
  customFetch<TaxasListResponse>(`/api/origens/${origemId}/taxas${qs(params as any)}`, { ...options, method: "GET" });

export const getListTaxasQueryKey = (origemId: number, params?: ListTaxasParams) =>
  ["/api/origens", origemId, "taxas", params] as const;

export const useListTaxas = <TData = Awaited<ReturnType<typeof listTaxas>>, TError = ErrorType<unknown>>(
  origemId: number,
  params?: ListTaxasParams,
  options?: { query?: UseQueryOptions<Awaited<ReturnType<typeof listTaxas>>, TError, TData> }
): UseQueryResult<TData, TError> => {
  const queryKey = options?.query?.queryKey ?? getListTaxasQueryKey(origemId, params);
  return useQuery({ queryKey, queryFn: ({ signal }) => listTaxas(origemId, params, { signal }), enabled: !!origemId, ...options?.query });
};

export const createTaxa = async (origemId: number, body: CreateTaxaEspecial, options?: RequestInit) =>
  customFetch<TaxaEspecial>(`/api/origens/${origemId}/taxas`, { ...options, method: "POST", body: JSON.stringify(body) });

export const useCreateTaxa = <TError = ErrorType<unknown>, TContext = unknown>(
  options?: { mutation?: UseMutationOptions<Awaited<ReturnType<typeof createTaxa>>, TError, { origemId: number; data: CreateTaxaEspecial }, TContext> }
): UseMutationResult<Awaited<ReturnType<typeof createTaxa>>, TError, { origemId: number; data: CreateTaxaEspecial }, TContext> => {
  const mutationFn: MutationFunction<Awaited<ReturnType<typeof createTaxa>>, { origemId: number; data: CreateTaxaEspecial }> = ({ origemId, data }) =>
    createTaxa(origemId, data);
  return useMutation({ mutationFn, ...options?.mutation });
};

export const updateTaxa = async (origemId: number, id: number, body: CreateTaxaEspecial, options?: RequestInit) =>
  customFetch<TaxaEspecial>(`/api/origens/${origemId}/taxas/${id}`, { ...options, method: "PUT", body: JSON.stringify(body) });

export const useUpdateTaxa = <TError = ErrorType<unknown>, TContext = unknown>(
  options?: { mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateTaxa>>, TError, { origemId: number; id: number; data: CreateTaxaEspecial }, TContext> }
): UseMutationResult<Awaited<ReturnType<typeof updateTaxa>>, TError, { origemId: number; id: number; data: CreateTaxaEspecial }, TContext> => {
  const mutationFn: MutationFunction<Awaited<ReturnType<typeof updateTaxa>>, { origemId: number; id: number; data: CreateTaxaEspecial }> = ({ origemId, id, data }) =>
    updateTaxa(origemId, id, data);
  return useMutation({ mutationFn, ...options?.mutation });
};

export const deleteTaxa = async (origemId: number, id: number, options?: RequestInit) =>
  customFetch<void>(`/api/origens/${origemId}/taxas/${id}`, { ...options, method: "DELETE" });

export const useDeleteTaxa = <TError = ErrorType<unknown>, TContext = unknown>(
  options?: { mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteTaxa>>, TError, { origemId: number; id: number }, TContext> }
): UseMutationResult<Awaited<ReturnType<typeof deleteTaxa>>, TError, { origemId: number; id: number }, TContext> => {
  const mutationFn: MutationFunction<Awaited<ReturnType<typeof deleteTaxa>>, { origemId: number; id: number }> = ({ origemId, id }) =>
    deleteTaxa(origemId, id);
  return useMutation({ mutationFn, ...options?.mutation });
};

// ── IBGE ──────────────────────────────────────────────────────────────────────

export const searchIbge = async (params?: SearchIbgeParams, options?: RequestInit) =>
  customFetch<IbgeSearchResponse>(`/api/ibge${qs(params as any)}`, { ...options, method: "GET" });

export const getSearchIbgeQueryKey = (params?: SearchIbgeParams) => ["/api/ibge", params] as const;

export const useSearchIbge = <TData = Awaited<ReturnType<typeof searchIbge>>, TError = ErrorType<unknown>>(
  params?: SearchIbgeParams,
  options?: { query?: UseQueryOptions<Awaited<ReturnType<typeof searchIbge>>, TError, TData> }
): UseQueryResult<TData, TError> => {
  const queryKey = options?.query?.queryKey ?? getSearchIbgeQueryKey(params);
  return useQuery({ queryKey, queryFn: ({ signal }) => searchIbge(params, { signal }), ...options?.query });
};

// ── Simulação em Massa ────────────────────────────────────────────────────────

export const simularFrete = async (body: SimulacaoMassaInput, options?: RequestInit) =>
  customFetch<SimulacaoMassaResponse>("/api/simulacao", { ...options, method: "POST", body: JSON.stringify(body) });

export const useSimularFrete = <TError = ErrorType<unknown>, TContext = unknown>(
  options?: { mutation?: UseMutationOptions<Awaited<ReturnType<typeof simularFrete>>, TError, { data: SimulacaoMassaInput }, TContext> }
): UseMutationResult<Awaited<ReturnType<typeof simularFrete>>, TError, { data: SimulacaoMassaInput }, TContext> => {
  const mutationFn: MutationFunction<Awaited<ReturnType<typeof simularFrete>>, { data: SimulacaoMassaInput }> = ({ data }) =>
    simularFrete(data);
  return useMutation({ mutationFn, ...options?.mutation });
};
