# syntax=docker/dockerfile:1

# ---- Build the app ----
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .

# Leave these empty for demo mode (data stays in the browser), or pass your
# Supabase project's URL and publishable key with --build-arg to use a real backend.
ARG VITE_SUPABASE_URL=""
ARG VITE_SUPABASE_ANON_KEY=""
ARG VITE_CONTACT_EMAIL=""
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY \
    VITE_CONTACT_EMAIL=$VITE_CONTACT_EMAIL

RUN npm run build

# ---- Serve it ----
FROM nginx:1.27-alpine

LABEL org.opencontainers.image.title="CiteCraft" \
      org.opencontainers.image.description="Academic workspace for researchers and students: publications, metrics, summaries and college tools." \
      org.opencontainers.image.source="https://github.com/AryanSinghh07/CiteCraft" \
      org.opencontainers.image.licenses="MIT"

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
