import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, Marker, Popup, TileLayer, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

import { publishTask, searchPlaces, getRouteSummary } from '../lib/api.js';
import { useAuth } from '../auth.jsx';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const CATEGORIES = ['跑腿', '代拿代买', '游戏陪玩', '二手闲置', '失物招领', '校内兼职', '其他'];
const CAMPUS_CENTER = [28.1885, 112.8688]; // 湖南第一师范学院 东方红校区

function LocationPicker({ onSelect }) {
  useMapEvents({
    click(e) {
      onSelect({ latitude: e.latlng.lat, longitude: e.latlng.lng });
    }
  });
  return null;
}

export function PublishPage() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: CATEGORIES[0],
    price: 5,
    pickupText: '',
    deliveryText: '',
    deadlineText: '',
    images: []
  });

  // Map state
  const [pickupLoc, setPickupLoc] = useState(null);
  const [deliveryLoc, setDeliveryLoc] = useState(null);
  const [selectingField, setSelectingField] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [routeInfo, setRouteInfo] = useState(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [myLocation, setMyLocation] = useState(null);
  const [mapCenter, setMapCenter] = useState(CAMPUS_CENTER);

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // Get real-time geolocation
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        setMyLocation(loc);
        setMapCenter([loc.latitude, loc.longitude]);
      },
      () => {} // silently fail, use campus center
    );
  }, []);

  // Search places with debounce
  useEffect(() => {
    if (!searchKeyword.trim()) { setSuggestions([]); return; }
    const timer = setTimeout(() => {
      searchPlaces(searchKeyword, user?.campus || '东方红校区')
        .then((data) => {
          const list = Array.isArray(data?.suggestions) ? data.suggestions : [];
          setSuggestions(list);
        })
        .catch(() => setSuggestions([]));
    }, 400);
    return () => clearTimeout(timer);
  }, [searchKeyword, user?.campus]);

  // Calculate route when both locations are set
  useEffect(() => {
    if (pickupLoc && deliveryLoc) {
      getRouteSummary(pickupLoc, deliveryLoc)
        .then((data) => setRouteInfo(data))
        .catch(() => setRouteInfo(null));
    }
  }, [pickupLoc, deliveryLoc]);

  function selectSuggestion(sug) {
    const loc = { latitude: sug.location.latitude, longitude: sug.location.longitude, name: sug.title };
    if (selectingField === 'pickup') {
      setPickupLoc(loc);
      update('pickupText', sug.title);
    } else {
      setDeliveryLoc(loc);
      update('deliveryText', sug.title);
    }
    setSuggestions([]);
    setSearchKeyword('');
    setSelectingField(null);
  }

  function handleMapClick(loc) {
    if (selectingField === 'pickup') {
      setPickupLoc(loc);
      update('pickupText', `${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}`);
    } else if (selectingField === 'delivery') {
      setDeliveryLoc(loc);
      update('deliveryText', `${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}`);
    }
  }

  function handleImageChange(e) {
    const files = Array.from(e.target.files || []);
    if (form.images.length + files.length > 4) {
      alert('最多上传4张图片');
      return;
    }
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setForm((prev) => ({ ...prev, images: [...prev.images, ev.target.result].slice(0, 4) }));
      };
      reader.readAsDataURL(file);
    });
  }

  function removeImage(index) {
    setForm((prev) => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
  }

  function getDefaultDeadline() {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(18, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) {
      alert('请填写完整的任务信息');
      return;
    }

    setSubmitting(true);
    try {
      const deadline = form.deadlineText
        ? new Date(form.deadlineText).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
        : '尽快';

      await publishTask(token, {
        title: form.title,
        description: form.description,
        category: form.category,
        price: form.price,
        pickupText: form.pickupText,
        deliveryText: form.deliveryText,
        deadlineText: deadline,
        pickupLocation: pickupLoc,
        deliveryLocation: deliveryLoc,
        distanceText: routeInfo?.summaryText || '待计算',
        images: form.images,
        campus: user?.campus || '东方红校区'
      });
      navigate('/', { replace: true });
    } catch (err) {
      alert(err.message || '发布失败');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page publish-page">
      <h2>发布任务</h2>
      <form onSubmit={handleSubmit} className="publish-form">
        <label>任务标题</label>
        <input type="text" placeholder="例如：帮忙取快递送到宿舍" value={form.title} onChange={(e) => update('title', e.target.value)} disabled={submitting} />

        <label>任务类别</label>
        <select value={form.category} onChange={(e) => update('category', e.target.value)} disabled={submitting}>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        <label>任务描述</label>
        <textarea rows={3} placeholder="补充任务要求和注意事项" value={form.description} onChange={(e) => update('description', e.target.value)} disabled={submitting} />

        <label>积分报酬</label>
        <input type="number" min={1} value={form.price} onChange={(e) => update('price', Number(e.target.value))} disabled={submitting} />

        {/* 地图选址 */}
        <label>取货/起点 <button type="button" className="btn-map-pick" onClick={() => setSelectingField(selectingField === 'pickup' ? null : 'pickup')}>地图选取</button></label>
        <input type="text" placeholder="例如：东门菜鸟驿站" value={form.pickupText} onChange={(e) => { update('pickupText', e.target.value); setPickupLoc(null); }} disabled={submitting} />

        <label>送达/终点 <button type="button" className="btn-map-pick" onClick={() => setSelectingField(selectingField === 'delivery' ? null : 'delivery')}>地图选取</button></label>
        <input type="text" placeholder="例如：6栋宿舍楼" value={form.deliveryText} onChange={(e) => { update('deliveryText', e.target.value); setDeliveryLoc(null); }} disabled={submitting} />

        {/* 搜索 + 地图 */}
        {selectingField && (
          <div className="map-section">
            <div className="map-search-row">
              <input type="text" placeholder="搜索地点..." value={searchKeyword} onChange={(e) => setSearchKeyword(e.target.value)} />
              {myLocation && <span className="subtle" style={{ whiteSpace: 'nowrap', fontSize: 12 }}>📍已定位</span>}
            </div>
            {suggestions.length > 0 && (
              <div className="suggestion-list">
                {suggestions.map((s) => (
                  <div key={s.id} className="suggestion-item" onClick={() => selectSuggestion(s)}>
                    <strong>{s.title}</strong>
                    <span className="subtle">{s.address}{s.distanceText ? ` · ${s.distanceText}` : ''}</span>
                  </div>
                ))}
              </div>
            )}
            {searchKeyword && suggestions.length === 0 && (
              <p className="subtle" style={{ padding: '8px 0' }}>未找到匹配地点，可直接点击地图选取</p>
            )}
            <div className="map-container">
              <MapContainer center={mapCenter} zoom={16} style={{ height: 280, borderRadius: 12 }} key={mapCenter.join(',')}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="OpenStreetMap" />
                <LocationPicker onSelect={handleMapClick} />
                {pickupLoc && <Marker position={[pickupLoc.latitude, pickupLoc.longitude]}><Popup>起点：{form.pickupText}</Popup></Marker>}
                {deliveryLoc && <Marker position={[deliveryLoc.latitude, deliveryLoc.longitude]}><Popup>终点：{form.deliveryText}</Popup></Marker>}
                {myLocation && <Marker position={[myLocation.latitude, myLocation.longitude]}><Popup>我的位置</Popup></Marker>}
              </MapContainer>
            </div>
            <p className="subtle">点击地图选取{selectingField === 'pickup' ? '起点' : '终点'}位置</p>
          </div>
        )}

        {routeInfo && (
          <div className="route-info">
            <span>路线：{routeInfo.summaryText}</span>
          </div>
        )}

        <label>截止时间</label>
        <input type="datetime-local" value={form.deadlineText || getDefaultDeadline()} onChange={(e) => update('deadlineText', e.target.value)} disabled={submitting} />

        {/* 图片上传 */}
        <label>上传图片（最多4张）</label>
        <div className="image-upload-area">
          {form.images.map((img, i) => (
            <div key={i} className="image-preview">
              <img src={img} alt="" />
              <button type="button" className="image-remove" onClick={() => removeImage(i)}>×</button>
            </div>
          ))}
          {form.images.length < 4 && (
            <button type="button" className="image-add" onClick={() => fileRef.current?.click()}>+</button>
          )}
          <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={handleImageChange} />
        </div>

        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? '发布中...' : '提交任务'}
        </button>
      </form>
    </div>
  );
}
