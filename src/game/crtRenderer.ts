export const CRT_WARP_X = 0.022;
export const CRT_WARP_Y = 0.028;

const VERTEX_SHADER = `
attribute vec2 aPosition;
attribute vec2 aUv;
varying vec2 vUv;

void main() {
  vUv = aUv;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `
precision highp float;

uniform sampler2D uSource;
uniform vec2 uSourceSize;
uniform vec2 uOutputSize;
uniform float uTime;
uniform float uWarpX;
uniform float uWarpY;

varying vec2 vUv;

float random(vec2 value) {
  return fract(sin(dot(value, vec2(127.1, 311.7))) * 43758.5453123);
}

vec2 curveUv(vec2 uv) {
  vec2 position = uv * 2.0 - 1.0;
  vec2 warped = vec2(
    position.x * (1.0 + position.y * position.y * uWarpX),
    position.y * (1.0 + position.x * position.x * uWarpY)
  );
  return warped * 0.5 + 0.5;
}

vec3 sampleConverged(vec2 uv) {
  vec2 fromCenter = uv - 0.5;
  float edge = smoothstep(0.12, 0.78, length(fromCenter));
  vec2 direction = normalize(fromCenter + vec2(0.0001));
  vec2 pixel = direction * edge * 0.65 / uOutputSize;

  float red = texture2D(uSource, uv + pixel).r;
  float green = texture2D(uSource, uv).g;
  float blue = texture2D(uSource, uv - pixel).b;
  return vec3(red, green, blue);
}

vec3 phosphorMask() {
  float triad = mod(gl_FragCoord.x, 3.0);
  vec3 grille = vec3(0.82);
  if (triad < 1.0) {
    grille.r = 1.16;
  } else if (triad < 2.0) {
    grille.g = 1.13;
  } else {
    grille.b = 1.16;
  }

  float slot = mix(0.88, 1.06, step(0.5, fract(gl_FragCoord.y * 0.25)));
  return mix(vec3(1.0), grille * slot, 0.30);
}

vec3 cheapBloom(vec2 uv) {
  vec2 texel = 1.0 / uSourceSize;
  vec3 sum = texture2D(uSource, uv).rgb * 0.30;
  sum += texture2D(uSource, uv + texel * vec2(1.5, 0.0)).rgb * 0.12;
  sum += texture2D(uSource, uv - texel * vec2(1.5, 0.0)).rgb * 0.12;
  sum += texture2D(uSource, uv + texel * vec2(0.0, 1.5)).rgb * 0.12;
  sum += texture2D(uSource, uv - texel * vec2(0.0, 1.5)).rgb * 0.12;
  sum += texture2D(uSource, uv + texel * vec2(1.25, 1.25)).rgb * 0.055;
  sum += texture2D(uSource, uv + texel * vec2(-1.25, 1.25)).rgb * 0.055;
  sum += texture2D(uSource, uv + texel * vec2(1.25, -1.25)).rgb * 0.055;
  sum += texture2D(uSource, uv + texel * vec2(-1.25, -1.25)).rgb * 0.055;
  return max(sum - vec3(0.58), vec3(0.0));
}

void main() {
  vec2 uv = curveUv(vUv);
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  vec3 color = sampleConverged(uv);
  vec3 bloom = cheapBloom(uv);

  float scanDrift = sin(uTime * 2.1) * 0.018 + sin(uTime * 0.47) * 0.026;
  float sourceLine = fract(uv.y * uSourceSize.y * 0.5 + scanDrift);
  float scanBeam = smoothstep(0.08, 0.46, sourceLine) * (1.0 - smoothstep(0.62, 0.98, sourceLine));
  float luma = max(max(color.r, color.g), color.b);
  float scanFlicker = 1.0 + sin(uTime * 6.0 + uv.y * 8.0) * 0.035;
  float scanline = mix(0.64, 1.06, scanBeam) * scanFlicker;
  float beamBloom = 1.0 + 0.055 * smoothstep(0.45, 1.0, luma);

  color *= scanline * beamBloom;
  color *= phosphorMask();
  color += bloom * 0.06;

  vec2 centered = vUv * 2.0 - 1.0;
  float vignette = 1.0 - dot(centered, centered) * 0.035;
  float glassEdge = mix(0.86, 1.0, smoothstep(1.15, 0.76, length(centered * vec2(0.96, 1.04))));
  color *= clamp(vignette, 0.90, 1.0) * glassEdge;

  float noise = random(gl_FragCoord.xy + vec2(uTime * 33.7, uTime * 18.1)) - 0.5;
  color += noise * 0.006;
  color = pow(max(color, vec3(0.0)), vec3(0.94));

  gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
`;

export class CrtRenderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly gl: WebGLRenderingContext;
  private readonly program: WebGLProgram;
  private readonly texture: WebGLTexture;
  private readonly positionLocation: number;
  private readonly uvLocation: number;
  private readonly sourceLocation: WebGLUniformLocation;
  private readonly sourceSizeLocation: WebGLUniformLocation;
  private readonly outputSizeLocation: WebGLUniformLocation;
  private readonly timeLocation: WebGLUniformLocation;
  private readonly warpXLocation: WebGLUniformLocation;
  private readonly warpYLocation: WebGLUniformLocation;

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      depth: false,
      preserveDrawingBuffer: false,
      stencil: false
    });
    if (!gl) throw new Error("WebGL is not available");

    const program = createProgram(gl, VERTEX_SHADER, FRAGMENT_SHADER);
    const texture = gl.createTexture();
    if (!texture) throw new Error("Could not create CRT source texture");

    this.canvas = canvas;
    this.gl = gl;
    this.program = program;
    this.texture = texture;
    this.positionLocation = gl.getAttribLocation(program, "aPosition");
    this.uvLocation = gl.getAttribLocation(program, "aUv");
    this.sourceLocation = getUniform(gl, program, "uSource");
    this.sourceSizeLocation = getUniform(gl, program, "uSourceSize");
    this.outputSizeLocation = getUniform(gl, program, "uOutputSize");
    this.timeLocation = getUniform(gl, program, "uTime");
    this.warpXLocation = getUniform(gl, program, "uWarpX");
    this.warpYLocation = getUniform(gl, program, "uWarpY");

    this.initialize();
  }

  render(source: HTMLCanvasElement, timeMs: number) {
    const gl = this.gl;
    this.resize();

    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.program);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);

    gl.uniform1i(this.sourceLocation, 0);
    gl.uniform2f(this.sourceSizeLocation, source.width, source.height);
    gl.uniform2f(this.outputSizeLocation, this.canvas.width, this.canvas.height);
    gl.uniform1f(this.timeLocation, timeMs / 1000);
    gl.uniform1f(this.warpXLocation, CRT_WARP_X);
    gl.uniform1f(this.warpYLocation, CRT_WARP_Y);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  dispose() {
    this.gl.deleteTexture(this.texture);
    this.gl.deleteProgram(this.program);
  }

  private initialize() {
    const gl = this.gl;
    const buffer = gl.createBuffer();
    if (!buffer) throw new Error("Could not create CRT quad buffer");

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        -1, -1, 0, 0,
        1, -1, 1, 0,
        -1, 1, 0, 1,
        1, 1, 1, 1
      ]),
      gl.STATIC_DRAW
    );

    gl.useProgram(this.program);
    gl.enableVertexAttribArray(this.positionLocation);
    gl.vertexAttribPointer(this.positionLocation, 2, gl.FLOAT, false, 16, 0);
    gl.enableVertexAttribArray(this.uvLocation);
    gl.vertexAttribPointer(this.uvLocation, 2, gl.FLOAT, false, 16, 8);

    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  private resize() {
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const rect = this.canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width * pixelRatio));
    const height = Math.max(1, Math.round(rect.height * pixelRatio));
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
  }
}

function createProgram(gl: WebGLRenderingContext, vertexSource: string, fragmentSource: string) {
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  if (!program) throw new Error("Could not create CRT shader program");

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program) ?? "Unknown CRT shader link error";
    gl.deleteProgram(program);
    throw new Error(info);
  }

  return program;
}

function createShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Could not create CRT shader");

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader) ?? "Unknown CRT shader compile error";
    gl.deleteShader(shader);
    throw new Error(info);
  }

  return shader;
}

function getUniform(gl: WebGLRenderingContext, program: WebGLProgram, name: string) {
  const location = gl.getUniformLocation(program, name);
  if (!location) throw new Error(`Missing CRT shader uniform: ${name}`);
  return location;
}
