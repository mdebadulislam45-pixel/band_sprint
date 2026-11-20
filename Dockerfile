# BandSprint server — Cloud Run image.
# Node 24 is required: Firebase packages in this project need Node >= 24.
FROM node:24-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-slim AS run
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build /app/public ./public
COPY server.ts ./
COPY src ./src
COPY scripts ./scripts
# Cloud Run injects PORT (default 8080) and probes /healthz.
EXPOSE 8080
CMD ["npx", "tsx", "server.ts"]
