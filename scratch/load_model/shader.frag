precision mediump float;

uniform vec3 u_ambientProd;
uniform vec3 u_diffuseProd;
uniform vec3 u_specularProd;
uniform float u_Ns;

uniform vec4 u_lightPos;
uniform vec4 u_V;

uniform bool u_switch_diffuse;
uniform sampler2D s_diffuse;

varying vec3 v_norm;
varying vec4 v_pos;
varying vec2 v_uv;

void main()
{
    // Cal vectors
    vec3 L = normalize((u_lightPos - v_pos).xyz); // Light vector
    vec3 N = normalize(v_norm); // Surface normal
    vec3 H = normalize(L+u_V.xyz); // Half angle vector
    
    // Cal light model
    vec4 ambient = vec4(u_ambientProd, 1.0);
    vec4 diffuse = vec4(max(dot(L, N), 0.0) * u_diffuseProd, 1.0);
    vec4 specular = vec4(pow(max(dot(N, H), 0.0), u_Ns) * u_specularProd, 1.0);

    // Get textures
    vec4 tex_diffuse = vec4(1.0);
    if(u_switch_diffuse) {
        tex_diffuse = texture2D(s_diffuse, v_uv);
        diffuse = diffuse * tex_diffuse;
    }

    gl_FragColor = ambient + diffuse + specular;
}
