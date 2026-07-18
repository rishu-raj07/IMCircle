package com.imcircle.app;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.webkit.PermissionRequest;
import androidx.annotation.NonNull;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;

public class MainActivity extends BridgeActivity {
    private static final int RECORD_AUDIO_REQUEST_CODE = 7001;

    // Held here only while the OS permission dialog is up — the WebView's
    // getUserMedia() promise simply stays pending until grant()/deny() is
    // finally called on it below, which is the normal/expected behavior for
    // an async WebView permission request.
    private PermissionRequest pendingAudioPermissionRequest;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Android 15 (API 35) and up force edge-to-edge display by default
        // for apps targeting that SDK or higher (this app targets 36) — the
        // WebView draws underneath the status bar regardless of the
        // StatusBar plugin's `overlaysWebView: false` setting in
        // capacitor.config.ts, which only reliably worked on Android 14 and
        // below. On devices where the OS forces this, header buttons (menu,
        // search, notifications) render partly behind the status bar and
        // become unreliable to tap — this only shows up on newer-OS devices,
        // never all of them, which is exactly the "only on some devices"
        // behavior reported. Explicitly forcing `setDecorFitsSystemWindows`
        // back to true here restores the old, predictable behavior on every
        // Android version: the system reserves real space for the status
        // bar and the WebView always starts below it.
        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);

        // Voice messages (Chat.jsx / CircleCommunity.jsx) call the web
        // navigator.mediaDevices.getUserMedia({audio:true}) API directly.
        // Inside an embedded WebView, that's a two-part permission: the
        // WebView itself has to grant the page's media-capture request
        // (WebChromeClient.onPermissionRequest — never fires by default,
        // which is why the mic button previously did nothing at all), AND
        // Android's OS-level RECORD_AUDIO runtime permission has to already
        // be granted. Subclassing Capacitor's own BridgeWebChromeClient
        // (rather than replacing it outright) means every other permission
        // request — camera/file uploads for post images, avatar picker,
        // etc. — still goes through Capacitor's normal handling via
        // super.onPermissionRequest(); this only intercepts the audio case.
        getBridge().getWebView().setWebChromeClient(new BridgeWebChromeClient(getBridge()) {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                for (String resource : request.getResources()) {
                    if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource)) {
                        runOnUiThread(() -> {
                            if (ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.RECORD_AUDIO)
                                    == PackageManager.PERMISSION_GRANTED) {
                                request.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
                            } else {
                                // Don't grant/deny yet — that was the original bug.
                                // Calling request.grant() here before the OS dialog
                                // below is even answered is a race that let the
                                // WebView think it had mic access it didn't
                                // actually have yet, so getUserMedia would still
                                // fail. Wait for the real answer instead.
                                pendingAudioPermissionRequest = request;
                                ActivityCompat.requestPermissions(
                                        MainActivity.this,
                                        new String[]{Manifest.permission.RECORD_AUDIO},
                                        RECORD_AUDIO_REQUEST_CODE
                                );
                            }
                        });
                        return;
                    }
                }
                super.onPermissionRequest(request);
            }
        });
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);

        if (requestCode == RECORD_AUDIO_REQUEST_CODE && pendingAudioPermissionRequest != null) {
            boolean granted = grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED;

            if (granted) {
                pendingAudioPermissionRequest.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
            } else {
                pendingAudioPermissionRequest.deny();
            }

            pendingAudioPermissionRequest = null;
        }
    }
}
