import WebSocket from "ws";
import { mintSignalToken } from "../shared/video-token";
import { SignJWT } from "jose";

async function verify() {
  console.log("Verifying signaling server...");
  
  const WS_URL = "ws://localhost:4001/ws/signal";

  async function testCase(name: string, token: string | undefined, expectedCode: string, origin = "https://openordo.com") {
    return new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(WS_URL, { headers: { origin } });
      const timeout = setTimeout(() => {
        reject(new Error(`Test '${name}' timed out waiting for response`));
      }, 2000);

      ws.on("open", () => {
        // Send join without token for undefined
        ws.send(JSON.stringify({ t: "join", token }));
      });

      ws.on("message", (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.t === "error") {
          clearTimeout(timeout);
          if (expectedCode === "AUTH" && msg.code === "AUTH") {
            // Success
            ws.close();
            resolve();
          } else {
            reject(new Error(`Test '${name}' failed: Expected ${expectedCode}, got error ${msg.code}`));
          }
        } else if (msg.t === "joined") {
          clearTimeout(timeout);
          if (expectedCode === "SUCCESS") {
            ws.close();
            resolve();
          } else {
            reject(new Error(`Test '${name}' failed: Expected error ${expectedCode}, but joined successfully`));
          }
        }
      });
      
      ws.on("close", (code) => {
        // Just in case it closes without an error message
        clearTimeout(timeout);
        if (expectedCode !== "SUCCESS" && code === 4001) resolve();
      });
    });
  }

  try {
    // Test 1: Missing token -> AUTH (logged as NO_TOKEN in server)
    console.log("Testing NO_TOKEN...");
    await testCase("NO_TOKEN", undefined, "AUTH");

    // Test 2: Expired token -> AUTH (logged as EXPIRED)
    console.log("Testing EXPIRED...");
    const secret = new TextEncoder().encode(process.env.SIGNAL_JWT_SECRET!.trim());
    const expiredToken = await new SignJWT({ room: "test", role: "doctor", sub: "doc" })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt(Math.floor(Date.now() / 1000) - 3600)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 1800)
      .sign(secret);
    await testCase("EXPIRED", expiredToken, "AUTH");

    // Test 3: Wrong secret -> AUTH (logged as BAD_SIGNATURE)
    console.log("Testing BAD_SIGNATURE...");
    const wrongSecret = new TextEncoder().encode("wrongsecretwrongsecretwrongsecret!");
    const badSigToken = await new SignJWT({ room: "test", role: "doctor", sub: "doc" })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(Math.floor(Date.now() / 1000) + 3600)
      .sign(wrongSecret);
    await testCase("BAD_SIGNATURE", badSigToken, "AUTH");

    // Test 4: Real token via mintSignalToken -> SUCCESS
    console.log("Testing SUCCESS...");
    const realToken = await mintSignalToken({ room: "test", role: "doctor", sub: "doc" }, new Date(Date.now() + 3600000));
    await testCase("SUCCESS", realToken, "SUCCESS");

    // Test 5: Real token via mintSignalToken with trailing newline in env 
    // We already passed process.env.SIGNAL_JWT_SECRET to it, which we can simulate by replacing process.env.
    console.log("Testing SUCCESS with trailing newline secret...");
    const oldSecret = process.env.SIGNAL_JWT_SECRET;
    process.env.SIGNAL_JWT_SECRET = oldSecret + "\n  \t";
    const realTokenWithNewline = await mintSignalToken({ room: "test2", role: "doctor", sub: "doc2" }, new Date(Date.now() + 3600000));
    await testCase("SUCCESS with newline", realTokenWithNewline, "SUCCESS");
    process.env.SIGNAL_JWT_SECRET = oldSecret;

    console.log("All tests passed!");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

verify();
