import { createHmac } from "node:crypto";

export interface TelegramWebAppUser {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
    is_premium?: boolean;
}

export function verifyTelegramWebAppInitData(
    initData: string,
    botToken: string,
): { user: TelegramWebAppUser } | null {
    if (!initData?.trim()) return null;
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash) return null;
    params.delete("hash");
    const dataCheckString = [...params.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}=${v}`)
        .join("\n");
    const secretKey = createHmac("sha256", "WebAppData")
        .update(botToken)
        .digest();
    const computed = createHmac("sha256", secretKey)
        .update(dataCheckString)
        .digest("hex");
    if (computed !== hash) return null;
    const userRaw = params.get("user");
    if (!userRaw) return null;
    try {
        const user = JSON.parse(userRaw) as TelegramWebAppUser;
        if (typeof user?.id !== "number") return null;
        return { user };
    } catch {
        return null;
    }
}
