import { useEffect } from 'react';
import { listPlanningRange } from '../data/planning';
import { toIso } from './dates';
import { getMealTimes, getNotificationsEnabled, maybeFireReminder, notificationsSupported } from './notifications';
import { useTaxonomies } from './taxonomies';

function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
}

function minutesToHHMM(total: number): string {
  const h = Math.floor(((total % 1440) + 1440) % 1440 / 60);
  const m = ((total % 60) + 60) % 60;
  return `${String(h).padStart(2, '0')}h${String(m).padStart(2, '0')}`;
}

// Rappel de préparation de repas : vérifie toutes les minutes, tant que
// l'onglet reste ouvert, si l'heure de commencer à cuisiner est atteinte pour
// un repas planifié aujourd'hui. Limite connue : pas de notification "push"
// en arrière-plan (nécessiterait un serveur) — ne fonctionne que si l'app est
// ouverte dans un onglet au moment voulu.
export function useMealReminders(userId: string | null): void {
  const { label } = useTaxonomies();

  useEffect(() => {
    if (!userId || !notificationsSupported()) return;

    const check = async () => {
      const enabled = await getNotificationsEnabled();
      if (!enabled) return;
      const times = await getMealTimes();
      if (Object.keys(times).length === 0) return;

      const now = new Date();
      const todayIso = toIso(now);
      const nowMinutes = now.getHours() * 60 + now.getMinutes();

      const entries = await listPlanningRange(userId, todayIso, todayIso);
      const bySlot = new Map<string, typeof entries>();
      for (const e of entries) {
        if (e.is_restaurant || !e.dish) continue;
        const list = bySlot.get(e.slot) ?? [];
        list.push(e);
        bySlot.set(e.slot, list);
      }

      for (const [slot, slotEntries] of bySlot) {
        const mealTime = times[slot];
        if (!mealTime) continue;
        const mealMinutes = hhmmToMinutes(mealTime);
        const maxPrep = Math.max(0, ...slotEntries.map((e) => e.dish?.prep_minutes ?? 0));
        const startMinutes = mealMinutes - maxPrep;
        if (nowMinutes >= startMinutes && nowMinutes < mealMinutes) {
          const dishNames = slotEntries.map((e) => e.dish!.name).join(', ');
          await maybeFireReminder(
            todayIso,
            slot,
            `C'est l'heure de préparer ${label('meal_slot', slot)}`,
            maxPrep > 0
              ? `${dishNames} — prévoir ${maxPrep} min pour être prêt à ${minutesToHHMM(mealMinutes)}`
              : `${dishNames} — prévu à ${minutesToHHMM(mealMinutes)}`,
          );
        }
      }
    };

    check();
    const interval = setInterval(check, 60000);
    return () => clearInterval(interval);
  }, [userId, label]);
}
