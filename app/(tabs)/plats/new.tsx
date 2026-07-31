import React from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../src/lib/auth';
import { Screen, ScreenHeader } from '../../../src/components/ui';
import { DishForm } from '../../../src/components/DishForm';
import { createDish } from '../../../src/data/dishes';

export default function NewDish() {
  const { session } = useAuth();
  const router = useRouter();

  return (
    <Screen>
      <ScreenHeader title="Nouveau plat" onBack={() => router.back()} />
      <DishForm
        submitLabel="Enregistrer le plat"
        onSubmit={async (input) => {
          await createDish(session!.user.id, input);
          router.back();
        }}
      />
    </Screen>
  );
}
