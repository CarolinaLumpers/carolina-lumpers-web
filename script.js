function adjustNavbarFontSize() {
  const navLinks = document.querySelector('.nav-links');
  const links = navLinks.querySelectorAll('a');
  const maxWidth = navLinks.offsetWidth; // Get the available width

  let totalWidth = 0;
  for (const link of links) {
    totalWidth += link.offsetWidth;
  }

  if (totalWidth > maxWidth) {
    const scaleFactor = maxWidth / totalWidth;
    navLinks.style.fontSize = scaleFactor * 0.9 + 'em'; // Adjust base font size
  } else {
    navLinks.style.fontSize = '0.9em'; // Reset to default if no overflow
  }
}

window.addEventListener('load', adjustNavbarFontSize); // Adjust on page load
window.addEventListener('resize', adjustNavbarFontSize); // Adjust on window resize
