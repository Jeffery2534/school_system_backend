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
		const dbRes = await req.dbClient.query('SELECT * FROM user_login');
		await req.dbClient.end();
		console.log(`db disconnected`);
		res.json(dbRes.rows);
	} catch (error) {
		console.error('Error on /login', error);
	}
});

app.post('/login', async (req, res) => {
	const { userid, password } = req.body;

	try {
		const query = 'SELECT userid, type FROM user_login WHERE userid = $1 AND password = $2';
		const dbRes = await req.dbClient.query(query, [userid, password]);
    
    if (dbRes.rows.length > 0) {
		const user = dbRes.rows[0];
		const tokenPayload = { user_id: user.userid, type: user.type };
		const token = jwt.sign(tokenPayload, secret, { expiresIn: '1h' });
		console.log(`autheication success`);
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

app.post('/student_info', async (req, res) => {
	const { userid } = req.body;
	try {
		const query = 'SELECT * FROM students WHERE student_userid = $1';
		const dbRes = await req.dbClient.query(query, [userid]);
		await req.dbClient.end();
		console.log(`db disconnected`);
		res.json(dbRes.rows);
	} catch (error) {
		console.error('Error', error);
		res.status(500).json({ message: 'Error fetching student info' });
	}
});

app.post('/student_timetable', async (req, res) => {
  const { userid } = req.body;
  try {
    const query = 'SELECT c.CourseID,cs.Section,t.name AS TeacherName,cs.Time FROM Enrollments e JOIN CourseSections cs ON e.SectionID = cs.SectionID JOIN Courses c ON cs.CourseID = c.CourseID JOIN Teacher t ON cs.Teacher_UserID = t.Teacher_UserID WHERE e.Student_UserID = $1';
    const dbRes = await req.dbClient.query(query, [userid]);
    await req.dbClient.end();
    console.log(`db disconnected`);
    res.json(dbRes.rows);
  } catch (error) {
    console.error('Error', error);
    res.status(500).json({ message: 'Error fetching student info' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}.`);
});
