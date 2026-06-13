import { Router, type IRouter } from "express";
import healthRouter from "./health";
import ariaRouter from "./aria";

const router: IRouter = Router();

router.use(healthRouter);
router.use(ariaRouter);

export default router;
