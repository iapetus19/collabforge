FROM node:24-bookworm-slim

RUN apt-get update \
 && apt-get install -y --no-install-recommends default-jdk-headless g++ python3 \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY src ./src

RUN mkdir -p logs && chown -R node:node /app
USER node

CMD ["node", "src/server.js"]
