FROM node:22-alpine AS base
WORKDIR /app
RUN npm install -g npm@11.10.0
COPY package.json package-lock.json .npmrc ./
RUN npm ci

FROM base AS builder
COPY . .
RUN npm run build

FROM base AS api
COPY tsconfig.json ./
COPY src ./src
COPY docs ./docs
COPY db ./db
ENV PORT=4317
ENV TZ=Asia/Tokyo
EXPOSE 4317
CMD ["npm", "run", "api"]

FROM nginx:1.27-alpine AS web
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 3847
