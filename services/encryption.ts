import {
    createCipheriv,
    createDecipheriv,
    randomBytes,
    scryptSync,
} from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_LEN = 32;
const IV_LEN = 16;
const TAG_LEN = 16;

function getKey(secret: string): Buffer {
    return scryptSync(secret, "github-bot-salt", KEY_LEN);
}

export function encrypt(plain: string, secret: string): string {
    const key = getKey(secret);
    const iv = randomBytes(IV_LEN);
    const cipher = createCipheriv(ALGORITHM, key, iv);
    const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decrypt(encoded: string, secret: string): string {
    const key = getKey(secret);
    const buf = Buffer.from(encoded, "base64");
    const iv = buf.subarray(0, IV_LEN);
    const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
    const enc = buf.subarray(IV_LEN + TAG_LEN);
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(enc).toString("utf8") + decipher.final("utf8");
}
