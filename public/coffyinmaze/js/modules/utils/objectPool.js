// Object Pool Helper
export default class ObjectPool {
  constructor(createFn) {
    this.pool = [];
    this.createFn = createFn;
  }
  acquire() {
    return this.pool.length ? this.pool.pop() : this.createFn();
  }
  release(obj) {
    obj.visible = false;
    this.pool.push(obj);
  }
} 