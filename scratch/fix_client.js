const fs = require('fs');

let code = fs.readFileSync('src/app/consultation/join/[roomId]/ConsultationRoomClient.tsx', 'utf8');

// Remove state declarations
code = code.replace(/  const \[chatMessages, setChatMessages\] = useState<.*?\]\(\[\n.*?\n  \]\)/s, '');
code = code.replace(/  const \[sharedFiles, setSharedFiles\] = useState<.*?>\(\[\]\)/s, '');

// Remove old sendChat
code = code.replace(/  const sendChat = \(e: React\.FormEvent\) => \{\n.*?postHeartbeat\(\{ newMessage: msg \}\)\n  \}/s, `
  const onChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    sendChat(newMessage);
    setNewMessage("");
  }`);

// Rename uploadFile call to use shareFile from useCall
// wait, uploadFile is already there, I just need to call shareFile inside uploadFile.
code = code.replace(/    \/\/ push to server\n    postHeartbeat\(\{ newFile: meta \}\)/, '    shareFile(Math.random().toString(36), meta.name, meta.size);');

// Replace form onSubmit
code = code.replace(/<form onSubmit=\{sendChat\}/g, '<form onSubmit={onChatSubmit}');

fs.writeFileSync('src/app/consultation/join/[roomId]/ConsultationRoomClient.tsx', code);
