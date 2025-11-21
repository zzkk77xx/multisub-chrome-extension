# Installation du Wallet Crypto

## Étape 1 : Installation des dépendances

```bash
npm install
```

## Étape 2 : Build de l'extension

```bash
npm run build
```

Cela créera un dossier `dist/` avec tous les fichiers de l'extension.

## Étape 3 : Créer les icônes (optionnel)

1. Ouvrir `create-icons.html` dans votre navigateur
2. Télécharger les 3 icônes générées
3. Les placer dans `public/icons/`
4. Relancer `npm run build`

Ou vous pouvez simplement continuer sans icônes - Chrome utilisera une icône par défaut.

## Étape 4 : Charger l'extension dans Chrome

1. Ouvrir Chrome et aller sur `chrome://extensions/`
2. Activer le "Mode développeur" (toggle en haut à droite)
3. Cliquer sur "Charger l'extension non empaquetée"
4. Sélectionner le dossier `dist/` de ce projet
5. L'extension est maintenant installée !

## Étape 5 : Utiliser le wallet

1. Cliquer sur l'icône de l'extension dans la barre d'outils Chrome
2. Choisir "Create New Wallet" ou "Import Existing Wallet"
3. Créer un mot de passe fort
4. Sauvegarder votre phrase de récupération en lieu sûr !

## Tester avec une DApp

Un fichier `test-dapp.html` est fourni pour tester le wallet :

1. Ouvrir `test-dapp.html` dans Chrome
2. Cliquer sur "Connect Wallet"
3. Le wallet devrait s'ouvrir et vous demander l'autorisation

## Mode Développement

Pour développer avec rechargement automatique :

```bash
npm run dev
```

Après chaque modification :
1. Aller sur `chrome://extensions/`
2. Cliquer sur l'icône de rechargement de l'extension
3. Recharger les pages où vous testez

## Dépannage

### L'extension ne charge pas
- Vérifier qu'il n'y a pas d'erreurs dans `chrome://extensions/`
- Cliquer sur "Erreurs" sous l'extension pour voir les détails
- Vérifier que le build s'est bien terminé sans erreurs

### Le wallet ne s'affiche pas
- Vérifier que l'icône de l'extension apparaît dans la barre d'outils
- Épingler l'extension si nécessaire (clic droit sur l'icône puzzle)

### Les DApps ne détectent pas le wallet
- Vérifier que l'extension est bien activée
- Recharger la page de la DApp
- Ouvrir la console du navigateur pour voir les erreurs

## Sécurité

**IMPORTANT : Ceci est un wallet de démonstration**

- N'utilisez PAS ce wallet pour de vraies crypto-monnaies de valeur
- C'est un projet éducatif pour comprendre les standards crypto
- Pour un usage réel, utilisez des wallets audités comme MetaMask, Ledger, etc.

## Support

Pour les problèmes :
1. Vérifier les logs dans la console Chrome (`F12`)
2. Vérifier les erreurs dans `chrome://extensions/`
3. Relire la documentation dans README.md
