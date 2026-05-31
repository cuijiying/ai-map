import { TILE_SIZE, MIN_ZOOM, MAX_ZOOM } from "../config";
import Tile from "../layer/Tile";
import {
  resolutions,
  lngLat2Mercator,
  mercatorTolnglat,
  getPixelCoord,
  getTileRowAndCol,
} from "../util/tile-transform";
// import { EventEmitter } from "events";

// Map类 继承事件监听
export default class Map {
  #container: HTMLElement;
  #zoom: number;
  #center: number[];
  #canvas: HTMLCanvasElement | null = null;
  #ctx: CanvasRenderingContext2D | null = null;
  #isMousedown: boolean = false;
  #tileCache: any = {};
  // 当前帧需要渲染的瓦片快照（每帧重新赋值，供异步加载完成的瓦片判断是否仍需绘制）
  #currentTileCache: any = {};
  // 构造函数
  constructor(options: any) {
    // super();
    this.#container = options?.container;
    this.#zoom = options?.zoom;
    this.#center = options?.center;
    this.render();
  }

  get center() {
    return this.#center;
  }
  set center(center: number[]) {
    this.#center = center;
  }

  get isMousedown() {
    return this.#isMousedown;
  }
  set isMousedown(isMousedown: boolean) {
    this.#isMousedown = isMousedown;
  }

  get zoom() {
    return this.#zoom;
  }

  // 初始化容器和画布
  #initContainer() {
    // 根据this.#container创建地图容器, 如果this.#container是id就获取id为this.#container的元素，如果是dom则直接使用
    const mapContainer =
      typeof this.#container === "string"
        ? document.getElementById(this.#container)
        : this.#container;
    // 创建一个canvas元素,添加到容器
    this.#canvas = document.createElement("canvas");
    this.#canvas.style.position = "absolute";
    // this.#canvas.style.position = "fixed";
    // this.#canvas.style.display = "block";
    if (mapContainer) {
      const rect = mapContainer.getBoundingClientRect();
      this.#canvas.width = rect.width;
      this.#canvas.height = rect.height;
      mapContainer.appendChild(this.#canvas);
      this.#ctx = this.#canvas.getContext("2d");
    } else {
      throw new Error("地图容器不存在");
    }
    // 监听鼠标按下事件
    this.#canvas.addEventListener("mousedown", this.onMousedown.bind(this));
    // 监听鼠标滚轮事件，实现缩放
    this.#canvas.addEventListener("wheel", this.onWheel.bind(this), {
      passive: false,
    });
    if (this.#ctx) {
      this.#ctx.translate(this.#canvas.width / 2, this.#canvas.height / 2);
    }
  }
  render() {
    this.#initContainer();
    this.#renderTiles();
    window.addEventListener("mousemove", this.onMousemove.bind(this));
    window.addEventListener("mouseup", this.onMouseup.bind(this));
  }

  // 渲染地图
  #renderTiles() {
    // 获取中心点切片的行列号
    const [rowCenter, colCenter] = getTileRowAndCol(
      this.#center[0],
      this.#center[1],
      this.#zoom
    );
    console.log(rowCenter, colCenter);
    // 中心瓦片左上角对应的像素坐标
    let centerTilePos = [rowCenter * TILE_SIZE, colCenter * TILE_SIZE];
    // 中心点对应的像素坐标
    let centerPos = getPixelCoord(this.#center[0], this.#center[1], this.#zoom);
    // 计算中心点对应的像素坐标与中心瓦片左上角对应的像素坐标的差值
    let offset = [
      centerPos[0] - centerTilePos[0],
      centerPos[1] - centerTilePos[1],
    ];
    // 切片的渲染
    if (this.#canvas && this.#ctx) {
      // 计算中心点为基点，分别计算左上和右下瓦片数量
      let rowMinNum = Math.ceil(
        (this.#canvas.width / 2 - offset[0]) / TILE_SIZE
      ); // 左
      let colMinNum = Math.ceil(
        (this.#canvas.height / 2 - offset[1]) / TILE_SIZE
      ); // 上
      let rowMaxNum = Math.ceil(
        (this.#canvas.width / 2 - (TILE_SIZE - offset[0])) / TILE_SIZE
      ); // 右
      let colMaxNum = Math.ceil(
        (this.#canvas.height / 2 - (TILE_SIZE - offset[1])) / TILE_SIZE
      ); // 下
      // 从上到下，从左到右，加载瓦片
      // 重置当前帧需要渲染的瓦片快照（使用实例字段，保证异步加载完成的瓦片读取的是最新一帧的数据）
      this.#currentTileCache = {};
      const currentTileCache: any = this.#currentTileCache;
      for (let i = -rowMinNum; i <= rowMaxNum; i++) {
        for (let j = -colMinNum; j <= colMaxNum; j++) {
          // 当前瓦片的行列号
          let row = rowCenter + i;
          let col = colCenter + j;
          // 当前瓦片的显示位置
          let x = i * TILE_SIZE - offset[0];
          let y = j * TILE_SIZE - offset[1];
          // 缓存key
          let cacheKey = row + "_" + col + "_" + this.zoom;
          // 记录画布当前需要的瓦片
          currentTileCache[cacheKey] = true;
          // 该瓦片已加载过
          if (this.#tileCache[cacheKey]) {
            // 更新到当前位置
            this.#tileCache[cacheKey].updatePos(x, y).render();
          } else {
            // 未加载过
            this.#tileCache[cacheKey] = new Tile({
              ctx: this.#ctx,
              row,
              col,
              zoom: this.zoom,
              x,
              y,
              // 判断瓦片是否在当前画布缓存对象上，是的话则代表需要渲染
              // 始终读取实例上最新一帧的快照，避免闭包捕获过期帧导致迟到加载的瓦片在错误位置重复绘制
              shouldRender: (key: string) => {
                return this.#currentTileCache[key];
              },
            });
          }
        }
      }
    }
  }

  // 获取当前地图的bounds
  getBounds() {}

  // 鼠标按下
  onMousedown(e: MouseEvent) {
    console.log(e, "mousedown");
    if (e.button === 0) {
      this.#isMousedown = true;
    }
    console.log(this.#isMousedown, "isMousedown");
  }
  // 鼠标移动
  onMousemove(e: MouseEvent) {
    // debugger;
    if (!this.#isMousedown) {
      return;
    }
    console.log(e, "mousemove");
    // 计算本次拖动的距离对应的经纬度数据
    let mx = e.movementX * resolutions[this.#zoom];
    let my = e.movementY * resolutions[this.#zoom];
    const [lng, lat] = this.#center;
    let [x, y] = lngLat2Mercator(lng, lat);
    // 更新拖动后的中心点经纬度
    this.#center = mercatorTolnglat(x - mx, my + y);
    // 清除画布重新渲染瓦片
    this.#clearTiles();
    this.#renderTiles();
  }
  // 鼠标松开
  onMouseup() {
    this.#isMousedown = false;
    console.log(this.#isMousedown, "mouseup");
  }
  // 鼠标滚轮缩放（以鼠标所在位置为中心进行缩放）
  onWheel(e: WheelEvent) {
    e.preventDefault();
    if (!this.#canvas) {
      return;
    }
    // 计算目标层级：向上滚放大，向下滚缩小
    const delta = e.deltaY < 0 ? 1 : -1;
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, this.#zoom + delta));
    // 层级没有变化则不处理
    if (newZoom === this.#zoom) {
      return;
    }
    // 鼠标相对画布中心的像素偏移（画布原点已 translate 到中心）
    const rect = this.#canvas.getBoundingClientRect();
    const offsetX = e.clientX - rect.left - this.#canvas.width / 2;
    const offsetY = e.clientY - rect.top - this.#canvas.height / 2;
    // 当前层级下鼠标位置对应的墨卡托坐标
    const oldResolution = resolutions[this.#zoom];
    const [centerX, centerY] = lngLat2Mercator(
      this.#center[0],
      this.#center[1]
    );
    // 屏幕 y 向下为正，墨卡托 y 向上为正，所以 y 方向取反
    const pointX = centerX + offsetX * oldResolution;
    const pointY = centerY - offsetY * oldResolution;
    // 更新层级
    this.#zoom = newZoom;
    // 在新层级下保持鼠标位置对应的地理坐标不变，反推新的中心点墨卡托坐标
    const newResolution = resolutions[this.#zoom];
    const newCenterX = pointX - offsetX * newResolution;
    const newCenterY = pointY + offsetY * newResolution;
    this.#center = mercatorTolnglat(newCenterX, newCenterY);
    // 清除画布重新渲染瓦片
    this.#clearTiles();
    this.#renderTiles();
  }
  #clearTiles() {
    if (this.#ctx && this.#canvas) {
      // 画布原点已通过 translate 移到中心，瓦片绘制在以中心为原点的坐标系中，
      // 因此清除时也要从 (-w/2, -h/2) 开始覆盖整个画布，否则只会清掉右下角导致残留重复。
      this.#ctx.clearRect(
        -this.#canvas.width / 2,
        -this.#canvas.height / 2,
        this.#canvas.width,
        this.#canvas.height
      );
    }
  }
}
