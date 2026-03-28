# 🛡️ Shield — Frontend

## 📌 Description

Shield est une plateforme de sécurité numérique permettant la **signature et la vérification des documents officiels** afin de lutter contre la circulation de faux communiqués.

Ce dépôt contient la partie **Frontend** de l'application, développée avec React et TypeScript.

---

## 🚀 Technologies utilisées

* React (Vite)
* TypeScript
* TailwindCSS
* React Router DOM
* Lucide React (icônes)

---

## 📂 Structure du projet

```bash
src/
│
├── assets/           # Images et ressources
├── components/       # Composants réutilisables
│   ├── ui/
│   ├── layout/
│
├── pages/            # Pages de l'application
│   ├── auth/         # Pages d'authentification
│   ├── dashboard/    # Tableau de bord
│   ├── public/       # Pages publiques
│
├── routes/           # Configuration des routes
├── services/         # Appels API
├── hooks/            # Hooks personnalisés
├── context/          # Gestion de l'état global
├── utils/            # Fonctions utilitaires
├── constants/        # Constantes globales
│
├── App.tsx
├── main.tsx
└── index.css
```

---

## ⚙️ Prérequis

Avant de lancer le projet, assurez-vous d'avoir installé :

* Node.js (version 18 ou plus)
* npm ou yarn

---

## 📥 Installation

1. Cloner le projet :

```bash
git clone <URL_DU_REPO>
```

2. Accéder au dossier frontend :

```bash
cd frontend
```

3. Installer les dépendances :

```bash
yarn install
```

ou

```bash
npm install
```

---

## ▶️ Lancer le projet

```bash
yarn dev
```

ou

```bash
npm run dev
```

Ensuite, ouvrir dans votre navigateur :

```bash
http://localhost:5173
```

---

## 🌐 Navigation

* `/` → Page d'accueil
* `/login` → Page de connexion

---

## 🔧 Configuration des variables d’environnement

Créer un fichier `.env` à la racine du projet :

```bash
VITE_API_URL=http://localhost:8000/api
```

---

## 🧪 Bonnes pratiques

* Ne pas modifier directement les fichiers dans `node_modules`
* Respecter l'architecture du projet
* Créer des composants réutilisables
* Utiliser Tailwind pour le style

---

## 🚧 État du projet

Projet en cours de développement.

Fonctionnalités à venir :

* Authentification sécurisée
* Upload et signature de documents
* Génération de QR Code
* Vérification publique des documents

---

## 🤝 Contribution

Les contributions sont les bienvenues.

1. Fork le projet
2. Créer une branche :

```bash
git checkout -b feature/ma-fonctionnalite
```

3. Commit :

```bash
git commit -m "Ajout d'une fonctionnalité"
```

4. Push :

```bash
git push origin feature/ma-fonctionnalite
```

---

## 📄 Licence

Projet privé — tous droits réservés.

---

## 👨‍💻 Auteur

Projet développé dans le cadre d’un projet de fin d’études (PFE).
