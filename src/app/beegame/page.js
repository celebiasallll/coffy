export default function BeeGame() {
  return (
    <div style={{width: '100vw', height: '100vh', margin: 0, padding: 0, overflow: 'hidden'}}>
      <iframe
        src="/beegame/index.html"
        style={{width: '100vw', height: '100vh', border: 'none', margin: 0, padding: 0}}
        title="Bee Game - Open World Adventure"
        allowFullScreen
      />
    </div>
  );
} 