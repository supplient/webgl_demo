attribute vec4 a_pos;
attribute vec4 a_norm;
attribute vec3 a_uv;

uniform mat4 u_mvp_mat;
uniform mat3 u_norm_mat;

varying vec3 v_norm;
varying vec4 v_pos;
varying vec2 v_uv;

void main()
{
    vec4 pos = a_pos;
    gl_Position = u_mvp_mat * pos;

    vec3 norm = a_norm.xyz;
    v_norm = u_norm_mat * norm;
    v_pos = u_mvp_mat * pos;
    v_uv = a_uv.xy;
}
