import { SignJWT, jwtVerify } from 'jose';

export interface TokenClaims {
  room: string;
  role: "doctor" | "patient";
  sub: string;
}

export function getSecretBytes(): Uint8Array {
  const secret = process.env.SIGNAL_JWT_SECRET;
  if (!secret || secret.trim().length < 32) {
    throw new Error("Video service not configured: SIGNAL_JWT_SECRET missing or too short");
  }
  return new TextEncoder().encode(secret.trim());
}

export async function mintSignalToken(claims: TokenClaims, closesAtUTC: Date): Promise<string> {
  const secret = getSecretBytes();
  const exp = Math.floor(closesAtUTC.getTime() / 1000);
  
  const iat = Math.floor(Date.now() / 1000) - 30; 
  
  return await new SignJWT({ ...claims })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(iat)
    .setNotBefore(iat)
    .setExpirationTime(exp)
    .sign(secret);
}

export async function verifySignalToken(token: string): Promise<TokenClaims & { exp: number }> {
  const secret = getSecretBytes();
  const { payload } = await jwtVerify(token, secret, {
    algorithms: ['HS256'],
    clockTolerance: 30,
  });
  return payload as unknown as TokenClaims & { exp: number };
}
