package com.discipline.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import androidx.core.content.ContextCompat;

public class AlarmReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context c, Intent intent) {
        AlarmScheduler.onFired(c, intent.getIntExtra("id", 0)); // replanifie demain si quotidienne
        Intent s = new Intent(c, AlarmService.class);
        s.putExtras(intent);
        ContextCompat.startForegroundService(c, s);
    }
}
