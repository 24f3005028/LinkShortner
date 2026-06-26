# frontend/linkshortener/Dockerfile

FROM oven/bun:1.2-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app


# Install dependencies
FROM base AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile


# Build the Next.js app
FROM base AS builder
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Public build-time env vars
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL} \
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN bun run build


# Runtime image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Runtime envs if needed by server-side code
ARG CLERK_SECRET_KEY
ARG CLERK_SIGN_IN_URL
ARG CLERK_SIGN_UP_URL

ENV CLERK_SECRET_KEY=${CLERK_SECRET_KEY} \
    CLERK_SIGN_IN_URL=${CLERK_SIGN_IN_URL} \
    CLERK_SIGN_UP_URL=${CLERK_SIGN_UP_URL}

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

RUN mkdir -p ./.next && chown -R nextjs:nodejs /app

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]