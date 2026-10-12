FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
COPY apps/worker/package.json apps/worker/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm install
COPY packages/shared packages/shared
COPY apps/worker apps/worker
RUN npm --workspace @shortlab/shared run build && npm --workspace @shortlab/worker run build
CMD ["npm","--workspace","@shortlab/worker","start"]
