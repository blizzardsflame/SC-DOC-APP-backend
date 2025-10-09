# 🌱 Script de Seeding de la Base de Données BiblioDz

Ce script peuple votre base de données MongoDB avec des données de démonstration complètes en français.

## 📋 Contenu du Seeding

### 📚 Catégories et Sous-catégories
- **Source**: Catégories Z-Library traduites en français
- **Nombre**: 11 catégories principales avec leurs sous-catégories
- **Exemples**: Arts, Astronomie, Biologie, Informatique, etc.
- **Structure hiérarchique**: Catégories parent → sous-catégories

### 👥 Utilisateurs (8 comptes)
- **1 Staff**: Admin bibliothèque
- **3 Enseignants**: Pierre Dubois, Sophie Laurent, Nadia Cherif  
- **4 Étudiants**: Jean Dupont, Marie Martin, Fatima Benali, Ahmed Mansouri
- **Mot de passe**: `password123` pour tous les comptes
- **Statut**: Tous activés et vérifiés

### 📖 Livres (15 livres)
- **Classiques français**: Les Misérables, Le Petit Prince, L'Étranger, etc.
- **Livres académiques**: Informatique, Mathématiques, Biologie, etc.
- **Formats**: PDF et EPUB
- **Copies physiques**: 1-5 exemplaires par livre
- **Téléchargeable**: 50% des livres

### 📋 Emprunts
- **Emprunts actifs**: ~10 emprunts en cours
- **Emprunts retournés**: 5 emprunts historiques
- **Emprunts en retard**: ~30% des emprunts actifs
- **Renouvellements**: 0-3 renouvellements par emprunt

## 🚀 Utilisation

### Prérequis
- MongoDB en cours d'exécution
- Variables d'environnement configurées (`.env`)

### Exécution
```bash
# Depuis le dossier server/
npm run seed
```

### Alternative
```bash
# Exécution directe avec tsx
tsx src/scripts/seedDatabase.ts
```

## ⚠️ Important

**Ce script vide complètement la base de données avant le seeding !**

- Supprime tous les utilisateurs existants
- Supprime toutes les catégories existantes  
- Supprime tous les livres existants
- Supprime tous les emprunts existants

## 🔑 Comptes de Test

Après le seeding, vous pouvez vous connecter avec :

### Staff (Administration)
- **Email**: `admin@bibliotheque.fr`
- **Mot de passe**: `password123`
- **Accès**: Panel d'administration complet

### Enseignant
- **Email**: `pierre.dubois@universite.fr`
- **Mot de passe**: `password123`
- **Accès**: Emprunts et consultation

### Étudiant
- **Email**: `jean.dupont@universite.fr`
- **Mot de passe**: `password123`
- **Accès**: Emprunts et consultation

## 📊 Résultats Attendus

Après exécution réussie :
- ✅ ~200+ catégories et sous-catégories
- ✅ 8 utilisateurs (1 staff, 3 enseignants, 4 étudiants)
- ✅ 15 livres avec métadonnées complètes
- ✅ ~15 emprunts (actifs, retournés, en retard)

## 🔧 Configuration

Le script utilise :
- **MongoDB URI**: `process.env.MONGODB_URI` ou `mongodb://localhost:27017/bibliodz`
- **Langue**: Français (fr) pour tous les contenus
- **Facultés**: Sciences, Lettres, Médecine, Droit, Économie

## 📝 Personnalisation

Pour modifier les données :
1. Éditez les constantes dans `seedDatabase.ts`
2. Ajoutez/modifiez les livres dans `frenchBooks`
3. Ajoutez/modifiez les utilisateurs dans `frenchUsers`
4. Relancez le script

## 🐛 Dépannage

### Erreur de connexion MongoDB
```bash
❌ Erreur de connexion à MongoDB
```
**Solution**: Vérifiez que MongoDB est démarré et que `MONGODB_URI` est correct

### Erreur de validation
```bash
❌ Erreur lors de la création des utilisateurs
```
**Solution**: Vérifiez que les données respectent les contraintes du modèle

### Script bloqué
**Solution**: Interrompez avec `Ctrl+C` et relancez
