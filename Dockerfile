FROM node:24-slim as builder
ENV TZ=Europe/Kiev
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# Ensure consistent npm version
RUN npm install -g npm@11.3.0

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build
RUN ls -la /usr/src/app/*

FROM node:24-slim

# Ensure consistent npm version
RUN npm install -g npm@11.3.0

# Create app directory
WORKDIR /usr/src/app

# Install Puppeteer/Chromium dependencies
RUN apt-get update && apt-get install -y \
    wget \
    ca-certificates \
    fonts-liberation \
    gconf-service \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libgconf-2-4 \
    libgdk-pixbuf2.0-0 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxshmfence1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    xdg-utils \
    libu2f-udev \
    libvpx7 \
    libpci3 \
    libwayland-client0 \
    libwayland-cursor0 \
    libwayland-egl1 \
    libxkbcommon0 \
    libatspi2.0-0 \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# Install app dependencies
COPY package*.json ./

RUN npm ci --omit=dev

COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/static ./static
COPY --from=builder /usr/src/app/views ./views

RUN ls -la /usr/src/app/*

EXPOSE 54321
CMD ["node", "./dist/app.js"]
