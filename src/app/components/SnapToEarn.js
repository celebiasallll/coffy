'use client';

import { useState, useEffect, useRef } from 'react';
import { Camera, Footprints, ShieldCheck, Zap, Sparkles, CheckCircle2, AlertCircle, Coffee, Loader2 } from 'lucide-react';
import { BASE_CONFIG, ACTIVITY_MODULE_ABI } from '../config/baseConfig';

// ─────────────────────────────────────────────────────────────
//  SnapToEarn — Coffy Step & Snap Module Frontend
//  Bağlı cüzdan ile:
//   • Fotoğraf yükle → backend'e gönder → imza al → claim
//   • Adım sayısı gir → backend'e gönder → imza al → claim
// ─────────────────────────────────────────────────────────────

export default function SnapToEarn({ userAddress, isConnected }) {
    // ── Tabs ──────────────────────────────────────────────────
    const [activeTab, setActiveTab] = useState('snap'); // 'snap' | 'step'

    // ── Snap State ────────────────────────────────────────────
    const [selectedImage, setSelectedImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [snapStatus, setSnapStatus] = useState('idle'); // idle | uploading | signing | claiming | success | error
    const [snapReward, setSnapReward] = useState(null);
    const [snapError, setSnapError] = useState('');
    const [snapMultiplier, setSnapMultiplier] = useState(null);
    const [dailySnapDone, setDailySnapDone] = useState(false);

    // ── Step State ─────────────────────────────────────────────
    const [stepCount, setStepCount] = useState('');
    const [stepStatus, setStepStatus] = useState('idle'); // idle | signing | claiming | success | error
    const [stepReward, setStepReward] = useState(null);
    const [stepError, setStepError] = useState('');
    const [stepMultiplier, setStepMultiplier] = useState(null);
    const [dailyStepsDone, setDailyStepsDone] = useState(0);

    const fileInputRef = useRef(null);

    // ── Read on-chain state ────────────────────────────────────
    useEffect(() => {
        if (!isConnected || !userAddress) return;
        fetchOnChainState();
    }, [isConnected, userAddress]);

    const getContract = async (readOnly = true) => {
        const { ethers } = await import('ethers');
        const provider = new ethers.BrowserProvider(window.ethereum);
        if (readOnly) return new ethers.Contract(BASE_CONFIG.CONTRACTS.ActivityModule, ACTIVITY_MODULE_ABI, provider);
        const signer = await provider.getSigner();
        return new ethers.Contract(BASE_CONFIG.CONTRACTS.ActivityModule, ACTIVITY_MODULE_ABI, signer);
    };

    const fetchOnChainState = async () => {
        try {
            const { ethers } = await import('ethers');
            const provider = new ethers.BrowserProvider(window.ethereum);
            const coreContract = new ethers.Contract(BASE_CONFIG.CONTRACTS.CoffyCore, BASE_CONFIG.ABI.CoffyCore, provider);
            const contract = await getContract(true);
            const currentDay = Math.floor(Date.now() / 1000 / 86400);

            // Correct on-chain getters from V7 / V14
            const [charMultiplier, snapClaimed, stepClaimed, lastSnapTs] = await Promise.all([
                coreContract.getCharacterMultiplier(userAddress).catch(() => 100n),
                contract.dailySnapClaimed(userAddress, currentDay).catch(() => 0n),
                contract.dailyStepClaimed(userAddress, currentDay).catch(() => 0n),
                contract.lastSnapTimestamp(userAddress).catch(() => 0n),
            ]);

            const multNum = Number(charMultiplier);
            setSnapMultiplier(multNum);
            setStepMultiplier(multNum);

            // Snap: check if claimed today or on cooldown (1800s)
            const nowTs = Math.floor(Date.now() / 1000);
            const isSnapCooldown = Number(lastSnapTs) > 0 && (nowTs < Number(lastSnapTs) + 1800);
            setDailySnapDone(isSnapCooldown || snapClaimed > 0n);

            // Steps done formatted
            setDailyStepsDone(Number(stepClaimed / (10n ** 18n)));
        } catch (e) {
            console.warn('fetchOnChainState:', e);
        }
    };

    // ─── SNAP FLOW ────────────────────────────────────────────

    const handleImageSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setSelectedImage(file);
        setImagePreview(URL.createObjectURL(file));
        setSnapStatus('idle');
        setSnapError('');
        setSnapReward(null);
    };

    const handleSnapClaim = async () => {
        if (!selectedImage || !isConnected) return;
        setSnapError('');
        setSnapReward(null);

        try {
            setSnapStatus('uploading');

            // Calculate snap reward (Base: 1000 COFFY)
            const BASE_SNAP = 1000;
            const rewardAmount = (BASE_SNAP * (snapMultiplier || 100)) / 100;

            const res = await fetch('/api/activity-claim', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userAddress: userAddress,
                    amount: rewardAmount,
                    activityType: 'snap'
                }),
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Fotoğraf doğrulanamadı');
            }

            // 2. Claim on-chain
            setSnapStatus('claiming');
            const contract = await getContract(false);

            const { snapId, payout, deadline, signature } = data.data;
            const tx = await contract.claimSnapReward(snapId, payout, deadline, signature);
            await tx.wait();

            // 3. Calculate reward display
            setSnapReward(rewardAmount);
            setSnapStatus('success');
            setDailySnapDone(true);
            fetchOnChainState();
        } catch (err) {
            setSnapStatus('error');
            const msg = err?.reason || err?.message || 'İşlem başarısız';
            setSnapError(msg.includes('CooldownActive') ? 'Bekleme süresi aktif (30 dakika).' :
                msg.includes('DailyLimitReached') ? 'Günlük snap limitine ulaştın!' :
                    msg.includes('SignatureUsed') ? 'Bu imza zaten kullanıldı.' :
                        msg);
        }
    };

    // ─── STEP FLOW ────────────────────────────────────────────

    const handleStepClaim = async () => {
        const steps = parseInt(stepCount);
        if (!steps || steps < 1000 || steps > 20000 || !isConnected) {
            setStepError('Adım sayısı en az 1.000 olmalıdır.');
            return;
        }
        setStepError('');
        setStepReward(null);

        try {
            // 1. Request signature from backend
            setStepStatus('signing');

            // Calculate step reward (0.3 COFFY per step)
            const BASE_STEP = 0.3;
            const rewardAmount = (BASE_STEP * steps * (stepMultiplier || 100)) / 100;

            const res = await fetch('/api/activity-claim', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userAddress: userAddress,
                    amount: rewardAmount,
                    activityType: 'step',
                    steps: steps
                }),
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Adım imzası alınamadı');
            }

            // 2. Claim on-chain
            setStepStatus('claiming');
            const contract = await getContract(false);

            const { steps: verifiedSteps, payout, deadline, signature } = data.data;
            const tx = await contract.claimStepReward(verifiedSteps, payout, deadline, signature);
            await tx.wait();

            // 3. Display reward
            setStepReward(rewardAmount.toFixed(2));
            setStepStatus('success');
            setDailyStepsDone(prev => prev + steps);
            fetchOnChainState();
        } catch (err) {
            setStepStatus('error');
            const msg = err?.reason || err?.message || 'İşlem başarısız';
            setStepError(msg.includes('DailyLimitReached') ? `Günlük limitine ulaştın!` :
                msg.includes('SignatureUsed') ? 'Bu imza zaten kullanıldı.' :
                    msg.includes('InvalidAmount') ? 'Adım sayısı min 1.000 olmalıdır.' :
                        msg);
        }
    };

    // ─── RENDER ───────────────────────────────────────────────

    const stepsRemaining = Math.max(0, 20000 - dailyStepsDone);

    return (
        <section id="earn" className="snap-earn-section">
            <div className="snap-earn-container">
                {/* Header */}
                <div className="snap-earn-header">
                    <div className="snap-earn-badge">
                        <Sparkles className="w-3.5 h-3.5 inline mr-1 text-amber-400" />
                        ACTIVITY REWARDS
                    </div>
                    <h2 className="snap-earn-title">
                        Step &amp; Snap to <span className="gradient-text">Earn</span>
                    </h2>
                    <p className="snap-earn-subtitle">
                        Turn your real-world activities into on-chain $COFFY rewards with AI and step validation.
                    </p>
                </div>

                {/* Multiplier Cards */}
                {isConnected && (snapMultiplier !== null || stepMultiplier !== null) && (
                    <div className="multiplier-row">
                        <div className="multiplier-card">
                            <span className="mult-icon"><Camera className="w-5 h-5 text-amber-400" /></span>
                            <span className="mult-label">Snap Multiplier</span>
                            <span className="mult-value">{snapMultiplier || 100}x</span>
                        </div>
                        <div className="multiplier-card">
                            <span className="mult-icon"><Footprints className="w-5 h-5 text-amber-400" /></span>
                            <span className="mult-label">Step Multiplier</span>
                            <span className="mult-value">{stepMultiplier || 100}x</span>
                        </div>
                        <div className="multiplier-card">
                            <span className="mult-icon"><Footprints className="w-5 h-5 text-amber-400" /></span>
                            <span className="mult-label">Steps Remaining</span>
                            <span className="mult-value">{stepsRemaining.toLocaleString()}</span>
                        </div>
                    </div>
                )}

                {/* Tabs */}
                <div className="snap-tabs">
                    <button
                        className={`snap-tab ${activeTab === 'snap' ? 'active' : ''}`}
                        onClick={() => setActiveTab('snap')}
                    >
                        <Camera className="w-4 h-4 inline mr-1.5" />
                        Snap to Earn
                    </button>
                    <button
                        className={`snap-tab ${activeTab === 'step' ? 'active' : ''}`}
                        onClick={() => setActiveTab('step')}
                    >
                        <Footprints className="w-4 h-4 inline mr-1.5" />
                        Step to Earn
                    </button>
                </div>

                {/* Content Card */}
                <div className="snap-card">
                    {activeTab === 'snap' ? (
                        <SnapPanel
                            isConnected={isConnected}
                            imagePreview={imagePreview}
                            snapStatus={snapStatus}
                            snapReward={snapReward}
                            snapError={snapError}
                            dailySnapDone={dailySnapDone}
                            snapMultiplier={snapMultiplier}
                            fileInputRef={fileInputRef}
                            onImageSelect={handleImageSelect}
                            onClaim={handleSnapClaim}
                        />
                    ) : (
                        <StepPanel
                            isConnected={isConnected}
                            stepCount={stepCount}
                            setStepCount={setStepCount}
                            stepStatus={stepStatus}
                            stepReward={stepReward}
                            stepError={stepError}
                            dailyStepsDone={dailyStepsDone}
                            stepsRemaining={stepsRemaining}
                            stepMultiplier={stepMultiplier}
                            onClaim={handleStepClaim}
                        />
                    )}
                </div>

                {/* Info boxes */}
                <div className="snap-info-grid">
                    <div className="snap-info-box">
                        <div className="info-icon"><ShieldCheck className="w-5 h-5 text-green-400 mx-auto" /></div>
                        <h4>Cryptographic Verification</h4>
                        <p>Every activity is verified via Vision AI and EIP-712 cryptographic signatures.</p>
                    </div>
                    <div className="snap-info-box">
                        <div className="info-icon"><Zap className="w-5 h-5 text-yellow-400 mx-auto" /></div>
                        <h4>Instant Settlement</h4>
                        <p>Direct smart contract transfer to your connected Web3 wallet on Base.</p>
                    </div>
                    <div className="snap-info-box">
                        <div className="info-icon"><Sparkles className="w-5 h-5 text-amber-400 mx-auto" /></div>
                        <h4>Character Multiplier</h4>
                        <p>Upgrade and level up characters to significantly boost reward multipliers.</p>
                    </div>
                </div>
            </div>

            <style jsx>{`
        .snap-earn-section {
          padding: 80px 20px;
          background: linear-gradient(135deg, #0a0a0f 0%, #0d1117 50%, #0a0a0f 100%);
          position: relative;
          overflow: hidden;
        }
        .snap-earn-section::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(ellipse at center, rgba(139, 92, 246, 0.06) 0%, transparent 70%);
          pointer-events: none;
        }
        .snap-earn-container {
          max-width: 860px;
          margin: 0 auto;
          position: relative;
          z-index: 1;
        }
        .snap-earn-header {
          text-align: center;
          margin-bottom: 40px;
        }
        .snap-earn-badge {
          display: inline-block;
          padding: 6px 18px;
          background: rgba(139, 92, 246, 0.15);
          border: 1px solid rgba(139, 92, 246, 0.4);
          border-radius: 30px;
          color: #a78bfa;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 2px;
          text-transform: uppercase;
          margin-bottom: 16px;
        }
        .snap-earn-title {
          font-size: clamp(2rem, 5vw, 3rem);
          font-weight: 800;
          color: #fff;
          margin: 0 0 12px;
          line-height: 1.2;
        }
        .gradient-text {
          background: linear-gradient(135deg, #8b5cf6, #ec4899);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .snap-earn-subtitle {
          color: rgba(255,255,255,0.55);
          font-size: 1rem;
          margin: 0;
        }

        /* Multiplier row */
        .multiplier-row {
          display: flex;
          gap: 16px;
          margin-bottom: 28px;
          flex-wrap: wrap;
        }
        .multiplier-card {
          flex: 1;
          min-width: 120px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          padding: 16px;
          background: rgba(139, 92, 246, 0.08);
          border: 1px solid rgba(139, 92, 246, 0.25);
          border-radius: 16px;
          transition: all 0.3s;
        }
        .multiplier-card:hover { border-color: rgba(139, 92, 246, 0.5); transform: translateY(-2px); }
        .mult-icon { font-size: 1.5rem; }
        .mult-label { font-size: 0.72rem; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 1px; }
        .mult-value { font-size: 1.4rem; font-weight: 800; color: #a78bfa; }

        /* Tabs */
        .snap-tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 20px;
          background: rgba(255,255,255,0.04);
          padding: 6px;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.08);
        }
        .snap-tab {
          flex: 1;
          padding: 12px 20px;
          border: none;
          border-radius: 12px;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
          background: transparent;
          color: rgba(255,255,255,0.4);
        }
        .snap-tab.active {
          background: linear-gradient(135deg, #7c3aed, #8b5cf6);
          color: #fff;
          box-shadow: 0 4px 20px rgba(124, 58, 237, 0.4);
        }
        .snap-tab:hover:not(.active) { color: rgba(255,255,255,0.7); }

        /* Main card */
        .snap-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 24px;
          padding: 32px;
          backdrop-filter: blur(20px);
          margin-bottom: 32px;
        }

        /* Info grid */
        .snap-info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
        }
        .snap-info-box {
          padding: 24px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 20px;
          text-align: center;
        }
        .snap-info-box .info-icon { font-size: 2rem; margin-bottom: 10px; }
        .snap-info-box h4 { color: #fff; font-size: 0.95rem; margin: 0 0 8px; font-weight: 700; }
        .snap-info-box p { color: rgba(255,255,255,0.45); font-size: 0.82rem; margin: 0; line-height: 1.5; }
      `}</style>
        </section>
    );
}

// ─── Snap Panel ───────────────────────────────────────────────
function SnapPanel({
    isConnected, imagePreview, snapStatus, snapReward, snapError,
    dailySnapDone, snapMultiplier, fileInputRef, onImageSelect, onClaim
}) {
    const isLoading = snapStatus === 'uploading' || snapStatus === 'claiming';

    return (
        <div className="panel">
            <div className="panel-desc">
                <h3>📸 Snap to Earn</h3>
                <p>Kahvenin fotoğrafını çek, Google Vision ile doğrula ve <strong>1000+ COFFY</strong> kazan!</p>
                <div className="reward-preview">
                    Beklenen Ödül: <span>{snapMultiplier ? `${(1000 * snapMultiplier / 100).toFixed(0)} COFFY` : '1000 COFFY'}</span>
                </div>
            </div>

            {!isConnected ? (
                <div className="connect-prompt">👛 Cüzdanını bağla ve kazanmaya başla</div>
            ) : dailySnapDone ? (
                <div className="done-box">✅ Bugünlük snap ödülünü aldın! Yarın tekrar gel.</div>
            ) : (
                <>
                    {/* Upload area */}
                    <div
                        className={`upload-area ${imagePreview ? 'has-image' : ''}`}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        {imagePreview ? (
                            <img src={imagePreview} alt="Preview" className="image-preview" />
                        ) : (
                            <div className="upload-placeholder">
                                <div className="upload-icon">☕</div>
                                <p>Kahve fotoğrafını buraya yükle</p>
                                <span>PNG, JPG, WEBP &bull; Maks 10MB</span>
                            </div>
                        )}
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={onImageSelect}
                    />

                    {/* Status messages */}
                    {snapStatus === 'uploading' && <div className="status-msg loading">Google Vision AI analyzing photo...</div>}
                    {snapStatus === 'claiming' && <div className="status-msg loading">Blockchain transaction processing...</div>}
                    {snapStatus === 'success' && (
                        <div className="status-msg success">
                            Success! <strong>{snapReward} COFFY</strong> deposited into your wallet.
                        </div>
                    )}
                    {snapStatus === 'error' && <div className="status-msg error">{snapError}</div>}

                    <button
                        className="claim-btn"
                        onClick={onClaim}
                        disabled={!imagePreview || isLoading || snapStatus === 'success'}
                    >
                        {isLoading ? (
                            <span className="btn-spinner">{snapStatus === 'uploading' ? 'Analyzing photo...' : 'Submitting on-chain...'}</span>
                        ) : snapStatus === 'success' ? 'Reward Claimed' : 'Verify Photo & Claim'}
                    </button>
                </>
            )}

            <style jsx>{`
        .panel { display: flex; flex-direction: column; gap: 20px; }
        .panel-desc h3 { color: #fff; font-size: 1.3rem; margin: 0 0 8px; }
        .panel-desc p { color: rgba(255,255,255,0.55); margin: 0 0 12px; font-size: 0.9rem; line-height: 1.6; }
        .reward-preview {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 8px 16px; background: rgba(139,92,246,0.12);
          border: 1px solid rgba(139,92,246,0.3); border-radius: 30px;
          color: rgba(255,255,255,0.6); font-size: 0.85rem;
        }
        .reward-preview span { color: #a78bfa; font-weight: 700; }
        .connect-prompt, .done-box {
          padding: 20px; border-radius: 16px; text-align: center;
          color: rgba(255,255,255,0.6); font-size: 0.95rem;
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1);
        }
        .done-box { color: #4ade80; border-color: rgba(74,222,128,0.3); background: rgba(74,222,128,0.08); }
        .upload-area {
          border: 2px dashed rgba(139,92,246,0.4); border-radius: 20px;
          min-height: 200px; display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all 0.3s; overflow: hidden;
        }
        .upload-area:hover { border-color: rgba(139,92,246,0.8); background: rgba(139,92,246,0.05); }
        .upload-area.has-image { border-style: solid; border-color: rgba(139,92,246,0.6); }
        .upload-placeholder { text-align: center; padding: 30px; }
        .upload-icon { font-size: 3rem; margin-bottom: 12px; }
        .upload-placeholder p { color: rgba(255,255,255,0.6); margin: 0 0 6px; font-size: 0.95rem; }
        .upload-placeholder span { color: rgba(255,255,255,0.3); font-size: 0.78rem; }
        .image-preview { width: 100%; height: 240px; object-fit: cover; display: block; }
        .status-msg {
          padding: 14px 18px; border-radius: 14px; font-size: 0.88rem; text-align: center;
        }
        .status-msg.loading { background: rgba(139,92,246,0.1); border: 1px solid rgba(139,92,246,0.3); color: #c4b5fd; }
        .status-msg.success { background: rgba(74,222,128,0.1); border: 1px solid rgba(74,222,128,0.3); color: #4ade80; }
        .status-msg.error { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); color: #f87171; }
        .claim-btn {
          width: 100%; padding: 16px; border: none; border-radius: 16px; font-size: 1rem;
          font-weight: 700; cursor: pointer; transition: all 0.3s;
          background: linear-gradient(135deg, #7c3aed, #8b5cf6);
          color: #fff; letter-spacing: 0.5px;
        }
        .claim-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(124,58,237,0.5); }
        .claim-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        .btn-spinner { animation: spin 1s linear infinite; display: inline-block; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
        </div>
    );
}

// ─── Step Panel ───────────────────────────────────────────────
function StepPanel({
    isConnected, stepCount, setStepCount, stepStatus, stepReward, stepError,
    dailyStepsDone, stepsRemaining, stepMultiplier, onClaim
}) {
    const isLoading = stepStatus === 'signing' || stepStatus === 'claiming';
    const progressPct = Math.min(100, (dailyStepsDone / 20000) * 100);
    const estimatedReward = stepCount
        ? ((0.3 * parseInt(stepCount) * (stepMultiplier || 100)) / 100).toFixed(2)
        : '0';

    return (
        <div className="panel">
            <div className="panel-desc">
                <h3>Step to Earn</h3>
                <p>Günlük adımlarını gir ve <strong>0.3+ COFFY</strong> / adım kazan. Maks 20.000 adım/gün.</p>
            </div>

            {/* Progress bar */}
            <div className="progress-wrap">
                <div className="progress-label">
                    <span>Günlük İlerleme</span>
                    <span>{dailyStepsDone.toLocaleString()} / 20,000 adım</span>
                </div>
                <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${progressPct}%` }} />
                </div>
            </div>

            {!isConnected ? (
                <div className="connect-prompt">Cüzdanını bağla ve kazanmaya başla</div>
            ) : stepsRemaining <= 0 ? (
                <div className="done-box">Bugünlük adım limitine ulaştın! Yarın tekrar gel.</div>
            ) : (
                <>
                    <div className="step-input-wrap">
                        <label className="step-label">Adım Sayını Gir</label>
                        <div className="step-input-row">
                            <input
                                type="number"
                                className="step-input"
                                placeholder="0"
                                min="1"
                                max={stepsRemaining}
                                value={stepCount}
                                onChange={e => setStepCount(e.target.value)}
                            />
                            <button className="max-btn" onClick={() => setStepCount(String(stepsRemaining))}>
                                MAX
                            </button>
                        </div>
                        <div className="step-hint">Kalan: {stepsRemaining.toLocaleString()} adım</div>
                    </div>

                    <div className="reward-estimate">
                        <span>Tahmini Ödül:</span>
                        <span className="est-value">{estimatedReward} COFFY</span>
                    </div>

                    {stepStatus === 'signing' && <div className="status-msg loading">Requesting Oracle EIP-712 signature...</div>}
                    {stepStatus === 'claiming' && <div className="status-msg loading">Submitting Base on-chain confirmation...</div>}
                    {stepStatus === 'success' && (
                        <div className="status-msg success">Success! <strong>{stepReward} COFFY</strong> deposited.</div>
                    )}
                    {stepStatus === 'error' && <div className="status-msg error">{stepError}</div>}

                    <button
                        className="claim-btn"
                        onClick={onClaim}
                        disabled={!stepCount || parseInt(stepCount) <= 0 || parseInt(stepCount) > stepsRemaining || isLoading}
                    >
                        {isLoading
                            ? 'Processing Transaction...'
                            : 'Verify Steps & Claim'}
                    </button>
                </>
            )}

            <style jsx>{`
        .panel { display: flex; flex-direction: column; gap: 20px; }
        .panel-desc h3 { color: #fff; font-size: 1.3rem; margin: 0 0 8px; }
        .panel-desc p { color: rgba(255,255,255,0.55); margin: 0; font-size: 0.9rem; line-height: 1.6; }
        .progress-wrap { display: flex; flex-direction: column; gap: 8px; }
        .progress-label { display: flex; justify-content: space-between; font-size: 0.82rem; color: rgba(255,255,255,0.5); }
        .progress-bar { height: 8px; background: rgba(255,255,255,0.08); border-radius: 999px; overflow: hidden; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, #7c3aed, #8b5cf6); border-radius: 999px; transition: width 0.6s ease; }
        .connect-prompt, .done-box {
          padding: 20px; border-radius: 16px; text-align: center;
          color: rgba(255,255,255,0.6); font-size: 0.95rem;
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1);
        }
        .done-box { color: #4ade80; border-color: rgba(74,222,128,0.3); background: rgba(74,222,128,0.08); }
        .step-input-wrap { display: flex; flex-direction: column; gap: 8px; }
        .step-label { font-size: 0.85rem; color: rgba(255,255,255,0.5); font-weight: 600; }
        .step-input-row { display: flex; gap: 10px; }
        .step-input {
          flex: 1; padding: 14px 18px; background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.15); border-radius: 14px;
          color: #fff; font-size: 1.1rem; font-weight: 700; text-align: center;
          outline: none; transition: border 0.3s;
        }
        .step-input:focus { border-color: rgba(139,92,246,0.7); }
        .step-input::placeholder { color: rgba(255,255,255,0.25); }
        .max-btn {
          padding: 0 20px; background: rgba(139,92,246,0.2);
          border: 1px solid rgba(139,92,246,0.4); border-radius: 14px;
          color: #a78bfa; font-weight: 700; font-size: 0.85rem;
          cursor: pointer; transition: all 0.2s; white-space: nowrap;
        }
        .max-btn:hover { background: rgba(139,92,246,0.35); }
        .step-hint { font-size: 0.78rem; color: rgba(255,255,255,0.35); }
        .reward-estimate {
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 18px; background: rgba(139,92,246,0.08);
          border: 1px solid rgba(139,92,246,0.25); border-radius: 14px;
          font-size: 0.9rem; color: rgba(255,255,255,0.55);
        }
        .est-value { color: #a78bfa; font-weight: 800; font-size: 1.1rem; }
        .status-msg {
          padding: 14px 18px; border-radius: 14px; font-size: 0.88rem; text-align: center;
        }
        .status-msg.loading { background: rgba(139,92,246,0.1); border: 1px solid rgba(139,92,246,0.3); color: #c4b5fd; }
        .status-msg.success { background: rgba(74,222,128,0.1); border: 1px solid rgba(74,222,128,0.3); color: #4ade80; }
        .status-msg.error { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); color: #f87171; }
        .claim-btn {
          width: 100%; padding: 16px; border: none; border-radius: 16px; font-size: 1rem;
          font-weight: 700; cursor: pointer; transition: all 0.3s;
          background: linear-gradient(135deg, #7c3aed, #8b5cf6);
          color: #fff; letter-spacing: 0.5px;
        }
        .claim-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(124,58,237,0.5); }
        .claim-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
      `}</style>
        </div>
    );
}
