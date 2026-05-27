export const CRT_WARP_X = 0.01;
export const CRT_WARP_Y = 0.014;

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
uniform float uTime;
uniform float uWarpX;
uniform float uWarpY;

varying vec2 vUv;

const float LOGICAL_RASTER_HEIGHT = 240.0;
const float SCREEN_IMAGE_SCALE = 0.972;
const float SCREEN_IMAGE_CORNER_RADIUS = 0.115;

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

vec3 sampleSource(vec2 uv) {
  return texture2D(uSource, clamp(uv, vec2(0.0), vec2(1.0))).rgb;
}

vec3 phosphorMask(vec3 color) {
  float triad = mod(gl_FragCoord.x, 3.0);
  vec3 grille = vec3(0.985);
  if (triad < 1.0) {
    grille.r = 1.025;
  } else if (triad < 2.0) {
    grille.g = 1.018;
  } else {
    grille.b = 1.025;
  }

  float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
  float strength = mix(0.07, 0.03, smoothstep(0.22, 0.9, luma));
  return mix(vec3(1.0), grille, strength);
}

vec3 softHalation(vec2 uv, vec3 color) {
  vec2 texel = 1.0 / uSourceSize;
  vec3 glow = sampleSource(uv + vec2(texel.x, 0.0));
  glow += sampleSource(uv - vec2(texel.x, 0.0));
  glow += sampleSource(uv + vec2(0.0, texel.y));
  glow += sampleSource(uv - vec2(0.0, texel.y));
  glow = glow * 0.25;
  return max(glow - vec3(0.48), vec3(0.0)) * 0.045;
}

float roundedRectDistance(vec2 point, vec2 halfSize, float radius) {
  vec2 offset = abs(point) - halfSize + vec2(radius);
  return length(max(offset, vec2(0.0))) + min(max(offset.x, offset.y), 0.0) - radius;
}

void main() {
  vec2 displayUv = (vUv - 0.5) / SCREEN_IMAGE_SCALE + 0.5;
  vec2 displayPosition = displayUv * 2.0 - 1.0;
  float imageEdge = roundedRectDistance(displayPosition, vec2(1.0), SCREEN_IMAGE_CORNER_RADIUS);
  if (imageEdge > 0.012) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  vec2 uv = curveUv(displayUv);
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  vec3 color = sampleSource(uv);
  float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));

  float logicalY = uv.y * LOGICAL_RASTER_HEIGHT;
  float scanline = 0.9 + 0.1 * smoothstep(0.16, 0.7, abs(fract(logicalY) - 0.5) * 2.0);
  float brightLineLift = mix(0.015, 0.0, smoothstep(0.25, 0.95, luma));
  color = color * scanline + brightLineLift;
  color *= phosphorMask(color);
  color += softHalation(uv, color);
  color *= 1.0 - smoothstep(-0.018, 0.012, imageEdge) * 0.22;

  float noise = random(gl_FragCoord.xy + vec2(uTime * 23.0, uTime * 13.0)) - 0.5;
  color += noise * 0.002;

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
