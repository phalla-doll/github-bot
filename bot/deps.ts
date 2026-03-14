import type { ConvexHttpClient } from "convex/browser";

export interface BotDeps {
    convex: ConvexHttpClient;
    encrypt: (plain: string, secret: string) => string;
    decrypt: (encoded: string, secret: string) => string;
    encryptionSecret: string;
}
