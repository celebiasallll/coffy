/**
 * PerformanceHUD (v10.5) - Temporary Diagnostic Utility
 * Tracks CPU time spent in various subsystems to identify FPS bottlenecks.
 */
export class PerformanceHUD {
    private container: HTMLDivElement;
    private metrics: Map<string, number> = new Map();
    private lastUpdate: number = 0;

    constructor() {
        this.container = document.createElement('div');
        this.container.id = 'perf-hud';
        Object.assign(this.container.style, {
            position: 'fixed',
            top: '10px',
            right: '10px',
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            color: '#00ff00',
            fontFamily: 'monospace',
            fontSize: '12px',
            padding: '10px',
            borderRadius: '5px',
            zIndex: '10000',
            pointerEvents: 'none',
            border: '1px solid #333',
            minWidth: '200px',
            boxShadow: '0 0 10px rgba(0,0,0,0.5)'
        });
        document.body.appendChild(this.container);
    }

    updateMetric(name: string, ms: number) {
        // Smooth the value using a simple moving average or just store the latest
        const current = this.metrics.get(name) || 0;
        this.metrics.set(name, current * 0.9 + ms * 0.1); 
    }

    render() {
        const now = performance.now();
        if (now - this.lastUpdate < 1000) return; // Update UI/Console at 1Hz (less spam)
        this.lastUpdate = now;

        let html = '<b style="color:#fff">SYSTEM PROFILER (ms)</b><br><hr style="border:0;border-top:1px solid #444">';
        let total = 0;
        
        // Sort metrics by value (highest first)
        const sorted = Array.from(this.metrics.entries()).sort((a, b) => b[1] - a[1]);
        
        console.group('--- PERFORMANCE DIAGNOSTICS ---');
        for (const [name, val] of sorted) {
            const color = val > 5 ? '#ff4444' : (val > 2 ? '#ffaa00' : '#00ff00');
            html += `<div style="display:flex; justify-content:space-between">
                <span>${name}:</span>
                <span style="color:${color}">${val.toFixed(2)}ms</span>
            </div>`;
            total += val;
            console.log(`${name.padEnd(15)}: ${val.toFixed(2)}ms`);
        }
        console.log(`TOTAL CPU      : ${total.toFixed(2)}ms`);
        console.groupEnd();
        
        html += `<hr style="border:0;border-top:1px solid #444">
            <div style="display:flex; justify-content:space-between; font-weight:bold">
                <span>Total CPU:</span>
                <span>${total.toFixed(2)}ms</span>
            </div>`;
            
        this.container.innerHTML = html;
    }

    destroy() {
        this.container.remove();
    }
}

export const perfHUD = new PerformanceHUD();
