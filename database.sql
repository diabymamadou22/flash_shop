-- =====================================================================
-- FLASH-SHOP - Script de Création de la Base de Données MySQL
-- Système de Gestion Commerciale, Stocks & Caisse POS
-- Devise par défaut : FCFA
-- Moteur : InnoDB avec support UTF8MB4 et Contraintes Référentielles
-- =====================================================================

CREATE DATABASE IF NOT EXISTS `flash_shop_db` 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE `flash_shop_db`;

-- Désactiver temporairement les vérifications de clés étrangères pour initialisation propre
SET FOREIGN_KEY_CHECKS = 0;

-- 1. Table des Utilisateurs (Administrateurs & Caissiers)
DROP TABLE IF EXISTS `sale_items`;
DROP TABLE IF EXISTS `sales`;
DROP TABLE IF EXISTS `stock_movements`;
DROP TABLE IF EXISTS `expenses`;
DROP TABLE IF EXISTS `products`;
DROP TABLE IF EXISTS `categories`;
DROP TABLE IF EXISTS `settings`;
DROP TABLE IF EXISTS `users`;

CREATE TABLE `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `email` VARCHAR(100) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `full_name` VARCHAR(100) NOT NULL,
  `role` ENUM('ADMIN', 'CAISSIER') NOT NULL DEFAULT 'ADMIN',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_users_username` (`username`),
  INDEX `idx_users_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Table des Catégories de Produits
CREATE TABLE `categories` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `description` VARCHAR(255) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_categories_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Table des Produits
CREATE TABLE `products` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(200) NOT NULL,
  `reference` VARCHAR(100) NOT NULL UNIQUE,
  `category_id` INT NOT NULL,
  `image_url` TEXT NULL,
  `buy_price` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `sell_price` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `quantity` INT NOT NULL DEFAULT 0,
  `alert_threshold` INT NOT NULL DEFAULT 5,
  `description` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_products_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  INDEX `idx_products_reference` (`reference`),
  INDEX `idx_products_category` (`category_id`),
  INDEX `idx_products_quantity` (`quantity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Table des Mouvements de Stock (Traçabilité intégrale)
CREATE TABLE `stock_movements` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `product_id` INT NOT NULL,
  `type` ENUM('ENTREE', 'SORTIE', 'CORRECTION', 'VENTE') NOT NULL,
  `quantity` INT NOT NULL,
  `previous_stock` INT NOT NULL,
  `new_stock` INT NOT NULL,
  `reason` VARCHAR(255) NOT NULL,
  `created_by` INT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_stock_movements_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_stock_movements_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX `idx_stock_mov_product` (`product_id`),
  INDEX `idx_stock_mov_type` (`type`),
  INDEX `idx_stock_mov_date` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Table des Ventes
CREATE TABLE `sales` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `sale_number` VARCHAR(50) NOT NULL UNIQUE,
  `total_amount` DECIMAL(12, 2) NOT NULL,
  `amount_received` DECIMAL(12, 2) NOT NULL,
  `change_returned` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `payment_method` VARCHAR(30) NOT NULL DEFAULT 'ESPECES',
  `status` ENUM('VALIDEE', 'ANNULEE') NOT NULL DEFAULT 'VALIDEE',
  `user_id` INT NULL,
  `notes` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_sales_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX `idx_sales_number` (`sale_number`),
  INDEX `idx_sales_date` (`created_at`),
  INDEX `idx_sales_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Table des Lignes de Vente (Snapshot historique immuable)
CREATE TABLE `sale_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `sale_id` INT NOT NULL,
  `product_id` INT NULL,
  `product_name` VARCHAR(200) NOT NULL,
  `product_ref` VARCHAR(100) NOT NULL,
  `unit_price` DECIMAL(12, 2) NOT NULL,
  `unit_cost` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `quantity` INT NOT NULL,
  `total_price` DECIMAL(12, 2) NOT NULL,
  CONSTRAINT `fk_sale_items_sale` FOREIGN KEY (`sale_id`) REFERENCES `sales` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_sale_items_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX `idx_sale_items_sale` (`sale_id`),
  INDEX `idx_sale_items_product` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Table des Dépenses de la Boutique
CREATE TABLE `expenses` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(200) NOT NULL,
  `category` ENUM('LOYER', 'ELECTRICITE', 'EAU', 'INTERNET', 'TRANSPORT', 'ENTRETIEN', 'SALAIRES', 'AUTRE') NOT NULL,
  `amount` DECIMAL(12, 2) NOT NULL,
  `description` TEXT NULL,
  `expense_date` DATE NOT NULL,
  `created_by` INT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_expenses_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX `idx_expenses_category` (`category`),
  INDEX `idx_expenses_date` (`expense_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Table des Paramètres de la Boutique
CREATE TABLE `settings` (
  `id` INT PRIMARY KEY DEFAULT 1,
  `shop_name` VARCHAR(150) NOT NULL DEFAULT 'FLASH-SHOP',
  `shop_tagline` VARCHAR(255) NOT NULL DEFAULT 'Vente de Matériels Électroniques & Accessoires High-Tech',
  `phone` VARCHAR(50) NOT NULL DEFAULT '+225 07 00 00 00 00',
  `email` VARCHAR(100) NOT NULL DEFAULT 'contact@flash-shop.ci',
  `address` VARCHAR(255) NOT NULL DEFAULT 'Boulevard Principal, Immeuble Horizon Tech',
  `city` VARCHAR(100) NOT NULL DEFAULT 'Abidjan, Côte d''Ivoire',
  `currency` VARCHAR(10) NOT NULL DEFAULT 'FCFA',
  `receipt_footer` TEXT NOT NULL,
  `tax_rate` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Réactiver les vérifications de clés étrangères
SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================================
-- DONNÉES DE DÉMONSTRATION ET INITIALISATION
-- =====================================================================

-- Administrateur par défaut : admin / admin123 (chiffré avec bcrypt)
INSERT INTO `users` (`id`, `username`, `email`, `password_hash`, `full_name`, `role`)
VALUES (1, 'admin', 'admin@flash-shop.ci', '$2a$10$wN31jJdgR/2G9iPZzU5xIOPj2Z5v6G1YqHqZgT8OeVgC9Z5pL7qQy', 'Mamadou Diaby (Directeur)', 'ADMIN');

-- Paramètres initiaux de la boutique
INSERT INTO `settings` (`id`, `shop_name`, `shop_tagline`, `phone`, `email`, `address`, `city`, `currency`, `receipt_footer`, `tax_rate`)
VALUES (1, 'FLASH-SHOP', 'Vente de Matériels Électroniques & Accessoires High-Tech', '+225 07 88 99 00 11', 'contact@flash-shop.ci', 'Boulevard Giscard d''Estaing, Zone 4', 'Abidjan', 'FCFA', 'Merci de votre confiance ! Les articles électroniques sont garantis 12 mois. Conservez ce ticket.', 0.00);

-- Catégories
INSERT INTO `categories` (`id`, `name`, `description`) VALUES
(1, 'Ordinateurs & Portables', 'PC portables professionnels, ultrabooks, stations de travail'),
(2, 'Smartphones & Tablettes', 'Téléphones intelligents haut de gamme, milieux de gamme et tablettes'),
(3, 'Audio & Casques', 'Casques sans fil, écouteurs Bluetooth et enceintes haute fidélité'),
(4, 'Accessoires & Câbles', 'Chargeurs rapides, adaptateurs, câbles USB-C, batteries externes'),
(5, 'Objets Connectés', 'Montres connectées, bracelets d''activité, domotique'),
(6, 'Stockage & Périphériques', 'Disques SSD externes, clés USB, souris ergonomiques, claviers mécaniques');

-- Produits initiaux
INSERT INTO `products` (`id`, `name`, `reference`, `category_id`, `image_url`, `buy_price`, `sell_price`, `quantity`, `alert_threshold`, `description`) VALUES
(1, 'UltraBook Dell XPS 15 16GB/512GB SSD', 'LAP-DELL-XPS15', 1, '/src/assets/images/product_laptop_pro_1793651307502.jpg', 650000.00, 850000.00, 8, 3, 'Processeur Intel Core i7 13e Gen, Écran 15.6 pouces OLED 3.5K, Châssis aluminium usiné.'),
(2, 'Smartphone Samsung Galaxy S24 Ultra 256GB', 'PHN-GAL-S24U', 2, '/src/assets/images/product_smartphone_1793651308479.jpg', 580000.00, 725000.00, 12, 4, 'Capteur photo 200MP, S-Pen intégré, Écran Dynamic AMOLED 2X 120Hz, Titane.'),
(3, 'Casque Sans-Fil Sony WH-1000XM5 ANC', 'AUD-SONY-XM5', 3, '/src/assets/images/product_headphones_1793651308128.jpg', 180000.00, 240000.00, 15, 5, 'Réduction de bruit active de référence mondiale, autonomie 30h, confort premium.'),
(4, 'Chargeur Rapide Anker 65W GaN Dual USB-C', 'ACC-ANK-65W', 4, '', 15000.00, 25000.00, 35, 10, 'Technologie GaNPrime, recharge simultanée PC portable et smartphone.'),
(5, 'Montre Connectée Apple Watch Series 9 45mm', 'WAT-APL-S9', 5, '', 260000.00, 330000.00, 6, 2, 'Puce S9 SiP, geste Toucher deux fois, suivi santé avancé ECG & Oxygène sanguin.'),
(6, 'Disque SSD Externe Samsung T7 Shield 1TB', 'STK-SAM-T7-1TB', 6, '', 55000.00, 80000.00, 18, 5, 'Vitesse de transfert jusqu''à 1050 Mo/s, résistant aux chocs et éclaboussures IP65.'),
(7, 'Écouteurs Apple AirPods Pro 2 USB-C', 'AUD-APL-APP2', 3, '', 140000.00, 195000.00, 3, 5, 'Boîtier de charge MagSafe USB-C, réduction active du bruit 2x supérieure.'),
(8, 'Câble Tressé USB-C vers USB-C 100W 2M', 'ACC-CAB-100W', 4, '', 4000.00, 8500.00, 2, 8, 'Puissance supportée 100W Power Delivery, tressage nylon haute résistance.');

-- Mouvements initiaux
INSERT INTO `stock_movements` (`product_id`, `type`, `quantity`, `previous_stock`, `new_stock`, `reason`, `created_by`) VALUES
(1, 'ENTREE', 8, 0, 8, 'Réception initiale arrivage fournisseur TechDistro', 1),
(2, 'ENTREE', 12, 0, 12, 'Réception initiale arrivage fournisseur TechDistro', 1),
(3, 'ENTREE', 15, 0, 15, 'Réception initiale arrivage fournisseur TechDistro', 1),
(4, 'ENTREE', 35, 0, 35, 'Stock initial magasin', 1),
(5, 'ENTREE', 6, 0, 6, 'Stock initial magasin', 1),
(6, 'ENTREE', 18, 0, 18, 'Stock initial magasin', 1),
(7, 'ENTREE', 3, 0, 3, 'Stock initial magasin (Stock Faible)', 1),
(8, 'ENTREE', 2, 0, 2, 'Stock initial magasin (Stock Faible)', 1);

-- Dépenses initiales
INSERT INTO `expenses` (`title`, `category`, `amount`, `description`, `expense_date`, `created_by`) VALUES
('Loyer commercial local magasin Novembre', 'LOYER', 350000.00, 'Paiement mensuel bail commercial boutique', '2026-11-01', 1),
('Facture Électricité Climatisation & Éclairage', 'ELECTRICITE', 75000.00, 'Consommation électrique boutique et showroom', '2026-11-01', 1),
('Abonnement Internet Fibre Optique Pro', 'INTERNET', 35000.00, 'Connexion fibre 300 Mbps pour caisse et magasin', '2026-11-02', 1),
('Achat consommables bobines tickets thermiques', 'ENTRETIEN', 18000.00, 'Lot de 50 bobines papier thermique 80mm', '2026-11-02', 1);

-- Vente de démonstration
INSERT INTO `sales` (`id`, `sale_number`, `total_amount`, `amount_received`, `change_returned`, `payment_method`, `status`, `user_id`, `notes`)
VALUES (1, 'VTE-202611-0001', 265000.00, 270000.00, 5000.00, 'ESPECES', 'VALIDEE', 1, 'Client comptoir, achat casque et chargeur');

INSERT INTO `sale_items` (`sale_id`, `product_id`, `product_name`, `product_ref`, `unit_price`, `unit_cost`, `quantity`, `total_price`)
VALUES 
(1, 3, 'Casque Sans-Fil Sony WH-1000XM5 ANC', 'AUD-SONY-XM5', 240000.00, 180000.00, 1, 240000.00),
(1, 4, 'Chargeur Rapide Anker 65W GaN Dual USB-C', 'ACC-ANK-65W', 25000.00, 15000.00, 1, 25000.00);
