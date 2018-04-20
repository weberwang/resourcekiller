'use strict';

let fs = require("fs");
let path = require("path")

let resourceTypes = [{
    type: "cc.Sprite",
    value: "_spriteFrame"
}, {
    type: "cc.AudioSource",
    value: "_clip"
}];

let animTyps = [{
    type: "cc.Sprite",
    value: "spriteFrame"
}, {
    type: "cc.AudioSource",
    value: "_clip"
}];
let assetsTypes = ["scene", "prefab", "animation-clip"]
let checkTyps = ["texture", "audio-clip", "typescript", "javascript"]
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
            if (assetType === "animation-clip") {
                findAnima(assetData);
            } else {
                findSceneAndPrefab(assetData);
            }
        }
        Editor.Ipc.sendToPanel("resourcekiller", "onUnsedResults", checkFilesPaths);
    });
}

let findSceneAndPrefab = (assetData) => {
    for (const asset of assetData) {
        let typeData = pattentType(asset["__type__"]);
        if (typeData) {
            let assetuuid = asset[typeData["value"]]["__uuid__"];
            deleteExistWithUuid(assetuuid)
        } else {
            if (asset["__type__"].indexOf("cc.") === -1) {
                let scriptUuid = Editor.Utils.UuidUtils.decompressUuid(asset['__type__']);
                deleteExistWithUuid(scriptUuid)
            }
        }
    }
}

let findAnima = (assetData) => {
    let comps = assetData["curveData"]["comps"];
    if (comps["cc.Sprite"]) {
        let spriteFrames = comps["cc.Sprite"]["spriteFrame"];
        for (const spriteFrame of spriteFrames) {
            let uuid = spriteFrame["value"]["__uuid__"];
            deleteExistWithUuid(uuid);
        }
    }
}

let deleteExistWithUuid = (uuid) => {
    let resourcePath = assetdb.remote.uuidToUrl(uuid);
    resourcePath = path.extname(resourcePath) !== "" ? resourcePath : path.dirname(resourcePath);
    let index = checkFilesPaths.indexOf(resourcePath)
    Editor.log("resourcePath=====>", index, resourcePath)
    if (index > -1) checkFilesPaths.splice(index, 1);
}

let findAllUsed = () => {
    findUsedResource(assetsTypes);
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

let findEmptyFinder = () => {
    assetdb.queryAssets('db://assets/**\/*', "folder", (err, results) => {
        if (err) {
            return;
        }
        for (const result of results) {
            if (result.hidden === false) {
                let path = assetdb.remote.uuidToFspath(result.uuid);
                fs.readdir(path, (err, files) => {
                    if (err) {
                        return;
                    }
                    files.forEach((file) => {
                        Editor.log(file)
                    })
                })
            }
        }
    });

}


module.exports.findAllUsedResource = () => {
    // findEmptyFinder();
    findAllResourceInAsset(findAllUsed);
}