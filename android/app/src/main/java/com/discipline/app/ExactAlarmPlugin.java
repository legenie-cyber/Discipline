package com.discipline.app;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.core.app.NotificationCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "ExactAlarm")
public class ExactAlarmPlugin extends Plugin {

    @PluginMethod
    public void scheduleExact(PluginCall call) {
        String title = call.getString("title", "Réveil");
        String body = call.getString("body", "C'est l'heure");
        long timestamp = call.getLong("at", System.currentTimeMillis() + 60_000L);
        int id = call.getInt("id", (int) System.currentTimeMillis());

        Context context = getContext();
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !alarmManager.canScheduleExactAlarms()) {
            Intent intent = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM);
            intent.setData(Uri.parse("package:" + context.getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
            call.reject("Permission SCHEDULE_EXACT_ALARM requise.");
            return;
        }

        Intent alarmIntent = new Intent(context, AlarmReceiver.class);
        alarmIntent.setAction("com.discipline.app.ALARM_TRIGGER");
        alarmIntent.putExtra("title", title);
        alarmIntent.putExtra("body", body);
        alarmIntent.putExtra("alarmId", id);

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }

        PendingIntent pendingIntent = PendingIntent.getBroadcast(
                context,
                id,
                alarmIntent,
                flags
        );

        alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, timestamp, pendingIntent);

        JSObject ret = new JSObject();
        ret.put("scheduledAt", timestamp);
        ret.put("id", id);
        call.resolve(ret);
    }

    @PluginMethod
    public void cancel(PluginCall call) {
        int id = call.getInt("id", 0);
        Context context = getContext();
        Intent alarmIntent = new Intent(context, AlarmReceiver.class);
        alarmIntent.setAction("com.discipline.app.ALARM_TRIGGER");

        int flags = PendingIntent.FLAG_NO_CREATE;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }

        PendingIntent pendingIntent = PendingIntent.getBroadcast(context, id, alarmIntent, flags);
        if (pendingIntent != null) {
            AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            alarmManager.cancel(pendingIntent);
            pendingIntent.cancel();
        }

        call.resolve();
    }
}
