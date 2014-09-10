require(["lib/socket.io", "path_collection", "order", "order_collection", "hud"], function(io, pathCollection, Order, OrderCollection, hud) {
    var socket = io.connect('http://159.253.142.200:10052', {
        resource: 'noths_order_geo/socket.io'
    });

    var setGlobePosition = function() {
        if (hud.isOpen()) {
            GlobePaths.getCamera().position.x += 0.4;
        } else {
            GlobePaths.getCamera().position.x -= 0.4;
        }
    };

    GlobePaths.start({});
    setGlobePosition();

    socket.emit('order-query', {
        last: 100,
        international: true
    });

    hud.on("toggle", function() {
        setGlobePosition();
    });

    hud.on("restrict", function() {
        var paths = hud.getHighlightedOrders().map(function(order) {
            return order.path;
        });

        GlobePaths.setPaths(paths);
    });

    hud.on("unrestrict", function() {
        GlobePaths.setPaths(pathCollection.getData());
    });

    socket.on('order', function(orderData) {
        // Filter out orders that don't have coordinate data
        if (!orderData.product.geo.coordinate) return;
        if (!orderData.geo.coordinate) return;

        var order = new Order(orderData);

        var orderCollection = new OrderCollection([order]);
        var paths = orderCollection.createPaths();

        hud.addOrder(order);
        pathCollection.push(paths[0]);

        if (!hud.restricted) {
            GlobePaths.setPaths(pathCollection.getData());
        }
    });
});
