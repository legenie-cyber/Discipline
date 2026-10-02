package com.discipline.app;

import android.os.Build;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AlarmPlugin.class); // AVANT super.onCreate
        super.onCreate(savedInstanceState);
        if (Build.VERSION.SDK_INT >= 27) { // affiche l'app sur l'écran verrouillé quand l'alarme sonne
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        }
    }
}
