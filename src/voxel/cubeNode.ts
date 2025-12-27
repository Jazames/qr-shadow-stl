export class CubeNode {
  isSolid: boolean
  hasSurfacesNormalToX: boolean = true
  hasSurfacesNormalToY: boolean = true
  hasSurfacesNormalToZ: boolean = true

  constructor(isSolid = true) {
    this.isSolid = isSolid
  }

  clearX(): void {
    this.isSolid = false
    this.hasSurfacesNormalToX = false
  }

  clearY(): void {
    this.isSolid = false
    this.hasSurfacesNormalToY = false
  }

  clearZ(): void {
    this.isSolid = false
    this.hasSurfacesNormalToZ = false
  }

  fillX(): void {
    this.isSolid = true
  }

  fillY(): void {
    this.isSolid = true
  }

  fillZ(): void {
    this.isSolid = true
  }
}
