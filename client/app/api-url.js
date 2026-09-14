/**
 * L'adresse de l'API, vue depuis le SERVEUR du client (là où tournent les
 * loader et les action). Le relais de Vite n'existe que pour le navigateur.
 *
 * Par défaut, localhost:3000 : votre poste. Dans un conteneur, l'adresse
 * vient de la variable d'environnement API_URL (semaine 3, Docker).
 */
export const API_URL = process.env.API_URL ?? 'http://localhost:3000';
