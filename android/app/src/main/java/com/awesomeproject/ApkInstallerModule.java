package com.awesomeproject;

import android.content.Intent;
import android.net.Uri;
import android.util.Log;
import android.os.Build;
import androidx.core.content.FileProvider;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import java.io.File;

public class ApkInstallerModule extends ReactContextBaseJavaModule {
    private final ReactApplicationContext reactContext;
    private static final String TAG = "ApkInstallerModule";

    public ApkInstallerModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @Override
    public String getName() {
        return "ApkInstaller";
    }

    @ReactMethod
    public void installApk(String filePath, Promise promise) {
        try {
            Log.d(TAG, "Attempting to install APK from path: " + filePath);
            
            File file = new File(filePath);
            if (!file.exists()) {
                Log.e(TAG, "File does not exist at path: " + filePath);
                promise.reject("FILE_NOT_FOUND", "APK file not found at: " + filePath);
                return;
            }

            Log.d(TAG, "File exists, getting URI");
            Uri apkUri;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                apkUri = FileProvider.getUriForFile(
                    reactContext,
                    reactContext.getPackageName() + ".provider",
                    file
                );
            } else {
                apkUri = Uri.fromFile(file);
            }
            
            Log.d(TAG, "Got URI: " + apkUri.toString());

            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(apkUri, "application/vnd.android.package-archive");
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            
            // Create a chooser intent
            Intent chooser = Intent.createChooser(intent, "Install APK");
            chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            
            // Grant URI permission to the package installer
            reactContext.grantUriPermission(
                "com.android.packageinstaller",
                apkUri,
                Intent.FLAG_GRANT_READ_URI_PERMISSION
            );
            
            Log.d(TAG, "Starting installation activity with chooser");
            reactContext.startActivity(chooser);
            
            // Don't resolve the promise - let the user complete the installation
            promise.resolve("INSTALLATION_STARTED");
        } catch (Exception e) {
            Log.e(TAG, "Error installing APK", e);
            promise.reject("INSTALL_ERROR", e.getMessage());
        }
    }
} 