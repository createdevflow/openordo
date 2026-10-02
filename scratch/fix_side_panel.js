const fs = require('fs');
let code = fs.readFileSync('src/app/consultation/join/[roomId]/ConsultationRoomClient.tsx', 'utf8');

// Inside ConsultationSidePanel, change back to sendChat
code = code.replace(/<form onSubmit=\{onChatSubmit\}/g, '<form onSubmit={sendChat}');

// In ConsultationRoomClient, pass onChatSubmit as sendChat prop
code = code.replace(/newMessage, setNewMessage, sendChat,/g, 'newMessage, setNewMessage, sendChat: onChatSubmit,');

fs.writeFileSync('src/app/consultation/join/[roomId]/ConsultationRoomClient.tsx', code);
