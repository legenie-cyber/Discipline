package com.discipline.app;

import android.content.Intent;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "NativeAlarm")
public class AlarmPlugin extends Plugin {

    @PluginMethod
    public void schedule(PluginCall call) {
        Integer id = call.getInt("id");
        Double at = call.getDouble("at"); // timestamp en ms
        if (id == null || at == null) { call.reject("id et at sont requis"); return; }
        AlarmScheduler.schedule(getContext(), id, at.longValue(),
                call.getString("title", "Alarme"), call.getString("body", ""),
                Boolean.TRUE.equals(call.getBoolean("daily", false)));
        call.resolve();
    }

    @PluginMethod
    public void cancel(PluginCall call) {
        Integer id = call.getInt("id");
        if (id == null) { call.reject("id requis"); return; }
        AlarmScheduler.cancel(getContext(), id);
        call.resolve();
    }

    /** Coupe la sonnerie en cours (ex. quand l'utilisateur ouvre la tâche). */
    @PluginMethod
    public void stop(PluginCall call) {
        getContext().stopService(new Intent(getContext(), AlarmService.class));
        call.resolve();
    }
}
