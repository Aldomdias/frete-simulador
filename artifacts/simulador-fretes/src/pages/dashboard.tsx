import { Link } from "wouter";
import { useGetDashboardResumo } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Calculator, Route, TrendingUp, ArrowRight, Package } from "lucide-react";

export default function Dashboard() {
  const { data: resumo, isLoading } = useGetDashboardResumo();

  const metrics = [
    {
      title: "Transportadoras",
      value: resumo?.totalTransportadoras ?? 0,
      icon: Building2,
      href: "/transportadoras",
      description: "Empresas de transporte cadastradas",
    },
    {
      title: "Origens",
      value: resumo?.totalOrigens ?? 0,
      icon: Route,
      href: "/transportadoras",
      description: "Cidades de origem configuradas",
    },
    {
      title: "Rotas",
      value: resumo?.totalRotas ?? 0,
      icon: Route,
      href: "/transportadoras",
      description: "Pares IBGE origem-destino",
    },
    {
      title: "Cotações",
      value: resumo?.totalCotacoes ?? 0,
      icon: TrendingUp,
      href: "/transportadoras",
      description: "Faixas de peso e preço",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1 text-sm">Visão geral do sistema de simulação de fretes</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric) => (
          <Link href={metric.href} key={metric.title}>
            <Card className="hover:border-primary/40 transition-colors cursor-pointer hover:shadow-md group">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <metric.icon className="h-5 w-5 text-primary" />
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <CardTitle className="text-sm font-medium text-muted-foreground mt-2">{metric.title}</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-8 w-16 bg-muted animate-pulse rounded" />
                ) : (
                  <div className="text-3xl font-bold text-foreground tabular-nums">{metric.value}</div>
                )}
                <p className="text-xs text-muted-foreground mt-1">{metric.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Calculator className="h-4 w-4 text-primary" />
              Simular Frete em Massa
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Informe o destino, peso e valor da nota fiscal. O sistema retorna todas as transportadoras disponíveis ordenadas do menor para o maior frete.
            </p>
            <Button asChild className="w-full">
              <Link href="/simulador">Abrir Simulador</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              Cadastro de Transportadoras
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Cadastre transportadoras e configure origens com generalidades (ICMS, Ad Valorem, GRIS, Pedágio, TAS), rotas e tabelas de frete por faixa de peso.
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/transportadoras">Gerenciar Transportadoras</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="rounded-lg bg-primary/10 p-2">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-foreground">Como funciona o cálculo</h3>
              <p className="text-sm text-muted-foreground mt-1">
                O simulador localiza as rotas pelo IBGE ou CEP do destino, encontra a cotação pelo peso e calcula:{" "}
                <strong>Frete Peso</strong> + <strong>Ad Valorem</strong> + <strong>GRIS</strong> + <strong>Pedágio</strong> + <strong>TAS</strong>.
                Aplica o valor mínimo se o total calculado for inferior. Todos os cenários são exibidos do menor para o maior preço.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
