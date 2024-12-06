import { EARTH_RAD, TILE_SIZE } from "../config";
// 地球周长
const EARTH_PERIMETER: number = 2 * Math.PI * EARTH_RAD;

// 分辨率列表
const resolutions: number[] = []


// 角度转弧度
const angleToRad = (angle: number): number => {
  return angle * (Math.PI / 180);
};

// 弧度转角度
const radToAngle = (rad: number): number => {
  return rad * (180 / Math.PI);
};

// 4326转3857
const lngLat2Mercator = (lng: number, lat: number): [number, number] => {
  // 经度先转弧度，然后因为 弧度 = 弧长 / 半径 ，得到弧长为 弧长 = 弧度 * 半径
  const x: number = angleToRad(lng) * EARTH_RAD;

  // 纬度先转弧度
  const rad: number = angleToRad(lat);

  //
  const sin: number = Math.sin(rad);
  const y: number = (EARTH_RAD / 2) * Math.log((1 + sin) / (1 - sin));

  return [x, y];
};

// 3857转4326
const mercatorTolnglat = (x: number, y: number): [number, number] => {
  const lng: number = radToAngle(x) / EARTH_RAD;
  const lat: number = radToAngle(
    2 * Math.atan(Math.exp(y / EARTH_RAD)) - Math.PI / 2
  );

  return [lng, lat];
};

// 获取某一层级下的分辨率
const getResolution = (n: number): number => {
  const tileNums: number = Math.pow(2, n);
  const tileTotalPx: number = tileNums * TILE_SIZE;
  return EARTH_PERIMETER / tileTotalPx;
};

// 计算好于20级分辨率
for (let i = 0; i <= 20; i++) {
  resolutions.push(getResolution(i))
}

// 获取某一个经纬度的像素坐标
const getPixelCoord = (lon: number,lat: number,z: number): [number, number] => {
  // 经纬度转3857
  let [x, y] = lngLat2Mercator(lon, lat);
  // 根据原点位置计算后的坐标
  x += EARTH_PERIMETER / 2;
  y = EARTH_PERIMETER / 2 - y;
  // 分辨率
  let resolution: number = getResolution(z);
  // 除以分辨率，得到瓦片像素坐标
  let xPixel: number = x / resolution;
  let yPixel: number = y / resolution;
  return [xPixel, yPixel];
};

// 计算瓦片行列号
const getTileRowAndCol = (lon: number,lat: number,z: number): [number, number] => {
  // 获取像素坐标
  let [xPixel, yPixel] = getPixelCoord(lon, lat, z);
  // 行列号
  let row: number = Math.floor(xPixel / TILE_SIZE);
  let col: number = Math.floor(yPixel / TILE_SIZE);
  return [row, col];
};

// 拼接瓦片地址
const getTileUrl = (x: number, y: number, z: number)=>{
  let domainIndexList = [1, 2, 3, 4];
  let domainIndex = domainIndexList[Math.floor(Math.random() * domainIndexList.length)];
  return `https://webrd0${domainIndex}.is.autonavi.com/appmaptile?x=${x}&y=${y}&z=${z}&lang=zh_cn&size=1&scale=1&style=8`;
}

export {
  resolutions,
  lngLat2Mercator,
  mercatorTolnglat,
  getResolution,
  getPixelCoord,
  getTileRowAndCol,
  getTileUrl,
};
