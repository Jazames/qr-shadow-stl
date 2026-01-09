export class CubeNode {
  isSolid: boolean
  hasSurfacesNormalToX: boolean = true
  hasSurfacesNormalToY: boolean = true
  hasSurfacesNormalToZ: boolean = true
  hasLattices: boolean = true

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

  clearAllSurfacesWhileLeavingLattices(): void {
    this.isSolid = false
    this.hasSurfacesNormalToX = false
    this.hasSurfacesNormalToY = false
    this.hasSurfacesNormalToZ = false
  }

  clearLattices(): void {
    this.hasLattices = false
  }
}
