import "dotenv/config";
import { ConvexHttpClient } from "convex/browser";
import * as encryption from "../services/encryption";
import type { BotDeps } from "./deps";
import { createBot } from "./telegram";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CONVEX_URL = process.env.CONVEX_URL;
const ENCRYPTION_SECRET = process.env.ENCRYPTION_SECRET;

if (!TELEGRAM_BOT_TOKEN) {
    console.error("Missing TELEGRAM_BOT_TOKEN");
    process.exit(1);
}
if (!CONVEX_URL) {
    console.error("Missing CONVEX_URL. Run `npx convex dev` to configure.");
    process.exit(1);
}
if (!ENCRYPTION_SECRET) {
    console.error("Missing ENCRYPTION_SECRET");
    process.exit(1);
}

const convex = new ConvexHttpClient(CONVEX_URL);
const deps: BotDeps = {
    convex,
    encrypt: encryption.encrypt,
    decrypt: encryption.decrypt,
    encryptionSecret: ENCRYPTION_SECRET,
};

const MINI_APP_URL = process.env.MINI_APP_URL;
const bot = createBot(TELEGRAM_BOT_TOKEN, deps);
bot.launch().then(async () => {
    console.log("Bot running");
    if (MINI_APP_URL) {
        try {
            await bot.telegram.setChatMenuButton({
                menu_button: {
                    type: "web_app",
                    text: "Open App",
                    web_app: { url: MINI_APP_URL },
                },
            });
        } catch (e) {
            console.warn("setChatMenuButton failed", e);
        }
    }
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
