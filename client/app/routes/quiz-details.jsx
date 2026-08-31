import { useEffect, useState } from 'react';
// import { Link, useParams } from 'react-router';
// import { fetchQuiz } from '../api.js';

import { Link, useLoaderData } from 'react-router';
/**
 * Un questionnaire et ses questions — ce que l'animateur vérifie avant de
 * jouer. La bonne réponse est cochée : c'est la vue de l'AUTEUR.
 *
 * TODO (partie 2, jalon ②) : passer au rendu côté serveur, en vous calquant
 * sur le loader de la liste (/quizzes).
 *
 * 1. Exportez `loader` — elle reçoit { params }, et params.id est l'id de
 *    l'URL : fetch(`http://localhost:3000/api/quizzes/${params.id}`).
 * 2. Si l'API répond 404, levez une erreur ; sinon retournez le JSON.
 * 3. Dans le composant, remplacez useParams + useState + useEffect par
 *    const quiz = useLoaderData();
 */


export async function loader({ params }) {
  const response = await fetch(`http://localhost:3000/api/quizzes/${params.id}`);
  if (!response.ok) {
    throw new Error(`L'API répond : ${response.status}.`);
  }
  return response.json();
}

export default function QuizDetails() {
  const quiz = useLoaderData();


  if (!quiz) return <main className="screen">Chargement…</main>;

  return (
    <main className="screen">
      <h1>{quiz.title}</h1>
      <p>
        <Link to="/quizzes">← Mes questionnaires</Link>
      </p>
      {quiz.questions.map((question, i) => (
        <section key={question.id} className="card question">
          <h2>
            {i + 1}. {question.text}
          </h2>
          <p className="progress">{question.durationSeconds} secondes</p>
          <ul className="choice-list">
            {question.choices.map((choice) => (
              <li key={choice.id} className={choice.isCorrect ? 'correct' : ''}>
                {choice.text} {choice.isCorrect && '✓'}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
