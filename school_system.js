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
		const tokenPayload = { userid: user.userid, type: user.type };
		const token = jwt.sign(tokenPayload, secret, { expiresIn: '1h' });
		console.log(`autheication success`);
		res.json({ token, type: user.type });
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
	console.log("req.body"+req.body);
    const { userid } = req.body;
    try {
        const query = 'SELECT * FROM students WHERE student_userid = $1';
        console.log(`Executing query: ${query} with userid: ${userid}`); // Log the query and parameters
        const dbRes = await req.dbClient.query(query, [userid]);
        console.log(dbRes.rows); // Log the result of the query
        await req.dbClient.end();
        console.log(`db disconnected`);
		if (dbRes.rows.length >= 1) {
			res.json(dbRes.rows); // Always return a list
		} else {
			res.json([]); // Return an empty array if no result
		}
    } catch (error) {
        console.error('Error', error);
        res.status(500).json({ message: 'Error fetching student info' });
    }
});

app.post('/student_courselists', async (req, res) => {
	const { userid } = req.body;
	try {
		const query = 'SELECT DISTINCT c.CourseID, c.CourseName FROM Courses c JOIN CourseSection cs ON c.CourseID = cs.CourseID LEFT JOIN Enrollments e ON c.CourseID = e.CourseID WHERE e.Student_UserID = $1';
		
		// Log the query and the user id
		console.log('Executing query:', query);
		console.log('User ID:', userid);

		const dbRes = await req.dbClient.query(query, [userid]);
		await req.dbClient.end();

		// Log the result
		console.log('Query result:', dbRes.rows);

		console.log(`db disconnected`);
		res.json(dbRes.rows);
	} catch (error) {
		console.error('Error', error);
		res.status(500).json({ message: 'Error fetching student info' });
	}
});

app.post('/student_courselistsWithSessions', async (req, res) => {
	const { userid } = req.body;
	try {
		const query = 'SELECT c.CourseID, c.CourseName, e.Section FROM Enrollments e JOIN Courses c ON e.CourseID = c.CourseID JOIN CourseSection cs ON e.CourseID = cs.CourseID AND e.Section = cs.Section WHERE e.Student_UserID = $1 ORDER BY courseid, section';
		
		// Log the query and the user id
		console.log('Executing query:', query);
		console.log('User ID:', userid);

		const dbRes = await req.dbClient.query(query, [userid]);
		await req.dbClient.end();

		// Log the result
		console.log('Query result:', dbRes.rows);

		console.log(`db disconnected`);
		res.json(dbRes.rows);
	} catch (error) {
		console.error('Error', error);
		res.status(500).json({ message: 'Error fetching student info' });
	}
});

app.post('/student_courselistsWithGrade', async (req, res) => {
	const { userid } = req.body;
	try {
		const query = 'SELECT c.CourseID, c.CourseName, e.Section, e.grade FROM Enrollments e JOIN Courses c ON e.CourseID = c.CourseID JOIN CourseSection cs ON e.CourseID = cs.CourseID AND e.Section = cs.Section WHERE e.Student_UserID = $1 ORDER BY courseid, section';
		
		// Log the query and the user id
		console.log('Executing query:', query);
		console.log('User ID:', userid);

		const dbRes = await req.dbClient.query(query, [userid]);
		await req.dbClient.end();

		// Log the result
		console.log('Query result:', dbRes.rows);

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
    console.log('userid:', userid);
    const query = 'SELECT c.Courseid, c.CourseName, cs.section, cs.Time, sd.Date FROM Enrollments e JOIN CourseSection cs ON e.CourseID = cs.CourseID AND e.Section = cs.Section JOIN Courses c ON cs.CourseID = c.CourseID JOIN SectionDates sd ON cs.CourseID = sd.CourseID AND cs.Section = sd.Section WHERE e.Student_UserID = $1 order by date';
    console.log('Executing query:', query);
    const dbRes = await req.dbClient.query(query, [userid]);
    console.log('result query:', dbRes.rows);
    await req.dbClient.end();
    console.log(`db disconnected`);

    res.json(dbRes.rows);
  } catch (error) {
    console.error('Error', error);
    res.status(500).json({ message: 'Error fetching student info' });
  }
});

app.post('/teacher_search', async (req, res) => {
 const { programmeName, courseName, courseID, studentName, studentID, hkid, gender } = req.body;	
try {
    let query = `SELECT s.Student_UserID, s.name FROM Students s JOIN Enrollments e ON s.Student_UserID = e.Student_UserID JOIN CourseSection cs ON e.CourseID = cs.CourseID JOIN Courses c ON cs.CourseID = c.CourseID`;
    let select_list = [];
    let values = [];

    if (programmeName) {
      select_list.push("s.programme = $1");
      values.push(programmeName);
    }
    if (courseName) {
      select_list.push("c.CourseName = $2");
      values.push(courseName);
    }
    if (courseID) {
      select_list.push("c.CourseID = $3");
      values.push(courseID);
    }
    if (studentName) {
      select_list.push("s.name = $4");
      values.push(studentName);
    }
    if (studentID) {
      select_list.push("s.Student_UserID = $5");
      values.push(studentID);
    }
    if (hkid) {
      select_list.push("s.hkid = $6");
      values.push(hkid);
    }
    if (gender) {
      select_list.push("s.gender = $7");
      values.push(gender);
    }

    query += " WHERE " + select_list.join(' AND ');
    const dbRes = await req.dbClient.query(query, values);
    await req.dbClient.end();
    console.log(`db disconnected`);
    res.json(dbRes.rows);
  } catch (error) {
    console.error('Error', error);
    res.status(500).json({ message: 'Error fetching student info' });
  }
});

app.post('/take_attendance', async (req, res) => {
  const { userid, courseid, section, date, attendance } = req.body;
  try {
    const query = 'INSERT INTO attendance VALUES ($1, $2, $3, $4, $5);';  
    const dbRes = await req.dbClient.query(query, [userid, courseid, section, date, attendance]);
    await req.dbClient.end();
    console.log(`db disconnected`);
    res.json(dbRes.rows);
  } catch (error) {
    console.error('Error', error);
    res.status(500).json({ message: 'Error fetching student info' });
  }
});


app.post('/get_asm', async (req, res) => {
  const { userid } = req.body;
  try {
    const query = 'SELECT Name, StartDate, DueDate FROM Assignments WHERE CourseID = $1 AND Section = $2';  
    const dbRes = await req.dbClient.query(query, [userid, courseid, section, date, attendance]);
    await req.dbClient.end();
    console.log(`db disconnected`);
    res.json(dbRes.rows);
  } catch (error) {
    console.error('Error', error);
    res.status(500).json({ message: 'Error fetching student info' });
  }
});

app.post('/get_timestamp', async (req, res) => {
  const { courseid, section } = req.body;
  try {
    const query = 'select timestamp from coursesection where courseid = $1 and section = $2';  
	console.log('Executing query:', query);
	console.log('courseid = ', courseid , ' section = ', section);
    const dbRes = await req.dbClient.query(query, [courseid, section]);	
	console.log('result query:', dbRes.rows);
    await req.dbClient.end();
    console.log(`db disconnected`);
    res.json(dbRes.rows);
  } catch (error) {
    console.error('Error', error);
    res.status(500).json({ message: 'Error fetching student info' });
  }
});	

app.post('/get_proginfo', async (req, res) => {
  const { programme } = req.body;
  console.log("Request received: ", req.body);
  try {
    const query = 'SELECT * FROM ProgrammeInfo WHERE Programme = $1';  
    const dbRes = await req.dbClient.query(query, [programme]);
    await req.dbClient.end();
    console.log(`db disconnected`);
    console.log("Query result: ", dbRes.rows);
    res.json(dbRes.rows);
  } catch (error) {
    console.error('Error', error);
    res.status(500).json({ message: 'Error fetching student info' });
  }
});

app.post('/get_attendance', async (req, res) => {
  const { userid } = req.body;
  console.log("Request received: ", req.body);
  try {
    const query = 'SELECT courseid, section, date, attendance FROM attendance WHERE student_userid = $1';  
    const dbRes = await req.dbClient.query(query, [userid]);
    await req.dbClient.end();
    console.log(`db disconnected`);
    console.log("Query result: ", dbRes.rows);
    res.json(dbRes.rows);
  } catch (error) {
    console.error('Error', error);
    res.status(500).json({ message: 'Error fetching student info' });
  }
});

app.post('/check_exist_attendance', async (req, res) => {
  const { userid, courseid, section, date } = req.body;
  try {
    const query = 'Select * from attendance where userid =$ 1, courseid = $2, section = $3, date= $4';  
    const dbRes = await req.dbClient.query(query, [userid, courseid, section, date]);
    if (dbRes.rows.length === 0) {
      console.log("no record");
    }	  
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
