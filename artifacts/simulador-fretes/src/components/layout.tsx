import { Link, useLocation } from "wouter";
import { LayoutDashboard, Truck, Calculator, Building2, Menu } from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem,
  SidebarMenuButton, SidebarProvider, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarTrigger, useSidebar,
} from "@/components/ui/sidebar";

function MobileHeader() {
  const { isMobile } = useSidebar();
  if (!isMobile) return null;
  return (
    <header className="flex items-center gap-3 h-14 px-4 border-b border-border bg-background sticky top-0 z-10">
      <SidebarTrigger className="h-8 w-8" />
      <div className="flex items-center gap-2 font-bold text-base text-foreground">
        <Truck className="h-5 w-5 text-amber-500" />
        <span>Simulador de Fretes</span>
      </div>
    </header>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-background overflow-hidden">
        <Sidebar className="border-r border-sidebar-border/50 bg-sidebar text-sidebar-foreground">
          <SidebarHeader className="p-4 border-b border-sidebar-border/50">
            <div className="flex items-center gap-2 font-bold text-lg text-sidebar-foreground">
              <Truck className="h-6 w-6 text-accent" />
              <span>Simulador de Fretes</span>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel className="text-sidebar-foreground/60 text-xs uppercase tracking-wider mt-4 px-4 font-semibold">
                Principal
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location === "/"}>
                      <Link href="/" className="flex items-center gap-3 px-4 py-2 text-sm">
                        <LayoutDashboard className="h-4 w-4" />
                        <span>Dashboard</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location === "/simulador"}>
                      <Link href="/simulador" className="flex items-center gap-3 px-4 py-2 text-sm">
                        <Calculator className="h-4 w-4" />
                        <span>Simulador</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel className="text-sidebar-foreground/60 text-xs uppercase tracking-wider mt-4 px-4 font-semibold">
                Cadastros
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.startsWith("/transportadoras")}>
                      <Link href="/transportadoras" className="flex items-center gap-3 px-4 py-2 text-sm">
                        <Building2 className="h-4 w-4" />
                        <span>Transportadoras</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <main className="flex-1 flex flex-col h-full overflow-auto bg-background">
          <MobileHeader />
          <div className="flex-1 p-6 md:p-8">
            <div className="max-w-7xl mx-auto w-full">
              {children}
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
