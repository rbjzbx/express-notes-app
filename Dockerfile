FROM node:20
WORKDIR /app
COPY . .
RUN npm config set registry https://registry.npmmirror.com
RUN npm install --legacy-peer-deps
EXPOSE 3000
CMD ["npm", "start" ]