const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);

const problems = ['1', '22', '333', '나무', 'BTS', '똥', 'ken', 'javascript', 'vanilla coding'];
const userIds = [];
const userNickNames = [];
const users = {};
const cubes = [];
const cycle = 3;
let userCount = 0;
let problemCount = 0;

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

      if (userCount === userNickNames.length - 1) {
        userCount = 0;
        problemCount++;
      } else {
        userCount++;
        problemCount++;
      }
      // problemCount는 3이면 다시 초기화
      cubes.length = 0;

      io.emit('message', { id, message });
      io.emit('pass', { id, solution, userNickName });
      io.to(userIds[userCount]).emit('submission', problems[problemCount]);

      console.log(problemCount);
      console.log(userCount);
      console.log(cycle);
      console.log((userCount + 1) * cycle);
      if (problemCount === ((userCount + 1) * cycle)) {
        io.emit('end', users);
      } else {
        io.emit('start', {
          userId: userIds[userCount],
          problemLength: problems[problemCount].length
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
