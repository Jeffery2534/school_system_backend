const express = require('express');
const { Client } = require('pg');
const fs = require('fs');
const app = express();
const jwt = require('jsonwebtoken'); 
const bodyParser = require('body-parser');
const secret = 'qwertyasdfgh852';

const db = {
  host: 'schoolsystem.c7floyrdntbn.ap-southeast-1.rds.amazonaws.com',
  database: 'school_system',
  user: 'useradmin',
  password: '53460601',
  port: 5432,
  ssl: { ca: fs.readFileSync('./ap-southeast-1-bundle.pem').toString() }
};

app.use(bodyParser.json());

app.use((req, res, next) => {
  if (req.path === '/login') {
    return next();
  }

  const token = req.body.token; 
  if (token) {
    jwt.verify(token, secret, (err, user) => {
      if (err) {
        return res.json({ error: 'invalid token' });
      }
      req.user = user;
      next();
    });
  } else {
    res.json({ error: 'no token' });
  }
});

app.use(async (req, res, next) => {
  const client = new Client(db);
  try {
    await client.connect();
    console.log(`db connected`);
    req.dbClient = client;
    next();
  } catch (error) {
    console.error('fail to connect db', error);
  }
});

app.post('/test', async (req, res) => {
  try {
    const dbRes = await req.dbClient.query('SELECT * FROM userinfo');
    await req.dbClient.end();
    console.log(`db disconnected`);
    res.json(dbRes.rows);
  } catch (error) {
    console.error('Error on /login', error);
  }
});

app.post('/login', async (req, res) => {
  const { user_id, password } = req.body;

  try {
    const query = 'SELECT user_id, type FROM userinfo WHERE user_id = $1 AND password = $2';
    const dbRes = await req.dbClient.query(query, [user_id, password]);
    
    if (dbRes.rows.length > 0) {
      const user = dbRes.rows[0];
      const tokenPayload = { user_id: user.user_id, type: user.type };
      const token = jwt.sign(tokenPayload, secret, { expiresIn: '1h' });

      res.json({ token });
    } else {
      res.json({ error: 'authentication fail' });
    }
    
  } catch (error) {
    console.error('Error on /login', error);
    res.status(500).json({ message: 'db connection fail' });
  } finally {
    await req.dbClient.end();
    console.log(`db disconnected`);
  }
});

app.post('/student_info/:sid', async (req, res) => {
  const {user_id} = req.body;
  try {
    const query = ('SELECT * FROM student where user_id = $1');
    const dbRes = await req.dbClient.query(query, [user_id]);
    await req.dbClient.end();
    console.log(`db disconnected`);
    res.json(dbRes.rows);
  } catch (error) {
    console.error('Error', error);
  }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
});
