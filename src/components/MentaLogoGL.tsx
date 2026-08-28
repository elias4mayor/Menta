"use client";

import { useEffect, useRef } from "react";

/**
 * Real-time WebGL "Apple keynote" lighting treatment for the MENTA
 * logotype, adapted from a user-provided reference prototype (a standalone
 * "keynote studio" authoring tool with five presets, an export/scrubber
 * UI, and procedural audio — none of which belongs in production). Only
 * the "keynote" preset's actual technique was kept: the logo PNG's own
 * alpha channel is read as a heightmap to derive a screen-space normal,
 * which is then lit with a moving key light (specular + rim highlight +
 * soft contact shadow) — a real fake-3D effect from a flat 2D asset, not
 * an actual 3D model. No mouse-reactive parallax, no audio, no other
 * presets, no authoring chrome — this renders once per mount, over a
 * transparent background so it composites into IntroBoot's existing
 * `.logo-intro-mark` overlay (glow + slogan already handled by that CSS).
 *
 * Camera push and key-light sweep are time-compressed from the source
 * prototype's original 8.5s cinematic pacing down to ~1.1s so this fits
 * inside IntroBoot's existing hold window without lengthening the overall
 * boot duration (HOLD_MS in IntroBoot.tsx is unchanged).
 *
 * Only mounted after a synchronous WebGL support check in IntroBoot — if
 * that check fails, this component is never rendered and IntroBoot's
 * original CSS-only `<img>` reveal is used instead. That's the primary
 * fallback path. A second, narrower fallback covers the case WebGL is
 * *available* but this specific shader fails to compile/link on some
 * driver: `onFail` is called (after cleaning up any GL resources already
 * created) and IntroBoot swaps back to the same CSS-only reveal — never
 * a silently blank canvas.
 */
export function MentaLogoGL({ active, onFail }: { active: boolean; onFail?: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  // Read through a ref (not a direct effect dependency) so a new onFail
  // identity on re-render never re-runs the whole GL setup — only `active`
  // should do that. Synced in its own effect, not during render, per
  // react-hooks/refs.
  const onFailRef = useRef(onFail);
  useEffect(() => {
    onFailRef.current = onFail;
  });

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: false }) as WebGLRenderingContext | null;
    if (!gl) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const cssW = canvas.clientWidth;
    const cssH = canvas.clientHeight;
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    const VS = `
      attribute vec2 aPosition;
      varying vec2 vUV;
      void main() {
        vUV = (aPosition + 1.0) * 0.5;
        vUV.y = 1.0 - vUV.y;
        gl_Position = vec4(aPosition, 0.0, 1.0);
      }
    `;

    // Adapted from the reference prototype's fragment shader: same
    // alpha-as-heightmap normal derivation, specular/rim lighting, and
    // contact-shadow accumulation. Removed: the painted studio-white
    // background + vignette + film-grain dither (redundant with
    // IntroBoot's own CSS background/glow) — this shader now only
    // outputs the lit logo itself, with alpha, over transparent.
    const FS = `
      precision highp float;
      varying vec2 vUV;
      uniform vec2 uResolution;
      uniform float uProgress;
      uniform vec3 uCamera;
      uniform vec3 uLightPos;
      uniform sampler2D uTexture;
      uniform float uLogoAspect;

      float easeApple(float t) {
        float t2 = clamp(t, 0.0, 1.0);
        return 1.0 - pow(1.0 - t2, 4.0);
      }

      void main() {
        vec2 screenAspect = vec2(uResolution.x / uResolution.y, 1.0);
        vec2 p = (vUV - 0.5) * screenAspect;

        float zoom = uCamera.z;
        vec2 tilt = uCamera.xy;
        vec2 camP = p / zoom - tilt * 0.25;

        vec2 logoUV = camP / vec2(uLogoAspect, 1.0) + 0.5;

        if (logoUV.x < 0.0 || logoUV.x > 1.0 || logoUV.y < 0.0 || logoUV.y > 1.0) {
          gl_FragColor = vec4(0.0);
          return;
        }

        vec4 baseSample = texture2D(uTexture, logoUV);
        float alpha = baseSample.a;

        vec2 texel = 1.0 / vec2(1024.0, 1024.0 / uLogoAspect);
        float aL = texture2D(uTexture, logoUV + vec2(-texel.x, 0.0)).a;
        float aR = texture2D(uTexture, logoUV + vec2(texel.x, 0.0)).a;
        float aT = texture2D(uTexture, logoUV + vec2(0.0, -texel.y)).a;
        float aB = texture2D(uTexture, logoUV + vec2(0.0, texel.y)).a;

        vec2 grad = vec2(aR - aL, aB - aT);
        vec3 normal = normalize(vec3(-grad * 4.0, 1.0));

        vec3 lightDir = normalize(vec3(uLightPos.xy - logoUV, uLightPos.z));
        vec3 viewDir = normalize(vec3(0.0, 0.0, 1.0));
        vec3 halfDir = normalize(lightDir + viewDir);

        float NdotH = max(dot(normal, halfDir), 0.0);
        float specular = pow(NdotH, 32.0) * 0.5;
        float rimLight = pow(1.0 - max(dot(normal, viewDir), 0.0), 3.0) * 0.4;

        vec3 logoBaseColor = vec3(0.035, 0.035, 0.04);
        vec3 illuminatedLogo = logoBaseColor + vec3(specular * 0.8 + rimLight * 0.5);

        float emergenceProgress = clamp(uProgress / 0.45, 0.0, 1.0);
        float emergeEase = easeApple(emergenceProgress);

        float opticalHaze = (1.0 - emergeEase) * 0.85;
        vec3 compositeLogo = mix(illuminatedLogo, vec3(0.95), opticalHaze);

        gl_FragColor = vec4(compositeLogo, alpha * emergeEase);
      }
    `;

    // Compile-status is checked (not just link-status) so a shader that
    // fails on some driver/GPU combination the synchronous supportsWebGL()
    // check can't predict falls back to the proven CSS reveal via onFail,
    // instead of silently leaving a blank canvas for the animation's
    // lifetime.
    function compile(type: number, source: string, label: string): WebGLShader | null {
      const shader = gl!.createShader(type)!;
      gl!.shaderSource(shader, source);
      gl!.compileShader(shader);
      if (!gl!.getShaderParameter(shader, gl!.COMPILE_STATUS)) {
        if (process.env.NODE_ENV !== "production") {
          console.warn(`MentaLogoGL: ${label} shader failed to compile`, gl!.getShaderInfoLog(shader));
        }
        gl!.deleteShader(shader);
        return null;
      }
      return shader;
    }

    const vs = compile(gl.VERTEX_SHADER, VS, "vertex");
    const fs = compile(gl.FRAGMENT_SHADER, FS, "fragment");
    if (!vs || !fs) {
      if (vs) gl.deleteShader(vs);
      if (fs) gl.deleteShader(fs);
      onFailRef.current?.();
      return;
    }

    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("MentaLogoGL: program failed to link", gl.getProgramInfoLog(program));
      }
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      onFailRef.current?.();
      return;
    }
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    const aPosition = gl.getAttribLocation(program, "aPosition");
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

    const uResolution = gl.getUniformLocation(program, "uResolution");
    const uProgress = gl.getUniformLocation(program, "uProgress");
    const uCamera = gl.getUniformLocation(program, "uCamera");
    const uLightPos = gl.getUniformLocation(program, "uLightPos");
    const uLogoAspect = gl.getUniformLocation(program, "uLogoAspect");

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    let logoAspect = 863 / 194;
    let textureReady = false;
    const image = new Image();
    image.onload = () => {
      logoAspect = image.naturalWidth / image.naturalHeight;
      gl!.bindTexture(gl!.TEXTURE_2D, texture);
      gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA, gl!.RGBA, gl!.UNSIGNED_BYTE, image);
      textureReady = true;
    };
    image.src = "/logo.png";

    // Time-compressed "keynote" camera/light timeline — same shape as the
    // source prototype's evaluateScene(), scaled from ~7s of push+sweep
    // down to DURATION so it reads as a fast, punchy reveal rather than a
    // slow cinematic one, matching IntroBoot's existing short hold.
    const DURATION = 1.1;
    const start = performance.now();

    function frame(now: number) {
      const t = (now - start) / 1000;
      const normT = Math.min(Math.max(t / DURATION, 0), 1);

      const pushProgress = Math.min(Math.max((t - 0.05) / (DURATION - 0.05), 0), 1);
      const pushEase = 1.0 - Math.pow(1.0 - pushProgress, 3.8);
      const zoom = 0.86 + (1.06 - 0.86) * pushEase;
      const tiltX = (1.0 - pushEase) * 0.03;
      const tiltY = (1.0 - pushEase) * -0.02;

      const lightProgress = Math.min(Math.max(t / DURATION, 0), 1);
      const lightEase = 1.0 - Math.pow(1.0 - lightProgress, 2.5);
      const lightX = 0.15 + 0.7 * lightEase;
      const lightY = 0.25 + 0.15 * Math.sin(lightProgress * Math.PI);
      const lightZ = 1.2 - 0.3 * Math.sin(lightProgress * Math.PI);

      gl!.clearColor(0, 0, 0, 0);
      gl!.clear(gl!.COLOR_BUFFER_BIT);

      if (textureReady) {
        gl!.useProgram(program);
        gl!.uniform2f(uResolution, canvas!.width, canvas!.height);
        gl!.uniform1f(uProgress, normT);
        gl!.uniform3f(uCamera, tiltX, tiltY, zoom);
        gl!.uniform3f(uLightPos, lightX, lightY, lightZ);
        gl!.uniform1f(uLogoAspect, logoAspect);
        gl!.activeTexture(gl!.TEXTURE0);
        gl!.bindTexture(gl!.TEXTURE_2D, texture);
        gl!.drawArrays(gl!.TRIANGLES, 0, 6);
      }

      if (t < DURATION + 0.3) {
        rafRef.current = requestAnimationFrame(frame);
      }
    }

    rafRef.current = requestAnimationFrame(frame);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buffer);
      gl.deleteTexture(texture);
    };
  }, [active]);

  return <canvas ref={canvasRef} className="intro-gl-canvas" aria-hidden="true" />;
}

/** Synchronous WebGL support check — call once before deciding whether to
 * mount MentaLogoGL at all, so there's a real fallback path (IntroBoot's
 * original CSS-only logo reveal) rather than a component that silently
 * renders nothing. */
export function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl") || canvas.getContext("experimental-webgl"));
  } catch {
    return false;
  }
}
