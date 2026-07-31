import React, { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../../src/lib/auth';
import { Screen, ScreenHeader } from '../../../src/components/ui';
import { ActionSheet } from '../../../src/components/ActionSheet';
import { DishForm, EMPTY_DISH_FORM_INITIAL } from '../../../src/components/DishForm';
import { createDish } from '../../../src/data/dishes';
import { replaceMeal, setMeal } from '../../../src/data/planning';
import { replaceTemplateMeal, setTemplateMeal } from '../../../src/data/template';
import { useUnsavedChangesGuard } from '../../../src/lib/unsavedChangesGuard';
import { Category, MealSlot } from '../../../src/types/models';

export default function NewDish() {
  const { session } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{
    returnDate?: string;
    returnSlot?: MealSlot;
    returnEntryId?: string;
    returnMode?: string;
    returnWeekday?: string;
    initialCategory?: Category;
  }>();
  const [dirty, setDirty] = useState(false);
  const guard = useUnsavedChangesGuard(dirty);

  return (
    <Screen>
      <ScreenHeader title="Nouveau plat" onBack={() => router.back()} />
      <DishForm
        initial={params.initialCategory ? { ...EMPTY_DISH_FORM_INITIAL, category: params.initialCategory } : undefined}
        submitLabel="Enregistrer le plat"
        onDirtyChange={setDirty}
        onSubmit={async (input) => {
          const userId = session!.user.id;
          const dish = await createDish(userId, input);
          if (params.returnSlot) {
            if (params.returnMode === 'template') {
              if (params.returnEntryId) {
                await replaceTemplateMeal(params.returnEntryId, dish);
              } else {
                await setTemplateMeal(userId, Number(params.returnWeekday), params.returnSlot, dish);
              }
            } else if (params.returnEntryId) {
              await replaceMeal(userId, params.returnEntryId, dish);
            } else if (params.returnDate) {
              await setMeal(userId, params.returnDate, params.returnSlot, dish);
            }
            router.back();
            router.back();
          } else {
            router.back();
          }
        }}
      />
      <ActionSheet
        visible={guard.visible}
        title="Quitter sans enregistrer ?"
        actions={[{ label: 'Quitter sans enregistrer', destructive: true, onPress: guard.confirmLeave }]}
        onClose={guard.cancelLeave}
      />
    </Screen>
  );
}
