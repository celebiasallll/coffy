// Simple script to check if the browser supports ES modules
(function() {
  try {
    new Function('import("")');
    console.log("ES modules supported");
  } catch (e) {
    console.error("ES modules not supported in this browser");
    document.body.innerHTML = '<div style="text-align: center; padding: 50px; font-family: sans-serif;">' +
      '<h1>Browser Not Supported</h1>' +
      '<p>This game requires a modern browser with ES module support.</p>' +
      '<p>Please use a recent version of Chrome, Firefox, Safari, or Edge.</p>' +
      '</div>';
  }
})();
