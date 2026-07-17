package com.imcircle.app;

import android.os.Bundle;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
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
    }
}
