'use strict';

let fs = require("fs");
let PATH = require("path")

let resourceTypes = [{
    type: "cc.Sprite",
    value: "_spriteFrame"
}, {
    type: "cc.AudioSource",
    value: "_clip"
}, {
    type: "cc.Animation",
    value: "_clips"
}, {
    type: "sp.Skeleton",
    value: "_N$skeletonData"
}, {
    type: "cc.Label",
    value: "_N$file"
}, {
    type: "cc.RichText",
    value: "_N$font"
}];

let animTyps = [{
    type: "cc.Sprite",
    value: "spriteFrame"
}, {
    type: "cc.AudioSource",
    value: "_clip"
}];
let assetsTypes = ["scene", "prefab"]
let checkTyps = ["texture", "audio-clip", "typescript", "javascript", "animation-clip", "spine", "raw-asset", "sprite-atlas", "bitmap-font", "label-atlas"]
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

let findUsedResource = (assetType, last) => {
    assetdb.queryAssets('db://assets/**', assetType, (err, results) => {
        if (err) {
            return
        }
        for (const result of results) {
            let data = fs.readFileSync(result.path, {
                encoding: "utf-8"
            });
            let assetData = JSON.parse(data);
            if (result.type === "animation-clip") {
                if (checkFilesPaths.indexOf(result.url) !== -1) continue;
                findAnima(assetData);
            } else {
                findSceneAndPrefab(assetData);
            }
        }
        if (!last) {
            findUsedResource("animation-clip", true);
        } else {
            findParentScript();
            Editor.Ipc.sendToPanel("resourcekiller", "onUnsedResults", checkFilesPaths);
        }
    });
}

let findSpine = (uuid) => {
    deleteExistWithUuid(uuid);
    let plistpath = assetdb.remote.uuidToFspath(uuid);
    let metapath = plistpath + ".meta";
    let metadata = fs.readFileSync(metapath, {
        encoding: "utf8"
    });
    metadata = JSON.parse(metadata);
    for (const texture of metadata.textures) {
        deleteExistWithUuid(texture);
    }
    deleteExistWithUuid(metadata.atlas);
}

let findAltas = (uuid) => {
    deleteExistWithUuid(uuid);
    let plistpath = assetdb.remote.uuidToFspath(uuid);
    let metapath = plistpath + ".meta";
    let metadata = fs.readFileSync(metapath, {
        encoding: "utf8"
    });
    metadata = JSON.parse(metadata);
    deleteExistWithUuid(metadata.rawTextureUuid);
}

let findFnt = (uuid) => {
    deleteExistWithUuid(uuid);
    let plistpath = assetdb.remote.uuidToFspath(uuid);
    let metapath = plistpath + ".meta";
    let metadata = fs.readFileSync(metapath, {
        encoding: "utf8"
    });
    metadata = JSON.parse(metadata);
    if (metadata.textureUuid) {
        deleteExistWithUuid(metadata.textureUuid);
    } else if (metadata.rawTextureUuid) {
        deleteExistWithUuid(metadata.rawTextureUuid);
    }
}

let findDepsResource = (asset, typeData) => {
    let value = asset[typeData["value"]];
    switch (typeData.type) {
        case "sp.Skeleton":
            findSpine(value["__uuid__"]);
            break;
        case "cc.Sprite":
            if (asset["_atlas"]) {
                findAltas(asset["_atlas"]["__uuid__"])
            }
            break;
        case "cc.Label":
        case "cc.RichText":
            findFnt(value["__uuid__"])
            break;
    }
}

let findSceneAndPrefab = (assetData) => {
    for (const asset of assetData) {
        let typeData = pattentType(asset["__type__"]);
        if (typeData) {
            let value = asset[typeData["value"]];
            if (!value) continue;
            if (typeData.type === "cc.Animation") {
                if (value[0] === null) return;
                for (const data of value) {
                    deleteExistWithUuid(data["__uuid__"]);
                }
            } else {
                findDepsResource(asset, typeData);
                deleteExistWithUuid(value["__uuid__"]);
            }
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
    if (!comps) return;
    if (comps.hasOwnProperty("cc.Sprite")) {
        let spriteFrames = comps["cc.Sprite"]["spriteFrame"];
        if (spriteFrames) {
            for (const spriteFrame of spriteFrames) {
                let uuid = spriteFrame["value"]["__uuid__"];
                deleteExistWithUuid(uuid);
            }
        }
    }
    if (comps.hasOwnProperty("sp.Skeleton")) {
        let skeletonData = comps["sp.Skeleton"]["skeletonData"];
        if (skeletonData) {
            for (const skData of skeletonData) {
                let uuid = skData["value"]["__uuid__"];
                findSpine(uuid);
            }
        }
    }
}

let deleteExistWithUuid = (uuid) => {
    if(!uuid || uuid === "") return;
    let resourcePath = assetdb.remote.uuidToUrl(uuid);
    if(!resourcePath) return;
    resourcePath = PATH.extname(resourcePath) != "" ? resourcePath : PATH.dirname(resourcePath);
    let index = checkFilesPaths.indexOf(resourcePath)
    if (index > -1) checkFilesPaths.splice(index, 1);
}

let findAllUsed = () => {
    findUsedResource(assetsTypes);
}

let findAllResourceInAsset = (ignore, cb) => {
    checkFilesPaths.splice(0);
    let ignoreRex = new RegExp(ignore.replace(/;/g, "|"));
    assetdb.deepQuery((err, results) => {
        if (err) {
            return;
        }
        for (const result of results) {
            // Editor.log(JSON.stringify(result))
            if (result.hidden === false && checkTyps.indexOf(result.type) > -1) {
                let url = assetdb.remote.uuidToUrl(result.uuid);
                if (ignore && ignore !== "" && ignoreRex.test(url)) {
                    continue;
                }
                checkFilesPaths.push(url);
            }
        }
        cb()
    })
}

let findDepsScripts = (scriptData) => {
    let depsIndexs = [];
    for (const key in scriptData.deps) {
        depsIndexs.push(scriptData.deps[key])
    }
    return depsIndexs;
}

let deleteScriptUrl = (url) => {
    let index = checkFilesPaths.indexOf(url);
    if (index === -1) {
        url = url.replace(".js", ".ts")
        index = checkFilesPaths.indexOf(url);
    }
    if (index > -1) checkFilesPaths.splice(index, 1);
}

let findParentScript = () => {
    let simulatorPath = PATH.join(PATH.dirname(Editor.appPath), "cocos2d-x", "simulator");
    let settingPath = ""
    if (Editor.isDarwin) {
        settingPath = PATH.join(simulatorPath, "mac/Simulator.app/Contents/Resources/")
    } else {
        settingPath = PATH.join(simulatorPath, "win32")
    }
    settingPath = PATH.join(settingPath, "src/settings.js");
    require(settingPath);
    let settingsScript = _CCSettings.scripts;
    let indexs = [];
    for (const script of settingsScript) {
        if (checkFilesPaths.indexOf(script.file) === -1) {
            indexs = (findDepsScripts(script));
            for (const index of indexs) {
                let scriptUrl = settingsScript[index].file.replace("preview-scripts/", "db://");
                deleteScriptUrl(scriptUrl);
            }
        }
    }
}

module.exports.findEmptyFinder = () => {
    assetdb.queryAssets('db://assets/**', "folder", (err, results) => {
        if (err) {
            return;
        }
        for (const result of results) {
            if (result.hidden === false) {
                let path = assetdb.remote.uuidToFspath(result.uuid);
                deleteFolderRecursive(path);
            }
        }
    });
}

let deleteFolderRecursive = (path) => {
    if (fs.existsSync(path)) {
        let files = fs.readdirSync(path);
        if (files.length === 0) {
            assetdb.delete(assetdb.remote.fspathToUrl(path), (err) => {
                if (!err) {
                    deleteFolderRecursive(PATH.dirname(path));
                }
            })
        }
    }
};


module.exports.findAllUsedResource = (ignore) => {
    // findEmptyFinder();
    // findParentScript()
    findAllResourceInAsset(ignore, findAllUsed);
}