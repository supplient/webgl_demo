attribute vec4 a_pos;
attribute vec4 a_norm;

uniform mat4 u_mvp_mat;
uniform mat3 u_norm_mat;

varying vec3 v_norm;

void main()
{
    gl_Position = u_mvp_mat * a_pos;

    v_norm = a_norm.xyz;
}
