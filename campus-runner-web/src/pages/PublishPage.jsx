import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, Marker, Popup, useMapEvents } from 'react-leaflet';
import { Coins, Crosshair, ImagePlus, MapPinned, Search } from 'lucide-react';
import L from 'leaflet';

import { MapLibreBaseLayer } from '../components/MapLibreBaseLayer.jsx';
import { getRouteSummary, publishTask, reverseGeocode, searchPlaces } from '../lib/api.js';
import { useAuth } from '../auth.jsx';
import { formatAmount } from '../lib/format.js';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const CATEGORIES = ['跑腿', '代拿代买', '游戏陪玩', '二手闲置', '失物招领', '校内兼职', '其他'];
const DEFAULT_CAMPUS = '东方红校区';
const CAMPUS_CENTER = [28.1885, 112.8688];

function LocationPicker({ onSelect }) {
  useMapEvents({
    click(event) {
      onSelect({
        latitude: event.latlng.lat,
        longitude: event.latlng.lng,
        name: `地图位置 ${event.latlng.lat.toFixed(5)}, ${event.latlng.lng.toFixed(5)}`
      });
    }
  });

  return null;
}

export function PublishPage() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: CATEGORIES[0],
    price: '5.00',
    pickupText: '',
    deliveryText: '',
    deadlineText: '',
    images: []
  });
  const [pickupLoc, setPickupLoc] = useState(null);
  const [deliveryLoc, setDeliveryLoc] = useState(null);
  const [selectingField, setSelectingField] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [routeInfo, setRouteInfo] = useState(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchError, setSearchError] = useState('');
  const [myLocation, setMyLocation] = useState(null);
  const [mapCenter, setMapCenter] = useState(CAMPUS_CENTER);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  useEffect(() => {
    if (!navigator.geolocation) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };
        setMyLocation(nextLocation);
        setMapCenter([nextLocation.latitude, nextLocation.longitude]);
      },
      () => {}
    );
  }, []);

  useEffect(() => {
    if (!searchKeyword.trim()) {
      setSuggestions([]);
      setSearchError('');
      return;
    }

    const timer = setTimeout(() => {
      searchPlaces(searchKeyword, user?.campus || DEFAULT_CAMPUS, myLocation || pickupLoc || deliveryLoc)
        .then((data) => {
          const list = Array.isArray(data?.suggestions) ? data.suggestions : [];
          setSuggestions(list);
          setSearchError('');
        })
        .catch((error) => {
          setSuggestions([]);
          setSearchError(error.message || '地点搜索失败');
        });
    }, 400);

    return () => clearTimeout(timer);
  }, [searchKeyword, user?.campus, myLocation, pickupLoc, deliveryLoc]);

  useEffect(() => {
    if (!pickupLoc || !deliveryLoc) {
      setRouteInfo(null);
      return;
    }

    getRouteSummary(pickupLoc, deliveryLoc)
      .then((data) => setRouteInfo(data))
      .catch(() => setRouteInfo(null));
  }, [pickupLoc, deliveryLoc]);

  function getDefaultDeadline() {
    const next = new Date();
    next.setDate(next.getDate() + 1);
    next.setHours(18, 0, 0, 0);
    return next.toISOString().slice(0, 16);
  }

  function applySelectedLocation(location, field) {
    if (field === 'pickup') {
      setPickupLoc(location);
      updateField('pickupText', location.name || `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`);
      return;
    }

    setDeliveryLoc(location);
    updateField('deliveryText', location.name || `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`);
  }

  function selectSuggestion(item) {
    const locationName = item.address ? `${item.title} · ${item.address}` : item.title;
    applySelectedLocation({
      latitude: item.location.latitude,
      longitude: item.location.longitude,
      name: locationName
    }, selectingField);
    setSuggestions([]);
    setSearchKeyword('');
    setSelectingField(null);
  }

  async function handleMapClick(location) {
    try {
      const reverse = await reverseGeocode(location, user?.campus || DEFAULT_CAMPUS);
      const locationName = reverse.address ? `${reverse.title} · ${reverse.address}` : reverse.title;
      applySelectedLocation({ ...location, name: locationName }, selectingField);
    } catch {
      applySelectedLocation(location, selectingField);
    }
  }

  function handleImageChange(event) {
    const files = Array.from(event.target.files || []);
    if (form.images.length + files.length > 4) {
      alert('最多上传 4 张图片');
      return;
    }

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        setForm((prev) => ({
          ...prev,
          images: [...prev.images, loadEvent.target?.result].slice(0, 4)
        }));
      };
      reader.readAsDataURL(file);
    });

    event.target.value = '';
  }

  function removeImage(index) {
    setForm((prev) => ({
      ...prev,
      images: prev.images.filter((_, currentIndex) => currentIndex !== index)
    }));
  }

  function buildDeadlineText() {
    if (!form.deadlineText) {
      return '尽快';
    }

    return new Date(form.deadlineText).toLocaleString('zh-CN', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function buildPublishPayload(forcePublish = false) {
    return {
      title: form.title,
      description: form.description,
      category: form.category,
      price: Number(Number(form.price).toFixed(2)),
      pickupText: form.pickupText,
      deliveryText: form.deliveryText,
      deadlineText: buildDeadlineText(),
      pickupLocation: pickupLoc,
      deliveryLocation: deliveryLoc,
      distanceText: routeInfo?.summaryText || '待计算',
      images: form.images,
      campus: user?.campus || DEFAULT_CAMPUS,
      ...(forcePublish ? { forcePublish: true } : {})
    };
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.title.trim() || !form.description.trim()) {
      alert('请填写完整的任务信息');
      return;
    }

    setSubmitting(true);
    try {
      await publishTask(token, buildPublishPayload());
      navigate('/', { replace: true });
    } catch (error) {
      if ((error.message || '').includes('检测到相同内容') && window.confirm(`${error.message}，是否继续发布？`)) {
        try {
          await publishTask(token, buildPublishPayload(true));
          navigate('/', { replace: true });
        } catch (retryError) {
          alert(retryError.message || '发布失败');
        }
      } else {
        alert(error.message || '发布失败');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page publish-page">
      <h2 className="page-title-with-icon"><MapPinned size={22} /> 发布任务</h2>
      <form onSubmit={handleSubmit} className="publish-form">
        <label>任务标题</label>
        <input type="text" placeholder="例如：帮忙取快递送到宿舍楼下" value={form.title} onChange={(event) => updateField('title', event.target.value)} disabled={submitting} />

        <label>任务类别</label>
        <select value={form.category} onChange={(event) => updateField('category', event.target.value)} disabled={submitting}>
          {CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>

        <label>任务描述</label>
        <textarea rows={3} placeholder="补充任务要求和注意事项" value={form.description} onChange={(event) => updateField('description', event.target.value)} disabled={submitting} />

        <label>积分报酬</label>
        <input type="number" min={0.01} step="0.01" value={form.price} onChange={(event) => updateField('price', event.target.value)} disabled={submitting} />
        <p className="subtle form-inline-hint"><Coins size={14} /> 支持精确到 0.01 积分，当前报酬 {formatAmount(form.price)} 积分</p>

        <label>取货/起点 <button type="button" className="btn-map-pick" onClick={() => setSelectingField(selectingField === 'pickup' ? null : 'pickup')}>地图选取</button></label>
        <input type="text" placeholder="例如：东门菜鸟驿站" value={form.pickupText} onChange={(event) => { updateField('pickupText', event.target.value); setPickupLoc(null); }} disabled={submitting} />

        <label>送达/终点 <button type="button" className="btn-map-pick" onClick={() => setSelectingField(selectingField === 'delivery' ? null : 'delivery')}>地图选取</button></label>
        <input type="text" placeholder="例如：6 栋宿舍楼" value={form.deliveryText} onChange={(event) => { updateField('deliveryText', event.target.value); setDeliveryLoc(null); }} disabled={submitting} />

        {selectingField && (
          <div className="map-section">
            <div className="map-search-row">
              <div className="search-input-wrap">
                <Search size={16} />
                <input type="text" placeholder="搜索楼栋、食堂、驿站..." value={searchKeyword} onChange={(event) => setSearchKeyword(event.target.value)} />
              </div>
              {myLocation && <span className="subtle map-locate-badge"><Crosshair size={12} /> 已定位</span>}
            </div>
            {suggestions.length > 0 && (
              <div className="suggestion-list">
                {suggestions.map((item) => (
                  <div key={item.id} className="suggestion-item" onClick={() => selectSuggestion(item)}>
                    <strong>{item.title}</strong>
                    <span className="subtle">{item.address}{item.distanceText ? ` · ${item.distanceText}` : ''}</span>
                  </div>
                ))}
              </div>
            )}
            {searchKeyword && suggestions.length === 0 && (
              <p className="subtle" style={{ padding: '8px 0' }}>{searchError || '未找到匹配地点，可直接点击地图选取'}</p>
            )}
            <div className="map-container">
              <MapContainer
                center={mapCenter}
                zoom={16}
                minZoom={1}
                maxBounds={[[-85, -180], [85, 180]]}
                style={{ height: 280, borderRadius: 12 }}
                key={mapCenter.join(',')}
              >
                <MapLibreBaseLayer />
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
        <input type="datetime-local" value={form.deadlineText || getDefaultDeadline()} onChange={(event) => updateField('deadlineText', event.target.value)} disabled={submitting} />

        <label>上传图片（最多 4 张）</label>
        <div className="image-upload-area">
          {form.images.map((image, index) => (
            <div key={index} className="image-preview">
              <img src={image} alt="" />
              <button type="button" className="image-remove" onClick={() => removeImage(index)}>×</button>
            </div>
          ))}
          {form.images.length < 4 && (
            <button type="button" className="image-add" onClick={() => fileRef.current?.click()}><ImagePlus size={18} /></button>
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
