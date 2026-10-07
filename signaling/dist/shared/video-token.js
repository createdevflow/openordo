"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSecretBytes = getSecretBytes;
exports.mintSignalToken = mintSignalToken;
exports.verifySignalToken = verifySignalToken;
const jose_1 = require("jose");
function getSecretBytes() {
    const secret = process.env.SIGNAL_JWT_SECRET;
    if (!secret || secret.trim().length < 32) {
        throw new Error("Video service not configured: SIGNAL_JWT_SECRET missing or too short");
    }
    return new TextEncoder().encode(secret.trim());
}
async function mintSignalToken(claims, closesAtUTC) {
    const secret = getSecretBytes();
    const exp = Math.floor(closesAtUTC.getTime() / 1000);
    const iat = Math.floor(Date.now() / 1000) - 30;
    return await new jose_1.SignJWT({ ...claims })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt(iat)
        .setNotBefore(iat)
        .setExpirationTime(exp)
        .sign(secret);
}
async function verifySignalToken(token) {
    const secret = getSecretBytes();
    const { payload } = await (0, jose_1.jwtVerify)(token, secret, {
        algorithms: ['HS256'],
        clockTolerance: 30,
    });
    return payload;
}
