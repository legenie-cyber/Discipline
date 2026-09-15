export class NotificationsManager {
  constructor({ actionType = 'REPLY_TYPE' } = {}) {
    this.actionType = actionType
    this.onAction = null
    this.LocalNotifications = null
    this._listener = null
  }

  async init() {
    try {
      const mod = await import('@capacitor/local-notifications')
      this.LocalNotifications = mod.LocalNotifications
    } catch (error) {
      console.warn('LocalNotifications module not available in this environment, using fallback.', error)
      this.LocalNotifications = {
        requestPermissions: async () => ({ display: 'granted' }),
        schedule: async () => ({}),
        getPending: async () => ({ notifications: [] }),
        cancel: async () => ({}),
        cancelAll: async () => ({}),
        addListener: async () => ({ remove: async () => {} }),
        registerActionTypes: async () => {}
      }
    }

    if (!this.LocalNotifications?.requestPermissions) {
      return false
    }

    const perm = await this.LocalNotifications.requestPermissions()
    if (perm.display !== 'granted') {
      console.warn('Local notification permission not granted')
    }

    if (typeof this.LocalNotifications.addListener === 'function') {
      this._listener = await this.LocalNotifications.addListener('localNotificationActionPerformed', (ev) => {
        if (ev.actionId === 'tap') {
          if (this.onAction) this.onAction({ type: 'tap', data: ev.notification?.extra ?? {} })
        } else if (ev.actionId === 'reply') {
          const inputValue = ev.inputValue ?? ''
          if (this.onAction) this.onAction({ type: 'reply', value: inputValue, data: ev.notification?.extra ?? {} })
        }
      })
    }

    if (typeof this.LocalNotifications.registerActionTypes === 'function') {
      await this.LocalNotifications.registerActionTypes({
        types: [{
          id: this.actionType,
          actions: [
            { id: 'tap', title: 'Ouvrir' },
            {
              id: 'reply',
              title: 'Programmation rapide',
              input: true,
              inputButtonTitle: 'Envoyer',
              inputPlaceholder: 'Action 1\nAction 2...'
            }
          ]
        }]
      })
    }

    return true
  }

  async sendNow({ id = Date.now(), title = '', body = '', extra = {} } = {}) {
    const at = new Date(Date.now() + 100)
    await this.LocalNotifications.schedule({
      notifications: [{
        id: Number(id),
        title,
        body,
        extra,
        schedule: { at: at.toISOString() },
        actionTypeId: this.actionType
      }]
    })
  }

  scheduleDailyAt({ id = Date.now(), title = '', body = '', hour = 19, minute = 0 } = {}) {
    const next = new Date()
    next.setHours(hour, minute, 0, 0)

    if (next <= new Date()) {
      next.setDate(next.getDate() + 1)
    }

    return this.schedule({ id, title, body, at: next, every: 'day' })
  }

  async schedule({ id = Date.now(), title = '', body = '', at, every, extra = {} } = {}) {
    const schedule = {}

    if (at) {
      schedule.at = at instanceof Date ? at : new Date(at)
    }
    if (every) {
      schedule.every = every
    }

    await this.LocalNotifications.schedule({
      notifications: [{
        id: Number(id),
        title,
        body,
        schedule,
        extra
      }]
    })
  }

  async cancel(id) {
    await this.LocalNotifications.cancel({ notifications: [{ id: Number(id) }] })
  }

  async cancelAll() {
    await this.LocalNotifications.cancelAll()
  }

  async getPending() {
    return this.LocalNotifications.getPending()
  }
}
