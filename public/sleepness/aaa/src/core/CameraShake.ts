import * as THREE from 'three';

export class CameraShake {
    private offset = new THREE.Vector3();
    private rotation = new THREE.Euler();
    private intensity = 0;
    private decay = 0.92; // Sarsıntının sönümlenme hızı

    /**
     * @param amount Sarsıntı şiddeti (genellikle 0.1 - 0.5 arası)
     */
    public trigger(amount: number) {
        this.intensity += amount;
        this.intensity = Math.min(this.intensity, 1.5); // Max sarsıntı limiti
    }

    public update(dt: number) {
        if (this.intensity < 0.001) {
            this.offset.set(0, 0, 0);
            this.rotation.set(0, 0, 0);
            this.intensity = 0;
            return;
        }

        // Rastgele sarsıntı hesapla
        const shake = this.intensity;
        this.offset.set(
            (Math.random() - 0.5) * shake,
            (Math.random() - 0.5) * shake,
            (Math.random() - 0.5) * shake
        );

        this.rotation.set(
            (Math.random() - 0.5) * shake * 0.05,
            (Math.random() - 0.5) * shake * 0.05,
            (Math.random() - 0.5) * shake * 0.05
        );

        // Sönümlenme
        this.intensity *= Math.pow(this.decay, dt * 60);
    }

    /**
     * Kameraya sarsıntı ofsetini uygular
     */
    public apply(camera: THREE.Camera) {
        camera.position.add(this.offset);
        camera.rotation.x += this.rotation.x;
        camera.rotation.y += this.rotation.y;
        camera.rotation.z += this.rotation.z;
    }
}

export const cameraShake = new CameraShake();
