precision mediump float;

uniform vec3 u_ambientProd;
uniform vec3 u_diffuseProd;
uniform vec3 u_specularProd;
uniform float u_Ns;

uniform vec4 u_lightPos;
uniform vec4 u_V;

varying vec3 v_norm;
varying vec4 v_pos;

void main()
{
    vec3 L = normalize((u_lightPos - v_pos).xyz); // Light vector
    vec3 N = normalize(v_norm); // Surface normal
    vec3 H = normalize(L+u_V.xyz); // Half angle vector
    
    vec4 ambient = vec4(u_ambientProd, 1.0);

    vec4 diffuse = vec4(max(dot(L, N), 0.0) * u_diffuseProd, 1.0);

    vec4 specular = vec4(pow(max(dot(N, H), 0.0), u_Ns) * u_specularProd, 1.0);

    gl_FragColor = ambient + diffuse + specular;
}
