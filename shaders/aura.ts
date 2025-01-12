export const auraVertexShader = `
varying vec2 vUv;
varying vec3 vPosition;
void main() {
  vUv = uv;
  vPosition = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

export const auraFragmentShader = `
uniform float time;
varying vec2 vUv;
varying vec3 vPosition;

void main() {
  float intensity = 0.8 - distance(vUv, vec2(0.5));
  intensity = pow(intensity, 2.0);
  vec3 color = vec3(1.0, 0.9, 0.0); // Yellow
  gl_FragColor = vec4(color, intensity * (0.6 + 0.4 * sin(time * 2.0)));
}
`

