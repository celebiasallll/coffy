/**
 * Mobile Detection Utilities
 * Provides functions to detect mobile devices and their capabilities
 */

/**
 * Check if the current device is a mobile device
 * @returns {boolean} True if the device is mobile
 */
export const isMobile = () => {
    return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

/**
 * Get device touch and sensor capabilities
 * @returns {Object} Object containing capability flags
 */
export const getTouchCapabilities = () => {
    return {
        touch: 'ontouchstart' in window,
        pointerEvents: window.PointerEvent !== undefined,
        gyroscope: 'DeviceOrientationEvent' in window,
        vibration: 'vibrate' in navigator,
        hasCoarsePointer: window.matchMedia && window.matchMedia('(pointer: coarse)').matches,
        preferTouch: window.matchMedia && window.matchMedia('(hover: none)').matches,
        screenSize: {
            width: window.screen.width,
            height: window.screen.height,
            availWidth: window.screen.availWidth,
            availHeight: window.screen.availHeight,
            isLandscape: window.screen.width > window.screen.height
        },
        safeArea: {
            top: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-top') || '0'),
            right: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-right') || '0'),
            bottom: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-bottom') || '0'),
            left: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-left') || '0')
        },
        // Detect if device supports high precision touch
        highPrecisionTouch: window.matchMedia && window.matchMedia('(any-pointer: fine)').matches
    };
};

/**
 * Get device performance tier based on hardware detection and performance measurements
 * @returns {string} 'low', 'medium', 'high', or 'ultra-low'
 */
export const getDevicePerformanceTier = () => {
    const mobile = isMobile();
    const memory = navigator.deviceMemory || 4; // Default to 4GB if not available
    const cores = navigator.hardwareConcurrency || 4; // Default to 4 cores if not available
    const pixelRatio = window.devicePixelRatio || 1;
    
    // Check if device is potentially a low-end mobile device
    const isLowEndMobile = mobile && (memory <= 2 || cores <= 2 || pixelRatio <= 1);
    
    // Check for very low-end devices based on display characteristics and memory
    if (mobile && (memory <= 1 || cores <= 1) && window.screen.width < 768) {
        return 'ultra-low';
    } else if (isLowEndMobile) {
        return 'low';
    } else if (mobile && (memory <= 4 || cores <= 6)) {
        return 'medium';
    } else {
        return 'high';
    }
};

/**
 * Apply device-specific optimizations
 * @param {Object} renderer - THREE.js renderer
 * @param {Object} config - Game configuration object
 * @param {Object} THREE - THREE.js object
 * @returns {Object} Applied settings
 */
export const applyMobileOptimizations = (renderer, config, THREE) => {
    const mobile = isMobile();
    const performanceTier = getDevicePerformanceTier();
    
    const settings = {
        applied: [],
        performanceTier
    };
    
    if (mobile) {
        // Set CSS variables for responsive layouts
        document.documentElement.style.setProperty('--is-mobile', '1');
        document.documentElement.style.setProperty('--device-pixel-ratio', window.devicePixelRatio || 1);
        
        // Apply tier-specific optimizations
        switch(performanceTier) {
            case 'ultra-low':
                // Most aggressive optimizations for very low-end devices
                renderer.setPixelRatio(1);
                renderer.outputEncoding = THREE.LinearEncoding;
                renderer.shadowMap.enabled = false;
                renderer.setSize(window.innerWidth / 1.5, window.innerHeight / 1.5, false);
                config.world.fogNear = 5;
                config.world.fogFar = 30;
                settings.applied.push('Ultra-low quality (1x pixel ratio, reduced resolution, no shadows)');
                break;
                
            case 'low':
                // Significant optimizations for low-end devices
                renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.2));
                renderer.shadowMap.enabled = false;
                renderer.setSize(window.innerWidth / 1.2, window.innerHeight / 1.2, false);
                config.world.fogNear = 8;
                config.world.fogFar = 40;
                settings.applied.push('Low quality (1.2x pixel ratio, reduced resolution, no shadows)');
                break;
                
            case 'medium':
                // Moderate optimizations for mid-range devices
                renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
                renderer.shadowMap.enabled = true;
                renderer.shadowMap.type = THREE.PCFShadowMap; // Less expensive shadow mapping
                config.world.fogNear = 12;
                config.world.fogFar = 50;
                settings.applied.push('Medium quality (1.5x pixel ratio, basic shadows)');
                break;
                
            case 'high':
                // Minimal optimizations for high-end devices
                renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
                renderer.shadowMap.enabled = true;
                renderer.shadowMap.type = THREE.PCFSoftShadowMap;
                settings.applied.push('High quality (2x pixel ratio, soft shadows)');
                break;
        }
        
        // Add data-perf-tier attribute to body for CSS targeting
        document.body.setAttribute('data-perf-tier', performanceTier);
        
        // Set a JS-accessible variable for performance tier
        window.devicePerformanceTier = performanceTier;
        
        // Add event listeners for battery level if available
        if ('getBattery' in navigator) {
            navigator.getBattery().then(battery => {
                const updateOptimizationsBasedOnBattery = () => {
                    // If battery is low (below 20%), apply more aggressive optimizations
                    if (battery.level < 0.2 && !battery.charging) {
                        if (performanceTier === 'high') {
                            // Downgrade high to medium when battery is low
                            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
                            config.world.fogNear = 12;
                            config.world.fogFar = 50;
                            settings.applied.push('Battery saving mode (reduced quality)');
                        }
                    }
                };
                
                // Initial check
                updateOptimizationsBasedOnBattery();
                
                // Listen for changes
                battery.addEventListener('levelchange', updateOptimizationsBasedOnBattery);
                battery.addEventListener('chargingchange', updateOptimizationsBasedOnBattery);
            });
        }
    }
    
    return settings;
};

/**
 * Apply mobile UI optimizations
 * @returns {Object} Applied UI settings
 */
export const applyMobileUIOptimizations = () => {
    const mobile = isMobile();
    const performanceTier = getDevicePerformanceTier();
    
    const uiSettings = {
        applied: [],
        performanceTier
    };
    
    if (mobile) {
        // Add mobile classes to body
        document.body.classList.add('mobile-device');
        document.body.classList.add(`tier-${performanceTier}`);
        
        // Simplified UI for ultra-low devices
        if (performanceTier === 'ultra-low') {
            document.body.classList.add('simplified-ui');
            uiSettings.applied.push('Simplified UI elements');
        }
        
        // Reduce animations for low and ultra-low tiers
        if (performanceTier === 'low' || performanceTier === 'ultra-low') {
            document.body.classList.add('reduced-animations');
            uiSettings.applied.push('Reduced UI animations');
        }
    }
    
    return uiSettings;
}; 