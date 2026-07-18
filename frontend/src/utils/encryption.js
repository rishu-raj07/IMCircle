// End-to-end encryption for the personal (1:1) DM chat only — NOT the
// community/circle chat, which stays as-is.
//
// How it works: each device generates its own ECDH (P-256) key pair the
// first time this runs (see E2EEKeyInitializer.jsx, mounted once near the
// app root). The private key lives ONLY in this device's IndexedDB — it is
// never sent anywhere, including to our own server. The public key IS
// uploaded (PUT /users/me/public-key) so other users' devices can look it
// up (it already comes back attached to conversation participants / message
// senders — see message.controller.js's userPopulateFields).
//
// For a given conversation, both sides derive the exact same AES-256-GCM
// key via ECDH(myPrivateKey, theirPublicKey) === ECDH(theirPrivateKey,
// myPublicKey) — without ever transmitting that shared key itself. That key
// encrypts every message in both directions.
//
// Known trade-offs, on purpose given the scope of this feature:
//  - No forward secrecy / per-message key rotation (that would need a full
//    Double Ratchet, like Signal) — the same derived key is reused for the
//    whole conversation history with this key pair.
//  - No multi-device key sync or backup: logging in on a new device (or
//    clearing app data) generates a fresh key pair, and old messages
//    encrypted under the previous key become undecryptable on the new
//    device. This is the same trade-off most E2EE chat apps make without an
//    explicit backup passphrase flow.
//  - Only message TEXT is encrypted in this version — voice note
//    attachments are unaffected.

const DB_NAME = "imcircle-e2ee";
const DB_VERSION = 1;
const STORE_NAME = "keys";
const KEY_RECORD_ID = "device-keypair";

function openDb() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error("IndexedDB unsupported"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function idbGet(key) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(key, value) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function isEncryptionSupported() {
  return Boolean(window.crypto?.subtle && window.indexedDB);
}

let cachedKeyPairPromise = null;

// Generates (once per device, ever) or loads this device's ECDH key pair.
// Cached in memory after the first real lookup so repeated calls in the
// same tab session don't keep hitting IndexedDB.
export function getOrCreateDeviceKeyPair() {
  if (cachedKeyPairPromise) return cachedKeyPairPromise;

  cachedKeyPairPromise = (async () => {
    const stored = await idbGet(KEY_RECORD_ID);
    if (stored?.publicKey && stored?.privateKey) return stored;

    const keyPair = await crypto.subtle.generateKey(
      { name: "ECDH", namedCurve: "P-256" },
      true,
      ["deriveKey"]
    );

    await idbSet(KEY_RECORD_ID, keyPair);
    return keyPair;
  })();

  return cachedKeyPairPromise;
}

function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function base64ToBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

// This device's public key, as a base64 string safe to PUT to the server.
export async function exportDevicePublicKey() {
  const { publicKey } = await getOrCreateDeviceKeyPair();
  const jwk = await crypto.subtle.exportKey("jwk", publicKey);
  return btoa(JSON.stringify(jwk));
}

function importPublicKeyFromBase64(base64Jwk) {
  const jwk = JSON.parse(atob(base64Jwk));
  return crypto.subtle.importKey("jwk", jwk, { name: "ECDH", namedCurve: "P-256" }, true, []);
}

const sharedKeyCache = new Map();

async function getSharedKey(theirPublicKeyBase64) {
  if (!theirPublicKeyBase64) return null;
  if (sharedKeyCache.has(theirPublicKeyBase64)) return sharedKeyCache.get(theirPublicKeyBase64);

  const { privateKey } = await getOrCreateDeviceKeyPair();
  const theirPublicKey = await importPublicKeyFromBase64(theirPublicKeyBase64);

  const sharedKey = await crypto.subtle.deriveKey(
    { name: "ECDH", public: theirPublicKey },
    privateKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );

  sharedKeyCache.set(theirPublicKeyBase64, sharedKey);
  return sharedKey;
}

// Encrypts `plaintext` for a specific other user (identified by their
// base64 public key). Returns { ciphertext, iv } — both base64 strings,
// ready to send to the API as-is.
export async function encryptForRecipient(theirPublicKeyBase64, plaintext) {
  const key = await getSharedKey(theirPublicKeyBase64);
  if (!key) throw new Error("No recipient public key available");

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);

  const ciphertextBuffer = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);

  return {
    ciphertext: bufferToBase64(ciphertextBuffer),
    iv: bufferToBase64(iv.buffer),
  };
}

// Decrypts a { ciphertext, iv } pair exchanged with a specific other user.
// Works for messages YOU sent too — the derived shared key is symmetric
// (ECDH is commutative), so no separate "sent" copy needs to be stored.
export async function decryptFromUser(theirPublicKeyBase64, encryptedContent) {
  const key = await getSharedKey(theirPublicKeyBase64);
  if (!key) throw new Error("No recipient public key available");

  const plainBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBuffer(encryptedContent.iv) },
    key,
    base64ToBuffer(encryptedContent.ciphertext)
  );

  return new TextDecoder().decode(plainBuffer);
}
