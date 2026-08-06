import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { Text } from './ScaledText';
import { useAuth } from '../lib/auth';
import { useTheme } from '../theme/ThemeProvider';
import { isGoogleIdentityConfigured, renderGoogleButton } from '../lib/googleIdentity';
import { Pill } from './ui';

// Google n'échoue pas bruyamment : si l'identifiant client est faux ou si
// l'origine du site n'est pas déclarée dans « Authorized JavaScript origins »,
// renderButton() ne dessine simplement rien (message dans la console, c'est
// tout). On vérifie donc que le bouton est réellement apparu, sans quoi on
// repasse sur l'ancien flux — sinon l'écran de connexion n'aurait plus aucun
// bouton Google du tout.
const RENDER_CHECK_MS = 1500;

/**
 * Bouton « Continuer avec Google ».
 *
 * Sur web, si Google Identity Services est configuré (EXPO_PUBLIC_GOOGLE_CLIENT_ID),
 * on affiche le bouton officiel Google : le compte est choisi dans une fenêtre
 * superposée et la session est créée sur place, sans jamais quitter l'app. Ça
 * contourne le bug Android où le retour de redirection est intercepté par
 * l'application installée et perd le jeton de session.
 *
 * Partout ailleurs (natif, script Google indisponible, identifiant client
 * absent), on retombe sur l'ancien flux par redirection.
 */
export function GoogleSignInButton({ onError }: { onError: (message: string) => void }) {
  const { colors } = useTheme();
  const { signInWithGoogle, signInWithGoogleCredential } = useAuth();
  const containerRef = useRef<View | null>(null);
  const [width, setWidth] = useState(0);
  const [useFallback, setUseFallback] = useState(!isGoogleIdentityConfigured());
  const rendered = useRef(false);

  // Les fonctions du contexte d'authentification sont recréées à chaque rendu :
  // on les lit via une ref pour que l'effet ne dépende que de ce qui compte
  // réellement (sans quoi il se relancerait sans cesse et annulerait son propre
  // minuteur de vérification).
  const handlers = useRef({ signInWithGoogle, signInWithGoogleCredential, onError });
  handlers.current = { signInWithGoogle, signInWithGoogleCredential, onError };

  const fallbackSignIn = useCallback(() => {
    const { signInWithGoogle: run, onError: report } = handlers.current;
    run().then((e) => e && report(e));
  }, []);

  useEffect(() => {
    if (useFallback || width === 0 || rendered.current) return;
    const node = containerRef.current as unknown as HTMLElement | null;
    if (!node) return;
    rendered.current = true;
    const giveUp = () => {
      rendered.current = false;
      setUseFallback(true);
    };
    renderGoogleButton(node, width, (idToken) => {
      const { signInWithGoogleCredential: run, onError: report } = handlers.current;
      run(idToken).then((e) => e && report(e));
    })
      .then(() => {
        window.setTimeout(() => {
          if (node.childElementCount === 0 || node.getBoundingClientRect().height < 10) giveUp();
        }, RENDER_CHECK_MS);
      })
      // Script Google injoignable (hors ligne, bloqué…) : l'utilisateur garde
      // une façon de se connecter.
      .catch(giveUp);
  }, [useFallback, width]);

  if (useFallback || Platform.OS !== 'web') {
    return <Pill label="Continuer avec Google" onPress={fallbackSignIn} />;
  }

  return (
    <View>
      <View
        ref={containerRef}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
      />
      {/* Roue de secours si la fenêtre Google est bloquée par le navigateur. */}
      <Pressable onPress={fallbackSignIn} style={{ marginTop: 8 }}>
        <Text style={{ textAlign: 'center', fontSize: 10.5, color: colors.inkFaint, textDecorationLine: 'underline' }}>
          Problème avec Google ? Essayer via le navigateur
        </Text>
      </Pressable>
    </View>
  );
}
