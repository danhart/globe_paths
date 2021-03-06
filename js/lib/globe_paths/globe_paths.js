var masterContainer = document.getElementById('glContainer');

//  where in html to hold all our things
var glContainer = document.getElementById( 'glContainer' );

var camera, scene, renderer, controls;
var bgScene, bgCam;

var sphere;
var rotating;
var visualizationMesh;

// These are the points on the globe. There is one geoPin per coordinate. Each
// geoPin has a vector in 3d space, i.e. geoPin.vector. Also lat/lon etc.
var geoPins;
var geoPaths;

//  when the app is idle this will be true
var idle = false;

function start() {
    initScene();
    animate();
}

function setPaths(paths) {
    addVectorsToGeoPaths(paths);

    console.time('buildDataVizGeometries');
    buildDataVizGeometries(paths);
    console.timeEnd('buildDataVizGeometries');

    selectVisualization(paths);
}

function createCloudMesh() {
    var geometry   = new THREE.SphereGeometry(1.02, 40, 40);

    var material  = new THREE.MeshPhongMaterial({
        map: THREE.ImageUtils.loadTexture('images/cloudstrans.png'),
        side: THREE.DoubleSide,
        opacity: 0.6,
        transparent: true,
        depthWrite: false
    });

    var cloudMesh = new THREE.Mesh(geometry, material);
    cloudMesh.rotation.x = Math.PI;
    cloudMesh.rotation.y = -Math.PI/2;
    cloudMesh.rotation.z = Math.PI;
    cloudMesh.id = "clouds";

    return cloudMesh;
}

//  -----------------------------------------------------------------------------
//  All the initialization stuff for THREE
function initScene() {

    // Background setup
    var bg = new THREE.Mesh(
        new THREE.PlaneGeometry(2, 2, 0),
        new THREE.MeshBasicMaterial({
            map: THREE.ImageUtils.loadTexture('images/galaxybg-darker.jpg'),
        })
    );

    // The bg plane shouldn't care about the z-buffer.
    bg.material.depthTest = false;
    bg.material.depthWrite = false;

    bgScene = new THREE.Scene();
    bgCam = new THREE.Camera();
    bgScene.add(bgCam);
    bgScene.add(bg);

    //  -----------------------------------------------------------------------------
    //  Let's make a scene
    scene = new THREE.Scene();
    scene.matrixAutoUpdate = false;

    scene.add( new THREE.AmbientLight( 0x999999 ) );

    var light   = new THREE.DirectionalLight( 0xcccccc, 1 )
    light.position.set(5,5,5);
    scene.add( light );
    light.castShadow    = true;
    light.shadowCameraNear  = 0.01;
    light.shadowCameraFar   = 15;
    light.shadowCameraFov   = 45;

    light.shadowCameraLeft  = -1;
    light.shadowCameraRight =  1;
    light.shadowCameraTop   =  1;
    light.shadowCameraBottom= -1;
    // light.shadowCameraVisible    = true;

    light.shadowBias    = 0.001;
    light.shadowDarkness    = 0.2;

    light.shadowMapWidth    = 1024*2;
    light.shadowMapHeight   = 1024*2;

    rotating = new THREE.Object3D();
    scene.add(rotating);

    cloudsRotating = new THREE.Object3D();

    // For the globe
    var material = new THREE.MeshPhongMaterial({
        map: THREE.ImageUtils.loadTexture('images/earthmap4kadjusted.jpg'),
        bumpMap: THREE.ImageUtils.loadTexture('images/earthbump4kadjusted.jpg'),
        bumpScale: 0.05,
        specularMap: THREE.ImageUtils.loadTexture('images/earthspec4kadjusted.jpg'),
        specular: new THREE.Color('grey')
    })

    //  -----------------------------------------------------------------------------
    //  Create the backing (sphere)
    sphere = new THREE.Mesh( new THREE.SphereGeometry( 1, 40, 40 ), material );

    sphere.rotation.x = Math.PI;
    sphere.rotation.y = -Math.PI/2;
    sphere.rotation.z = Math.PI;
    sphere.id = "base";

    var cloudMesh = createCloudMesh();
    cloudsRotating.add( cloudMesh );

    rotating.add( sphere );
    rotating.add( cloudsRotating );

    // For the paths
    visualizationMesh = new THREE.Object3D();
    rotating.add(visualizationMesh);


    //  -----------------------------------------------------------------------------
    //  Setup our renderer
    renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true
    });

    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.autoClear = false;

    renderer.sortObjects = false;
    renderer.generateMipmaps = false;

    glContainer.appendChild( renderer.domElement );


    //  -----------------------------------------------------------------------------
    //  Event listeners
    document.addEventListener( 'mousemove', onDocumentMouseMove, true );
    document.addEventListener( 'windowResize', onDocumentResize, false );

    document.addEventListener( 'mousedown', onDocumentMouseDown, true );
    document.addEventListener( 'mouseup', onDocumentMouseUp, false );

    masterContainer.addEventListener( 'click', onClick, true );
    masterContainer.addEventListener( 'mousewheel', onMouseWheel, false );

    //  firefox
    masterContainer.addEventListener( 'DOMMouseScroll', function(e){
            var evt=window.event || e; //equalize event object
            onMouseWheel(evt);
    }, false );

    document.addEventListener( 'keydown', onKeyDown, false);

    //  -----------------------------------------------------------------------------
    //  Setup our camera
    camera = new THREE.PerspectiveCamera( 12, window.innerWidth / window.innerHeight, 1, 20000 );
    camera.position.z = 12;
    camera.position.y = 0;
    camera.position.x = 0;

    var windowResize = THREEx.WindowResize(renderer, camera)
}


function animate() {
    rotateX += rotateVX;
    rotateY += rotateVY;

    rotateVX *= 0.98;
    rotateVY *= 0.98;

    if (dragging) {
        rotateVX *= 0.6;
        rotateVY *= 0.6;
    } else {
        rotateY += 0.002;
    }

    //  constrain the pivot up/down to the poles
    //  force a bit of bounce back action when hitting the poles
    if(rotateX < -rotateXMax){
        rotateX = -rotateXMax;
        rotateVX *= -0.95;
    }
    if(rotateX > rotateXMax){
        rotateX = rotateXMax;
        rotateVX *= -0.95;
    }

    // Restore the globe to a default X rotation of 0.4
    if (!dragging) {
        if (rotateX > 0.4) {
            rotateX -= (rotateX - 0.4) * 0.001
        }

        if (rotateX < 0.4) {
            rotateX -= (rotateX - 0.4) * 0.001
        }
    }

    rotating.rotation.x = rotateX;
    rotating.rotation.y = rotateY;

    cloudsRotating.rotation.y += 0.0005;

    renderer.clear();
    renderer.render(bgScene, bgCam);
    renderer.render( scene, camera );

    requestAnimationFrame( animate );

    rotating.traverse(function(mesh) {
        if (mesh.update !== undefined) {
            mesh.update();
        }
    });
}

GlobePaths = (function() {
    return {
        start: function(options) {
            start();
        },
        setPaths: function(paths) {
            setPaths(paths);
        },
        getCamera: function() {
            return camera;
        }
    }
})();
