const bodyParser = require('body-parser');
const express = require('express');
const cors = require('cors');
const knex = require('knex');

const app = express();
const port = 5000;

app.use(cors());

app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true }));

const database = knex({
  client: 'mysql',
  connection: {
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'sola',
  },
});

app.post('/register', (req, res) => {
  const { email, password } = req.body;
  database('users')
    .insert({
      email: email,
      password: password,
    })
    .then((data) => res.status(200).json('Successful'))
    .catch((err) => {
      res.status(400).json(err);
    });
});

app.get('/users', async (req, res) => {
  const users = await database.select('*').from('users');
  res.status(200).send(users);
});

app.listen(port, () => {
  console.log('App is listening on port ' + port);
});
