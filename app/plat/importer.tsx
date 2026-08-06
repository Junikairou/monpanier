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
import { isOcrAvailable, readTextFromImage } from '../../src/lib/ocr';
import { pickImage } from '../../src/data/dishPhoto';
import { useUnsavedChangesGuard } from '../../src/lib/unsavedChangesGuard';
import { fonts, radii } from '../../src/theme/tokens';

export default function ImporterRecette() {
  const { colors } = useTheme();
  const { session } = useAuth();
  const router = useRouter();
  const [text, setText] = useState('');
  const [preview, setPreview] = useState<DishFormInitial | null>(null);
  const [initial, setInitial] = useState<DishFormInitial | null>(null);
  const [dirty, setDirty] = useState(false);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrPercent, setOcrPercent] = useState(0);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const guard = useUnsavedChangesGuard(dirty);

  if (!initial) {
    return (
      <Screen>
        <ScreenHeader title="Importer une recette" subtitle="Depuis une photo, ou en collant le texte" onBack={() => router.back()} />
        <ScrollView contentContainerStyle={{ padding: 18, gap: 14 }}>
          <Text style={{ fontSize: 12.5, color: colors.inkSoft, lineHeight: 18 }}>
            Pas d'IA ici : découpage simple à partir du texte. Fonctionne mieux si le texte a des titres "Ingrédients" et
            "Étapes"/"Préparation". Tu pourras corriger le résultat avant d'enregistrer.
          </Text>

          {isOcrAvailable() ? (
            <View style={{ gap: 6 }}>
              <Pill
                label={ocrBusy ? `Lecture de la photo… ${ocrPercent}%` : '📷 Importer depuis une photo'}
                variant="primary"
                disabled={ocrBusy}
                onPress={async () => {
                  setOcrError(null);
                  try {
                    const asset = await pickImage();
                    if (!asset) return;
                    setOcrBusy(true);
                    setOcrPercent(0);
                    const read = await readTextFromImage(asset.uri, setOcrPercent);
                    if (!read.trim()) {
                      setOcrError("Aucun texte lisible trouvé sur cette photo. Essaie une photo plus nette, bien à plat et bien éclairée.");
                      return;
                    }
                    setText((prev) => (prev.trim() ? `${prev}
${read}` : read));
                    setPreview(null);
                  } catch (e: any) {
                    setOcrError(e?.message ?? "Impossible de lire cette photo.");
                  } finally {
                    setOcrBusy(false);
                  }
                }}
              />
              <Text style={{ fontSize: 11, color: colors.inkFaint, lineHeight: 16 }}>
                La photo est lue sur ton appareil : elle n'est envoyée nulle part. La première lecture télécharge l'outil de
                reconnaissance (quelques Mo, connexion nécessaire une seule fois). Le texte lu apparaît ci-dessous : relis-le et
                corrige avant d'analyser. Photo nette et bien cadrée = bien meilleur résultat.
              </Text>
              {ocrError ? <Text style={{ fontSize: 11.5, color: colors.danger }}>{ocrError}</Text> : null}
            </View>
          ) : null}
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
              onChangeText={(v) => {
                setText(v);
                setPreview(null);
              }}
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
            onPress={() => setPreview(parseRecipeText(text))}
          />

          {preview ? (
            <View style={{ borderWidth: 1, borderColor: colors.line, borderRadius: radii.md, padding: 14, gap: 6 }}>
              <Text style={{ fontSize: 13.5, fontFamily: fonts.bodySemiBold, color: colors.ink }}>{preview.name}</Text>
              <Text style={{ fontSize: 11, color: colors.inkSoft }}>
                {preview.ingredients.filter((i) => i.name).length} ingrédient(s) · {preview.steps.filter(Boolean).length} étape(s)
                {preview.prepMinutes ? ` · ${preview.prepMinutes} min` : ''} · pour {preview.baseServings} pers.
              </Text>
              {preview.ingredients
                .filter((i) => i.name)
                .slice(0, 6)
                .map((i, idx) => (
                  <Text key={idx} style={{ fontSize: 11.5, color: colors.inkSoft }}>
                    • {i.quantity ? `${i.quantity} ${i.unit} ` : ''}
                    {i.name}
                  </Text>
                ))}
              <Text style={{ fontSize: 10.5, color: colors.inkFaint, marginTop: 4 }}>
                Tu pourras tout corriger à l'étape suivante.
              </Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                <Pill label="Continuer" variant="primary" onPress={() => setInitial(preview)} />
                <Pill label="Modifier le texte" variant="ghost" onPress={() => setPreview(null)} />
              </View>
            </View>
          ) : null}
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
