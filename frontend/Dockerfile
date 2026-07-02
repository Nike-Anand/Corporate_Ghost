FROM node:20-alpine

WORKDIR /app

# Copy package descriptors
COPY package.json ./

# Install npm dependencies
RUN npm install

# Copy source code
COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev"]
