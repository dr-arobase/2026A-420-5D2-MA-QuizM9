# L'image du CLIENT de Quiz M9, construite en deux étapes. Fournie.
#
# Le contexte de construction est la RACINE du dépôt (voir compose.yml) :
# c'est là que vivent package-lock.json et les workspaces.

# ── Étape 1 : construire (Vite a besoin des devDependencies) ──────────────
FROM node:24-alpine AS build
WORKDIR /app

# Les manifestes d'abord, le code ensuite : tant qu'ils ne changent pas,
# la couche npm ci est reprise du cache au prochain build.
COPY package.json package-lock.json ./
COPY server/package.json server/
COPY client/package.json client/
RUN npm ci -w client

COPY client/ client/
RUN npm run build -w client

# ── Étape 2 : l'image d'exécution, sans Vite ni devDependencies ───────────
FROM node:24-alpine
WORKDIR /app

COPY package.json package-lock.json ./
COPY server/package.json server/
COPY client/package.json client/
RUN npm ci -w client --omit=dev

# Seulement le résultat du build et le petit serveur de production.
COPY --from=build /app/client/build client/build
COPY client/server.js client/

WORKDIR /app/client
ENV PORT=5173
EXPOSE 5173
CMD ["node", "server.js"]
