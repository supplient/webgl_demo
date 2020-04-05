precision mediump float;

uniform vec3 u_ambientProd;
uniform vec3 u_diffuseProd;
// uniform vec3 u_Ks;
// uniform int u_Ns;

uniform vec4 u_lightPos;

varying vec3 v_norm;
varying vec4 v_pos;

void main()
{
    vec3 L = normalize((u_lightPos - v_pos).xyz);
    vec3 N = normalize(v_norm);
    
    vec4 ambient = vec4(u_ambientProd, 1.0);

    vec4 diffuse = vec4(max(dot(L, N), 0.0) * u_diffuseProd, 1.0);


    gl_FragColor = ambient + diffuse;
}
