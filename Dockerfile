# Production image: multi-stage build
FROM node:22-alpine AS builder

WORKDIR /app

RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:22-alpine AS production

WORKDIR /app

ENV NODE_ENV=production
# TypeORM loads .ts migrations at startup; ts-node is required in the runtime image.
# ENV NODE_OPTIONS=--require=ts-node/register

RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json ./
RUN npm ci --omit=dev \
  && npm install ts-node typescript --no-package-lock \
  && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/database ./database
COPY --from=builder /app/tsconfig.json ./

EXPOSE 7000

USER node

CMD ["node", "dist/src/main.js"]
