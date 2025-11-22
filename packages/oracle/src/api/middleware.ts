import { Request, Response, NextFunction } from "express";
import { ENV } from "../config/env.js";
import { ZodSchema } from "zod";

/**
 * Authentication middleware for admin routes
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || authHeader !== `Bearer ${ENV.WEBHOOK_SHARED_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  
  next();
}

/**
 * Validate request body against Zod schema
 */
export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error: any) {
      return res.status(400).json({
        error: "Validation failed",
        details: error.errors || error.message,
      });
    }
  };
}

/**
 * Error handler middleware
 */
export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  console.error("❌ API Error:", err);
  
  // Check if it's a known contract revert
  if (err.message.includes("execution reverted")) {
    return res.status(400).json({
      error: "Transaction would revert",
      message: err.message,
    });
  }
  
  // Check if it's a not found error
  if (err.message.includes("not found")) {
    return res.status(404).json({ error: err.message });
  }
  
  res.status(500).json({
    error: "Internal server error",
    message: err.message,
  });
}

