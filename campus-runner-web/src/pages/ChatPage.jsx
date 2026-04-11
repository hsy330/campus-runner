import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { createChatRoom, listChatMessages, sendChatMessage, listChatRooms, sendTip, getBlacklist, addToBlacklist } from '../lib/api.js';
import { useAuth } from '../auth.jsx';

export function ChatPage() {
  const { roomId } = useParams();
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [showTip, setShowTip] = useState(false);
  const [tipAmount, setTipAmount] = useState('');
  const [otherUser, setOtherUser] = useState(null);
  const bottomRef = useRef(null);
  const fileRef = useRef();

  useEffect(() => {
    let active = true;
    const load = () => {
      listChatMessages(token, roomId)
        .then((data) => {
          if (!active) return;
          const msgs = Array.isArray(data) ? data : [];
          setMessages(msgs);
          const other = msgs.find(m => m.fromUserId !== user?.id);
          if (other && !otherUser) setOtherUser({ id: other.fromUserId, nickname: other.senderNickname });
        })
        .catch(() => {});
    };
    load();
    const interval = setInterval(load, 2000);
    return () => { active = false; clearInterval(interval); };
  }, [token, roomId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    setSending(true);
    try {
      await sendChatMessage(token, roomId, text);
      setInput('');
      const data = await listChatMessages(token, roomId);
      setMessages(Array.isArray(data) ? data : []);
    } catch (err) { alert(err.message); }
    finally { setSending(false); }
  }

  async function handleImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      setSending(true);
      try {
        await sendChatMessage(token, roomId, ev.target.result, 'image');
        const data = await listChatMessages(token, roomId);
        setMessages(Array.isArray(data) ? data : []);
      } catch (err) { alert(err.message); }
      finally { setSending(false); }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  async function handleTip() {
    const amount = Number(tipAmount);
    if (!amount || amount <= 0) return;
    try {
      await sendTip(token, otherUser?.id, amount);
      await sendChatMessage(token, roomId, `💰 我给你打赏了 ${amount} 积分`, 'tip');
      setShowTip(false);
      setTipAmount('');
      const data = await listChatMessages(token, roomId);
      setMessages(Array.isArray(data) ? data : []);
    } catch (err) { alert(err.message); }
  }

  async function handleBlock() {
    if (!otherUser) return;
    if (!confirm(`确定拉黑 ${otherUser.nickname}？`)) return;
    try {
      await addToBlacklist(token, otherUser.id);
      alert('已加入黑名单');
    } catch (err) { alert(err.message); }
  }

  return (
    <div className="page chat-page">
      <div className="chat-header">
        <button className="btn-ghost chat-back" onClick={() => navigate(-1)}>←</button>
        <h3>{otherUser?.nickname || '聊天'}</h3>
        <div className="chat-header-actions">
          <button className="btn-icon" onClick={() => setShowTip(!showTip)} title="打赏">💰</button>
          <button className="btn-icon" onClick={handleBlock} title="拉黑">🚫</button>
        </div>
      </div>

      {showTip && (
        <div className="tip-bar">
          <input type="number" placeholder="打赏积分" value={tipAmount} onChange={(e) => setTipAmount(e.target.value)} min={1} />
          <button className="btn-primary btn-sm" onClick={handleTip}>打赏</button>
        </div>
      )}

      <div className="chat-messages">
        {messages.length === 0 && <p className="empty-state">暂无消息，发送第一条吧</p>}
        {messages.map((m) => (
          <div key={m.id} className={`chat-bubble ${m.fromUserId === user?.id ? 'me' : 'other'}`}>
            <span className="chat-sender">{m.senderNickname}</span>
            {m.type === 'image' ? (
              <img src={m.content} alt="图片" className="chat-img" onClick={() => window.open(m.content)} />
            ) : (
              <p>{m.content}</p>
            )}
            <span className="chat-time">{new Date(m.createdAt).toLocaleTimeString()}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form className="chat-input-bar" onSubmit={handleSend}>
        <button type="button" className="btn-icon" onClick={() => fileRef.current?.click()}>📷</button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleImageUpload} />
        <input type="text" placeholder="输入消息..." value={input} onChange={(e) => setInput(e.target.value)} disabled={sending} />
        <button type="submit" className="btn-primary" disabled={sending || !input.trim()}>发送</button>
      </form>
    </div>
  );
}

export function ChatRoomList() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = () => {
      listChatRooms(token)
        .then((data) => { if (active) setRooms(Array.isArray(data) ? data : []); })
        .catch(() => {})
        .finally(() => { if (active) setLoading(false); });
    };
    load();
    const interval = setInterval(load, 5000);
    return () => { active = false; clearInterval(interval); };
  }, [token]);

  if (loading) return <div className="page"><p className="page-loading">加载中...</p></div>;

  return (
    <div className="page chat-list-page">
      <h3>消息</h3>
      {rooms.length === 0 && (
        <div className="empty-state">
          <p>暂无会话</p>
          <p className="subtle">接单或发布任务后可在此与对方聊天</p>
        </div>
      )}
      {rooms.map((r) => (
        <div key={r.id} className="chat-room-card" onClick={() => navigate(`/chat/${r.id}`)}>
          <div className="chat-room-avatar">{(r.otherNickname || '?')[0]}</div>
          <div className="chat-room-info">
            <div className="chat-room-top">
              <p className="chat-room-name">{r.otherNickname}</p>
              <span className="chat-room-time">{new Date(r.lastMessageAt).toLocaleTimeString()}</span>
            </div>
            <p className="chat-room-task">{r.taskTitle}</p>
            <p className="chat-room-last">{r.lastMessage || '暂无消息'}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function StartChatButton({ taskId }) {
  const { token } = useAuth();
  const navigate = useNavigate();

  async function handleClick(e) {
    e.stopPropagation();
    try {
      const room = await createChatRoom(token, taskId);
      navigate(`/chat/${room.id}`);
    } catch (err) {
      alert(err.message || '创建会话失败');
    }
  }

  return <button className="btn-chat" onClick={handleClick}>联系对方</button>;
}
