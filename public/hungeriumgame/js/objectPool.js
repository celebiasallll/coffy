class ObjectPool {
    constructor(createFunc, resetFunc, initialSize = 10) {
        this.createFunc = createFunc;
        this.resetFunc = resetFunc;
        this.pool = [];
        for (let i = 0; i < initialSize; i++) {
            this.pool.push(this.createFunc());
        }
    }

    acquire() {
        return this.pool.length > 0 ? this.pool.pop() : this.createFunc();
    }

    release(obj) {
        this.resetFunc(obj);
        this.pool.push(obj);
    }
}

// Export for usage in other modules
if (typeof module !== 'undefined') {
    module.exports = ObjectPool;
}

if (typeof window !== 'undefined') {
    window.ObjectPool = ObjectPool;
} 