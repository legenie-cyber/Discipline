import { registerPlugin } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

const NativeAlarm = registerPlugin('NativeAlarm');

// À appeler une fois au démarrage : sert uniquement à obtenir la permission
// de notification (Android 13+).
export const initAlarmes = () => LocalNotifications.requestPermissions();

// tache.id doit être un entier. daily: true => se répète tous les jours à la même heure
// (seule l'heure de tache.heure compte pour une alarme quotidienne).
export const programmerAlarme = (tache) =>
  NativeAlarm.schedule({
    id: tache.id,
    at: new Date(tache.heure).getTime(),
    title: 'Discipline',
    body: tache.titre,
    daily: tache.quotidien ?? true,
  });

export const annulerAlarme = (id) => NativeAlarm.cancel({ id });
export const couperSonnerie = () => NativeAlarm.stop();
