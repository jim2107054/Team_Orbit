import { Router } from 'express';
import { transactionRouter } from './transaction.routes.js';
import { scamcheckRouter } from './scamcheck.routes.js';
import { ussdRouter } from './ussd.routes.js';
import { campaignsRouter } from './campaigns.routes.js';
import { merchantsRouter } from './merchants.routes.js';
import { reportsRouter } from './reports.routes.js';
import { casesRouter } from './cases.routes.js';
import { ringsRouter } from './rings.routes.js';
import { agentsRouter } from './agents.routes.js';
import { auditRouter } from './audit.routes.js';
import { propagationRouter } from './propagation.routes.js';
import { customerSafetyRouter } from './customer-safety.routes.js';
import { complaintsRouter } from './complaints.routes.js';
import { investigationsRouter } from './investigations.routes.js';
import { knowledgeGraphRouter } from './knowledge-graph.routes.js';
import { recoveryRouteRouter } from './recovery-route.routes.js';
import { coachRouter } from './coach.routes.js';
import { metricsRouter } from './metrics.routes.js';
import { demoRouter } from './demo.routes.js';
import { healthRouter } from './health.routes.js';

export const shieldRouter = Router();

// Register all modular feature routers
shieldRouter.use(healthRouter);
shieldRouter.use(transactionRouter);
shieldRouter.use(scamcheckRouter);
shieldRouter.use(ussdRouter);
shieldRouter.use(campaignsRouter);
shieldRouter.use(merchantsRouter);
shieldRouter.use(reportsRouter);
shieldRouter.use(casesRouter);
shieldRouter.use(ringsRouter);
shieldRouter.use(agentsRouter);
shieldRouter.use(auditRouter);
shieldRouter.use(propagationRouter);
shieldRouter.use(customerSafetyRouter);
shieldRouter.use(complaintsRouter);
shieldRouter.use(investigationsRouter);
shieldRouter.use(knowledgeGraphRouter);
shieldRouter.use(recoveryRouteRouter);
shieldRouter.use(coachRouter);
shieldRouter.use(metricsRouter);
shieldRouter.use(demoRouter);

export { healthRouter };
export default shieldRouter;
