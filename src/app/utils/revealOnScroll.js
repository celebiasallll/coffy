export const setupScrollReveal = () => {
  if (typeof window === 'undefined') return;
  
  const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.1
  };
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);
  
  // Tüm reveal-on-scroll sınıfına sahip elementleri izle
  document.querySelectorAll('.reveal-on-scroll').forEach(element => {
    observer.observe(element);
  });
  
  return observer;
};

export default setupScrollReveal;
