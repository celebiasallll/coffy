class CourierVehicle extends Vehicle {
    constructor(scene, physics, particleSystem) {
        super(scene, physics, particleSystem);
        
        // Standart Vehicle sınıfının iyi çalışan parametrelerini kopyalayarak başla
        this.maxSpeedKmh = 135;
        this.maxBullets = 30;
        this.packages = 5;
        this.packageSize = 0.5;
        this.packageCooldown = 0;
        
        // Standart araç boyutları
        this.chassisWidth = 2.2;
        this.chassisHeight = 0.6;
        this.chassisLength = 4.5;
        this.wheelRadius = 0.4;
        this.wheelWidth = 0.3;
        
        // Çalışan araçların performans değerlerini kullan
        this.maxEngineForce = 4200; // Daha hızlı ivmelenme
        this.maxBrakingForce = 140; // Daha iyi fren
        this.maxSteeringValue = 0.62; // Daha çevik dönüş
        
        // Kütle değerini standart araçlara daha yakın yap
        this.mass = 1500; // Standart araçlarla aynı
        
        // Standart vites oranları
        this.gearRatios = [3.0, 2.0, 1.5, 1.0, 0.7, 0.5];
        
        this.setupPackageListeners();
        this.setupDebugListener();
    }

    setupDebugListener() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'h' || e.key === 'H') {
                console.log("Courier Vehicle Debug:");
                console.log(`Position: x=${this.body?.position.x.toFixed(2)}, y=${this.body?.position.y.toFixed(2)}, z=${this.body?.position.z.toFixed(2)}`);
                console.log(`Velocity: x=${this.body?.velocity.x.toFixed(2)}, y=${this.body?.velocity.y.toFixed(2)}, z=${this.body?.velocity.z.toFixed(2)}`);
                console.log(`Engine Force: ${this.engineForce}, Speed: ${this.speedKmh} km/h`);
                console.log(`Controls: forward=${this.controls?.forward}, backward=${this.controls?.backward}`);
                console.log(`Vehicle object exists: ${this.vehicle !== undefined}`);
            }
            
            if (e.key === 'r' || e.key === 'R') {
                if (this.body) {
                    this.body.position.set(0, 5, 0);
                    this.body.velocity.set(0, 0, 0);
                    this.body.angularVelocity.set(0, 0, 0);
                    this.body.quaternion.set(0, 0, 0, 1);
                    console.log("Vehicle reset to starting position");
                }
            }
        });
    }
    
    setupPackageListeners() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'e' || e.key === 'E') {
                this.dropPackage();
            }
        });
    }
    
    dropPackage() {
        if (this.packageCooldown > 0 || this.packages <= 0) return;
        
        // Create package geometry and material
        const packageGeometry = new THREE.BoxGeometry(
            this.packageSize,
            this.packageSize,
            this.packageSize
        );
        const packageMaterial = new THREE.MeshPhongMaterial({
            color: 0xbb7733,
            shininess: 5
        });
        const packageMesh = new THREE.Mesh(packageGeometry, packageMaterial);
        
        // Position package behind the vehicle
        const packageOffset = new THREE.Vector3(-this.chassisLength/2 - 0.5, 0.5, 0);
        const packagePosition = new THREE.Vector3();
        packagePosition.copy(this.body.position);
        
        // Apply vehicle rotation to the package offset
        const quaternion = new THREE.Quaternion(
            this.body.quaternion.x,
            this.body.quaternion.y,
            this.body.quaternion.z,
            this.body.quaternion.w
        );
        packageOffset.applyQuaternion(quaternion);
        
        packagePosition.add(packageOffset);
        packageMesh.position.copy(packagePosition);
        packageMesh.quaternion.copy(quaternion);
        
        // Add package to scene
        this.scene.add(packageMesh);
        
        // Create physics for package
        let packageBody = null;
        if (this.physics && this.physics.world) {
            const packageShape = new CANNON.Box(new CANNON.Vec3(
                this.packageSize/2,
                this.packageSize/2,
                this.packageSize/2
            ));
            packageBody = new CANNON.Body({
                mass: 10,
                shape: packageShape,
                material: this.physics.materials ? this.physics.materials.vehicle : undefined
            });
            
            packageBody.position.copy(packagePosition);
            packageBody.quaternion.copy(quaternion);
            
            // Add slower velocity than the vehicle to make it drop behind
            packageBody.velocity.set(
                this.body.velocity.x * 0.2,
                this.body.velocity.y,
                this.body.velocity.z * 0.2
            );
            
            this.physics.addBody(packageBody);
            
            // Add this to tracked objects
            if (this.physics.objects) {
                this.physics.objects.push({ mesh: packageMesh, body: packageBody });
            }
        }
        
        // Reduce package count
        this.packages--;
        
        // Set cooldown
        this.packageCooldown = 1.0;
        
        // Notify user
        console.log("Dropped package! Remaining: " + this.packages);
    }
    
    createDetailedCarModel() {
        // Kahverengi Coffy Coin temalı kargo aracı
        const carGroup = super.createDetailedCarModel();
        carGroup.scale.set(1, 1, 1);
        // Ana gövdeyi kahverengi yap
        this.updateMaterialColors(carGroup, 0x6f4e37); // Coffee brown
        // Kargo aracı detayları ekle
        this.addCargoVanDetails(carGroup);
        // FARLAR - modern LED farlar
        const headlightMaterial = new THREE.MeshPhongMaterial({
            color: 0xffffff,
            emissive: 0xffffcc,
            emissiveIntensity: 0.25,
            shininess: 100
        });
        const headlightShape = new THREE.BoxGeometry(
            this.chassisLength * 0.05,
            this.chassisHeight * 0.15,
            this.chassisWidth * 0.15
        );
        // Sol LED far
        const leftHeadlight = new THREE.Mesh(headlightShape, headlightMaterial);
        leftHeadlight.position.set(
            this.chassisLength * 0.48,
            this.chassisHeight * 0.5,
            this.chassisWidth * 0.35
        );
        carGroup.add(leftHeadlight);
        // Sağ LED far
        const rightHeadlight = new THREE.Mesh(headlightShape, headlightMaterial);
        rightHeadlight.position.set(
            this.chassisLength * 0.48,
            this.chassisHeight * 0.5,
            -this.chassisWidth * 0.35
        );
        carGroup.add(rightHeadlight);
        // Coffy Coin temalı logo ve detaylar
        // Logo için sadece altın renkli bir daire ekle (font hatalarını önlemek için)
        const logoCircleMat = new THREE.MeshBasicMaterial({ color: 0xd2b48c, transparent: true, opacity: 0.95 });
        const logoCircleGeo = new THREE.CircleGeometry(0.45, 32);
        // Sol yan logo
        const leftLogo = new THREE.Mesh(logoCircleGeo, logoCircleMat);
        leftLogo.position.set(-this.chassisLength * 0.25, this.chassisHeight * 0.9, this.chassisWidth * 0.46);
        leftLogo.rotation.y = Math.PI / 2;
        carGroup.add(leftLogo);
        // Sağ yan logo
        const rightLogo = new THREE.Mesh(logoCircleGeo, logoCircleMat);
        rightLogo.position.set(-this.chassisLength * 0.25, this.chassisHeight * 0.9, -this.chassisWidth * 0.46);
        rightLogo.rotation.y = -Math.PI / 2;
        carGroup.add(rightLogo);
        // Altın detaylı kapı kolları ve jantlar
        carGroup.traverse(obj => {
            if (obj.name && obj.name.toLowerCase().includes('wheel')) {
                obj.material = new THREE.MeshPhongMaterial({ color: 0xd2b48c, shininess: 100 });
            }
            if (obj.name && obj.name.toLowerCase().includes('doorhandle')) {
                obj.material = new THREE.MeshPhongMaterial({ color: 0xd2b48c, shininess: 100 });
            }
        });
        return carGroup;
    }
    
    updateMaterialColors(object, color) {
        if (object.material && object.material.color) {
            if (!object.userData || 
                (!object.userData.isGlass && 
                 !object.userData.isLight)) {
                object.material.color.set(color);
            }
        }
        
        // Process children
        if (object.children) {
            object.children.forEach(child => {
                this.updateMaterialColors(child, color);
            });
        }
    }
    
    addCargoVanDetails(carGroup) {
        // Bagaj bölümünü genişlet - kargo alanı
        const cargoBoxGeometry = new THREE.BoxGeometry(
            this.chassisLength * 0.4, 
            this.chassisHeight * 1.3,
            this.chassisWidth * 0.9
        );
        const cargoBoxMaterial = new THREE.MeshPhongMaterial({
            color: 0x6f4e37, // Kahverengi
            shininess: 50
        });
        const cargoBox = new THREE.Mesh(cargoBoxGeometry, cargoBoxMaterial);
        cargoBox.position.set(
            -this.chassisLength * 0.25,
            this.chassisHeight * 0.65,
            0
        );
        carGroup.add(cargoBox);
        // Arka kapılar
        const doorGeometry = new THREE.BoxGeometry(
            0.1,
            this.chassisHeight * 1.2,
            this.chassisWidth * 0.42
        );
        const doorMaterial = new THREE.MeshPhongMaterial({
            color: 0x6f4e37, // Kahverengi
            shininess: 60
        });
        // Sol arka kapı
        const leftDoor = new THREE.Mesh(doorGeometry, doorMaterial);
        leftDoor.position.set(
            -this.chassisLength * 0.48,
            this.chassisHeight * 0.6,
            this.chassisWidth * 0.22
        );
        carGroup.add(leftDoor);
        // Sağ arka kapı
        const rightDoor = new THREE.Mesh(doorGeometry, doorMaterial);
        rightDoor.position.set(
            -this.chassisLength * 0.48,
            this.chassisHeight * 0.6,
            -this.chassisWidth * 0.22
        );
        carGroup.add(rightDoor);
        // Kapı kolları
        const doorHandleGeometry = new THREE.BoxGeometry(0.02, 0.08, 0.15);
        const doorHandleMaterial = new THREE.MeshPhongMaterial({
            color: 0x6f4e37, // Kahverengi
            shininess: 100
        });
        // Sol kapı kolu
        const leftDoorHandle = new THREE.Mesh(doorHandleGeometry, doorHandleMaterial);
        leftDoorHandle.position.set(
            -this.chassisLength * 0.48 - 0.06,
            this.chassisHeight * 0.7,
            this.chassisWidth * 0.05
        );
        carGroup.add(leftDoorHandle);
        // Sağ kapı kolu
        const rightDoorHandle = new THREE.Mesh(doorHandleGeometry, doorHandleMaterial);
        rightDoorHandle.position.set(
            -this.chassisLength * 0.48 - 0.06,
            this.chassisHeight * 0.7,
            -this.chassisWidth * 0.05
        );
        carGroup.add(rightDoorHandle);
        // Tavan taşıyıcı ve basamaklar da kahverengi
        const roofRackBaseGeometry = new THREE.BoxGeometry(
            this.chassisLength * 0.5,
            0.05,
            this.chassisWidth * 0.8
        );
        const roofRackMaterial = new THREE.MeshPhongMaterial({
            color: 0x6f4e37,
            shininess: 30
        });
        const roofRack = new THREE.Mesh(roofRackBaseGeometry, roofRackMaterial);
        roofRack.position.set(
            -this.chassisLength * 0.15,
            this.chassisHeight * 1.35,
            0
        );
        carGroup.add(roofRack);
        // Tavan taşıyıcı traversleri
        const crossbarGeometry = new THREE.BoxGeometry(
            0.1,
            0.05,
            this.chassisWidth * 0.9
        );
        const crossbarMaterial = new THREE.MeshPhongMaterial({
            color: 0x6f4e37,
            shininess: 30
        });
        const positions = [-0.2, 0, 0.2];
        positions.forEach(pos => {
            const crossbar = new THREE.Mesh(crossbarGeometry, crossbarMaterial);
            crossbar.position.set(
                pos * this.chassisLength,
                0.05,
                0
            );
            roofRack.add(crossbar);
        });
        // Ön tampon koruyucu
        const bumperGuardGeometry = new THREE.BoxGeometry(
            0.1,
            this.chassisHeight * 0.3,
            this.chassisWidth * 0.8
        );
        const bumperGuardMaterial = new THREE.MeshPhongMaterial({
            color: 0x6f4e37,
            shininess: 70
        });
        const bumperGuard = new THREE.Mesh(bumperGuardGeometry, bumperGuardMaterial);
        bumperGuard.position.set(
            this.chassisLength * 0.52,
            this.chassisHeight * 0.3,
            0
        );
        carGroup.add(bumperGuard);
        // Yan basamaklar
        const stepGeometry = new THREE.BoxGeometry(
            this.chassisLength * 0.3,
            0.1,
            this.chassisWidth * 0.2
        );
        const stepMaterial = new THREE.MeshPhongMaterial({
            color: 0x6f4e37,
            shininess: 20
        });
        // Sol basamak
        const leftStep = new THREE.Mesh(stepGeometry, stepMaterial);
        leftStep.position.set(
            this.chassisLength * 0.1,
            this.chassisHeight * 0.1,
            this.chassisWidth * 0.5
        );
        carGroup.add(leftStep);
        // Sağ basamak
        const rightStep = new THREE.Mesh(stepGeometry, stepMaterial);
        rightStep.position.set(
            this.chassisLength * 0.1,
            this.chassisHeight * 0.1,
            -this.chassisWidth * 0.5
        );
        carGroup.add(rightStep);
        // Jantlar ve diğer detaylar da kahverengi yapılacak
        carGroup.traverse(obj => {
            if (obj.material && obj.material.color) {
                obj.material.color.set(0x6f4e37);
            }
        });
    }
    
    // Update UI to show packages
    updateUI() {
        super.updateUI();
        
        // Update package count if element exists
        const packageDisplay = document.getElementById('package-count');
        if (packageDisplay) {
            packageDisplay.textContent = `Packages: ${this.packages}`;
        } else {
            // Create package count display if it doesn't exist
            const newPackageDisplay = document.createElement('div');
            newPackageDisplay.id = 'package-count';
            newPackageDisplay.style.position = 'absolute';
            newPackageDisplay.style.bottom = '140px';
            newPackageDisplay.style.right = '20px';
            newPackageDisplay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
            newPackageDisplay.style.color = 'white';
            newPackageDisplay.style.padding = '10px';
            newPackageDisplay.style.borderRadius = '5px';
            newPackageDisplay.style.fontSize = '14px';
            newPackageDisplay.textContent = `Packages: ${this.packages}`;
            document.body.appendChild(newPackageDisplay);
        }
    }

    fireBullet(direction) {
        if (this.bulletCooldown > 0) return;
        if (!this.body || !this.body.quaternion) return;
        const color = 0x8B4513; // Kahverengi
        const size = 0.26;
        const offsets = [0.25, -0.25];
        // Aracın bakış yönü için quaternion
        const quaternion = new THREE.Quaternion(
            this.body.quaternion.x,
            this.body.quaternion.y,
            this.body.quaternion.z,
            this.body.quaternion.w
        );
        offsets.forEach(offsetZ => {
            // Her mermi için yönü belirle
            let dir = direction ? direction.clone() : new THREE.Vector3(1, 0, 0);
            dir.applyQuaternion(quaternion);
            dir.normalize();
            const bulletMaterial = new THREE.MeshPhongMaterial({
                color,
                emissive: color,
                emissiveIntensity: 1.0,
                shininess: 80
            });
            const bulletGeometry = new THREE.SphereGeometry(size, 10, 10);
            // Mermi başlangıç pozisyonu: sağ/sol offset ile
            const bulletOffset = new THREE.Vector3(this.chassisLength/2 + 1.1, 0.45, offsetZ);
            const bulletPosition = new THREE.Vector3();
            bulletPosition.copy(this.body.position);
            bulletOffset.applyQuaternion(quaternion);
            bulletPosition.add(bulletOffset);
            // Mermi oluştur
            const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
            bullet.position.copy(bulletPosition);
            this.scene.add(bullet);
            // Physics
            let bulletBody = null;
            if (this.physics && this.physics.world) {
                const bulletShape = new CANNON.Sphere(size);
                bulletBody = new CANNON.Body({
                    mass: 1,
                    shape: bulletShape,
                    material: this.physics.materials ? this.physics.materials.vehicle : undefined
                });
                bulletBody.position.copy(bulletPosition);
                bulletBody.velocity.set(
                    dir.x * 90,
                    dir.y * 90,
                    dir.z * 90
                );
                bulletBody.sleepSpeedLimit = -1;
                bulletBody.collisionResponse = true;
                this.physics.addBody(bulletBody);
            }
            this.bullets.push({
                mesh: bullet,
                body: bulletBody,
                direction: dir.clone(),
                speed: 90,
                timeToLive: 2.5
            });
        });
        this.bulletCooldown = 0.12;
        if (this.bullets.length > this.maxBullets) {
            const oldest = this.bullets.shift();
            this.scene.remove(oldest.mesh);
            if (oldest.body && this.physics) {
                this.physics.removeBody(oldest.body);
            }
        }
    }
}
