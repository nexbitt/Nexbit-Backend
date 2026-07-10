FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --only=production

COPY prisma ./prisma
RUN npx prisma generate

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
