import { POWERUP_META, WEATHER_CONFIGS } from './progression';
import { PARTICLE_POOL_SIZE } from './engine';
import { Bubble, GameSettings, GameSimulation } from './types';

interface CloudPuff {
  xRatio: number;
  yRatio: number;
  scale: number;
  speed: number;
  alpha: number;
}

interface StarDot {
  xRatio: number;
  yRatio: number;
  size: number;
  phase: number;
}

interface RainDrop {
  xRatio: number;
  yRatio: number;
  len: number;
  speed: number;
}

const CLOUDS: CloudPuff[] = Array.from({ length: 7 }, (_, i) => ({
  xRatio: (i * 0.19) % 1.25,
  yRatio: 0.14 + ((i * 0.17) % 0.52),
  scale: 0.8 + (i % 3) * 0.28,
  speed: 0.008 + (i % 3) * 0.004,
  alpha: 0.35 + (i % 3) * 0.16,
}));

const STARS: StarDot[] = Array.from({ length: 55 }, (_, i) => ({
  xRatio: ((i * 73) % 100) / 100,
  yRatio: ((i * 41) % 68) / 100,
  size: i % 5 === 0 ? 2.1 : 1.2,
  phase: i * 0.9,
}));

const RAINDROPS: RainDrop[] = Array.from({ length: 70 }, (_, i) => ({
  xRatio: ((i * 37) % 100) / 100,
  yRatio: ((i * 53) % 100) / 100,
  len: 14 + (i % 4) * 6,
  speed: 0.9 + (i % 3) * 0.25,
}));

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpRgb(
  c1: [number, number, number],
  c2: [number, number, number],
  t: number
): string {
  const r = Math.round(lerp(c1[0], c2[0], t));
  const g = Math.round(lerp(c1[1], c2[1], t));
  const b = Math.round(lerp(c1[2], c2[2], t));
  return `rgb(${r}, ${g}, ${b})`;
}

export function renderSimulation(
  ctx: CanvasRenderingContext2D,
  sim: GameSimulation,
  timeSec: number,
  settings: GameSettings
): void {
  const { width, height } = sim;
  const wState = sim.weather;
  const cfgA = WEATHER_CONFIGS[wState.current];
  const cfgB = WEATHER_CONFIGS[wState.next];
  const blend = wState.transitionProgress > 0 ? wState.transitionProgress : 0;

  ctx.save();

  // Screen shake from trauma^2
  if (settings.screenShake && !settings.reducedMotion && sim.trauma > 0) {
    const shakeMag = sim.trauma * sim.trauma * 12;
    const ox = Math.sin(timeSec * 57) * shakeMag;
    const oy = Math.cos(timeSec * 63) * shakeMag;
    ctx.translate(ox, oy);
  }

  // 1. Sky Gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
  skyGrad.addColorStop(0, lerpRgb(cfgA.skyTop, cfgB.skyTop, blend));
  skyGrad.addColorStop(0.55, lerpRgb(cfgA.skyMid, cfgB.skyMid, blend));
  skyGrad.addColorStop(1, lerpRgb(cfgA.skyHorizon, cfgB.skyHorizon, blend));
  ctx.fillStyle = skyGrad;
  ctx.fillRect(-16, -16, width + 32, height + 32);

  // 2. Stars (night / aurora / golden hour dusk)
  const starAlpha = lerp(cfgA.starAlpha, cfgB.starAlpha, blend);
  if (starAlpha > 0.02) {
    for (const s of STARS) {
      const twinkle = settings.reducedMotion
        ? 0.85
        : 0.5 + 0.5 * Math.sin(timeSec * 2.2 + s.phase);
      ctx.fillStyle = `rgba(240, 248, 255, ${(starAlpha * twinkle).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(s.xRatio * width, s.yRatio * height, s.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 3. Aurora Ribbons
  const auroraAlpha = lerp(cfgA.auroraAlpha, cfgB.auroraAlpha, blend);
  if (auroraAlpha > 0.02) {
    drawAurora(ctx, width, height, timeSec, auroraAlpha);
  }

  // 4. Sun / Moon Atmospheric Glow
  const sunAlpha = lerp(cfgA.sunAlpha, cfgB.sunAlpha, blend);
  if (sunAlpha > 0.03) {
    const sx = width * 0.78;
    const sy = height * 0.22;
    const sunRadius = Math.min(width, height) * 0.32;
    const sunGrad = ctx.createRadialGradient(sx, sy, 8, sx, sy, sunRadius);
    sunGrad.addColorStop(0, cfgA.sunColor);
    sunGrad.addColorStop(0.35, `rgba(255, 240, 210, ${(sunAlpha * 0.26).toFixed(3)})`);
    sunGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(sx, sy, sunRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  // 5. Parallax Clouds
  const cA = cfgA.cloudTint;
  const cB = cfgB.cloudTint;
  const cloudColor = `rgba(${Math.round(lerp(cA[0], cB[0], blend))}, ${Math.round(lerp(cA[1], cB[1], blend))}, ${Math.round(lerp(cA[2], cB[2], blend))}, ${lerp(cA[3], cB[3], blend).toFixed(3)})`;

  for (const c of CLOUDS) {
    const drift = settings.reducedMotion ? 0 : (timeSec * c.speed + wState.windX * 0.0004) % 1.35;
    const cx = ((c.xRatio + drift + 1.35) % 1.35 - 0.18) * width;
    const cy = c.yRatio * height;
    drawSoftCloud(ctx, cx, cy, 85 * c.scale, cloudColor, c.alpha);
  }

  // 6. Rain Streaks (if rain/storm)
  const rainDensity = lerp(cfgA.rainDensity, cfgB.rainDensity, blend);
  if (rainDensity > 0.05 && settings.weatherEffectsIntensity === 'full') {
    const count = Math.floor(RAINDROPS.length * rainDensity);
    ctx.strokeStyle = `rgba(205, 230, 255, ${(0.24 * rainDensity).toFixed(2)})`;
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    const windSlope = wState.windX * 0.3;
    for (let i = 0; i < count; i++) {
      const r = RAINDROPS[i];
      const rx = ((r.xRatio * width + timeSec * windSlope * 4) % width + width) % width;
      const ry = (r.yRatio * height + timeSec * r.speed * height * 0.85) % height;
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx + windSlope * 0.18, ry + r.len);
    }
    ctx.stroke();
  }

  // 7. Active Power-up Field Indicators
  if (sim.phase === 'playing') {
    if (sim.powerUps.magnet.activeRemaining > 0) {
      const mx = width * 0.5;
      const my = height * 0.48;
      ctx.strokeStyle = 'rgba(192, 132, 252, 0.35)';
      ctx.lineWidth = 2;
      const pulse = (timeSec * 1.4) % 1;
      ctx.beginPath();
      ctx.arc(mx, my, 40 + (1 - pulse) * 140, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (sim.powerUps.freeze.activeRemaining > 0) {
      ctx.fillStyle = 'rgba(125, 211, 252, 0.1)';
      ctx.fillRect(0, 0, width, height);
    }
    if (sim.powerUps.shield.activeRemaining > 0) {
      ctx.strokeStyle = 'rgba(96, 165, 250, 0.48)';
      ctx.lineWidth = 6;
      ctx.strokeRect(3, 3, width - 6, height - 6);
    }
  }

  // 8. Bubbles (Iridescent thin-film soap bubbles)
  for (const bubble of sim.bubbles) {
    if (!bubble.popped) {
      drawIridescentBubble(ctx, bubble, timeSec);
    }
  }

  // 9. Lightning Arcs (layered glow without slow shadowBlur)
  for (const arc of sim.lightningArcs) {
    const alpha = Math.max(0, arc.life / arc.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha * 0.4;
    ctx.strokeStyle = arc.color;
    ctx.lineWidth = 7;
    ctx.beginPath();
    arc.points.forEach((pt, idx) => {
      if (idx === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    });
    ctx.stroke();

    ctx.globalAlpha = alpha;
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 2.4;
    ctx.stroke();
    ctx.restore();
  }

  // 10. Pooled Particles
  for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
    const p = sim.particles[i];
    if (!p.active) continue;
    ctx.globalAlpha = p.alpha;
    if (p.kind === 'ring') {
      ctx.strokeStyle = `hsla(${p.hue}, 92%, 76%, ${p.alpha.toFixed(2)})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.stroke();
    } else if (p.kind === 'spark') {
      ctx.fillStyle = `hsl(${p.hue}, 95%, 82%)`;
      ctx.fillRect(p.x - p.radius * 0.7, p.y - p.radius * 0.7, p.radius * 1.4, p.radius * 1.4);
    } else {
      ctx.fillStyle = `hsla(${p.hue}, 88%, 74%, 0.9)`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;

  // 11. Floating Score / Combo Callouts
  for (const ft of sim.floatingTexts) {
    const alpha = Math.min(1, (ft.life / ft.maxLife) * 1.4);
    ctx.globalAlpha = alpha;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const fontSize = Math.round(20 * ft.scale);
    ctx.font = `700 ${fontSize}px Outfit, system-ui, sans-serif`;
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(8, 15, 32, 0.85)';
    ctx.strokeText(ft.text, ft.x, ft.y);
    ctx.fillStyle = ft.color;
    ctx.fillText(ft.text, ft.x, ft.y);

    if (ft.subtext) {
      ctx.font = `600 12px "Plus Jakarta Sans", system-ui, sans-serif`;
      ctx.lineWidth = 3;
      ctx.strokeText(ft.subtext, ft.x, ft.y + fontSize * 0.82);
      ctx.fillStyle = 'rgba(241, 245, 249, 0.95)';
      ctx.fillText(ft.subtext, ft.x, ft.y + fontSize * 0.82);
    }
  }
  ctx.globalAlpha = 1;

  // 12. Storm Lightning Flash Overlay
  if (wState.lightningFlash > 0 && settings.weatherEffectsIntensity === 'full') {
    ctx.fillStyle = `rgba(224, 242, 254, ${(wState.lightningFlash * 0.28).toFixed(3)})`;
    ctx.fillRect(0, 0, width, height);
  }

  ctx.restore();
}

function drawAurora(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  timeSec: number,
  alpha: number
): void {
  ctx.save();
  for (let band = 0; band < 2; band++) {
    const yBase = height * (0.18 + band * 0.11);
    const grad = ctx.createLinearGradient(0, yBase - 80, width, yBase + 80);
    if (band === 0) {
      grad.addColorStop(0, `rgba(52, 211, 153, 0)`);
      grad.addColorStop(0.3, `rgba(52, 211, 153, ${(alpha * 0.22).toFixed(3)})`);
      grad.addColorStop(0.7, `rgba(56, 189, 248, ${(alpha * 0.2).toFixed(3)})`);
      grad.addColorStop(1, `rgba(167, 139, 250, 0)`);
    } else {
      grad.addColorStop(0, `rgba(167, 139, 250, 0)`);
      grad.addColorStop(0.45, `rgba(167, 139, 250, ${(alpha * 0.2).toFixed(3)})`);
      grad.addColorStop(0.8, `rgba(52, 211, 153, ${(alpha * 0.16).toFixed(3)})`);
      grad.addColorStop(1, `rgba(52, 211, 153, 0)`);
    }
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, yBase);
    for (let x = 0; x <= width; x += width / 8) {
      const wave = Math.sin(x * 0.004 + timeSec * 0.45 + band * 2) * 32;
      ctx.lineTo(x, yBase + wave);
    }
    ctx.lineTo(width, yBase + 110);
    ctx.lineTo(0, yBase + 110);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawSoftCloud(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
  alpha: number
): void {
  const drawPuff = (px: number, py: number, pr: number) => {
    ctx.moveTo(px + pr, py);
    ctx.arc(px, py, pr, 0, Math.PI * 2);
  };

  ctx.save();
  ctx.globalAlpha = alpha * 0.55;
  ctx.fillStyle = color;
  ctx.beginPath();
  drawPuff(x, y + size * 0.1, size * 0.52);
  drawPuff(x + size * 0.44, y + size * 0.14, size * 0.4);
  drawPuff(x - size * 0.42, y + size * 0.15, size * 0.36);
  ctx.fill();

  ctx.globalAlpha = alpha * 0.88;
  ctx.beginPath();
  drawPuff(x + size * 0.1, y - size * 0.14, size * 0.44);
  drawPuff(x - size * 0.22, y - size * 0.04, size * 0.34);
  drawPuff(x + size * 0.4, y + size * 0.02, size * 0.3);
  ctx.fill();
  ctx.restore();
}

function drawIridescentBubble(
  ctx: CanvasRenderingContext2D,
  b: Bubble,
  timeSec: number
): void {
  const { x, y, radius, type, hitFlash } = b;
  const squash = 1 + Math.sin(timeSec * 3.4 + b.wobblePhase) * 0.025;
  const rx = radius * squash;
  const ry = radius / squash;

  ctx.save();
  ctx.translate(x, y);

  if (type === 'storm_hazard') {
    const core = ctx.createRadialGradient(0, 0, radius * 0.1, 0, 0, radius);
    core.addColorStop(0, 'rgba(30, 27, 46, 0.88)');
    core.addColorStop(0.7, 'rgba(69, 26, 48, 0.82)');
    core.addColorStop(1, 'rgba(249, 115, 22, 0.94)');
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();

    const pulse = 0.6 + 0.4 * Math.sin(timeSec * 8);
    ctx.strokeStyle = `rgba(251, 146, 60, ${pulse.toFixed(2)})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx + 3, ry + 3, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.moveTo(3, -radius * 0.44);
    ctx.lineTo(-radius * 0.28, 2);
    ctx.lineTo(1, 2);
    ctx.lineTo(-4, radius * 0.46);
    ctx.lineTo(radius * 0.28, -3);
    ctx.lineTo(-1, -3);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
    return;
  }

  // 1. Translucent Soap Film Interior
  const interior = ctx.createRadialGradient(
    -rx * 0.28,
    -ry * 0.28,
    radius * 0.08,
    0,
    0,
    radius
  );

  if (hitFlash > 0) {
    interior.addColorStop(0, 'rgba(255, 255, 255, 0.72)');
    interior.addColorStop(1, 'rgba(186, 230, 253, 0.48)');
  } else if (type === 'golden') {
    interior.addColorStop(0, 'rgba(254, 249, 195, 0.16)');
    interior.addColorStop(0.7, 'rgba(251, 191, 36, 0.14)');
    interior.addColorStop(1, 'rgba(245, 158, 11, 0.58)');
  } else if (type === 'armored') {
    interior.addColorStop(0, 'rgba(224, 231, 255, 0.14)');
    interior.addColorStop(0.75, 'rgba(99, 102, 241, 0.24)');
    interior.addColorStop(1, 'rgba(129, 140, 248, 0.68)');
  } else if (type === 'chain') {
    interior.addColorStop(0, 'rgba(243, 232, 255, 0.14)');
    interior.addColorStop(0.75, 'rgba(192, 132, 252, 0.2)');
    interior.addColorStop(1, 'rgba(168, 85, 247, 0.62)');
  } else if (type === 'frost') {
    interior.addColorStop(0, 'rgba(240, 249, 255, 0.2)');
    interior.addColorStop(0.75, 'rgba(125, 211, 252, 0.2)');
    interior.addColorStop(1, 'rgba(56, 189, 248, 0.6)');
  } else if (type === 'heart') {
    interior.addColorStop(0, 'rgba(255, 241, 242, 0.18)');
    interior.addColorStop(0.75, 'rgba(251, 113, 133, 0.2)');
    interior.addColorStop(1, 'rgba(244, 63, 94, 0.58)');
  } else {
    interior.addColorStop(0, 'rgba(255, 255, 255, 0.04)');
    interior.addColorStop(0.68, 'rgba(195, 232, 255, 0.07)');
    interior.addColorStop(0.9, 'rgba(165, 243, 252, 0.24)');
    interior.addColorStop(1, 'rgba(255, 255, 255, 0.42)');
  }

  ctx.fillStyle = interior;
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();

  // 2. Thin-film Iridescent Rim Arcs
  const swirl = timeSec * 0.7 + b.hueOffset * 0.05;
  const iridColors = [
    'rgba(56, 249, 215, 0.58)',
    'rgba(232, 121, 249, 0.55)',
    'rgba(250, 204, 21, 0.48)',
    'rgba(96, 165, 250, 0.58)',
  ];

  ctx.lineWidth = Math.max(1.8, radius * 0.09);
  for (let i = 0; i < 4; i++) {
    const startAngle = swirl + (i * Math.PI) / 2;
    ctx.strokeStyle = iridColors[i];
    ctx.beginPath();
    ctx.ellipse(0, 0, rx * 0.94, ry * 0.94, 0, startAngle, startAngle + Math.PI * 0.52);
    ctx.stroke();
  }

  // Outer contour
  ctx.strokeStyle =
    type === 'golden'
      ? 'rgba(253, 224, 71, 0.88)'
      : type === 'armored'
        ? 'rgba(165, 180, 252, 0.92)'
        : 'rgba(255, 255, 255, 0.65)';
  ctx.lineWidth = type === 'armored' ? 3 : 1.4;
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  ctx.stroke();

  // 3. Soap-Bubble Specular Highlights
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.lineWidth = Math.max(2, radius * 0.1);
  ctx.beginPath();
  ctx.ellipse(0, 0, rx * 0.76, ry * 0.76, 0, Math.PI * 1.12, Math.PI * 1.48);
  ctx.stroke();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
  ctx.beginPath();
  ctx.arc(-rx * 0.42, -ry * 0.48, Math.max(1.8, radius * 0.075), 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.38)';
  ctx.lineWidth = Math.max(1.5, radius * 0.06);
  ctx.beginPath();
  ctx.ellipse(0, 0, rx * 0.82, ry * 0.82, 0, Math.PI * 0.12, Math.PI * 0.38);
  ctx.stroke();

  // 4. Special Bubble Interior Emblem
  if (type === 'armored') {
    if (b.hp === 1) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.94)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-rx * 0.45, -ry * 0.25);
      ctx.lineTo(-rx * 0.08, 0);
      ctx.lineTo(-rx * 0.22, ry * 0.32);
      ctx.lineTo(rx * 0.3, ry * 0.48);
      ctx.stroke();
    } else {
      ctx.strokeStyle = 'rgba(224, 231, 255, 0.6)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.ellipse(0, 0, rx * 0.62, ry * 0.62, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (type === 'heart') {
    ctx.fillStyle = 'rgba(255, 228, 230, 0.96)';
    const hs = radius * 0.34;
    ctx.beginPath();
    ctx.moveTo(0, hs * 0.85);
    ctx.bezierCurveTo(-hs * 1.4, -hs * 0.1, -hs * 0.7, -hs * 1.1, 0, -hs * 0.35);
    ctx.bezierCurveTo(hs * 0.7, -hs * 1.1, hs * 1.4, -hs * 0.1, 0, hs * 0.85);
    ctx.fill();
  } else if (type === 'chain') {
    ctx.strokeStyle = 'rgba(243, 232, 255, 0.94)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-radius * 0.24, -radius * 0.22);
    ctx.lineTo(radius * 0.08, -radius * 0.04);
    ctx.lineTo(-radius * 0.08, radius * 0.08);
    ctx.lineTo(radius * 0.26, radius * 0.26);
    ctx.stroke();
  } else if (type === 'frost') {
    ctx.strokeStyle = 'rgba(240, 249, 255, 0.92)';
    ctx.lineWidth = 1.8;
    for (let k = 0; k < 3; k++) {
      const a = (k * Math.PI) / 3;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * radius * 0.36, Math.sin(a) * radius * 0.36);
      ctx.lineTo(-Math.cos(a) * radius * 0.36, -Math.sin(a) * radius * 0.36);
      ctx.stroke();
    }
  } else if (type === 'powerup' && b.powerUpReward) {
    const meta = POWERUP_META[b.powerUpReward];
    ctx.fillStyle = meta.accentColor;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.44, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#081020';
    ctx.font = `800 ${Math.max(10, Math.round(radius * 0.34))}px Outfit, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const glyph =
      b.powerUpReward === 'burst'
        ? 'B'
        : b.powerUpReward === 'freeze'
          ? 'F'
          : b.powerUpReward === 'magnet'
            ? 'M'
            : b.powerUpReward === 'score_boost'
              ? '2X'
              : b.powerUpReward === 'slow_mo'
                ? 'SL'
                : b.powerUpReward === 'lightning'
                  ? '⚡'
                  : b.powerUpReward === 'shield'
                    ? 'SH'
                    : 'XP';
    ctx.fillText(glyph, 0, 1);
  } else if (type === 'golden') {
    ctx.fillStyle = 'rgba(254, 240, 138, 0.92)';
    const s = radius * 0.28;
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.lineTo(s * 0.32, -s * 0.32);
    ctx.lineTo(s, 0);
    ctx.lineTo(s * 0.32, s * 0.32);
    ctx.lineTo(0, s);
    ctx.lineTo(-s * 0.32, s * 0.32);
    ctx.lineTo(-s, 0);
    ctx.lineTo(-s * 0.32, -s * 0.32);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}
