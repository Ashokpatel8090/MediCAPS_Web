import { Router } from "express";
import { verifyToken } from "../middleware/authMiddleware.js";
import { deletePlanBenefit, deleteSubscriptionPlan, updatePlanBenefit, updateSubscriptionPlan } from "../controllers/subscription.controller.js";

const router = Router();

// ✅ Update subscription plan (admin only, partial update)
router.put("/subscription-plans/:id", verifyToken, updateSubscriptionPlan);
router.delete("/subscription-plans/:id", verifyToken, deleteSubscriptionPlan);
router.put("/subscription-plans-benefits/:id", verifyToken, updatePlanBenefit);
router.delete("/subscription-plans-benefits/:id", verifyToken, deletePlanBenefit);

export default router;
