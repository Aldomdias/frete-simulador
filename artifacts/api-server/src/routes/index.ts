import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dashboardRouter from "./dashboard";
import transportadorasRouter from "./transportadoras";
import origensRouter from "./origens";
import rotasRouter from "./rotas";
import cotacoesRouter from "./cotacoes";
import taxasRouter from "./taxas";
import ibgeRouter from "./ibge";
import simulacaoRouter from "./simulacao";
import importarExportarRouter from "./importar-exportar";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dashboardRouter);
router.use(transportadorasRouter);
router.use(origensRouter);
router.use(rotasRouter);
router.use(cotacoesRouter);
router.use(taxasRouter);
router.use(ibgeRouter);
router.use(simulacaoRouter);
router.use(importarExportarRouter);

export default router;
