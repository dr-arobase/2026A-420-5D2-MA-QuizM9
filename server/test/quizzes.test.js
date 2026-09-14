/**
 * Tests d'INTÉGRATION de l'espace auteur : on démarre l'API sur une base
 * temporaire et on lui parle en HTTP, comme le fait le client.
 *
 * Le premier test est fourni. Les test.todo sont le jalon 2 ; le dernier
 * (« un questionnaire sans question ») est le jalon 3 : il doit ÉCHOUER
 * avant que vous corrigiez la route POST /api/games.
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer } from './helpers.js';

let api;
before(async () => {
  api = await startServer();
});
after(() => api.close());

test('un titre vide est refusé (400)', async () => {
  const { status, data } = await api.request('POST', '/api/quizzes', { title: '   ' });
  assert.equal(status, 400);
  assert.equal(typeof data.error, 'string');
});

test('un titre valide crée le questionnaire (201)', async () => {
  const { status, data } = await api.request('POST', '/api/quizzes', { title: 'Capitales' });
  assert.equal(status, 201);
  assert.equal(data.title, 'Capitales');
  assert.equal(typeof data.id, 'number');
});

// ── Jalon 2 ───────────────────────────────────────────────────────────────

test.todo('une question sans bonne réponse est refusée (400)');
test.todo('une question avec deux bonnes réponses est refusée (400)');
test.todo('une question valide est ajoutée et apparaît dans GET /api/quizzes/:id');

// ── Jalon 3 : d'abord le test qui échoue, ensuite la correction ───────────

test.todo('une partie sur un questionnaire sans question est refusée (400)');
