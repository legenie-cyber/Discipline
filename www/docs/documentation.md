# Rendre une app mobile avec Capacitor

## 1. **Installation et initialisation**

```bash
# Installe Capacitor globalement et dans le projet
npm install -g @capacitor/cli
npm install @capacitor/core @capacitor/cli
```

## 2. **Initialise Capacitor dans ton projet**

```bash
npx cap init
```

Il te demandera :
- Nom de l'app (ex: "Planing App")
- Package ID (ex: "com.example.planning")

## 3. **Ajoute les plateformes**

```bash
# Pour Android
npx cap add android

# Pour iOS (Mac uniquement)
npx cap add ios
```
Et si une plateforme n'est pas disponile
```
npm install @capacitor/android
npm install @capacitor/ios
```

## 4. **Configure ta structure**

Crée un fichier `capacitor.config.ts` à la racine si absent :

```json
{
  "appId": "com.example.planning",
  "appName": "Planing App",
  "webDir": "www",
  "server": {
    "androidScheme": "https"
  }
}
```

## 5. **Build ton app web avant chaque déploiement**

```bash
# Copie les fichiers web dans le répertoire iOS/Android
npx cap copy
```

## 6. **Ouvre dans l'IDE**

```bash
# Pour Android Studio
npx cap open android

# Pour Xcode (Mac)
npx cap open ios
```

## commande bonus pour aller plus vite (build + sync + open)
```De maniere generale quand tu ulise un moteur comme vite il faut
  npm run vite 
  npm vite build
  npx cap sync 
  npx cap open android

la commande suivante permet d'aller vite a partir de la deuxieme commande
  npx cap run android -l --external

## 7. **Ajoute les plugins Capacitor si besoin**

Pour accéder à des fonctionnalités natives (caméra, géolocalisation, etc.) :

```bash
npm install @capacitor/camera
npm install @capacitor/geolocation
# etc...
```

---

**Résumé du workflow :**
1. Développe normalement ton app web
2. `npm run build` (si tu as un build)
3. `npx cap copy` (sync les fichiers)
4. Ouvre dans Android Studio/Xcode et lance

</br>

# Plugins 

1) Plugin recommandé
- Local notifications: use `@capacitor/local-notifications` (capacitor community). Pour les push (serveur) utilisez Firebase / `@capacitor/push-notifications`. 

2) Installation
- Commandes:
```bash
npm install @capacitor/local-notifications
npx cap sync
```

3) Demander permission et planifier une notification simple
```js
import { LocalNotifications } from '@capacitor/local-notifications';

async function enablePermissions() {
  const p = await LocalNotifications.requestPermissions();
  if (p.display !== 'granted') throw new Error('Permissions non accordées');
}

async function scheduleAt(date) {
  await LocalNotifications.schedule({
    notifications: [{
      id: 1,
      title: 'Réveil',
      body: 'C\'est l\'heure',
      schedule: { at: date },    // Date JS
      smallIcon: 'ic_stat_icon', // optionnel Android
      extra: { myData: 'alarm' }
    }]
  });
}
```

4) Répéter / annuler / lister
- Répétition: certains runtimes supportent `schedule: { at: date, repeats: true }` ou `every: 'day'` selon la version du plugin.
- Annuler: `LocalNotifications.cancel({ notifications: [{ id: 1 }] })`
- Annuler tout: `LocalNotifications.cancelAll()`

5) Gérer clics / actions
```js
LocalNotifications.addListener('localNotificationActionPerformed', (event) => {
  // event.notification.extra ou event.notification.id
  // rediriger l'utilisateur ou lancer une action
});
```

6) Limitations et alarmes « précises » (Android)
- Les notifications planifiées par le système peuvent être retardées (Doze, optimisations batterie).
- Pour une alarme vraiment précise (réveil qui doit sonner à l'heure même si le device est en idle), il faut utiliser l'API Android AlarmManager (setExactAndAllowWhileIdle) et demander la permission `SCHEDULE_EXACT_ALARM` sur Android 12+.
- Options:
  - Implémenter un petit plugin natif Android (BroadcastReceiver + AlarmManager) et exposer une API JS Capacitor.
  - Chercher un plugin communautaire existant (si disponible) qui expose AlarmManager.
- iOS: utilisez les Local Notifications schedulées — iOS gère le wake behavior; pas d'équivalent direct d'AlarmManager mais les notifications programmées arrivent à l'heure sauf modes système extrêmes.

7) Conseils pratiques
- Testez sur appareil réel (les émulateurs simulent différemment Doze/optimisations).
- Utilisez `extra`/`data` pour récupérer contexte au clic.
- Pour répétitions critiques (réveil), privilégiez AlarmManager natif sur Android.






# Niveaux de build
buil web
``` cd "/home/jameshd/Bureau/-/personal workflow" && npm run build```
build android
```cd "/home/jameshd/Bureau/-/personal workflow/android" && ./gradlew assembleDebug```