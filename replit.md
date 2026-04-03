# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **Build**: esbuild (API) + Vite (frontend)
- **Frontend**: React + React Query + shadcn/ui + Tailwind

## Application: Simulador de Fretes

A full-stack freight simulator for Brazilian carriers (transportadoras).

### Data Hierarchy

```
Transportadoras (carriers)
  └── Origens (origin cities with Generalidades: ICMS, AdValorem, GRIS, Pedágio, TAS)
        ├── Rotas (origin→destination routes by IBGE code + CEP ranges)
        ├── Cotações (price quotes by weight range)
        └── Taxas Especiais (special taxes per IBGE destination: TRT, TDA, SUFRAMA)
```

### Key Features

1. **Transportadoras** — CRUD for carriers; each has multiple origin cities
2. **Origens** — City of origin with generalidades (tax/fee rates applied to all routes)
3. **Rotas** — Origin→destination route by IBGE code or CEP range
4. **Cotações** — Price tiers per weight range for each route
5. **Taxas Especiais** — Per-destination surcharges (TRT, TDA, SUFRAMA, others)
6. **Simulador em Massa** — Enter destination + weight + NF value → returns ALL carrier/origin combinations sorted cheapest first
7. **Import/Export** — Excel import for generalidades (with taxes sheet), rotas, fretes; Excel export for rotas and fretes

### Freight Calculation Formula

```
Total = FreteKg × Peso
      + AdValorem × ValorNF / 100
      + max(GRIS × ValorNF / 100, GrisMinimo)
      + ceil(Peso/100) × Pedágio
      + TAS
(if Total < valorMinimoFrete, apply minimum)
```

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/          # Express API server (port from $PORT)
│   └── simulador-fretes/    # React + Vite frontend
├── lib/
│   ├── api-client-react/    # React Query hooks + TypeScript types
│   ├── api-zod/             # Zod validators for API routes
│   └── db/                  # Drizzle ORM schema + DB connection
├── scripts/                 # Utility scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── package.json
```

## Database Schema

6 tables in PostgreSQL:

| Table | Description |
|-------|-------------|
| `transportadoras` | Carriers |
| `origens` | Origin cities with generalidades |
| `rotas` | IBGE/CEP-based routes |
| `cotacoes` | Weight-range price quotes |
| `taxas_especiais` | Per-destination special taxes |
| `ibge_municipios` | IBGE municipality reference (name, code, UF, CEP range) |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/dashboard/resumo` | Summary stats |
| GET/POST | `/api/transportadoras` | List/create carriers |
| GET/PUT/DELETE | `/api/transportadoras/:id` | Get/update/delete carrier |
| GET/POST | `/api/transportadoras/:id/origens` | List/create origins |
| GET/PUT/DELETE | `/api/transportadoras/:tId/origens/:id` | Get/update/delete origin |
| GET/POST | `/api/origens/:id/rotas` | List/create routes |
| PUT/DELETE | `/api/origens/:oId/rotas/:id` | Update/delete route |
| GET/POST | `/api/origens/:id/cotacoes` | List/create quotes |
| PUT/DELETE | `/api/origens/:oId/cotacoes/:id` | Update/delete quote |
| GET/POST | `/api/origens/:id/taxas` | List/create special taxes |
| PUT/DELETE | `/api/origens/:oId/taxas/:id` | Update/delete tax |
| GET | `/api/ibge` | Search IBGE municipalities |
| POST | `/api/simulacao` | Mass freight simulation |
| POST | `/api/origens/:id/importar-generalidades` | Import Excel generalidades |
| POST | `/api/origens/:id/importar-rotas` | Import Excel rotas |
| POST | `/api/origens/:id/importar-fretes` | Import Excel fretes/cotacoes |
| GET | `/api/origens/:id/exportar-rotas` | Export rotas to Excel |
| GET | `/api/origens/:id/exportar-fretes` | Export fretes to Excel |

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references.

- **Always typecheck from the root** — run `pnpm run typecheck`
- **`emitDeclarationOnly`** — only emit `.d.ts` files during typecheck

## Root Scripts

- `pnpm run build` — runs `typecheck` then `build` in all packages
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly`

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API. Routes in `src/routes/`. Uses `@workspace/api-zod` for validation and `@workspace/db` for persistence.

- `pnpm --filter @workspace/api-server run dev` — dev server

### `artifacts/simulador-fretes` (`@workspace/simulador-fretes`)

React + Vite frontend. Pages in `src/pages/`. Uses `@workspace/api-client-react` hooks.

- `pnpm --filter @workspace/simulador-fretes run dev` — dev server

### `lib/db` (`@workspace/db`)

Database layer. Schema in `src/schema/`. Uses `drizzle.config.ts` for migrations.

- `pnpm --filter @workspace/db run push` — push schema to DB

### `lib/api-zod` (`@workspace/api-zod`)

Zod validators for API request/response validation. Manually maintained (not generated from OpenAPI).

### `lib/api-client-react` (`@workspace/api-client-react`)

React Query hooks and TypeScript types. Manually maintained (not generated from OpenAPI).

### `scripts` (`@workspace/scripts`)

Utility scripts. Run via `pnpm --filter @workspace/scripts run <script>`.
