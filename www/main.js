import { CapacitorUpdater } from '@capgo/capacitor-updater';

try {
  const { bundle } = await CapacitorUpdater.notifyAppReady();
  console.log('✅ App prête, bundle actif :', bundle.id, bundle.version, bundle.status);
} catch (e) {
  console.error('❌ notifyAppReady a échoué :', e);
}