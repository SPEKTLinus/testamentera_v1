import { NextRequest, NextResponse } from "next/server";
import type { WillDraft } from "./types";
import { getRequestIp } from "./requestIp";
import { takeRateSlot, RATE_AI, RATE_CLAUDE } from "./apiRateLimit";
import { parseWillAccessToken } from "./willAccessToken";
import { toE164Digits } from "./phone";

export function anthropicRateLimitResponse(): NextResponse {
  return NextResponse.json(
    {
      error:
        "För många förfrågningar från samma anslutning. Vänta en stund och försök igen.",
      code: "RATE_LIMIT_IP",
    },
    { status: 429 }
  );
}

/**
 * Protect costly Anthropic routes: per-IP rate limit + (in production) signed token
 * tied to verifiedPhone. Paid drafts skip token so återkommande användare inte låses ute
 * om lokalt token saknas (klientens paid-flagga är inte serververifierad — se framtida DB).
 */
export function assertAnthropicAccess(req: NextRequest, draft: WillDraft | undefined): NextResponse | null {
  const ip = getRequestIp(req);
  if (!takeRateSlot(`ai:${ip}`, RATE_AI.max, RATE_AI.windowMs)) {
    return anthropicRateLimitResponse();
  }

  const phone = toE164Digits(draft?.verifiedPhone ?? "");
  if (!phone) {
    return NextResponse.json(
      {
        error: "Saknar verifierat mobilnummer. Börja om från startsidan.",
        code: "NEED_PHONE",
      },
      { status: 403 }
    );
  }

  if (!process.env.WILL_ACCESS_SECRET?.trim()) {
    return null;
  }

  /** Huvudtestamente betalt eller brev-tillägg betalt — undvik låsning utan token i lokalt utkast. */
  if (draft?.paid === true || draft?.paidLetter === true) {
    return null;
  }

  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  const token = bearer || draft?.willAccessToken?.trim();
  if (!token) {
    return NextResponse.json(
      {
        error: "Saknar åtkomstbevis. Ladda om sidan eller ange mobilnummer igen.",
        code: "NEED_TOKEN",
      },
      { status: 403 }
    );
  }

  const parsed = parseWillAccessToken(token);
  if (!parsed || parsed.phone !== phone) {
    return NextResponse.json(
      {
        error: "Ogiltigt eller utgånget åtkomstbevis. Ange mobilnummer igen på startsidan.",
        code: "BAD_TOKEN",
      },
      { status: 403 }
    );
  }

  return null;
}

export function assertClaudeRouteAccess(req: NextRequest): NextResponse | null {
  const ip = getRequestIp(req);
  if (!takeRateSlot(`claude:${ip}`, RATE_CLAUDE.max, RATE_CLAUDE.windowMs)) {
    return anthropicRateLimitResponse();
  }
  return null;
}
