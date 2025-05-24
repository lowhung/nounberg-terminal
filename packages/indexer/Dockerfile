FROM node:18-alpine

WORKDIR /app
COPY . .

WORKDIR /app/ponder
RUN npm ci

COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

EXPOSE 42069

ENTRYPOINT ["/app/entrypoint.sh"]
