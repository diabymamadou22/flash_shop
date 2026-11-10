# FLASH-SHOP ⚡ — Système de Gestion Commerciale, Stocks & Caisse POS

**FLASH-SHOP** est une application web Full-Stack professionnelle conçue pour piloter une boutique de vente de matériels électroniques et d'équipements informatiques.

---

## 1. Technologies & Architecture

- **Frontend** : React 19, TypeScript, Tailwind CSS v4, Lucide React, Canvas-Confetti, jsPDF.
- **Backend** : Node.js, Express.js (API REST modulaire et sécurisée).
- **Base de Données** : **MySQL** (moteur InnoDB avec transactions ACID, clés étrangères, index optimisés et script `database.sql`).
- **Mode Dual-Engine Résilient** : L'application se connecte nativement à votre serveur MySQL via `mysql2/promise`. En l'absence temporaire de serveur MySQL externe (comme dans le bac à sable de prévisualisation web), un moteur SQL relationnel intégré (better-sqlite3) prend le relais de manière transparente avec les mêmes tables, requêtes préparées et transactions pour garantir 100% de disponibilité.
- **Sécurité** : Hachage de mot de passe par **bcrypt**, sessions protégées par jetons **JWT**, requêtes SQL paramétrées (anti-injection SQL).

---

## 2. Identifiants d'Accès par Défaut

- **Identifiant** : `admin` (ou `admin@flash-shop.ci`)
- **Mot de passe** : `admin123`

---

## 3. Modules Fonctionnels

1. **Tableau de Bord Commercial** :
   - Chiffre d'affaires journalier et mensuel en FCFA.
   - Nombre de ventes, volume d'articles en stock et valeur marchande.
   - Alertes de stock faible en temps réel.
   - Graphique hebdomadaire d'évolution des ventes.
   - Calcul de la marge brute d'exploitation et résultat net déduit des charges.
   - Tableau des dernières ventes avec accès direct aux reçus.

2. **Caisse & Vente POS (Point de Vente)** :
   - Recherche instantanée par nom ou référence unique.
   - Filtrage par catégorie d'appareils.
   - Panier interactif avec ajustement des quantités et sous-totaux.
   - Règlement en espèces avec calcul automatique de la monnaie à rendre.
   - Raccourcis billets de banque FCFA (5 000, 10 000, 20 000, 50 000).
   - Validation en transaction SQL atomique (vérification des stocks, décrémentation automatique et création du mouvement d'audit).
   - Reçu de caisse thermique 80mm imprimable et facture PDF A4 téléchargeable.

3. **Gestion des Produits & Tarification** :
   - CRUD complet des articles électroniques.
   - Référence unique obligatoire, photo, catégorie, prix d'achat fournisseur et prix de vente client.
   - Calcul automatique de la marge brute unitaire et du taux de marge (%).
   - Seuil d'alerte personnalisable par produit.

4. **Gestion des Catégories** :
   - Organisation par familles de produits (Smartphones, Ordinateurs, Audio, Accessoires, etc.).
   - Règle de sécurité stricte : **interdiction de supprimer une catégorie contenant encore des produits**.

5. **Historique Immuable des Ventes** :
   - Liste exhaustive des ventes validées avec date, caissier, articles et totaux.
   - Filtres par période et recherche par numéro de ticket (`VTE-YYYYMMDD-XXXX`).
   - Réimpression thermique ou génération de facture PDF avec mentions de garantie 12 mois.

6. **Mouvements & Traçabilité des Stocks** :
   - Entrées de marchandises (arrivage fournisseur).
   - Sorties de stock justifiées (sav, casse, déstockage).
   - Corrections manuelles d'inventaire.
   - Interdiction formelle des stocks négatifs côté serveur.
   - Journal d'audit chronologique de tous les mouvements.

7. **Gestion des Dépenses de la Boutique** :
   - Enregistrement des charges d'exploitation : Loyer, Électricité CIE, Eau, Internet Fibre, Transport, Entretien, Salaires, etc.
   - Ventilation par catégorie et calcul du total des décaissements.

8. **Paramètres de la Boutique & Intégration MySQL** :
   - Coordonnées de l'entreprise (Nom, Slogan, Téléphone, Email, Adresse, Ville).
   - Pied de page personnalisé des tickets de caisse.
   - Console de diagnostic MySQL avec visionneuse et exportateur du fichier `database.sql`.

---

## 4. Installation & Déploiement MySQL

### Étape 1 : Importer la base de données
```bash
mysql -u root -p < database.sql
```

### Étape 2 : Configurer les variables d'environnement (`.env`)
Créez ou modifiez votre fichier `.env` :
```env
PORT=3000
JWT_SECRET="votre_cle_secrete_jwt"

# Identifiants de connexion MySQL
MYSQL_HOST="localhost"
MYSQL_PORT=3306
MYSQL_USER="root"
MYSQL_PASSWORD="votre_mot_de_passe"
MYSQL_DATABASE="flash_shop_db"
```

### Étape 3 : Lancer l'application
```bash
# Installation des dépendances
npm install

# Démarrage en mode développement (Express + Vite)
npm run dev

# Construction et lancement pour production
npm run build
npm start
```
L'application est disponible sur `http://localhost:3000`.
