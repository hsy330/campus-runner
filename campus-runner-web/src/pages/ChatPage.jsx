import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Ban, CircleDollarSign, ImagePlus, Send, UserRound } from 'lucide-react';

import { UserAvatar } from '../components/UserAvatar.jsx';
import { UserProfileModal } from '../components/UserProfileModal.jsx';
import { useAuth } from '../auth.jsx';
import { formatAmount } from '../lib/format.js';
import {
  addToBlacklist,
  createChatRoom,
  getPublicProfile,
  listChatMessages,
  listChatRooms,
  markRoomRead,
  sendChatMessage,
  sendTip
} from '../lib/api.js';

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
  const [selectedProfile, setSelectedProfile] = useState(null);
  const bottomRef = useRef(null);
  const fileRef = useRef(null);

  async function loadMessages(active = true) {
    try {
      const data = await listChatMessages(token, roomId);
      if (!active) {
        return;
      }
      const nextMessages = Array.isArray(data) ? data : [];
      setMessages(nextMessages);
      const otherMessage = nextMessages.find((message) => message.fromUserId !== user?.id);
      if (otherMessage) {
        setOtherUser((current) => current || {
          id: otherMessage.fromUserId,
          name: otherMessage.senderName,
          avatar: otherMessage.senderAvatar
        });
      }
      await markRoomRead(token, roomId).catch(() => {});
    } catch {
      if (active) {
        setMessages([]);
      }
    }
  }

  useEffect(() => {
    let active = true;
    listChatRooms(token)
      .then((data) => {
        if (!active) return;
        const room = (Array.isArray(data) ? data : []).find((item) => item.id === roomId);
        if (room) {
          setOtherUser({
            id: room.otherUserId,
            name: room.otherName,
            avatar: room.otherAvatar
          });
        }
      })
      .catch(() => {});
    loadMessages(active);
    const interval = setInterval(() => {
      loadMessages(active);
    }, 2000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [token, roomId, user?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function openProfile() {
    if (!otherUser?.id) {
      return;
    }
    try {
      const profile = await getPublicProfile(otherUser.id);
      setSelectedProfile(profile);
    } catch (err) {
      window.alert(err.message || '加载资料失败');
    }
  }

  async function handleSend(event) {
    event.preventDefault();
    const text = input.trim();
    if (!text) return;
    setSending(true);
    try {
      await sendChatMessage(token, roomId, text);
      setInput('');
      await loadMessages();
    } catch (err) {
      window.alert(err.message || '发送失败');
    } finally {
      setSending(false);
    }
  }

  async function handleImageUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (loadEvent) => {
      setSending(true);
      try {
        await sendChatMessage(token, roomId, loadEvent.target?.result, 'image');
        await loadMessages();
      } catch (err) {
        window.alert(err.message || '发送失败');
      } finally {
        setSending(false);
      }
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  }

  async function handleTip() {
    const amount = Number(tipAmount);
    if (!amount || amount <= 0) {
      return;
    }
    try {
      await sendTip(token, otherUser?.id, amount);
      await sendChatMessage(token, roomId, `已打赏 ${formatAmount(amount)} 积分`, 'tip');
      setShowTip(false);
      setTipAmount('');
      await loadMessages();
    } catch (err) {
      window.alert(err.message || '打赏失败');
    }
  }

  async function handleBlock() {
    if (!otherUser) return;
    if (!window.confirm(`确定拉黑 ${otherUser.name}？`)) return;
    try {
      await addToBlacklist(token, otherUser.id);
      window.alert('已加入黑名单');
      navigate('/chat', { replace: true });
    } catch (err) {
      window.alert(err.message || '拉黑失败');
    }
  }

  return (
    <div className="page chat-page">
      <div className="chat-header">
        <button className="btn-ghost chat-back" onClick={() => navigate(-1)}>返回</button>
        <button type="button" className="chat-user-summary" onClick={openProfile}>
          <UserAvatar src={otherUser?.avatar} name={otherUser?.name} size="sm" />
          <div>
            <h3>{otherUser?.name || '聊天'}</h3>
            <p className="subtle">点击头像查看对方评分</p>
          </div>
        </button>
        <div className="chat-header-actions">
          <button type="button" className="btn-icon" onClick={() => setShowTip((value) => !value)} title="打赏">
            <CircleDollarSign size={18} />
          </button>
          <button type="button" className="btn-icon" onClick={handleBlock} title="拉黑">
            <Ban size={18} />
          </button>
        </div>
      </div>

      {showTip && (
        <div className="tip-bar">
          <input
            type="number"
            placeholder="打赏积分"
            value={tipAmount}
            onChange={(event) => setTipAmount(event.target.value)}
            min={0.01}
            step={0.01}
          />
          <button className="btn-primary btn-sm" onClick={handleTip}>打赏</button>
        </div>
      )}

      <div className="chat-messages">
        {messages.length === 0 && <p className="empty-state">暂无消息，发送第一条吧</p>}
        {messages.map((message) => (
          <div key={message.id} className={`chat-bubble ${message.fromUserId === user?.id ? 'me' : 'other'}`}>
            <UserAvatar
              src={message.senderAvatar}
              name={message.senderName}
              size="xs"
              className="chat-bubble-avatar"
              onClick={message.fromUserId !== user?.id ? openProfile : undefined}
            />
            <div className="chat-bubble-card">
              <span className="chat-sender">{message.senderName}</span>
              {message.type === 'image' ? (
                <img src={message.content} alt="聊天图片" className="chat-img" onClick={() => window.open(message.content)} />
              ) : (
                <p>{message.content}</p>
              )}
              <span className="chat-time">{new Date(message.createdAt).toLocaleTimeString()}</span>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form className="chat-input-bar" onSubmit={handleSend}>
        <button type="button" className="btn-icon" onClick={() => fileRef.current?.click()}>
          <ImagePlus size={18} />
        </button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleImageUpload} />
        <input type="text" placeholder="输入消息..." value={input} onChange={(event) => setInput(event.target.value)} disabled={sending} />
        <button type="submit" className="btn-primary" disabled={sending || !input.trim()}>
          <Send size={16} />
          发送
        </button>
      </form>
      <UserProfileModal profile={selectedProfile} onClose={() => setSelectedProfile(null)} />
    </div>
  );
}

export function ChatRoomList() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState(null);

  useEffect(() => {
    let active = true;
    const load = () => {
      listChatRooms(token)
        .then((data) => {
          if (active) {
            setRooms(Array.isArray(data) ? data : []);
          }
        })
        .catch(() => {
          if (active) {
            setRooms([]);
          }
        })
        .finally(() => {
          if (active) {
            setLoading(false);
          }
        });
    };
    load();
    const interval = setInterval(load, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [token]);

  async function openProfile(room, event) {
    event.stopPropagation();
    try {
      const profile = await getPublicProfile(room.otherUserId);
      setSelectedProfile(profile);
    } catch (err) {
      window.alert(err.message || '加载资料失败');
    }
  }

  if (loading) return <div className="page"><p className="page-loading">加载中...</p></div>;

  return (
    <div className="page chat-list-page">
      <h3 className="page-title-with-icon"><UserRound size={20} /> 消息</h3>
      {rooms.length === 0 && (
        <div className="empty-state">
          <p>暂无会话</p>
          <p className="subtle">接单或发布任务后可在此与对方聊天</p>
        </div>
      )}
      {rooms.map((room) => (
        <div key={room.id} className="chat-room-card" onClick={() => navigate(`/chat/${room.id}`)}>
          <button type="button" className="chat-room-avatar-wrap" onClick={(event) => openProfile(room, event)}>
            <UserAvatar src={room.otherAvatar} name={room.otherName} size="md" />
            {room.unreadCount > 0 ? <span className="chat-room-unread-dot" /> : null}
          </button>
          <div className="chat-room-info">
            <div className="chat-room-top">
              <p className="chat-room-name">{room.otherName}</p>
              <span className="chat-room-time">{new Date(room.lastMessageAt).toLocaleTimeString()}</span>
            </div>
            <p className="chat-room-task">{room.taskTitle}</p>
            <div className="chat-room-last-row">
              <p className="chat-room-last">{room.lastMessageType === 'image' ? '[图片]' : room.lastMessage || '暂无消息'}</p>
              {room.unreadCount > 0 ? <span className="chat-room-unread-badge">{room.unreadCount > 99 ? '99+' : room.unreadCount}</span> : null}
            </div>
          </div>
        </div>
      ))}
      <UserProfileModal profile={selectedProfile} onClose={() => setSelectedProfile(null)} />
    </div>
  );
}

export function StartChatButton({ taskId }) {
  const { token } = useAuth();
  const navigate = useNavigate();

  async function handleClick(event) {
    event.stopPropagation();
    try {
      const room = await createChatRoom(token, taskId);
      navigate(`/chat/${room.id}`);
    } catch (err) {
      window.alert(err.message || '创建会话失败');
    }
  }

  return (
    <button className="btn-chat" onClick={handleClick}>
      <Send size={16} />
      联系对方
    </button>
  );
}
