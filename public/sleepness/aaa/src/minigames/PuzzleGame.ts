import * as THREE from 'three';

export class PuzzleGame {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private raycaster: THREE.Raycaster = new THREE.Raycaster();
    private mouse: THREE.Vector2 = new THREE.Vector2();
    private blocks: THREE.Mesh[] = [];
    private sequence: number[] = [];
    private playerSequence: number[] = [];
    private isPlayingSequence: boolean = false;
    private isGameOver: boolean = false;
    private onWin: () => void;
    private onLose: () => void;
    private onExit: () => void;

    private HIGHLIGHT_COLOR = 0x00e5ff;
    private DEFAULT_COLOR = 0x333333;
    private SUCCESS_COLOR = 0x00ff00;
    private FAIL_COLOR = 0xff0000;

    constructor(renderer: THREE.WebGLRenderer, onWin: () => void, onLose: () => void, onExit: () => void) {
        this.renderer = renderer;
        this.onWin = onWin;
        this.onLose = onLose;
        this.onExit = onExit;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x050505);
        this.scene.fog = new THREE.FogExp2(0x000000, 0.15);

        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
        this.camera.position.set(0, 0, 8);
        this.camera.lookAt(0, 0, 0);

        this.initLights();
        this.initBlocks();
        this.addEventListeners();
        this.initUI();
    }

    private initUI() {
        const overlay = document.createElement('div');
        overlay.id = 'puzzle-ui';
        overlay.style.cssText = `
            position: fixed;
            top: 20%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: #00e5ff;
            font-family: 'Rajdhani', sans-serif;
            font-size: 24px;
            font-weight: bold;
            text-shadow: 0 0 10px #00e5ff;
            text-align: center;
            pointer-events: none;
            z-index: 10000;
        `;
        overlay.innerHTML = `
            REPLICATE THE SEQUENCE<br>
            <span style="font-size: 14px; opacity: 0.8; color: #fff;">[E] TO EXIT PORTAL</span>
        `;
        document.body.appendChild(overlay);
    }

    private initLights() {
        const ambient = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambient);

        const point = new THREE.PointLight(0x00e5ff, 10, 20);
        point.position.set(0, 5, 5);
        this.scene.add(point);
    }

    private initBlocks() {
        const geo = new THREE.BoxGeometry(1.5, 1.5, 0.2);
        for (let i = 0; i < 9; i++) {
            const mat = new THREE.MeshStandardMaterial({
                color: this.DEFAULT_COLOR,
                emissive: this.DEFAULT_COLOR,
                emissiveIntensity: 0.5,
                metalness: 0.8,
                roughness: 0.2
            });
            const mesh = new THREE.Mesh(geo, mat);
            const x = (i % 3 - 1) * 2;
            const y = (Math.floor(i / 3) - 1) * -2;
            mesh.position.set(x, y, 0);
            mesh.userData.id = i;
            this.scene.add(mesh);
            this.blocks.push(mesh);
        }
    }

    private addEventListeners() {
        window.addEventListener('click', this.handleClick.bind(this));
        window.addEventListener('mousemove', this.handleMouseMove.bind(this));
    }

    private handleMouseMove(e: MouseEvent) {
        this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    }

    private handleClick() {
        if (this.isPlayingSequence || this.isGameOver) return;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.blocks);

        if (intersects.length > 0) {
            const block = intersects[0].object as THREE.Mesh;
            const id = block.userData.id;
            this.playClickFeedback(block);
            this.playerSequence.push(id);
            this.checkSequence();
        }
    }

    private playClickFeedback(block: THREE.Mesh) {
        const mat = block.material as THREE.MeshStandardMaterial;
        mat.emissive.set(this.HIGHLIGHT_COLOR);
        mat.emissiveIntensity = 2;
        setTimeout(() => {
            if (!this.isGameOver) {
                mat.emissive.set(this.DEFAULT_COLOR);
                mat.emissiveIntensity = 0.5;
            }
        }, 300);
    }

    private checkSequence() {
        const idx = this.playerSequence.length - 1;
        if (this.playerSequence[idx] !== this.sequence[idx]) {
            this.handleFail();
            return;
        }

        if (this.playerSequence.length === this.sequence.length) {
            if (this.sequence.length >= 5) {
                this.handleWin();
            } else {
                setTimeout(() => this.nextRound(), 1000);
            }
        }
    }

    private handleWin() {
        this.isGameOver = true;
        this.blocks.forEach(b => {
             const m = b.material as THREE.MeshStandardMaterial;
             m.emissive.set(this.SUCCESS_COLOR);
             m.emissiveIntensity = 3;
        });
        setTimeout(() => this.onWin(), 2000);
    }

    private handleFail() {
        this.isGameOver = true;
        this.blocks.forEach(b => {
            const m = b.material as THREE.MeshStandardMaterial;
            m.emissive.set(this.FAIL_COLOR);
            m.emissiveIntensity = 3;
       });
       setTimeout(() => this.onLose(), 2000);
    }

    public start() {
        this.sequence = [];
        this.isGameOver = false;
        this.nextRound();
    }

    private nextRound() {
        this.playerSequence = [];
        this.sequence.push(Math.floor(Math.random() * 9));
        this.playSequence();
    }

    private async playSequence() {
        this.isPlayingSequence = true;
        for (const id of this.sequence) {
            await this.highlightBlock(id);
            await new Promise(r => setTimeout(r, 400));
        }
        this.isPlayingSequence = false;
    }

    private highlightBlock(id: number): Promise<void> {
        return new Promise(resolve => {
            const block = this.blocks[id];
            const mat = block.material as THREE.MeshStandardMaterial;
            mat.emissive.set(this.HIGHLIGHT_COLOR);
            mat.emissiveIntensity = 5;
            setTimeout(() => {
                mat.emissive.set(this.DEFAULT_COLOR);
                mat.emissiveIntensity = 0.5;
                resolve();
            }, 600);
        });
    }

    public update(dt: number) {
        // Animate blocks?
        this.blocks.forEach((b, i) => {
            b.rotation.y = Math.sin(Date.now() * 0.001 + i) * 0.1;
        });

        // Hover effect
        if (!this.isPlayingSequence && !this.isGameOver) {
            this.raycaster.setFromCamera(this.mouse, this.camera);
            const intersects = this.raycaster.intersectObjects(this.blocks);
            this.blocks.forEach(b => {
                if (intersects.length > 0 && intersects[0].object === b) {
                    (b.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.5;
                } else {
                    (b.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.5;
                }
            });
        }
    }

    public render() {
        this.renderer.render(this.scene, this.camera);
    }

    public dispose() {
        const overlay = document.getElementById('puzzle-ui');
        if (overlay) overlay.remove();
        
        window.removeEventListener('click', this.handleClick.bind(this));
        window.removeEventListener('mousemove', this.handleMouseMove.bind(this));
        this.blocks.forEach(b => {
            b.geometry.dispose();
            (b.material as THREE.Material).dispose();
        });
    }
}
