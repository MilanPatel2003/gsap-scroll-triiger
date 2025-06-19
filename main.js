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

function drawMaskedDoor() {
  if (!images[currentFrame - 1] || !images[currentFrame - 1].complete) return;
  
  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  const img = images[currentFrame - 1];
  const doorW = img.width * doorScale;
  const doorH = img.height * doorScale;
  const x = (canvas.width - doorW) / 2;
  const y = (canvas.height - doorH) / 2;

  // Step 1: Fill entire canvas with black background
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Step 2: Create a temporary canvas for the mask
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');
  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height;

  // Step 3: Draw the video on temp canvas
  tempCtx.save();
  tempCtx.translate(canvas.width / 2, canvas.height / 2);
  tempCtx.scale(videoScale, videoScale);
  tempCtx.translate(-canvas.width / 2, -canvas.height / 2);
  tempCtx.drawImage(video, 0, 0, canvas.width, canvas.height);
  tempCtx.restore();

  // Step 4: Use the door image as a mask - only keep video where door is transparent
  tempCtx.globalCompositeOperation = 'destination-in';
  tempCtx.drawImage(img, x, y, doorW, doorH);

  // Step 5: Draw the masked video onto main canvas
  ctx.drawImage(tempCanvas, 0, 0);

  // Step 6: Draw the door frame on top (this will show the solid parts of the door)
  ctx.save();
  ctx.globalAlpha = doorOpacity;
  ctx.globalCompositeOperation = 'source-over';
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
  doorScale = 1 + 0.1 * progress;
  
  // Door opacity: keep visible until very end
  doorOpacity = progress < 0.95 ? 1 : Math.max(0, 1 - (progress - 0.95) * 20);
  
  // Video scale: subtle zoom effect
  videoScale = 1 + 0.2 * progress;
  
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