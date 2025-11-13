const mongoose = require('mongoose');
require('dotenv').config();

const NRDBMS_URL = process.env.DB_URL;
const DB_USER = process.env.DB_USER;
const DB_PASS = process.env.DB_PASS;
const DB_NAME = process.env.DB_NAME;
const DB_HOST = process.env.DB_HOST;

const DB_URL = `mongodb+srv://${DB_USER}:${DB_PASS}@${DB_HOST}/${DB_NAME}?retryWrites=true&w=majority`;

mongoose.connect(`${NRDBMS_URL}/${DB_NAME}`, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Conectado a MongoDB con Mongoose'))
.catch(err => console.error('Error al conectar a MongoDB:', err));


