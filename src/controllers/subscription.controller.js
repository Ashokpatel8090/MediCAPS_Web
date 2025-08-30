import db from "../config/db.js";

// Update subscription plan (only admin allowed, partial updates)

/**
 * @swagger
 * /api/subscription-plans/{id}:
 *   put:
 *     summary: Update an existing subscription plan
 *     description: Only admins (role_id = 3) can update subscription plans. Partial updates are supported (only provided fields will be updated).
 *     tags:
 *       - Subscription Plans
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Subscription plan ID
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Premium Plan
 *               description:
 *                 type: string
 *                 example: Full access to all features
 *               price:
 *                 type: number
 *                 example: 49.99
 *               currency:
 *                 type: string
 *                 example: USD
 *               duration_days:
 *                 type: integer
 *                 example: 30
 *               is_active:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Subscription plan updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Subscription plan updated successfully
 *                 plan:
 *                   $ref: '#/components/schemas/SubscriptionPlan'
 *       400:
 *         description: No changes detected in subscription plan
 *       403:
 *         description: Only admins can update subscription plans
 *       404:
 *         description: Subscription plan not found or user not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     SubscriptionPlan:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         price:
 *           type: number
 *         currency:
 *           type: string
 *         duration_days:
 *           type: integer
 *         is_active:
 *           type: boolean
 */

export const updateSubscriptionPlan = async (req, res) => {
  const { id } = req.params;

  const useValidValue = (newVal, oldVal) => {
    return newVal !== undefined && newVal !== null && newVal !== "" ? newVal : oldVal;
  };

  try {
    
    const userId = req.user.sub;
    const [userRows] = await db.query(`SELECT role_id FROM users WHERE id = ?`, [userId]);

    if (userRows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    if (userRows[0].role_id !== 3) {
      return res.status(403).json({ error: "Only admins can update subscription plans" });
    }

    // ✅ Check if plan exists
    const [rows] = await db.query(`SELECT * FROM subscription_plans WHERE id = ?`, [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: "Subscription plan not found" });
    }

    const existing = rows[0];

    // ✅ Merge with only valid values
    const updatedPlan = {
      name: useValidValue(req.body.name, existing.name),
      description: useValidValue(req.body.description, existing.description),
      price: useValidValue(req.body.price, existing.price),
      currency: useValidValue(req.body.currency, existing.currency),
      duration_days: useValidValue(req.body.duration_days, existing.duration_days),
      is_active: useValidValue(req.body.is_active, existing.is_active),
    };

    // ✅ Detect if nothing has changed
    const hasChanged = Object.entries(updatedPlan).some(
      ([key, value]) => value !== existing[key]
    );

    if (!hasChanged) {
      return res.status(400).json({ message: "No changes detected in subscription plan" });
    }

    // ✅ Run update query
    await db.query(
      `UPDATE subscription_plans 
       SET name = ?, description = ?, price = ?, currency = ?, duration_days = ?, is_active = ?
       WHERE id = ?`,
      [
        updatedPlan.name,
        updatedPlan.description,
        updatedPlan.price,
        updatedPlan.currency,
        updatedPlan.duration_days,
        updatedPlan.is_active,
        id,
      ]
    );

    return res.json({ message: "Subscription plan updated successfully", plan: updatedPlan });
  } catch (error) {
    console.error("Error updating subscription plan:", error);
    return res.status(500).json({ error: "Server error", details: error.message });
  }
};


// Delete subscription plan (only admin allowed)

/**
 * @swagger
 * /api/subscription-plans/{id}:
 *   delete:
 *     summary: Delete a subscription plan
 *     description: Only admins (role_id = 3) can delete subscription plans.
 *     tags:
 *       - Subscription Plans
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Subscription plan ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Subscription plan deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Subscription plan deleted successfully
 *       403:
 *         description: Only admins can delete subscription plans
 *       404:
 *         description: Subscription plan not found or user not found
 *       500:
 *         description: Server error
 */

export const deleteSubscriptionPlan = async (req, res) => {
  const { id } = req.params;

  try {
    const userId = req.user.sub;

    // ✅ Check if user exists and is admin
    const [userRows] = await db.query(`SELECT role_id FROM users WHERE id = ?`, [userId]);
    if (userRows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    if (userRows[0].role_id !== 3) {
      return res.status(403).json({ error: "Only admins can delete subscription plans" });
    }

    // ✅ Check if plan exists
    const [rows] = await db.query(`SELECT * FROM subscription_plans WHERE id = ?`, [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: "Subscription plan not found" });
    }

    // ✅ Delete the plan
    await db.query(`DELETE FROM subscription_plans WHERE id = ?`, [id]);

    return res.json({ message: "Subscription plan deleted successfully" });
  } catch (error) {
    console.error("Error deleting subscription plan:", error);
    return res.status(500).json({ error: "Server error", details: error.message });
  }
};



/**
 * @swagger
 * /api/subscription-plans-benefits/{id}:
 *   put:
 *     summary: Update a plan benefit
 *     description: Only admins (role_id = 3) can update plan benefits. Partial updates are supported (only provided fields will be updated).
 *     tags:
 *       - Plan Benefits
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Plan benefit ID
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               plan_id:
 *                 type: integer
 *                 example: 1
 *               benefit_description:
 *                 type: string
 *                 example: Access to premium webinars
 *               benefit_type:
 *                 type: string
 *                 example: Feature
 *               quantity:
 *                 type: integer
 *                 example: 10
 *               notes:
 *                 type: string
 *                 example: Limited to first 10 users
 *     responses:
 *       200:
 *         description: Plan benefit updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Plan benefit updated successfully
 *                 benefit:
 *                   $ref: '#/components/schemas/PlanBenefit'
 *       400:
 *         description: No changes detected in plan benefit
 *       403:
 *         description: Only admins can update plan benefits
 *       404:
 *         description: Plan benefit not found or user not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     PlanBenefit:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         plan_id:
 *           type: integer
 *         benefit_description:
 *           type: string
 *         benefit_type:
 *           type: string
 *         quantity:
 *           type: integer
 *         notes:
 *           type: string
 */

export const updatePlanBenefit = async (req, res) => {
  const { id } = req.params;

  const useValidValue = (newVal, oldVal) => {
    return newVal !== undefined && newVal !== null && newVal !== "" ? newVal : oldVal;
  };

  try {
    const userId = req.user.sub;

    const [userRows] = await db.query(`SELECT role_id FROM users WHERE id = ?`, [userId]);
    if (userRows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const ADMIN_ROLE_ID = 3;
    if (userRows[0].role_id !== ADMIN_ROLE_ID) {
      return res.status(403).json({ error: "Only admins can update plan benefits" });
    }

    // ✅ Check if plan benefit exists
    const [rows] = await db.query(`SELECT * FROM plan_benefits WHERE id = ?`, [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: "Plan benefit not found" });
    }

    const existing = rows[0];

    // ✅ Merge with only valid values
    const updatedBenefit = {
      plan_id: useValidValue(req.body.plan_id, existing.plan_id),
      benefit_description: useValidValue(req.body.benefit_description, existing.benefit_description),
      benefit_type: useValidValue(req.body.benefit_type, existing.benefit_type),
      quantity: useValidValue(req.body.quantity, existing.quantity),
      notes: useValidValue(req.body.notes, existing.notes),
    };

    // ✅ Detect if nothing has changed
    const hasChanged = Object.entries(updatedBenefit).some(
      ([key, value]) => value !== existing[key]
    );

    if (!hasChanged) {
      return res.status(400).json({ message: "No changes detected in plan benefit" });
    }

    // ✅ Update query
    await db.query(
      `UPDATE plan_benefits 
       SET plan_id = ?, benefit_description = ?, benefit_type = ?, quantity = ?, notes = ? 
       WHERE id = ?`,
      [
        updatedBenefit.plan_id,
        updatedBenefit.benefit_description,
        updatedBenefit.benefit_type,
        updatedBenefit.quantity,
        updatedBenefit.notes,
        id,
      ]
    );

    return res.json({
      message: "Plan benefit updated successfully",
      benefit: { ...updatedBenefit, id },
    });

  } catch (error) {
    console.error(`Error updating plan benefit (ID: ${id}, User ID: ${req.user?.sub}):`, error);
    return res.status(500).json({ error: "Server error", details: error.message });
  }
};



/**
 * @swagger
 * /api/subscription-plans-benefits/{id}:
 *   delete:
 *     summary: Delete a plan benefit
 *     description: Only admins (role_id = 3) can delete plan benefits.
 *     tags:
 *       - Plan Benefits
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Plan benefit ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Plan benefit deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Plan benefit deleted successfully
 *       403:
 *         description: Only admins can delete plan benefits
 *       404:
 *         description: Plan benefit not found or user not found
 *       500:
 *         description: Server error
 */

export const deletePlanBenefit = async (req, res) => {
  const { id } = req.params;

  try {
    const userId = req.user.sub;

    // ✅ Check if user exists
    const [userRows] = await db.query(`SELECT role_id FROM users WHERE id = ?`, [userId]);
    if (userRows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const ADMIN_ROLE_ID = 3;
    if (userRows[0].role_id !== ADMIN_ROLE_ID) {
      return res.status(403).json({ error: "Only admins can delete plan benefits" });
    }

    // ✅ Check if benefit exists
    const [benefitRows] = await db.query(`SELECT * FROM plan_benefits WHERE id = ?`, [id]);
    if (benefitRows.length === 0) {
      return res.status(404).json({ error: "Plan benefit not found" });
    }

    // ✅ Perform delete
    await db.query(`DELETE FROM plan_benefits WHERE id = ?`, [id]);

    return res.json({ message: "Plan benefit deleted successfully" });
  } catch (error) {
    console.error(`Error deleting plan benefit (ID: ${id}, User ID: ${req.user?.sub}):`, error);
    return res.status(500).json({ error: "Server error", details: error.message });
  }
};


