import { useEffect } from "react";
import { isEncryptionSupported, exportDevicePublicKey } from "../../utils/encryption";
import { uploadPublicKey } from "../../api/userApi";
import { isAuthSessionValid } from "../../utils/storage";

// Mounted once near the app root (see App.jsx, same pattern as
// PushNotificationListener/DeepLinkListener). Makes sure this device has an
// E2EE key pair and that its PUBLIC half is on file with the server —
// without this, the personal chat can't encrypt messages to/from this
// device at all (see src/utils/encryption.js for the full explanation).
//
// Safe to mount unconditionally: it no-ops on an unauthenticated session
// (nothing to attach the key to yet) and no-ops if Web Crypto/IndexedDB
// aren't available (falls back to plain messaging in Chat.jsx).
let uploadedThisSession = false;

export default function E2EEKeyInitializer() {
  useEffect(() => {
    if (uploadedThisSession) return;
    if (!isAuthSessionValid()) return;
    if (!isEncryptionSupported()) return;

    uploadedThisSession = true;

    exportDevicePublicKey()
      .then((publicKey) => uploadPublicKey(publicKey))
      .catch(() => {
        // Best-effort — Chat.jsx already degrades to plaintext messaging if
        // no public key ends up on file, so a failure here isn't fatal.
        uploadedThisSession = false;
      });
  }, []);

  return null;
}
