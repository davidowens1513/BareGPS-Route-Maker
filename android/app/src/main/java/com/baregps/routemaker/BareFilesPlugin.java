package com.baregps.routemaker;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.util.Base64;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.*;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.*;

@CapacitorPlugin(name = "BareFiles")
public class BareFilesPlugin extends Plugin {
    private byte[] exportData;
    private boolean actionOpen;

    @PluginMethod public void shareFile(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try {
                String data = call.getString("data"), name = call.getString("name");
                if (data == null || name == null) { call.reject("Could not prepare PDF."); return; }
                File directory = new File(getContext().getCacheDir(), "routecards");
                directory.mkdirs();
                File file = File.createTempFile("route-card-", ".pdf", directory);
                try (FileOutputStream stream = new FileOutputStream(file)) { stream.write(Base64.decode(data, Base64.DEFAULT)); }
                Uri uri = androidx.core.content.FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", file);
                Intent intent = new Intent(Intent.ACTION_SEND);
                intent.setType("application/pdf");
                intent.putExtra(Intent.EXTRA_STREAM, uri);
                intent.putExtra(Intent.EXTRA_SUBJECT, name);
                intent.setClipData(android.content.ClipData.newRawUri("Route Card", uri));
                intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                getActivity().startActivity(Intent.createChooser(intent, "Share PDF"));
                call.resolve();
            } catch (Exception e) { call.reject("Could not share PDF.", e); }
        });
    }
    @PluginMethod public void shareText(PluginCall call) {
        String text = call.getString("text");
        if (text == null) { call.reject("Could not prepare the routecard."); return; }
        getActivity().runOnUiThread(() -> {
            try {
                Intent intent = new Intent(Intent.ACTION_SEND);
                intent.setType("text/plain");
                intent.putExtra(Intent.EXTRA_SUBJECT, call.getString("title", "Routecard"));
                intent.putExtra(Intent.EXTRA_TEXT, text);
                getActivity().startActivity(Intent.createChooser(intent, "Share Routecard"));
                call.resolve();
            } catch (Exception e) { call.reject("Could not share the routecard.", e); }
        });
    }
    @PluginMethod public void save(PluginCall call) {
        if (actionOpen) { call.reject("A file action is already open."); return; }
        try {
            String encoded = call.getString("data"), name = call.getString("name", "BareGPS track.gpx");
            if (encoded == null) throw new IOException("The GPX file was not prepared.");
            exportData = Base64.decode(encoded, Base64.DEFAULT);
            Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
            intent.addCategory(Intent.CATEGORY_OPENABLE); intent.setType("application/gpx+xml"); intent.putExtra(Intent.EXTRA_TITLE, name);
            actionOpen = true; startActivityForResult(call, intent, "saved");
        } catch (Exception e) { actionOpen = false; exportData = null; call.reject("Could not prepare GPX export: " + e.getMessage(), e); }
    }
    @ActivityCallback private void saved(PluginCall call, ActivityResult result) {
        actionOpen = false;
        try {
            if (call == null) return;
            if (result.getResultCode() != Activity.RESULT_OK) { call.reject("File action cancelled.", "CANCELLED"); return; }
            Uri uri = result.getData() == null ? null : result.getData().getData();
            if (uri == null || exportData == null) { call.reject("No save location was returned. Try saving again."); return; }
            try (OutputStream output = getContext().getContentResolver().openOutputStream(uri, "wt")) {
                if (output == null) throw new IOException("The location could not be written.");
                output.write(exportData); output.flush();
            }
            JSObject response = new JSObject(); response.put("saved", true); call.resolve(response);
        } catch (Exception e) { if (call != null) call.reject("Could not save GPX: " + e.getMessage() + ". Try a different location.", e); }
        finally { exportData = null; }
    }
}
