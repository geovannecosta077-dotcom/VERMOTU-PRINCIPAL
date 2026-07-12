import { Router, type IRouter } from "express";
import healthRouter from "./health";
import itemsRouter from "./items";
import usersRouter from "./users";
import socialRouter from "./social";
import ordersRouter from "./orders";
import reviewsRouter from "./reviews";
import couponsRouter from "./coupons";
import adminRouter from "./admin";
import storageRouter from "./storage";
import subscriptionsRouter from "./subscriptions";
import blogRouter from "./blog";
import emailRouter from "./email";
import bannersRouter from "./banners";
import searchRouter from "./search";
import rankingRouter from "./ranking";
import authRouter from "./auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(itemsRouter);
router.use(usersRouter);
router.use(socialRouter);
router.use(ordersRouter);
router.use(reviewsRouter);
router.use(couponsRouter);
router.use(adminRouter);
router.use(storageRouter);
router.use(subscriptionsRouter);
router.use(blogRouter);
router.use(emailRouter);
router.use(bannersRouter);
router.use(searchRouter);
router.use(rankingRouter);
router.use(authRouter);

export default router;
