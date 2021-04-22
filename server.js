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

//connecting to database
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
    // .where('email', '=', email) //to specify that email should already exist
    .then((data) => {
      const isValid = bcrypt.compareSync(password, data[0].password); //comparing passwords
      if (isValid) {
        return sql
          .select('*')
          .from('users')
          .where('email', '=', email)
          .then((user) => {
            //push attempt into attempts table
            sql
              .insert({
                email: user[0].email,
                password: user[0].password,
                date: new Date(),
                status: 'Success',
              })
              .into('attempts')
              .then(res.status(200).json(user[0]));
          })
          .catch((err) => {
            res.status(400).json(err);
          });
      }

      if (!isValid) {
        //sending wrong credentials to database
        return sql
          .insert({
            email: email,
            password: password,
            date: new Date(),
            status: 'Failed',
          })
          .into('attempts')
          .then(res.json('Incorrect credentials')) //send err msg
          .catch((err) => {
            res.status(400).json(err);
          });
      }
    })
    .catch((err) => res.status(400).json('Wrong Credentials'));
});

app.post('/register', (req, res) => {
  const { email, password, name } = req.body;
  const hash = bcrypt.hashSync(password, 10); //e̶n̶c̶r̶y̶p̶t̶i̶n̶g̶  bcrypting password synchronously

  //transaction is linking two or more tables together
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
            password: hash,
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

app.get('/log', async (req, res) => {
  const attempts = await sql.select('*').from('attempts');
  res.status(200).send(attempts);
});

app.put('/update', (req, res) => {
  const { currentName, newName, currentEmail, newEmail } = req.body;
  sql.transaction((trx) => {
    trx('users')
      .where({ name: currentName })
      .orWhere({ email: currentEmail })
      .update({ name: newName, email: newEmail }, ['name', 'email'])
      .then(
        trx('signin')
          .where({ email: currentEmail })
          .update({ email: newEmail }, ['email'])
          .then((data) => console.log(data))
          .catch((err) => {
            res.status(400).json('Something went wrong');
          })
      )
      .then(trx.commit)
      .catch(trx.rollback);
  });
});

app.listen(port, () => {
  console.log('App is listening on port ' + port);
});
