import { Router, type IRouter } from "express";
import healthRouter from "./health";
import { oscsRouter } from "./oscs";

const router: IRouter = Router();

router.use(healthRouter);
router.use(oscsRouter);

export default router;
