/**
 * LA porte d'entrée vers la base. La règle de la semaine 2, valable jusqu'à
 * la fin de la session : aucune requête SQL en dehors du dossier repository/.
 *
 * La semaine 5, SQLite cède sa place à PostgreSQL : si tout le SQL est ici,
 * le changement reste confiné ici.
 */
export { initializeDatabase, withTransaction } from './db.js';
export {
  addQuestion,
  createQuiz,
  deleteQuestion,
  getQuizWithQuestions,
  listQuizzes,
} from './quizzes.js';
export {
  addPlayer,
  addPointsToPlayer,
  countAnswers,
  createGame,
  findAnswer,
  findGameByCode,
  findPlayer,
  getAnswersForQuestion,
  getPlayers,
  recordAnswer,
  setAnswerPoints,
  updateGameState,
} from './games.js';
