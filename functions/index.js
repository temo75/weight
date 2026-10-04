const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

admin.initializeApp();

const auth = admin.auth();
const db = admin.firestore();
const REGION = "europe-west1";
const ADMIN_EMAIL = "temo75elia@gmail.com";

function requireAdmin(request) {
  if (!request.auth || request.auth.token.admin !== true) {
    throw new HttpsError("permission-denied", "Admin only");
  }
}

exports.bootstrapAdmin = onCall({ region: REGION }, async (request) => {
  const email = String(request.auth?.token?.email || "").toLowerCase();

  if (!request.auth || email !== ADMIN_EMAIL) {
    throw new HttpsError("permission-denied", "Admin bootstrap denied");
  }

  const user = await auth.getUser(request.auth.uid);

  if (String(user.email || "").toLowerCase() !== ADMIN_EMAIL) {
    throw new HttpsError("permission-denied", "Admin bootstrap denied");
  }

  await auth.setCustomUserClaims(user.uid, {
    ...(user.customClaims || {}),
    admin: true
  });

  return { ok: true };
});

exports.adminListUsers = onCall({ region: REGION }, async (request) => {
  requireAdmin(request);

  const users = [];
  let pageToken;

  do {
    const page = await auth.listUsers(1000, pageToken);

    for (const user of page.users) {
      users.push({
        uid: user.uid,
        email: user.email || "",
        disabled: !!user.disabled,
        emailVerified: !!user.emailVerified,
        createdAt: user.metadata.creationTime || null,
        lastSignInAt: user.metadata.lastSignInTime || null
      });
    }

    pageToken = page.pageToken;
  } while (pageToken);

  return { total: users.length, users };
});

exports.adminSetDisabled = onCall({ region: REGION }, async (request) => {
  requireAdmin(request);

  const uid = String(request.data?.uid || "");
  const disabled = Boolean(request.data?.disabled);

  if (!uid) {
    throw new HttpsError("invalid-argument", "uid is required");
  }

  if (uid === request.auth.uid) {
    throw new HttpsError("failed-precondition", "You cannot disable yourself");
  }

  const user = await auth.updateUser(uid, { disabled });

  if (disabled) {
    await auth.revokeRefreshTokens(uid);
  }

  return { uid, disabled: user.disabled };
});

exports.adminDeleteUser = onCall({ region: REGION }, async (request) => {
  requireAdmin(request);

  const uid = String(request.data?.uid || "");

  if (!uid) {
    throw new HttpsError("invalid-argument", "uid is required");
  }

  if (uid === request.auth.uid) {
    throw new HttpsError("failed-precondition", "You cannot delete yourself");
  }

  await auth.deleteUser(uid);
  await db.collection("users").doc(uid).delete().catch(() => {});

  return { uid, deleted: true };
});

exports.adminSetPassword = onCall({ region: REGION }, async (request) => {
  requireAdmin(request);

  const uid = String(request.data?.uid || "");
  const password = String(request.data?.password || "");

  if (!uid) {
    throw new HttpsError("invalid-argument", "uid is required");
  }

  if (password.length < 6) {
    throw new HttpsError("invalid-argument", "Password must be at least 6 characters");
  }

  if (uid === request.auth.uid) {
    throw new HttpsError("failed-precondition", "Use normal password reset for your own account");
  }

  await auth.updateUser(uid, { password });
  await auth.revokeRefreshTokens(uid);

  return { uid, updated: true };
});
