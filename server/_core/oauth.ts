import { COOKIE_NAME, ONE_YEAR_MS, OAUTH_STATE_COOKIE, decodeOAuthState } from "@shared/const";
import { parse as parseCookieHeader } from "cookie";
import * as db from "../db";
import { clearResponseCookie, getSessionCookieOptions, setResponseCookie } from "./cookies";
import type { HeaderResponse } from "./cookies";
import { sdk } from "./sdk";

export function getQueryParam(req: { url?: string }, key: string): string | undefined {
  const value = new URL(req.url ?? "", "https://ehode.local").searchParams.get(key);
  return value ?? undefined;
}

function asHeaderString(value: string | string[] | undefined) {
  return Array.isArray(value) ? value.join(";") : value ?? "";
}

type OAuthRequest = {
  url?: string;
  headers: Record<string, string | string[] | undefined>;
  protocol?: string;
};

type OAuthResponse = HeaderResponse & {
  status: (code: number) => OAuthResponse;
  json: (body: unknown) => unknown;
  redirect: (status: number, path: string) => unknown;
};

type OAuthRouteApplication = {
  get: (path: string, handler: (req: OAuthRequest, res: OAuthResponse) => Promise<void>) => unknown;
};

function getOAuthRouteApplication(app: unknown): OAuthRouteApplication {
  if (!app || typeof (app as { get?: unknown }).get !== "function") {
    throw new Error("OAuth route registration requires an application with a GET route handler");
  }
  return app as OAuthRouteApplication;
}

export function registerOAuthRoutes(app: unknown) {
  const routes = getOAuthRouteApplication(app);
  routes.get("/api/oauth/callback", async (req: OAuthRequest, res: OAuthResponse) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    // CSRF guard: the nonce in `state` must match the one-time cookie that
    // startLogin set in the browser that began this login. An attacker can
    // forge `state`, but cannot plant this cookie in the victim's browser.
    const { nonce } = decodeOAuthState(state);
    const expectedNonce = parseCookieHeader(asHeaderString(req.headers.cookie))[OAUTH_STATE_COOKIE];
    if (!nonce || nonce !== expectedNonce) {
      res.status(403).json({ error: "invalid oauth state" });
      return;
    }
    clearResponseCookie(res, OAUTH_STATE_COOKIE, { path: "/", secure: true, sameSite: "none" });

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      setResponseCookie(res, COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}
