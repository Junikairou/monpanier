import React, { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text } from '../src/components/ScaledText';
import { useTheme } from '../src/theme/ThemeProvider';
import { Card, EmptyState, LoadingBlock, Screen, ScreenHeader } from '../src/components/ui';
import { getInvitedMealDishes } from '../src/data/friends';
import { listIngredients } from '../src/data/dishes';
import { useTaxonomies } from '../src/lib/taxonomies';
import { formatQuantity } from '../src/lib/formatQuantity';
import { formatShortDayMonth } from '../src/lib/dates';
import { Dish, MealSlot } from '../src/types/models';
import { fonts } from '../src/theme/tokens';

interface AggregatedIngredient {
  key: string;
  name: string;
  unit: string;
  quantity: number;
  grocery_category: string;
}

export default function RepasInvite() {
  const { colors } = useTheme();
  const router = useRouter();
  const { label, iconFor } = useTaxonomies();
  const params = useLocalSearchParams<{ householdId: string; date: string; slot: MealSlot; from?: string }>();

  const [dishes, setDishes] = useState<Dish[] | null>(null);
  const [ingredients, setIngredients] = useState<AggregatedIngredient[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getInvitedMealDishes({
      id: '',
      household_id: params.householdId,
      date: params.date,
      slot: params.slot,
      fromName: params.from ?? '',
      status: 'accepted',
    })
      .then(async (list) => {
        setDishes(list);
        const merged = new Map<string, AggregatedIngredient>();
        for (const dish of list) {
          for (const ing of await listIngredients(dish.id)) {
            const key = `${ing.name.trim().toLowerCase()}::${ing.unit.trim().toLowerCase()}`;
            const existing = merged.get(key);
            if (existing) existing.quantity += Number(ing.quantity);
            else
              merged.set(key, {
                key,
                name: ing.name,
                unit: ing.unit,
                quantity: Number(ing.quantity),
                grocery_category: ing.grocery_category,
              });
          }
        }
        setIngredients(Array.from(merged.values()).sort((a, b) => a.name.localeCompare(b.name)));
      })
      .catch((e: any) => {
        setDishes([]);
        setError(e.message ?? 'Impossible de charger ce repas.');
      });
  }, [params.householdId, params.date, params.slot, params.from]);

  const subtitle = `${label('meal_slot', params.slot)} · ${formatShortDayMonth(new Date(params.date))}${
    params.from ? ` · chez ${params.from}` : ''
  }`;

  return (
    <Screen>
      <ScreenHeader title="Repas partagé" subtitle={subtitle} onBack={() => router.back()} />
      {!dishes ? (
        <LoadingBlock />
      ) : error ? (
        <EmptyState text={error} />
      ) : dishes.length === 0 ? (
        <EmptyState text="Aucun plat prévu à ce repas pour l'instant." />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 18, gap: 10, paddingBottom: 30 }}>
          <Text style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 0.6, color: colors.inkFaint, fontFamily: fonts.bodySemiBold }}>
            Au menu
          </Text>
          {dishes.map((d) => (
            <Card key={d.id} style={{ gap: 2 }}>
              <Text style={{ fontSize: 13.5, fontFamily: fonts.bodySemiBold, color: colors.ink }}>
                {d.image_emoji || '🍽️'} {d.name}
              </Text>
              {d.prep_minutes ? (
                <Text style={{ fontSize: 10.5, color: colors.inkFaint }}>⏱️ {d.prep_minutes} min de préparation</Text>
              ) : null}
            </Card>
          ))}

          <Text
            style={{
              fontSize: 10.5,
              textTransform: 'uppercase',
              letterSpacing: 0.6,
              color: colors.inkFaint,
              fontFamily: fonts.bodySemiBold,
              marginTop: 10,
            }}
          >
            Liste de courses de ce repas
          </Text>
          <Card style={{ gap: 6 }}>
            {ingredients.map((ing) => (
              <View key={ing.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 13 }}>{iconFor(ing.grocery_category)}</Text>
                <Text style={{ flex: 1, fontSize: 12.5, color: colors.ink }}>{ing.name}</Text>
                <Text style={{ fontSize: 12, color: colors.inkSoft }}>
                  {formatQuantity(ing.quantity, ing.unit)} {ing.unit}
                </Text>
              </View>
            ))}
          </Card>
          <Text style={{ fontSize: 10.5, color: colors.inkFaint, lineHeight: 15 }}>
            Quantités telles que prévues par la personne qui t'invite (lecture seule).
          </Text>
        </ScrollView>
      )}
    </Screen>
  );
}
