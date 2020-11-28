const express = require('express');
const {
  enrolluser,
  createEvaluationMeeting, 
  updateEvaluationMeeting, 
  getAllEvaluationMeeting,
  getEvaluationMeeting
} = require('../fabricsdk/fabric');

const router = express.Router();

router.get('/', function(req, res, next) {
  res.send('REST API is running.');
});

/* POST  enroll new user. */
router.post('/enroll-user', enrolluser);

/* POST  create a new evaluation meeting. */
router.post('/new-meeting', createEvaluationMeeting);

/* PUT  update an evaluation meeting. */
router.put('/update-meeting', updateEvaluationMeeting);

/* GET all evaluation meeting. */
router.get('/meetings', getAllEvaluationMeeting);

/* GET an evaluation meeting */
router.get('/meeting',getEvaluationMeeting)


module.exports = router;
