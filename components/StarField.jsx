'use client';

import { useEffect, useRef } from 'react';

export default function StarField() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Handle screen resize
    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Static Twinkling Stars Pool
    const staticStars = [];
    const numStaticStars = 65;
    for (let i = 0; i < numStaticStars; i++) {
      staticStars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: 0.5 + Math.random() * 1.2,
        alpha: Math.random(),
        twinkleSpeed: 0.008 + Math.random() * 0.015,
      });
    }

    // Shooting Stars Queue
    let shootingStars = [];

    const createShootingStar = () => {
      // Spawn coordinates (random across upper screen)
      const x = Math.random() * width;
      const y = Math.random() * (height * 0.5);

      // Random downward flight angle: 40 deg to 140 deg
      const angle = (Math.PI / 180) * (40 + Math.random() * 100);
      const speed = 4 + Math.random() * 7;

      shootingStars.push({
        x,
        y,
        dx: Math.cos(angle) * speed,
        dy: Math.sin(angle) * speed,
        length: 90 + Math.random() * 110,
        lineWidth: 1 + Math.random() * 1.2,
        alpha: 0,
        fadeSpeed: 0.015 + Math.random() * 0.02,
        state: 'fading-in', // fading-in, active, fading-out
        color: `rgba(255, 255, 255, ${0.5 + Math.random() * 0.5})`,
      });
    };

    // Main Draw/Animation Loop
    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // 1. Draw static twinkling stars
      staticStars.forEach((star) => {
        star.alpha += star.twinkleSpeed;
        if (star.alpha > 1 || star.alpha < 0) {
          star.twinkleSpeed = -star.twinkleSpeed;
        }
        const currentAlpha = Math.max(0.1, Math.min(star.alpha, 0.9));
        ctx.fillStyle = `rgba(255, 255, 255, ${currentAlpha})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // 2. Dynamically spawn shooting stars
      if (Math.random() < 0.012 && shootingStars.length < 3) {
        createShootingStar();
      }

      // 3. Update & render active shooting stars
      shootingStars = shootingStars.filter((star) => {
        star.x += star.dx;
        star.y += star.dy;

        // Transition fade state
        if (star.state === 'fading-in') {
          star.alpha += 0.1;
          if (star.alpha >= 1) {
            star.alpha = 1;
            star.state = 'active';
          }
        } else if (star.state === 'active') {
          if (Math.random() < 0.15) {
            star.state = 'fading-out';
          }
        } else if (star.state === 'fading-out') {
          star.alpha -= star.fadeSpeed;
        }

        // Termination conditions
        if (star.alpha <= 0) return false;
        if (star.x < -150 || star.x > width + 150 || star.y > height + 150) return false;

        // Render gradient tail streak
        const gradient = ctx.createLinearGradient(
          star.x,
          star.y,
          star.x - star.dx * (star.length / 40),
          star.y - star.dy * (star.length / 40)
        );
        gradient.addColorStop(0, star.color.replace(/[\d.]+\)$/, `${star.alpha})`));
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.strokeStyle = gradient;
        ctx.lineWidth = star.lineWidth;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(star.x, star.y);
        ctx.lineTo(
          star.x - star.dx * (star.length / 40),
          star.y - star.dy * (star.length / 40)
        );
        ctx.stroke();

        return true;
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0 bg-transparent"
    />
  );
}
