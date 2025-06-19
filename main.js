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
  // Debug: Log canvas size
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

function drawMaskedDoor() {
  if (!images[currentFrame - 1] || !images[currentFrame - 1].complete) return;
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const img = images[currentFrame - 1];
  const doorW = img.width * doorScale;
  const doorH = img.height * doorScale;
  const x = (canvas.width - doorW) / 2;
  const y = (canvas.height - doorH) / 2;

  // Step 1: Fill background with black
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Step 2: Draw the door image first (this will be our mask)
  ctx.save();
  ctx.drawImage(img, x, y, doorW, doorH);
  
  // Step 3: Use source-atop to only draw video where door pixels exist
  // But we want the OPPOSITE - video only where door is transparent
  // So we'll use destination-out to cut out the door shape, leaving only the opening
  ctx.globalCompositeOperation = 'destination-out';
  ctx.drawImage(img, x, y, doorW, doorH);
  
  // Step 4: Now draw the video, but only in the areas that are left (the door opening)
  ctx.globalCompositeOperation = 'destination-over';
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.scale(videoScale, videoScale);
  ctx.translate(-canvas.width / 2, -canvas.height / 2);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  ctx.restore();
  
  // Step 5: Reset and draw the door frame on top
  ctx.globalCompositeOperation = 'source-over';
  ctx.restore();

  // Draw the door frame with opacity
  ctx.save();
  ctx.globalAlpha = doorOpacity;
  ctx.drawImage(img, x, y, doorW, doorH);
  ctx.restore();
}

function animationLoop() {
  if (!isFullscreen) {
    drawMaskedDoor();
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
  // Door frame
  const frame = Math.round(progress * (frameCount - 1)) + 1;
  // Door scale: from 1 (start) to 1.2 (end)
  doorScale = 1 + 0.2 * progress;
  // Door opacity: keep door frame visible, fade out near end
  doorOpacity = progress < 0.9 ? 1 : 1 - (progress - 0.9) * 10;
  // Video scale: slight zoom as door opens
  videoScale = 1 + 0.3 * progress;
  
  if (doorOpacity < 0) doorOpacity = 0;
  if (videoScale > 1.5) videoScale = 1.5;
  
  currentFrame = frame;
}

// GSAP ScrollTrigger
video.addEventListener('loadeddata', () => {
  gsap.registerPlugin(ScrollTrigger);
  // Debug: Log video loaded
  console.log('Video loaded, attempting to play');
  video.muted = true;
  video.play().then(() => {
    console.log('Video play started');
  }).catch((e) => {
    console.error('Video play failed', e);
  });

  // Door animation
  ScrollTrigger.create({
    trigger: '.container',
    start: 'top top',
    end: 'bottom bottom',
    scrub: 1,
    onUpdate: (self) => {
      updateByScroll(self.progress);
      // Only show fullscreen video at the very end
      if (self.progress > 0.98) {
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

  // Animate video in fullscreen when door is completely open
  ScrollTrigger.create({
    trigger: '.container',
    start: '95% top',
    end: 'bottom bottom',
    scrub: 1,
    onEnter: () => {
      gsap.to('#bgVideo', { scale: 1.05, duration: 1, ease: 'power2.out' });
    },
    onLeaveBack: () => {
      gsap.to('#bgVideo', { scale: 1, duration: 1, ease: 'power2.out' });
    }
  });
});

// Redraw on resize
window.addEventListener('resize', () => {
  resizeCanvas();
});