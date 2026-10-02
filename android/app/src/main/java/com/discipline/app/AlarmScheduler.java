package com.discipline.app; 
import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import org.json.JSONObject;
import java.util.Calendar;
import java.util.Map;

public class AlarmScheduler {
    private static final String PREFS = "native_alarms";
    private static final int FLAGS = PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;

    private static SharedPreferences prefs(Context c) {
        return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    private static PendingIntent receiverIntent(Context c, int id, String title, String body) {
        Intent i = new Intent(c, AlarmReceiver.class);
        i.putExtra("id", id);
        i.putExtra("title", title);
        i.putExtra("body", body);
        return PendingIntent.getBroadcast(c, id, i, FLAGS);
    }

    private static void arm(Context c, int id, long at, String title, String body) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        Intent launch = c.getPackageManager().getLaunchIntentForPackage(c.getPackageName());
        PendingIntent show = PendingIntent.getActivity(c, 0, launch, FLAGS);
        // setAlarmClock : exact, traverse le mode Doze, sans permission SCHEDULE_EXACT_ALARM
        am.setAlarmClock(new AlarmManager.AlarmClockInfo(at, show), receiverIntent(c, id, title, body));
    }

    private static void store(Context c, int id, long at, String title, String body, boolean daily) {
        try {
            JSONObject o = new JSONObject()
                    .put("at", at).put("title", title).put("body", body).put("daily", daily);
            prefs(c).edit().putString(String.valueOf(id), o.toString()).apply();
        } catch (Exception ignored) {}
    }

    /** Prochaine occurrence quotidienne strictement dans le futur (même heure chaque jour). */
    private static long nextDaily(long at) {
        Calendar cal = Calendar.getInstance();
        cal.setTimeInMillis(at);
        long now = System.currentTimeMillis();
        while (cal.getTimeInMillis() <= now) cal.add(Calendar.DAY_OF_YEAR, 1);
        return cal.getTimeInMillis();
    }

    public static void schedule(Context c, int id, long at, String title, String body, boolean daily) {
        if (daily && at <= System.currentTimeMillis()) at = nextDaily(at);
        store(c, id, at, title, body, daily);
        arm(c, id, at, title, body);
    }

    public static void cancel(Context c, int id) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        am.cancel(receiverIntent(c, id, "", ""));
        prefs(c).edit().remove(String.valueOf(id)).apply();
    }

    /** Appelé quand l'alarme se déclenche : replanifie demain si quotidienne, sinon l'oublie. */
    public static void onFired(Context c, int id) {
        String raw = prefs(c).getString(String.valueOf(id), null);
        if (raw == null) return;
        try {
            JSONObject o = new JSONObject(raw);
            if (o.optBoolean("daily", false)) {
                long next = nextDaily(o.getLong("at"));
                String title = o.getString("title"), body = o.getString("body");
                store(c, id, next, title, body, true);
                arm(c, id, next, title, body);
            } else {
                prefs(c).edit().remove(String.valueOf(id)).apply();
            }
        } catch (Exception ignored) {}
    }

    /** Appelé après un redémarrage du téléphone. */
    public static void rescheduleAll(Context c) {
        long now = System.currentTimeMillis();
        for (Map.Entry<String, ?> e : prefs(c).getAll().entrySet()) {
            try {
                JSONObject o = new JSONObject((String) e.getValue());
                int id = Integer.parseInt(e.getKey());
                long at = o.getLong("at");
                boolean daily = o.optBoolean("daily", false);
                String title = o.getString("title"), body = o.getString("body");
                if (daily) {
                    if (at <= now) at = nextDaily(at);
                    store(c, id, at, title, body, true);
                    arm(c, id, at, title, body);
                } else if (at > now) {
                    arm(c, id, at, title, body);
                } else {
                    prefs(c).edit().remove(e.getKey()).apply();
                }
            } catch (Exception ignored) {}
        }
    }
}
