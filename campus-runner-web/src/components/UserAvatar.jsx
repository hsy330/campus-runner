import { getInitial } from '../lib/format.js';

export function UserAvatar({ src, name, size = 'md', onClick, className = '', title }) {
  const Tag = onClick ? 'button' : 'div';
  const extraProps = onClick ? { type: 'button', onClick } : {};

  return (
    <Tag
      className={`avatar-circle avatar-circle--${size} ${onClick ? 'avatar-circle--button' : ''} ${className}`.trim()}
      title={title || name || '用户头像'}
      {...extraProps}
    >
      {src ? <img src={src} alt={name || '用户头像'} className="avatar-circle__image" /> : <span>{getInitial(name)}</span>}
    </Tag>
  );
}
