const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);

const problems = ['개미', '계란', '사과', '나무', 'BTS', '똥', 'ken', 'javascript'];
const userIds = [];
const userNickNames = [];
let problemCount = 0;

io.on('connection', function (socket) {
  const userId = socket.client.id;

  socket.on('user', function (nickname) {
    if (userIds.length <= 3) {
      userIds.push(userId);
      userNickNames.push(nickname);

      const userInfo = {};
      const order = userIds.indexOf(userId);

      userInfo.id = userId;
      userInfo.order = order;

      socket.emit('order', userInfo);
      io.emit('users', userNickNames);

      if (userIds.length === 3) {
        // problems는 랜덤으로
        io.emit('start', {
          userId: userIds[problemCount],
          problemLength: problems[problemCount].length
        });

        io.to(userIds[problemCount]).emit('submission', problems[problemCount]);
      }
    } else {
      socket.emit('order', 'be full');
    }
  });

  socket.on('disconnect', function (reason) {
    if (reason === 'transport close') {
      const removeIndex = userIds.indexOf(userId);

      userIds.splice(removeIndex, 1);
      userNickNames.splice(removeIndex, 1);
    }
  });
});

http.listen(8081, function(){ console.log('listening on *:8081'); });
