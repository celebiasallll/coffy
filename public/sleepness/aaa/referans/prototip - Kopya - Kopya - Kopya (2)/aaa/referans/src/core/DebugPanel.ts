import * as THREE from 'three';

export class DebugPanel {
    private container: HTMLDivElement;
    private drawCallsEl: HTMLDivElement;
    private physicsEl: HTMLDivElement;
    private memoryEl: HTMLDivElement;

    private frameCount = 0;
    private lastTime = performance.now();

    constructor() {
        this.container = document.createElement('div');
        this.container.style.position = 'fixed';
        this.container.style.top = '10px';
        this.container.style.right = '10px';
        this.container.style.backgroundColor = 'rgba(0,0,0,0.7)';
        this.container.style.color = '#0f0';
        this.container.style.padding = '10px';
        this.container.style.fontFamily = 'monospace';
        this.container.style.fontSize = '12px';
        this.container.style.zIndex = '1000';
        this.container.style.borderRadius = '5px';
        this.container.style.border = '1px solid #0f0';
        this.container.style.pointerEvents = 'none';

        this.drawCallsEl = this.createLine('Draw Calls: 0');
        this.physicsEl = this.createLine('Physics Bodies: 0');
        this.memoryEl = this.createLine('Memory: 0MB');

        document.body.appendChild(this.container);
    }

    private createLine(text: string): HTMLDivElement {
        const el = document.createElement('div');
        el.textContent = text;
        this.container.appendChild(el);
        return el;
    }

    update(renderer: THREE.WebGLRenderer, physicsWorld: any) {
        this.frameCount++;
        const time = performance.now();
        if (time >= this.lastTime + 1000) {
            this.frameCount = 0;
            this.lastTime = time;

            // ONLY UPDATE DOM ONCE PER SECOND
            this.drawCallsEl.textContent = `Draw Calls: ${renderer.info.render.calls} (Tri: ${renderer.info.render.triangles})`;
            
            if (physicsWorld && physicsWorld.bodies) {
                this.physicsEl.textContent = `Bodies: ${physicsWorld.bodies.len()} | Colliders: ${physicsWorld.colliders.len()}`;
            }

            if ((performance as any).memory) {
                const memory = Math.round((performance as any).memory.usedJSHeapSize / 1048576);
                this.memoryEl.textContent = `Memory: ${memory} MB`;
            }
            
            // Reset info for next bucket
            renderer.info.reset();
        }
    }
}
