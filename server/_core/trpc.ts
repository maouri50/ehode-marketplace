import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import { hasAdminSession } from "../adminAuth";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

export const buyerSessionProcedure = t.procedure.use(
  t.middleware(async ({ ctx, next }) => {
    if (!ctx.buyer) throw new TRPCError({ code: "UNAUTHORIZED", message: "Please sign in to your buyer account." });
    return next({ ctx: { ...ctx, buyer: ctx.buyer } });
  }),
);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);

export const adminSessionProcedure = t.procedure.use(
  t.middleware(async opts => {
    if (!hasAdminSession(opts.ctx.req)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Admin session required." });
    }

    return opts.next({ ctx: opts.ctx });
  }),
);
