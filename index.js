const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);

const problems = ['계란', '사과', '바닐라코딩', '아빠곰', '피땀눈물', '핫도그'];
const userIds = [];
const users = {};
const cycle = 3;
const initialTime = (1000 * 60) * 3;
let userCount = 0;
let problemCount = 0;
let cycleCount = 1;
let onTimeCount;
let time = initialTime;

function nextQuiz(io) {
  time = initialTime;

  if ((cycleCount === cycle) || !problems[problemCount]) {
    io.emit('end', users);
  } else {
    const currentUserId = userIds[userCount];
    (problemCount % 3 === 0) && cycleCount++;

    io.emit('start', {
      userId: currentUserId,
      userNickName: users[currentUserId].nickname,
      problemLength: problems[problemCount].length
    });

    io.to(userIds[userCount]).emit('submission', problems[problemCount]);

    onTimeCount = setInterval(() => {
      time -= 1000;

      if (time >= 0) {
        io.emit('time counter', time);
      } else {
        io.emit('time out');
        time = initialTime;
        clearInterval(onTimeCount);
        countAdjustment();
        nextQuiz(io);
      }
    }, 1000);
  }
}

function countAdjustment() {
  if (userCount === userIds.length - 1) {
    userCount = 0;
    problemCount++;
  } else {
    userCount++;
    problemCount++;
  }
}

io.on('connection', function (socket) {
  const userId = socket.client.id;

  socket.on('user', function (nickname) {
    if (userIds.length < 3) {
      userIds.push(userId);
      users[userId] = {
        id: userId,
        nickname,
        score: 0
      };

      socket.emit('user id', userId);
      io.emit('users', users);

      if (userIds.length === 3) {
        const currentUserId = userIds[userCount];

        io.emit('start', {
          userId: userIds[userCount],
          userNickName: users[currentUserId].nickname,
          problemLength: problems[problemCount].length
        });

        io.to(userIds[userCount]).emit('submission', problems[problemCount]);

        onTimeCount = setInterval(() => {
          time -= 1000;

          if (time >= 0) {
            io.emit('time counter', time);
          } else {
            time = initialTime;
            io.emit('time out');
            clearInterval(onTimeCount);
            countAdjustment();
            nextQuiz(io);
          }
        }, 1000);
      }
    } else if (userIds.length >= 3) {
      socket.emit('full', 'out');
    }
  });

  socket.on('create cube', function (cubeObj) {
    socket.broadcast.emit('cubes', cubeObj);
  });

  socket.on('remove cube', function (removeCubeIndex) {
    socket.broadcast.emit('delete cube', removeCubeIndex);
  });

  socket.on('message', function({ id, message }) {
    const solution = problems[problemCount];
    const submissionUser = userIds[userCount];
    const isSubmissionUser = (submissionUser === id);
    const userNickName = users[id].nickname;

    if (message.includes(solution) && !isSubmissionUser) {
      users[id].score = users[id].score + 10;

      countAdjustment();
      clearInterval(onTimeCount);

      io.emit('message', { id, message });
      io.emit('pass', { id, solution, userNickName, users });
      io.to(userIds[userCount]).emit('submission', problems[problemCount]);

      nextQuiz(io);
    } else {
      io.emit('message', { id, message });
    }
  });

  socket.on('disconnect', function (reason) {
    if (reason === 'transport close') {
      const removeIndex = userIds.indexOf(userId);
      const removeUserId = userIds[removeIndex];

      userIds.splice(removeIndex, 1);
      delete users[removeUserId];

      io.emit('users', users);
    }
  });
});

http.listen(8081, function(){ console.log('listening on *:8081'); });
