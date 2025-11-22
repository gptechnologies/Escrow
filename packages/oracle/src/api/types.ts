import { z } from "zod";

// Request schemas
export const CreateEscrowSchema = z.object({
  targetAmount: z.string().regex(/^\d+$/, "Must be a valid integer string"),
  confirmationAmount: z.string().regex(/^\d+$/, "Must be a valid integer string").optional(),
  deadline: z.number().int().nonnegative().optional(),
  tweetId: z.number().int().nonnegative().optional(),
  expectedFunderAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address"),
});

export const BindAddressSchema = z.object({
  code: z.string().min(1),
  role: z.enum(["FUNDER", "CONFIRMER"]),
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address"),
  confirmBy: z.number().int().nonnegative().optional(), // Unix timestamp for confirmer TTL
});

export const ResolveSchema = z.object({
  code: z.string().min(1),
  action: z.enum(["PAY", "REFUND"]),
  pollId: z.number().int().nonnegative().optional(),
  creatorEvidence: z.string().regex(/^0x[a-fA-F0-9]{64}$/).optional(),
  confirmerEvidence: z.string().regex(/^0x[a-fA-F0-9]{64}$/).optional(),
});

export type CreateEscrowRequest = z.infer<typeof CreateEscrowSchema>;
export type BindAddressRequest = z.infer<typeof BindAddressSchema>;
export type ResolveRequest = z.infer<typeof ResolveSchema>;

// Response types
export interface EscrowStatusResponse {
  escrow: string;
  code: string;
  phase: number;
  phaseName: string;
  expectedFunder: string | null;
  expectedConfirmer: string | null;
  funder: string | null;
  confirmer: string | null;
  network: string;
}

export interface CreateEscrowResponse {
  escrow: string;
  code: string;
  txHash: string;
  phase: number;
}

export interface BindAddressResponse {
  escrow: string;
  code: string;
  txHash: string;
  role: string;
  address: string;
}

export interface ResolveResponse {
  escrow: string;
  code: string;
  txHash: string;
  action: string;
}

