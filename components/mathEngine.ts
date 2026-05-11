// Math expression parser and canvas rendering engine

export interface Point { x: number; y: number; }
export interface MathObject {
  id: string; type: 'point' | 'line' | 'circle' | 'function' | 'polygon' | 'text' | 'cube_net';
  points: Point[]; color: string; label?: string;
  expression?: string; radius?: number; text?: string;
  animProgress?: number;
  lineType?: 'segment' | 'line' | 'ray';
}
export interface CanvasState {
  objects: MathObject[]; offsetX: number; offsetY: number;
  scale: number; gridSize: number;
}

export const defaultState = (): CanvasState => ({
  objects: [], offsetX: 0, offsetY: 0, scale: 40, gridSize: 1,
});

export function getNextPointLabel(s: CanvasState): string {
  const existingLabels = new Set(s.objects.filter(o => o.type === 'point' && o.label).map(o => o.label));
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let i = 0; i < 26; i++) {
    if (!existingLabels.has(alphabet[i])) return alphabet[i];
  }
  let j = 1;
  while (true) {
    for (let i = 0; i < 26; i++) {
      const label = `${alphabet[i]}${j}`;
      if (!existingLabels.has(label)) return label;
    }
    j++;
  }
}

export function parseExpression(expr: string, x: number): number {
  try {
    const sanitized = expr
      .replace(/sin/g, 'Math.sin').replace(/cos/g, 'Math.cos').replace(/tan/g, 'Math.tan')
      .replace(/sqrt/g, 'Math.sqrt').replace(/abs/g, 'Math.abs').replace(/log/g, 'Math.log')
      .replace(/ln/g, 'Math.log').replace(/pi/g, 'Math.PI').replace(/e(?![a-z])/g, 'Math.E')
      .replace(/\^/g, '**').replace(/(\d)(x)/g, '$1*x').replace(/\)(x)/g, ')*x')
      .replace(/x/g, `(${x})`);
    return Function(`"use strict"; return (${sanitized})`)();
  } catch { return NaN; }
}

export function screenToWorld(sx: number, sy: number, s: CanvasState, w: number, h: number): Point {
  return {
    x: (sx - w / 2 - s.offsetX) / s.scale,
    y: -(sy - h / 2 - s.offsetY) / s.scale,
  };
}

export function worldToScreen(wx: number, wy: number, s: CanvasState, w: number, h: number): Point {
  return {
    x: wx * s.scale + w / 2 + s.offsetX,
    y: -wy * s.scale + h / 2 + s.offsetY,
  };
}

export function drawGrid(ctx: CanvasRenderingContext2D, s: CanvasState, w: number, h: number, isDarkMode: boolean = true) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = isDarkMode ? '#0f172a' : '#f8fafc';
  ctx.fillRect(0, 0, w, h);

  const step = s.gridSize * s.scale;
  const ox = (w / 2 + s.offsetX) % step;
  const oy = (h / 2 + s.offsetY) % step;

  // Minor grid
  ctx.strokeStyle = isDarkMode ? '#1e293b' : '#e2e8f0';
  ctx.lineWidth = 0.5;
  for (let x = ox; x < w; x += step) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
  }
  for (let y = oy; y < h; y += step) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }

  // Axes
  const center = worldToScreen(0, 0, s, w, h);
  ctx.strokeStyle = isDarkMode ? '#475569' : '#94a3b8'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, center.y); ctx.lineTo(w, center.y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(center.x, 0); ctx.lineTo(center.x, h); ctx.stroke();

  // Labels
  ctx.fillStyle = isDarkMode ? '#64748b' : '#475569'; ctx.font = '10px Inter, sans-serif'; ctx.textAlign = 'center';
  const startX = Math.floor((-w / 2 - s.offsetX) / s.scale / s.gridSize) * s.gridSize;
  const endX = Math.ceil((w / 2 - s.offsetX) / s.scale / s.gridSize) * s.gridSize;
  for (let i = startX; i <= endX; i += s.gridSize) {
    if (i === 0) continue;
    const p = worldToScreen(i, 0, s, w, h);
    ctx.fillText(i.toString(), p.x, center.y + 14);
  }
  ctx.textAlign = 'right';
  const startY = Math.floor((-h / 2 + s.offsetY) / s.scale / s.gridSize) * s.gridSize;
  const endY = Math.ceil((h / 2 + s.offsetY) / s.scale / s.gridSize) * s.gridSize;
  for (let i = startY; i <= endY; i += s.gridSize) {
    if (i === 0) continue;
    const p = worldToScreen(0, i, s, w, h);
    ctx.fillText(i.toString(), center.x - 6, p.y + 4);
  }
  ctx.fillText('O', center.x - 6, center.y + 14);
}

export function drawObjects(ctx: CanvasRenderingContext2D, s: CanvasState, w: number, h: number) {
  for (const obj of s.objects) {
    ctx.strokeStyle = obj.color; ctx.fillStyle = obj.color; ctx.lineWidth = 2;
    const progress = obj.animProgress ?? 1;

    if (obj.type === 'point' && obj.points[0]) {
      const p = worldToScreen(obj.points[0].x, obj.points[0].y, s, w, h);
      ctx.beginPath(); ctx.arc(p.x, p.y, 5 * progress, 0, Math.PI * 2); ctx.fill();
      if (obj.label) { ctx.font = '12px Inter'; ctx.fillText(obj.label, p.x + 8, p.y - 8); }
    }

    if (obj.type === 'line' && obj.points.length >= 2) {
      const p1 = worldToScreen(obj.points[0].x, obj.points[0].y, s, w, h);
      const p2 = worldToScreen(obj.points[1].x, obj.points[1].y, s, w, h);
      const dx = (p2.x - p1.x); const dy = (p2.y - p1.y);
      ctx.beginPath();
      if (obj.lineType === 'segment') {
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p1.x + dx * progress, p1.y + dy * progress);
      } else if (obj.lineType === 'ray') {
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p1.x + dx * 100 * progress, p1.y + dy * 100 * progress);
      } else { // infinite line
        ctx.moveTo(p1.x - dx * 100, p1.y - dy * 100);
        ctx.lineTo(p1.x + dx * 100 * progress, p1.y + dy * 100 * progress);
      }
      ctx.stroke();
      if (obj.label && progress >= 1) {
        ctx.font = '12px Inter'; ctx.fillText(obj.label, p1.x + dx / 2 + 5, p1.y + dy / 2 - 5);
      }
    }

    if (obj.type === 'circle' && obj.points[0] && obj.radius) {
      const p = worldToScreen(obj.points[0].x, obj.points[0].y, s, w, h);
      ctx.beginPath();
      ctx.arc(p.x, p.y, obj.radius * s.scale, 0, Math.PI * 2 * progress);
      ctx.stroke();
    }

    if (obj.type === 'polygon' && obj.points.length >= 3) {
      const screenPts = obj.points.map(pt => worldToScreen(pt.x, pt.y, s, w, h));
      ctx.beginPath();
      ctx.moveTo(screenPts[0].x, screenPts[0].y);
      const count = Math.ceil(screenPts.length * progress);
      for (let i = 1; i < count; i++) ctx.lineTo(screenPts[i].x, screenPts[i].y);
      if (progress >= 1) ctx.closePath();
      ctx.globalAlpha = 0.15; ctx.fill(); ctx.globalAlpha = 1; ctx.stroke();
    }

    if (obj.type === 'function' && obj.expression) {
      ctx.beginPath();
      let started = false;
      const xStart = (-w / 2 - s.offsetX) / s.scale;
      const xEnd = (w / 2 - s.offsetX) / s.scale;
      const totalSteps = Math.floor(w / 1.5);
      const drawSteps = Math.floor(totalSteps * progress);
      for (let i = 0; i <= drawSteps; i++) {
        const wx = xStart + (i / totalSteps) * (xEnd - xStart);
        const wy = parseExpression(obj.expression, wx);
        if (isNaN(wy) || !isFinite(wy)) { started = false; continue; }
        const p = worldToScreen(wx, wy, s, w, h);
        if (!started) { ctx.moveTo(p.x, p.y); started = true; } else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
      if (obj.label && progress >= 1) {
        const midX = (xStart + xEnd) / 2;
        const midY = parseExpression(obj.expression, midX);
        if (isFinite(midY)) {
          const lp = worldToScreen(midX, midY, s, w, h);
          ctx.font = 'bold 13px Inter'; ctx.fillStyle = obj.color;
          ctx.fillText(`y = ${obj.expression}`, lp.x + 5, lp.y - 10);
        }
      }
    }

    if (obj.type === 'text' && obj.text && obj.points[0]) {
      const p = worldToScreen(obj.points[0].x, obj.points[0].y, s, w, h);
      ctx.font = '14px Inter'; ctx.globalAlpha = progress; ctx.fillText(obj.text, p.x, p.y); ctx.globalAlpha = 1;
    }

    if (obj.type === 'cube_net' && obj.points[0]) {
      // 3D Isometric rendering of a cube opening into a net
      const origin = obj.points[0];
      const size = obj.radius || 2; // side length
      const t = progress; // 0 = closed cube, 1 = fully open net

      // Project 3D (x,y,z) to 2D (isoX, isoY)
      const project3D = (x: number, y: number, z: number) => {
        const isoX = (x - y) * Math.cos(Math.PI / 6);
        const isoY = (x + y) * Math.sin(Math.PI / 6) - z;
        return worldToScreen(origin.x + isoX, origin.y - isoY, s, w, h);
      };

      // Draw a polygon given 3D points
      const drawFace = (points3D: [number, number, number][], fillStyle: string) => {
        if (points3D.length < 3) return;
        ctx.beginPath();
        const start = project3D(points3D[0][0], points3D[0][1], points3D[0][2]);
        ctx.moveTo(start.x, start.y);
        for (let i = 1; i < points3D.length; i++) {
          const pt = project3D(points3D[i][0], points3D[i][1], points3D[i][2]);
          ctx.lineTo(pt.x, pt.y);
        }
        ctx.closePath();
        ctx.fillStyle = fillStyle;
        ctx.fill();
        ctx.stroke();
      };

      const angle = t * (Math.PI / 2); // 0 to 90 degrees

      // Base Face (Bottom)
      const basePts: [number, number, number][] = [
        [-size / 2, -size / 2, 0], [size / 2, -size / 2, 0], [size / 2, size / 2, 0], [-size / 2, size / 2, 0]
      ];

      // Helpers to rotate a point around an axis
      const rotateX = (x: number, y: number, z: number, theta: number, py: number): [number, number, number] => {
        const ny = (y - py) * Math.cos(theta) - z * Math.sin(theta) + py;
        const nz = (y - py) * Math.sin(theta) + z * Math.cos(theta);
        return [x, ny, nz];
      };
      const rotateY = (x: number, y: number, z: number, theta: number, px: number): [number, number, number] => {
        const nx = (x - px) * Math.cos(theta) + z * Math.sin(theta) + px;
        const nz = -(x - px) * Math.sin(theta) + z * Math.cos(theta);
        return [nx, y, nz];
      };

      // Front Face (rotates around y = -size/2)
      const frontPts: [number, number, number][] = [
        [-size / 2, -size / 2, 0], [size / 2, -size / 2, 0], [size / 2, -size / 2, size], [-size / 2, -size / 2, size]
      ].map(p => rotateX(p[0], p[1], p[2], angle, -size / 2));

      // Back Face (rotates around y = size/2)
      const backPts: [number, number, number][] = [
        [-size / 2, size / 2, 0], [size / 2, size / 2, 0], [size / 2, size / 2, size], [-size / 2, size / 2, size]
      ].map(p => rotateX(p[0], p[1], p[2], -angle, size / 2));

      // Left Face (rotates around x = -size/2)
      const leftPts: [number, number, number][] = [
        [-size / 2, -size / 2, 0], [-size / 2, size / 2, 0], [-size / 2, size / 2, size], [-size / 2, -size / 2, size]
      ].map(p => rotateY(p[0], p[1], p[2], -angle, -size / 2));

      // Right Face (rotates around x = size/2)
      const rightPts: [number, number, number][] = [
        [size / 2, -size / 2, 0], [size / 2, size / 2, 0], [size / 2, size / 2, size], [size / 2, -size / 2, size]
      ].map(p => rotateY(p[0], p[1], p[2], angle, size / 2));

      // Top Face (attached to the Right face, rotates with it, and also unfolds relative to it)
      // First, position relative to right face
      const topPtsInit: [number, number, number][] = [
        [size / 2, -size / 2, size], [size / 2, size / 2, size], [-size / 2, size / 2, size], [-size / 2, -size / 2, size]
      ];
      // Rotate relative to right edge of Right Face
      const topPtsAttached = topPtsInit.map(p => {
        // Rotate top face open
        const rx = (p[0] - size / 2) * Math.cos(angle) + (p[2] - size) * Math.sin(angle) + size / 2;
        const rz = -(p[0] - size / 2) * Math.sin(angle) + (p[2] - size) * Math.cos(angle) + size;
        return [rx, p[1], rz] as [number, number, number];
      }).map(p => rotateY(p[0], p[1], p[2], angle, size / 2)); // Then rotate entire right face

      // Render faces (Order roughly by depth for isometric: Back, Left, Bottom, Front, Right, Top)
      ctx.globalAlpha = 0.85;
      ctx.lineWidth = 1;
      drawFace(basePts, '#3b82f6'); // Blue base
      drawFace(backPts, '#ef4444'); // Red back
      drawFace(leftPts, '#10b981'); // Green left
      drawFace(rightPts, '#f59e0b'); // Yellow right
      drawFace(frontPts, '#8b5cf6'); // Purple front
      drawFace(topPtsAttached, '#06b6d4'); // Cyan top
      ctx.globalAlpha = 1;

      if (obj.label && progress >= 1) {
        const lp = worldToScreen(origin.x, origin.y - size, s, w, h);
        ctx.fillStyle = obj.color; ctx.font = 'bold 12px Inter';
        ctx.fillText(obj.label, lp.x, lp.y);
      }
    }
  }
}

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];
let colorIdx = 0;
export function nextColor(): string { return COLORS[colorIdx++ % COLORS.length]; }
export function genId(): string { return Math.random().toString(36).slice(2, 9); }
