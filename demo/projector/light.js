export class AmbientLight {
    constructor(color) {
        this.color = color;
    }
}

export class DirectionalLight {
    constructor(color, pos, at, max_dist=1) {
        this.color = color;
        this.pos = pos;
        this.at = at;
        this.max_dist = max_dist;
    }

    getLightViewMat() {
        return lookAt(
            this.pos, 
            this.at, 
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