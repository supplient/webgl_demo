attribute vec4 a_old_pos;
attribute vec4 a_new_pos;
attribute vec4 a_old_norm;
attribute vec4 a_new_norm;

uniform mat4 u_mvp_mat;
uniform mat3 u_norm_mat;

uniform float u_progress;

varying vec3 v_norm;
varying vec4 v_pos;

void main()
{
    vec4 pos = a_old_pos + u_progress * (a_new_pos - a_old_pos);
    gl_Position = u_mvp_mat * pos;

    vec3 norm = a_old_norm.xyz + u_progress * (a_new_norm.xyz - a_old_norm.xyz);
    v_norm = u_norm_mat * norm;
    v_pos = u_mvp_mat * pos;
}
