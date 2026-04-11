import { env } from '../config/env.js';

const CAMPUS_POI_MAP = {
  '东方红校区': {
    city: '湘潭',
    center: { latitude: 27.8295, longitude: 112.9298 },
    pois: [
      { title: '东门菜鸟驿站', address: '东方红校区东门快递服务点', latitude: 27.8299, longitude: 112.9272 },
      { title: '6 栋宿舍楼', address: '东方红校区学生宿舍 6 栋', latitude: 27.8279, longitude: 112.9310 },
      { title: '图书馆一楼大厅', address: '东方红校区图书馆主入口', latitude: 27.8302, longitude: 112.9321 },
      { title: '一食堂奶茶店', address: '东方红校区第一食堂奶茶档口', latitude: 27.8288, longitude: 112.9294 },
      { title: '第二食堂', address: '东方红校区第二食堂', latitude: 27.8281, longitude: 112.9304 },
      { title: '体育馆西门', address: '东方红校区体育馆西侧入口', latitude: 27.8314, longitude: 112.9284 },
      { title: '主教学楼 A 栋', address: '东方红校区教学区 A 栋', latitude: 27.8308, longitude: 112.9301 },
      { title: '主教学楼 B 栋', address: '东方红校区教学区 B 栋', latitude: 27.8311, longitude: 112.9313 },
      { title: '南门公交站', address: '东方红校区南门公交站台', latitude: 27.8269, longitude: 112.9306 },
      { title: '北门打印店', address: '东方红校区北门打印复印店', latitude: 27.8324, longitude: 112.9292 }
    ]
  }
};

function normalizeText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/寝室/g, '宿舍')
    .replace(/宿舍楼/g, '宿舍')
    .replace(/快递站/g, '驿站')
    .replace(/菜鸟/g, '驿站');
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function hasCoordinates(point) {
  return Boolean(
    point &&
    Number.isFinite(Number(point.latitude)) &&
    Number.isFinite(Number(point.longitude))
  );
}

function calcDistanceMeters(start, end) {
  const earthRadius = 6371000;
  const lat1 = toRadians(Number(start.latitude));
  const lat2 = toRadians(Number(end.latitude));
  const deltaLat = lat2 - lat1;
  const deltaLng = toRadians(Number(end.longitude) - Number(start.longitude));
  const sinLat = Math.sin(deltaLat / 2);
  const sinLng = Math.sin(deltaLng / 2);
  const a = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(earthRadius * c);
}

function formatDistanceText(distanceMeters) {
  if (distanceMeters < 1000) {
    return `约 ${distanceMeters}m`;
  }
  return `约 ${(distanceMeters / 1000).toFixed(1)}km`;
}

function formatDurationTextBySeconds(durationSeconds, modeLabel = '步行') {
  const minutes = Math.max(1, Math.round(Number(durationSeconds || 0) / 60));
  return `${modeLabel}约 ${minutes} 分钟`;
}

function formatDurationTextByDistance(distanceMeters, modeLabel = '骑行') {
  const minutes = Math.max(5, Math.round(distanceMeters / 180));
  return `${modeLabel}约 ${minutes} 分钟`;
}

function getCampusProfile(campus) {
  return CAMPUS_POI_MAP[campus] || CAMPUS_POI_MAP['东方红校区'];
}

function scorePoi(poi, keyword) {
  const target = `${poi.title} ${poi.address}`.toLowerCase();
  if (!keyword) {
    return 0;
  }
  if (target.startsWith(keyword)) {
    return 100;
  }
  if (target.includes(keyword)) {
    return 60;
  }
  return 0;
}

function toSuggestion(poi, distanceMeters) {
  return {
    id: `${poi.title}-${poi.latitude}-${poi.longitude}`,
    title: poi.title,
    address: poi.address,
    distanceText: Number.isFinite(distanceMeters) ? formatDistanceText(distanceMeters) : '',
    location: {
      latitude: Number(poi.latitude),
      longitude: Number(poi.longitude),
      name: poi.title
    }
  };
}

function getNearbyReference(location, campus) {
  if (hasCoordinates(location)) {
    return location;
  }
  return getCampusProfile(campus).center;
}

function createLocalSuggestions({ keyword, campus, location, limit }) {
  const profile = getCampusProfile(campus);
  const normalizedKeyword = normalizeText(keyword);
  const reference = getNearbyReference(location, campus);

  return profile.pois
    .map((poi) => {
      const distanceMeters = calcDistanceMeters(reference, poi);
      return {
        poi,
        distanceMeters,
        score: scorePoi(poi, normalizedKeyword)
      };
    })
    .filter((item) => !normalizedKeyword || item.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }
      return left.distanceMeters - right.distanceMeters;
    })
    .slice(0, limit)
    .map((item) => toSuggestion(item.poi, item.distanceMeters));
}

async function fetchTencentSuggestions({ keyword, campus, location, limit }) {
  if (!env.tencent.mapKey || !keyword) {
    return [];
  }

  const profile = getCampusProfile(campus);
  const params = new URLSearchParams({
    key: env.tencent.mapKey,
    keyword,
    region: profile.city,
    page_size: String(limit)
  });

  if (hasCoordinates(location)) {
    params.set('location', `${location.latitude},${location.longitude}`);
  }

  const response = await fetch(`https://apis.map.qq.com/ws/place/v1/suggestion?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`腾讯地图建议接口异常：${response.status}`);
  }

  const payload = await response.json();
  const list = Array.isArray(payload.data) ? payload.data : [];

  return list
    .filter((item) => item && item.location)
    .map((item) => ({
      id: String(item.id || `${item.title}-${item.location.lat}-${item.location.lng}`),
      title: item.title || item.address || '地点',
      address: item.address || item.ad_info?.district || profile.city,
      distanceText: '',
      location: {
        latitude: Number(item.location.lat),
        longitude: Number(item.location.lng),
        name: item.title || item.address || '地点'
      }
    }));
}

function buildLocalRouteSummary(from, to) {
  const straightDistance = calcDistanceMeters(from, to);
  const routeDistance = Math.round(straightDistance * 1.18);
  return {
    providerText: env.tencent.mapKey ? '腾讯位置服务暂不可用，当前使用本地路线估算' : '未配置腾讯位置服务 Key，当前使用本地路线估算',
    modeText: env.tencent.mapKey ? '本地路线估算' : '本地路线估算',
    distanceMeters: routeDistance,
    distanceText: formatDistanceText(routeDistance),
    durationSeconds: Math.max(300, Math.round((routeDistance / 180) * 60)),
    durationText: formatDurationTextByDistance(routeDistance),
    summaryText: `${formatDistanceText(routeDistance)} · ${formatDurationTextByDistance(routeDistance)}`
  };
}

async function fetchTencentRouteSummary(from, to) {
  if (!env.tencent.mapKey) {
    return null;
  }

  const params = new URLSearchParams({
    key: env.tencent.mapKey,
    mode: 'walking',
    from: `${from.latitude},${from.longitude}`,
    to: `${to.latitude},${to.longitude}`
  });

  const response = await fetch(`https://apis.map.qq.com/ws/distance/v1/matrix?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`腾讯地图距离接口异常：${response.status}`);
  }

  const payload = await response.json();
  const result = payload.result?.rows?.[0]?.elements?.[0];
  if (!result || !Number.isFinite(Number(result.distance))) {
    throw new Error('腾讯地图距离结果为空');
  }

  const distanceMeters = Number(result.distance);
  const durationSeconds = Number(result.duration) || 0;

  return {
    providerText: '已通过腾讯位置服务计算距离与耗时',
    modeText: '腾讯位置服务步行估算',
    distanceMeters,
    distanceText: formatDistanceText(distanceMeters),
    durationSeconds,
    durationText: formatDurationTextBySeconds(durationSeconds),
    summaryText: `${formatDistanceText(distanceMeters)} · ${formatDurationTextBySeconds(durationSeconds)}`
  };
}

export async function searchPlaces({ keyword, campus = '东方红校区', location, limit = 6 }) {
  const normalizedLimit = Math.min(Math.max(Number(limit) || 6, 1), 10);
  const trimmedKeyword = String(keyword || '').trim();

  if (env.tencent.mapKey) {
    try {
      const suggestions = await fetchTencentSuggestions({
        keyword: trimmedKeyword,
        campus,
        location,
        limit: normalizedLimit
      });
      if (suggestions.length > 0) {
        return {
          providerText: '腾讯位置服务地点建议',
          suggestions
        };
      }
    } catch (error) {
      return {
        providerText: '腾讯位置服务暂不可用，已切换本地地点库',
        suggestions: createLocalSuggestions({
          keyword: trimmedKeyword,
          campus,
          location,
          limit: normalizedLimit
        })
      };
    }
  }

  return {
    providerText: '未配置腾讯位置服务 Key，当前使用本地地点库',
    suggestions: createLocalSuggestions({
      keyword: trimmedKeyword,
      campus,
      location,
      limit: normalizedLimit
    })
  };
}

export async function getRouteSummary({ from, to }) {
  if (!hasCoordinates(from) || !hasCoordinates(to)) {
    throw new Error('路线起终点坐标缺失');
  }

  if (env.tencent.mapKey) {
    try {
      const summary = await fetchTencentRouteSummary(from, to);
      if (summary) {
        return summary;
      }
    } catch (error) {
      return buildLocalRouteSummary(from, to);
    }
  }

  return buildLocalRouteSummary(from, to);
}
