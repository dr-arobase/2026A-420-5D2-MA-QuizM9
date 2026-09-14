/**
 * Les lectures et écritures des questionnaires. Tout le SQL sur quiz,
 * question et choice vit ici — nulle part ailleurs.
 */
import { db, withTransaction } from './db.js';

// ── Les lectures ──────────────────────────────────────────────────────────

/**
 * Tous les questionnaires, avec leur nombre de questions.
 * @returns {Array<{id: number, title: string, questionCount: number}>}
 */
export function listQuizzes() {
  return db
    .prepare(
      `SELECT quiz.id, quiz.title, COUNT(question.id) AS questionCount
         FROM quiz
         LEFT JOIN question ON question.quiz_id = quiz.id
        GROUP BY quiz.id
        ORDER BY quiz.id`,
    )
    .all();
}

/**
 * Un questionnaire complet : ses questions en ordre, leurs choix, et où est
 * la bonne réponse. C'est la version pour le moteur de jeu et pour l'auteur
 * — jamais pour un joueur en pleine partie.
 *
 * @returns {null | {id, title, questions: Array<{id, text, durationSeconds,
 *   choices: Array<{id, text, isCorrect}>}>}}
 */
export function getQuizWithQuestions(quizId) {
  const quiz = db.prepare('SELECT id, title FROM quiz WHERE id = ?').get(quizId);
  if (!quiz) return null;

  const questions = db
    .prepare(
      `SELECT id, text, duration_seconds
         FROM question
        WHERE quiz_id = ?
        ORDER BY position`,
    )
    .all(quiz.id)
    .map((q) => ({
      id: q.id,
      text: q.text,
      durationSeconds: q.duration_seconds,
      choices: db
        .prepare('SELECT id, text, is_correct FROM choice WHERE question_id = ? ORDER BY id')
        .all(q.id)
        .map((c) => ({ id: c.id, text: c.text, isCorrect: c.is_correct === 1 })),
    }));

  return { id: quiz.id, title: quiz.title, questions };
}

// ── Les écritures de l'espace auteur (semaine 3) ──────────────────────────

/**
 * Crée un questionnaire vide. Pas de compte pour l'instant (semaine 5) :
 * account_id reste NULL.
 *
 * @returns {number} l'id du questionnaire créé
 */
export function createQuiz(title) {
  const result = db.prepare('INSERT INTO quiz (title) VALUES (?)').run(title);
  return result.lastInsertRowid;
}

/**
 * Ajoute une question à la fin d'un questionnaire, avec ses choix. La
 * question et ses choix s'écrivent ENSEMBLE : une transaction.
 *
 * @param {{text: string, durationSeconds: number,
 *   choices: Array<{text: string, isCorrect: boolean}>}} question
 * @returns {number} l'id de la question créée
 */
export function addQuestion(quizId, question) {
  return withTransaction(() => {
    const { next } = db
      .prepare('SELECT COALESCE(MAX(position), 0) + 1 AS next FROM question WHERE quiz_id = ?')
      .get(quizId);

    const questionId = db
      .prepare(
        `INSERT INTO question (quiz_id, position, text, duration_seconds)
         VALUES (?, ?, ?, ?)`,
      )
      .run(quizId, next, question.text, question.durationSeconds).lastInsertRowid;

    const insertChoice = db.prepare(
      'INSERT INTO choice (question_id, text, is_correct) VALUES (?, ?, ?)',
    );
    for (const choice of question.choices) {
      insertChoice.run(questionId, choice.text, choice.isCorrect ? 1 : 0);
    }

    return questionId;
  });
}

/**
 * Retire une question d'un questionnaire, choix compris. Échoue (clé
 * étrangère) si la question a déjà été jouée : ses réponses la référencent.
 *
 * @returns {boolean} true si une question a été supprimée
 */
export function deleteQuestion(quizId, questionId) {
  return withTransaction(() => {
    db.prepare('DELETE FROM choice WHERE question_id = ?').run(questionId);
    const result = db
      .prepare('DELETE FROM question WHERE id = ? AND quiz_id = ?')
      .run(questionId, quizId);
    return result.changes > 0;
  });
}
