/**
 * Le point d'entrée du serveur : `npm run dev` et le conteneur lancent ce
 * fichier. Tout le reste (les routes) est dans app.js, testable sans port.
 */
import { app } from './app.js';

const port = process.env.PORT ?? 3000;
app.listen(port, () => {
  console.log(`Quiz M9 : serveur démarré sur http://localhost:${port}`);
});
