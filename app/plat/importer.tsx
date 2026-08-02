import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Text, TextInput } from '../../src/components/ScaledText';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useAuth } from '../../src/lib/auth';
import { Pill, Screen, ScreenHeader } from '../../src/components/ui';
import { ActionSheet } from '../../src/components/ActionSheet';
import { DishForm, DishFormInitial } from '../../src/components/DishForm';
import { createDish } from '../../src/data/dishes';
import { parseRecipeText } from '../../src/lib/recipeImport';
import { useUnsavedChangesGuard } from '../../src/lib/unsavedChangesGuard';
import { fonts, radii } from '../../src/theme/tokens';

export default function ImporterRecette() {
  const { colors } = useTheme();
  const { session } = useAuth();
  const router = useRouter();
  const [text, setText] = useState('');
  const [initial, setInitial] = useState<DishFormInitial | null>(null);
  const [dirty, setDirty] = useState(false);
  const guard = useUnsavedChangesGuard(dirty);

  if (!initial) {
    return (
      <Screen>
        <ScreenHeader title="Importer une recette" subtitle="Colle le texte d'une recette (ingrédients + étapes)" onBack={() => router.back()} />
        <ScrollView contentContainerStyle={{ padding: 18, gap: 14 }}>
          <Text style={{ fontSize: 12.5, color: colors.inkSoft, lineHeight: 18 }}>
            Pas d'IA ici : découpage simple à partir du texte collé. Fonctionne mieux si le texte a des titres "Ingrédients" et
            "Étapes"/"Préparation". Tu pourras corriger le résultat avant d'enregistrer.
          </Text>
          <View
            style={{
              borderWidth: 1,
              borderColor: colors.line,
              borderRadius: radii.md,
              backgroundColor: colors.paper,
              minHeight: 260,
            }}
          >
            <TextInput
              value={text}
              onChangeText={setText}
              multiline
              placeholder={'Ex.\n\nGratin dauphinois\n\nIngrédients\n1 kg de pommes de terre\n50 cl de crème\n2 gousses d\'ail\n\nÉtapes\n1. Préchauffer le four à 180°C\n2. Éplucher et couper les pommes de terre'}
              placeholderTextColor={colors.inkFaint}
              style={{ flex: 1, padding: 12, fontSize: 13, color: colors.ink, textAlignVertical: 'top', minHeight: 260 }}
            />
          </View>
          <Pill
            label="Analyser le texte"
            variant="primary"
            disabled={!text.trim()}
            onPress={() => setInitial(parseRecipeText(text))}
          />
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader title="Vérifier avant d'enregistrer" onBack={guard.attemptBack} />
      <DishForm
        initial={initial}
        submitLabel="Enregistrer le plat"
        onDirtyChange={setDirty}
        onSubmit={async (input) => {
          await createDish(session!.user.id, input);
          router.back();
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
