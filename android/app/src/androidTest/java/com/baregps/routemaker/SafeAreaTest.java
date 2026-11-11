package com.baregps.routemaker;

import android.graphics.Rect;
import android.view.View;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.json.JSONObject;
import org.junit.Test;
import org.junit.runner.RunWith;
import static org.junit.Assert.*;

@RunWith(AndroidJUnit4.class)
public class SafeAreaTest {
    private String evaluate(MainActivity activity, String script) throws Exception {
        AtomicReference<String> result = new AtomicReference<>();
        CountDownLatch ready = new CountDownLatch(1);
        InstrumentationRegistry.getInstrumentation().runOnMainSync(() ->
            activity.getBridge().getWebView().evaluateJavascript(script, value -> { result.set(value); ready.countDown(); })
        );
        assertTrue("JavaScript response timed out", ready.await(10, TimeUnit.SECONDS));
        return result.get();
    }

    @Test public void nativeViewportAndExpandedControlsStayAboveNavigation() throws Exception {
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            AtomicReference<MainActivity> reference = new AtomicReference<>();
            scenario.onActivity(reference::set);
            MainActivity activity = reference.get();
            boolean loaded = false;
            for (int i = 0; i < 60; i++) {
                if ("true".equals(evaluate(activity,"!!document.querySelector('#expand-card')"))) { loaded = true; break; }
                Thread.sleep(100);
            }
            assertTrue("Route Maker did not load",loaded);
            InstrumentationRegistry.getInstrumentation().waitForIdleSync();
            scenario.onActivity(current -> {
                View decor = current.getWindow().getDecorView();
                WindowInsetsCompat insets = ViewCompat.getRootWindowInsets(decor);
                assertNotNull(insets);
                Insets bars = insets.getInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
                Rect web = new Rect();
                current.getBridge().getWebView().getGlobalVisibleRect(web);
                android.util.Log.i("BareGPSSafeAreaTest", "web="+web+" windowHeight="+decor.getHeight()+" navigationBottom="+bars.bottom);
                assertTrue("WebView extends under navigation bar: "+web,web.bottom <= decor.getHeight()-bars.bottom);
                assertTrue("WebView extends under status bar: "+web,web.top >= bars.top);
            });
            evaluate(activity,"document.querySelector('#expand-card').click();true");
            JSONObject card = new JSONObject(evaluate(activity,"({height:innerHeight,bottom:document.querySelector('#create-pdf').getBoundingClientRect().bottom})"));
            assertTrue("Expanded share control leaves the viewport",card.getDouble("bottom") <= card.getDouble("height"));
            evaluate(activity,"document.querySelector('#expand').click();true");
            JSONObject map = new JSONObject(evaluate(activity,"({height:innerHeight,bottom:document.querySelector('#descent').getBoundingClientRect().bottom})"));
            assertTrue("Expanded map metric leaves the viewport",map.getDouble("bottom") <= map.getDouble("height"));
        }
    }
}
