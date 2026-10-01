import { NotificationsManager } from './notifications.js';

export class AlarmManager {
  constructor() {
    this.notifs = new NotificationsManager();
    this.onAction = null;
  }

  async init() {
    await this.notifs.init();
    this.notifs.onAction = (payload) => {
      if (this.onAction) this.onAction(payload);
    };
  }

  scheduleDailyAt({ id = Date.now(), title = 'Alarm', body = '', hour = 19, minute = 0 } = {}) {
    const next = new Date();
    next.setHours(hour, minute, 0, 0);

    if (next <= new Date()) {
      next.setDate(next.getDate() + 1);
    }

    return this.scheduleAlarm({ id, title, body, at: next });
  }

  // Schedule an alarm. Attempts to call a native ExactAlarm plugin when available.
  // Fallback: uses LocalNotifications (timing may be imprecise under Doze).
  async scheduleAlarm({ id = Date.now(), title = 'Alarm', body = '', at }) {
    const iso = (at instanceof Date) ? at.toISOString() : new Date(at).toISOString();

    const Capacitor = (typeof window !== 'undefined' && window.Capacitor) ? window.Capacitor : null;
    const plugin = Capacitor?.Plugins?.ExactAlarm;
    if (plugin && typeof plugin.scheduleExact === 'function') {
      try {
        await plugin.scheduleExact({ id: Number(id), title, body, at: iso });
        return { ok: true, mode: 'native' };
      } catch (e) {
        console.warn('ExactAlarm plugin failed, falling back to LocalNotifications', e);
      }
    }

    console.warn('Using LocalNotifications fallback — timing may be imprecise on Android');
    await this.notifs.schedule({ id, title, body, at });
    return { ok: true, mode: 'local-fallback' };
  }

  async cancelAlarm(id) {
    if (this.notifs && this.notifs.cancel) {
      await this.notifs.cancel(id);
    }

    const Capacitor = (typeof window !== 'undefined' && window.Capacitor) ? window.Capacitor : null;
    try {
      await Capacitor?.Plugins?.ExactAlarm?.cancel({ id: Number(id) });
    } catch (e) {
      console.warn('Unable to cancel alarm via native plugin', e);
    }
  }
}
