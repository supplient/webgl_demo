precision mediump float;

uniform vec3 u_ambientProd;
uniform vec3 u_diffuseProd;
uniform vec3 u_specularProd;
uniform float u_Ns;

uniform vec4 u_lightPos;
uniform vec4 u_V;

uniform bool u_switch_diffuse;
uniform sampler2D s_diffuse;
uniform bool u_switch_norm;
uniform sampler2D s_norm;

varying vec3 v_norm;
varying vec4 v_pos;
varying vec2 v_uv;
varying vec3 v_tan;
varying vec3 v_bitan;

void main()
{
    // Cal norm
    vec3 N = normalize(v_norm); // Surface normal
    if(u_switch_norm) { // If using norm texture
        // Transform data range
        vec3 tex_norm = texture2D(s_norm, v_uv).xyz; // [0, 1]
        tex_norm = 2.0 * tex_norm - 1.0; // [-1, 1]

        // Transform to clip space
        mat3 TBN = mat3(normalize(v_tan), normalize(v_bitan), N);
        N = TBN * tex_norm;
    }
    
    // Cal light model
    vec3 L = normalize((u_lightPos - v_pos).xyz); // Light vector
    vec3 H = normalize(L+u_V.xyz); // Half angle vector
    vec4 ambient = vec4(u_ambientProd, 1.0);
    vec4 diffuse = vec4(max(dot(L, N), 0.0) * u_diffuseProd, 1.0);
    vec4 specular = vec4(pow(max(dot(N, H), 0.0), u_Ns) * u_specularProd, 1.0);

    // Get textures
    if(u_switch_diffuse) {
        diffuse = diffuse * texture2D(s_diffuse, v_uv);
    }

    gl_FragColor = ambient + diffuse + specular;
}
