import { Router } from 'express';
import { query, execute, getDbStatus, withTransaction } from '../db.ts';
import { authenticate } from '../auth.ts';
import fs from 'fs';
import path from 'path';

const router = Router();

// Obtenir les paramètres de la boutique
router.get('/', async (req, res) => {
  try {
    const settings = await query<any>('SELECT * FROM settings WHERE id = 1');
    if (settings.length === 0) {
      return res.json({
        id: 1,
        shop_name: 'FLASH-SHOP',
        shop_tagline: 'Vente de Matériels Électroniques & Accessoires High-Tech',
        phone: '+225 07 88 99 00 11',
        email: 'contact@flash-shop.ci',
        address: "Boulevard Giscard d'Estaing, Zone 4",
        city: 'Abidjan',
        currency: 'FCFA',
        receipt_footer: 'Merci de votre visite ! Matériels électroniques garantis.',
        tax_rate: 0
      });
    }
    res.json(settings[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Modifier les paramètres de la boutique
router.put('/', authenticate, async (req, res) => {
  try {
    const {
      shop_name,
      shop_tagline,
      phone,
      email,
      address,
      city,
      currency,
      receipt_footer,
      tax_rate
    } = req.body;

    if (!shop_name || !shop_name.trim()) {
      return res.status(400).json({ error: 'Le nom de la boutique est obligatoire.' });
    }

    await execute(`
      UPDATE settings SET
        shop_name = ?,
        shop_tagline = ?,
        phone = ?,
        email = ?,
        address = ?,
        city = ?,
        currency = ?,
        receipt_footer = ?,
        tax_rate = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `, [
      shop_name.trim(),
      shop_tagline?.trim() || '',
      phone?.trim() || '',
      email?.trim() || '',
      address?.trim() || '',
      city?.trim() || '',
      currency?.trim() || 'FCFA',
      receipt_footer?.trim() || '',
      Number(tax_rate) || 0
    ]);

    res.json({ message: 'Informations de la boutique mises à jour avec succès.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Obtenir le statut technique de la base de données
router.get('/db-status', authenticate, async (req, res) => {
  try {
    const status = await getDbStatus();
    res.json(status);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Récupérer le contenu du script MySQL `database.sql`
router.get('/sql-script', authenticate, async (req, res) => {
  try {
    const scriptPath = path.resolve(process.cwd(), 'database.sql');
    if (fs.existsSync(scriptPath)) {
      const sqlContent = fs.readFileSync(scriptPath, 'utf-8');
      res.json({ sql: sqlContent });
    } else {
      res.status(404).json({ error: 'Fichier database.sql non trouvé.' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Réinitialisation et suppression de données ciblée ou complète
router.post('/purge-data', authenticate, async (req, res) => {
  try {
    const { scope } = req.body; // 'all' | 'sales' | 'expenses' | 'products' | 'demo_seed'

    await withTransaction(async (tx) => {
      if (scope === 'sales' || scope === 'all') {
        await tx.execute('DELETE FROM sale_items');
        await tx.execute('DELETE FROM sales');
      }

      if (scope === 'expenses' || scope === 'all') {
        await tx.execute('DELETE FROM expenses');
      }

      if (scope === 'products' || scope === 'all') {
        await tx.execute('UPDATE sale_items SET product_id = NULL');
        await tx.execute('DELETE FROM stock_movements');
        await tx.execute('DELETE FROM products');
        if (scope === 'all') {
          await tx.execute('DELETE FROM categories');
        }
      }

      if (scope === 'demo_seed') {
        // Nettoyage préalable
        await tx.execute('DELETE FROM sale_items');
        await tx.execute('DELETE FROM sales');
        await tx.execute('DELETE FROM stock_movements');
        await tx.execute('DELETE FROM expenses');
        await tx.execute('DELETE FROM products');
        await tx.execute('DELETE FROM categories');

        // Ré-insertion catégories
        await tx.execute(`
          INSERT INTO categories (id, name, description) VALUES
          (1, 'Ordinateurs & Portables', 'PC portables professionnels, ultrabooks, stations de travail'),
          (2, 'Smartphones & Tablettes', 'Téléphones intelligents haut de gamme, milieux de gamme et tablettes'),
          (3, 'Audio & Casques', 'Casques sans fil, écouteurs Bluetooth et enceintes haute fidélité'),
          (4, 'Accessoires & Câbles', 'Chargeurs rapides, adaptateurs, câbles USB-C, batteries externes'),
          (5, 'Objets Connectés', 'Montres connectées, bracelets d''activité, domotique'),
          (6, 'Stockage & Périphériques', 'Disques SSD externes, clés USB, souris ergonomiques, claviers');
        `);

        // Ré-insertion produits
        await tx.execute(`
          INSERT INTO products (id, name, reference, category_id, image_url, buy_price, sell_price, quantity, alert_threshold, description) VALUES
          (1, 'UltraBook Dell XPS 15 16GB/512GB SSD', 'LAP-DELL-XPS15', 1, '/src/assets/images/product_laptop_pro_1793651307502.jpg', 650000, 850000, 8, 3, 'Intel i7, Écran OLED 3.5K'),
          (2, 'Smartphone Samsung Galaxy S24 Ultra 256GB', 'PHN-GAL-S24U', 2, '/src/assets/images/product_smartphone_1793651308479.jpg', 580000, 725000, 12, 4, 'Capteur 200MP, S-Pen'),
          (3, 'Casque Sans-Fil Sony WH-1000XM5 ANC', 'AUD-SONY-XM5', 3, '/src/assets/images/product_headphones_1793651308128.jpg', 180000, 240000, 15, 5, 'Réduction de bruit 30h'),
          (4, 'Chargeur Rapide Anker 65W GaN Dual USB-C', 'ACC-ANK-65W', 4, '', 15000, 25000, 35, 10, 'GaNPrime compact'),
          (5, 'Montre Connectée Apple Watch Series 9 45mm', 'WAT-APL-S9', 5, '', 260000, 330000, 6, 2, 'Puce S9, ECG & SpO2'),
          (6, 'Disque SSD Externe Samsung T7 Shield 1TB', 'STK-SAM-T7-1TB', 6, '', 55000, 80000, 18, 5, 'Vitesse 1050 Mo/s IP65'),
          (7, 'Écouteurs Apple AirPods Pro 2 USB-C', 'AUD-APL-APP2', 3, '', 140000, 195000, 3, 5, 'MagSafe USB-C ANC'),
          (8, 'Câble Tressé USB-C vers USB-C 100W 2M', 'ACC-CAB-100W', 4, '', 4000, 8500, 2, 8, 'Power Delivery 100W');
        `);

        // Mouvements initiaux
        await tx.execute(`
          INSERT INTO stock_movements (product_id, type, quantity, previous_stock, new_stock, reason, created_by) VALUES
          (1, 'ENTREE', 8, 0, 8, 'Stock initial magasin', 1),
          (2, 'ENTREE', 12, 0, 12, 'Stock initial magasin', 1),
          (3, 'ENTREE', 15, 0, 15, 'Stock initial magasin', 1),
          (4, 'ENTREE', 35, 0, 35, 'Stock initial magasin', 1),
          (5, 'ENTREE', 6, 0, 6, 'Stock initial magasin', 1),
          (6, 'ENTREE', 18, 0, 18, 'Stock initial magasin', 1),
          (7, 'ENTREE', 3, 0, 3, 'Stock initial magasin', 1),
          (8, 'ENTREE', 2, 0, 2, 'Stock initial magasin', 1);
        `);

        // Dépenses initiales
        const todayStr = new Date().toISOString().split('T')[0];
        await tx.execute(`
          INSERT INTO expenses (title, category, amount, description, expense_date, created_by) VALUES
          ('Loyer commercial local magasin', 'LOYER', 350000, 'Bail commercial boutique', ?, 1),
          ('Facture Électricité & Climatisation', 'ELECTRICITE', 75000, 'Électricité showroom', ?, 1),
          ('Abonnement Internet Fibre Optique Pro', 'INTERNET', 35000, 'Connexion fibre 300 Mbps', ?, 1);
        `, [todayStr, todayStr, todayStr]);
      }
    });

    res.json({ message: 'Opération de purge/réinitialisation effectuée avec succès.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
