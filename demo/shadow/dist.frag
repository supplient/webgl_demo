precision mediump float;

uniform vec4 u_lightPos;
uniform float u_farPlane;

varying vec4 v_worldPos;

vec4 packDepth(const in float depth) {
    if(depth >= 1.0) {
        return vec4(1.0, 1.0, 1.0, 1.0);
    }
    const vec4 bitShift = vec4(1.0, 256.0, 256.0*256.0, 256.0*256.0*256.0);
    const vec4 bitMask = vec4(1.0/256.0, 1.0/256.0, 1.0/256.0, 0);
    vec4 rgbaDepth = fract(depth * bitShift);
    rgbaDepth -= rgbaDepth.gbaa * bitMask;
    return rgbaDepth;
}

void main()
{
    float dist = length(v_worldPos.xyz - u_lightPos.xyz);
    dist = dist / u_farPlane;
    gl_FragColor = packDepth(dist);
}
