// frontend/src/App.jsx
import React, { useEffect, useState } from 'react';
import { socket } from './lib/socket';
import { Send, Users, MessageSquare, UserCircle2 } from 'lucide-react';

const defaultRooms = ['general', 'random', 'dev'];

export default function App() {
  const [name, setName] = useState('');
  const [isRegistered, setIsRegistered] = useState(false);
  const [rooms] = useState(defaultRooms);
  const [currentRoom, setCurrentRoom] = useState(defaultRooms[0]);

  const [roomMessages, setRoomMessages] = useState([]); // {from,text,ts}
  const [dmTarget, setDmTarget] = useState('');
  const [dmMessages, setDmMessages] = useState([]); // {from,text,ts}
  const [users, setUsers] = useState([]);
  const [textRoom, setTextRoom] = useState('');
  const [textDm, setTextDm] = useState('');

  useEffect(() => {
    socket.on('room:message', (msg) => setRoomMessages((prev) => [...prev, msg]));
    socket.on('room:system', (msg) =>
      setRoomMessages((prev) => [...prev, { from: 'system', text: msg, ts: Date.now() }])
    );
    socket.on('dm:message', (msg) => setDmMessages((prev) => [...prev, msg]));
    socket.on('users:list', (list) => setUsers(list));
    socket.on('dm:error', (e) => {
      // Optional: surface DM errors
      setDmMessages((prev) => [...prev, { from: 'system', text: e, ts: Date.now() }]);
    });

    return () => {
      socket.off('room:message');
      socket.off('room:system');
      socket.off('dm:message');
      socket.off('users:list');
      socket.off('dm:error');
    };
  }, []);

  const register = () => {
    const clean = name.trim();
    if (!clean) return;
    socket.emit('register', clean);
    setIsRegistered(true);
    socket.emit('room:join', currentRoom);
  };

  const switchRoom = (room) => {
    setCurrentRoom(room);
    setRoomMessages([]);
    socket.emit('room:join', room);
  };

  const sendRoomMessage = () => {
    const t = textRoom.trim();
    if (!t) return;
    socket.emit('room:message', { room: currentRoom, text: t });
    setTextRoom('');
  };

  const sendDmMessage = () => {
    const t = textDm.trim();
    const to = dmTarget.trim();
    if (!t || !to) return;
    socket.emit('dm:message', { toName: to, text: t });
    setDmMessages((prev) => [...prev, { from: name || 'me', text: t, ts: Date.now() }]);
    setTextDm('');
  };

  if (!isRegistered) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center p-4">
        <div className="card w-full max-w-md bg-base-100 shadow-xl">
          <div className="card-body gap-4">
            <h2 className="card-title flex items-center gap-2">
              <UserCircle2 size={20} />
              Set your chat name
            </h2>
            <input
              type="text"
              className="input input-bordered w-full"
              placeholder="e.g., gurjeet"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <button className="btn btn-primary w-full" onClick={register}>
              Start chatting
            </button>
            <p className="text-xs opacity-70">
              Tip: In dev, React may double-invoke effects. We use a shared socket instance to keep it stable.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200">
      {/* Navbar */}
      <div className="navbar bg-base-100 shadow-sm px-4">
        <div className="flex-1">
          <a className="btn btn-ghost text-xl">Realtime Chat</a>
        </div>
        <div className="flex-none">
          <span className="mr-2">Logged in as:</span>
          <span className="font-semibold">{name}</span>
        </div>
      </div>

      {/* Responsive grid: mobile -> 1 col; lg -> sidebar + two panels */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 p-4">
        {/* Sidebar */}
        <aside className="lg:col-span-3 space-y-4">
          <div className="card bg-base-100">
            <div className="card-body">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare size={18} />
                <h3 className="font-semibold">Rooms</h3>
              </div>
              <div className="join join-vertical w-full">
                {rooms.map((room) => (
                  <button
                    key={room}
                    className={`join-item btn ${currentRoom === room ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => switchRoom(room)}
                  >
                    #{room}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="card bg-base-100">
            <div className="card-body">
              <div className="flex items-center gap-2 mb-2">
                <Users size={18} />
                <h3 className="font-semibold">Online users</h3>
              </div>
              <ul className="menu">
                {users.length === 0 && <li className="text-sm opacity-70">No users</li>}
                {users.map((u) => (
                  <li key={u}>
                    <button
                      className={`btn btn-sm w-full ${dmTarget === u ? 'btn-secondary' : 'btn-outline'}`}
                      onClick={() => setDmTarget(u)}
                      disabled={u === name}
                    >
                      {u} {u === name ? '(you)' : ''}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </aside>

        {/* Main panels */}
        <main className="lg:col-span-9 grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* Room chat */}
          <div className="card bg-base-100">
            <div className="card-body">
              <h3 className="font-semibold mb-2">Room: #{currentRoom}</h3>
              <div className="h-72 xl:h-96 overflow-y-auto space-y-2">
                {roomMessages.map((m, i) => (
                  <div key={i} className={`chat ${m.from === name ? 'chat-end' : 'chat-start'}`}>
                    <div className={`chat-header ${m.from === 'system' ? 'text-info' : ''}`}>{m.from}</div>
                    <div className="chat-bubble">{m.text}</div>
                  </div>
                ))}
                {roomMessages.length === 0 && (
                  <div className="text-sm opacity-60">No messages yet. Be the first!</div>
                )}
              </div>
              <div className="join mt-3">
                <input
                  className="input input-bordered join-item w-full"
                  placeholder="Type room message..."
                  value={textRoom}
                  onChange={(e) => setTextRoom(e.target.value)}
                />
                <button className="btn btn-primary join-item" onClick={sendRoomMessage}>
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* DM chat */}
          <div className="card bg-base-100">
            <div className="card-body">
              <h3 className="font-semibold mb-2">Direct message: {dmTarget || 'Select a user'}</h3>
              <div className="h-72 xl:h-96 overflow-y-auto space-y-2">
                {dmMessages
                  .filter((m) => !dmTarget || m.from === dmTarget || m.from === name)
                  .map((m, i) => (
                    <div key={i} className={`chat ${m.from === name ? 'chat-end' : 'chat-start'}`}>
                      <div className={`chat-header ${m.from === 'system' ? 'text-info' : ''}`}>{m.from}</div>
                      <div className="chat-bubble">{m.text}</div>
                    </div>
                  ))}
                {dmMessages.length === 0 && (
                  <div className="text-sm opacity-60">No DMs yet. Select a user to start.</div>
                )}
              </div>
              <div className="join mt-3">
                <input
                  className="input input-bordered join-item w-full"
                  placeholder="Type DM..."
                  value={textDm}
                  onChange={(e) => setTextDm(e.target.value)}
                  disabled={!dmTarget}
                />
                <button className="btn btn-secondary join-item" onClick={sendDmMessage} disabled={!dmTarget}>
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
