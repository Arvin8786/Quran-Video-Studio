FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /app /app
ENV NODE_ENV=production PORT=3000 PROEASE_DATA_DIR=/data
RUN mkdir -p /data && chown node:node /data /app
USER node
EXPOSE 3000
CMD ["npm", "start"]
