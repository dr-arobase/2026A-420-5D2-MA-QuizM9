# Quiz M9

Le fil rouge du cours 420-5D2. Un jeu-questionnaire en direct : un animateur
crée une partie et obtient un **code** ; les joueurs rejoignent avec ce code et
un pseudonyme, sans compte ; les questions défilent, le classement monte.

Le dépôt grandit d'une semaine à l'autre. **L'énoncé du travail de la semaine
est sur le site du cours**, sous
[Exercices](https://archambaultv.github.io/2026A-420-5D2-MA/g2/notes_de_cours/exercices).

## Prérequis

- Node.js **LTS** (24 ou plus récent) — tout le cours se fait sur la LTS ;
- deux navigateurs, ou une fenêtre normale et une fenêtre privée, pour jouer
  à la fois animateur et joueur ;
- sous Windows : clonez **hors d'un dossier synchronisé OneDrive**
  (Documents, Bureau…) — la synchronisation interfère avec `node --watch`,
  Vite et SQLite.

## Démarrer

```bash
npm install     # installe server/ et client/ d'un coup
npm run dev     # démarre le serveur (port 3000) et le client (port 5173)
```

Ouvrez <http://localhost:5173>.

## Vérifier

```bash
npm run verifier   # avec npm run dev qui tourne dans un autre terminal
```

## Tester (semaine 4)

```bash
npm test           # sans npm run dev : les tests démarrent l'API eux-mêmes
```

Les tests sont dans `server/test/`. Ceux de `calculateScore` sont unitaires
(pas de serveur) ; ceux de l'API démarrent `app.js` sur un port libre avec
une base temporaire.

## Intégration continue et images (semaine 4)

`.github/workflows/ci.yml` lance `npm test` à chaque `push`. Sur `main`, si
les tests passent, il construit les deux images et les publie dans le
registre de GitHub : `ghcr.io/<compte>/quizm9-api` et
`ghcr.io/<compte>/quizm9-client`, avec les tags `latest` et `sha-xxxxxxx`.

Sur une machine où il n'y a que Docker, `deploy/compose.yml` démarre Quiz M9
à partir de ces images, sans le code source.

## Avec Docker (semaine 3)

Sur une machine où seul Docker est installé :

```bash
docker compose up --build
```

Le client répond sur le port 5173, l'API sur le port 3000, et la base SQLite
vit dans le volume `quizm9-data`. Voir `compose.yml`, `server/Dockerfile` et
`client/Dockerfile`.
