# Stage 1: Build dashboard
FROM node:20-alpine AS dashboard-build
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/dashboard/package.json ./packages/dashboard/
RUN npm ci --workspace=packages/dashboard
COPY packages/dashboard/ ./packages/dashboard/
COPY tsconfig.base.json ./
RUN npm run build --workspace=packages/dashboard

# Stage 2: Build server
FROM node:20-alpine AS server-build
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/server/package.json ./packages/server/
RUN npm ci --workspace=packages/server
COPY packages/server/ ./packages/server/
COPY tsconfig.base.json ./
RUN npm run build --workspace=packages/server

# Stage 3: Production runtime
FROM node:20-alpine
WORKDIR /app

# Copy built server
COPY --from=server-build /app/packages/server/dist ./dist
COPY --from=server-build /app/packages/server/package.json ./packages/server/

# Copy built dashboard into server's dist
COPY --from=dashboard-build /app/packages/dashboard/build ./dist/dashboard

# Install production dependencies only
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --workspace=packages/server 2>/dev/null || npm install --omit=dev

# Create data directory
RUN mkdir -p /data

EXPOSE 3000
VOLUME ["/data"]

ENV NODE_ENV=production
ENV DATA_DIR=/data
ENV PORT=3000

CMD ["node", "dist/index.js"]
