precision mediump float;

varying vec3 v_norm;
varying vec4 v_pos;

void main()
{
    vec4 lightPosition = vec4(-5, 5, -5, 5);
    vec3 L = normalize((lightPosition - v_pos).xyz);
    vec3 N = normalize(v_norm);

    vec3 diffuseProduct = vec3(0.7, 0.7, 0.7);
    vec4 diffuse = vec4(max(dot(L, N), 0.0) * diffuseProduct, 1.0);
    
    vec4 ambient = vec4(0.3, 0.3, 0.3, 1.0);

    gl_FragColor = ambient + diffuse;
}
