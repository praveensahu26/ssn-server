const compression = require('compression');
const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const httpStatus = require('http-status');

const v1Routes = require('./routes/v1');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(helmet());
app.use(cors());
app.options('*', cors());
app.use(compression());

app.use('/v1', v1Routes);

app.use((req, res) => {
  res.status(httpStatus.NOT_FOUND).send({ message: 'Not found' });
});

module.exports = app;
