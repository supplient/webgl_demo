precision highp float;

uniform samplerCube s_cube;

// varying
varying vec3 v_norm;

void main()
{
    // Cal norm
    vec3 N = normalize(v_norm); // Surface normal

    gl_FragColor = textureCube(s_cube, N);
}