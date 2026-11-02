# Builds the stdio MCP server from source. Starts without a key (tools then return a "set FETCHROUTER_API_KEY" hint).
FROM node:22-slim
WORKDIR /app
COPY package.json tsconfig.json ./
RUN npm install --no-audit --no-fund
COPY src ./src
RUN npx tsc -p . && npm prune --omit=dev
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
