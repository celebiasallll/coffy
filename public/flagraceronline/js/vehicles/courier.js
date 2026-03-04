class CourierVehicle extends Vehicle {
    constructor(scene, physics, particleSystem) {
        super(scene, physics, particleSystem);
        
        // Standart Vehicle sınıfının iyi çalışan parametrelerini kopyalayarak başla
        this.maxSpeedKmh = 120;
        this.maxBullets = 30;
        this.packages = 5;
        this.packageSize = 0.5;
        this.packageCooldown = 0;
        
        // Standart araç boyutları
        this.chassisWidth = 1.8;
        this.chassisHeight = 0.6;
        this.chassisLength = 4.0;
        
        // Çalışan araçların performans değerlerini kullan
        this.maxEngineForce = 3000; // Standart değere düşür
        this.maxBrakingForce = 75;  // Reduced from 100 to prevent flipping
        this.steeringValue = 0.5;
        
        // Kütle değerini standart araçlara daha yakın yap
        this.mass = 1500; // Standart araçlarla aynı
        
        // Standart vites oranları
        this.gearRatios = [3.0, 2.0, 1.5, 1.0, 0.7, 0.5];
        
        this.setupPackageListeners();
        this.setupDebugListener();
    }
    
    getVehicleColor() {
        return 0xcc2222; // Red delivery van color
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
        // Get base car model
        const carGroup = super.createDetailedCarModel();
        
        // Change color to red
        this.updateMaterialColors(carGroup, 0xcc2222);
        
        // Add delivery van details
        this.addVanDetails(carGroup);
        
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
    
    addVanDetails(carGroup) {
        // Extended roof for van shape
        const roofExtGeometry = new THREE.BoxGeometry(
            this.chassisLength * 0.5,
            this.chassisHeight * 0.6,
            this.chassisWidth * 0.9
        );
        const roofExtMaterial = new THREE.MeshPhongMaterial({ color: 0xcc2222 });
        const roofExt = new THREE.Mesh(roofExtGeometry, roofExtMaterial);
        
        roofExt.position.set(
            -this.chassisLength * 0.15,
            this.chassisHeight + 0.8,
            0
        );
        carGroup.add(roofExt);
        
        // Add company logo on sides
        const logoGeometry = new THREE.PlaneGeometry(1.5, 0.8);
        const logoMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.9
        });
        
        // Left logo
        const leftLogo = new THREE.Mesh(logoGeometry, logoMaterial);
        leftLogo.rotation.y = Math.PI / 2;
        leftLogo.position.set(-0.5, this.chassisHeight + 0.5, this.chassisWidth / 2 + 0.01);
        carGroup.add(leftLogo);
        
        // Right logo
        const rightLogo = new THREE.Mesh(logoGeometry, logoMaterial);
        rightLogo.rotation.y = -Math.PI / 2;
        rightLogo.position.set(-0.5, this.chassisHeight + 0.5, -this.chassisWidth / 2 - 0.01);
        carGroup.add(rightLogo);
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
}
