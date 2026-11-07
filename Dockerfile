FROM node:22-alpine as base
RUN apk add --no-cache g++ make py3-pip libc6-compat
RUN npm install -g pnpm@11.28.9
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
EXPOSE 3000

FROM base as builder
WORKDIR /app
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build


FROM base as production
WORKDIR /app

ENV NODE_ENV=production
RUN pnpm install --frozen-lockfile --prod

RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001
USER nextjs


COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/public ./public

CMD pnpm start

FROM base as dev
ENV NODE_ENV=development
RUN pnpm install --frozen-lockfile
COPY . .
CMD pnpm run dev
