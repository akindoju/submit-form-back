const bodyParser = require('body-parser');
const express = require('express');
const cors = require('cors');
const knex = require('knex');
const bcrypt = require('bcrypt');
const app = express();
const port = 5000;

app.use(cors());

app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true }));

const sql = knex({
  client: 'mysql',
  connection: {
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'sola',
  },
});

app.post('/signin', (req, res) => {
  const { email, password } = req.body;

  sql
    .select('email', 'password')
    .from('signin')
    .where('email', '=', email)
    .then((data) => {
      const isValid = bcrypt.compareSync(password, data[0].password);
      if (isValid) {
        return sql
          .select('*')
          .from('users')
          .where('email', '=', email)
          .then((user) => res.json(user[0]))
          .catch((err) => {
            res.status(400).json(err);
          });
      } else {
        return sql
          .insert({
            email: email,
            password: password,
            date: new Date(),
          })
          .into('failed')
          .then((user) => res.json(user[0]))
          .catch((err) => {
            res.status(400).json(err);
          });
      }
    })
    .catch((err) => res.status(400).json('Wrong Credentials'));
});

app.post('/register', (req, res) => {
  const { email, password, name } = req.body;
  const hash = bcrypt.hashSync(password, 10);

  sql.transaction((trx) => {
    trx
      .insert({
        password: hash,
        email: email,
      })
      .into('signin')
      .then(
        sql('users')
          .insert({
            email: email,
            name: name,
          })
          .then((data) => res.status(200).json('Successful'))
          .catch((err) => {
            res.status(400).json(err);
          })
      )
      .then(trx.commit)
      .catch(trx.rollback);
  });
});

app.get('/users', async (req, res) => {
  const users = await sql.select('*').from('users');
  res.status(200).send(users);
});

app.listen(port, () => {
  console.log('App is listening on port ' + port);
});
