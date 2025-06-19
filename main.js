// Configuration
const frameCount = 37;
const framePath = (i) => `door/Comp_${String(i).padStart(5, '0')}.png`;
const canvas = document.getElementById('doorCanvas');
const ctx = canvas.getContext('2d');
const video = document.getElementById('bgVideo');
let images = [];
let loaded = 0;
let currentFrame = 1;
let doorScale = 1;
let doorOpacity = 1;
let videoScale = 1;
let isFullscreen = false;

// Debug: Log when script starts
console.log('Script loaded, canvas:', canvas, 'video:', video);

// Responsive canvas
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  console.log('Canvas resized:', canvas.width, canvas.height);
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function setFullscreenVideoMode(fullscreen) {
  isFullscreen = fullscreen;
  if (fullscreen) {
    video.style.display = 'block';
    canvas.style.display = 'none';
  } else {
    video.style.display = 'none';
    canvas.style.display = 'block';
  }
}

function drawDoorWithVideoBackground() {
  if (!images[currentFrame - 1] || !images[currentFrame - 1].complete) return;
  
  // Clear canvas with black background
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  const img = images[currentFrame - 1];
  const doorW = img.width * doorScale;
  const doorH = img.height * doorScale;
  const x = (canvas.width - doorW) / 2;
  const y = (canvas.height - doorH) / 2;

  // Save the current state
  ctx.save();

  // Step 1: Create a clipping mask from the door's transparent areas
  // First, we need to identify transparent pixels and create a path
  
  // Create an off-screen canvas to analyze the door image
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');
  tempCanvas.width = doorW;
  tempCanvas.height = doorH;
  
  // Draw the door image to analyze its pixels
  tempCtx.drawImage(img, 0, 0, doorW, doorH);
  const imageData = tempCtx.getImageData(0, 0, doorW, doorH);
  const data = imageData.data;

  // Create clipping path for transparent areas (glass panels)
  ctx.beginPath();
  
  // Scan for transparent pixels and create rectangles for them
  const transparentRegions = [];
  const threshold = 50; // Alpha threshold for transparency
  
  for (let py = 0; py < doorH; py += 2) { // Skip every other pixel for performance
    for (let px = 0; px < doorW; px += 2) {
      const index = (py * doorW + px) * 4;
      const alpha = data[index + 3];
      
      if (alpha < threshold) {
        // This pixel is transparent, add it to our clipping region
        ctx.rect(x + px, y + py, 2, 2);
      }
    }
  }
  
  // Apply the clipping mask
  ctx.clip();

  // Step 2: Draw the video only in the clipped areas (glass panels)
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.scale(videoScale, videoScale);
  ctx.translate(-canvas.width / 2, -canvas.height / 2);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  ctx.restore();

  // Restore to remove clipping
  ctx.restore();

  // Step 3: Draw the door frame on top
  ctx.save();
  ctx.globalAlpha = doorOpacity;
  ctx.drawImage(img, x, y, doorW, doorH);
  ctx.restore();
}

function animationLoop() {
  if (!isFullscreen) {
    drawDoorWithVideoBackground();
  }
  requestAnimationFrame(animationLoop);
}

// Start animation loop after images are loaded
for (let i = 1; i <= frameCount; i++) {
  const img = new Image();
  img.src = framePath(i);
  img.onload = () => {
    loaded++;
    if (loaded === frameCount) {
      console.log('All images loaded, starting animation');
      animationLoop();
    }
  };
  img.onerror = (e) => {
    console.error('Failed to load image:', img.src, e);
  };
  images.push(img);
}

// Animate on scroll
function updateByScroll(progress) {
  // Door frame progression
  const frame = Math.round(progress * (frameCount - 1)) + 1;
  currentFrame = Math.max(1, Math.min(frameCount, frame));
  
  // Door scale: slight zoom as it opens
  doorScale = 1 + 0.05 * progress;
  
  // Door opacity: keep visible until very end
  doorOpacity = progress < 0.95 ? 1 : Math.max(0, 1 - (progress - 0.95) * 20);
  
  // Video scale: subtle zoom effect
  videoScale = 1 + 0.1 * progress;
  
  console.log('Scroll progress:', progress, 'Frame:', currentFrame, 'Scale:', doorScale);
}

// GSAP ScrollTrigger
video.addEventListener('loadeddata', () => {
  gsap.registerPlugin(ScrollTrigger);
  console.log('Video loaded, attempting to play');
  
  video.muted = true;
  video.play().then(() => {
    console.log('Video play started successfully');
  }).catch((e) => {
    console.error('Video play failed:', e);
  });

  // Main door animation scroll trigger
  ScrollTrigger.create({
    trigger: '.container',
    start: 'top top',
    end: 'bottom bottom',
    scrub: 1,
    onUpdate: (self) => {
      updateByScroll(self.progress);
      
      // Switch to fullscreen video only at the very end (98% scroll)
      if (self.progress >= 0.98) {
        setFullscreenVideoMode(true);
      } else {
        setFullscreenVideoMode(false);
      }
    },
    onLeave: () => {
      setFullscreenVideoMode(true);
    },
    onEnterBack: () => {
      setFullscreenVideoMode(false);
    }
  });

  // Fullscreen video animation
  ScrollTrigger.create({
    trigger: '.container',
    start: '95% top',
    end: 'bottom bottom',
    scrub: 1,
    onEnter: () => {
      gsap.to('#bgVideo', { 
        scale: 1.05, 
        duration: 1, 
        ease: 'power2.out' 
      });
    },
    onLeaveBack: () => {
      gsap.to('#bgVideo', { 
        scale: 1, 
        duration: 1, 
        ease: 'power2.out' 
      });
    }
  });
});

// Handle resize
window.addEventListener('resize', () => {
  resizeCanvas();
});