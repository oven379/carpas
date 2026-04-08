package ru.carpassport.app;

import android.os.Bundle;
import android.util.Log;
import android.webkit.WebView;
import androidx.core.splashscreen.SplashScreen;
import com.getcapacitor.BridgeActivity;
import com.google.firebase.FirebaseApp;

public class MainActivity extends BridgeActivity {

    private static final String TAG = "MainActivity";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        SplashScreen.installSplashScreen(this);
        /*
         * PushNotifications.register() вызывает FirebaseMessaging.getInstance() до того,
         * как FirebaseInitProvider успевает поднять default app (или без google-services.json).
         * Явная инициализация по строкам из res/values/firebase_defaults.xml.
         */
        try {
            if (FirebaseApp.getApps(this).isEmpty()) {
                FirebaseApp.initializeApp(this);
            }
        } catch (Exception e) {
            Log.w(TAG, "Firebase initializeApp skipped or failed; push register may error until google-services.json is added", e);
        }
        super.onCreate(savedInstanceState);
        if (BuildConfig.DEBUG) {
            WebView.setWebContentsDebuggingEnabled(true);
        }
    }
}
