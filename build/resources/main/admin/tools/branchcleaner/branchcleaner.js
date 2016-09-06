var mustache = require('/lib/xp/mustache');
var portal = require('/lib/xp/portal');
var contentLib = require('/lib/xp/content');
var contextLib = require('/lib/xp/context');

var BATCH_SIZE = 300;

var SOURCE_BRANCH = "master";
var TARGET_BRANCH = "draft";


exports.get = function (req) {

    var view = resolve('branchcleaner.html');

    deleteMarked(req);

    var diff = getDiff();

    var model = {
        source: SOURCE_BRANCH,
        target: TARGET_BRANCH,
        url: req.url
    };
    model.inSourceOnly = populateDiff(diff);

    return {
        contentType: 'text/html',
        body: mustache.render(view, model)
    };
};


exports.post = function (req) {

    deleteMarked(req);

    return {
        redirect: req.url
    }
};


function deleteMarked(req) {
    var toDelete = req.params.toDelete;
    if (toDelete) {

        if (toDelete.constructor === Array) {
            toDelete.forEach(function (id) {
                log.info("DELETING CONTENT WITH ID: " + id);

                contentLib.delete({
                    key: id,
                    branch: SOURCE_BRANCH
                })
            });
        } else {
            contentLib.delete({
                key: toDelete,
                branch: SOURCE_BRANCH
            })
        }
    }
}

var getDiff = function () {

    var inSource = contextLib.run({
        branch: SOURCE_BRANCH
    }, getAllContent);

    var inTarget = contextLib.run({
        branch: TARGET_BRANCH
    }, getAllContent);


    return difference(inSource, inTarget);
};


function difference(a1, a2) {
    var result = [];
    for (var i = 0; i < a1.length; i++) {
        if (a2.indexOf(a1[i]) === -1) {
            result.push(a1[i]);
        }
    }
    return result;
}

var getAllContent = function () {

    var allIds = [];

    var result = contentLib.query({
        start: 0,
        count: 0
    });

    var totalHits = result.total;
    var currentStart = 0;
    var numBatches = parseInt(Math.ceil(totalHits / BATCH_SIZE));

    for (var i = 1; i <= numBatches; i++) {
        var contentIds = getContentIds(currentStart, BATCH_SIZE);
        allIds = allIds.concat(contentIds);
        currentStart += BATCH_SIZE;
    }

    return allIds;
};

var getContentIds = function (start, count) {
    var hits = [];

    var result = contentLib.query({
        start: start,
        count: count
    });


    result.hits.forEach(function (hit) {
        hits.push(hit._id);
    });

    return hits;
};


function populateDiff(diff) {

    var inSourceOnly = [];

    diff.forEach(function (id) {

        var result = contentLib.get({
            key: id,
            branch: SOURCE_BRANCH
        });

        var entry = {
            id: result._id,
            name: result._name,
            path: result._path,
            displayName: result.displayName
        };

        inSourceOnly.push(entry);
    });

    return inSourceOnly;
}
