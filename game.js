const f = require('session-file-store');
// 중복되지 않는 고유한 방을 만들어줄 uuid 패키지를 사용할 예정
const { v4: uuidv4 } = require('uuid');

// 이 함수 안에 멀티 플레이 기능을 넣음
module.exports = function(server) {

    const io = require('socket.io')(server, {
        transports: ['websocket']
    });

    // 방 정보
    var rooms = [];                     // 게임 대기방
    var socketRooms = new Map();        // 게임 진행방
		
		// socket 패키지를 통해 서버에 접속을 하게 되면 해당 함수가 동작
		// socket : 접속한 클라이언트를 의미 
    io.on('connection', (socket) => {

        // 서버 구현
        
        // 접속되었는지에 대한 로그 표시
        console.log('A user connected:', socket.id);

        // 특정 Socket(클라이언트)이 방에 입장했을 때 처리
        // 1. 대기방에 방이 있으면 입장
        // 2. 대기방에 방이 없으면 새로 생성 후 입장
        if (rooms.length > 0) {
		        // shift : 배열에 있는 값을 하나 꺼내오면서 배열에서 제거하는 함수
            var roomId = rooms.shift();
            socket.join(roomId);
            // emit : 소켓 대상에게 메시지 전달
            socket.emit('joinRoom', { roomId: roomId });
            // to : 특정한 Room ID에 속한 유저들에게 메시지를 보낼 수 있음
            socket.to(roomId).emit('startGame', { roomId: roomId });
            // 도중에 나가는 유저가 있을 경우 방을 정리하기 위한 목적으로
            // 소켓 id와 Room ID를 매칭시킴
            socketRooms.set(socket.id, roomId);
        } else {
		        // 중복되지 않는 임의의 룸 이름 생성
            var roomId = uuidv4();
            // 방 생성
            socket.join(roomId);
            socket.emit('createRoom', { roomId: roomId });
            // 대기방 배열에 룸을 추가
            rooms.push(roomId);
            socketRooms.set(socket.id, roomId);
        }

        // 특정 Socket(클라이언트)이 방을 나갔을 때 이벤트 처리
        socket.on('leaveRoom', function(data) 
        {
            var roomId = data.roomId;
            socket.leave(roomId);
            socket.emit('exitRoom');
            // 상대방에게 게임이 끝났다고 전달
            socket.to(roomId).emit('endGame');

            // 혼자 들어간 방에서 나갈 때 방 삭제
            const roomIdx = rooms.indexOf(roomId);
            if (roomIdx !== -1) 
            {
		            // splice : 삭제
                rooms.splice(roomIdx, 1);
                console.log('Room deleted:', roomId);
            }

            // 방 나간 소켓 정보 삭제
            socketRooms.delete(socket.id);
        });

        // 소켓(클라이언트) 특정 Block을 터치했을 때 처리
        socket.on('doPlayer', function(playerInfo) 
        {
            var roomId = playerInfo.roomId;
            var blockIndex = playerInfo.blockIndex;

            console.log('Player action in room:', roomId, 'Block index:', blockIndex);
            socket.to(roomId).emit('doOpponent', { blockIndex: blockIndex });
        });
    });
};