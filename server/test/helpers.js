/**
 * Ce qu'un test d'intégration partage : démarrer l'API sur un port libre,
 * avec une base SQLite TEMPORAIRE, et lui parler en JSON.
 *
 * Chaque fichier de test tourne dans son propre processus (node --test), donc
 * chaque fichier a sa base, créée vide puis remplie par seed.sql. Deux
 * fichiers lancés en parallèle ne se voient pas.
 */
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/** Démarre l'API et retourne son adresse et une fonction pour l'arrêter. */
export async function startServer() {
  // DB_PATH doit être fixé AVANT d'importer app.js : db.js le lit au chargement.
  process.env.DB_PATH = join(mkdtempSync(join(tmpdir(), 'quizm9-test-')), 'quizm9.db');
  const { app } = await import('../src/app.js');

  const server = app.listen(0); // 0 : n'importe quel port libre
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://localhost:${server.address().port}`;

  return {
    base,
    /** Une requête JSON : retourne { status, data }. */
    async request(method, path, body) {
      const response = await fetch(base + path, {
        method,
        headers: body ? { 'content-type': 'application/json' } : {},
        body: body ? JSON.stringify(body) : undefined,
      });
      let data = null;
      try {
        data = await response.json();
      } catch {
        // pas de corps JSON
      }
      return { status: response.status, data };
    },
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}
