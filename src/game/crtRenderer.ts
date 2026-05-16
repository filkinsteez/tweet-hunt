export const CRT_WARP_X = 0.017;
export const CRT_WARP_Y = 0.023;

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

const vec2 LOGICAL_RASTER_SIZE = vec2(256.0, 240.0);

float random(vec2 value) {
  return fract(sin(dot(value, vec2(127.1, 311.7))) * 43758.5453123);
}

vec3 toLinear(vec3 color) {
  return pow(max(color, vec3(0.0)), vec3(2.2));
}

vec3 toDisplay(vec3 color) {
  return pow(max(color, vec3(0.0)), vec3(1.0 / 2.2));
}

vec2 curveUv(vec2 uv) {
  vec2 position = uv * 2.0 - 1.0;
  vec2 warped = vec2(
    position.x * (1.0 + position.y * position.y * uWarpX),
    position.y * (1.0 + position.x * position.x * uWarpY)
  );
  return warped * 0.5 + 0.5;
}

vec3 sampleLinear(vec2 uv) {
  return toLinear(texture2D(uSource, clamp(uv, vec2(0.0), vec2(1.0))).rgb);
}

vec3 sampleHorizontal(vec2 uv) {
  vec2 texel = vec2(1.0 / uSourceSize.x, 0.0);
  vec3 center = sampleLinear(uv) * 0.58;
  vec3 near = (sampleLinear(uv - texel) + sampleLinear(uv + texel)) * 0.17;
  vec3 far = (sampleLinear(uv - texel * 2.0) + sampleLinear(uv + texel * 2.0)) * 0.04;
  return center + near + far;
}

float beamWeight(vec3 color, float distanceFromScanline) {
  float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
  float beamWidth = mix(7.5, 2.4, smoothstep(0.05, 0.9, luma));
  float beamCore = exp2(-beamWidth * distanceFromScanline * distanceFromScanline);
  float beamFloor = mix(0.72, 0.92, smoothstep(0.12, 0.85, luma));
  return beamFloor + beamCore * (1.0 - beamFloor);
}

vec3 sampleBeam(vec2 uv) {
  vec2 logical = uv * LOGICAL_RASTER_SIZE;
  float row = floor(logical.y);
  float distanceFromRow = logical.y - row - 0.5;
  float rowUv = (row + 0.5) / LOGICAL_RASTER_SIZE.y;
  float rowAboveUv = (row - 0.5) / LOGICAL_RASTER_SIZE.y;
  float rowBelowUv = (row + 1.5) / LOGICAL_RASTER_SIZE.y;

  vec3 rowColor = sampleHorizontal(vec2(uv.x, rowUv));
  vec3 aboveColor = sampleHorizontal(vec2(uv.x, rowAboveUv));
  vec3 belowColor = sampleHorizontal(vec2(uv.x, rowBelowUv));

  vec3 color = rowColor * beamWeight(rowColor, distanceFromRow);
  color += aboveColor * beamWeight(aboveColor, distanceFromRow + 1.0) * 0.32;
  color += belowColor * beamWeight(belowColor, distanceFromRow - 1.0) * 0.32;
  return color;
}

vec3 sampleConvergedBeam(vec2 uv) {
  vec2 fromCenter = uv - 0.5;
  float edge = smoothstep(0.1, 0.82, length(fromCenter));
  vec2 direction = normalize(fromCenter + vec2(0.0001));
  vec2 pixel = direction * edge * 0.45 / uOutputSize;

  float red = sampleBeam(uv + pixel).r;
  float green = sampleBeam(uv).g;
  float blue = sampleBeam(uv - pixel).b;
  return vec3(red, green, blue);
}

vec3 phosphorMask(vec3 color) {
  float triad = mod(gl_FragCoord.x, 3.0);
  vec3 grille = vec3(0.94);
  if (triad < 1.0) {
    grille.r = 1.06;
  } else if (triad < 2.0) {
    grille.g = 1.045;
  } else {
    grille.b = 1.06;
  }

  float slotRow = step(0.5, fract(gl_FragCoord.y / 4.0));
  float slotColumn = step(0.5, fract((gl_FragCoord.x + slotRow * 3.0) / 6.0));
  float slot = mix(0.97, 1.02, slotColumn);
  float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
  float strength = mix(0.22, 0.12, smoothstep(0.3, 1.0, luma));
  return mix(vec3(1.0), grille * slot, strength);
}

vec3 halation(vec2 uv) {
  vec2 texel = 1.0 / uSourceSize;
  vec3 glow = sampleLinear(uv) * 0.09;
  glow += (sampleLinear(uv + texel * vec2(2.0, 0.0)) + sampleLinear(uv - texel * vec2(2.0, 0.0))) * 0.045;
  glow += (sampleLinear(uv + texel * vec2(0.0, 2.0)) + sampleLinear(uv - texel * vec2(0.0, 2.0))) * 0.045;
  glow += (sampleLinear(uv + texel * vec2(2.0, 2.0)) + sampleLinear(uv + texel * vec2(-2.0, 2.0))) * 0.022;
  glow += (sampleLinear(uv + texel * vec2(2.0, -2.0)) + sampleLinear(uv + texel * vec2(-2.0, -2.0))) * 0.022;
  glow += (sampleLinear(uv + texel * vec2(5.0, 0.0)) + sampleLinear(uv - texel * vec2(5.0, 0.0))) * 0.012;
  glow += (sampleLinear(uv + texel * vec2(0.0, 5.0)) + sampleLinear(uv - texel * vec2(0.0, 5.0))) * 0.012;
  return max(glow - vec3(0.32), vec3(0.0));
}

void main() {
  vec2 uv = curveUv(vUv);
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  vec3 color = sampleConvergedBeam(uv);
  vec3 bloom = halation(uv);
  float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
  float rasterBreath = 1.0 + sin(uTime * 5.2 + uv.y * 16.0) * 0.004;

  color *= phosphorMask(color);
  color *= mix(1.0, 1.045, smoothstep(0.16, 0.85, luma)) * rasterBreath;
  color += bloom * vec3(0.055, 0.05, 0.045);

  vec2 centered = vUv * 2.0 - 1.0;
  float vignette = 1.0 - dot(centered, centered) * 0.028;
  float glassEdge = mix(0.9, 1.0, smoothstep(1.12, 0.78, length(centered * vec2(0.96, 1.04))));
  color *= clamp(vignette, 0.92, 1.0) * glassEdge;

  float noise = random(gl_FragCoord.xy + vec2(uTime * 33.7, uTime * 18.1)) - 0.5;
  color += noise * 0.002;
  color = toDisplay(color);

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
