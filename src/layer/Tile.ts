import { getTileUrl } from '../util/tile-transform'
// 瓦片类
export default class Tile {
    ctx: CanvasRenderingContext2D
    row: number
    col: number
    zoom: number
    x: number
    y: number
    shouldRender: Function
    url: string
    cacheKey: string
    img: any
    loaded: boolean

    constructor(opt:any = {}) {
      // 画布上下文
      this.ctx = opt.ctx
      // 瓦片行列号
      this.row = opt.row
      this.col = opt.col
      // 瓦片层级
      this.zoom = opt.zoom
      // 显示位置
      this.x = opt.x
      this.y = opt.y
      // 一个函数，判断某块瓦片是否应该渲染
      this.shouldRender = opt.shouldRender
      // 瓦片url
      this.url = ''
      // 缓存key
      this.cacheKey = this.row + '_' + this.col + '_' + this.zoom
      // 图片
      this.img = null
      // 图片是否加载完成
      this.loaded = false
  
      this.                                                   ()
      this.load()
    }
      
    // 生成url
    createUrl() {
      this.url = getTileUrl(this.row, this.col, this.zoom)
    }
  
    // 加载图片
    load() {
      this.img = new Image()
      this.img.src = this.url
      this.img.onload = () => {
        this.loaded = true
        this.render()
      }
    }
  
    // 将图片渲染到canvas上
    render() {
      if (!this.loaded || !this.shouldRender(this.cacheKey)) {
        return
      }
      this.ctx.drawImage(this.img, this.x, this.y)
    }
      
    // 更新位置
    updatePos(x:number, y:number) {
      this.x = x
      this.y = y
      return this
    }
  }
  