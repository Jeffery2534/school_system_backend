const express = require('express');
const { Client } = require('pg');
const fs = require('fs');
const app = express();
const jwt = require('jsonwebtoken'); 
const bodyParser = require('body-parser');

const db = {
  host: 'schoolsystem.c7floyrdntbn.ap-southeast-1.rds.amazonaws.com',
  database: 'school_system',
  user: 'useradmin',
  password: '53460601',
  port: 5432,
  ssl: { ca: fs.readFileSync('./ap-southeast-1-bundle.pem').toString() }
};

app.use(bodyParser.json());

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

app.get('/test', async (req, res) => {
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
    const query = 'SELECT user_id FROM userinfo WHERE user_id = $1 AND password = $2';
    const dbRes = await req.dbClient.query(query, [user_id, password]);
    
    if (dbRes.rows.length > 0) {
      const userId = dbRes.rows[0].user_id;
      const tokenPayload = { user_id, type };
      const token = jwt.sign({ userId }, 'token_toookkkeeennn', { expiresIn: '1h' });

      res.status(200).json({ token });
    } else {
      res.status(401).json({ message: 'Authentication failed' });
    }
    
  } catch (error) {
    console.error('Error on /login', error);
    res.status(500).json({ message: 'db connection fail' });
  } finally {
    await req.dbClient.end();
    console.log(`db disconnected`);
  }
});