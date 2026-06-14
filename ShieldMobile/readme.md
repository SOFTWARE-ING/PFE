 # ShieldMobile (CommuniSigne) - Mobile

 Bref descriptif
---------------
ShieldMobile (CommuniSigne) est l'application mobile compagnon d'une plateforme de vérification officielle de communiqués et signatures. Elle permet de :

- Scanner et vérifier des documents ou QR codes.
- Se connecter via Google (OAuth) ou par e-mail.
- Consulter les communiqués vérifiés, notifications et son profil.

Cette application est réalisée avec Expo (React Native) et utilise un backend FastAPI (dans le dépôt parent) pour l'authentification et la vérification.

Prérequis
---------
- Node.js (recommandé 16.x ou version supportée par la CLI locale d'Expo)
- npm (ou yarn)
- Expo (utiliser la CLI locale fournie par le package `expo`)
- Android Studio / émulateur Android ou un appareil iOS/Android réel pour tester
- (Optionnel) keytool (pour obtenir le SHA-1 lors de la configuration Google OAuth pour Android)

Installer les dépendances
-------------------------
Dans le dossier `ShieldMobile/` :

```bash
cd /home/keita/Bureau/projet_PFE/PFE/ShieldMobile
npm install
```

Lancer l'application
--------------------
Plutôt que d'utiliser l'ancien `expo-cli` global, utilisez la CLI locale via `npx` :

```bash
npx expo start
```

Commandes utiles :

```bash
npx expo start --android   # Démarrer et ouvrir sur un appareil/emulateur Android
npx expo start --ios       # Démarrer et ouvrir sur simulateur iOS (macOS only)
npx expo start --web       # Lancer la version web
```

Mode "skip login" pour développement rapide
-------------------------------------------
Pour tester l'interface sans passer par le flux de login, un mode de développement a été ajouté.

1. Créez/éditez `app.json` (à la racine de `ShieldMobile/`) et ajoutez sous `expo.extra` :

```json
{
  "expo": {
    "extra": {
      "DEV_SKIP_LOGIN": true,
      "DEV_FAKE_USER": { "name": "Dev Tester", "email": "dev@example.com" }
    }
  }
}
```

2. Lancez l'application (`npx expo start`) puis ouvrez l'app dans Expo Go ou un simulateur. Si aucun token n'est trouvé, l'application va se connecter automatiquement avec l'utilisateur factice et vous amènera directement aux onglets principaux.

Attention : ne laissez pas `DEV_SKIP_LOGIN` activé pour des builds destinés à la production.

Configuration Google OAuth (bref rappel)
----------------------------------------
Les identifiants Google (Android/iOS/Web) sont utilisés par `expo-auth-session` dans `src/screens/LoginScreen.js`. Les placeholders à remplacer se trouvent dans ce fichier :

- `androidClientId`
- `iosClientId`
- `webClientId`

Pour plus de sécurité, vous pouvez stocker ces IDs dans `app.json` sous `expo.extra` (par exemple `GOOGLE_ANDROID_CLIENT_ID`) et modifier `LoginScreen.js` pour les récupérer depuis `Constants.expoConfig.extra`.

Dépannage rapide
----------------
- Si vous voyez un avertissement sur la CLI expo dépréciée, utilisez `npx expo` (voir ci-dessus).
- Pour obtenir le SHA-1 debug (Android), exécutez :

```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

- Pour réinitialiser l'état d'auth (si vous voulez retirer l'utilisateur factice) : supprimez l'app sur l'appareil ou effacez AsyncStorage (ou modifiez le code temporairement pour supprimer les clés `jwt_token` et `user_data`).

En cas de problème
------------------
Copiez le message d'erreur complet et ouvrez un ticket / demande d'aide dans le dépôt. Je peux aider à diagnostiquer les erreurs d'exécution, de module manquant ou d'authentification.

---

Ce fichier a été généré automatiquement. Si vous voulez que j'ajoute un `app.json` modèle, que j'intègre les Google Client IDs dans `LoginScreen.js` (lecture depuis `expo.extra`) ou que j'ajoute une section sur la construction d'une build native, dites-le et je m'en occupe.
@AGENTS.md
