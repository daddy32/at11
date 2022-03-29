FROM ubuntu:latest
ENV TZ=Europe/Kiev
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone
RUN apt-get update && apt-get upgrade -y && \
    apt-get install -y nodejs \
    npm \
    curl dirmngr apt-transport-https lsb-release ca-certificates
#WORKDIR /usr/yourapplication-name
#COPY package.json .
COPY . .
run curl -sL https://deb.nodesource.com/setup_12.x | bash -
RUN npm install
#RUN npm ci
RUN npm install @types/locate-path
RUN npm install cli-boxes
RUN npm run build
RUN npm start
CMD ["node", "./dist/server.js"]