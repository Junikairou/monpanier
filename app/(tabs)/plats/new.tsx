import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../../src/lib/auth';
import { Screen, ScreenHeader } from '../../../src/components/ui';
import { DishForm } from '../../../src/components/DishForm';
import { createDish } from '../../../src/data/dishes';
import { replaceMeal, setMeal } from '../../../src/data/planning';
import { replaceTemplateMeal, setTemplateMeal } from '../../../src/data/template';
import { MealSlot } from '../../../src/types/models';

export default function NewDish() {
  const { session } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{
    returnDate?: string;
    returnSlot?: MealSlot;
    returnEntryId?: string;
    returnMode?: string;
    returnWeekday?: string;
  }>();

  return (
    <Screen>
      <ScreenHeader title="Nouveau plat" onBack={() => router.back()} />
      <DishForm
        submitLabel="Enregistrer le plat"
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
    </Screen>
  );
}
