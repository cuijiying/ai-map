import { TILE_SIZE } from "../config";
import {resolutions, lngLat2Mercator, mercatorTolnglat, getPixelCoord, getTileRowAndCol,getTileUrl } from "../util/tile-transform";
// import { EventEmitter } from "events";

// Map类 继承事件监听
export default class Map  {
  #container: HTMLElement;
  #zoom: number;
  #center: number[];
  #canvas: HTMLCanvasElement | null = null;
  #ctx: CanvasRenderingContext2D | null = null;
  #isMousedown: boolean = false;
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
    const [row, col] = getTileRowAndCol(
      this.#center[0],
      this.#center[1],
      this.#zoom
    );
    console.log(row, col);
    // 中心瓦片左上角对应的像素坐标
    let centerTilePos = [row * TILE_SIZE, col * TILE_SIZE];
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
      let rowMinNum = Math.ceil((this.#canvas.width / 2 - offset[0]) / TILE_SIZE); // 左
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
      for (let i = -rowMinNum; i <= rowMaxNum; i++) {
        for (let j = -colMinNum; j <= colMaxNum; j++) {
          // 加载瓦片图片
          let img = new Image();
          img.src = getTileUrl(
            row + i, // 行号
            col + j, // 列号
            this.#zoom
          );
          img.onload = () => {
            // 渲染到canvas
            this.#ctx!.drawImage(
              img,
              i * TILE_SIZE - offset[0],
              j * TILE_SIZE - offset[1]
            );
          };
        }
      }
    }

  }

  // 获取当前地图的bounds
  getBounds() {}

  // 鼠标按下
  onMousedown(e: MouseEvent) {
    console.log(e, 'mousedown');
    if (e.button === 0) {
      this.#isMousedown = true;
    }
    console.log(this.#isMousedown, 'isMousedown');
  }
  // 鼠标移动
  onMousemove(e: MouseEvent) {
    // debugger;
    if (!this.#isMousedown) {
      return;
    }
    console.log(e, 'mousemove');
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
    console.log(this.#isMousedown,'mouseup');
  }
  #clearTiles() {
    if (this.#ctx) {
      this.#ctx.clearRect(0, 0, this.#canvas!.width, this.#canvas!.height);
    }
  }
}