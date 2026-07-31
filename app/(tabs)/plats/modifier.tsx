import React, { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LoadingBlock, Screen, ScreenHeader } from '../../../src/components/ui';
import { DishForm, DishFormInitial } from '../../../src/components/DishForm';
import { getDish, listIngredients, listRecipeSteps, updateDish } from '../../../src/data/dishes';

export default function ModifierDish() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [initial, setInitial] = useState<DishFormInitial | null>(null);

  useEffect(() => {
    Promise.all([getDish(id), listIngredients(id), listRecipeSteps(id)]).then(([dish, ingredients, steps]) => {
      setInitial({
        name: dish.name,
        emoji: dish.image_emoji ?? '🍽️',
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
      });
    });
  }, [id]);

  return (
    <Screen>
      <ScreenHeader title="Modifier le plat" onBack={() => router.back()} />
      {!initial ? (
        <LoadingBlock />
      ) : (
        <DishForm
          initial={initial}
          submitLabel="Enregistrer les modifications"
          onSubmit={async (input) => {
            await updateDish(id, input);
            router.back();
          }}
        />
      )}
    </Screen>
  );
}
