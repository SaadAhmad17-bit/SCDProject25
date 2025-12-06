FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
RUN mkdir -p /app/backups /app/data
EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "main.js"]
