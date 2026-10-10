# Production image (untested on this machine; build with: docker build -t comfortfit .)
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production PORT=3100
COPY --from=build /app ./
USER node
EXPOSE 3100
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://localhost:3100/api/health || exit 1
CMD ["npm", "start"]
