import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { clearAdminSession, hasAdminSession, isAdminPasswordConfigured, setAdminSession, verifyAdminPassword } from "../adminAuth";
import { publicProcedure, router } from "../_core/trpc";

export const adminAuthRouter = router({
  status: publicProcedure.query(({ ctx }) => ({ configured: isAdminPasswordConfigured(), authenticated: hasAdminSession(ctx.req) })),
  login: publicProcedure.input(z.object({ password: z.string().min(1).max(256) })).mutation(({ ctx, input }) => {
    if (!isAdminPasswordConfigured()) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Admin password is not configured." });
    if (!verifyAdminPassword(input.password)) throw new TRPCError({ code: "UNAUTHORIZED", message: "Incorrect admin password." });
    setAdminSession(ctx);
    return { success: true } as const;
  }),
  logout: publicProcedure.mutation(({ ctx }) => {
    clearAdminSession(ctx);
    return { success: true } as const;
  }),
});
