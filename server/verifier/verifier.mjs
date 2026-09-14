/**
 * Le harnais de vérification, version semaine 3.
 *
 * Il vérifie les trois jalons du repository (semaine 2), joue une partie
 * complète contre votre serveur, regarde DANS LA BASE que tout y est
 * vraiment, vérifie le rendu côté serveur des pages /quizzes (partie 2),
 * puis l'espace auteur : les action de la semaine 3 (partie 3). Lancez-le
 * depuis la racine, avec les serveurs démarrés dans un autre terminal :
 *
 *     npm run dev        (terminal 1)
 *     npm run verifier   (terminal 2)
 *
 * Chaque ligne est une vérification : ✔ elle passe, ✘ elle échoue. Ce n'est
 * pas une note — c'est la boucle « écrire, lancer, regarder ». Au départ,
 * les ✘ suivent l'ordre de votre travail de la semaine.
 */
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { calculateScore } from '../src/scoring.js';

const BASE = `http://localhost:${process.env.PORT ?? 3000}`;
const CLIENT = 'http://localhost:5173';
const DB_PATH = fileURLToPath(new URL('../data/quizm9.db', import.meta.url));
const results = [];

function check(name, condition, detail = '') {
  results.push({ name, ok: Boolean(condition), detail });
}

function section(title) {
  results.push({ section: title });
}

async function request(method, path, body) {
  const response = await fetch(BASE + path, {
    method,
    headers: body ? { 'content-type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await response.json();
  } catch {
    // pas de corps JSON : data reste null
  }
  return { status: response.status, data };
}

/** Une lecture directe dans quizm9.db — le harnais a le droit, pas vous. */
function inDatabase(fn, readOnly = true) {
  let db;
  try {
    db = new DatabaseSync(DB_PATH, { readOnly });
  } catch {
    return null;
  }
  try {
    return fn(db);
  } catch {
    return null;
  } finally {
    db.close();
  }
}

// ── 0. La fonction de pointage (fournie — doit toujours passer) ───────────

section('Le pointage');

check(
  'pointage : bonne réponse instantanée = 8 (5 + bonus rapidité 3)',
  calculateScore({ isCorrect: true, responseTimeMs: 0, questionDurationMs: 20000, isFirstCorrectAnswer: false }) === 8,
);
check(
  'pointage : première bonne réponse instantanée = 10 (maximum)',
  calculateScore({ isCorrect: true, responseTimeMs: 0, questionDurationMs: 20000, isFirstCorrectAnswer: true }) === 10,
);
check(
  'pointage : bonne réponse à mi-parcours = 6 (5 + bonus rapidité 1)',
  calculateScore({ isCorrect: true, responseTimeMs: 10000, questionDurationMs: 20000, isFirstCorrectAnswer: false }) === 6,
);
check(
  'pointage : mauvaise réponse = 0',
  calculateScore({ isCorrect: false, responseTimeMs: 0, questionDurationMs: 20000, isFirstCorrectAnswer: false }) === 0,
);
check(
  'pointage : bonne réponse après l’échéance = 0',
  calculateScore({ isCorrect: true, responseTimeMs: 25000, questionDurationMs: 20000, isFirstCorrectAnswer: false }) === 0,
);

// ── 1. Le serveur est-il là ? ─────────────────────────────────────────────

try {
  await fetch(BASE + '/api/games/000000');
} catch {
  console.log(render());
  console.log(`\n✘ Serveur injoignable sur ${BASE}.`);
  console.log('  Démarrez-le d’abord dans un autre terminal : npm run dev');
  process.exit(1);
}

// ── 2. Jalon 1 — le schéma est chargé, les questionnaires se lisent ───────

section('Jalon 1 — schema.sql et les questionnaires');

const EXPECTED_TABLES = ['account', 'quiz', 'question', 'choice', 'game', 'player', 'answer'];
const tables = inDatabase((db) =>
  db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((t) => t.name),
) ?? [];
for (const table of EXPECTED_TABLES) {
  check(
    `la table ${table} existe dans quizm9.db`,
    tables.includes(table),
    'initializeDatabase (repository/db.js) est-elle faite ? Le serveur a-t-il redémarré ?',
  );
}

const quizCountInDb = inDatabase((db) => db.prepare('SELECT COUNT(*) AS n FROM quiz').get().n);
check(
  'les questionnaires de seed.sql sont dans la base',
  quizCountInDb >= 2,
  'la base était-elle vide au moment du chargement ? Supprimez quizm9.db et redémarrez.',
);

let r = await request('GET', '/api/quizzes');
check(
  'GET /api/quizzes → 200 et au moins deux questionnaires',
  r.status === 200 && Array.isArray(r.data) && r.data.length >= 2,
  r.data?.error,
);
check(
  'chaque questionnaire a un id, un titre et son nombre de questions',
  Array.isArray(r.data) &&
    r.data.every((q) => q.id && q.title && typeof q.questionCount === 'number'),
);

r = await request('GET', '/api/quizzes/1');
check(
  'GET /api/quizzes/1 → 200, cinq questions, leurs choix en ordre',
  r.status === 200 && r.data?.questions?.length === 5 && r.data.questions[0].choices?.length === 4,
);

r = await request('GET', '/api/quizzes/999999');
check('GET sur un questionnaire inconnu → 404 { error }', r.status === 404 && r.data?.error);

// ── 3. Jalon 2 — créer une partie, et la voir dans la base ────────────────

section('Jalon 2 — créer une partie');

r = await request('POST', '/api/games', { quizId: 999999 });
check('POST /api/games sur un questionnaire inconnu → 404', r.status === 404);

r = await request('POST', '/api/games', { quizId: 1 });
check(
  'POST /api/games → 201 et un code',
  r.status === 201 && typeof r.data?.code === 'string',
  r.data?.error,
);
const code = r.data?.code;

const gameRow = inDatabase((db) =>
  db.prepare('SELECT * FROM game WHERE code = ?').get(code),
);
check(
  'la partie est une LIGNE de la table game — elle survivra au redémarrage',
  gameRow && gameRow.quiz_id === 1 && gameRow.state === 'lobby' && gameRow.question_index === -1,
);
check('la partie porte un created_at (horodatage du serveur)', gameRow?.created_at > 0);

// ── 4. Jalon 3 — inscrire des joueurs, et les voir dans la base ───────────

section('Jalon 3 — inscrire un joueur');

r = await request('GET', `/api/games/${code}`);
check(
  'GET état initial → 200, lobby, aucun joueur',
  r.status === 200 && r.data?.state === 'lobby' && r.data?.players?.length === 0,
);

r = await request('GET', '/api/games/000000');
check('GET sur une partie inconnue → 404 { error }', r.status === 404 && r.data?.error);

r = await request('POST', `/api/games/${code}/players`, { nickname: 'Alice' });
check('Alice rejoint → 201', r.status === 201, r.data?.error);
await request('POST', `/api/games/${code}/players`, { nickname: 'Bob' });

r = await request('POST', `/api/games/${code}/players`, { nickname: 'Alice' });
check('pseudonyme déjà pris → 400 { error }', r.status === 400 && r.data?.error);

r = await request('POST', `/api/games/${code}/players`, {});
check('pseudonyme manquant → 400 { error }', r.status === 400 && r.data?.error);

const playerRows = inDatabase((db) =>
  db.prepare('SELECT * FROM player WHERE game_id = ? ORDER BY nickname').all(gameRow?.id ?? -1),
);
check(
  'Alice et Bob sont des LIGNES de la table player, avec 0 point',
  playerRows?.length === 2 && playerRows.every((p) => p.score === 0),
);

// ── 5. Une partie complète, jouée contre l'API ────────────────────────────

section('Une partie complète');

// La bonne réponse de chaque question du quiz 1, lue directement.
const correctChoiceByQuestion = new Map(
  (inDatabase((db) =>
    db
      .prepare(
        `SELECT choice.question_id, choice.id
           FROM choice
           JOIN question ON question.id = choice.question_id
          WHERE question.quiz_id = 1 AND choice.is_correct = 1`,
      )
      .all(),
  ) ?? []).map((c) => [c.question_id, c.id]),
);

r = await request('POST', `/api/games/${code}/answers`, { nickname: 'Alice', choiceId: 1 });
check('répondre avant la première question → 400', r.status === 400);

r = await request('POST', `/api/games/${code}/next`);
check(
  'next → question 1 ouverte, avec texte, échéance et choix',
  r.status === 200 &&
    r.data?.state === 'question' &&
    r.data?.questionIndex === 0 &&
    r.data?.question?.text &&
    r.data?.question?.deadline > 0 &&
    r.data?.question?.choices?.length === 4,
);
check(
  'les choix envoyés au client ne disent PAS où est la bonne réponse',
  r.data?.question?.choices?.every((c) => !('isCorrect' in c) && !('is_correct' in c)),
);

const firstQuestionId = inDatabase((db) =>
  db.prepare('SELECT id FROM question WHERE quiz_id = 1 AND position = 1').get(),
)?.id;
const choicesQ1 = r.data?.question?.choices ?? [];
const correctQ1 = choicesQ1.find((c) => correctChoiceByQuestion.get(firstQuestionId) === c.id)?.id;
const wrongQ1 = choicesQ1.find((c) => c.id !== correctQ1)?.id;

r = await request('POST', `/api/games/${code}/answers`, { nickname: 'Alice', choiceId: correctQ1 });
check('Alice répond (bonne réponse) → 201', r.status === 201);

r = await request('POST', `/api/games/${code}/answers`, { nickname: 'Alice', choiceId: correctQ1 });
check('Alice répond une deuxième fois → 400', r.status === 400);

r = await request('POST', `/api/games/${code}/answers`, { nickname: 'Zoé', choiceId: correctQ1 });
check('un joueur inconnu répond → 400', r.status === 400);

await request('POST', `/api/games/${code}/answers`, { nickname: 'Bob', choiceId: wrongQ1 });

r = await request('GET', `/api/games/${code}`);
check('l’état annonce 2 réponses reçues', r.data?.answerCount === 2);

const answerRows = inDatabase((db) =>
  db.prepare('SELECT * FROM answer WHERE game_id = ? ORDER BY answered_at').all(gameRow?.id ?? -1),
);
check(
  'les réponses sont des LIGNES de la table answer, horodatées par le serveur',
  answerRows?.length === 2 && answerRows.every((a) => a.answered_at > 0),
);
check(
  'avant la clôture, les points d’une réponse sont encore NULL',
  answerRows?.every((a) => a.points === null),
);

r = await request('POST', `/api/games/${code}/next`);
check('next pendant une question → la question est close (résultats)', r.data?.state === 'results');

const alice = r.data?.players?.find((p) => p.nickname === 'Alice');
const bob = r.data?.players?.find((p) => p.nickname === 'Bob');
check(
  'Alice (bonne réponse rapide, première) a entre 7 et 10 points',
  alice && alice.score >= 7 && alice.score <= 10,
  alice ? `Alice a ${alice.score}` : 'Alice absente du classement',
);
check('Bob (mauvaise réponse) a 0 point', bob?.score === 0);
check(
  'le classement est trié : Alice devant Bob',
  r.data?.players?.[0]?.nickname === 'Alice',
);

const closedRows = inDatabase((db) => ({
  answers: db.prepare('SELECT points FROM answer WHERE game_id = ?').all(gameRow?.id ?? -1),
  alice: db
    .prepare('SELECT score FROM player WHERE game_id = ? AND nickname = ?')
    .get(gameRow?.id ?? -1, 'Alice'),
}));
check(
  'après la clôture, chaque réponse porte ses points dans la base',
  closedRows?.answers?.length === 2 && closedRows.answers.every((a) => a.points !== null),
);
check(
  'le score d’Alice dans la table player est celui du classement',
  Number.isInteger(closedRows?.alice?.score) && closedRows.alice.score === alice?.score,
);

// On épuise les questions restantes (deux « next » par question) pour finir la partie.
for (let i = 0; i < 12; i += 1) {
  r = await request('POST', `/api/games/${code}/next`);
  if (r.data?.state === 'finished') break;
}
check('après la dernière question, la partie est terminée', r.data?.state === 'finished');

check(
  'la partie terminée est dans la base : un redémarrage ne l’effacera pas',
  inDatabase((db) => db.prepare('SELECT state FROM game WHERE code = ?').get(code))?.state ===
    'finished',
);

// ── 6. Partie 2 — le rendu côté serveur de /quizzes ───────────────────────

section('Partie 2 — rendu côté serveur');

/** Le HTML que le NAVIGATEUR reçoit — avant que le moindre JavaScript tourne. */
async function fetchHtml(path) {
  try {
    const response = await fetch(CLIENT + path);
    return response.ok ? await response.text() : null;
  } catch {
    return null;
  }
}

const quizzesHtml = await fetchHtml('/quizzes');
check(
  'le HTML de /quizzes contient déjà les titres des questionnaires',
  quizzesHtml?.includes('SQL et SQLite'),
  quizzesHtml === null
    ? `client injoignable sur ${CLIENT} — npm run dev le démarre aussi`
    : 'le loader est-il écrit ? Affichez la source de la page : la liste doit y être.',
);

const detailsHtml = await fetchHtml('/quizzes/2');
check(
  'le HTML de /quizzes/2 contient déjà les questions et leurs choix',
  detailsHtml?.includes('lastInsertRowid'),
  detailsHtml === null
    ? `client injoignable sur ${CLIENT} — npm run dev le démarre aussi`
    : 'même exercice que la liste, avec params.id',
);

// ── 7. Partie 3 — l'espace auteur : les action (semaine 3) ────────────────

section('Partie 3 — les action de l’espace auteur');

/**
 * Envoie un formulaire au serveur du CLIENT, comme le ferait un navigateur
 * sans JavaScript : un POST encodé en formulaire, sur l'URL de la page.
 * React Router y répond en exécutant l'action de la route.
 */
async function submitForm(path, fields) {
  try {
    const response = await fetch(CLIENT + path, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(fields).toString(),
      redirect: 'manual',
    });
    return {
      status: response.status,
      location: response.headers.get('location') ?? '',
      html: await response.text(),
    };
  } catch {
    return null;
  }
}

const title = `Harnais ${Date.now()}`;
let form = await submitForm('/quizzes', { title });
check(
  'POST du formulaire /quizzes → redirection (302) vers /quizzes/:id/edit',
  form && form.status === 302 && /\/quizzes\/\d+\/edit$/.test(form.location),
  form === null
    ? `client injoignable sur ${CLIENT} — npm run dev le démarre aussi`
    : `réponse ${form?.status} — l'action est-elle exportée ? Termine-t-elle par redirect(...) ?`,
);
const quizRow = inDatabase((db) => db.prepare('SELECT * FROM quiz WHERE title = ?').get(title));
check(
  'le questionnaire est une LIGNE de la table quiz',
  quizRow !== null && quizRow !== undefined,
  'l’action a-t-elle appelé POST /api/quizzes ?',
);
const editPath = form?.location.replace(/^https?:\/\/[^/]+/, '') || `/quizzes/${quizRow?.id}/edit`;

form = await submitForm('/quizzes', { title: '   ' });
check(
  'un titre vide → 400, et le message de l’API dans la page',
  form?.status === 400 && form.html.includes('Le titre est obligatoire.'),
  `réponse ${form?.status} — data({ error }, { status: 400 }) et useActionData ?`,
);

const editHtml = await fetchHtml(editPath);
check(
  'le HTML de /quizzes/:id/edit contient déjà le titre (le loader de l’éditeur)',
  editHtml?.includes(title),
  editHtml === null ? 'la page répond une erreur — le loader est-il écrit ?' : '',
);

form = await submitForm(editPath, {
  intent: 'add',
  text: 'Quelle commande construit une image ?',
  durationSeconds: '15',
  choice1: 'docker build',
  choice2: 'docker run',
  choice3: 'docker ps',
  choice4: '',
  correct: '1',
});
check(
  'POST du formulaire d’ajout → 200 et la question apparaît dans la page (revalidation)',
  form?.status === 200 && form.html.includes('Quelle commande construit une image ?'),
  `réponse ${form?.status} — l'action retourne-t-elle sans redirection ?`,
);
const questionRows = inDatabase((db) =>
  db
    .prepare(
      `SELECT question.id, question.position, question.duration_seconds,
              (SELECT COUNT(*) FROM choice WHERE choice.question_id = question.id) AS n,
              (SELECT COUNT(*) FROM choice WHERE choice.question_id = question.id AND is_correct = 1) AS correct
         FROM question WHERE quiz_id = ?`,
    )
    .all(quizRow?.id ?? -1),
);
check(
  'la question est en base : position 1, 15 s, trois choix, une seule bonne réponse',
  questionRows?.length === 1 &&
    questionRows[0].position === 1 &&
    questionRows[0].duration_seconds === 15 &&
    questionRows[0].n === 3 &&
    questionRows[0].correct === 1,
  'les choix vides sont-ils ignorés ? isCorrect est-il vrai pour le choix coché seulement ?',
);

form = await submitForm(editPath, {
  intent: 'add',
  text: 'Sans bonne réponse',
  durationSeconds: '15',
  choice1: 'a',
  choice2: 'b',
  choice3: '',
  choice4: '',
});
check(
  'une question sans bonne réponse → 400, et le message de l’API dans la page',
  form?.status === 400 && form.html.includes('exactement une bonne réponse'),
  `réponse ${form?.status}`,
);

form = await submitForm(editPath, {
  intent: 'delete',
  questionId: String(questionRows?.[0]?.id ?? -1),
});
const remaining = inDatabase((db) =>
  db.prepare('SELECT COUNT(*) AS n FROM question WHERE quiz_id = ?').get(quizRow?.id ?? -1).n,
);
check(
  'jalon 4 : intent=delete retire la question',
  form?.status === 200 && remaining === 0,
);

// Le ménage : le harnais efface le questionnaire qu'il a créé.
inDatabase((db) => {
  const ids = db.prepare('SELECT id FROM question WHERE quiz_id = ?').all(quizRow?.id ?? -1);
  for (const { id } of ids) db.prepare('DELETE FROM choice WHERE question_id = ?').run(id);
  db.prepare('DELETE FROM question WHERE quiz_id = ?').run(quizRow?.id ?? -1);
  db.prepare('DELETE FROM quiz WHERE id = ?').run(quizRow?.id ?? -1);
}, false);

// ── Bilan ─────────────────────────────────────────────────────────────────

function render() {
  return results
    .map((x) =>
      x.section
        ? `\n── ${x.section} ${'─'.repeat(Math.max(0, 55 - x.section.length))}`
        : `${x.ok ? '✔' : '✘'} ${x.name}${!x.ok && x.detail ? `\n    ↳ ${x.detail}` : ''}`,
    )
    .join('\n');
}

console.log(render());
const checks = results.filter((x) => !x.section);
const passed = checks.filter((x) => x.ok).length;
console.log(`\n${passed}/${checks.length} vérifications passent.`);
process.exit(passed === checks.length ? 0 : 1);
