FROM node:20-alpine

RUN apk update && apk add --no-cache \
  git \
  ffmpeg \
  libwebp-tools \
  imagemagick \
  && npm install -g pm2

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 8080

CMD ["npm", "start"]
