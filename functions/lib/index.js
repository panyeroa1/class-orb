"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLiveKitToken = void 0;
const functions = require("firebase-functions");
const livekit_server_sdk_1 = require("livekit-server-sdk");
// Helper to load environment variables
const loadEnv = () => {
    const livekitApiKey = process.env.LIVEKIT_API_KEY;
    const livekitApiSecret = process.env.LIVEKIT_API_SECRET;
    if (!livekitApiKey || !livekitApiSecret) {
        throw new Error("Missing LIVEKIT_API_KEY or LIVEKIT_API_SECRET configuration");
    }
    return { livekitApiKey, livekitApiSecret };
};
exports.createLiveKitToken = functions.https.onCall(async (data, context) => {
    // Ensure user is authenticated if needed (optional for this demo)
    // if (!context.auth) {
    //   throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
    // }
    const roomName = data.roomName;
    const participantName = data.participantName;
    const userId = data.userId || participantName; // Fallback
    if (!roomName || !participantName) {
        throw new functions.https.HttpsError("invalid-argument", "roomName and participantName are required");
    }
    try {
        const { livekitApiKey, livekitApiSecret } = loadEnv();
        const at = new livekit_server_sdk_1.AccessToken(livekitApiKey, livekitApiSecret, {
            identity: userId,
            name: participantName,
        });
        at.addGrant({ roomJoin: true, room: roomName });
        const token = await at.toJwt();
        return { token };
    }
    catch (error) {
        console.error("Error creating token:", error);
        throw new functions.https.HttpsError("internal", error.message || "Internal Server Error");
    }
});
// Optional: Translate function if needed on server side (proxy)
// export const translate = functions.https.onCall(async (data, context) => { ... });
//# sourceMappingURL=index.js.map