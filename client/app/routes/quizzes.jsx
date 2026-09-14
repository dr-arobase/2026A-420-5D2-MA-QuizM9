import { Form, Link, data, redirect, useActionData, useLoaderData } from 'react-router';
import { API_URL } from '../api-url.js';

/**
 * La liste de l'animateur : ses questionnaires. (Tous, en fait — les
 * comptes arrivent à la semaine 5.)
 *
 * Rendu CÔTÉ SERVEUR : le loader s'exécute sur le serveur, AVANT le rendu.
 */
export async function loader() {
  const response = await fetch(`${API_URL}/api/quizzes`);
  if (!response.ok) {
    throw new Error(`L'API répond ${response.status}.`);
  }
  return response.json();
}

/**
 * L'action qui crée un questionnaire. React Router l'appelle quand le
 * <Form method="post"> ci-dessous est envoyé ; elle s'exécute sur le
 * serveur, comme le loader.
 */
export async function action({ request }) {
  const formData = await request.formData();

  const response = await fetch(`${API_URL}/api/quizzes`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ title: formData.get('title') }),
  });
  const body = await response.json();

  if (!response.ok) {
    // L'erreur retourne à la page, avec le code de l'API ; useActionData la lit.
    return data({ error: body.error }, { status: response.status });
  }
  // Créé : on envoie l'auteur remplir son questionnaire.
  return redirect(`/quizzes/${body.id}/edit`);
}

export default function Quizzes() {
  const quizzes = useLoaderData();
  const actionData = useActionData();

  return (
    <main className="screen">
      <h1>Mes questionnaires</h1>
      <ul className="quiz-list">
        {quizzes.map((quiz) => (
          <li key={quiz.id} className="card row">
            <div>
              <h2>
                <Link to={`/quizzes/${quiz.id}`}>{quiz.title}</Link>
              </h2>
              <p className="progress">{quiz.questionCount} questions</p>
            </div>
            <Link className="button" to={`/quizzes/${quiz.id}/edit`}>Modifier</Link>
          </li>
        ))}
      </ul>

      {/* Un formulaire HTML classique : method et action, comme au livre
          d'or. <Form> de React Router l'envoie à l'action de cette route
          sans recharger la page — et rejoue le loader ensuite. */}
      <Form method="post" className="card">
        <h2>Nouveau questionnaire</h2>
        <label>
          Titre
          <input name="title" placeholder="Titre du questionnaire" required />
        </label>
        {actionData?.error && <p className="error">{actionData.error}</p>}
        <button>Créer</button>
      </Form>
    </main>
  );
}
