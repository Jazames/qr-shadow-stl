export class CubeNode {
  isSolid: boolean

  constructor(isSolid = true) {
    this.isSolid = isSolid
  }

  clearX(): void {
    this.isSolid = false
  }

  clearY(): void {
    this.isSolid = false
  }

  clearZ(): void {
    this.isSolid = false
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
