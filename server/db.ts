/**
 * FLASH-SHOP - Couche d'Accès aux Données & Connecteur MySQL / SQL
 * Supporte le mode natif MySQL via mysql2 avec transactions ACID et requêtes préparées,
 * ainsi qu'un mode local SQLite embarqué (better-sqlite3) pour garantir une exécution
 * immédiate et sans coupure dans l'environnement de prévisualisation.
 */

import mysql from 'mysql2/promise';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

function createMysqlPool(): mysql.Pool {
  const connectionUri = process.env.DATABASE_URL || process.env.MYSQL_URL;
  if (connectionUri) {
    return mysql.createPool({
      uri: connectionUri,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      decimalNumbers: true,
      ssl: process.env.MYSQL_SSL === 'false' ? undefined : { rejectUnauthorized: false }
    });
  }

  const host = process.env.MYSQL_HOST || 'localhost';
  const port = Number(process.env.MYSQL_PORT) || 3306;
  const user = process.env.MYSQL_USER || 'root';
  const password = process.env.MYSQL_PASSWORD || '';
  const database = process.env.MYSQL_DATABASE || 'flash_shop_db';

  return mysql.createPool({
    host,
    port,
    user,
    password,
    database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    decimalNumbers: true,
    ssl: process.env.MYSQL_SSL === 'true' ? { rejectUnauthorized: false } : undefined
  });
}

export type DbDriver = 'mysql' | 'sqlite_fallback';

interface DbState {
  driver: DbDriver;
  isConnected: boolean;
  mysqlPool: mysql.Pool | null;
  sqliteDb: Database.Database | null;
  error?: string;
}

const state: DbState = {
  driver: 'sqlite_fallback',
  isConnected: false,
  mysqlPool: null,
  sqliteDb: null
};

// Initialisation de la base SQLite locale
function initSqliteFallback() {
  const dataDir = process.env.VERCEL ? path.join('/tmp', 'data') : path.resolve(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const dbPath = path.join(dataDir, 'flash_shop.sqlite');
  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  // Création des tables identiques au schéma MySQL
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'ADMIN',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      reference TEXT NOT NULL UNIQUE,
      category_id INTEGER NOT NULL,
      image_url TEXT,
      buy_price REAL NOT NULL DEFAULT 0.00,
      sell_price REAL NOT NULL DEFAULT 0.00,
      quantity INTEGER NOT NULL DEFAULT 0,
      alert_threshold INTEGER NOT NULL DEFAULT 5,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE RESTRICT ON UPDATE CASCADE
    );

    CREATE TABLE IF NOT EXISTS stock_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      type TEXT NOT NULL, -- 'ENTREE', 'SORTIE', 'CORRECTION', 'VENTE'
      quantity INTEGER NOT NULL,
      previous_stock INTEGER NOT NULL,
      new_stock INTEGER NOT NULL,
      reason TEXT NOT NULL,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_number TEXT NOT NULL UNIQUE,
      total_amount REAL NOT NULL,
      amount_received REAL NOT NULL,
      change_returned REAL NOT NULL DEFAULT 0.00,
      payment_method TEXT NOT NULL DEFAULT 'ESPECES',
      status TEXT NOT NULL DEFAULT 'VALIDEE',
      user_id INTEGER,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL,
      product_id INTEGER,
      product_name TEXT NOT NULL,
      product_ref TEXT NOT NULL,
      unit_price REAL NOT NULL,
      unit_cost REAL NOT NULL DEFAULT 0.00,
      quantity INTEGER NOT NULL,
      total_price REAL NOT NULL,
      FOREIGN KEY (sale_id) REFERENCES sales (id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT,
      expense_date TEXT NOT NULL,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY,
      shop_name TEXT NOT NULL DEFAULT 'FLASH-SHOP',
      shop_tagline TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL,
      address TEXT NOT NULL,
      city TEXT NOT NULL,
      currency TEXT NOT NULL DEFAULT 'FCFA',
      receipt_footer TEXT NOT NULL,
      tax_rate REAL NOT NULL DEFAULT 0.00,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seeding initial si la table users est vide
  const userCount = sqlite.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (userCount.count === 0) {
    // Admin par défaut : admin / admin123 (hash bcrypt valide)
    sqlite.prepare(`
      INSERT INTO users (id, username, email, password_hash, full_name, role)
      VALUES (1, 'admin', 'admin@flash-shop.ci', '$2a$10$fG6a/19v62e/ZzH3z4z81e6QpZ/6eQo4a6mF7H8h3O7mK6H2j5g2a', 'Mamadou Diaby (Directeur)', 'ADMIN')
    `).run();

    sqlite.prepare(`
      INSERT INTO settings (id, shop_name, shop_tagline, phone, email, address, city, currency, receipt_footer, tax_rate)
      VALUES (1, 'FLASH-SHOP', 'Vente de Matériels Électroniques & Accessoires High-Tech', '+225 07 88 99 00 11', 'contact@flash-shop.ci', 'Boulevard Giscard d''Estaing, Zone 4', 'Abidjan', 'FCFA', 'Merci de votre confiance ! Les matériels électroniques bénéficient d''une garantie constructeur de 12 mois.', 0.00)
    `).run();

    // Catégories
    const insertCat = sqlite.prepare('INSERT INTO categories (id, name, description) VALUES (?, ?, ?)');
    insertCat.run(1, 'Ordinateurs & Portables', 'PC portables professionnels, ultrabooks, stations de travail');
    insertCat.run(2, 'Smartphones & Tablettes', 'Téléphones intelligents haut de gamme, milieux de gamme et tablettes');
    insertCat.run(3, 'Audio & Casques', 'Casques sans fil, écouteurs Bluetooth et enceintes haute fidélité');
    insertCat.run(4, 'Accessoires & Câbles', 'Chargeurs rapides, adaptateurs, câbles USB-C, batteries externes');
    insertCat.run(5, 'Objets Connectés', "Montres connectées, bracelets d'activité, domotique");
    insertCat.run(6, 'Stockage & Périphériques', 'Disques SSD externes, clés USB, souris ergonomiques, claviers');

    // Produits du catalogue initial
    const insertProd = sqlite.prepare(`
      INSERT INTO products (id, name, reference, category_id, image_url, buy_price, sell_price, quantity, alert_threshold, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertProd.run(
      1,
      'UltraBook Dell XPS 15 16GB/512GB SSD',
      'LAP-DELL-XPS15',
      1,
      '/src/assets/images/product_laptop_pro_1793651307502.jpg',
      650000,
      850000,
      8,
      3,
      'Processeur Intel Core i7 13e Gen, Écran 15.6 pouces OLED 3.5K, Châssis aluminium usiné.'
    );

    insertProd.run(
      2,
      'Smartphone Samsung Galaxy S24 Ultra 256GB',
      'PHN-GAL-S24U',
      2,
      '/src/assets/images/product_smartphone_1793651308479.jpg',
      580000,
      725000,
      12,
      4,
      'Capteur photo 200MP, S-Pen intégré, Écran Dynamic AMOLED 2X 120Hz, Cadre Titane.'
    );

    insertProd.run(
      3,
      'Casque Sans-Fil Sony WH-1000XM5 ANC',
      'AUD-SONY-XM5',
      3,
      '/src/assets/images/product_headphones_1793651308128.jpg',
      180000,
      240000,
      15,
      5,
      'Réduction de bruit active de référence mondiale, autonomie 30h, confort premium.'
    );

    insertProd.run(
      4,
      'Chargeur Rapide Anker 65W GaN Dual USB-C',
      'ACC-ANK-65W',
      4,
      '',
      15000,
      25000,
      35,
      10,
      'Technologie GaNPrime, recharge simultanée PC portable et smartphone.'
    );

    insertProd.run(
      5,
      'Montre Connectée Apple Watch Series 9 45mm',
      'WAT-APL-S9',
      5,
      '',
      260000,
      330000,
      6,
      2,
      'Puce S9 SiP, geste Toucher deux fois, suivi santé avancé ECG & SpO2.'
    );

    insertProd.run(
      6,
      'Disque SSD Externe Samsung T7 Shield 1TB',
      'STK-SAM-T7-1TB',
      6,
      '',
      55000,
      80000,
      18,
      5,
      "Vitesse de transfert jusqu'à 1050 Mo/s, résistant aux chocs et intempéries IP65."
    );

    insertProd.run(
      7,
      'Écouteurs Apple AirPods Pro 2 USB-C',
      'AUD-APL-APP2',
      3,
      '',
      140000,
      195000,
      3,
      5,
      'Boîtier de charge MagSafe USB-C, réduction active du bruit 2x supérieure.'
    );

    insertProd.run(
      8,
      'Câble Tressé USB-C vers USB-C 100W 2M',
      'ACC-CAB-100W',
      4,
      '',
      4000,
      8500,
      2,
      8,
      'Puissance supportée 100W Power Delivery, tressage nylon haute résistance.'
    );

    // Mouvements de stock initiaux
    const insertMov = sqlite.prepare(`
      INSERT INTO stock_movements (product_id, type, quantity, previous_stock, new_stock, reason, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    insertMov.run(1, 'ENTREE', 8, 0, 8, 'Réception initiale arrivage fournisseur TechDistro', 1);
    insertMov.run(2, 'ENTREE', 12, 0, 12, 'Réception initiale arrivage fournisseur TechDistro', 1);
    insertMov.run(3, 'ENTREE', 15, 0, 15, 'Réception initiale arrivage fournisseur TechDistro', 1);
    insertMov.run(4, 'ENTREE', 35, 0, 35, 'Stock initial magasin', 1);
    insertMov.run(5, 'ENTREE', 6, 0, 6, 'Stock initial magasin', 1);
    insertMov.run(6, 'ENTREE', 18, 0, 18, 'Stock initial magasin', 1);
    insertMov.run(7, 'ENTREE', 3, 0, 3, 'Stock initial magasin (Stock Faible)', 1);
    insertMov.run(8, 'ENTREE', 2, 0, 2, 'Stock initial magasin (Stock Faible)', 1);

    // Dépenses initiales
    const insertExp = sqlite.prepare(`
      INSERT INTO expenses (title, category, amount, description, expense_date, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const today = new Date().toISOString().split('T')[0];
    insertExp.run('Loyer commercial local magasin', 'LOYER', 350000, 'Paiement mensuel bail commercial boutique', today, 1);
    insertExp.run('Facture Électricité & Climatisation', 'ELECTRICITE', 75000, 'Consommation électrique boutique et showroom', today, 1);
    insertExp.run('Abonnement Internet Fibre Optique Pro', 'INTERNET', 35000, 'Connexion fibre 300 Mbps pour caisse et magasin', today, 1);
    insertExp.run('Achat bobines papier ticket thermique', 'ENTRETIEN', 18000, 'Lot de 50 bobines thermiques 80mm pour caisse POS', today, 1);

    // Vente de démonstration
    sqlite.prepare(`
      INSERT INTO sales (id, sale_number, total_amount, amount_received, change_returned, payment_method, status, user_id, notes)
      VALUES (1, 'VTE-202611-0001', 265000, 270000, 5000, 'ESPECES', 'VALIDEE', 1, 'Client comptoir, achat casque et chargeur rapide')
    `).run();

    sqlite.prepare(`
      INSERT INTO sale_items (sale_id, product_id, product_name, product_ref, unit_price, unit_cost, quantity, total_price)
      VALUES 
      (1, 3, 'Casque Sans-Fil Sony WH-1000XM5 ANC', 'AUD-SONY-XM5', 240000, 180000, 1, 240000),
      (1, 4, 'Chargeur Rapide Anker 65W GaN Dual USB-C', 'ACC-ANK-65W', 25000, 15000, 1, 25000)
    `).run();
  }

  state.sqliteDb = sqlite;
  state.driver = 'sqlite_fallback';
  state.isConnected = true;
}

// Création automatique des tables et données MySQL si manquantes
async function initMysqlTables(conn: mysql.PoolConnection): Promise<void> {
  await conn.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(50) NOT NULL UNIQUE,
      email VARCHAR(100) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      full_name VARCHAR(100) NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'ADMIN',
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL UNIQUE,
      description VARCHAR(255) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS products (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(200) NOT NULL,
      reference VARCHAR(100) NOT NULL UNIQUE,
      category_id INT NOT NULL,
      image_url TEXT NULL,
      buy_price DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
      sell_price DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
      quantity INT NOT NULL DEFAULT 0,
      alert_threshold INT NOT NULL DEFAULT 5,
      description TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_products_ref (reference),
      INDEX idx_products_cat (category_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS stock_movements (
      id INT AUTO_INCREMENT PRIMARY KEY,
      product_id INT NOT NULL,
      type VARCHAR(30) NOT NULL,
      quantity INT NOT NULL,
      previous_stock INT NOT NULL,
      new_stock INT NOT NULL,
      reason VARCHAR(255) NOT NULL,
      created_by INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_stock_mov_prod (product_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS sales (
      id INT AUTO_INCREMENT PRIMARY KEY,
      sale_number VARCHAR(50) NOT NULL UNIQUE,
      total_amount DECIMAL(12, 2) NOT NULL,
      amount_received DECIMAL(12, 2) NOT NULL,
      change_returned DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
      payment_method VARCHAR(30) NOT NULL DEFAULT 'ESPECES',
      status VARCHAR(20) NOT NULL DEFAULT 'VALIDEE',
      user_id INT NULL,
      notes TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_sales_num (sale_number)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS sale_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      sale_id INT NOT NULL,
      product_id INT NULL,
      product_name VARCHAR(200) NOT NULL,
      product_ref VARCHAR(100) NOT NULL,
      unit_price DECIMAL(12, 2) NOT NULL,
      unit_cost DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
      quantity INT NOT NULL,
      total_price DECIMAL(12, 2) NOT NULL,
      INDEX idx_sale_items_sale (sale_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(200) NOT NULL,
      category VARCHAR(50) NOT NULL,
      amount DECIMAL(12, 2) NOT NULL,
      description TEXT NULL,
      expense_date VARCHAR(20) NOT NULL,
      created_by INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS settings (
      id INT PRIMARY KEY,
      shop_name VARCHAR(100) NOT NULL DEFAULT 'FLASH-SHOP',
      shop_tagline VARCHAR(255) NOT NULL,
      phone VARCHAR(50) NOT NULL,
      email VARCHAR(100) NOT NULL,
      address VARCHAR(255) NOT NULL,
      city VARCHAR(100) NOT NULL,
      currency VARCHAR(20) NOT NULL DEFAULT 'FCFA',
      receipt_footer TEXT NOT NULL,
      tax_rate DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // Seeding initial MySQL si la table users est vide
  const [userRows]: any = await conn.query('SELECT COUNT(*) as count FROM users');
  if (userRows[0]?.count === 0) {
    await conn.query(`
      INSERT INTO users (id, username, email, password_hash, full_name, role)
      VALUES (1, 'admin', 'admin@flash-shop.ci', '$2a$10$fG6a/19v62e/ZzH3z4z81e6QpZ/6eQo4a6mF7H8h3O7mK6H2j5g2a', 'Mamadou Diaby (Directeur)', 'ADMIN');
    `);

    await conn.query(`
      INSERT INTO settings (id, shop_name, shop_tagline, phone, email, address, city, currency, receipt_footer, tax_rate)
      VALUES (1, 'FLASH-SHOP', 'Vente de Matériels Électroniques & Accessoires High-Tech', '+225 07 88 99 00 11', 'contact@flash-shop.ci', 'Boulevard Giscard d''Estaing, Zone 4', 'Abidjan', 'FCFA', 'Merci de votre confiance ! Les matériels électroniques bénéficient d''une garantie constructeur de 12 mois.', 0.00);
    `);

    await conn.query(`
      INSERT IGNORE INTO categories (id, name, description) VALUES
      (1, 'Ordinateurs & Portables', 'PC portables professionnels, ultrabooks, stations de travail'),
      (2, 'Smartphones & Tablettes', 'Téléphones intelligents haut de gamme, milieux de gamme et tablettes'),
      (3, 'Audio & Casques', 'Casques sans fil, écouteurs Bluetooth et enceintes haute fidélité'),
      (4, 'Accessoires & Câbles', 'Chargeurs rapides, adaptateurs, câbles USB-C, batteries externes'),
      (5, 'Objets Connectés', 'Montres connectées, bracelets d''activité, domotique'),
      (6, 'Stockage & Périphériques', 'Disques SSD externes, clés USB, souris ergonomiques, claviers');
    `);

    await conn.query(`
      INSERT IGNORE INTO products (id, name, reference, category_id, image_url, buy_price, sell_price, quantity, alert_threshold, description) VALUES
      (1, 'UltraBook Dell XPS 15 16GB/512GB SSD', 'LAP-DELL-XPS15', 1, '', 650000, 850000, 8, 3, 'Processeur Intel Core i7 13e Gen, Écran 15.6 pouces OLED 3.5K, Châssis aluminium usiné.'),
      (2, 'Smartphone Samsung Galaxy S24 Ultra 256GB', 'PHN-GAL-S24U', 2, '', 580000, 725000, 12, 4, 'Capteur photo 200MP, S-Pen intégré, Écran Dynamic AMOLED 2X 120Hz, Cadre Titane.'),
      (3, 'Casque Sans-Fil Sony WH-1000XM5 ANC', 'AUD-SONY-XM5', 3, '', 180000, 245000, 15, 5, 'Réduction de bruit active exceptionnelle, 30h d''autonomie, Audio Hi-Res sans fil LDAC.'),
      (4, 'Chargeur Rapide Anker 65W GaN USB-C', 'ACC-ANK-65W', 4, '', 15000, 28000, 25, 10, 'Technologie GaNPrime ultra-compacte, 3 ports (2 USB-C + 1 USB-A), charge rapide universelle.'),
      (5, 'Montre Connectée Apple Watch Series 9 45mm', 'WAT-APL-S9', 5, '', 260000, 330000, 6, 2, 'Puce S9 SiP, geste Toucher deux fois, suivi santé avancé ECG & SpO2.'),
      (6, 'Disque SSD Externe Samsung T7 Shield 1TB', 'STK-SAM-T7-1TB', 6, '', 55000, 80000, 18, 5, 'Vitesse de transfert jusqu''à 1050 Mo/s, résistant aux chocs et intempéries IP65.'),
      (7, 'Écouteurs Apple AirPods Pro 2 USB-C', 'AUD-APL-APP2', 3, '', 140000, 195000, 3, 5, 'Boîtier de charge MagSafe USB-C, réduction active du bruit 2x supérieure.'),
      (8, 'Câble Tressé USB-C vers USB-C 100W 2M', 'ACC-CAB-100W', 4, '', 4000, 8500, 2, 8, 'Puissance supportée 100W Power Delivery, tressage nylon haute résistance.');
    `);
  }
}

// Tentative de connexion MySQL
export async function initDatabase(): Promise<void> {
  try {
    const pool = createMysqlPool();
    const connection = await pool.getConnection();
    await connection.ping();
    await initMysqlTables(connection);
    connection.release();

    state.mysqlPool = pool;
    state.driver = 'mysql';
    state.isConnected = true;
    console.log(`[FLASH-SHOP DB] Connecté avec succès au serveur MySQL.`);
  } catch (err: any) {
    state.error = err.message;
    console.warn(`[FLASH-SHOP DB] Impossible de joindre MySQL directement (${err.message}). Basculement automatique vers le moteur SQL relationnel persistant (better-sqlite3) pour assurer le fonctionnement continu.`);
    initSqliteFallback();
  }
}

// Exécuter une requête SELECT paramétrée
export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  if (state.driver === 'mysql' && state.mysqlPool) {
    const [rows] = await state.mysqlPool.execute(sql, params);
    return rows as T[];
  } else if (state.sqliteDb) {
    const stmt = state.sqliteDb.prepare(sql);
    return stmt.all(...params) as T[];
  }
  throw new Error('Aucune base de données connectée');
}

// Exécuter une requête INSERT/UPDATE/DELETE paramétrée
export async function execute(sql: string, params: any[] = []): Promise<{ insertId: number; affectedRows: number }> {
  if (state.driver === 'mysql' && state.mysqlPool) {
    const [result] = await state.mysqlPool.execute(sql, params);
    const res = result as any;
    return {
      insertId: Number(res.insertId || 0),
      affectedRows: Number(res.affectedRows || 0)
    };
  } else if (state.sqliteDb) {
    const stmt = state.sqliteDb.prepare(sql);
    const info = stmt.run(...params);
    return {
      insertId: Number(info.lastInsertRowid || 0),
      affectedRows: Number(info.changes || 0)
    };
  }
  throw new Error('Aucune base de données connectée');
}

// Gestion des Transactions ACID garantissant l'intégrité financière et des stocks
export interface TransactionClient {
  query<T = any>(sql: string, params?: any[]): Promise<T[]>;
  execute(sql: string, params?: any[]): Promise<{ insertId: number; affectedRows: number }>;
}

export async function withTransaction<T>(callback: (tx: TransactionClient) => Promise<T>): Promise<T> {
  if (state.driver === 'mysql' && state.mysqlPool) {
    const conn = await state.mysqlPool.getConnection();
    await conn.beginTransaction();
    try {
      const tx: TransactionClient = {
        async query<R = any>(sql: string, params: any[] = []): Promise<R[]> {
          const [rows] = await conn.execute(sql, params);
          return rows as R[];
        },
        async execute(sql: string, params: any[] = []) {
          const [res] = await conn.execute(sql, params);
          const r = res as any;
          return {
            insertId: Number(r.insertId || 0),
            affectedRows: Number(r.affectedRows || 0)
          };
        }
      };
      const result = await callback(tx);
      await conn.commit();
      return result;
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  } else if (state.sqliteDb) {
    const sqlite = state.sqliteDb;
    sqlite.exec('BEGIN TRANSACTION');
    try {
      const tx: TransactionClient = {
        async query<R = any>(sql: string, params: any[] = []): Promise<R[]> {
          const stmt = sqlite.prepare(sql);
          return stmt.all(...params) as R[];
        },
        async execute(sql: string, params: any[] = []) {
          const stmt = sqlite.prepare(sql);
          const info = stmt.run(...params);
          return {
            insertId: Number(info.lastInsertRowid || 0),
            affectedRows: Number(info.changes || 0)
          };
        }
      };
      const result = await callback(tx);
      sqlite.exec('COMMIT');
      return result;
    } catch (error) {
      sqlite.exec('ROLLBACK');
      throw error;
    }
  }
  throw new Error('Aucune base de données connectée pour exécuter la transaction');
}

// Statut de connexion et diagnostic pour l'interface
export async function getDbStatus() {
  try {
    const productsCount = await query('SELECT COUNT(*) as count FROM products');
    const salesCount = await query('SELECT COUNT(*) as count FROM sales');
    const categoriesCount = await query('SELECT COUNT(*) as count FROM categories');

    return {
      driver: state.driver,
      isConnected: state.isConnected,
      host: state.driver === 'mysql' ? (process.env.MYSQL_HOST || 'Serveur MySQL') : 'Moteur SQL Local Persistant',
      database: state.driver === 'mysql' ? (process.env.MYSQL_DATABASE || 'flash_shop_db') : 'flash_shop.sqlite',
      port: state.driver === 'mysql' ? (Number(process.env.MYSQL_PORT) || 3306) : 0,
      totalProducts: (productsCount[0] as any)?.count || 0,
      totalSales: (salesCount[0] as any)?.count || 0,
      totalCategories: (categoriesCount[0] as any)?.count || 0,
      engineName: state.driver === 'mysql' ? 'MySQL 8.x / MariaDB (InnoDB)' : 'SQLite 3 (Relational Engine, MySQL-Ready)',
      scriptAvailable: true
    };
  } catch (error: any) {
    return {
      driver: state.driver,
      isConnected: false,
      error: error.message
    };
  }
}
