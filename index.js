const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);

const problems = ['1', '22', '333'];
const userIds = [];
const userNickNames = [];
const users = {};
const cubes = [];
const cycle = 3;
let userCount = 0;
let problemCount = 0;
let cycleCount = 1;

const countAdjustment = () => {
  if (userCount === userNickNames.length - 1) {
    userCount = 0;
    problemCount++;
  } else {
    userCount++;
    problemCount++;
  }
};

io.on('connection', function (socket) {
  const userId = socket.client.id;

  socket.on('user', function (nickname) {
    if (userIds.length <= 3) {
      userIds.push(userId);
      users[userId] = {
        id: userId,
        nickname,
        score: 0
      };
      userNickNames.push(users[userId]);

      const userInfo = {};
      const order = userIds.indexOf(userId);

      userInfo.id = userId;
      // userInfo.order = order;

      socket.emit('order', userInfo);
      io.emit('users', userNickNames);

      if (userIds.length === 3) {
        // problems는 랜덤으로
        io.emit('start', {
          userId: userIds[userCount],
          userNickName: userNickNames[userCount].nickname,
          problemLength: problems[problemCount].length
        });

        io.to(userIds[userCount]).emit('submission', problems[problemCount]);
      }
    } else {
      socket.emit('order', 'be full');
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
    const userNickName = userNickNames[userCount].nickname;

    if (message.includes(solution) && !isSubmissionUser) {
      users[id].score = users[id].score + 1;

      countAdjustment();

      io.emit('message', { id, message });
      io.emit('pass', { id, solution, userNickName });
      io.to(userIds[userCount]).emit('submission', problems[problemCount]);

      // 시간초세기
      // 처음시작할때 socket.on('timer start', fn);
      // 서버에서 2분후 socket.on('timer end', fn);
      // 60 * 2 / 60
      // userCount++ / problemCount++
      // io.emit('start', {
      //   userId: userIds[userCount],
      //   problemLength: problems[problemCount].length
      // });
      // io.to(userIds[userCount]).emit('submission', problems[problemCount]);

      // nextQuiz(io);

      if ((cycleCount === cycle) || !problems[problemCount]) {
        io.emit('end', users);
      } else {
        (problemCount % 3 === 0) && cycleCount++;

        io.emit('start', {
          userId: userIds[userCount],
          userNickName: userNickNames[userCount].nickname,
          problemLength: problems[problemCount].length,
          timer: (1000 * 60) * 3
        });
      }
    } else {
      io.emit('message', { id, message });
    }
  });

  socket.on('disconnect', function (reason) {
    if (reason === 'transport close') {
      const removeIndex = userIds.indexOf(userId);

      userIds.splice(removeIndex, 1);
      userNickNames.splice(removeIndex, 1);

      io.emit('users', userNickNames);
    }
  });
});

http.listen(8081, function(){ console.log('listening on *:8081'); });
