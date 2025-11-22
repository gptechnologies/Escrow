import { Router } from "express";
import { requireAuth, validateBody } from "./middleware.js";
import {
  CreateEscrowSchema,
  BindAddressSchema,
  ResolveSchema,
} from "./types.js";
import {
  createEscrow,
  bindAddress,
  getEscrowStatus,
  resolveEscrow,
} from "../services/escrow.js";

const router = Router();

/**
 * POST /escrow/create
 * Create a new escrow contract
 */
router.post("/escrow/create", requireAuth, validateBody(CreateEscrowSchema), async (req, res, next) => {
  try {
    const result = await createEscrow({
      targetAmount: BigInt(req.body.targetAmount),
      confirmationAmount: BigInt(req.body.confirmationAmount || "1000000"),
      deadline: req.body.deadline || 0,
      tweetId: req.body.tweetId || 0,
      expectedFunder: req.body.expectedFunderAddress as `0x${string}`,
    });

    res.json({
      escrow: result.escrow,
      code: result.code,
      txHash: result.txHash,
      phase: 0,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /escrow/bind-address
 * Bind a wallet address to an escrow role
 */
router.post("/escrow/bind-address", requireAuth, validateBody(BindAddressSchema), async (req, res, next) => {
  try {
    const result = await bindAddress({
      code: req.body.code,
      role: req.body.role,
      address: req.body.address as `0x${string}`,
      confirmBy: req.body.confirmBy,
    });

    res.json({
      escrow: result.escrow,
      code: req.body.code,
      txHash: result.txHash,
      role: req.body.role,
      address: req.body.address,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /escrow/resolve
 * Resolve an escrow (PAY or REFUND)
 */
router.post("/escrow/resolve", requireAuth, validateBody(ResolveSchema), async (req, res, next) => {
  try {
    const result = await resolveEscrow({
      code: req.body.code,
      action: req.body.action,
      pollId: req.body.pollId,
      creatorEvidence: req.body.creatorEvidence,
      confirmerEvidence: req.body.confirmerEvidence,
    });

    res.json({
      escrow: result.escrow,
      code: req.body.code,
      txHash: result.txHash,
      action: req.body.action,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /escrow/status/:code
 * Get escrow status by code
 */
router.get("/escrow/status/:code", async (req, res, next) => {
  try {
    const status = await getEscrowStatus(req.params.code);
    res.json(status);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /health
 * Health check endpoint
 */
router.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

export default router;

