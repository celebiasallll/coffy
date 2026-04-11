export const IS_MOBILE =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
  navigator.maxTouchPoints > 0;

export const isMobileViewport = () =>
  window.innerWidth <= 1024 || navigator.maxTouchPoints > 0;
