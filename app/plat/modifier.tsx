import React, { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LoadingBlock, Screen, ScreenHeader } from '../../src/components/ui';
import { ActionSheet } from '../../src/components/ActionSheet';
import { DishForm, DishFormInitial } from '../../src/components/DishForm';
import { getDish, listIngredients, listRecipeSteps, updateDish } from '../../src/data/dishes';
import { useUnsavedChangesGuard } from '../../src/lib/unsavedChangesGuard';

export default function ModifierDish() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [initial, setInitial] = useState<DishFormInitial | null>(null);
  const [dirty, setDirty] = useState(false);
  const guard = useUnsavedChangesGuard(dirty);

  useEffect(() => {
    Promise.all([getDish(id), listIngredients(id), listRecipeSteps(id)]).then(([dish, ingredients, steps]) => {
      setInitial({
        name: dish.name,
        emoji: dish.image_emoji ?? '🍽️',
        imageUrl: dish.image_url,
        category: dish.category,
        courseType: dish.course_type,
        calories: dish.calories != null ? String(dish.calories) : '',
        protein: dish.protein_g != null ? String(dish.protein_g) : '',
        carbs: dish.carbs_g != null ? String(dish.carbs_g) : '',
        fat: dish.fat_g != null ? String(dish.fat_g) : '',
        fiber: dish.fiber_g != null ? String(dish.fiber_g) : '',
        baseServings: String(dish.base_servings ?? 4),
        prepMinutes: dish.prep_minutes != null ? String(dish.prep_minutes) : '',
        ingredients: ingredients.length
          ? ingredients.map((i) => ({
              name: i.name,
              quantity: String(i.quantity),
              unit: i.unit,
              grocery_category: i.grocery_category,
            }))
          : [{ name: '', quantity: '', unit: '', grocery_category: 'autre' }],
        steps: steps.length ? steps.map((s) => s.instruction) : [''],
        isReadyMade: dish.is_ready_made,
      });
    });
  }, [id]);

  return (
    <Screen>
      <ScreenHeader title="Modifier le plat" onBack={guard.attemptBack} />
      {!initial ? (
        <LoadingBlock />
      ) : (
        <DishForm
          initial={initial}
          submitLabel="Enregistrer les modifications"
          onDirtyChange={setDirty}
          onSubmit={async (input) => {
            await updateDish(id, input);
            router.back();
          }}
        />
      )}
      <ActionSheet
        visible={guard.visible}
        title="Quitter sans enregistrer ?"
        actions={[{ label: 'Quitter sans enregistrer', destructive: true, onPress: guard.confirmLeave }]}
        onClose={guard.cancelLeave}
      />
    </Screen>
  );
}
