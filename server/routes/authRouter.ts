import { Router } from 'express';
import { query, execute } from '../db.ts';
import { generateToken, authenticate } from '../auth.ts';

const router = Router();

// Connexion rapide sans mot de passe (Par défaut : Administrateur)
router.post('/quick-login', async (req, res) => {
  try {
    const users = await query<any>(
      'SELECT id, username, email, full_name, role, is_active FROM users WHERE is_active = 1 ORDER BY id ASC LIMIT 1'
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'Aucun utilisateur actif trouvé.' });
    }

    const user = users[0];
    const authUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      full_name: user.full_name,
      role: user.role
    };

    const token = generateToken(authUser);
    res.json({
      message: 'Connexion directe réussie',
      token,
      user: authUser
    });
  } catch (error: any) {
    console.error('[Quick-Login Error]', error);
    res.status(500).json({ error: 'Erreur lors de la connexion directe.' });
  }
});

// Connexion d'un utilisateur sans exigence de mot de passe
router.post('/login', async (req, res) => {
  try {
    const { username } = req.body;
    
    // Si aucun identifiant n'est spécifié, connecter l'administrateur par défaut
    const searchTerm = (username && typeof username === 'string' && username.trim()) ? username.trim() : 'admin';

    const users = await query<any>(
      'SELECT id, username, email, full_name, role, is_active FROM users WHERE (username = ? OR email = ?) AND is_active = 1 LIMIT 1',
      [searchTerm, searchTerm]
    );

    let user = users[0];
    if (!user) {
      // Fallback sur le premier utilisateur actif
      const fallbackUsers = await query<any>(
        'SELECT id, username, email, full_name, role, is_active FROM users WHERE is_active = 1 ORDER BY id ASC LIMIT 1'
      );
      if (fallbackUsers.length > 0) {
        user = fallbackUsers[0];
      } else {
        return res.status(404).json({ error: 'Utilisateur introuvable.' });
      }
    }

    const authUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      full_name: user.full_name,
      role: user.role
    };

    const token = generateToken(authUser);
    res.json({
      message: 'Connexion réussie sans mot de passe',
      token,
      user: authUser
    });
  } catch (error: any) {
    console.error('[Auth Error]', error);
    res.status(500).json({ error: 'Erreur interne lors de la connexion.' });
  }
});

// Liste des comptes disponibles pour sélection rapide en 1 clic
router.get('/accounts', async (req, res) => {
  try {
    const users = await query<any>(
      'SELECT id, username, email, full_name, role FROM users WHERE is_active = 1 ORDER BY id ASC'
    );
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Récupérer le profil connecté
router.get('/me', authenticate, async (req, res) => {
  try {
    const users = await query<any>(
      'SELECT id, username, email, full_name, role, created_at FROM users WHERE id = ? LIMIT 1',
      [req.user!.id]
    );
    if (users.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé.' });
    }
    res.json(users[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
