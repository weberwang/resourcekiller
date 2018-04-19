'use strict';

let fs = require("fs");
let path = require("path")

let resourceTypes = [{
    type: "cc.Sprite",
    value: "_spriteFrame"
}, {
    type: "cc.AudioSource",
    value: "_clip"
}]
let assetsTypes = ["scene", "prefab"]
let checkTyps = ["texture", "audio-clip", /* "typescript", "javascript" */]
let assetdb = Editor.assetdb;

let checkFilesPaths = []

let pattentType = (type) => {
    for (const resourceType of resourceTypes) {
        if (resourceType["type"] === type) {
            return resourceType;
        }
    }
    return null;
}

let findUsedResource = (assetType) => {
    assetdb.queryAssets('db://assets/**\/*', assetType, (err, results) => {
        if (err) {
            return
        }
        for (const result of results) {
            let data = fs.readFileSync(result.path, {
                encoding: "utf-8"
            });
            let assetData = JSON.parse(data);
            for (const asset of assetData) {
                let typeData = pattentType(asset["__type__"]);
                if (typeData) {
                    let assetuuid = asset[typeData["value"]]["__uuid__"];
                    let resourcePath = assetdb.remote.uuidToUrl(assetuuid);
                    resourcePath = path.extname(resourcePath) !== "" ? resourcePath : path.dirname(resourcePath);
                    let index = checkFilesPaths.indexOf(resourcePath)
                    Editor.log("resourcePath=====>", index, resourcePath)
                    checkFilesPaths.splice(index, 1);
                } else {
                    if (asset["__type__"].indexOf("cc.") === -1) {
                        // Editor.log(decodeUuid(asset["__type__"]))
                    }
                }
            }
        }
        Editor.Ipc.sendToPanel("resourcekiller", "onUnsedResults", checkFilesPaths);
    });
}

let findAllUsed = () => {
    for (const assetType of assetsTypes) {
        findUsedResource(assetType);
    }
}

let findAllResourceInAsset = (cb) => {
    checkFilesPaths.splice(0);
    assetdb.deepQuery((err, results) => {
        if (err) {
            return;
        }
        for (const result of results) {
            if (result.hidden === false && checkTyps.indexOf(result.type) > -1) {
                checkFilesPaths.push(assetdb.remote.uuidToUrl(result.uuid));
            }
        }
        // Editor.log("findAllResourceInAsset", checkFilesPaths)
        cb()
    })
}


module.exports.findAllUsedResource = () => {
    findAllResourceInAsset(findAllUsed);
}