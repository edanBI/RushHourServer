const express = require('express');
const bodyparser = require('body-parser');
const rushHourDB = require('./RushhourDB');
const AWS = require('aws-sdk');
const createError = require('http-errors'); // Create HTTP errors for Express with ease.
const path = require('path'); // provides a way of working with directories and file paths.
const logger = require('morgan'); // used for logging request details
const {
  check,
  validationResult
} = require('express-validator');
const countyList = require('country-list');
const fs = require('fs');

const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');

const app = express();
const port = 3000;

// fs.appendFile('List Countries.txt', countyList.getNames(), (err) => {
//   if(err) throw err;
//   console.log('wrote countries');
// })

// view engine setup
app.set('views', path.join(__dirname, 'views')); // app.get('views') will return the views dir path 
app.set('view engine', 'jade'); // app.get('view engine') will return jade 

app.use(logger('dev'));
app.use(bodyparser.json()); // to support JSON-encoded bodies
app.use(bodyparser.urlencoded({
  extended: true
})); // to support URL-encoded bodies
app.use(express.static(path.join(__dirname, 'public'))); // to serve static files of the application

app.use('/', indexRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
// app.use(function(req, res, next) {
//   next(createError(404));
// });

// error handler
// app.use(function(err, req, res, next) {
//   // set locals, only providing error in development
//   res.locals.message = err.message;
//   res.locals.error = req.app.get('env') === 'development' ? err : {};

//   // render the error page
//   res.status(err.status || 500);
//   res.render('error');
// });



module.exports = app;

let verifyPlayerObject = [
  check(['WorkerID', 'Age', 'Gender', 'Education', 'Country'], 'Not Exist').exists(),
  check('Age', 'Age should be 18-120.').isInt({
    min: 18,
    max: 120
  }),
  check('Gender', 'Invalid Gender').isIn(['Female', 'Male']),
  check('Education', 'Invalid Education.').isIn(['Less than High School', 'High School/GED', 'College', 'Graduate Degree']),
  check('Country', 'Invalid Country').isIn(countyList.getNames())
];

let verifyInstanceObject = [
  check(['WorkerID', 'InstanceNumber', 'Log', 'QnsAns'], 'Not Exist').exists(),
  check('InstanceNumber').isInt({
    min: 1,
    max: 3
  }),
  check('Log').contains('undo', 'restart', 'Time'),
  check('QnsAns').notEmpty()
];

// TODO: remove this hello world after develop!
app.get('/', (req, res) => res.send('Hello World!'))
app.listen(port, () => console.log(`Example app listening on port ${port}!`))

rushHourDB.CreateTables();

/** Save the player dempgraphic answers */
app.post('/players', verifyPlayerObject, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      errors: errors.array()
    });
  }

  rushHourDB.InsertPlayer(req.body)
    .then(result => {
      console.log(`New player inserted.`, result);
      res.sendStatus(201);
    })
    .catch(error => {
      console.log('Error - New player not inserted to DB.', error);
      if (error.message === 'The conditional request failed') {
        res.status(error.statusCode).send(`Player not created - WorkerID already exist. ${error.message}`);
      } else {
        res.status(error.statusCode).send(error.message);
      }
    })
});


/** Accept the game instance log and {<question, answers>} with WorkerID id and save it to DB */
app.post('/player/instance_data', verifyInstanceObject, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      errors: errors.array()
    });
  }
  rushHourDB.InsertInstanceData(req.body)
  .then(result => {
    console.log(`Instance data inserted.`, result);
    res.sendStatus(201);
  })
  .catch(error => {
    res.status(err.statusCode).send(error.message);
  })
});

/** Return the user a bonus code. This code will enable him to recieve a bonus at MTurk. */
// app.get('/getPlayerBonusCode', (req, res) => {
  
// });

// let ValidateRequestErrors = (req) => {
//   const errors = validationResult(req);
//   if (!errors.isEmpty()) {
//     return res.status(422).json({
//       errors: errors.array()
//     });
//   }
// }