import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { getBuyerIdentityFromRequest, type BuyerIdentity } from "../buyerAuth";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  buyer: BuyerIdentity | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;
  let buyer: BuyerIdentity | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  try {
    buyer = await getBuyerIdentityFromRequest(opts.req);
  } catch (error) {
    buyer = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
    buyer,
  };
}
