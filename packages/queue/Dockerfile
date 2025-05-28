FROM node:18-alpine

RUN apk add --no-cache curl

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

CMD ["npm", "run", "start"]
