const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);

const problems = ['개미', '계란', '사과', '나무', 'BTS', '똥', 'ken', 'javascript'];
const userIds = [];
const userNickNames = [];
let problemCount = 0;
let userCount = 0

io.on('connection', function (socket) {
  const userId = socket.client.id;

  socket.on('user', function (userNickname) {
    let userInfo;

    if (userIds.length <= 3) {
      userIds.push(userId);
      userNickNames.push(userNickname);

      userInfo = { userId, userOrder: userCount, userNickNames };

      socket.emit('order', userInfo);
      io.emit('users', userNickNames);
      userCount++;

      if(userIds.length === 3) {
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

      userCount--;
      userIds.splice(removeIndex, 1);
      userNickNames.splice(removeIndex, 1);
    }
  });
});

http.listen(8081, function(){
  console.log('listening on *:8081');
});
