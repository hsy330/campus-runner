import { env } from '../config/env.js';

const CAMPUS_POI_MAP = {
  '东方红校区': {
    city: '长沙',
    center: { latitude: 28.1885, longitude: 112.8688 },
    pois: [
      { title: '东门菜鸟驿站', address: '东方红校区东门快递服务中心', latitude: 28.1899, longitude: 112.8672 },
      { title: '西门菜鸟驿站', address: '东方红校区西门快递服务中心', latitude: 28.1887, longitude: 112.8658 },
      { title: '6栋宿舍楼', address: '东方红校区学生宿舍6栋', latitude: 28.1879, longitude: 112.8710 },
      { title: '1栋宿舍楼', address: '东方红校区学生宿舍1栋', latitude: 28.1881, longitude: 112.8721 },
      { title: '2栋宿舍楼', address: '东方红校区学生宿舍2栋', latitude: 28.1883, longitude: 112.8718 },
      { title: '3栋宿舍楼', address: '东方红校区学生宿舍3栋', latitude: 28.1885, longitude: 112.8715 },
      { title: '4栋宿舍楼', address: '东方红校区学生宿舍4栋', latitude: 28.1887, longitude: 112.8712 },
      { title: '5栋宿舍楼', address: '东方红校区学生宿舍5栋', latitude: 28.1889, longitude: 112.8709 },
      { title: '7栋宿舍楼', address: '东方红校区学生宿舍7栋', latitude: 28.1876, longitude: 112.8713 },
      { title: '8栋宿舍楼', address: '东方红校区学生宿舍8栋', latitude: 28.1874, longitude: 112.8716 },
      { title: '9栋宿舍楼', address: '东方红校区学生宿舍9栋', latitude: 28.1872, longitude: 112.8719 },
      { title: '10栋宿舍楼', address: '东方红校区学生宿舍10栋', latitude: 28.1870, longitude: 112.8722 },
      { title: '11栋宿舍楼', address: '东方红校区学生宿舍11栋', latitude: 28.1868, longitude: 112.8725 },
      { title: '12栋宿舍楼', address: '东方红校区学生宿舍12栋', latitude: 28.1866, longitude: 112.8728 },
      { title: '13栋宿舍楼', address: '东方红校区学生宿舍13栋', latitude: 28.1864, longitude: 112.8731 },
      { title: '14栋宿舍楼', address: '东方红校区学生宿舍14栋', latitude: 28.1862, longitude: 112.8734 },
      { title: '15栋宿舍楼', address: '东方红校区学生宿舍15栋', latitude: 28.1860, longitude: 112.8737 },
      { title: '图书馆一楼大厅', address: '东方红校区图书馆主入口', latitude: 28.1902, longitude: 112.8721 },
      { title: '图书馆二楼自习区', address: '东方红校区图书馆二楼', latitude: 28.1903, longitude: 112.8723 },
      { title: '图书馆报告厅', address: '东方红校区图书馆报告厅', latitude: 28.1901, longitude: 112.8725 },
      { title: '图书馆东侧阅览室', address: '东方红校区图书馆东侧阅览室', latitude: 28.1904, longitude: 112.8726 },
      { title: '一食堂奶茶店', address: '东方红校区第一食堂', latitude: 28.1888, longitude: 112.8694 },
      { title: '一食堂入口', address: '东方红校区第一食堂入口', latitude: 28.1889, longitude: 112.8697 },
      { title: '一食堂二楼', address: '东方红校区第一食堂二楼', latitude: 28.1887, longitude: 112.8695 },
      { title: '第二食堂', address: '东方红校区第二食堂', latitude: 28.1881, longitude: 112.8704 },
      { title: '第三食堂', address: '东方红校区第三食堂', latitude: 28.1876, longitude: 112.8699 },
      { title: '清真食堂窗口', address: '东方红校区第二食堂清真窗口', latitude: 28.1880, longitude: 112.8701 },
      { title: '咖啡店', address: '东方红校区生活区咖啡店', latitude: 28.1891, longitude: 112.8702 },
      { title: '体育馆西门', address: '东方红校区体育馆西侧入口', latitude: 28.1914, longitude: 112.8684 },
      { title: '体育馆东门', address: '东方红校区体育馆东侧入口', latitude: 28.1912, longitude: 112.8689 },
      { title: '游泳馆', address: '东方红校区游泳馆', latitude: 28.1916, longitude: 112.8679 },
      { title: '主教学楼A栋', address: '东方红校区教学区A栋', latitude: 28.1908, longitude: 112.8701 },
      { title: '主教学楼B栋', address: '东方红校区教学区B栋', latitude: 28.1911, longitude: 112.8713 },
      { title: '主教学楼C栋', address: '东方红校区教学区C栋', latitude: 28.1906, longitude: 112.8719 },
      { title: '主教学楼D栋', address: '东方红校区教学区D栋', latitude: 28.1901, longitude: 112.8714 },
      { title: '逸夫楼', address: '东方红校区逸夫教学楼', latitude: 28.1909, longitude: 112.8693 },
      { title: '综合楼', address: '东方红校区综合楼', latitude: 28.1907, longitude: 112.8698 },
      { title: '实验楼', address: '东方红校区实验教学楼', latitude: 28.1915, longitude: 112.8706 },
      { title: '化学实验楼', address: '东方红校区化学实验楼', latitude: 28.1917, longitude: 112.8709 },
      { title: '物理实验楼', address: '东方红校区物理实验楼', latitude: 28.1919, longitude: 112.8704 },
      { title: '行政楼', address: '东方红校区行政办公楼', latitude: 28.1918, longitude: 112.8697 },
      { title: '就业指导中心', address: '东方红校区就业指导中心', latitude: 28.1910, longitude: 112.8688 },
      { title: '创新创业中心', address: '东方红校区创新创业中心', latitude: 28.1912, longitude: 112.8691 },
      { title: '南门公交站', address: '东方红校区南门公交站台', latitude: 28.1869, longitude: 112.8706 },
      { title: '北门公交站', address: '东方红校区北门公交站台', latitude: 28.1929, longitude: 112.8694 },
      { title: '北门打印店', address: '东方红校区北门打印复印店', latitude: 28.1924, longitude: 112.8692 },
      { title: '文印中心', address: '东方红校区文印服务中心', latitude: 28.1919, longitude: 112.8694 },
      { title: '复印店', address: '东方红校区学习服务复印店', latitude: 28.1916, longitude: 112.8696 },
      { title: '校内超市', address: '东方红校区校内生活超市', latitude: 28.1893, longitude: 112.8698 },
      { title: '水果店', address: '东方红校区生活区水果店', latitude: 28.1890, longitude: 112.8700 },
      { title: '快递代收点', address: '东方红校区生活区快递代收点', latitude: 28.1896, longitude: 112.8675 },
      { title: '操场', address: '东方红校区田径运动场', latitude: 28.1905, longitude: 112.8665 },
      { title: '操场看台', address: '东方红校区田径运动场看台', latitude: 28.1908, longitude: 112.8669 },
      { title: '篮球场', address: '东方红校区篮球场', latitude: 28.1900, longitude: 112.8671 },
      { title: '羽毛球馆', address: '东方红校区羽毛球馆', latitude: 28.1910, longitude: 112.8676 },
      { title: '医务室', address: '东方红校区校医院', latitude: 28.1896, longitude: 112.8682 },
      { title: '快递柜', address: '东方红校区智能快递柜', latitude: 28.1894, longitude: 112.8678 },
      { title: '东门', address: '东方红校区东门', latitude: 28.1900, longitude: 112.8668 },
      { title: '西门', address: '东方红校区西门', latitude: 28.1882, longitude: 112.8654 },
      { title: '南门', address: '东方红校区南门', latitude: 28.1867, longitude: 112.8703 },
      { title: '北门', address: '东方红校区北门', latitude: 28.1927, longitude: 112.8690 }
    ]
  },
  '城南校区': {
    city: '长沙',
    center: { latitude: 28.1785, longitude: 112.9608 },
    pois: [
      { title: '城南校区南门', address: '城南校区正门', latitude: 28.1780, longitude: 112.9600 },
      { title: '城南校区北门', address: '城南校区北门', latitude: 28.1801, longitude: 112.9613 },
      { title: '教学楼A栋', address: '城南校区主教学楼A栋', latitude: 28.1790, longitude: 112.9615 },
      { title: '教学楼B栋', address: '城南校区主教学楼B栋', latitude: 28.1793, longitude: 112.9618 },
      { title: '实验楼', address: '城南校区实验楼', latitude: 28.1791, longitude: 112.9621 },
      { title: '行政楼', address: '城南校区行政楼', latitude: 28.1787, longitude: 112.9617 },
      { title: '第一宿舍楼', address: '城南校区学生公寓1栋', latitude: 28.1775, longitude: 112.9620 },
      { title: '第二宿舍楼', address: '城南校区学生公寓2栋', latitude: 28.1778, longitude: 112.9622 },
      { title: '第三宿舍楼', address: '城南校区学生公寓3栋', latitude: 28.1772, longitude: 112.9624 },
      { title: '学生食堂', address: '城南校区学生食堂', latitude: 28.1795, longitude: 112.9610 },
      { title: '一食堂入口', address: '城南校区学生食堂入口', latitude: 28.1793, longitude: 112.9609 },
      { title: '图书馆', address: '城南校区图书馆', latitude: 28.1788, longitude: 112.9611 },
      { title: '快递驿站', address: '城南校区快递驿站', latitude: 28.1782, longitude: 112.9605 },
      { title: '操场', address: '城南校区操场', latitude: 28.1789, longitude: 112.9598 },
      { title: '校内超市', address: '城南校区生活超市', latitude: 28.1784, longitude: 112.9614 },
      { title: '医务室', address: '城南校区医务室', latitude: 28.1786, longitude: 112.9619 },
      { title: '南门公交站', address: '城南校区南门公交站', latitude: 28.1778, longitude: 112.9598 }
    ]
  }
};

function normalizeText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/幢/g, '栋')
    .replace(/号楼/g, '栋')
    .replace(/寝室/g, '宿舍')
    .replace(/宿舍楼/g, '宿舍')
    .replace(/快递站/g, '驿站')
    .replace(/菜鸟/g, '驿站')
    .replace(/一食堂/g, '第一食堂')
    .replace(/二食堂/g, '第二食堂')
    .replace(/三食堂/g, '第三食堂')
    .replace(/教学楼a/g, '教学楼a栋')
    .replace(/教学楼b/g, '教学楼b栋')
    .replace(/教学楼c/g, '教学楼c栋')
    .replace(/教学楼d/g, '教学楼d栋');
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

function getNearestPoi(location, campus) {
  if (!hasCoordinates(location)) {
    return null;
  }
  const profile = getCampusProfile(campus);
  const nearest = profile.pois
    .map((poi) => ({ poi, distanceMeters: calcDistanceMeters(location, poi) }))
    .sort((left, right) => left.distanceMeters - right.distanceMeters)[0];
  if (!nearest || nearest.distanceMeters > 120) {
    return null;
  }
  return nearest;
}

function scorePoi(poi, keyword) {
  const target = `${poi.title} ${poi.address}`.toLowerCase();
  if (!keyword) {
    return 0;
  }
  if (target.startsWith(keyword)) {
    return 100;
  }
  if (target.replace(/\s+/g, '').includes(keyword.replace(/\s+/g, ''))) {
    return 80;
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

export async function reverseGeocode({ location, campus = '东方红校区' }) {
  if (!hasCoordinates(location)) {
    throw new Error('坐标不合法');
  }

  const nearest = getNearestPoi(location, campus);
  if (nearest) {
    return {
      providerText: '校园本地点位库反查',
      address: nearest.poi.address,
      title: nearest.poi.title,
      distanceText: formatDistanceText(nearest.distanceMeters)
    };
  }

  return {
    providerText: '校园本地点位库未命中，已返回坐标位置',
    address: `${campus} 附近位置`,
    title: `地图位置 ${Number(location.latitude).toFixed(5)}, ${Number(location.longitude).toFixed(5)}`,
    distanceText: ''
  };
}
