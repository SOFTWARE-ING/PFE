### CONCEPTION D’UNE PLATEFORME SÉCURISÉE DE VALIDATION DES COMMUNIQUÉS OFFICIELS PAR SIGNATURE NUMÉRIQUE CONTRE LA FRAUDE DOCUMENTAIRE INSTITUTIONNELLE

## Présentation

il sagit d'une plateforme numérique sécurisée conçue pour permettre aux institutions gouvernementales de publier et d’authentifier leurs communiqués officiels grâce à un système de signature numérique.

L’objectif principal de la plateforme est de lutter contre la circulation croissante de faux communiqués institutionnels sur Internet et sur les réseaux sociaux en offrant un mécanisme de vérification fiable et accessible au public.

Ce projet est développé dans le cadre d’un **Projet de Fin d’Études (PFE)** de licence en informatique / génie logiciel.

---

## Problématique

Dans de nombreux pays, y compris au Cameroun, de faux communiqués attribués à des institutions publiques circulent fréquemment sur des plateformes comme WhatsApp, Facebook ou Telegram.

Ces documents falsifiés peuvent :

* induire les citoyens en erreur
* provoquer la désinformation
* créer une confusion au sein de la population
* nuire à la crédibilité des institutions publiques

Actuellement, il n’existe pas toujours un moyen simple et rapide permettant aux citoyens de vérifier l’authenticité d’un communiqué officiel.

La plateforme Shield vise à résoudre ce problème en mettant en place un système permettant de signer numériquement les communiqués officiels et de les vérifier publiquement.

---

## Objectifs du projet

Les principaux objectifs de la plateforme sont les suivants :

* permettre aux institutions gouvernementales de **signer numériquement leurs communiqués**
* garantir **l’intégrité et l’authenticité des documents officiels**
* offrir aux citoyens un moyen simple de **vérifier l’authenticité d’un communiqué**
* créer une **base de données publique des communiqués officiels**
* contribuer à la lutte contre la **désinformation et les faux documents**

---

## Fonctionnalités principales

La plateforme inclura les fonctionnalités suivantes :

* authentification sécurisée des comptes institutionnels
* signature numérique des communiqués officiels
* archivage sécurisé des documents signés
* système de vérification publique des communiqués
* vérification via **QR Code**
* moteur de recherche des communiqués par mots-clés
* accès public sans création de compte
* authentification à deux facteurs (2FA) pour les comptes institutionnels
* expiration automatique des sessions pour renforcer la sécurité

---

## Architecture du système (vue générale)

Le système sera composé de plusieurs composants :

Frontend

* HTML
* CSS
* JavaScript
* React Js

Backend

* Express Js

Base de données

* PostGreSQL

Composants de sécurité

* système de signature numérique
* protocole HTTPS avec certificat SSL
* système d’authentification sécurisé

---

## Types d’utilisateurs

### Institutions

Les ministères et institutions publiques autorisées pourront :

* publier des communiqués
* signer numériquement les documents
* archiver les communiqués officiels

### Utilisateurs publics

Les citoyens, journalistes ou organisations pourront :

* rechercher des communiqués officiels
* vérifier l’authenticité d’un document

Les utilisateurs publics **n’ont pas besoin de créer un compte** pour utiliser les fonctions de vérification.

---

## Exemple d’utilisation

1. Une institution publie un communiqué sur la plateforme.
2. Le document est signé numériquement et archivé.
3. Un **QR Code et un identifiant unique** sont générés.
4. Les citoyens peuvent vérifier le communiqué en :

   * scannant le QR Code
   * recherchant le document sur la plateforme

---

## Structure du dépôt (prévisionnelle)

```id="readme_struct"
frontend/
backend/
database/
docs/
security/
tests/
```

---

## Installation (environnement de développement)

Cloner le dépôt :

```bash id="readme_clone"
git clone https://github.com/your-repository/Shield.git
```

Se placer dans le dossier du projet :

```bash id="readme_cd"
cd Shield
```

## Contribution

Les développeurs qui souhaitent contribuer au projet doivent :

* créer une branche pour chaque nouvelle fonctionnalité
* écrire des messages de commit clairs
* documenter les nouvelles fonctionnalités
* tester le code avant de l’envoyer dans le dépôt

Exemple de workflow :

```id="readme_git"
git checkout -b feature/signature-numerique
git commit -m "Ajout du module de signature numérique"
git push origin feature/signature-numerique
```

---

## Considérations de sécurité

Étant donné que la plateforme gère des documents institutionnels officiels, la sécurité est un aspect essentiel du projet.

Les développeurs doivent porter une attention particulière à :

* la sécurité de l’authentification
* l’intégrité des données
* la gestion sécurisée des fichiers
* la protection contre les attaques (injection SQL, XSS, etc.)

---

## État du projet

Le projet est actuellement en phase de **développement**.

Les principaux modules en cours de conception sont :

* système d’authentification
* moteur de signature numérique
* système de vérification des communiqués
* moteur de recherche des documents


