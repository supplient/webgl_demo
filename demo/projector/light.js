export class AmbientLight {
    constructor(color) {
        this.color = color;
    }
}

export class DirectionalLight {
    constructor(color, pos, direction, max_dist=1) {
        this.color = color;
        this.pos = pos;
        this.direction = direction;
        this.max_dist = max_dist;
    }

    getLightViewMat() {
        return lookAt(
            this.pos, 
            add(this.pos, this.direction), 
            vec3(0, 1, 0)
        );
    }

    getLightProjMat() {
        return ortho(
            -this.max_dist, this.max_dist, 
            -this.max_dist, this.max_dist, 
            0, -this.max_dist*2);
    }
}

export class SpotLight {
    constructor(color, pos, at,
            inAngle, outAngle, 
            far, near=0.01) {
        this.color = color;
        this.pos = pos;
        this.at = at;
        this.inAngle = inAngle;
        this.outAngle = outAngle;
        this.far = far;
        this.near = near;
    }

    getPosVec4() {
        return vec4(
            this.pos[0],
            this.pos[1],
            this.pos[2],
            1.0
        );
    }

    getLightViewMat() {
        return lookAt(
            this.pos,
            this.at,
            vec3(0, 1, 0)
        );
    }

    getLightProjMat() {
        return perspective(
            this.outAngle * 2,
            1,
            this.near,
            this.far
        );
    }
}